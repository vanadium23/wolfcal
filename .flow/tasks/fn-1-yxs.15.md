# fn-1-yxs.15 Create account/calendar filter toggles

## Description
Create filter UI with account-level and calendar-level toggles to show/hide events. Persist filter state in localStorage.

**Size:** M
**Files:** src/components/FilterPanel.tsx, src/hooks/useEventFilters.ts, src/components/Calendar.tsx (update)

## Approach

FilterPanel component:
- List of accounts (expandable/collapsible)
- Each account has checkbox (show/hide all)
- Nested list of calendars under each account with individual checkboxes
- Filter state stored in localStorage (persist across sessions)

useEventFilters hook:
- Manage filter state (which accounts/calendars visible)
- Apply filters to event list before rendering
- Return filtered events

Update Calendar to use filtered events from hook.

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:54-55`:
- Account-level filters to show/hide accounts
- Individual calendar toggles within each account
## Acceptance
- [ ] src/components/FilterPanel.tsx created with account/calendar tree
- [ ] Each account has checkbox to toggle all calendars in that account
- [ ] Each calendar has individual checkbox
- [ ] Checkboxes update filter state on click
- [ ] src/hooks/useEventFilters.ts manages filter state
- [ ] Filter state stored in localStorage (key: 'calendar-filters')
- [ ] useEventFilters returns filtered event list based on visible accounts/calendars
- [ ] Calendar.tsx displays only filtered events
- [ ] Filter panel accessible (sidebar or header)
- [ ] Filter state persists across browser sessions
- [ ] Select all / deselect all buttons for convenience
## Done summary
Created FilterPanel component with account/calendar tree structure and useEventFilters hook to manage filter state persisted in localStorage. Calendar component now integrates the filter panel as a collapsible sidebar with automatic event refresh on filter changes.
## Evidence
- Commits: 876d6d76cde4c9db67fcaf9844de22fc7dd55516
- Tests: npm run build
- PRs: