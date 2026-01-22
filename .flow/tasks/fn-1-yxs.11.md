# fn-1-yxs.11 Handle recurring events (store rule, generate instances)

## Description
Handle recurring events by storing recurrence rules only (not individual instances). Generate event instances on-demand for calendar display within the 3-month sync window.

**Size:** M
**Files:** src/lib/events/recurrence.ts, src/lib/sync/engine.ts (update), src/components/Calendar.tsx (update)

## Approach

Store recurring events:
- Save event with `recurrence` field (RRULE string from Google)
- Do NOT store generated instances in IndexedDB

Generate instances:
- When loading events for calendar display, detect recurring events
- Parse RRULE using library like `rrule` (npm package)
- Generate instances within visible date range
- Apply exceptions (exdates) if event has modified/deleted instances
- Return expanded instances to calendar component

Update sync engine:
- Store recurring events as-is (single record with recurrence rule)
- Handle modified instances (recurringEventId field from Google)

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:35`:
- "Recurring events: Store recurrence rule only, generate instances on-demand"

This saves storage and avoids syncing thousands of instances for weekly/daily recurring events.

RRULE spec: https://datatracker.ietf.org/doc/html/rfc5545#section-3.8.5.3
rrule.js library: https://github.com/jakubroztocil/rrule
## Acceptance
- [ ] rrule package installed (or equivalent RRULE parser)
- [ ] src/lib/events/recurrence.ts exports expandRecurringEvent() function
- [ ] expandRecurringEvent takes event with recurrence rule + date range
- [ ] Function parses RRULE string using rrule library
- [ ] Generates event instances within date range
- [ ] Applies exdates (exception dates) if present
- [ ] Sync engine stores recurring events as single record (not instances)
- [ ] Modified instances (recurringEventId set) stored separately
- [ ] Calendar.tsx calls expandRecurringEvent for events with recurrence field
- [ ] Expanded instances displayed correctly in calendar views
- [ ] Recurring event editing updates rule, not instances
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
