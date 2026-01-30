# WolfCal UX Improvements - Match OneCal Quality

## Overview

Improve WolfCal's user experience to match OneCal's quality by fixing OAuth flow, calendar selection, and event creation UX. The current implementation has embedded OAuth credentials in AddAccountButton, lacks calendar management in Settings, and shows a complex event form that slows down quick event addition.

**Target**: OneCal-level UX with minimal friction for OAuth setup, calendar management, and event creation.

## Scope

### In Scope
- Refactor OAuth credentials to Settings (one-time configuration)
- Add OAuth credential validation in Settings
- Build calendar list management UI in Settings with enable/disable toggles
- Sync primary calendar only by default (not all calendars)
- Simplify event form to show minimal fields with expandable "More options"
- Implement optimistic UI updates (events appear immediately before API confirms)
- Update documentation for new flows

### Out of Scope
- Natural language event parsing ("Lunch tomorrow at 1pm")
- Multiple OAuth apps or credential sets
- Calendar-specific sync interval customization
- Bulk calendar enable/disable operations

## Approach

### Phase 1: OAuth Centralization (Tasks 1-2)

**Task 1: Refactor AddAccountButton**
- Remove embedded credential form from AddAccountButton.tsx:34-63
- Read credentials from localStorage keys: `wolfcal:oauth:clientId` and `wolfcal:oauth:clientSecret` (existing keys)
- When credentials missing: disable button, show tooltip "Configure OAuth credentials in Settings first"
- Pass credentials to `initiateOAuth()` which already uses sessionStorage internally (oauth.ts:63-64)
- Keep existing OAuth flow unchanged - credentials flow through existing sessionStorage mechanism
- No migration needed - already using correct keys in AddAccountButton.tsx:34-35

**Task 2: OAuth Validation**
- Add OAuth credentials form to Settings.tsx
- Store credentials in localStorage using EXISTING keys: `wolfcal:oauth:clientId`, `wolfcal:oauth:clientSecret`
- **Validation approach**: Format-only validation (no network calls)
  - Check if clientId matches pattern: `*.apps.googleusercontent.com`
  - Check if clientSecret is non-empty (24+ characters)
  - Show status: "Credentials saved" (green) or "Not configured" (gray)
  - Note: Real validation happens during OAuth flow - credentials proven valid after first successful account add
- Display save success using existing `alert()`: "OAuth credentials saved successfully"
- No "Valid" badge - just "Configured" vs "Not configured" to avoid false positives

### Phase 2: Calendar Management (Tasks 3-4)

**Task 4: Update OAuth flow** (do first - Task 3 depends on this)
- **Extend CalendarClient.listCalendars() with pagination support**:
  - Add parameters: `maxResults?: number`, `pageToken?: string`
  - Return type: `Promise<{ items: GoogleCalendar[], nextPageToken?: string }>`
  - Build URL with query params: `?maxResults=250&pageToken=${token}`
  - Return both calendar items and nextPageToken from API response
- **Calendar fetching location**: Perform in Settings.handleAccountAdded AFTER account saved to IndexedDB
  - Current flow: OAuthCallback → postMessage to Settings → handleAccountAdded → addAccount()
  - Add after addAccount() succeeds: pagination loop using extended listCalendars()
  - Pagination loop:
    ```typescript
    let allCalendars = [];
    let pageToken = undefined;
    do {
      const response = await client.listCalendars(accountId, 250, pageToken);
      allCalendars.push(...response.items);
      pageToken = response.nextPageToken;
    } while (pageToken);
    ```
  - This ensures account exists in IndexedDB so CalendarClient can decrypt tokens
- When new account added via handleAccountAdded:
  - Find primary calendar (calendar.primary === true)
  - Save primary calendar to IndexedDB with `visible: true`
  - Save ALL other calendars with `visible: false`
  - This gives Settings UI the full list for toggles
- Update SyncEngine.syncAccount() to filter: only sync calendars where `visible === true`
  - Change line 530: `for (const calendar of calendars.filter(c => c.visible))`
  - This prevents syncing disabled calendars while keeping them in IndexedDB

**Task 3: Calendar Management UI**
- Add expandable calendar list per account in Settings.tsx
- For each calendar, show:
  - Calendar name (summary)
  - Enable/disable toggle (updates `visible` field in IndexedDB)
  - Visual indicator if calendar is primary
  - Color indicator (calendar.backgroundColor or calendar.color)
- **Visibility state persistence**: Already handled by IndexedDB Calendar.visible field
- **Filter coordination**: Sync with existing FilterPanel state
  - Existing filter uses localStorage key: `calendar-filters` (not `calendar_visibility`)
  - When toggle changed in Settings OR FilterPanel:
    1. Check current visible calendar count for account using `canEnableCalendar()`
    2. If enabling and would exceed 20: block toggle, alert user
    3. Update IndexedDB Calendar.visible field
    4. Update localStorage `calendar-filters` to match (if it exists)
    5. Trigger SyncEngine.syncCalendar() if enabling (see below)
  - FilterPanel and Settings stay in sync via shared IndexedDB state
- **Enforce 20-calendar limit centrally**:
  - Add shared utility function: `canEnableCalendar(accountId, calendarId): Promise<{canEnable: boolean, currentCount: number}>`
  - Used by BOTH Settings toggle AND FilterPanel/useEventFilters toggle
  - Count calendars with `visible: true` for the account
  - If count >= 20 and trying to enable: return `{canEnable: false, currentCount: 20}`
  - Show alert: "Maximum 20 calendars per account (20/20 enabled)"
  - Prevents bypass through FilterPanel bulk actions
- **Bulk action handling**:
  - `toggleAccount`: Check if enabling account would exceed 20 calendars
    - If so: enable only first 20 calendars alphabetically, alert: "Enabled 20 of N calendars (limit reached)"
  - `selectAll`: Same partial enable behavior with alert
  - All bulk actions use `canEnableCalendar()` for consistency
- **Immediate sync when enabling**:
  - When user toggles calendar from disabled → enabled (Settings or FilterPanel):
    - Show alert: "Syncing calendar: {calendar.summary}..."
    - Call `await syncEngine.syncCalendar(accountId, calendarId)`
    - On success: alert "Calendar synced successfully"
    - On error: alert error message, revert toggle to disabled
- **Refresh Calendars button**:
  - Add "Refresh Calendars" button per account in Settings
  - Fetches fresh calendar list from Google API (with pagination using extended listCalendars)
  - **Merge strategy** (preserves user choices):
    - For existing calendars: update metadata (summary, color) but PRESERVE `visible` flag
    - For new calendars: add with `visible: false`
    - For removed calendars: mark as deleted or remove from IndexedDB
    - Alert: "Refreshed {count} calendars"
- When calendar disabled: events remain in IndexedDB but useEvents.ts already filters via getVisibleCalendars()

### Phase 3: Event UX (Tasks 5-6)

**Task 5: Simplify EventForm**
- Show minimal fields by default:
  - Title (summary)
  - Calendar dropdown (flat list with account badges)
  - Start date/time
  - End date/time
- Hide behind "More options" expandable section:
  - Description
  - Location
  - Attendees
  - Attachments
  - Recurrence rules
- Remember last-used calendar in localStorage: `wolfcal:lastUsedCalendarId`
- Set as default for new events
- Dropdown shows: "Calendar Name (Account Email)"

**Task 6: Optimistic UI**
- **DB schema update required**: Add `pendingSync` field to CalendarEvent interface
  - Edit src/lib/db/types.ts: add `pendingSync?: boolean` to CalendarEvent
  - Bump IndexedDB version in src/lib/db/schema.ts
  - Add migration to set `pendingSync: false` on existing events
- **Event creation flow**:
  - Generate temporary UUID for event (format: `temp-{crypto.randomUUID()}`)
  - Add to IndexedDB immediately with `pendingSync: true`
  - Add to pending_changes queue with:
    - `operation: 'create'`
    - `eventId: tempEventId` (REQUIRED - store temp ID for later deletion)
    - `eventData: eventDetails`
  - Display with 80% opacity while `pendingSync === true`
- **Update PendingChange usage**: Make `eventId` required for create operations
  - Update queue helper functions to require eventId parameter for creates
  - Update processor.ts to expect eventId in pending create records
- **Deduplication strategy**:
  - When queue processor completes create (processor.ts:72):
    1. API returns real Google event ID
    2. Get temp event ID from `pendingChange.eventId`
    3. Delete temp event from IndexedDB: `await deleteEvent(tempEventId)`
    4. Insert real event from API response: `await addEvent(realEvent)`
    5. Remove from pending_changes queue
  - This prevents duplicates by explicit delete + insert pattern
  - If API fails: keep temp event with `pendingSync: true`, set `lastError` in pending_changes
- **Visual feedback**:
  - Pending events (pendingSync=true) render with 80% opacity in useEvents.ts
  - Update convertToEventInput() to check pendingSync flag (similar to hasPendingChanges logic)
  - Use existing alert() for success/failure notifications (no custom toast system needed)
- **Error handling and retry**:
  - On sync failure: event remains with `pendingSync: true`, pending_change has `lastError` set
  - **Retry mechanism**: Add to useEvents hook
    - Expose `getPendingErrorsByEvent(eventId)` helper to check if event has pending errors
    - EventPopover checks this when rendering event details
    - If pending error exists: show "Sync failed" message + "Retry" button
    - Retry button calls: `await retryPendingChange(pendingChangeId)` which resets `retryCount` and clears `lastError`
    - Next queue processor run will retry the operation
  - User can also manually delete failed events

### Phase 4: Documentation (Task 7)

Update docs to reflect new patterns:
- USER_GUIDE: Add Settings OAuth configuration section
- USER_GUIDE: Add calendar management section with toggle screenshots
- SETUP: Update OAuth setup to reference Settings page
- OAUTH_CONFIG: Mark as deprecated, redirect to Settings
- README: Add "Configuration" section mentioning Settings OAuth

## Dependencies & Risks

### Epic Dependencies
- **fn-1-yxs** (WolfCal foundation): All 22 tasks complete - OAuth system, sync engine, IndexedDB, calendar views all implemented

### Technical Details from Codebase
- OAuth flow: src/lib/auth/oauth.ts uses sessionStorage for credential passing (lines 63-64)
- OAuth storage: Code uses `wolfcal:oauth:clientId` and `wolfcal:oauth:clientSecret` keys (CredentialForm.tsx:18-19)
- Calendar storage: src/lib/db/types.ts Calendar interface has `visible` boolean (line 23)
- Event filtering: src/hooks/useEvents.ts uses `getVisibleCalendars()` (line 88)
- Filter state: src/hooks/useEventFilters.ts uses localStorage key `calendar-filters` (line 9)
- Sync engine: src/lib/sync/engine.ts has `syncCalendar()` per-calendar method (line 195)
- Pending changes: src/lib/db/types.ts PendingChange has optional `eventId` field
- Queue processor: src/lib/sync/processor.ts processes pending creates/updates/deletes
- Notifications: Codebase uses `alert()` throughout, no toast system exists

### Key Risks
1. **Breaking existing OAuth flow**: Existing accounts already use correct localStorage keys
   - No migration needed - AddAccountButton already reads `wolfcal:oauth:clientId/Secret`
   - Settings will use same keys for consistency
2. **Calendar enable/disable complexity**: Need to handle partial syncs
   - Solution: Filter calendars in SyncEngine.syncAccount() by `visible === true`
   - Uses existing per-calendar sync method `syncCalendar()`
   - Trigger explicit sync when enabling calendar with alert notifications
3. **Optimistic UI race conditions**: Event could sync before UI updates complete
   - Solution: Explicit delete temp + insert real pattern in queue processor
   - Store temp event ID in PendingChange.eventId for creates
   - Existing pending_changes system prevents duplicates
4. **DB schema migration**: Adding `pendingSync` field requires version bump
   - Solution: Increment IndexedDB version, add migration in schema.ts
   - Default existing events to `pendingSync: false`
5. **20 calendar limit bypass**: Users could enable >20 via FilterPanel bulk actions
   - Solution: Centralized `canEnableCalendar()` utility used by ALL toggle points
   - Enforce limit in Settings AND FilterPanel/useEventFilters
   - Bulk actions (toggleAccount, selectAll) enable only first 20 calendars with alert
6. **OAuth validation**: Can't fully test credentials until OAuth flow runs
   - Solution: Format-only validation (clientId pattern, secret length)
   - Show "Configured" status, not "Valid" to avoid false positives
   - Real validation happens on first successful account add
7. **Calendar fetch timing**: CalendarClient needs account in IndexedDB to decrypt tokens
   - Solution: Fetch calendars in handleAccountAdded AFTER addAccount() completes
   - Account exists in DB so CalendarClient can retrieve/decrypt tokens
8. **Refresh calendars merge**: Need to preserve user visibility choices
   - Solution: Update metadata on existing calendars, preserve `visible` flag
   - Add new calendars as `visible: false`, remove deleted calendars
9. **Calendar pagination**: Current listCalendars doesn't support pagination
   - Solution: Extend listCalendars to accept maxResults/pageToken parameters
   - Return both items array and nextPageToken from response
10. **Retry UI complexity**: No toast system exists, need simple retry mechanism
   - Solution: Use existing alert() for notifications
   - Add retry button in EventPopover when pendingSync + lastError detected
   - Retry resets error and re-queues for next processor run

## Quick commands

```bash
# Build and test
npm run build

# Run in development
npm run dev

# Test OAuth flow (requires configured credentials in Settings)
open http://localhost:5173
```

## Acceptance

### OAuth Flow
- [ ] OAuth credentials configured once in Settings
- [ ] Settings validates credential FORMAT (clientId pattern, secret length)
- [ ] Settings shows status: "Configured" (green) or "Not configured" (gray)
- [ ] Add Account button disabled when credentials missing
- [ ] Disabled button shows tooltip "Configure OAuth credentials in Settings first"
- [ ] Success alert shown after OAuth saved: "OAuth credentials saved successfully"
- [ ] AddAccountButton has no embedded credential form
- [ ] Credentials stored in existing keys: `wolfcal:oauth:clientId`, `wolfcal:oauth:clientSecret`

### Calendar Management
- [ ] CalendarClient.listCalendars() extended with maxResults and pageToken parameters
- [ ] listCalendars returns both items array and nextPageToken
- [ ] Calendar list fetched in Settings.handleAccountAdded AFTER account saved to IndexedDB
- [ ] Primary calendar only synced by default for new accounts
- [ ] All other calendars saved with `visible: false` in IndexedDB
- [ ] Google API pagination handled (maxResults=250, nextPageToken loop)
- [ ] Settings shows expandable calendar lists per account
- [ ] Each calendar has enable/disable toggle updating IndexedDB `visible` field
- [ ] 20-calendar limit enforced via centralized `canEnableCalendar()` utility
- [ ] Limit checked in BOTH Settings toggle AND FilterPanel/useEventFilters toggle
- [ ] Bulk actions (toggleAccount, selectAll) enable max 20 calendars with alert
- [ ] Enabling calendar triggers `SyncEngine.syncCalendar()` with alert notifications
- [ ] "Refresh Calendars" button refetches calendar lists with merge strategy
- [ ] Refresh preserves `visible` flags, updates metadata, adds new as `visible:false`
- [ ] Disabled calendars hide events (useEvents filters by visible) but retain in IndexedDB
- [ ] Visibility changes sync to localStorage `calendar-filters` (existing filter key)
- [ ] Settings and FilterPanel stay in sync via shared IndexedDB state

### Event Creation
- [ ] Event form shows minimal fields by default
- [ ] Advanced fields hidden behind "More options"
- [ ] Calendar dropdown shows flat list with account badges
- [ ] Last used calendar remembered in `wolfcal:lastUsedCalendarId`
- [ ] Events have `pendingSync: boolean` field in DB schema
- [ ] New events added with `pendingSync: true` and temp UUID
- [ ] PendingChange.eventId stores temp event ID for create operations
- [ ] Queue helpers and processor updated to handle eventId in creates
- [ ] Pending events show 80% opacity in calendar view
- [ ] Queue processor deletes temp event + inserts real event on success
- [ ] Failed events show "Sync failed" + "Retry" button in EventPopover
- [ ] Retry button resets error and re-queues pending_change
- [ ] Alert notifications used for sync success/failure

### Documentation
- [ ] USER_GUIDE updated for Settings OAuth and calendar management
- [ ] SETUP updated for new OAuth configuration steps
- [ ] OAUTH_CONFIG marked deprecated, redirects to Settings
- [ ] README updated to mention centralized OAuth

## References

- Current implementation files:
  - src/components/AddAccountButton.tsx:34-35 (reads `wolfcal:oauth:clientId/Secret`)
  - src/components/CredentialForm.tsx:18-19 (existing OAuth credential management)
  - src/pages/Settings.tsx:24-70 (handleAccountAdded - add calendar fetch after addAccount)
  - src/components/EventForm.tsx (needs simplification)
  - src/hooks/useEvents.ts:88 (already uses getVisibleCalendars(), needs retry helper)
  - src/hooks/useEventFilters.ts:9 (uses localStorage key `calendar-filters`, needs limit check)
  - src/lib/auth/oauth.ts:63-64 (sessionStorage credential passing)
  - src/lib/api/calendar.ts (listCalendars needs pagination support)
  - src/lib/sync/engine.ts:530 (syncAccount syncs all calendars, needs visible filter)
  - src/lib/sync/processor.ts:72 (queue processor for creates - needs temp event deletion)
  - src/lib/db/types.ts:23 (Calendar.visible boolean field)
  - src/lib/db/types.ts:29 (CalendarEvent interface - needs pendingSync field)
  - src/lib/db/types.ts (PendingChange.eventId optional - make required for creates)
- Epic dependency: fn-1-yxs (WolfCal foundation - complete)
