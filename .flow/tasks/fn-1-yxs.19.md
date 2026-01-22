# fn-1-yxs.19 Build conflict resolution UI with side-by-side comparison

## Description
Build conflict resolution UI with side-by-side comparison. Detect conflicts during sync and allow user to manually choose local or remote version.

**Size:** M
**Files:** src/components/ConflictModal.tsx, src/lib/sync/conflicts.ts, src/lib/sync/engine.ts (update)

## Approach

Conflict detection in sync engine:
- When fetching remote event, check if local event modified after last sync
- Compare `updated` timestamps or use local modified flag
- If both remote and local modified since last sync: conflict

Conflict types:
- Update-update: both local and remote modified
- Delete-update: local deleted, remote modified (or vice versa)

ConflictModal component:
- Show side-by-side comparison of local vs remote event
- Fields: title, time, description, location, attendees
- Highlight differences
- Buttons: "Use Local", "Use Remote", "Defer" (skip for now)
- On selection: apply chosen version + clear conflict flag

Store conflicts in IndexedDB:
- Add conflict flag to events table
- Store both versions (local + remote) temporarily

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:37,144`:
- Manual conflict resolution via side-by-side comparison UI
- Sync conflicts show side-by-side comparison for manual resolution
## Acceptance
- [ ] src/lib/sync/conflicts.ts exports detectConflict() function
- [ ] Conflict detected when both local and remote modified since last sync
- [ ] Conflict flag added to events table schema
- [ ] Conflicted events stored with both local and remote versions
- [ ] src/components/ConflictModal.tsx displays side-by-side comparison
- [ ] Modal shows local event on left, remote on right
- [ ] Differences highlighted (color-coded fields that differ)
- [ ] "Use Local" button applies local version, removes conflict flag
- [ ] "Use Remote" button applies remote version, removes conflict flag
- [ ] "Defer" button closes modal without resolving (conflict persists)
- [ ] Conflict indicator shown on calendar event (icon or badge)
- [ ] Multiple conflicts: modal shows one at a time with "N of M" counter
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
