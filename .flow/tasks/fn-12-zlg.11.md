# fn-12-zlg.11 Fix BUG-5: UI update after sync

## Description
TBD

## Acceptance
- [ ] TBD

## Done summary
# Task fn-12-zlg.11: Fix BUG-5 - UI update after sync

## Summary

Fixed BUG-5 where the UI showed stale data after sync operations completed. Users previously had to manually reload the page to see updated events after auto-sync.

## Root Cause

The `SyncScheduler` class had no callback mechanism to notify the App component when sync operations completed. This meant:
1. Auto-sync would run in the background
2. Events would be updated in IndexedDB
3. But the UI (Calendar component) wouldn't refresh
4. Users saw stale data until manual page reload

## Solution

Implemented a callback mechanism connecting SyncScheduler → App → Calendar:

1. **SyncScheduler (`src/lib/sync/scheduler.ts`)**:
   - Added `SyncCallback` type
   - Added `onSyncComplete` callback field
   - Added `onSyncComplete(callback)` method to register callbacks
   - Modified `performSync()` to invoke callback after sync completes

2. **useSyncScheduler hook (`src/hooks/useSyncScheduler.ts`)**:
   - Exposed `registerOnSyncComplete` function
   - Allows React components to register sync completion callbacks

3. **App component (`src/App.tsx`)**:
   - Registered callback using `registerOnSyncComplete`
   - Callback increments `refreshTrigger` state
   - Calendar component already watches `refreshTrigger` to refresh events

## Files Modified

- `src/lib/sync/scheduler.ts` - Added callback mechanism
- `src/hooks/useSyncScheduler.ts` - Exposed registration function
- `src/App.tsx` - Registered callback to trigger UI refresh
- `src/test/components/bugs-ui-state.test.tsx` - Updated tests to verify fix

## Test Results

All 12 regression tests for BUG-5 pass:
```
Test Files  1 passed (1)
Tests      12 passed (12)
```

## Behavior After Fix

1. Auto-sync runs periodically (every 20 minutes by default)
2. When sync completes, `onSyncComplete` callback is invoked
3. App component calls `setRefreshTrigger(prev => prev + 1)`
4. Calendar component detects `refreshTrigger` change via useEffect
5. Calendar calls `refresh()` to reload events from IndexedDB
6. UI updates automatically - no manual reload required

This matches the existing behavior for manual sync (RefreshButton), providing a consistent user experience.
## Evidence
- Commits:
- Tests:
- PRs: