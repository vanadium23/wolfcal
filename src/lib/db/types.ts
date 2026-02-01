/**
 * TypeScript types for IndexedDB entities
 */

export interface Account {
  id: string; // UUID or account email
  email: string;
  encryptedAccessToken: string; // Encrypted with Web Crypto API
  encryptedRefreshToken: string;
  tokenExpiry: number; // Unix timestamp
  color?: string; // Account color for event display (from color palette)
  createdAt: number;
  updatedAt: number;
}

export interface Calendar {
  id: string; // Google Calendar ID
  accountId: string; // Foreign key to Account
  summary: string;
  description?: string;
  color?: string;
  backgroundColor?: string;
  visible: boolean; // Toggle visibility in UI
  primary: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CalendarEvent {
  id: string; // Google Event ID
  accountId: string; // Foreign key to Account
  calendarId: string; // Foreign key to Calendar
  summary: string;
  description?: string;
  start: {
    dateTime?: string; // ISO 8601
    date?: string; // YYYY-MM-DD for all-day
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  recurrence?: string[]; // RRULE for recurring events
  recurringEventId?: string; // ID of parent recurring event (for modified instances)
  originalStartTime?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
    organizer?: boolean;
  }>;
  location?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  attachments?: Array<{
    title: string;
    fileUrl: string;
  }>;
  createdAt: number;
  updatedAt: number;
  // Conflict resolution fields
  hasConflict?: boolean; // True if event has unresolved conflict
  localVersion?: CalendarEvent; // Local version during conflict
  remoteVersion?: CalendarEvent; // Remote version during conflict
  lastSyncedAt?: number; // Timestamp of last successful sync
  // Soft delete field
  deleted?: boolean; // True if event has been soft-deleted locally
  // Optimistic UI field
  pendingSync?: boolean; // True if event is pending sync with Google Calendar
}

export interface SyncMetadata {
  calendarId: string; // Primary key
  accountId: string;
  syncToken?: string; // Google sync token
  nextPageToken?: string; // Pagination token
  lastSyncAt: number; // Unix timestamp
  lastSyncStatus: 'success' | 'error' | 'in_progress';
  errorMessage?: string;
}

export interface PendingChange {
  id: string; // UUID
  operation: 'create' | 'update' | 'delete';
  entityType: 'event';
  accountId: string;
  calendarId: string;
  eventId?: string; // For update/delete operations
  eventData?: Partial<CalendarEvent>; // For create/update operations
  createdAt: number;
  retryCount: number;
  lastError?: string;
}

export interface Tombstone {
  id: string; // Event ID that was deleted
  accountId: string;
  calendarId: string;
  deletedAt: number; // Unix timestamp
}

export interface ErrorLog {
  id: string; // UUID
  timestamp: number; // Unix timestamp
  errorType: 'sync_failure' | 'api_error' | 'conflict_detection' | 'token_refresh' | 'network_error' | 'other';
  accountId: string;
  calendarId?: string; // Optional - not all errors are calendar-specific
  errorMessage: string;
  errorDetails: string; // JSON string with stack trace, request details
}

/**
 * Database schema version
 */
export const DB_VERSION = 3;
export const DB_NAME = 'wolfcal';
