# fn-6-dp3.1 Fix gray event color persisting after sync until reload

## Description
Events appear gray after creation and stay gray after sync completes. Only page reload fixes it.

**Root cause:** The `useEvents` hook checks for pending changes and sets gray color (`#9ca3af`) via `hasPendingChanges` flag. After sync, pending changes are deleted in `sync/processor.ts:211` but Calendar's events are never refreshed.

**Files to modify:**
- `src/App.tsx` - Add state to trigger Calendar refresh
- `src/components/Calendar.tsx` - Accept refresh trigger prop, call refresh() when triggered
- Optional: `src/hooks/useEvents.ts` - Consider reactive approach

**Implementation approach:**
1. In `App.tsx`: Add `const [refreshTrigger, setRefreshTrigger] = useState(0)`
2. Pass `refreshTrigger` to Calendar as prop
3. In `Calendar.tsx`: Add `useEffect` that calls `refresh()` when `refreshTrigger` changes
4. In `App.tsx`: Pass `onSyncComplete={() => { setManualSyncing(false); setRefreshTrigger(prev => prev + 1); }}` to RefreshButton

**Alternative simpler approach:**
Use an event emitter or callback prop to trigger refresh directly.

## Acceptance
- [ ] Create event → appears gray
- [ ] Click Refresh → sync completes → event changes to correct color immediately
- [ ] No page reload needed
- [ ] New events show correct color after sync

## Done summary
Fix gray event color by triggering Calendar refresh after sync completes

Changes:
- Added refreshTrigger state in App.tsx
- Passed refreshTrigger to Calendar component
- Updated RefreshButton onSyncComplete to trigger refresh
- Added useEffect in Calendar to refresh when refreshTrigger changes
## Evidence
- Commits: 3e0c27f
- Tests: Manual test - create event, refresh, verify color changes without reload
- PRs: