# fn-6-dp3.3 Change default calendar view to week

## Description
Change default calendar view from month to week view.

**File to modify:** `src/components/Calendar.tsx`

**Change:** Line 22
```typescript
// Before:
const [currentView, setCurrentView] = useState<ViewType>('dayGridMonth')

// After:
const [currentView, setCurrentView] = useState<ViewType>('timeGridWeek')
```

## Acceptance
- [ ] App loads in week view by default
- [ ] Month/Day view buttons still work

## Done summary
Change default calendar view to week view

Changes:
- Changed initial state from "dayGridMonth" to "timeGridWeek"
## Evidence
- Commits: a3b2290
- Tests: Load app and verify week view is default
- PRs: