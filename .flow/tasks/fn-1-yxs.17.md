# fn-1-yxs.17 Implement offline change queue

## Description
Implement offline change queue to store pending creates/updates/deletes. Process queue when online and handle sync errors.

**Size:** M
**Files:** src/lib/sync/queue.ts, src/lib/sync/processor.ts, src/hooks/useOnlineStatus.ts

## Approach

<!-- Updated by plan-sync: fn-1-yxs.3 defined PendingChange type with specific field names -->
Queue structure in pending_changes table (already defined in fn-1-yxs.3):
- id: UUID primary key
- operation: 'create' | 'update' | 'delete'
- entityType: 'event'
- accountId, calendarId: foreign keys
- eventId: for update/delete operations (optional)
- eventData: Partial<CalendarEvent> for create/update
- createdAt: when queued (Unix timestamp)
- retryCount: retry count
- lastError: optional error message

Queue processor:
- Runs when app comes online (detected via navigator.onLine + online event)
- Process queue in FIFO order
- For each pending change:
  - Attempt API call (create/update/delete)
  - On success: remove from queue + update IndexedDB
  - On failure: increment retries, keep in queue
- Max retries: 3 attempts, then flag as failed

useOnlineStatus hook:
- Monitor navigator.onLine + window 'online'/'offline' events
- Trigger queue processor when online status changes to true

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:40,50`:
- "Offline edits: Queue changes for sync with clear 'pending sync' indicators"
- "Work offline with queued sync"
## Acceptance
- [ ] src/lib/sync/queue.ts exports addToQueue() function
- [ ] addToQueue stores operation in pending_changes table
- [ ] Queue operations: create, update, delete
- [ ] src/lib/sync/processor.ts exports processQueue() function
- [ ] processQueue fetches pending_changes ordered by timestamp (FIFO)
- [ ] For each change: API call attempted
- [ ] Success: remove from queue + update local event
- [ ] Failure: increment retries, keep in queue
- [ ] Max 3 retries before marking as failed
- [ ] src/hooks/useOnlineStatus.ts monitors navigator.onLine
- [ ] Online status changes trigger processQueue()
- [ ] Queue processor runs on app startup if online
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
