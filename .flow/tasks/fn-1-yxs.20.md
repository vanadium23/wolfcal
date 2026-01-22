# fn-1-yxs.20 Add soft delete with tombstones

## Description
Implement soft delete with tombstones for event deletion. Store deleted event IDs to detect conflicts when remote event modified while local deleted.

**Size:** S
**Files:** src/lib/events/delete.ts, src/lib/sync/engine.ts (update), src/lib/db/schema.ts (update)

## Approach

Soft delete flow:
1. User deletes event locally
2. Mark event as deleted in events table (add `deleted` flag)
3. Add event ID to tombstones table with timestamp
4. Queue delete operation to pending_changes
5. Event hidden from calendar display

Tombstone usage in sync:
- When remote event received during sync, check tombstones table
- If event ID in tombstones: skip (already deleted locally)
- If remote event modified + local tombstone: conflict (remote modified, local deleted)

Tombstone cleanup:
- After successful remote delete (pending change processed), remove tombstone
- Prune tombstones older than 3 months (outside sync window)

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:38,136`:
- "Deleted events: Soft delete with tombstones for sync conflict detection"
- "User can delete events (soft delete with tombstones)"
## Acceptance
- [ ] events table schema updated with `deleted` boolean flag
- [ ] tombstones table created (eventId, deletedAt timestamp)
- [ ] src/lib/events/delete.ts exports softDelete() function
- [ ] softDelete marks event as deleted in events table
- [ ] softDelete adds eventId to tombstones table
- [ ] softDelete queues delete operation to pending_changes
- [ ] Deleted events excluded from calendar display (filter out deleted=true)
- [ ] Sync engine checks tombstones before processing remote events
- [ ] Conflict detected if remote modified + local tombstone exists
- [ ] Tombstone removed after successful remote delete
- [ ] Tombstones older than 3 months pruned during sync
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
