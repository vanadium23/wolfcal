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
} from '../db';
import type { CalendarEvent, SyncMetadata } from '../db/types';
import type { SyncResult, SyncWindow, AccountSyncResult } from './types';

/**
 * SyncEngine handles synchronization between Google Calendar and IndexedDB
 */
export class SyncEngine {
  private client: CalendarClient;

  constructor() {
    this.client = new CalendarClient();
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

    try {
      // Calculate 3-month window
      const window = this.calculateSyncWindow();

      // Get existing sync metadata
      let metadata = await getSyncMetadata(calendarId);

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

            // Check if event exists in IndexedDB
            const existingEvent = await getEventsByCalendar(calendarId).then(
              (events) => events.find((e) => e.id === googleEvent.id)
            );

            const calendarEvent = this.convertGoogleEvent(googleEvent, accountId, calendarId);

            if (existingEvent) {
              // Update existing event
              await updateEvent(calendarEvent);
              result.eventsUpdated++;
            } else {
              // Add new event
              await addEvent(calendarEvent);
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

            // Check if event exists in IndexedDB
            const existingEvent = await getEventsByCalendar(calendarId).then(
              (events) => events.find((e) => e.id === googleEvent.id)
            );

            const calendarEvent = this.convertGoogleEvent(googleEvent, accountId, calendarId);

            if (existingEvent) {
              // Update existing event
              await updateEvent(calendarEvent);
              result.eventsUpdated++;
            } else {
              // Add new event
              await addEvent(calendarEvent);
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
          // Continue with next calendar even if one fails
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
