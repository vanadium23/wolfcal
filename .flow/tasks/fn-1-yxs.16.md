# fn-1-yxs.16 Add invitation accept/decline UI

## Description
Add inline accept/decline buttons for event invitations. Update attendee response status via Google Calendar API.

**Size:** S
**Files:** src/components/EventPopover.tsx, src/lib/api/calendar.ts (update)

## Approach

EventPopover component (shown on event click):
- Display event details (title, time, location, description, attendees)
- If current user is attendee: show response status (accepted/declined/tentative/needsAction)
- If status is needsAction: show Accept/Decline buttons
- Buttons trigger API call to update attendee response

Update CalendarClient:
- Add `respondToInvitation(calendarId, eventId, response)` method
- Uses PATCH /calendars/{id}/events/{eventId} with attendees update

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:48`:
- "Accept/decline event invitations with inline quick actions"

Google Calendar API attendees: https://developers.google.com/calendar/api/v3/reference/events#attendees
## Acceptance
- [ ] src/components/EventPopover.tsx created (triggered on event click)
- [ ] Popover displays event title, time, location, description, attendees
- [ ] Current user's response status shown (accepted/declined/tentative/needsAction)
- [ ] Accept/Decline buttons shown if status is needsAction
- [ ] Accept button calls API to update response to 'accepted'
- [ ] Decline button calls API to update response to 'declined'
- [ ] CalendarClient.respondToInvitation() method added
- [ ] API updates attendee response using PATCH request
- [ ] Event display updates after response (color change or icon)
- [ ] Offline: response queued to pending_changes
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
