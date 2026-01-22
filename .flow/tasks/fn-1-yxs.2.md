# fn-1-yxs.2 Configure FullCalendar with basic views

## Description
Install and configure FullCalendar library with React integration. Set up month, week, and day views with all-day event section at the top of each view.

**Size:** M
**Files:** package.json, src/components/Calendar.tsx, src/App.tsx

## Approach

Install FullCalendar packages:
- @fullcalendar/react
- @fullcalendar/daygrid (month view)
- @fullcalendar/timegrid (week/day views)
- @fullcalendar/interaction (drag-and-drop, click handlers)

Create Calendar component with:
- FullCalendar component configured for month/week/day views
- All-day events in separate section at top (dayMaxEventRows setting)
- Basic view switching UI (buttons for month/week/day)
- Placeholder event data for testing

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:68`, views must be: Month + Week + Day with all-day events in separate section at top.

FullCalendar docs: https://fullcalendar.io/docs/react
## Acceptance
- [ ] FullCalendar packages installed (@fullcalendar/react, daygrid, timegrid, interaction)
- [ ] Calendar.tsx component created with FullCalendar integration
- [ ] Month view displays calendar grid
- [ ] Week view displays time-based schedule
- [ ] Day view displays single-day schedule
- [ ] All-day events section visible at top of each view
- [ ] View switching buttons functional (month/week/day toggle)
- [ ] Placeholder events render correctly in all views
- [ ] Component integrated into App.tsx
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
