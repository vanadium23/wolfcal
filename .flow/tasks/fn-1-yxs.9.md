# fn-1-yxs.9 Implement sync engine with 3-month window

## Description
Implement sync engine to synchronize events between Google Calendar and IndexedDB. Handle 3-month window filtering, incremental sync with syncToken, and full resync fallback.

**Size:** M
**Files:** src/lib/sync/engine.ts, src/lib/sync/types.ts

## Approach

Create SyncEngine class with:
- `syncAccount(accountId)` - sync all calendars for account
- `syncCalendar(accountId, calendarId)` - sync single calendar

Sync flow:
1. Calculate 3-month window: `timeMin = now - 1.5 months`, `timeMax = now + 1.5 months`
2. Check for existing syncToken in sync_metadata store
3. If syncToken exists: incremental sync (only changed events)
4. If no syncToken: full sync (all events in window)
5. Store/update events in IndexedDB
6. Save new syncToken to sync_metadata
7. Delete events outside 3-month window (old events pruned)

Handle pagination with nextPageToken.

Process pending offline changes after pull sync (handled in later task).

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:29-30`:
- 3-month sync window: 1.5 months past + 1.5 months future from today
- Sync frequency: every 15-30 minutes (scheduling handled in later task)

Google Calendar sync: https://developers.google.com/calendar/api/guides/sync
## Acceptance
- [ ] src/lib/sync/engine.ts exports SyncEngine class
- [ ] syncAccount(accountId) fetches all calendars, then calls syncCalendar for each
- [ ] syncCalendar calculates 3-month window (timeMin/timeMax)
- [ ] Incremental sync uses syncToken if available
- [ ] Full sync fetches all events in window if no syncToken
- [ ] Pagination handled with nextPageToken loop
- [ ] Fetched events stored/updated in IndexedDB events table
- [ ] New syncToken saved to sync_metadata after successful sync
- [ ] Events outside 3-month window deleted from IndexedDB (pruning)
- [ ] Sync metadata includes lastSyncTime timestamp
- [ ] TypeScript types for sync state and metadata
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
