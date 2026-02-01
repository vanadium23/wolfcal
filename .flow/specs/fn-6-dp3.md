# fn-6-dp3 Fix UI bugs and add sync interval option

## Overview
Fix 4 specific UI bugs and polish issues reported by user:
1. Events stay gray after sync until reload (pending change UI state not cleared)
2. Event popup can appear below screen viewport (positioning doesn't account for boundaries)
3. Default view should be week instead of month
4. Add 5-minute sync interval option

## Scope

### Bug 1: Gray event color persisting after sync
**Root cause:** After sync completes, pending changes are deleted but Calendar events are not refreshed. The `useEvents` hook checks for pending changes and shows gray (`#9ca3af`) for events with `hasPendingChanges`. After sync, pending changes are cleared but the UI doesn't update until page reload.

**Fix:** Call `refresh()` in Calendar component after sync completes. Connect RefreshButton's `onSyncComplete` to trigger a refresh in Calendar.

### Bug 2: Event popup below viewport
**Root cause:** `EventPopover` uses `position: fixed` with absolute `top/left` coordinates without checking viewport boundaries.

**Fix:** Calculate safe position considering viewport height/width and popover dimensions. Flip to above if below, flip to left if right would overflow.

### Bug 3: Default view to week
**Root cause:** `Calendar.tsx` line 22 has `useState<ViewType>('dayGridMonth')`

**Fix:** Change initial state to `'timeGridWeek'`

### Bug 4: Add 5-minute sync interval
**Root cause:** `Settings.tsx` lines 200-202 only have options for 15, 30, 60 minutes

**Fix:** Add `<option value={5}>Every 5 minutes</option>`

## Approach

### Task 1: Fix gray event after sync
1. Add a refresh callback mechanism from App.tsx to Calendar
2. Pass `onSyncComplete` callback to Calendar that calls `refresh()`
3. Trigger refresh when RefreshButton completes sync

### Task 2: Fix popup positioning
1. Calculate popover dimensions (use `useRef`)
2. Get viewport dimensions (`window.innerWidth`, `window.innerHeight`)
3. Adjust position: if `y + height > viewportHeight`, place above pointer
4. Adjust x position: if `x + width > viewportWidth`, shift left

### Task 3: Default week view
1. Change `useState<ViewType>('dayGridMonth')` to `useState<ViewType>('timeGridWeek')` in Calendar.tsx

### Task 4: 5-minute sync option
1. Add `<option value={5}>Every 5 minutes</option>` to Settings.tsx sync interval select

## Quick commands
```bash
npm run build   # Verify build after changes
npm run dev     # Test changes locally
```

## Acceptance
- [ ] Events show correct color immediately after sync (no reload needed)
- [ ] Event popup always visible within viewport
- [ ] Default view is week view on app load
- [ ] 5-minute sync option available in Settings

## References
- src/components/Calendar.tsx:22 - Current default view state
- src/components/EventPopover.tsx:216-218 - Current positioning logic
- src/hooks/useEvents.ts:33-36 - Gray color logic for pending changes
- src/pages/Settings.tsx:200-202 - Current sync interval options
