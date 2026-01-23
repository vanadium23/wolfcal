# fn-1-yxs.14 Add multi-account display with color coding

## Description
Display events from multiple Google accounts with color coding per account. Show all duplicate events (no deduplication) with distinct visual styling.

**Size:** M
**Files:** src/components/Calendar.tsx (update), src/lib/events/colors.ts, src/hooks/useEvents.ts

## Approach

Create useEvents hook:
- Fetch events from all connected accounts in IndexedDB
- Combine events into single array
- Apply color coding based on accountId
- Return combined event list for FullCalendar

Color strategy:
- Assign distinct color to each account (from preset palette)
- Store account colors in accounts table
- Allow user to customize colors in settings

Event rendering:
- Use FullCalendar's `eventContent` or `backgroundColor` property
- Show account indicator (color bar, background, or border)
- No deduplication: show all events even if same event in multiple accounts

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:53-57`:
- Color coding per account
- Individual calendar toggles within each account (handled in next task)
- Show all duplicate events (no deduplication)
## Acceptance
- [ ] src/hooks/useEvents.ts created to fetch events from IndexedDB
- [ ] Hook fetches events from all connected accounts
- [ ] Events combined into single array with accountId preserved
- [ ] src/lib/events/colors.ts defines color palette (8+ distinct colors)
- [ ] Each account assigned a color from palette
- [ ] Account colors stored in accounts table
- [ ] FullCalendar events styled with account color (backgroundColor or border)
- [ ] Duplicate events visible (same event in 2 accounts shows twice)
- [ ] Color legend shows account name → color mapping
- [ ] Calendar.tsx uses useEvents hook to load and display events
## Done summary
Implemented multi-account event display with color coding. Created useEvents hook that fetches events from all connected accounts, assigns persistent colors from a 12-color palette, and displays a visual legend mapping account emails to colors. All duplicate events are shown without deduplication.
## Evidence
- Commits: 456187b12d81549e7213bba134c3704eac653728
- Tests: npm run build
- PRs: