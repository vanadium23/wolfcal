# fn-12-zlg.1 Write regression tests for BUG-1: Event sync to destination

## Description

BUG-1: Events created locally (in WolfCal) are not appearing in Google Calendar after sync.

This task involves writing comprehensive regression tests that:
1. Reproduce the bug - events created locally don't sync to Google Calendar
2. Verify the correct behavior - events should sync to Google Calendar
3. Test both online and offline scenarios
4. Test the pending change queue processing

The tests will initially FAIL until the bug is fixed in task fn-12-zlg.7.

## Files to Investigate

- `src/lib/sync/processor.ts:112-158` - `processPendingChange` create operation
- `src/lib/sync/queue.ts` - Queue management (addCreateToQueue, etc.)
- `src/lib/api/calendar.ts` - CalendarClient.createEvent method
- `src/test/mocks/handlers.ts` - MSW handlers for mocking Google Calendar API

## Test Scenarios

### Test Suite: `src/test/sync/bugs-sync.test.ts`

#### Test 1: Create Event While Online
**Setup**: User is online (`navigator.onLine = true`)
**Action**: Create event via EventForm
**Expected**:
- Event is added to IndexedDB with `pendingSync: false`
- `CalendarClient.createEvent` is called to sync to Google Calendar
- Event appears in Google Calendar (verified via MSW mock)
- No pending change is added to queue

#### Test 2: Create Event While Offline
**Setup**: User is offline (`navigator.onLine = false`)
**Action**: Create event via EventForm
**Expected**:
- Event is added to IndexedDB with `pendingSync: true`
- No API call is made (offline mode)
- Pending change is added to queue with `operation: 'create'`

#### Test 3: Process Queue - Create Event
**Setup**: Offline event in pending queue, user goes online
**Action**: Queue processor runs
**Expected**:
- `CalendarClient.createEvent` is called
- Temporary event (if `temp-*` ID) is deleted from IndexedDB
- Real event from API response is inserted with `pendingSync: false`
- Pending change is removed from queue

#### Test 4: Create Event Sync Failure
**Setup**: API returns error (e.g., 401 unauthorized)
**Action**: Queue processor runs
**Expected**:
- Retry count is incremented
- Error is logged
- Pending change remains in queue for retry

#### Test 5: Multiple Events in Queue
**Setup**: 3 events in pending queue
**Action**: Queue processor runs
**Expected**:
- All 3 events are synced to Google Calendar
- Queue is empty after processing
- All events have `pendingSync: false`

## Test Implementation Notes

### MSW Handlers to Add

Update `src/test/mocks/handlers.ts` to include:
```typescript
// Mock event creation endpoint
http.post(`${googleCalendarBase}/calendars/:calendarId/events`, async ({ request }) => {
  const body = await request.json()
  // Return created event with Google-generated ID
  return HttpResponse.json({
    id: 'google-event-' + Date.now(),
    ...body,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  }, { status: 201 })
})
```

### Test Structure

```typescript
describe('BUG-1: Event sync to destination', () => {
  describe('Online event creation', () => {
    it('should sync event to Google Calendar when online')
    it('should not add pending change when sync succeeds')
  })

  describe('Offline event creation', () => {
    it('should add event to IndexedDB with pendingSync=true when offline')
    it('should queue pending change for later sync')
  })

  describe('Queue processing', () => {
    it('should process pending create operations when online')
    it('should replace temp event with real event after API call')
    it('should retry failed sync operations')
    it('should process multiple queued events in FIFO order')
  })
})
```

## Quick commands

```bash
# Create test file
touch src/test/sync/bugs-sync.test.ts

# Run the test suite (will fail initially)
npm test -- src/test/sync/bugs-sync.test.ts

# Run with coverage
npm test -- src/test/sync/bugs-sync.test.ts --coverage
```

## Acceptance
- [ ] Test file `src/test/sync/bugs-sync.test.ts` created
- [ ] All 5+ test scenarios implemented
- [ ] Tests FAIL when run (reproducing the bug)
- [ ] MSW handlers include event creation endpoint mock
- [ ] Tests cover both online and offline scenarios
- [ ] Tests verify queue processing behavior
- [ ] Code follows existing test patterns from `sync-engine.test.ts`
## Done summary
Write regression tests for BUG-1 (Event sync to destination) covering:
- Online event creation with immediate sync (1 failing - reproduces bug)
- Offline event creation with queue
- Queue processor syncs events to Google Calendar
- Error handling and retry logic
- Multiple events processing in FIFO order
## Evidence
- Commits: 0f8f2a28f42428d86876f330b1361e49a49d54d5
- Tests: src/test/sync/bugs-sync.test.ts
- PRs: