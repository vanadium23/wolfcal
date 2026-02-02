/**
 * Configuration serialization and deserialization for cross-device transfer
 *
 * Handles reading from and writing to IndexedDB and localStorage to create
 * a unified configuration bundle for export/import.
 *
 * IMPORTANT: Tokens are decrypted before export and re-encrypted after import
 * because each device has its own master encryption key.
 */

import { getDB } from '../db';
import type { Account, Calendar } from '../db/types';
import { encryptToken } from '../auth/encryption';

// LocalStorage keys
const STORAGE_KEYS = {
  SYNC_SETTINGS: 'wolfcal:syncSettings',
  CALENDAR_FILTERS: 'calendar-filters',
  LAST_USED_CALENDAR: 'wolfcal:lastUsedCalendarId',
  OAUTH_CLIENT_ID: 'wolfcal:oauth:clientId',
  OAUTH_CLIENT_SECRET: 'wolfcal:oauth:clientSecret',
} as const;

/**
 * Sync settings from localStorage
 */
interface SyncSettings {
  autoSync: boolean;
  syncInterval: number; // in minutes
}

/**
 * Calendar filters from localStorage
 * Format: Map serialized as JSON { "calendarId": true/false }
 */
type CalendarFilters = Record<string, boolean>;

/**
 * OAuth credentials from localStorage
 */
interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * Configuration bundle for export/import
 * Version 2 structure for future migration support
 *
 * NOTE: accessTokens and refreshTokens are NOT exported in version 2 to prevent race conditions
 * when syncing across multiple devices. Users must re-authenticate on import.
 *
 * The entire bundle is encrypted with the user's passphrase for transfer.
 *
 * Optimized for size: Only includes essential fields, omits metadata and
 * optional fields that can be re-fetched from Google API.
 */
export interface ConfigBundle {
  version: 1 | 2
  accounts: Array<{
    email: string;
    createdAt: number;
    // Version 1 fields (for migration support)
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: number;
    // Version 2 fields
    needsReauth?: true; // Flag indicating re-authentication is required on import
  }>;
  calendars: Array<{
    id: string; // Google Calendar ID
    accountId: string; // Account email (foreign key)
    summary: string;
    color?: string;
    backgroundColor?: string;
    visible: boolean;
    primary: boolean;
  }>;
  oauthCredentials: {
    clientId: string;
    clientSecret: string;
  };
  syncSettings: {
    autoSync: boolean;
    syncInterval: number;
  };
  calendarFilters: Record<string, boolean>;
  lastUsedCalendarId?: string;
  exportedAt: number
}

/**
 * Error types for config operations
 */
export class ConfigError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ConfigError';
    this.cause = cause;
  }
}

/**
 * Read sync settings from localStorage
 */
function readSyncSettings(): SyncSettings | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SYNC_SETTINGS);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Write sync settings to localStorage
 */
function writeSyncSettings(settings: SyncSettings): void {
  localStorage.setItem(STORAGE_KEYS.SYNC_SETTINGS, JSON.stringify(settings));
}

/**
 * Read calendar filters from localStorage
 */
function readCalendarFilters(): CalendarFilters {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CALENDAR_FILTERS);
    if (!data) return {};
    return JSON.parse(data);
  } catch {
    return {};
  }
}

/**
 * Write calendar filters to localStorage
 */
function writeCalendarFilters(filters: CalendarFilters): void {
  localStorage.setItem(STORAGE_KEYS.CALENDAR_FILTERS, JSON.stringify(filters));
}

/**
 * Read last used calendar ID from localStorage
 */
function readLastUsedCalendar(): string | undefined {
  return localStorage.getItem(STORAGE_KEYS.LAST_USED_CALENDAR) || undefined;
}

/**
 * Write last used calendar ID to localStorage
 */
function writeLastUsedCalendar(calendarId?: string): void {
  if (calendarId) {
    localStorage.setItem(STORAGE_KEYS.LAST_USED_CALENDAR, calendarId);
  } else {
    localStorage.removeItem(STORAGE_KEYS.LAST_USED_CALENDAR);
  }
}

/**
 * Read OAuth credentials from localStorage
 */
function readOAuthCredentials(): OAuthCredentials | null {
  try {
    const clientId = localStorage.getItem(STORAGE_KEYS.OAUTH_CLIENT_ID);
    const clientSecret = localStorage.getItem(STORAGE_KEYS.OAUTH_CLIENT_SECRET);
    
    if (!clientId || !clientSecret) return null;
    
    return { clientId, clientSecret };
  } catch {
    return null;
  }
}

/**
 * Write OAuth credentials to localStorage
 */
function writeOAuthCredentials(credentials: OAuthCredentials): void {
  localStorage.setItem(STORAGE_KEYS.OAUTH_CLIENT_ID, credentials.clientId);
  localStorage.setItem(STORAGE_KEYS.OAUTH_CLIENT_SECRET, credentials.clientSecret);
}

/**
 * Type guard to check if an account has version 1 token fields
 */
function isV1Account(acc: { email: string; createdAt: number; [key: string]: unknown }): acc is {
  email: string;
  createdAt: number;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
} {
  return 'accessToken' in acc && 'refreshToken' in acc && 'tokenExpiry' in acc;
}

/**
 * Validate a config bundle structure
 */
function validateConfigBundle(data: unknown): data is ConfigBundle {
  if (typeof data !== 'object' || data === null) return false;

  const bundle = data as Record<string, unknown>;

  // Check version (support version 1 for migration, version 2 is current)
  if (bundle.version !== 1 && bundle.version !== 2) return false;
  
  // Check accounts array
  if (!Array.isArray(bundle.accounts)) return false;
  
  // Check calendars array
  if (!Array.isArray(bundle.calendars)) return false;
  
  // Check sync settings
  if (typeof bundle.syncSettings !== 'object' || bundle.syncSettings === null) return false;
  
  // Check calendar filters
  if (typeof bundle.calendarFilters !== 'object' || bundle.calendarFilters === null) return false;
  
  // Check exportedAt
  if (typeof bundle.exportedAt !== 'number') return false;
  
  return true;
}

/**
 * Export current configuration as a ConfigBundle
 * Reads from IndexedDB and localStorage
 *
 * IMPORTANT: Does NOT export tokens - users must re-authenticate on import
 */
export async function exportConfig(): Promise<ConfigBundle> {
  try {
    const db = await getDB();

    // Read accounts from IndexedDB - export ONLY metadata (no tokens)
    const accounts = await db.getAll('accounts');

    // Export account metadata without tokens (re-auth required on import)
    const accountsMetadata = (accounts as Account[]).map((acc: Account) => ({
      email: acc.email,
      needsReauth: true as const,
      createdAt: acc.createdAt,
    }));
    
    // Read calendars from IndexedDB (optimized for size - only essential fields)
    const calendars = await db.getAll('calendars');

    // Read sync settings from localStorage
    const syncSettings = readSyncSettings() || { autoSync: true, syncInterval: 30 };

    // Read calendar filters from localStorage
    const calendarFilters = readCalendarFilters();
    
    // Read last used calendar from localStorage
    const lastUsedCalendarId = readLastUsedCalendar();
    
    // Read OAuth credentials
    const oauthCredentials = readOAuthCredentials() || { clientId: '', clientSecret: '' };
    
    return {
      version: 2,
      accounts: accountsMetadata,
      calendars: (calendars as Calendar[]).map(cal => ({
        id: cal.id,
        accountId: cal.accountId,
        summary: cal.summary,
        color: cal.color,
        backgroundColor: cal.backgroundColor,
        visible: cal.visible,
        primary: cal.primary,
      })),
      oauthCredentials,
      syncSettings,
      calendarFilters,
      lastUsedCalendarId,
      exportedAt: Date.now(),
    };
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }
    throw new ConfigError('Failed to export configuration', error);
  }
}

/**
 * Merge mode for importing configuration
 */
export type ImportMode = 'replace' | 'merge';

/**
 * Import a configuration bundle
 * @param bundle - The config bundle to import
 * @param mode - 'replace' to overwrite all settings, 'merge' to preserve existing
 *
 * IMPORTANT: Version 2 bundles do NOT include tokens - accounts require re-authentication
 * Version 1 bundles (legacy) include tokens that will be re-encrypted with this device's master key
 */
export async function importConfig(bundle: ConfigBundle, mode: ImportMode): Promise<void> {
  try {
    // Validate bundle structure
    if (!validateConfigBundle(bundle)) {
      throw new ConfigError('Invalid configuration bundle structure');
    }
    
    const db = await getDB();
    
    if (mode === 'replace') {
      // Replace mode: Clear existing data first

      // Clear all accounts and calendars
      await db.clear('accounts');
      await db.clear('calendars');

      // Import accounts (handle both version 1 with tokens and version 2 without)
      for (const acc of bundle.accounts) {
        let encryptedAccessToken: string;
        let encryptedRefreshToken: string;
        let tokenExpiry: number;

        if (isV1Account(acc)) {
          // Version 1: Re-encrypt tokens with this device's master key
          encryptedAccessToken = await encryptToken(acc.accessToken);
          encryptedRefreshToken = await encryptToken(acc.refreshToken);
          tokenExpiry = acc.tokenExpiry;
        } else {
          // Version 2: No tokens - create placeholder requiring re-auth
          encryptedAccessToken = '';
          encryptedRefreshToken = '';
          tokenExpiry = 0; // Forces re-authentication
        }

        await db.put('accounts', {
          id: acc.email, // Use email as ID
          email: acc.email,
          encryptedAccessToken,
          encryptedRefreshToken,
          tokenExpiry,
          color: undefined, // Will be assigned on sync
          createdAt: acc.createdAt,
          updatedAt: Date.now(),
        });
      }
      
      // Import calendars
      for (const cal of bundle.calendars) {
        await db.put('calendars', {
          id: cal.id,
          accountId: cal.accountId,
          summary: cal.summary,
          description: undefined, // Will be fetched from Google API on sync
          color: cal.color,
          backgroundColor: cal.backgroundColor,
          visible: cal.visible,
          primary: cal.primary,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      
      // Replace sync settings
      writeSyncSettings(bundle.syncSettings);
      
      // Replace calendar filters
      writeCalendarFilters(bundle.calendarFilters);
      
      // Replace OAuth credentials
      writeOAuthCredentials(bundle.oauthCredentials);
      
      // Replace last used calendar
      writeLastUsedCalendar(bundle.lastUsedCalendarId);
      
    } else {
      // Merge mode: Preserve existing data, add new

      // Merge accounts (by email)
      for (const acc of bundle.accounts) {
        const existing = await db.get('accounts', acc.email);

        let encryptedAccessToken: string;
        let encryptedRefreshToken: string;
        let tokenExpiry: number;

        if (isV1Account(acc)) {
          // Version 1: Re-encrypt tokens with this device's master key
          encryptedAccessToken = await encryptToken(acc.accessToken);
          encryptedRefreshToken = await encryptToken(acc.refreshToken);
          tokenExpiry = acc.tokenExpiry;
        } else {
          // Version 2: No tokens - create placeholder requiring re-auth
          // Preserve existing tokens if account exists
          if (existing) {
            encryptedAccessToken = existing.encryptedAccessToken;
            encryptedRefreshToken = existing.encryptedRefreshToken;
            tokenExpiry = existing.tokenExpiry;
          } else {
            encryptedAccessToken = '';
            encryptedRefreshToken = '';
            tokenExpiry = 0; // Forces re-authentication
          }
        }

        await db.put('accounts', {
          id: acc.email,
          email: acc.email,
          encryptedAccessToken,
          encryptedRefreshToken,
          tokenExpiry,
          color: existing?.color, // Preserve existing color or leave undefined
          createdAt: acc.createdAt, // Use imported createdAt
          updatedAt: Date.now(),
        });
      }
      
      // Merge calendars (by id)
      for (const cal of bundle.calendars) {
        const existing = await db.get('calendars', cal.id);
        
        await db.put('calendars', {
          id: cal.id,
          accountId: cal.accountId,
          summary: cal.summary,
          description: existing?.description, // Preserve existing or leave undefined
          color: cal.color || existing?.color, // Use imported or preserve existing
          backgroundColor: cal.backgroundColor || existing?.backgroundColor, // Use imported or preserve existing
          visible: cal.visible,
          primary: cal.primary,
          createdAt: existing?.createdAt || Date.now(),
          updatedAt: Date.now(),
        });
      }
      
      // Merge sync settings (imported takes precedence)
      writeSyncSettings(bundle.syncSettings);
      
      // Merge calendar filters (combine, imported takes precedence for conflicts)
      const existingFilters = readCalendarFilters();
      const mergedFilters = { ...existingFilters, ...bundle.calendarFilters };
      writeCalendarFilters(mergedFilters);
      
      // Write OAuth credentials (imported takes precedence)
      if (bundle.oauthCredentials.clientId || bundle.oauthCredentials.clientSecret) {
        writeOAuthCredentials(bundle.oauthCredentials);
      }
      
      // Set last used calendar only if not already set
      if (!readLastUsedCalendar() && bundle.lastUsedCalendarId) {
        writeLastUsedCalendar(bundle.lastUsedCalendarId);
      }
    }
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }
    throw new ConfigError('Failed to import configuration', error);
  }
}

/**
 * Serialize a ConfigBundle to JSON string
 */
export function serializeBundle(bundle: ConfigBundle): string {
  return JSON.stringify(bundle);
}

/**
 * Deserialize a JSON string to ConfigBundle with validation
 */
export function deserializeBundle(data: string): ConfigBundle {
  try {
    const parsed = JSON.parse(data);
    
    if (!validateConfigBundle(parsed)) {
      throw new ConfigError('Invalid configuration bundle structure');
    }
    
    return parsed;
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }
    throw new ConfigError('Failed to deserialize configuration bundle', error);
  }
}
