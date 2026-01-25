/**
 * Queue processor for syncing pending changes with Google Calendar
 *
 * Processes pending changes in FIFO order, attempting to sync each change
 * with Google Calendar API. Handles retries and error tracking.
 */

import { CalendarClient } from '../api';
import type { GoogleEvent } from '../api/types';
import {
  getPendingChangesOrderedByDate,
  deletePendingChange,
  updatePendingChange,
  addEvent,
  updateEvent as updateLocalEvent,
  deleteEvent as deleteLocalEvent,
  deleteTombstone,
} from '../db';
import type { PendingChange, CalendarEvent } from '../db/types';

/**
 * Maximum number of retry attempts before marking a change as failed
 */
const MAX_RETRIES = 3;

/**
 * Process result for a single pending change
 */
export interface ProcessResult {
  changeId: string;
  operation: 'create' | 'update' | 'delete';
  success: boolean;
  error?: string;
}

/**
 * Overall queue processing result
 */
export interface QueueProcessResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  results: ProcessResult[];
}

/**
 * Convert CalendarEvent to GoogleEvent format for API
 */
function convertToGoogleEvent(event: Partial<CalendarEvent>): Partial<GoogleEvent> {
  return {
    summary: event.summary,
    description: event.description,
    start: event.start,
    end: event.end,
    location: event.location,
    attendees: event.attendees,
    recurrence: event.recurrence,
    status: event.status,
  };
}

/**
 * Convert GoogleEvent back to CalendarEvent format
 */
function convertFromGoogleEvent(
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
 * Process a single pending change
 * @param client - Calendar API client
 * @param change - Pending change to process
 * @returns Process result
 */
async function processPendingChange(
  client: CalendarClient,
  change: PendingChange
): Promise<ProcessResult> {
  const result: ProcessResult = {
    changeId: change.id,
    operation: change.operation,
    success: false,
  };

  try {
    switch (change.operation) {
      case 'create': {
        if (!change.eventData) {
          throw new Error('eventData is required for create operation');
        }

        // Call Google Calendar API to create event
        const googleEvent = convertToGoogleEvent(change.eventData);
        const createdEvent = await client.createEvent(
          change.accountId,
          change.calendarId,
          googleEvent
        );

        // Update local IndexedDB with created event (including server-generated ID)
        const localEvent = convertFromGoogleEvent(
          createdEvent,
          change.accountId,
          change.calendarId
        );
        await addEvent(localEvent);

        result.success = true;
        console.log(`Successfully created event: ${createdEvent.id}`);
        break;
      }

      case 'update': {
        if (!change.eventId || !change.eventData) {
          throw new Error('eventId and eventData are required for update operation');
        }

        // Call Google Calendar API to update event
        const googleEvent = convertToGoogleEvent(change.eventData);
        const updatedEvent = await client.updateEvent(
          change.accountId,
          change.calendarId,
          change.eventId,
          googleEvent
        );

        // Update local IndexedDB with updated event
        const localEvent = convertFromGoogleEvent(
          updatedEvent,
          change.accountId,
          change.calendarId
        );
        await updateLocalEvent(localEvent);

        result.success = true;
        console.log(`Successfully updated event: ${change.eventId}`);
        break;
      }

      case 'delete': {
        if (!change.eventId) {
          throw new Error('eventId is required for delete operation');
        }

        // Call Google Calendar API to delete event
        await client.deleteEvent(change.accountId, change.calendarId, change.eventId);

        // Delete from local IndexedDB
        await deleteLocalEvent(change.eventId);

        // Remove tombstone after successful remote delete
        await deleteTombstone(change.eventId);

        result.success = true;
        console.log(`Successfully deleted event: ${change.eventId}`);
        break;
      }

      default:
        throw new Error(`Unknown operation: ${change.operation}`);
    }

    // If successful, remove from queue
    await deletePendingChange(change.id);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.error = errorMessage;

    console.error(`Failed to process change ${change.id}:`, error);

    // Increment retry count
    const retryCount = change.retryCount + 1;

    if (retryCount >= MAX_RETRIES) {
      // Max retries reached, mark as failed (keep in queue with error)
      console.error(`Max retries (${MAX_RETRIES}) reached for change ${change.id}`);
      await updatePendingChange({
        ...change,
        retryCount,
        lastError: `FAILED after ${MAX_RETRIES} attempts: ${errorMessage}`,
      });
    } else {
      // Still have retries left, update retry count and error
      await updatePendingChange({
        ...change,
        retryCount,
        lastError: errorMessage,
      });
    }
  }

  return result;
}

/**
 * Process all pending changes in the queue
 * @returns Queue processing result
 */
export async function processQueue(): Promise<QueueProcessResult> {
  const client = new CalendarClient();
  const result: QueueProcessResult = {
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    results: [],
  };

  try {
    // Fetch all pending changes ordered by createdAt (FIFO)
    const pendingChanges = await getPendingChangesOrderedByDate();

    console.log(`Processing ${pendingChanges.length} pending changes...`);

    // Process each change in order
    for (const change of pendingChanges) {
      // Skip changes that have already failed max retries
      if (change.retryCount >= MAX_RETRIES) {
        console.log(`Skipping change ${change.id} - max retries reached`);
        result.totalProcessed++;
        result.failed++;
        result.results.push({
          changeId: change.id,
          operation: change.operation,
          success: false,
          error: change.lastError || 'Max retries reached',
        });
        continue;
      }

      const processResult = await processPendingChange(client, change);
      result.totalProcessed++;

      if (processResult.success) {
        result.successful++;
      } else {
        result.failed++;
      }

      result.results.push(processResult);
    }

    console.log(
      `Queue processing complete: ${result.successful} successful, ${result.failed} failed`
    );

    return result;
  } catch (error) {
    console.error('Queue processing error:', error);
    throw error;
  }
}
