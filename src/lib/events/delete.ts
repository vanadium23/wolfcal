/**
 * Soft delete functionality with tombstones for sync conflict detection
 */

import {
  getEvent,
  updateEvent,
  addTombstone,
  addPendingChange,
} from '../db';
import type { CalendarEvent, Tombstone, PendingChange } from '../db/types';

/**
 * Soft delete an event with tombstone creation
 *
 * Flow:
 * 1. Mark event as deleted in events table
 * 2. Add tombstone entry for sync conflict detection
 * 3. Queue delete operation to pending_changes
 *
 * @param eventId - Event ID to delete
 * @returns Promise<void>
 * @throws Error if event not found
 */
export async function softDelete(eventId: string): Promise<void> {
  // Get the event from IndexedDB
  const event = await getEvent(eventId);
  if (!event) {
    throw new Error(`Event ${eventId} not found`);
  }

  // Mark event as deleted
  const deletedEvent: CalendarEvent = {
    ...event,
    deleted: true,
    updatedAt: Date.now(),
  };

  // Update event in IndexedDB
  await updateEvent(deletedEvent);

  // Create tombstone for sync conflict detection
  const tombstone: Tombstone = {
    id: eventId,
    accountId: event.accountId,
    calendarId: event.calendarId,
    deletedAt: Date.now(),
  };

  await addTombstone(tombstone);

  // Queue delete operation for sync
  const pendingChange: PendingChange = {
    id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    operation: 'delete',
    entityType: 'event',
    accountId: event.accountId,
    calendarId: event.calendarId,
    eventId: eventId,
    createdAt: Date.now(),
    retryCount: 0,
  };

  await addPendingChange(pendingChange);

  console.log(`Event ${eventId} soft-deleted with tombstone`);
}
