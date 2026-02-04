# fn-12-zlg.2 Write regression tests for BUG-2: Delete propagation from Google

## Description

BUG-2: When an event is deleted from Google Calendar (via web UI), it still shows in WolfCal with "unsync" or "pending" status instead of being removed from the UI.

This task involves writing comprehensive regression tests that:
1. Reproduce the bug - events deleted from Google stay in local UI with pending status
2. Verify the correct behavior - deleted events should be removed from IndexedDB and UI
3. Test the cancelled event handling in sync engine
4. Test tombstone cleanup after successful deletion

The tests will initially FAIL until the bug is fixed in task fn-12-zlg.8.

## Files to Investigate

- `src/lib/sync/engine.ts:238-243` - Cancelled event handling (status === 'cancelled')
- `src/lib/sync/engine.ts:245-275` - Tombstone handling for locally deleted events
- `src/hooks/useEvents.ts:33-36` - UI rendering for pending events (gray color)
- `src/lib/db/index.ts` - deleteEvent, getTombstone, deleteTombstone functions

## Bug Analysis

### Current Behavior (Buggy)
When Google Calendar returns an event with `status: 'cancelled'`:
1. The sync engine calls `deleteEvent(googleEvent.id)` to remove from IndexedDB
2. **BUT**: The event may still appear in the UI if:
   - The event has `pendingSync: true` flag set
   - The UI hasn't refreshed after the delete operation
   - The event is still in the pending changes queue

### Expected Behavior (After Fix)
When Google Calendar returns an event with `status: 'cancelled'`:
1. The sync engine should call `deleteEvent(googleEvent.id)` to remove from IndexedDB
2. Any pending changes for this event should be removed from the queue
3. Any tombstones for this event should be cleaned up
4. The UI should refresh and the event should disappear

## Test Scenarios

### Test Suite: `src/test/sync/bugs-sync.test.ts` (same file as BUG-1)

#### Test 1: Cancelled Event Removed from IndexedDB
**Setup**:
- Event exists in IndexedDB with ID `event-to-delete`
- Google Calendar API returns event with `status: 'cancelled'`

**Action**: Run sync

**Expected**:
- `deleteEvent('event-to-delete')` is called
- Event is removed from IndexedDB
- `result.eventsDeleted` is incremented

#### Test 2: Cancelled Event with Pending Sync Flag
**Setup**:
- Event exists in IndexedDB with `pendingSync: true`
- Google Calendar API returns event with `status: 'cancelled'`

**Action**: Run sync

**Expected**:
- Event is removed from IndexedDB (regardless of `pendingSync` flag)
- No error is thrown
- Event no longer appears in UI

#### Test 3: Cancelled Event with Pending Changes in Queue
**Setup**:
- Event exists in IndexedDB
- Pending change exists in queue for this event (e.g., update operation)
- Google Calendar API returns event with `status: 'cancelled'`

**Action**: Run sync

**Expected**:
- Event is removed from IndexedDB
- Pending change for this event is removed from queue
- No orphaned pending changes remain

#### Test 4: Cancelled Event with Tombstone
**Setup**:
- Event was previously deleted locally (tombstone exists)
- Google Calendar API returns event with `status: 'cancelled'`

**Action**: Run sync

**Expected**:
- Tombstone is cleaned up (deleted)
- No duplicate events or conflicts are created

#### Test 5: UI Refreshes After Delete
**Setup**:
- Event is visible in Calendar component
- Google Calendar API returns event with `status: 'cancelled'`

**Action**: Run sync, then refresh events

**Expected**:
- Event no longer appears in FullCalendar
- No gray/unsync indicator for deleted event
- Event count decreases by 1

#### Test 6: Multiple Cancelled Events in Single Sync
**Setup**:
- 3 events exist in IndexedDB
- Google Calendar API returns all 3 with `status: 'cancelled'`

**Action**: Run sync

**Expected**:
- All 3 events are deleted from IndexedDB
- `result.eventsDeleted` equals 3
- No errors are thrown

## Test Implementation Notes

### MSW Handlers to Use

Existing handlers in `src/test/mocks/handlers.ts` already support cancelled events. Add test-specific handler:

```typescript
// Mock cancelled event response
http.get(`${googleCalendarBase}/calendars/:calendarId/events`, ({ request }) => {
  const url = new URL(request.url)
  if (url.searchParams.get('testType') === 'cancelled') {
    return HttpResponse.json({
      items: [
        {
          id: 'event-to-delete',
          summary: 'Deleted Event',
          status: 'cancelled',  // Key for testing delete propagation
          start: { dateTime: '2026-02-01T10:00:00Z' },
          end: { dateTime: '2026-02-01T11:00:00Z' },
          updated: new Date().toISOString(),
        },
      ],
      nextSyncToken: 'new-sync-token',
    })
  }
  // ... other handlers
})
```

### Test Structure

```typescript
describe('BUG-2: Delete propagation from Google', () => {
  describe('Cancelled event handling', () => {
    it('should delete event from IndexedDB when Google returns cancelled status')
    it('should delete event even if pendingSync flag is true')
    it('should remove pending changes from queue when event is cancelled')
    it('should clean up tombstones for cancelled events')
  })

  describe('UI updates after delete', () => {
    it('should remove event from FullCalendar after sync')
    it('should not show gray/unsync indicator for deleted events')
    it('should update event count after deletion')
  })

  describe('Multiple cancelled events', () => {
    it('should handle multiple cancelled events in single sync')
    it('should not throw errors when deleting multiple events')
  })
})
```

## Quick commands

```bash
# Add tests to existing bugs-sync.test.ts file
# Run the test suite (will fail initially)
npm test -- src/test/sync/bugs-sync.test.ts

# Run with coverage
npm test -- src/test/sync/bugs-sync.test.ts --coverage
```

## Acceptance
- [ ] Tests added to `src/test/sync/bugs-sync.test.ts`
- [ ] All 6 test scenarios implemented
- [ ] Tests FAIL when run (reproducing the bug)
- [ ] Tests verify cancelled event removes from IndexedDB
- [ ] Tests verify pending changes are cleaned up
- [ ] Tests verify UI updates correctly
- [ ] Code follows existing test patterns from `sync-engine.test.ts`
## Done summary

Write regression tests for BUG-2 (Delete propagation from Google) covering:
- Cancelled event handling removes from IndexedDB
- Events with pendingSync flag are still deleted
- Pending changes queue is cleaned up
- UI refreshes to remove deleted events
- Tombstone cleanup after deletion
- Multiple cancelled events in single sync

## Evidence

- Commits:
- Tests: `src/test/sync/bugs-sync.test.ts`
- PRs:
