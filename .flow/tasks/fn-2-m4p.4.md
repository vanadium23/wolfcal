# fn-2-m4p.4 Update OAuth flow to sync primary calendar only

## Description
Modify account addition flow in Settings to sync only the primary calendar by default instead of all calendars. Store all available calendars in IndexedDB with isSyncEnabled flag.

**Size:** S
**Files:** src/pages/Settings.tsx

## Approach

Update handleAccountAdded function in Settings.tsx (around line 24-70):
- After fetching calendar list with CalendarClient.listCalendars()
- Identify primary calendar (primary: true field in Google API response)
- Store ALL calendars in IndexedDB with addCalendar()
- Set isSyncEnabled = true for primary calendar only
- Set isSyncEnabled = false for all other calendars
- Only sync the primary calendar initially (skip full account sync)

This allows users to manually enable additional calendars via CalendarManagement UI from Task 3.

## Key Context

Per epic spec: "Smart defaults for new accounts: When adding an account, sync primary calendar only by default".

Google Calendar API returns primary flag in calendar list response.
## Acceptance
- [ ] Settings.tsx handleAccountAdded fetches calendar list after account creation
- [ ] All calendars from account stored in IndexedDB via addCalendar()
- [ ] Primary calendar identified from Google API response (primary: true)
- [ ] Primary calendar has isSyncEnabled = true
- [ ] All other calendars have isSyncEnabled = false
- [ ] Only primary calendar synced initially (not full account sync)
- [ ] User can enable additional calendars via CalendarManagement UI
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
