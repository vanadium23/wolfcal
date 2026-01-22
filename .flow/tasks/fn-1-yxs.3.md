# fn-1-yxs.3 Create IndexedDB abstraction layer

## Description
Create abstraction layer for IndexedDB operations to store events, calendars, accounts, and sync metadata. Support schema versioning for future migrations.

**Size:** M
**Files:** src/lib/db/index.ts, src/lib/db/schema.ts, src/lib/db/types.ts, package.json

## Approach

Install IndexedDB wrapper library `idb` (Jake Archibald's promise-based wrapper).

Define object stores:
- `accounts` - OAuth credentials (encrypted), account metadata
- `calendars` - Calendar list per account, colors, visibility
- `events` - Event data with accountId/calendarId foreign keys
- `sync_metadata` - syncToken, nextPageToken, lastSync per calendar
- `pending_changes` - Offline change queue with operation type (create/update/delete)
- `tombstones` - Soft-deleted event IDs for conflict detection

Create CRUD operations for each store with TypeScript types.

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:34-40`:
- All OAuth tokens must be encrypted before storage (handled in later task)
- Recurring events: store recurrence rule only, not instances
- Soft delete with tombstones for sync conflict detection
- Pending offline changes queued for sync

IndexedDB docs: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
idb library: https://github.com/jakearchibald/idb
## Acceptance
- [ ] idb package installed
- [ ] src/lib/db/schema.ts defines 6 object stores (accounts, calendars, events, sync_metadata, pending_changes, tombstones)
- [ ] src/lib/db/types.ts exports TypeScript types for all entities
- [ ] src/lib/db/index.ts exports db connection and CRUD methods
- [ ] Schema versioning configured (currently v1)
- [ ] CRUD methods for accounts (add, get, getAll, update, delete)
- [ ] CRUD methods for calendars
- [ ] CRUD methods for events (with indexes on accountId, calendarId)
- [ ] CRUD methods for sync_metadata
- [ ] CRUD methods for pending_changes queue
- [ ] CRUD methods for tombstones
- [ ] All methods return typed promises
## Done summary
Created IndexedDB abstraction layer with idb library, defining 6 object stores (accounts, calendars, events, sync_metadata, pending_changes, tombstones) with full CRUD operations and TypeScript types.
## Evidence
- Commits: 89732dcace678c8083ddea7c096e656a89820856
- Tests: npm run build
- PRs: