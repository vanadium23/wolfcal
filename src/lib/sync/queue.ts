/**
 * Offline change queue for managing pending creates/updates/deletes
 *
 * Stores pending changes in IndexedDB pending_changes table and provides
 * utilities to add operations to the queue.
 */

import { addPendingChange } from '../db';
import type { PendingChange, CalendarEvent } from '../db/types';

/**
 * Generate a unique ID for pending changes
 */
function generateId(): string {
  return `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add a create operation to the pending changes queue
 * @param accountId - Account ID
 * @param calendarId - Calendar ID
 * @param eventData - Event data to create
 * @returns Created pending change ID
 */
export async function addCreateToQueue(
  accountId: string,
  calendarId: string,
  eventData: Partial<CalendarEvent>
): Promise<string> {
  const change: PendingChange = {
    id: generateId(),
    operation: 'create',
    entityType: 'event',
    accountId,
    calendarId,
    eventData,
    createdAt: Date.now(),
    retryCount: 0,
  };

  await addPendingChange(change);
  console.log(`Added create operation to queue: ${change.id}`);
  return change.id;
}

/**
 * Add an update operation to the pending changes queue
 * @param accountId - Account ID
 * @param calendarId - Calendar ID
 * @param eventId - Event ID to update
 * @param eventData - Updated event data
 * @returns Created pending change ID
 */
export async function addUpdateToQueue(
  accountId: string,
  calendarId: string,
  eventId: string,
  eventData: Partial<CalendarEvent>
): Promise<string> {
  const change: PendingChange = {
    id: generateId(),
    operation: 'update',
    entityType: 'event',
    accountId,
    calendarId,
    eventId,
    eventData,
    createdAt: Date.now(),
    retryCount: 0,
  };

  await addPendingChange(change);
  console.log(`Added update operation to queue: ${change.id}`);
  return change.id;
}

/**
 * Add a delete operation to the pending changes queue
 * @param accountId - Account ID
 * @param calendarId - Calendar ID
 * @param eventId - Event ID to delete
 * @returns Created pending change ID
 */
export async function addDeleteToQueue(
  accountId: string,
  calendarId: string,
  eventId: string
): Promise<string> {
  const change: PendingChange = {
    id: generateId(),
    operation: 'delete',
    entityType: 'event',
    accountId,
    calendarId,
    eventId,
    createdAt: Date.now(),
    retryCount: 0,
  };

  await addPendingChange(change);
  console.log(`Added delete operation to queue: ${change.id}`);
  return change.id;
}

/**
 * General function to add any operation to the queue
 * @param operation - Operation type ('create', 'update', 'delete')
 * @param accountId - Account ID
 * @param calendarId - Calendar ID
 * @param eventId - Event ID (for update/delete)
 * @param eventData - Event data (for create/update)
 * @returns Created pending change ID
 */
export async function addToQueue(
  operation: 'create' | 'update' | 'delete',
  accountId: string,
  calendarId: string,
  eventId?: string,
  eventData?: Partial<CalendarEvent>
): Promise<string> {
  switch (operation) {
    case 'create':
      if (!eventData) {
        throw new Error('eventData is required for create operation');
      }
      return addCreateToQueue(accountId, calendarId, eventData);

    case 'update':
      if (!eventId || !eventData) {
        throw new Error('eventId and eventData are required for update operation');
      }
      return addUpdateToQueue(accountId, calendarId, eventId, eventData);

    case 'delete':
      if (!eventId) {
        throw new Error('eventId is required for delete operation');
      }
      return addDeleteToQueue(accountId, calendarId, eventId);

    default:
      throw new Error(`Unknown operation: ${operation}`);
  }
}
