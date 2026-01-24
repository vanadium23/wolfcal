/**
 * Hook for managing the sync scheduler
 *
 * Starts the scheduler on mount and stops on unmount.
 * Provides sync state for UI components.
 */

import { useEffect, useState } from 'react';
import { SyncScheduler } from '../lib/sync/scheduler';

// Global scheduler instance (singleton)
let globalScheduler: SyncScheduler | null = null;

/**
 * Get or create the global scheduler instance
 */
function getScheduler(): SyncScheduler {
  if (!globalScheduler) {
    globalScheduler = new SyncScheduler();
  }
  return globalScheduler;
}

/**
 * Hook for sync scheduler
 */
export function useSyncScheduler() {
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const scheduler = getScheduler();

    // Start scheduler
    scheduler.start();

    // Poll sync state every 2 seconds
    const interval = setInterval(() => {
      const state = scheduler.getSyncState();
      setIsSyncing(state.isSyncing);
    }, 2000);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      // Note: Don't stop scheduler on unmount - let it run throughout app lifecycle
    };
  }, []);

  return { isSyncing };
}
