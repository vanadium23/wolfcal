# fn-12-zlg.7 Fix BUG-1: Event sync to destination

## Description
Events created locally were not syncing to Google Calendar when online. The queue was only processed on app mount, when coming online from offline, every 20 minutes via scheduler, or manually via RefreshButton. After creating an event, the queue was not triggered to process immediately.

## Root Cause
In `src/components/EventModal.tsx`, the `saveEventOptimistic()` and `saveEventOffline()` functions added events to the pending_changes queue but did not call `processQueue()` to trigger immediate sync when online.

## Fix
Added `processQueue()` call after `addPendingChange()` in both `saveEventOptimistic()` and `saveEventOffline()` functions. The queue processing happens in background (non-awaited) and only when `navigator.onLine` is true.

## Acceptance
- [x] Regression test written for BUG-1 (src/test/sync/bugs-sync.test.ts)
- [x] Events created while online sync immediately to Google Calendar
- [x] Events created while offline are queued and sync when coming online
- [x] Queue processing handles retries and errors correctly
- [x] All 11 regression tests pass

## Done summary
# BUG-1: Event sync to destination - Fixed

## Summary
Fixed BUG-1 by adding immediate queue processing after event creation. When online, events are now synced to Google Calendar immediately after being created.

## Changes Made
- Modified `src/components/EventModal.tsx`:
  - Added `processQueue()` call after `addPendingChange()` in `saveEventOptimistic()`
  - Added `processQueue()` call after `addPendingChange()` in `saveEventOffline()`
  - Queue processing runs in background (non-awaited) and only when `navigator.onLine` is true

## Tests Added
- Created `src/test/sync/bugs-sync.test.ts` with 11 regression tests:
  - Happy path: Event creation and sync
  - Offline scenarios: Queue events while offline
  - Error scenarios: Retries, max retries, missing data, authentication errors
  - Data integrity: Format conversion, pendingSync flag

## Verification
All 11 regression tests pass.
## Evidence
- Commits:
- Tests:
- PRs: