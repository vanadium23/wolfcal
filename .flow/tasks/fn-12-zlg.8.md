# fn-12-zlg.8 Fix BUG-2: Delete propagation from Google

## Description
# Fix BUG-2: Delete propagation from Google

**Size:** S (small bug fix, 2 code locations)

**Files to modify:**
- `src/lib/sync/engine.ts` (lines 238-243, 346-348)

## Problem

When an event is deleted from Google Calendar (web UI), it still shows in WolfCal with "unsync" or "pending" status instead of being removed.

## Root Cause

The sync engine deletes cancelled events from IndexedDB but does NOT clean up:
1. Pending changes in the queue (orphaned records)
2. Tombstones (orphaned records)

This causes:
- Gray "⏱" indicator to persist for deleted events
- Queue processor may attempt to sync already-deleted events
- False conflicts in future syncs

## Fix Required

Add cleanup logic to TWO locations in `src/lib/sync/engine.ts`:

**Location 1: Incremental sync (lines 238-243)**
**Location 2: Full sync (lines 346-348)** - currently just skips cancelled events

For each cancelled event, cleanup in this order:
1. Delete all pending changes for the event
2. Delete tombstone if exists
3. Delete the event (existing behavior)

## Pattern to Follow

Reuse the delete operation pattern from `src/lib/sync/processor.ts:187-204` which correctly cleans up tombstones after successful deletion.
## Problem

When an event is deleted from Google Calendar (web UI), it still shows in WolfCal with "unsync" or "pending" status instead of being removed.

## Root Cause

The sync engine deletes cancelled events from IndexedDB but does NOT clean up:
1. Pending changes in the queue (orphaned records)
2. Tombstones (orphaned records)

This causes:
- Gray "⏱" indicator to persist for deleted events
- Queue processor may attempt to sync already-deleted events
- False conflicts in future syncs

## Fix Required

Add cleanup logic to TWO locations in `src/lib/sync/engine.ts`:

**Location 1: Incremental sync (lines 238-243)**
**Location 2: Full sync (lines 346-348)** - currently just skips cancelled events

For each cancelled event, cleanup in this order:
1. Delete all pending changes for the event
2. Delete tombstone if exists
3. Delete the event (existing behavior)

## Pattern to Follow

Reuse the delete operation pattern from `src/lib/sync/processor.ts:187-204` which correctly cleans up tombstones after successful deletion.
## Acceptance
- [ ] Both sync paths (incremental and full) clean up cancelled events
- [ ] Pending changes deleted via `getPendingChangesByEvent` + `deletePendingChange` (loop for multiple)
- [ ] Tombstones deleted via `getTombstone` + `deleteTombstone`
- [ ] Required imports added to engine.ts
- [ ] Regression tests pass: `npm test -- src/test/sync/bugs-sync.test.ts` (9 passing, 0 failing)
- [ ] No new lint errors
- [ ] Code follows existing cleanup pattern from processor.ts:187-204
## Done summary
Fixed BUG-2: Delete propagation from Google Calendar. Added cleanup logic to both incremental and full sync paths in src/lib/sync/engine.ts to delete pending changes and tombstones when processing cancelled events.
## Evidence
- Commits:
- Tests: bugs-sync
- PRs: