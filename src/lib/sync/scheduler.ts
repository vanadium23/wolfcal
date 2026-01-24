/**
 * Sync scheduler for automatic periodic syncing
 *
 * Features:
 * - Auto-sync every N minutes (configurable via localStorage)
 * - Only runs when online
 * - Mutex lock prevents concurrent syncs
 * - Respects autoSync toggle from settings
 */

import { processQueue } from './processor';
import { SyncEngine } from './engine';
import { getAllAccounts } from '../db';

/**
 * Sync settings stored in localStorage
 */
interface SyncSettings {
  autoSync: boolean;
  syncInterval: number; // In minutes
}

/**
 * Default sync settings
 */
const DEFAULT_SETTINGS: SyncSettings = {
  autoSync: true,
  syncInterval: 20, // 20 minutes default
};

/**
 * Get sync settings from localStorage
 */
function getSyncSettings(): SyncSettings {
  try {
    const stored = localStorage.getItem('wolfcal:syncSettings');
    if (!stored) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(stored);
    return {
      autoSync: parsed.autoSync ?? DEFAULT_SETTINGS.autoSync,
      syncInterval: parsed.syncInterval ?? DEFAULT_SETTINGS.syncInterval,
    };
  } catch (error) {
    console.error('Failed to parse sync settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * SyncScheduler class
 *
 * Manages automatic periodic syncing with configurable intervals.
 */
export class SyncScheduler {
  private intervalId: number | null = null;
  private isSyncing = false;
  private isOnline: boolean = navigator.onLine;

  /**
   * Perform a full sync: process queue + sync all accounts
   */
  private async performSync(): Promise<void> {
    // Check if already syncing (mutex lock)
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    // Check if online
    if (!this.isOnline) {
      console.log('Offline, skipping scheduled sync');
      return;
    }

    this.isSyncing = true;

    try {
      console.log('Scheduled sync starting...');

      // Step 1: Process offline queue
      await processQueue();

      // Step 2: Sync all accounts
      const syncEngine = new SyncEngine();
      const accounts = await getAllAccounts();

      for (const account of accounts) {
        try {
          await syncEngine.syncAccount(account.id);
        } catch (error) {
          console.error(`Scheduled sync failed for account ${account.id}:`, error);
          // Continue with other accounts
        }
      }

      console.log('Scheduled sync complete');
    } catch (error) {
      console.error('Scheduled sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Handle online event
   */
  private handleOnline = () => {
    console.log('Network online - resuming scheduled sync');
    this.isOnline = true;
  };

  /**
   * Handle offline event
   */
  private handleOffline = () => {
    console.log('Network offline - pausing scheduled sync');
    this.isOnline = false;
  };

  /**
   * Start the scheduler
   */
  start(): void {
    // Read settings
    const settings = getSyncSettings();

    // Check if auto-sync is enabled
    if (!settings.autoSync) {
      console.log('Auto-sync disabled in settings');
      return;
    }

    // Stop existing interval if running
    this.stop();

    // Convert minutes to milliseconds
    const intervalMs = settings.syncInterval * 60 * 1000;

    console.log(`Starting sync scheduler with ${settings.syncInterval} minute interval`);

    // Set up interval
    this.intervalId = window.setInterval(() => {
      this.performSync();
    }, intervalMs);

    // Set up online/offline listeners
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Perform initial sync
    this.performSync();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId !== null) {
      console.log('Stopping sync scheduler');
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Remove event listeners
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Get current sync state
   */
  getSyncState() {
    return {
      isRunning: this.isRunning(),
      isSyncing: this.isSyncing,
      isOnline: this.isOnline,
    };
  }
}
