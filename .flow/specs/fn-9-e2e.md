# fn-9-e2e Implement smoke E2E test suite with Playwright + MSW

## Overview
Implement a smoke E2E test suite using Playwright with MSW (Mock Service Worker) to test critical user scenarios without requiring internet connectivity. The suite will validate three core flows: OAuth authentication, calendar synchronization, and calendar view rendering.

## Scope
**Priority: Critical user flows**
- OAuth flow - test user authentication from popup to token storage
- Calendar sync - test data synchronization between Google Calendar API and IndexedDB
- Calendar view - test calendar rendering, event display, and view switching

**Coverage Level: Smoke tests**
- Main happy path for each critical flow
- Initial sync and incremental sync only (no pagination, conflict testing)
- Basic error handling validation
- No internet dependency - all Google APIs mocked via MSW
- Headless mode everywhere (development and CI)

**Framework Integration**
- Playwright for browser automation
- MSW Service Worker for Google Calendar API mocking (Playwright-specific handlers, not shared with Vitest)
- Run without internet connection (strict requirement, validated via trackNetworkRequests helper)

## Clarified Requirements (from Interview)

### OAuth Flow Details
- **Popup Handling**: Intercept postMessage communication (not popup HTML mocking)
- **Token Encryption**: Verify tokens can be successfully decrypted (not just different from plaintext)
- **User Info**: Mock OAuth2 userinfo endpoint to return specific test email addresses (e.g., `test-e2e@example.com`)
- **Initial Sync**: Verify initial calendar sync triggers after OAuth completes

### Calendar Sync Details
- **Sync Button**: Use navbar RefreshButton (`.refresh-button` selector) for manual sync triggering
- **Sync Status**: Use SyncStatusBar (`.sync-status-bar` selector) to verify sync state
- **Sync Scenarios**: Initial sync (no syncToken) and incremental sync (with existing syncToken) only
- **Test Event Data**: Time-relative events (e.g., "event 1 hour from now", not fixed dates)
- **Network Verification**: Use trackNetworkRequests helper to verify no real API calls

### Calendar View Details
- **Rendering Verification**: Verify event rendering, colors match calendar colors, time accuracy
- **View Switching**: Test month/week/day view switching
- **Event Interactions**: No interaction tests (clicking events, popovers) - excluded from smoke test
- **Calendar Visibility**: Do not test calendar visibility toggle - excluded from scope

### MSW Integration Details
- **Worker Approach**: Implement proper MSW Service Worker via `setupWorker` from `msw/browser`
- **Handler Reuse**: Create Playwright-specific handlers in separate file (not shared with Vitest)
- **Test Data**: Use mock credentials stored in fixtures (not environment variables)

## Technical Approach

### MSW + Playwright Integration
MSW v2+ supports browser workers via Service Workers. For Playwright E2E tests:

1. **Inject MSW worker** - Use `page.addInitScript()` to inject MSW setup before page loads
2. **Playwright-specific handlers** - Create `src/test/mocks/handlers-e2e.ts` (separate from Vitest handlers)
3. **Browser-compatible setup** - Create `src/test/mocks/browser.ts` using `setupWorker` from `msw/browser`

### Test Scenarios

#### 1. OAuth Flow Test
- Navigate to Settings page
- Click "Add Account" button (`.nav-link:has-text("Settings")` -> AddAccountButton)
- Intercept postMessage communication (not popup HTML mocking)
- Mock OAuth2 userinfo endpoint to return `test-e2e@example.com`
- Verify token storage in IndexedDB (encrypted, decryptable)
- Verify account email matches mocked user info
- Verify account appears in account list
- Verify initial calendar sync triggers (wait for "Syncing..." then success)

#### 2. Calendar Sync Test
- Pre-populate IndexedDB with mock account and tokens
- Navigate to Calendar view
- Trigger manual sync via navbar RefreshButton (`.refresh-button`)
- Verify SyncStatusBar shows "Syncing..." then success (`.sync-status-bar`)
- **Initial sync test**: No syncToken in metadata, verify full sync occurs
- **Incremental sync test**: Existing syncToken, verify delta sync occurs
- Verify MSW handlers intercept Google Calendar API calls (trackNetworkRequests)
- Verify events stored in IndexedDB
- **Do NOT test**: Event rendering in FullCalendar (covered by view test)

#### 3. Calendar View Test
- Pre-populate IndexedDB with time-relative mock events
- Navigate to Calendar view
- Verify FullCalendar renders correctly (`.fc` container exists)
- Verify events display with correct colors (matching calendar backgroundColor)
- Verify event times are accurate
- Test view switching (month/week/day) - verify correct DOM elements (`.fc-daygrid-month-view`, `.fc-timegrid-week-view`, `.fc-timegrid-day-view`)
- **Do NOT test**: Event clicking, popovers, interactions
- **Do NOT test**: Calendar visibility toggle

### File Structure
```
src/test/
├── mocks/
│   ├── handlers.ts           # Existing - Vitest MSW handlers
│   ├── server.ts             # Existing - Node.js server for Vitest
│   ├── handlers-e2e.ts       # NEW - Playwright-specific MSW handlers
│   └── browser.ts            # NEW - Browser worker for Playwright
├── e2e/
│   ├── playwright-validation.spec.ts  # Existing - framework validation
│   ├── fixtures/             # NEW - Test fixtures and helpers
│   │   ├── accounts.ts       # Mock account helpers with mock credentials
│   │   ├── indexeddb.ts      # IndexedDB manipulation helpers
│   │   ├── oauth.ts          # OAuth flow helpers (postMessage interception)
│   │   └── network.ts        # Network tracking helpers (trackNetworkRequests)
│   ├── oauth.spec.ts         # NEW - OAuth flow tests
│   ├── sync.spec.ts          # NEW - Calendar sync tests
│   └── calendar-view.spec.ts # NEW - Calendar view tests
└── e2e-setup.ts              # UPDATE - Add MSW worker injection
```

### Configuration Updates

**playwright.config.ts** - Add test setup file:
```typescript
export default defineConfig({
  testDir: './src/test/e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
  },
  // Add setup file for MSW worker injection
  setupFiles: ['./src/test/e2e-setup.ts'],
})
```

## Quick commands
- `npm run test:e2e` - Run smoke E2E tests (headless)
- `npm run test:e2e:ui` - Run with Playwright UI (debug mode)
- `npm run test:e2e -- --project=chromium` - Run specific browser
- All tests run headless by default (no --headed option in standard usage)

## Acceptance
- [ ] OAuth flow test validates authentication with postMessage interception
- [ ] Token encryption verified (decryptable, not just different from plaintext)
- [ ] User info mocked with test email addresses
- [ ] Calendar sync test validates initial sync (no syncToken)
- [ ] Calendar sync test validates incremental sync (with syncToken)
- [ ] Navbar RefreshButton used for manual sync triggering
- [ ] SyncStatusBar shows "Syncing..." then success
- [ ] Calendar view test validates event rendering, colors, time accuracy
- [ ] Calendar view test validates view switching (month/week/day)
- [ ] No event interaction tests (clicking, popovers) - excluded
- [ ] No calendar visibility toggle tests - excluded
- [ ] MSW Service Worker properly implemented (not fetch override)
- [ ] Playwright-specific handlers (not shared with Vitest)
- [ ] trackNetworkRequests helper verifies no real API calls
- [ ] All tests pass with trackNetworkRequests validation
- [ ] All tests run headless (development and CI)
- [ ] Tests run in < 60 seconds total (smoke test requirement)

## References
- MSW Browser Integration: https://mswjs.io/docs/integrations/playwright
- Reuse existing MSW handlers: `src/test/mocks/handlers.ts`
- Existing Playwright config: `playwright.config.ts`
- Google Calendar API: https://developers.google.com/calendar/api/v3/reference
- OAuth implementation: `src/lib/auth/oauth.ts`
- Sync engine: `src/lib/sync/engine.ts`
