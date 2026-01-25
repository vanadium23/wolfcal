/**
 * IndexedDB abstraction layer with CRUD operations
 */

import { getDB } from './schema';
import type {
  Account,
  Calendar,
  CalendarEvent,
  SyncMetadata,
  PendingChange,
  Tombstone,
  ErrorLog,
} from './types';

// ============================================================================
// Accounts CRUD
// ============================================================================

export async function addAccount(account: Account): Promise<string> {
  const db = await getDB();
  return db.add('accounts', account);
}

export async function getAccount(id: string): Promise<Account | undefined> {
  const db = await getDB();
  return db.get('accounts', id);
}

export async function getAllAccounts(): Promise<Account[]> {
  const db = await getDB();
  return db.getAll('accounts');
}

export async function updateAccount(account: Account): Promise<string> {
  const db = await getDB();
  return db.put('accounts', account);
}

export async function deleteAccount(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('accounts', id);
}

export async function getAccountByEmail(email: string): Promise<Account | undefined> {
  const db = await getDB();
  return db.getFromIndex('accounts', 'by-email', email);
}

// ============================================================================
// Calendars CRUD
// ============================================================================

export async function addCalendar(calendar: Calendar): Promise<string> {
  const db = await getDB();
  return db.add('calendars', calendar);
}

export async function getCalendar(id: string): Promise<Calendar | undefined> {
  const db = await getDB();
  return db.get('calendars', id);
}

export async function getAllCalendars(): Promise<Calendar[]> {
  const db = await getDB();
  return db.getAll('calendars');
}

export async function getCalendarsByAccount(accountId: string): Promise<Calendar[]> {
  const db = await getDB();
  return db.getAllFromIndex('calendars', 'by-account', accountId);
}

export async function getVisibleCalendars(): Promise<Calendar[]> {
  const db = await getDB();
  return db.getAllFromIndex('calendars', 'by-visible', 1);
}

export async function updateCalendar(calendar: Calendar): Promise<string> {
  const db = await getDB();
  return db.put('calendars', calendar);
}

export async function deleteCalendar(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('calendars', id);
}

// ============================================================================
// Events CRUD
// ============================================================================

export async function addEvent(event: CalendarEvent): Promise<string> {
  const db = await getDB();
  return db.add('events', event);
}

export async function getEvent(id: string): Promise<CalendarEvent | undefined> {
  const db = await getDB();
  return db.get('events', id);
}

export async function getAllEvents(): Promise<CalendarEvent[]> {
  const db = await getDB();
  return db.getAll('events');
}

export async function getEventsByAccount(accountId: string): Promise<CalendarEvent[]> {
  const db = await getDB();
  return db.getAllFromIndex('events', 'by-account', accountId);
}

export async function getEventsByCalendar(calendarId: string): Promise<CalendarEvent[]> {
  const db = await getDB();
  return db.getAllFromIndex('events', 'by-calendar', calendarId);
}

export async function getEventsByAccountAndCalendar(
  accountId: string,
  calendarId: string
): Promise<CalendarEvent[]> {
  const db = await getDB();
  return db.getAllFromIndex('events', 'by-account-calendar', [accountId, calendarId]);
}

export async function updateEvent(event: CalendarEvent): Promise<string> {
  const db = await getDB();
  return db.put('events', event);
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('events', id);
}

/**
 * Get all events that have unresolved conflicts
 */
export async function getConflictedEvents(): Promise<CalendarEvent[]> {
  const db = await getDB();
  const allEvents = await db.getAll('events');
  return allEvents.filter((event) => event.hasConflict === true);
}

// ============================================================================
// Sync Metadata CRUD
// ============================================================================

export async function addSyncMetadata(metadata: SyncMetadata): Promise<string> {
  const db = await getDB();
  return db.add('sync_metadata', metadata);
}

export async function getSyncMetadata(calendarId: string): Promise<SyncMetadata | undefined> {
  const db = await getDB();
  return db.get('sync_metadata', calendarId);
}

export async function getAllSyncMetadata(): Promise<SyncMetadata[]> {
  const db = await getDB();
  return db.getAll('sync_metadata');
}

export async function getSyncMetadataByAccount(accountId: string): Promise<SyncMetadata[]> {
  const db = await getDB();
  return db.getAllFromIndex('sync_metadata', 'by-account', accountId);
}

export async function updateSyncMetadata(metadata: SyncMetadata): Promise<string> {
  const db = await getDB();
  return db.put('sync_metadata', metadata);
}

export async function deleteSyncMetadata(calendarId: string): Promise<void> {
  const db = await getDB();
  await db.delete('sync_metadata', calendarId);
}

// ============================================================================
// Pending Changes CRUD
// ============================================================================

export async function addPendingChange(change: PendingChange): Promise<string> {
  const db = await getDB();
  return db.add('pending_changes', change);
}

export async function getPendingChange(id: string): Promise<PendingChange | undefined> {
  const db = await getDB();
  return db.get('pending_changes', id);
}

export async function getAllPendingChanges(): Promise<PendingChange[]> {
  const db = await getDB();
  return db.getAll('pending_changes');
}

export async function getPendingChangesByAccount(accountId: string): Promise<PendingChange[]> {
  const db = await getDB();
  return db.getAllFromIndex('pending_changes', 'by-account', accountId);
}

export async function getPendingChangesByCalendar(calendarId: string): Promise<PendingChange[]> {
  const db = await getDB();
  return db.getAllFromIndex('pending_changes', 'by-calendar', calendarId);
}

export async function getPendingChangesOrderedByDate(): Promise<PendingChange[]> {
  const db = await getDB();
  const tx = db.transaction('pending_changes', 'readonly');
  const index = tx.store.index('by-created');
  return index.getAll();
}

export async function updatePendingChange(change: PendingChange): Promise<string> {
  const db = await getDB();
  return db.put('pending_changes', change);
}

export async function deletePendingChange(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('pending_changes', id);
}

// ============================================================================
// Tombstones CRUD
// ============================================================================

export async function addTombstone(tombstone: Tombstone): Promise<string> {
  const db = await getDB();
  return db.add('tombstones', tombstone);
}

export async function getTombstone(id: string): Promise<Tombstone | undefined> {
  const db = await getDB();
  return db.get('tombstones', id);
}

export async function getAllTombstones(): Promise<Tombstone[]> {
  const db = await getDB();
  return db.getAll('tombstones');
}

export async function getTombstonesByAccount(accountId: string): Promise<Tombstone[]> {
  const db = await getDB();
  return db.getAllFromIndex('tombstones', 'by-account', accountId);
}

export async function getTombstonesByCalendar(calendarId: string): Promise<Tombstone[]> {
  const db = await getDB();
  return db.getAllFromIndex('tombstones', 'by-calendar', calendarId);
}

export async function deleteTombstone(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('tombstones', id);
}

// ============================================================================
// Error Log CRUD
// ============================================================================

export async function addErrorLog(errorLog: ErrorLog): Promise<string> {
  const db = await getDB();
  return db.add('error_log', errorLog);
}

export async function getErrorLog(id: string): Promise<ErrorLog | undefined> {
  const db = await getDB();
  return db.get('error_log', id);
}

export async function getAllErrorLogs(): Promise<ErrorLog[]> {
  const db = await getDB();
  return db.getAll('error_log');
}

export async function getErrorLogsByAccount(accountId: string): Promise<ErrorLog[]> {
  const db = await getDB();
  return db.getAllFromIndex('error_log', 'by-account', accountId);
}

export async function getErrorLogsByType(errorType: string): Promise<ErrorLog[]> {
  const db = await getDB();
  return db.getAllFromIndex('error_log', 'by-type', errorType);
}

export async function getErrorLogsOrderedByTimestamp(): Promise<ErrorLog[]> {
  const db = await getDB();
  const tx = db.transaction('error_log', 'readonly');
  const index = tx.store.index('by-timestamp');
  return index.getAll();
}

export async function deleteErrorLog(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('error_log', id);
}

export async function clearAllErrorLogs(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('error_log', 'readwrite');
  await tx.store.clear();
}

export async function clearErrorLogsByDateRange(startTimestamp: number, endTimestamp: number): Promise<number> {
  const allLogs = await getAllErrorLogs();
  let deletedCount = 0;

  for (const log of allLogs) {
    if (log.timestamp >= startTimestamp && log.timestamp <= endTimestamp) {
      await deleteErrorLog(log.id);
      deletedCount++;
    }
  }

  return deletedCount;
}

// Re-export types and schema utilities
export * from './types';
export { getDB, closeDB } from './schema';
