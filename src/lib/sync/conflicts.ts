/**
 * Conflict detection and resolution utilities
 *
 * Detects when both local and remote versions of an event have been
 * modified since last sync, requiring manual conflict resolution.
 */

import type { CalendarEvent } from '../db/types';
import { getPendingChangesByCalendar } from '../db';

export interface ConflictInfo {
  hasConflict: boolean;
  reason?: string;
  conflictType?: 'update-update' | 'delete-update' | 'update-delete';
}

/**
 * Detect if there's a conflict between local and remote event versions
 *
 * A conflict exists when:
 * 1. Local event has pending changes (modified locally)
 * 2. Remote event has been updated since last sync
 * 3. Both modifications happened after last sync timestamp
 *
 * @param localEvent - Current local event from IndexedDB
 * @param remoteEvent - Incoming event from Google Calendar
 * @param lastSyncAt - Timestamp of last successful sync for this calendar
 * @returns Conflict information
 */
export async function detectConflict(
  localEvent: CalendarEvent,
  remoteEvent: CalendarEvent,
  lastSyncAt: number
): Promise<ConflictInfo> {
  // Check if local event was modified after last sync
  const localModifiedAfterSync = localEvent.updatedAt > lastSyncAt;

  // Check if remote event was modified after last sync
  const remoteModifiedAfterSync = remoteEvent.updatedAt > lastSyncAt;

  // Check if there are pending changes for this event
  const pendingChanges = await getPendingChangesByCalendar(localEvent.calendarId);
  const hasPendingChange = pendingChanges.some(
    (change) => change.eventId === localEvent.id
  );

  // Conflict occurs when both local and remote have modifications after last sync
  if ((localModifiedAfterSync || hasPendingChange) && remoteModifiedAfterSync) {
    // Check for delete-update conflicts
    if (remoteEvent.status === 'cancelled') {
      return {
        hasConflict: true,
        reason: 'Remote event deleted while local event was modified',
        conflictType: 'delete-update',
      };
    }

    // Check if local has delete pending
    const hasPendingDelete = pendingChanges.some(
      (change) => change.eventId === localEvent.id && change.operation === 'delete'
    );
    if (hasPendingDelete) {
      return {
        hasConflict: true,
        reason: 'Local event deleted while remote event was modified',
        conflictType: 'update-delete',
      };
    }

    // Regular update-update conflict
    return {
      hasConflict: true,
      reason: 'Both local and remote versions modified since last sync',
      conflictType: 'update-update',
    };
  }

  return { hasConflict: false };
}

/**
 * Check if two events have meaningful differences
 * Used to avoid flagging conflicts for identical changes
 */
export function eventsAreDifferent(event1: CalendarEvent, event2: CalendarEvent): boolean {
  // Compare key fields that users care about
  if (event1.summary !== event2.summary) return true;
  if (event1.description !== event2.description) return true;
  if (event1.location !== event2.location) return true;

  // Compare start time
  const start1 = event1.start.dateTime || event1.start.date;
  const start2 = event2.start.dateTime || event2.start.date;
  if (start1 !== start2) return true;

  // Compare end time
  const end1 = event1.end.dateTime || event1.end.date;
  const end2 = event2.end.dateTime || event2.end.date;
  if (end1 !== end2) return true;

  // Compare attendees (simplified comparison)
  const attendees1 = event1.attendees?.map((a) => a.email).sort().join(',') || '';
  const attendees2 = event2.attendees?.map((a) => a.email).sort().join(',') || '';
  if (attendees1 !== attendees2) return true;

  return false;
}

/**
 * Create a conflicted event with both versions stored
 */
export function createConflictedEvent(
  localEvent: CalendarEvent,
  remoteEvent: CalendarEvent
): CalendarEvent {
  return {
    ...localEvent,
    hasConflict: true,
    localVersion: { ...localEvent },
    remoteVersion: { ...remoteEvent },
  };
}

/**
 * Resolve conflict by choosing local version
 * Returns the event to save (local version without conflict flags)
 */
export function resolveWithLocal(conflictedEvent: CalendarEvent): CalendarEvent {
  if (!conflictedEvent.localVersion) {
    throw new Error('No local version available for conflict resolution');
  }

  const resolved = { ...conflictedEvent.localVersion };
  // Remove conflict fields
  delete resolved.hasConflict;
  delete resolved.localVersion;
  delete resolved.remoteVersion;

  return resolved;
}

/**
 * Resolve conflict by choosing remote version
 * Returns the event to save (remote version without conflict flags)
 */
export function resolveWithRemote(conflictedEvent: CalendarEvent): CalendarEvent {
  if (!conflictedEvent.remoteVersion) {
    throw new Error('No remote version available for conflict resolution');
  }

  const resolved = { ...conflictedEvent.remoteVersion };
  // Remove conflict fields
  delete resolved.hasConflict;
  delete resolved.localVersion;
  delete resolved.remoteVersion;

  return resolved;
}
