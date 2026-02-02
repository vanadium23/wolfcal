# E2E Test Suite - Quick Reference

## Epic ID
**fn-9-e2e** - Implement smoke E2E test suite with Playwright + MSW

## Quick Commands

```bash
# Create all tasks
.flow/bin/flowctl plan --epic fn-9-e2e

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific test
npx playwright test src/test/e2e/oauth.spec.ts

# Debug mode
npx playwright test --debug --headed

# Verify offline (Linux)
sudo ip link set <interface> down && npm run test:e2e && sudo ip link set <interface> up
```

## Task Checklist

- [ ] **fn-9-e2e.1** - Create MSW browser worker (`src/test/mocks/browser.ts`)
- [ ] **fn-9-e2e.2** - Create test fixtures (`src/test/e2e/fixtures/*.ts`)
- [ ] **fn-9-e2e.3** - Configure Playwright (`src/test/e2e-setup.ts`)
- [ ] **fn-9-e2e.4** - Write OAuth tests (`src/test/e2e/oauth.spec.ts`)
- [ ] **fn-9-e2e.5** - Write sync tests (`src/test/e2e/sync.spec.ts`)
- [ ] **fn-9-e2e.6** - Write view tests (`src/test/e2e/calendar-view.spec.ts`)
- [ ] **fn-9-e2e.7** - Validate offline functionality

## Key Files

### Configuration
- `playwright.config.ts` - Add `setupFiles: ['./src/test/e2e-setup.ts']`
- `src/test/e2e-setup.ts` - MSW injection and test fixtures

### Test Files
- `src/test/e2e/oauth.spec.ts` - OAuth flow tests
- `src/test/e2e/sync.spec.ts` - Calendar sync tests
- `src/test/e2e/calendar-view.spec.ts` - View rendering tests

### Fixtures
- `src/test/e2e/fixtures/accounts.ts` - Account helpers
- `src/test/e2e/fixtures/indexeddb.ts` - Database helpers
- `src/test/e2e/fixtures/oauth.ts` - OAuth helpers

### MSW
- `src/test/mocks/handlers.ts` - Shared API mocks (EXISTING)
- `src/test/mocks/browser.ts` - Browser worker (NEW)

## Test Template

```typescript
import { test, expect, injectMSWWorker, trackNetworkRequests } from '../e2e-setup'

test.describe('Feature Name', () => {
  let networkTracker: ReturnType<typeof trackNetworkRequests>

  test.beforeEach(async ({ page }) => {
    await injectMSWWorker(page)
    networkTracker = trackNetworkRequests(page)
    networkTracker.startTracking()
  })

  test.afterEach(async ({ page }) => {
    networkTracker.stopTracking()
    networkTracker.assertNoRealCalls() // Verify offline!
  })

  test('should do something', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.something')).toBeVisible()
  })
})
```

## Offline Verification

Every test automatically verifies no real Google API calls were made:

```typescript
networkTracker.assertNoRealCalls() // Throws if googleapis.com was contacted
```

## Common Fixtures

```typescript
// Accounts
import { createMockAccount, clearAllAccounts } from './fixtures/accounts'
await createMockAccount(page, { email: 'test@example.com' })

// IndexedDB
import { clearDatabase, seedMockEvents } from './fixtures/indexeddb'
await clearDatabase(page)
await seedMockEvents(page, [{ summary: 'Test Event' }])

// OAuth
import { mockOAuthPopup, completeOAuthFlow } from './fixtures/oauth'
await mockOAuthPopup(context)
await completeOAuthFlow(context, page)
```

## Dependencies

```
fn-9-e2e.1 (browser.ts)
    ↓
fn-9-e2e.2 (fixtures)
    ↓
fn-9-e2e.3 (Playwright config)
    ↓
fn-9-e2e.4 (OAuth tests) ─────┐
fn-9-e2e.5 (Sync tests) ──────┤──→ fn-9-e2e.7 (Offline validation)
fn-9-e2e.6 (View tests) ──────┘
```

## Documentation

- **Full Guide:** `/home/deploy/src/wolfcal/.flow/tasks/IMPLEMENTATION_GUIDE.md`
- **E2E Tests:** `/home/deploy/src/wolfcal/tests/E2E.md`
- **Implementation Summary:** `/home/deploy/src/wolfcal/.flow/tasks/E2E_IMPLEMENTATION_PLAN.md`
- **Epic Spec:** `/home/deploy/src/wolfcal/.flow/specs/fn-9-e2e.md`

## Acceptance Criteria

- [ ] OAuth flow validates authentication without internet
- [ ] Calendar sync validates MSW intercepts all API calls
- [ ] Calendar view validates event rendering and interactions
- [ ] All tests pass with network disabled
- [ ] MSW browser worker properly injected
- [ ] Test fixtures provide reusable helpers
- [ ] Tests run in < 60 seconds total

## Estimated Time

**Total: ~11 hours**
- fn-9-e2e.1: 1h
- fn-9-e2e.2: 2h
- fn-9-e2e.3: 1h
- fn-9-e2e.4: 2h
- fn-9-e2e.5: 2h
- fn-9-e2e.6: 2h
- fn-9-e2e.7: 1h

## Critical Requirement

✅ **MUST RUN WITHOUT INTERNET**
- All Google APIs mocked via MSW
- Network tracking fails if real calls detected
- Test execution possible with network disabled
