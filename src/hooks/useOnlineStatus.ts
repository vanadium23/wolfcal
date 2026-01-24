/**
 * Hook for monitoring online/offline status
 *
 * Monitors navigator.onLine and window online/offline events, triggering
 * the queue processor when the app comes online.
 */

import { useState, useEffect, useCallback } from 'react';
import { processQueue } from '../lib/sync/processor';
import type { QueueProcessResult } from '../lib/sync/processor';

/**
 * Hook for monitoring online status and triggering queue processing
 * @returns Object with online status and manual process function
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastProcessResult, setLastProcessResult] = useState<QueueProcessResult | null>(null);

  /**
   * Process the queue manually or automatically when coming online
   */
  const processQueueNow = useCallback(async (): Promise<QueueProcessResult | null> => {
    if (!isOnline) {
      console.log('Cannot process queue - offline');
      return null;
    }

    if (isProcessing) {
      console.log('Queue processing already in progress');
      return null;
    }

    setIsProcessing(true);

    try {
      console.log('Processing pending changes queue...');
      const result = await processQueue();
      setLastProcessResult(result);
      return result;
    } catch (error) {
      console.error('Failed to process queue:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [isOnline, isProcessing]);

  /**
   * Handle online event - user came back online
   */
  const handleOnline = useCallback(() => {
    console.log('Network status: online');
    setIsOnline(true);

    // Trigger queue processing when coming online
    processQueueNow();
  }, [processQueueNow]);

  /**
   * Handle offline event - user went offline
   */
  const handleOffline = useCallback(() => {
    console.log('Network status: offline');
    setIsOnline(false);
  }, []);

  /**
   * Set up event listeners for online/offline events
   */
  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Process queue on mount if online
    if (navigator.onLine) {
      processQueueNow();
    }

    // Cleanup event listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline, processQueueNow]);

  return {
    isOnline,
    isProcessing,
    lastProcessResult,
    processQueue: processQueueNow,
  };
}
