/**
 * SyncStatusBar component
 *
 * Displays sync status indicators:
 * - Online/offline status with colored dot
 * - Current sync state (syncing, last synced time)
 * - Pending change count when offline queue has items
 */

import { useEffect, useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getAllPendingChanges, getAllSyncMetadata } from '../lib/db';

interface SyncStatusBarProps {
  isSyncing?: boolean;
}

export function SyncStatusBar({ isSyncing = false }: SyncStatusBarProps) {
  const { isOnline } = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Poll pending changes count
  useEffect(() => {
    const updatePendingCount = async () => {
      const changes = await getAllPendingChanges();
      setPendingCount(changes.length);
    };

    // Initial load
    updatePendingCount();

    // Poll every 5 seconds
    const interval = setInterval(updatePendingCount, 5000);

    return () => clearInterval(interval);
  }, []);

  // Get most recent sync time across all calendars
  useEffect(() => {
    const updateLastSyncTime = async () => {
      const metadata = await getAllSyncMetadata();

      if (metadata.length === 0) {
        setLastSyncTime(null);
        return;
      }

      // Find most recent successful sync
      const successfulSyncs = metadata.filter(m => m.lastSyncStatus === 'success');

      if (successfulSyncs.length === 0) {
        setLastSyncTime(null);
        return;
      }

      const mostRecent = Math.max(...successfulSyncs.map(m => m.lastSyncAt));
      setLastSyncTime(mostRecent);
    };

    // Initial load
    updateLastSyncTime();

    // Poll every 10 seconds
    const interval = setInterval(updateLastSyncTime, 10000);

    return () => clearInterval(interval);
  }, []);

  // Format relative time (e.g., "2 min ago")
  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
  };

  // Determine status text
  const getStatusText = (): string => {
    if (isSyncing) return 'Syncing...';
    if (!isOnline) {
      return pendingCount > 0
        ? `Offline - ${pendingCount} change${pendingCount > 1 ? 's' : ''} queued`
        : 'Offline';
    }
    if (lastSyncTime) return `Last synced ${formatRelativeTime(lastSyncTime)}`;
    return 'Ready to sync';
  };

  return (
    <div className="sync-status-bar">
      <div className="status-indicator">
        <span
          className={`status-dot ${isOnline ? 'online' : 'offline'}`}
          aria-label={isOnline ? 'Online' : 'Offline'}
        />
        <span className="status-text">{getStatusText()}</span>
      </div>
      {pendingCount > 0 && (
        <span className="pending-count" title="Pending changes">
          {pendingCount} pending
        </span>
      )}
    </div>
  );
}
