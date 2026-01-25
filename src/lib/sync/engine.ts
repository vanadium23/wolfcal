/**
 * Sync engine for Google Calendar synchronization
 *
 * Handles bidirectional sync between Google Calendar and IndexedDB with:
 * - 3-month sync window (1.5 months past + 1.5 months future)
 * - Incremental sync using syncToken
 * - Full resync fallback
 * - Event pruning outside sync window
 */

import { CalendarClient } from '../api';
import type { GoogleEvent } from '../api/types';
import {
  getCalendarsByAccount,
  getSyncMetadata,
  updateSyncMetadata,
  addSyncMetadata,
  getEventsByCalendar,
  addEvent,
  updateEvent,
  deleteEvent,
  getTombstone,
  getAllTombstones,
  deleteTombstone,
  addErrorLog,
} from '../db';
import type { CalendarEvent, SyncMetadata, ErrorLog } from '../db/types';
import type { SyncResult, SyncWindow, AccountSyncResult } from './types';
import { detectConflict, eventsAreDifferent, createConflictedEvent } from './conflicts';

/**
 * SyncEngine handles synchronization between Google Calendar and IndexedDB
 */
export class SyncEngine {
  private client: CalendarClient;

  constructor() {
    this.client = new CalendarClient();
  }

  /**
   * Log an error to the error_log table
   */
  private async logError(
    errorType: ErrorLog['errorType'],
    accountId: string,
    errorMessage: string,
    errorDetails: Record<string, unknown>,
    calendarId?: string
  ): Promise<void> {
    try {
      const errorLog: ErrorLog = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        errorType,
        accountId,
        calendarId,
        errorMessage,
        errorDetails: JSON.stringify(errorDetails, null, 2),
      };
      await addErrorLog(errorLog);
      console.log(`Error logged: ${errorType} - ${errorMessage}`);
    } catch (error) {
      // Don't throw if logging fails - just log to console
      console.error('Failed to log error to database:', error);
    }
  }

  /**
   * Calculate 3-month sync window: 1.5 months past + 1.5 months future
   */
  private calculateSyncWindow(): SyncWindow {
    const now = new Date();

    // 1.5 months in the past
    const timeMin = new Date(now);
    timeMin.setMonth(timeMin.getMonth() - 1);
    timeMin.setDate(timeMin.getDate() - 15);

    // 1.5 months in the future
    const timeMax = new Date(now);
    timeMax.setMonth(timeMax.getMonth() + 1);
    timeMax.setDate(timeMax.getDate() + 15);

    return {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
    };
  }

  /**
   * Convert Google Event to CalendarEvent format
   */
  private convertGoogleEvent(
    googleEvent: GoogleEvent,
    accountId: string,
    calendarId: string
  ): CalendarEvent {
    return {
      id: googleEvent.id,
      accountId,
      calendarId,
      summary: googleEvent.summary || '(No title)',
      description: googleEvent.description,
      start: {
        dateTime: googleEvent.start.dateTime,
        date: googleEvent.start.date,
        timeZone: googleEvent.start.timeZone,
      },
      end: {
        dateTime: googleEvent.end.dateTime,
        date: googleEvent.end.date,
        timeZone: googleEvent.end.timeZone,
      },
      recurrence: googleEvent.recurrence,
      recurringEventId: googleEvent.recurringEventId,
      originalStartTime: googleEvent.originalStartTime,
      attendees: googleEvent.attendees?.map((a) => ({
        email: a.email || '',
        displayName: a.displayName,
        responseStatus: a.responseStatus || 'needsAction',
        organizer: a.organizer,
      })),
      location: googleEvent.location,
      status: googleEvent.status,
      attachments: googleEvent.attachments?.map((a) => ({
        title: a.title,
        fileUrl: a.fileUrl,
      })),
      createdAt: googleEvent.created ? new Date(googleEvent.created).getTime() : Date.now(),
      updatedAt: googleEvent.updated ? new Date(googleEvent.updated).getTime() : Date.now(),
    };
  }

  /**
   * Check if event is within sync window
   */
  private isEventInWindow(event: CalendarEvent, window: SyncWindow): boolean {
    const eventStart = event.start.dateTime || event.start.date;
    if (!eventStart) return false;

    const startTime = new Date(eventStart).getTime();
    const windowMin = new Date(window.timeMin).getTime();
    const windowMax = new Date(window.timeMax).getTime();

    return startTime >= windowMin && startTime <= windowMax;
  }

  /**
   * Delete events outside sync window (pruning)
   */
  private async pruneEventsOutsideWindow(
    calendarId: string,
    window: SyncWindow
  ): Promise<number> {
    const events = await getEventsByCalendar(calendarId);
    let deletedCount = 0;

    for (const event of events) {
      if (!this.isEventInWindow(event, window)) {
        await deleteEvent(event.id);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Prune tombstones older than 3 months (outside sync window)
   */
  private async pruneTombstonesOutsideWindow(window: SyncWindow): Promise<number> {
    const tombstones = await getAllTombstones();
    let deletedCount = 0;

    const windowMin = new Date(window.timeMin).getTime();

    for (const tombstone of tombstones) {
      // If tombstone is older than the sync window minimum, prune it
      if (tombstone.deletedAt < windowMin) {
        await deleteTombstone(tombstone.id);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Sync a single calendar
   * @param accountId - Account ID
   * @param calendarId - Calendar ID
   * @returns Sync result
   */
  async syncCalendar(accountId: string, calendarId: string): Promise<SyncResult> {
    const result: SyncResult = {
      calendarId,
      accountId,
      eventsAdded: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
    };

    // Get existing sync metadata (declare outside try/catch for error handler access)
    // eslint-disable-next-line prefer-const
    let metadata = await getSyncMetadata(calendarId);

    try {
      // Calculate 3-month window
      const window = this.calculateSyncWindow();

      // Determine if we should do incremental or full sync
      const useIncrementalSync = metadata?.syncToken !== undefined;

      // Track all event IDs from this sync to detect deletions
      const syncedEventIds = new Set<string>();

      if (useIncrementalSync && metadata?.syncToken) {
        // Incremental sync using syncToken
        console.log(`Incremental sync for calendar ${calendarId} with syncToken`);

        let pageToken: string | undefined;

        do {
          const response = await this.client.listEvents(
            accountId,
            calendarId,
            window.timeMin,
            window.timeMax,
            metadata.syncToken,
            pageToken
          );

          // Process events
          for (const googleEvent of response.items) {
            syncedEventIds.add(googleEvent.id);

            // Check if event is cancelled (deleted)
            if (googleEvent.status === 'cancelled') {
              await deleteEvent(googleEvent.id);
              result.eventsDeleted++;
              continue;
            }

            // Check if event exists in tombstones (locally deleted)
            const tombstone = await getTombstone(googleEvent.id);
            if (tombstone) {
              // Event was deleted locally - check for conflict
              // If remote event was modified after local delete, it's a conflict
              const remoteUpdated = googleEvent.updated
                ? new Date(googleEvent.updated).getTime()
                : 0;

              if (remoteUpdated > tombstone.deletedAt) {
                // Conflict: remote modified after local delete
                console.log(
                  `Conflict: Event ${googleEvent.id} modified remotely after local delete`
                );
                // Store as conflicted event for manual resolution
                const remoteEvent = this.convertGoogleEvent(googleEvent, accountId, calendarId);
                const conflictedEvent: CalendarEvent = {
                  ...remoteEvent,
                  hasConflict: true,
                  localVersion: undefined, // Local version is deleted
                  remoteVersion: remoteEvent,
                  lastSyncedAt: Date.now(),
                };
                await addEvent(conflictedEvent);
                result.eventsAdded++;
              } else {
                // No conflict - skip this event (already deleted locally)
                console.log(`Skipping event ${googleEvent.id} - locally deleted`);
              }
              continue;
            }

            // Check if event exists in IndexedDB
            const existingEvent = await getEventsByCalendar(calendarId).then(
              (events) => events.find((e) => e.id === googleEvent.id)
            );

            const remoteEvent = this.convertGoogleEvent(googleEvent, accountId, calendarId);

            if (existingEvent) {
              // Check for conflicts
              const conflictInfo = await detectConflict(
                existingEvent,
                remoteEvent,
                metadata?.lastSyncAt || 0
              );

              if (conflictInfo.hasConflict && eventsAreDifferent(existingEvent, remoteEvent)) {
                // Store conflicted event with both versions
                const conflictedEvent = createConflictedEvent(existingEvent, remoteEvent);
                await updateEvent(conflictedEvent);
                console.log(`Conflict detected for event ${googleEvent.id}`);
              } else {
                // No conflict or events are identical - update with remote version
                const updatedEvent = {
                  ...remoteEvent,
                  lastSyncedAt: Date.now(),
                };
                await updateEvent(updatedEvent);
              }
              result.eventsUpdated++;
            } else {
              // Add new event
              const newEvent = {
                ...remoteEvent,
                lastSyncedAt: Date.now(),
              };
              await addEvent(newEvent);
              result.eventsAdded++;
            }
          }

          // Store new syncToken if available
          if (response.nextSyncToken) {
            result.syncToken = response.nextSyncToken;
          }

          // Handle pagination
          pageToken = response.nextPageToken;
        } while (pageToken);
      } else {
        // Full sync - no syncToken available
        console.log(`Full sync for calendar ${calendarId}`);

        let pageToken: string | undefined;

        do {
          const response = await this.client.listEvents(
            accountId,
            calendarId,
            window.timeMin,
            window.timeMax,
            undefined, // No syncToken for full sync
            pageToken
          );

          // Process events
          for (const googleEvent of response.items) {
            syncedEventIds.add(googleEvent.id);

            // Skip cancelled events
            if (googleEvent.status === 'cancelled') {
              continue;
            }

            // Check if event exists in tombstones (locally deleted)
            const tombstone = await getTombstone(googleEvent.id);
            if (tombstone) {
              // Event was deleted locally - check for conflict
              // If remote event was modified after local delete, it's a conflict
              const remoteUpdated = googleEvent.updated
                ? new Date(googleEvent.updated).getTime()
                : 0;

              if (remoteUpdated > tombstone.deletedAt) {
                // Conflict: remote modified after local delete
                console.log(
                  `Conflict: Event ${googleEvent.id} modified remotely after local delete`
                );
                // Store as conflicted event for manual resolution
                const remoteEvent = this.convertGoogleEvent(googleEvent, accountId, calendarId);
                const conflictedEvent: CalendarEvent = {
                  ...remoteEvent,
                  hasConflict: true,
                  localVersion: undefined, // Local version is deleted
                  remoteVersion: remoteEvent,
                  lastSyncedAt: Date.now(),
                };
                await addEvent(conflictedEvent);
                result.eventsAdded++;
              } else {
                // No conflict - skip this event (already deleted locally)
                console.log(`Skipping event ${googleEvent.id} - locally deleted`);
              }
              continue;
            }

            // Check if event exists in IndexedDB
            const existingEvent = await getEventsByCalendar(calendarId).then(
              (events) => events.find((e) => e.id === googleEvent.id)
            );

            const remoteEvent = this.convertGoogleEvent(googleEvent, accountId, calendarId);

            if (existingEvent) {
              // Check for conflicts (even in full sync)
              const conflictInfo = await detectConflict(
                existingEvent,
                remoteEvent,
                metadata?.lastSyncAt || 0
              );

              if (conflictInfo.hasConflict && eventsAreDifferent(existingEvent, remoteEvent)) {
                // Store conflicted event with both versions
                const conflictedEvent = createConflictedEvent(existingEvent, remoteEvent);
                await updateEvent(conflictedEvent);
                console.log(`Conflict detected for event ${googleEvent.id}`);
              } else {
                // No conflict or events are identical - update with remote version
                const updatedEvent = {
                  ...remoteEvent,
                  lastSyncedAt: Date.now(),
                };
                await updateEvent(updatedEvent);
              }
              result.eventsUpdated++;
            } else {
              // Add new event
              const newEvent = {
                ...remoteEvent,
                lastSyncedAt: Date.now(),
              };
              await addEvent(newEvent);
              result.eventsAdded++;
            }
          }

          // Store new syncToken if available
          if (response.nextSyncToken) {
            result.syncToken = response.nextSyncToken;
          }

          // Handle pagination
          pageToken = response.nextPageToken;
        } while (pageToken);
      }

      // Prune events outside sync window
      const prunedCount = await this.pruneEventsOutsideWindow(calendarId, window);
      result.eventsDeleted += prunedCount;

      // Prune tombstones outside sync window
      const prunedTombstones = await this.pruneTombstonesOutsideWindow(window);
      console.log(`Pruned ${prunedTombstones} tombstones outside sync window`);

      // Update sync metadata
      const now = Date.now();
      const newMetadata: SyncMetadata = {
        calendarId,
        accountId,
        syncToken: result.syncToken,
        lastSyncAt: now,
        lastSyncStatus: 'success',
      };

      if (metadata) {
        await updateSyncMetadata(newMetadata);
      } else {
        await addSyncMetadata(newMetadata);
      }

      console.log(
        `Sync complete for calendar ${calendarId}: +${result.eventsAdded} ~${result.eventsUpdated} -${result.eventsDeleted}`
      );

      return result;
    } catch (error) {
      // Update metadata with error status
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const errorMetadata: SyncMetadata = {
        calendarId,
        accountId,
        syncToken: metadata?.syncToken,
        lastSyncAt: Date.now(),
        lastSyncStatus: 'error',
        errorMessage,
      };

      if (metadata) {
        await updateSyncMetadata(errorMetadata);
      } else {
        await addSyncMetadata(errorMetadata);
      }

      // Log error to error_log table
      await this.logError(
        'sync_failure',
        accountId,
        errorMessage,
        {
          calendarId,
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          } : error,
        },
        calendarId
      );

      result.error = errorMessage;
      console.error(`Sync failed for calendar ${calendarId}:`, error);

      throw error;
    }
  }

  /**
   * Sync all calendars for an account
   * @param accountId - Account ID
   * @returns Account sync result
   */
  async syncAccount(accountId: string): Promise<AccountSyncResult> {
    const accountResult: AccountSyncResult = {
      accountId,
      calendarsProcessed: 0,
      totalEventsAdded: 0,
      totalEventsUpdated: 0,
      totalEventsDeleted: 0,
      errors: [],
    };

    try {
      // Fetch all calendars for the account
      const calendars = await getCalendarsByAccount(accountId);

      if (calendars.length === 0) {
        console.log(`No calendars found for account ${accountId}`);
        return accountResult;
      }

      console.log(`Syncing ${calendars.length} calendars for account ${accountId}`);

      // Sync each calendar
      for (const calendar of calendars) {
        try {
          const result = await this.syncCalendar(accountId, calendar.id);

          accountResult.calendarsProcessed++;
          accountResult.totalEventsAdded += result.eventsAdded;
          accountResult.totalEventsUpdated += result.eventsUpdated;
          accountResult.totalEventsDeleted += result.eventsDeleted;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          accountResult.errors.push({
            calendarId: calendar.id,
            error: errorMessage,
          });
          console.error(`Failed to sync calendar ${calendar.id}:`, error);

          // Error already logged in syncCalendar, just continue with next calendar
          // This ensures one failed calendar doesn't stop the entire account sync
        }
      }

      console.log(
        `Account sync complete: ${accountResult.calendarsProcessed} calendars, ` +
        `+${accountResult.totalEventsAdded} ~${accountResult.totalEventsUpdated} ` +
        `-${accountResult.totalEventsDeleted} events`
      );

      return accountResult;
    } catch (error) {
      console.error(`Failed to sync account ${accountId}:`, error);
      throw error;
    }
  }
}
