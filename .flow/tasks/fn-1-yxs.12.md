# fn-1-yxs.12 Build event CRUD forms with validation

## Description
Create forms for creating and editing calendar events. Include validation for required fields, date/time pickers, and attendee management.

**Size:** M
**Files:** src/components/EventForm.tsx, src/components/EventModal.tsx, src/lib/events/validation.ts

## Approach

EventForm component with fields:
- Title (required)
- Start date/time (date + time picker)
- End date/time (date + time picker)
- All-day event toggle
- Description (textarea)
- Location
- Attendees (email input, add/remove buttons)
- Calendar selector (which calendar to save to)

Validation:
- Title required
- End time must be after start time
- All-day events: end date >= start date

EventModal wraps form in modal dialog for create/edit.

Form submission:
- If online: immediate API call + IndexedDB update
- If offline: queue to pending_changes + IndexedDB update with pending flag

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:46-49`:
- Create, read, update, delete events
- Work offline with queued sync
- Manage attendees using Google Calendar default functionality
## Acceptance
- [ ] src/components/EventForm.tsx created with all fields (title, start/end, description, location, attendees, calendar)
- [ ] Date/time pickers for start and end times
- [ ] All-day event toggle (hides time pickers when enabled)
- [ ] Attendee management: add/remove email addresses
- [ ] Calendar dropdown (selects which calendar to save event to)
- [ ] Validation: title required, end > start
- [ ] Validation errors displayed inline
- [ ] EventModal.tsx wraps form in modal dialog
- [ ] Save button triggers create/update based on mode
- [ ] Online: API call + IndexedDB update
- [ ] Offline: queued to pending_changes + IndexedDB with pending flag
- [ ] Form closes on successful save
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
