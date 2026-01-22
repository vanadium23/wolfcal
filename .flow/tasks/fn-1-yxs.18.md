# fn-1-yxs.18 Add sync status indicators and manual refresh

## Description
Add visual indicators for sync status (online/offline, syncing, last sync time) and manual refresh button. Schedule auto-sync every 15-30 minutes.

**Size:** M
**Files:** src/components/SyncStatusBar.tsx, src/lib/sync/scheduler.ts, src/components/RefreshButton.tsx

## Approach

SyncStatusBar component:
- Online/offline indicator (green dot = online, red = offline)
- Sync status text: "Syncing...", "Last synced 2 min ago", "Offline - changes queued"
- Display pending change count if queue not empty

RefreshButton component:
- Manual sync trigger button
- Shows loading spinner during sync
- Disabled when offline

Sync scheduler:
- Use setInterval to trigger sync every N minutes (configurable 15/20/30)
- Only run when online
- Skip if sync already in progress (mutex lock)
- Read interval from settings (localStorage)

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:28,40,73`:
- Auto-sync every 15-30 minutes when online
- Manual refresh button triggers immediate sync
- Sync status shows online/offline state and last sync time
- Pending offline changes clearly indicated
## Acceptance
- [ ] src/components/SyncStatusBar.tsx displays online/offline status
- [ ] Status bar shows last sync time (relative, e.g. "2 min ago")
- [ ] Status bar shows "Syncing..." during active sync
- [ ] Pending change count displayed when queue not empty
- [ ] src/components/RefreshButton.tsx triggers manual sync on click
- [ ] Button shows loading spinner during sync
- [ ] Button disabled when offline
- [ ] src/lib/sync/scheduler.ts implements auto-sync with setInterval
- [ ] Sync interval configurable (15/20/30 minutes from settings)
- [ ] Auto-sync only runs when online
- [ ] Mutex lock prevents concurrent syncs
- [ ] Scheduler starts on app load, stops on unmount
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
