# E2E Smoke Tests for WolfCal

## Overview

WolfCal's smoke E2E test suite validates critical user flows using Playwright with MSW (Mock Service Worker) for API mocking. **All tests run without requiring an internet connection** - Google Calendar API endpoints are fully mocked.

## Test Scenarios

### 1. OAuth Flow (`oauth.spec.ts`)
- ✅ Complete OAuth authentication flow
- ✅ Token storage in IndexedDB
- ✅ Error handling (denied consent, timeout)
- ✅ Multiple account support
- ✅ Token refresh on expiry

### 2. Calendar Sync (`sync.spec.ts`)
- ✅ Full calendar sync (initial sync)
- ✅ Incremental sync (with syncToken)
- ✅ Multiple calendar synchronization
- ✅ Sync error handling and retry
- ✅ Event pruning outside sync window
- ✅ Visible-only calendar sync

### 3. Calendar View (`calendar-view.spec.ts`)
- ✅ FullCalendar component rendering
- ✅ Event display with correct styling
- ✅ View switching (month/week/day)
- ✅ Event interactions (click, popover)
- ✅ Date navigation
- ✅ Filter panel functionality

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run with Playwright UI
```bash
npm run test:e2e:ui
```

### Run specific test file
```bash
npx playwright test src/test/e2e/oauth.spec.ts
```

### Run with visible browser (debugging)
```bash
npx playwright test --headed
```

### Run single test
```bash
npx playwright test -g "should complete OAuth flow"
```

## Offline Requirement

**Strict Requirement:** All E2E tests must pass without internet connection.

### Verification
Tests include network tracking that fails if real Google API calls are detected:

```typescript
networkTracker.assertNoRealCalls() // Throws if googleapis.com was contacted
```

### Running offline
To verify offline functionality:
```bash
# Disable network interface (Linux)
sudo ip link set <interface> down

# Run tests
npm run test:e2e

# Re-enable network
sudo ip link set <interface> up
```

## Architecture

### MSW Integration
MSW v2+ browser worker is injected via Playwright's `page.addInitScript()`:

```typescript
// src/test/e2e-setup.ts
await page.addInitScript(() => {
  // MSW worker code injected here
  // Intercepts fetch() for Google APIs
})
```

### File Structure
```
src/test/
├── mocks/
│   ├── handlers.ts        # Shared MSW handlers (Vitest + Playwright)
│   ├── server.ts          # Node.js server for Vitest
│   └── browser.ts         # Browser worker for Playwright
├── e2e/
│   ├── fixtures/          # Test helpers
│   │   ├── accounts.ts    # Account management
│   │   ├── indexeddb.ts   # IndexedDB utilities
│   │   └── oauth.ts       # OAuth flow helpers
│   ├── oauth.spec.ts      # OAuth tests
│   ├── sync.spec.ts       # Calendar sync tests
│   └── calendar-view.spec.ts  # View tests
└── e2e-setup.ts           # Playwright configuration
```

## Test Fixtures

### IndexedDB Helpers
```typescript
import { clearDatabase, seedMockEvents, getStoredEvents } from './fixtures/indexeddb'

// Clear all data
await clearDatabase(page)

// Seed mock events
await seedMockEvents(page, [
  { id: '1', summary: 'Test Event', start: { dateTime: '...' } }
])

// Verify storage
const events = await getStoredEvents(page)
```

### Account Helpers
```typescript
import { createMockAccount, createValidAccount } from './fixtures/accounts'

// Create account with valid token
await createValidAccount(page, { email: 'test@example.com' })
```

### OAuth Helpers
```typescript
import { mockOAuthPopup, completeOAuthFlow } from './fixtures/oauth'

// Mock successful OAuth
await mockOAuthPopup(context, { access_token: 'mock_token' })

// Complete full flow
await completeOAuthFlow(context, page)
```

## Debugging

### View trace files
```bash
npx playwright show-trace trace.zip
```

### Screenshot on failure
Automatically captured in `test-results/` directory.

### Debug mode
```bash
npx playwright test --debug
```

### Playwright Inspector
```bash
npx playwright test --inspector
```

## CI/CD Integration

### GitHub Actions example
```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Contributing

### Adding new tests
1. Create test file in `src/test/e2e/`
2. Import test setup: `import { test, expect, injectMSWWorker } from '../e2e-setup'`
3. Inject MSW worker in beforeEach: `await injectMSWWorker(page)`
4. Write tests using Playwright API
5. Verify offline compatibility

### Testing new API endpoints
1. Add MSW handler to `src/test/mocks/handlers.ts`
2. Verify handler in Vitest tests first
3. Use in E2E test (MSW will intercept automatically)

### Updating fixtures
Add new helper functions to appropriate fixture file:
- `accounts.ts` - Account/account-related
- `indexeddb.ts` - Database operations
- `oauth.ts` - Authentication flows

## Troubleshooting

### Tests fail with "Real API calls detected"
- MSW worker not properly injected
- Check `injectMSWWorker()` is called in `beforeEach`
- Verify worker script in `e2e-setup.ts`

### Tests timeout
- Vite dev server not starting
- Check `playwright.config.ts` webServer configuration
- Verify port 5173 is available

### IndexedDB errors
- Database not initialized
- Use `waitForDatabase()` after navigation
- Check app initialization logic

### MSW not intercepting requests
- Service worker not registered
- Check browser console for MSW errors
- Verify `page.addInitScript()` is called before navigation

## References

- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [FullCalendar Documentation](https://fullcalendar.io/docs)
- WolfCal OAuth: `src/lib/auth/oauth.ts`
- WolfCal Sync: `src/lib/sync/engine.ts`

## Future Enhancements

- [ ] Visual regression tests (Playwright screenshots)
- [ ] Performance testing (page load metrics)
- [ ] Accessibility testing (axe-core integration)
- [ ] Mobile viewport testing
- [ ] Cross-browser testing (Firefox, WebKit)
- [ ] API mocking with realistic response times
- [ ] Network throttling tests
