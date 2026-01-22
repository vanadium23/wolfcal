# fn-1-yxs.21 Create settings page and error log

## Description
Expand settings page with error log/history viewer for troubleshooting sync failures. Store sync errors in IndexedDB and display in chronological order.

**Size:** M
**Files:** src/pages/Settings.tsx (update), src/components/ErrorLog.tsx, src/lib/db/schema.ts (update), src/lib/sync/engine.ts (update)

## Approach

<!-- Updated by plan-sync: fn-1-yxs.3 established DB_VERSION=1, new table requires migration to v2 -->
Add error_log table to IndexedDB (requires schema migration to v2):
- timestamp
- errorType (sync_failure, api_error, conflict_detection, etc.)
- accountId
- calendarId (optional)
- errorMessage
- errorDetails (JSON string with stack trace, request details)

Update sync engine to log errors:
- Catch exceptions during sync
- Store error to error_log table
- Continue sync for other calendars (don't fail entire sync)

<!-- Updated by plan-sync: fn-1-yxs.7 created Settings.tsx with 3 sections: OAuth Credentials, Connected Accounts, Sync Settings -->
ErrorLog component in Settings (add as 4th section to existing page):
- Display errors in reverse chronological order (newest first)
- Show timestamp, type, account, message
- Expandable details (click to view full error JSON)
- Filter by account, date range
- Clear log button (delete all or by date range)

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:74,152`:
- Show technical details + maintain error log/history
- Error log/history available for troubleshooting sync failures
## Acceptance
- [ ] error_log table added to IndexedDB schema (DB_VERSION bumped to 2, migration in schema.ts)
- [ ] Table fields: timestamp, errorType, accountId, calendarId, errorMessage, errorDetails
- [ ] Sync engine logs errors to error_log table on exceptions
- [ ] API errors logged with request/response details
- [ ] src/components/ErrorLog.tsx displays errors in reverse chronological order
- [ ] Error list shows timestamp, type, account, and message
- [ ] Click error to expand and view full details (JSON)
- [ ] Filter by account dropdown
- [ ] Date range filter (last 24h, 7 days, 30 days, all)
- [ ] Clear log button with confirmation dialog
- [ ] ErrorLog integrated into Settings page as separate tab/section
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
