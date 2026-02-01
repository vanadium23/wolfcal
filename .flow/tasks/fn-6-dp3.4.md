# fn-6-dp3.4 Add 5-minute sync interval option

## Description
Add 5-minute sync interval option to Settings.

**File to modify:** `src/pages/Settings.tsx`

**Change:** Around line 200, add new option before the 15-minute option:
```tsx
<select
  value={syncSettings.syncInterval}
  onChange={(e) => updateSyncSettings({ syncInterval: parseInt(e.target.value) })}
>
  <option value={5}>Every 5 minutes</option>
  <option value={15}>Every 15 minutes</option>
  <option value={30}>Every 30 minutes</option>
  <option value={60}>Every 60 minutes</option>
</select>
```

## Acceptance
- [ ] Settings has "Every 5 minutes" option
- [ ] Selecting 5-minute interval saves to localStorage
- [ ] Sync runs every 5 minutes when selected

## Done summary
Add 5-minute sync interval option to Settings

Changes:
- Added option value={5}>Every 5 minutes</option> to sync interval select
## Evidence
- Commits: da6a0b8
- Tests: Select 5-min option and verify sync runs accordingly
- PRs: