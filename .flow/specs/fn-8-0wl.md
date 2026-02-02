# fn-8-0wl Implement Vitest + MSW tests for WolfCal components and sync logic

## Overview
Implement automated tests using Vitest + MSW for WolfCal's critical user flows and core business logic. Focus on SyncEngine, Google Calendar API integration, and data flow before UI components.

## Scope
**Priority: Core logic first**
- SyncEngine with Google Calendar API mocking
- Event CRUD operations (create, read, update, delete)
- OAuth flow and token management
- Offline queue and sync status
- UI components (EventForm, RefreshButton, Calendar)

**Coverage Level: Critical flows**
- Main user paths with some edge cases
- Error handling for API failures
- Data consistency across sync operations

**Framework Validation**
- Keep validation tests as framework proof (vitest-msw-validation.test.tsx, react-testing-library-validation.test.tsx)

## Approach
1. **Task Order**: Start with SyncEngine tests (fn-8-0wl.4) → MSW handlers (fn-8-0wl.5) → EventForm (fn-8-0wl.1) → RefreshButton (fn-8-0wl.2) → Calendar (fn-8-0wl.3)
2. **MSW Strategy**: Add handlers for missing endpoints (event patch, delete, batch operations)
3. **Test Structure**: Organize by feature (sync/, components/, mocks/)
4. **Mock Strategy**: Use MSW to intercept fetch() for all Google Calendar API calls

## Quick commands
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:ui` - Run tests with UI

## Acceptance
- [ ] SyncEngine tests pass (sync, conflict resolution, retry logic)
- [ ] MSW handlers cover all used Google Calendar endpoints
- [ ] EventForm tests validate form submission and error handling
- [ ] RefreshButton tests verify sync behavior and status updates
- [ ] Calendar tests confirm event rendering
- [ ] All tests pass with `npm run test:run`
- [ ] Validation tests preserved as framework proof

## References
- DRR: `.quint/decisions/DRR-2026-02-01-testing-framework-vitest-msw-for-wolfcal.md`
- Evidence: `.quint/evidence/2026-02-01-internal-vitest-msw-for-component-and-api-testing.md`
- Google Calendar API: https://developers.google.com/calendar/api/v3/reference
