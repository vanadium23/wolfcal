# fn-12-zlg.3 Write regression tests for BUG-3: Accept/decline event

## Description

BUG-3: Clicking "Accept" or "Decline" buttons in the EventPopover for event invitations does not update the event response status. The user's response is not sent to Google Calendar and not reflected in the UI.

This task involves writing comprehensive regression tests that:
1. Reproduce the bug - accept/decline buttons don't update event response
2. Verify the correct behavior - response should be sent to Google Calendar and UI updated
3. Test both online and offline scenarios for invitation responses
4. Test the `respondToInvitation` API method

The tests will initially FAIL until the bug is fixed in task fn-12-zlg.9.

## Files to Investigate

- `src/components/EventPopover.tsx:95-168` - `handleResponse` function for accept/decline
- `src/lib/api/calendar.ts:375-408` - `respondToInvitation` method
- `src/lib/sync/processor.ts` - Queue processing for offline responses
- `src/test/mocks/handlers.ts` - MSW handlers for mocking Google Calendar API

## Bug Analysis

### Current Behavior (Buggy)
When user clicks Accept/Decline in EventPopover:
1. `handleResponse` is called
2. `CalendarClient.respondToInvitation` is invoked
3. **Possible Issues**:
   - API call fails silently (no error shown to user)
   - `attendee.self` is not set correctly, so response status isn't updated
   - Local IndexedDB update doesn't trigger UI refresh
   - Offline queuing doesn't work properly

### Expected Behavior (After Fix)
When user clicks Accept/Decline:
1. **Online**: API call updates Google Calendar
   - Fetch event to find current user (via `attendee.self: true`)
   - PATCH event with updated `responseStatus`
   - Update local IndexedDB with new attendee list
   - UI refreshes to show new status
2. **Offline**: Queue the response for later sync
   - Optimistically update local event
   - Add to pending changes queue
   - Sync when back online

## Test Scenarios

### Test Suite: `src/test/components/bugs-event-actions.test.tsx`

#### Test 1: Accept Event Online
**Setup**:
- User is online (`navigator.onLine = true`)
- Event with attendees including current user (`self: true`)
- Current user response status is `needsAction`

**Action**: Click "Accept" button in EventPopover

**Expected**:
- `CalendarClient.respondToInvitation` is called with `response: 'accepted'`
- Google Calendar API is called with PATCH to update event
- `updateEvent` is called to update local IndexedDB
- Attendee's `responseStatus` changes to `accepted`
- UI updates to show "Accepted" status

#### Test 2: Decline Event Online
**Setup**:
- User is online
- Event with attendees including current user (`self: true`)
- Current user response status is `needsAction`

**Action**: Click "Decline" button in EventPopover

**Expected**:
- `CalendarClient.respondToInvitation` is called with `response: 'declined'`
- Google Calendar API is called with PATCH to update event
- `updateEvent` is called to update local IndexedDB
- Attendee's `responseStatus` changes to `declined`
- UI updates to show "Declined" status

#### Test 3: Accept Event Offline
**Setup**:
- User is offline (`navigator.onLine = false`)
- Event with attendees including current user

**Action**: Click "Accept" button

**Expected**:
- No API call is made
- Local event is updated optimistically with `responseStatus: 'accepted'`
- Pending change is added to queue with `operation: 'update'`
- UI shows the updated status

#### Test 4: Response API Failure
**Setup**:
- User is online
- Google Calendar API returns error (e.g., 404 event not found)

**Action**: Click "Accept" button

**Expected**:
- Error is caught and displayed to user
- Local state is not changed
- Event remains with original response status

#### Test 5: Multiple Attendees - Only Current User Updated
**Setup**:
- Event with 5 attendees
- Current user is one of them (`self: true`)
- Other attendees have various response statuses

**Action**: Click "Accept" button

**Expected**:
- Only current user's `responseStatus` is updated
- Other attendees' statuses remain unchanged
- API call includes all 5 attendees with only one status changed

#### Test 6: Event Without Current User (Edge Case)
**Setup**:
- Event with attendees but current user is NOT in the list
- (No `self: true` attendee)

**Action**: Click "Accept" button

**Expected**:
- Error is shown: "You are not invited to this event"
- No API call is made

#### Test 7: UI Refresh After Response
**Setup**:
- EventPopover is open
- User clicks "Accept"

**Action**: Complete response

**Expected**:
- `onUpdate()` callback is invoked
- Parent component refreshes event list
- EventPopover closes
- Calendar shows updated event status

## Test Implementation Notes

### MSW Handlers to Add

Update `src/test/mocks/handlers.ts` to include:

```typescript
// Mock event fetch (for respondToInvitation)
http.get(`${googleCalendarBase}/calendars/:calendarId/events/:eventId`, ({ params }) => {
  return HttpResponse.json({
    id: params.eventId,
    summary: 'Meeting Invitation',
    start: { dateTime: '2026-02-01T10:00:00Z' },
    end: { dateTime: '2026-02-01T11:00:00Z' },
    status: 'confirmed',
    attendees: [
      {
        email: 'user@example.com',
        self: true,  // Mark current user
        responseStatus: 'needsAction',
        organizer: false,
      },
      {
        email: 'organizer@example.com',
        self: false,
        responseStatus: 'accepted',
        organizer: true,
      },
    ],
    updated: new Date().toISOString(),
  })
})

// Mock event update (PATCH for respondToInvitation)
http.patch(`${googleCalendarBase}/calendars/:calendarId/events/:eventId`, async ({ request }) => {
  const body = await request.json()
  return HttpResponse.json({
    id: 'event-1',
    summary: 'Meeting Invitation',
    start: { dateTime: '2026-02-01T10:00:00Z' },
    end: { dateTime: '2026-02-01T11:00:00Z' },
    status: 'confirmed',
    attendees: body.attendees,  // Return updated attendees
    updated: new Date().toISOString(),
  })
})
```

### Test Structure

```typescript
describe('BUG-3: Accept/decline event', () => {
  describe('Online invitation response', () => {
    it('should accept event and update Google Calendar when online')
    it('should decline event and update Google Calendar when online')
    it('should update local IndexedDB with new response status')
    it('should only update current user response status')
  })

  describe('Offline invitation response', () => {
    it('should queue accept response when offline')
    it('should optimistically update UI when offline')
    it('should sync response when back online')
  })

  describe('Error handling', () => {
    it('should show error when API call fails')
    it('should handle events without current user attendee')
    it('should not update state on failed response')
  })

  describe('UI updates', () => {
    it('should refresh calendar after response')
    it('should close popover after successful response')
    it('should update response status display')
  })
})
```

### Component Rendering

The test will need to render EventPopover with proper props:

```typescript
const mockEvent: CalendarEvent = {
  id: 'event-1',
  accountId: 'account-1',
  calendarId: 'primary',
  summary: 'Meeting Invitation',
  start: { dateTime: '2026-02-01T10:00:00Z' },
  end: { dateTime: '2026-02-01T11:00:00Z' },
  attendees: [
    {
      email: 'user@example.com',
      responseStatus: 'needsAction',
      organizer: false,
    },
    {
      email: 'organizer@example.com',
      responseStatus: 'accepted',
      organizer: true,
    },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

render(
  <EventPopover
    event={mockEvent}
    currentUserEmail="user@example.com"
    onClose={vi.fn()}
    onUpdate={vi.fn()}
    onEdit={vi.fn()}
    onDelete={vi.fn()}
    position={{ x: 100, y: 100 }}
  />
)
```

## Quick commands

```bash
# Create test file
touch src/test/components/bugs-event-actions.test.tsx

# Run the test suite (will fail initially)
npm test -- src/test/components/bugs-event-actions.test.tsx

# Run with coverage
npm test -- src/test/components/bugs-event-actions.test.tsx --coverage
```

## Acceptance
- [ ] Test file `src/test/components/bugs-event-actions.test.tsx` created
- [ ] All 7+ test scenarios implemented
- [ ] Tests FAIL when run (reproducing the bug)
- [ ] MSW handlers include GET and PATCH for event endpoints
- [ ] Tests cover both online and offline scenarios
- [ ] Tests verify `attendee.self` handling
- [ ] Tests verify UI refresh after response
- [ ] Code follows existing test patterns from `EventForm.test.tsx`
## Done summary
Write regression tests for BUG-3 (Accept/decline event) covering:
- Online accept/decline updates Google Calendar via API
- Offline accept/decline queues for later sync
- Local IndexedDB and UI update correctly
- Only current user's response status is updated
- Error handling for API failures
- UI refresh and popover close after response

Blocked:
Auto-blocked after 5 attempts.
Run: 20260204T200250Z-claude-code1-deploy@wolfcal.local-158638-c508
Task: fn-12-zlg.3

Last output:
timeout: failed to run command ‘claude-zai’: No such file or directory
ralph: task not done; forcing retry
## Evidence

- Commits:
- Tests: `src/test/components/bugs-event-actions.test.tsx`
- PRs:
