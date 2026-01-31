# fn-2-m4p.5 Simplify EventForm with expandable advanced fields

## Description
Refactor EventForm to show minimal fields by default (title, time, calendar) with description, location, and attendees hidden behind expandable "More options" section. Update calendar dropdown to flat list with account badges and remember last used calendar.

**Size:** M
**Files:** src/components/EventForm.tsx, src/components/EventForm.css

## Approach

Restructure EventForm layout:
- Always visible: title, start/end time, all-day toggle, calendar dropdown
- Collapsible section: "More options" button/link that expands to show description, location, attendees
- Use details/summary HTML elements or custom collapse state

Calendar dropdown improvements:
- Flat list format: "Calendar Name (account@gmail.com)"
- Filter to only show calendars where visible = true (per fn-2-m4p.4 implementation)
- Sort by recently used (track in localStorage under 'wolfcal:lastUsedCalendar')
- Default to last used calendar from localStorage

<!-- Updated by plan-sync: fn-2-m4p.4 used `visible` field not `isSyncEnabled` -->

Follow existing EventForm structure at src/components/EventForm.tsx, add collapsible section for advanced fields.

## Key Context

Per epic spec: "Minimal form by default: Show only title, start/end time, and calendar dropdown" with "Calendar dropdown is flat list with account email badges, sorted by recently used".
## Acceptance
- [ ] EventForm shows title, time, all-day toggle, calendar dropdown always visible
- [ ] Description, location, attendees hidden behind "More options" expandable section
- [ ] "More options" section collapses/expands on click
- [ ] Calendar dropdown shows format: "Calendar Name (email@gmail.com)"
- [ ] Calendar dropdown filtered to only enabled calendars (visible = true)
- [ ] Calendar dropdown sorted by recently used first
- [ ] Last selected calendar stored in localStorage under 'wolfcal:lastUsedCalendar'
- [ ] Calendar dropdown defaults to last used calendar on form open
- [ ] Existing form validation and submit logic preserved
- [ ] Styling updated for collapsible section
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
