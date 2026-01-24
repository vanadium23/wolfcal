/**
 * RefreshButton component
 *
 * Manual sync trigger button with:
 * - Loading spinner during sync
 * - Disabled state when offline
 * - Triggers both queue processing and full sync
 */

import { useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { processQueue } from '../lib/sync/processor';
import { SyncEngine } from '../lib/sync/engine';
import { getAllAccounts } from '../lib/db';

interface RefreshButtonProps {
  onSyncStart?: () => void;
  onSyncComplete?: () => void;
  onSyncError?: (error: Error) => void;
}

export function RefreshButton({
  onSyncStart,
  onSyncComplete,
  onSyncError,
}: RefreshButtonProps) {
  const { isOnline } = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleRefresh = async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    onSyncStart?.();

    try {
      console.log('Manual refresh triggered');

      // Step 1: Process offline queue first
      console.log('Processing offline queue...');
      await processQueue();

      // Step 2: Sync all accounts
      const syncEngine = new SyncEngine();
      const accounts = await getAllAccounts();

      console.log(`Syncing ${accounts.length} accounts...`);

      for (const account of accounts) {
        try {
          await syncEngine.syncAccount(account.id);
        } catch (error) {
          console.error(`Failed to sync account ${account.id}:`, error);
          // Continue with other accounts even if one fails
        }
      }

      console.log('Manual refresh complete');
      onSyncComplete?.();
    } catch (error) {
      console.error('Manual refresh failed:', error);
      const err = error instanceof Error ? error : new Error('Unknown error');
      onSyncError?.(err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <button
      className="refresh-button"
      onClick={handleRefresh}
      disabled={!isOnline || isSyncing}
      title={!isOnline ? 'Cannot sync while offline' : 'Refresh calendar'}
    >
      {isSyncing ? (
        <>
          <span className="spinner" aria-label="Syncing" />
          Syncing...
        </>
      ) : (
        <>
          <span className="refresh-icon">⟳</span>
          Refresh
        </>
      )}
    </button>
  );
}
