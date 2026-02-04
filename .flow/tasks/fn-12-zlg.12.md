# fn-12-zlg.12 Fix BUG-6: Calendar list display

## Description
TBD

## Acceptance
- [ ] TBD

## Done summary
# BUG-6 Fix: Calendar List Display Deduplication

Fixed BUG-6: Calendar list display issues (wrong calendars, duplicates).

## Root Cause
The Google Calendar API pagination could return the same calendar on multiple pages. The `CalendarManagement` component accumulated results without deduplication, causing duplicate calendar entries to be created in IndexedDB and displayed in the UI.

## Fix
Added deduplication logic in `src/components/CalendarManagement.tsx` using a Map-based approach to remove duplicates by calendar ID:

```typescript
const uniqueCalendars = Array.from(
  new Map(fetchedCalendars.map((cal) => [cal.id, cal])).values()
)
```

This was applied to three functions:
1. `loadAccountsAndCalendars` - Initial load
2. `handleGlobalRefresh` - Refresh all accounts
3. `handleRefreshCalendars` - Refresh single account

## Tests
Updated `src/test/components/bugs-calendar-list.test.tsx` to verify the fix is in place. All 23 tests pass.
## Evidence
- Commits:
- Tests:
- PRs: