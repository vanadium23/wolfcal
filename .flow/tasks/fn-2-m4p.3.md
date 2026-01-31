# fn-2-m4p.3 Add calendar list management UI in Settings

## Description
Create calendar list management section in Settings page that displays all available calendars from connected accounts with enable/disable toggles. Include global refresh button and immediate sync on toggle.

**Size:** M
**Files:** src/pages/Settings.tsx, src/components/CalendarManagement.tsx (new), src/lib/db/types.ts

## Approach

Create CalendarManagement component:
- Expandable sections, one per connected account
- For each account: fetch calendar list using CalendarClient.listCalendars()
- Display calendars with enable/disable toggle switches
- Show loading spinner with "Fetching calendars from Google..." during fetch
- Global "Refresh Calendars" button at top to refetch all
- Enforce 20 calendar limit: disable toggles when limit reached

Add isSyncEnabled field to Calendar type in IndexedDB.

When calendar enabled:
- Set isSyncEnabled = true in IndexedDB
- Trigger immediate sync using SyncEngine.syncCalendar()
- Show loading indicator during sync

When calendar disabled:
- Set isSyncEnabled = false in IndexedDB
- Events remain in IndexedDB (filtered by useEvents hook in later task)

## Key Context

Per epic spec: "Settings page shows expandable calendar list grouped by account" with "Maximum 20 calendars can be synced simultaneously".

Note: OAuth credential validation (fn-2-m4p.2) performs format-only checks; real validation occurs during OAuth flow when credentials are actually used to fetch calendar lists.

Follow expandable section pattern from existing Settings.tsx structure.
## Acceptance
- [ ] src/components/CalendarManagement.tsx created with account sections
- [ ] Calendar type in types.ts extended with isSyncEnabled boolean field
- [ ] CalendarManagement fetches calendars using CalendarClient.listCalendars() per account
- [ ] Loading spinner shown with message "Fetching calendars from Google..."
- [ ] Each calendar has enable/disable toggle
- [ ] Toggle updates isSyncEnabled in IndexedDB
- [ ] Enabling calendar triggers immediate sync with SyncEngine.syncCalendar()
- [ ] Global "Refresh Calendars" button refetches all calendar lists
- [ ] 20 calendar limit enforced (count enabled calendars, disable toggles at limit)
- [ ] Error message shown when limit reached: "Maximum 20 calendars. Disable calendars to add more."
- [ ] Failed calendar list load shows "Failed to load calendars" with Retry button
- [ ] CalendarManagement integrated into Settings.tsx as new section
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
