# fn-3-tky.1 Fix EventForm to use chosen time

## Description
TBD

## Acceptance
- [ ] TBD

## Done summary
Fixed EventForm to preserve the user's chosen time when toggling the all-day checkbox. Previously, when a user selected a time range (e.g., 2:00 PM - 3:00 PM) and then toggled all-day off/on, the form would reset to hardcoded 9:00 AM / 10:00 AM. The fix uses a ref to store the initialRange and uses the original times when converting between all-day and timed formats.
## Evidence
- Commits: 7bc396094ff5ebd1ab11dded754d953c2068cc4b
- Tests: npm run build
- PRs: