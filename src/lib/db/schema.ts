/**
 * IndexedDB schema definition with object stores and indexes
 */

import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type {
  Account,
  Calendar,
  CalendarEvent,
  SyncMetadata,
  PendingChange,
  Tombstone,
  ErrorLog,
} from './types';
import {
  DB_NAME,
  DB_VERSION,
} from './types';

/**
 * Database schema interface for type-safe operations
 */
interface WolfCalDBSchema extends DBSchema {
  accounts: {
    key: string;
    value: Account;
    indexes: {
      'by-email': string;
    };
  };
  calendars: {
    key: string;
    value: Calendar;
    indexes: {
      'by-account': string;
    };
  };
  events: {
    key: string;
    value: CalendarEvent;
    indexes: {
      'by-account': string;
      'by-calendar': string;
      'by-account-calendar': [string, string];
      'by-start': string;
    };
  };
  sync_metadata: {
    key: string;
    value: SyncMetadata;
    indexes: {
      'by-account': string;
    };
  };
  pending_changes: {
    key: string;
    value: PendingChange;
    indexes: {
      'by-account': string;
      'by-calendar': string;
      'by-created': number;
    };
  };
  tombstones: {
    key: string;
    value: Tombstone;
    indexes: {
      'by-account': string;
      'by-calendar': string;
      'by-deleted': number;
    };
  };
  error_log: {
    key: string;
    value: ErrorLog;
    indexes: {
      'by-account': string;
      'by-timestamp': number;
      'by-type': string;
    };
  };
}

/**
 * Open and initialize the database with schema versioning
 */
export async function initDB(): Promise<IDBPDatabase<WolfCalDBSchema>> {
  return openDB<WolfCalDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);

      // Version 1: Initial schema
      if (oldVersion < 1) {
        // Accounts store
        const accountStore = db.createObjectStore('accounts', {
          keyPath: 'id',
        });
        accountStore.createIndex('by-email', 'email', { unique: true });

        // Calendars store
        const calendarStore = db.createObjectStore('calendars', {
          keyPath: 'id',
        });
        calendarStore.createIndex('by-account', 'accountId', { unique: false });

        // Events store
        const eventStore = db.createObjectStore('events', {
          keyPath: 'id',
        });
        eventStore.createIndex('by-account', 'accountId', { unique: false });
        eventStore.createIndex('by-calendar', 'calendarId', { unique: false });
        eventStore.createIndex('by-account-calendar', ['accountId', 'calendarId'], {
          unique: false,
        });
        eventStore.createIndex('by-start', 'start.dateTime', { unique: false });

        // Sync metadata store
        const syncStore = db.createObjectStore('sync_metadata', {
          keyPath: 'calendarId',
        });
        syncStore.createIndex('by-account', 'accountId', { unique: false });

        // Pending changes store
        const pendingStore = db.createObjectStore('pending_changes', {
          keyPath: 'id',
        });
        pendingStore.createIndex('by-account', 'accountId', { unique: false });
        pendingStore.createIndex('by-calendar', 'calendarId', { unique: false });
        pendingStore.createIndex('by-created', 'createdAt', { unique: false });

        // Tombstones store
        const tombstoneStore = db.createObjectStore('tombstones', {
          keyPath: 'id',
        });
        tombstoneStore.createIndex('by-account', 'accountId', { unique: false });
        tombstoneStore.createIndex('by-calendar', 'calendarId', { unique: false });
        tombstoneStore.createIndex('by-deleted', 'deletedAt', { unique: false });
      }

      // Version 2: Add error_log table
      if (oldVersion < 2) {
        const errorLogStore = db.createObjectStore('error_log', {
          keyPath: 'id',
        });
        errorLogStore.createIndex('by-account', 'accountId', { unique: false });
        errorLogStore.createIndex('by-timestamp', 'timestamp', { unique: false });
        errorLogStore.createIndex('by-type', 'errorType', { unique: false });
      }
    },
  });
}

/**
 * Global database instance
 */
let dbInstance: IDBPDatabase<WolfCalDBSchema> | null = null;

/**
 * Get the database instance (singleton pattern)
 */
export async function getDB(): Promise<IDBPDatabase<WolfCalDBSchema>> {
  if (!dbInstance) {
    dbInstance = await initDB();
  }
  return dbInstance;
}

/**
 * Close the database connection
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
