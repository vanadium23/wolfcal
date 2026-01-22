# fn-1-yxs.13 Implement drag-and-drop rescheduling

## Description
Implement drag-and-drop event rescheduling in calendar views. Update event times on drop and handle offline queueing.

**Size:** S
**Files:** src/components/Calendar.tsx (update), src/lib/events/handlers.ts

## Approach

Configure FullCalendar with:
- `editable: true` - enables drag-and-drop
- `eventDrop` handler - called when event dropped
- `eventResize` handler - called when event resized

eventDrop handler:
1. Extract new start/end times from event
2. If online: update via API + update IndexedDB
3. If offline: queue to pending_changes + update IndexedDB with pending flag
4. Update calendar display optimistically

Revert on error:
- If API call fails, revert event position
- Use FullCalendar's `revert()` method

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:51`:
- "Drag-and-drop rescheduling (works offline)"

FullCalendar interaction: https://fullcalendar.io/docs/editable
## Acceptance
- [ ] FullCalendar editable prop set to true
- [ ] eventDrop handler registered in Calendar.tsx
- [ ] eventResize handler registered for duration changes
- [ ] Drag-drop updates event start/end times
- [ ] Online: immediate API call + IndexedDB update
- [ ] Offline: queued to pending_changes + IndexedDB update
- [ ] Optimistic UI update (event moves immediately)
- [ ] Revert on API error using event.revert()
- [ ] Pending indicator shown on offline-modified events
- [ ] Works for all-day events and timed events
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
