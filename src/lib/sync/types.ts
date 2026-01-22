/**
 * Sync engine types and interfaces
 */

/**
 * Sync state for a calendar
 */
export interface SyncState {
  calendarId: string;
  accountId: string;
  syncToken?: string;
  lastSyncAt: number;
  status: 'idle' | 'syncing' | 'success' | 'error';
  error?: string;
}

/**
 * Sync result for a calendar
 */
export interface SyncResult {
  calendarId: string;
  accountId: string;
  eventsAdded: number;
  eventsUpdated: number;
  eventsDeleted: number;
  syncToken?: string;
  error?: string;
}

/**
 * Sync window configuration (3-month window)
 */
export interface SyncWindow {
  timeMin: string; // RFC3339 timestamp
  timeMax: string; // RFC3339 timestamp
}

/**
 * Account sync result
 */
export interface AccountSyncResult {
  accountId: string;
  calendarsProcessed: number;
  totalEventsAdded: number;
  totalEventsUpdated: number;
  totalEventsDeleted: number;
  errors: Array<{
    calendarId: string;
    error: string;
  }>;
}
