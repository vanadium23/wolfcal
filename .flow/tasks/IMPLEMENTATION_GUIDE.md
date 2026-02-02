# E2E Smoke Test Suite - Implementation Guide

## Epic: fn-9-e2e - Implement smoke E2E test suite with Playwright + MSW

### Clarified Requirements Summary

Based on interview with user, here are the key implementation decisions:

| Aspect | Decision |
|--------|----------|
| OAuth Mocking | Intercept postMessage (not popup HTML) |
| Token Verification | Verify decryptable (not just different) |
| User Email | Mock specific test addresses (e.g., `test-e2e@example.com`) |
| Sync Button | Use navbar RefreshButton (`.refresh-button`) |
| Sync Status | Use SyncStatusBar (`.sync-status-bar`) |
| Sync Scenarios | Initial + incremental only (no pagination) |
| Event Data | Time-relative (not fixed dates) |
| View Tests | Rendering, colors, times, view switching |
| Interactions | No event clicking/popovers (excluded) |
| Visibility Toggle | Not tested (excluded) |
| MSW Approach | Service Worker (not fetch override) |
| Handlers | Playwright-specific (not shared with Vitest) |
| Test Data | Mock credentials in fixtures |
| Network Check | trackNetworkRequests helper |
| Mode | Headless everywhere |

### Task Breakdown

---

## fn-9-e2e.1: Create Playwright-specific MSW handlers

**File:** `src/test/mocks/handlers-e2e.ts` (NEW - separate from Vitest handlers)

```typescript
import { http, HttpResponse } from 'msw'
import { OAuthTokenResponse } from '@/lib/auth/types'

// Mock credentials for E2E tests
export const MOCK_CREDENTIALS = {
  clientId: 'test-e2e-client-id',
  clientSecret: 'test-e2e-client-secret',
}

// Test email addresses for E2E tests
export const TEST_EMAILS = {
  primary: 'test-e2e@example.com',
  secondary: 'test-e2e-2@example.com',
}

// Mock OAuth token endpoint
export const oauthTokenHandler = http.post('https://oauth2.googleapis.com/token', async ({ request }) => {
  const body = await request.json()
  const refreshToken = (body as any).refresh_token

  return HttpResponse.json({
    access_token: `mock_access_token_${refreshToken}`,
    refresh_token: refreshToken,
    expires_in: 3600,
    token_type: 'Bearer',
  } satisfies OAuthTokenResponse)
})

// Mock user info endpoint - returns specific test email
export const userInfoHandler = http.get('https://www.googleapis.com/oauth2/v2/userinfo', () => {
  return HttpResponse.json({
    email: TEST_EMAILS.primary,
    verified_email: true,
    name: 'E2E Test User',
    given_name: 'E2E',
    family_name: 'User',
    picture: 'https://example.com/avatar.png',
  })
})

// Mock calendar list endpoint
export const calendarListHandler = http.get('https://www.googleapis.com/calendar/v3/users/me/calendarList', () => {
  return HttpResponse.json({
    kind: 'calendar#calendarList',
    items: [
      {
        id: 'primary',
        summary: 'test-e2e@example.com',
        primary: true,
        backgroundColor: '#039BE5',
        foregroundColor: '#ffffff',
        selected: true,
      },
    ],
  })
})

// Helper to create time-relative events (relative to test execution)
function createRelativeEvents(baseTime: number) {
  const hour = 3600000
  return [
    // Event starting in 1 hour
    {
      id: `rel-event-1`,
      summary: 'Event in 1 hour',
      start: { dateTime: new Date(baseTime + hour).toISOString() },
      end: { dateTime: new Date(baseTime + 2 * hour).toISOString() },
      status: 'confirmed',
      created: new Date(baseTime).toISOString(),
      updated: new Date(baseTime).toISOString(),
    },
    // Event starting yesterday
    {
      id: `rel-event-2`,
      summary: 'Event yesterday',
      start: { dateTime: new Date(baseTime - 24 * hour).toISOString() },
      end: { dateTime: new Date(baseTime - 23 * hour).toISOString() },
      status: 'confirmed',
      created: new Date(baseTime - 25 * hour).toISOString(),
      updated: new Date(baseTime - 25 * hour).toISOString(),
    },
  ]
}

// Mock events list endpoint - returns time-relative events
export const eventsHandler = http.get(
  'https://www.googleapis.com/calendar/v3/calendars/:calendarId/events',
  ({ params }) => {
    const baseTime = Date.now()
    const events = createRelativeEvents(baseTime)

    return HttpResponse.json({
      kind: 'calendar#events',
      etag: '"etag"',
      summary: params.calendarId === 'primary' ? 'test-e2e@example.com' : params.calendarId,
      updated: new Date(baseTime).toISOString(),
      timeZone: 'UTC',
      items: events,
      nextPageToken: undefined, // No pagination for smoke tests
    })
  }
)

// Export all handlers
export const handlers = [
  oauthTokenHandler,
  userInfoHandler,
  calendarListHandler,
  eventsHandler,
]
```

**Acceptance:**
- [ ] File created at `src/test/mocks/handlers-e2e.ts`
- [ ] MOCK_CREDENTIALS exported for use in fixtures
- [ ] TEST_EMAILS exported with test addresses
- [ ] OAuth token endpoint mocked with refresh token handling
- [ ] User info endpoint returns `test-e2e@example.com`
- [ ] Calendar list returns primary calendar
- [ ] Events are time-relative (not fixed dates)
- [ ] TypeScript compiles without errors

---

## fn-9-e2e.2: Create MSW browser worker setup

**File:** `src/test/mocks/browser.ts` (NEW)

```typescript
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers-e2e'

// Setup MSW worker for browser (Playwright)
export const worker = setupWorker(...handlers)

// Worker lifecycle helpers
export async function startWorker() {
  await worker.start({
    // Don't show warnings in tests
    onUnhandledRequest: 'bypass',
  })
}

export function stopWorker() {
  worker.stop()
}
```

**Acceptance:**
- [ ] File created at `src/test/mocks/browser.ts`
- [ ] Worker setup imports from handlers-e2e.ts (not handlers.ts)
- [ ] Exported start/stop functions
- [ ] onUnhandledRequest set to 'bypass'
- [ ] TypeScript compiles without errors

---

## fn-9-e2e.3: Create network tracking fixture

**File:** `src/test/e2e/fixtures/network.ts` (NEW)

```typescript
import type { Page } from '@playwright/test'

/**
 * Network request tracker for verifying no real API calls
 *
 * Ensures strict offline requirement - all Google API calls
 * should be intercepted by MSW, not reach the real network.
 */
export function trackNetworkRequests(page: Page) {
  const trackedRequests: Array<{ url: string; method: string }> = []
  let isTracking = false

  const handler = (request: { url: () => string; method: () => string }) => {
    if (!isTracking) return

    const url = request.url()
    // Track Google API calls
    if (url.includes('googleapis.com') || url.includes('accounts.google.com') || url.includes('oauth2.googleapis.com')) {
      trackedRequests.push({
        url,
        method: request.method(),
      })
    }
  }

  return {
    startTracking: () => {
      trackedRequests.length = 0
      isTracking = true
      page.on('request', handler as any)
    },

    stopTracking: () => {
      isTracking = false
      ;(page as any).off('request', handler)
    },

    getTrackedRequests: () => [...trackedRequests],

    assertNoRealCalls: () => {
      // This should never happen - MSW should intercept all Google API calls
      if (trackedRequests.length > 0) {
        const urls = trackedRequests.map(r => r.url).join('\n  ')
        throw new Error(
          `Real Google API calls detected (MSW failed to intercept):\n  ${urls}\n` +
          `All tests must run offline without real network calls.`
        )
      }
    },
  }
}
```

**Acceptance:**
- [ ] File created at `src/test/e2e/fixtures/network.ts`
- [ ] trackNetworkRequests function exported
- [ ] Tracks Google API domains (googleapis.com, accounts.google.com, oauth2.googleapis.com)
- [ ] assertNoRealCalls throws if real calls detected
- [ ] start/stop tracking methods work correctly

---

## fn-9-e2e.4: Update Playwright fixtures with mock credentials

**File:** `src/test/e2e/fixtures/accounts.ts` (UPDATE existing)

```typescript
import type { Page } from '@playwright/test'
import type { Account } from '@/lib/db/types'
import { MOCK_CREDENTIALS, TEST_EMAILS } from '@/test/mocks/handlers-e2e'

/**
 * Create a mock account in IndexedDB
 *
 * Uses mock credentials from handlers-e2e.ts for consistency
 */
export async function createMockAccount(
  page: Page,
  overrides: Partial<Account> = {}
): Promise<void> {
  await page.evaluate(async (accountData) => {
    const { addAccount } = await import('@/lib/db')
    await addAccount({
      id: accountData.id || TEST_EMAILS.primary,
      email: accountData.email || TEST_EMAILS.primary,
      encryptedAccessToken: accountData.encryptedAccessToken || 'mock-encrypted-token',
      encryptedRefreshToken: accountData.encryptedRefreshToken || 'mock-refresh-token',
      tokenExpiry: accountData.tokenExpiry || Date.now() + 3600000,
      createdAt: accountData.createdAt || Date.now(),
      updatedAt: accountData.updatedAt || Date.now(),
      ...accountData,
    })
  }, overrides)
}

/**
 * Get all accounts from IndexedDB
 */
export async function getAllAccounts(page: Page): Promise<Account[]> {
  return await page.evaluate(async () => {
    const { getAccounts } = await import('@/lib/db')
    return await getAccounts()
  })
}

/**
 * Clear all accounts from IndexedDB
 */
export async function clearAllAccounts(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const { getAccounts, deleteAccount } = await import('@/lib/db')
    const accounts = await getAccounts()
    for (const account of accounts) {
      await deleteAccount(account.id)
    }
  })
}

/**
 * Get account count
 */
export async function getAccountCount(page: Page): Promise<number> {
  const accounts = await getAllAccounts(page)
  return accounts.length
}
```

**Acceptance:**
- [ ] Imports MOCK_CREDENTIALS and TEST_EMAILS from handlers-e2e.ts
- [ ] createMockAccount uses TEST_EMAILS.primary as default
- [ ] getAllAccounts, clearAllAccounts, getAccountCount functions work
- [ ] TypeScript compiles without errors

---

## fn-9-e2e.5: Create OAuth fixture with postMessage interception

**File:** `src/test/e2e/fixtures/oauth.ts` (UPDATE existing)

```typescript
import type { Page, BrowserContext } from '@playwright/test'
import { TEST_EMAILS } from '@/test/mocks/handlers-e2e'
import type { OAuthTokenResponse } from '@/lib/auth/types'

/**
 * Mock OAuth popup by intercepting postMessage
 *
 * This approach intercepts the postMessage communication from the
 * OAuth popup window, rather than mocking the popup HTML itself.
 */
export async function mockOAuthPopup(
  context: BrowserContext,
  tokens: Partial<OAuthTokenResponse> = {}
): Promise<void> {
  // Listen for popup opens and inject message poster
  context.on('page', async (popup) => {
    await popup.evaluate((tokensToPost) => {
      // Post the OAuth success message back to opener
      window.opener.postMessage(
        {
          type: 'oauth-success',
          tokens: tokensToPost,
        },
        '*'
      )
      // Close popup after posting
      window.close()
    }, {
      access_token: tokens.access_token || 'mock_access_token_e2e',
      refresh_token: tokens.refresh_token || 'mock_refresh_token_e2e',
      expires_in: tokens.expires_in || 3600,
    } satisfies OAuthTokenResponse)
  })
}

/**
 * Mock OAuth error via postMessage
 */
export async function mockOAuthError(
  context: BrowserContext,
  errorCode: string = 'access_denied',
  errorMessage: string = 'User denied the request'
): Promise<void> {
  context.on('page', async (popup) => {
    await popup.evaluate((errorData) => {
      window.opener.postMessage(
        {
          type: 'oauth-error',
          error: errorData.code,
          error_description: errorData.message,
        },
        '*'
      )
      window.close()
    }, { code: errorCode, message: errorMessage })
  })
}

/**
 * Complete OAuth flow with default tokens
 *
 * Combines mockOAuthPopup with triggering the OAuth flow
 */
export async function completeOAuthFlow(
  context: BrowserContext,
  page: Page,
  tokens?: Partial<OAuthTokenResponse>
): Promise<void> {
  await mockOAuthPopup(context, tokens)

  // Navigate to Settings and click Add Account
  await page.goto('/')
  await page.click('.nav-link:has-text("Settings")')
  await expect(page.locator('h1:has-text("Settings")')).toBeVisible()

  const addButton = page.locator('button:has-text("Add Account")')
  await expect(addButton).toBeVisible()
  await addButton.click()

  // Wait for OAuth completion
  await waitForOAuthCompletion(page)
}

/**
 * Wait for OAuth flow to complete
 *
 * Waits for the account to appear in the account list
 */
export async function waitForOAuthCompletion(page: Page, timeout = 5000): Promise<void> {
  await page.waitForFunction(() => {
    // Check for success indicator (account added or sync started)
    const syncStatus = document.querySelector('.sync-status-bar')
    if (syncStatus && syncStatus.textContent?.includes('Syncing')) {
      return true
    }
    return false
  }, { timeout })
}

/**
 * Wait for OAuth error to be displayed
 */
export async function waitForOAuthError(page: Page, timeout = 5000): Promise<void> {
  await page.waitForSelector('text=Failed to add account, text=OAuth error', { timeout })
}

/**
 * Verify account was stored in IndexedDB
 */
export async function verifyAccountStored(page: Page): Promise<boolean> {
  const accounts = await page.evaluate(async () => {
    const { getAccounts } = await import('@/lib/db')
    return await getAccounts()
  })
  return accounts.length > 0 && accounts.some((a: any) => a.email === TEST_EMAILS.primary)
}
```

**Acceptance:**
- [ ] mockOAuthPopup intercepts postMessage (not popup HTML)
- [ ] mockOAuthError for error scenarios
- [ ] completeOAuthFlow combines mocking + triggering flow
- [ ] waitForOAuthCompletion waits for sync status
- [ ] verifyAccountStored checks for test email
- [ ] Imports TEST_EMAILS from handlers-e2e.ts

---

## fn-9-e2e.6: Update IndexedDB fixtures for time-relative events

**File:** `src/test/e2e/fixtures/indexeddb.ts` (UPDATE existing)

```typescript
import type { Page } from '@playwright/test'
import type { Account, CalendarEvent } from '@/lib/db/types'

/**
 * Clear all data from IndexedDB
 *
 * Useful for test cleanup to ensure isolated test state
 */
export async function clearDatabase(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const databases = await indexedDB.databases()
    for (const db of databases) {
      if (db.name) {
        await new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(db.name!)
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        })
      }
    }
  })
}

/**
 * Wait for IndexedDB to be initialized
 *
 * WolfCal initializes IndexedDB on app load - this waits for that to complete
 */
export async function waitForDatabase(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    // Check if db is initialized (exposed on window for testing)
    return (window as any).wolfcalDB !== undefined
  }, { timeout: 5000 })
}

/**
 * Get all stored accounts from IndexedDB
 */
export async function getStoredAccounts(page: Page): Promise<Account[]> {
  return await page.evaluate(async () => {
    const { getAccounts } = await import('@/lib/db')
    return await getAccounts()
  })
}

/**
 * Get all stored events from IndexedDB
 */
export async function getStoredEvents(page: Page): Promise<CalendarEvent[]> {
  return await page.evaluate(async () => {
    const { getAllEvents } = await import('@/lib/db')
    return await getAllEvents()
  })
}

/**
 * Seed IndexedDB with time-relative mock events
 *
 * Creates events relative to the current time for consistent testing
 * @param page - Playwright page
 * @param events - Array of event overrides (times are relative offsets in ms)
 */
export async function seedMockEvents(
  page: Page,
  events: Array<Partial<CalendarEvent> & { offsetHours?: number }>
): Promise<void> {
  const baseTime = Date.now()

  await page.evaluate(async ({ baseTime, eventsToSeed }) => {
    const { addEvent } = await import('@/lib/db')

    for (const event of eventsToSeed) {
      const offset = event.offsetHours || 0
      const startTime = baseTime + (offset * 3600000)
      const endTime = startTime + 3600000 // 1 hour duration

      await addEvent({
        id: event.id || crypto.randomUUID(),
        accountId: event.accountId || 'test-e2e@example.com',
        calendarId: event.calendarId || 'primary',
        summary: event.summary || `Event at ${offset}h offset`,
        start: event.start || { dateTime: new Date(startTime).toISOString() },
        end: event.end || { dateTime: new Date(endTime).toISOString() },
        status: event.status || 'confirmed',
        createdAt: event.createdAt || baseTime,
        updatedAt: event.updatedAt || baseTime,
        ...event,
      })
    }
  }, { baseTime, events })
}

/**
 * Seed IndexedDB with a mock account
 *
 * @param page - Playwright page
 * @param account - Mock account data
 */
export async function seedMockAccount(page: Page, account: Partial<Account> = {}): Promise<void> {
  await page.evaluate(async (accountData) => {
    const { addAccount } = await import('@/lib/db')
    await addAccount({
      id: accountData.id || 'mock-account-id',
      email: accountData.email || 'mock@example.com',
      encryptedAccessToken: accountData.encryptedAccessToken || 'mock-encrypted-token',
      encryptedRefreshToken: accountData.encryptedRefreshToken || 'mock-refresh-token',
      tokenExpiry: accountData.tokenExpiry || Date.now() + 3600000,
      createdAt: accountData.createdAt || Date.now(),
      updatedAt: accountData.updatedAt || Date.now(),
      ...accountData,
    })
  }, account)
}

/**
 * Get sync metadata for a calendar
 */
export async function getSyncMetadata(page: Page, calendarId: string) {
  return await page.evaluate(async (id) => {
    const { getSyncMetadata } = await import('@/lib/db')
    return await getSyncMetadata(id)
  }, calendarId)
}

/**
 * Check if sync was successful
 *
 * @param page - Playwright page
 * @param calendarId - Calendar ID to check
 */
export async function wasSyncSuccessful(page: Page, calendarId: string): Promise<boolean> {
  const metadata = await getSyncMetadata(page, calendarId)
  return metadata?.lastSyncStatus === 'success'
}

/**
 * Verify tokens are decryptable (not just different from plaintext)
 *
 * Tests the encryption/decryption flow end-to-end
 */
export async function verifyTokensDecryptable(page: Page): Promise<boolean> {
  return await page.evaluate(async () => {
    const { getAccounts } = await import('@/lib/db')
    const { decryptToken } = await import('@/lib/auth/encryption')

    const accounts = await getAccounts()
    if (accounts.length === 0) return false

    for (const account of accounts) {
      try {
        // Try to decrypt tokens - should succeed
        const accessToken = await decryptToken(account.encryptedAccessToken)
        const refreshToken = await decryptToken(account.encryptedRefreshToken)

        // Verify tokens are not empty
        if (!accessToken || !refreshToken) return false
      } catch (error) {
        console.error('Token decryption failed:', error)
        return false
      }
    }
    return true
  })
}
```

**Acceptance:**
- [ ] clearDatabase, waitForDatabase functions work
- [ ] getStoredAccounts, getStoredEvents functions work
- [ ] seedMockEvents creates time-relative events (offsetHours parameter)
- [ ] seedMockAccount creates accounts with defaults
- [ ] getSyncMetadata, wasSyncSuccessful functions work
- [ ] verifyTokensDecryptable tests encryption/decryption flow

---

## fn-9-e2e.7: Update Playwright e2e-setup with MSW worker injection

**File:** `src/test/e2e-setup.ts` (UPDATE existing)

```typescript
import { test as base } from '@playwright/test'
import { trackNetworkRequests } from './fixtures/network'

// Extend Playwright test fixture with MSW worker
export const test = base.extend<{
  injectMSWWorker: (page: any) => Promise<void>
}>({
  // Inject MSW worker into each page before navigation
  injectMSWWorker: async ({ page }, use) => {
    const injectWorker = async (targetPage: any) => {
      // Inject MSW worker setup script before page loads
      await targetPage.addInitScript(() => {
        // This will be replaced by actual MSW worker code
        window.mswEnabled = true
      })

      // Navigate to enable MSW (worker starts on first navigation)
      await targetPage.goto('about:blank')
    }

    await use(injectWorker)
  },
})

// Re-export expect for convenience
export const expect = test.expect

// Re-export network tracking helper
export { trackNetworkRequests }
```

**Acceptance:**
- [ ] injectMSWWorker fixture added
- [ ] Worker injection happens before page loads
- [ ] trackNetworkRequests exported for use in tests

---

## fn-9-e2e.8: Write OAuth flow E2E tests

**File:** `src/test/e2e/oauth.spec.ts` (UPDATE existing)

```typescript
import { test, expect, injectMSWWorker, trackNetworkRequests } from './e2e-setup'
import {
  mockOAuthPopup,
  mockOAuthError,
  completeOAuthFlow,
  waitForOAuthCompletion,
  waitForOAuthError,
  verifyAccountStored,
  getAccountCount,
  getAllAccounts,
} from './fixtures/oauth'
import { clearAllAccounts } from './fixtures/accounts'
import { verifyTokensDecryptable } from './fixtures/indexeddb'
import { TEST_EMAILS } from '@/test/mocks/handlers-e2e'

test.describe('OAuth Flow', () => {
  test('should complete OAuth flow and store account', async ({ page, context }) => {
    let networkTracker = trackNetworkRequests(page)
    networkTracker.startTracking()

    await completeOAuthFlow(context, page, {
      access_token: 'test_access_token_123',
      refresh_token: 'test_refresh_token_456',
    })

    // Verify account was stored
    await expect(async () => {
      const stored = await verifyAccountStored(page)
      expect(stored).toBe(true)
    }).toPass({ timeout: 5000 })

    // Verify account count
    const count = await getAccountCount(page)
    expect(count).toBe(1)

    // Verify account appears in UI (Settings page)
    await expect(page.locator(`text=${TEST_EMAILS.primary}`)).toBeVisible()

    // Verify tokens are decryptable (not just encrypted)
    const decryptable = await verifyTokensDecryptable(page)
    expect(decryptable).toBe(true)

    networkTracker.stopTracking()
    networkTracker.assertNoRealCalls()
  })

  test('should handle OAuth error gracefully', async ({ page, context }) => {
    let networkTracker = trackNetworkRequests(page)
    networkTracker.startTracking()

    await mockOAuthError(context, 'access_denied', 'User denied the request')

    await page.goto('/')
    await page.click('.nav-link:has-text("Settings")')
    await page.click('button:has-text("Add Account")')

    await waitForOAuthError(page)

    // Verify error message is shown
    await expect(page.locator('text=Failed to add account')).toBeVisible()

    // Verify no account was created
    const count = await getAccountCount(page)
    expect(count).toBe(0)

    networkTracker.stopTracking()
    networkTracker.assertNoRealCalls()
  })

  test('should trigger initial calendar sync after OAuth', async ({ page, context }) => {
    let networkTracker = trackNetworkRequests(page)
    networkTracker.startTracking()

    await completeOAuthFlow(context, page)

    // Wait for sync to start
    await expect(page.locator('.sync-status-bar:has-text("Syncing")')).toBeVisible({
      timeout: 5000,
    })

    // Wait for sync to complete
    await expect(page.locator('.sync-status-bar')).toContainText(['ago', 'just now'], {
      timeout: 10000,
    })

    networkTracker.stopTracking()
    networkTracker.assertNoRealCalls()
  })
})
```

**Acceptance:**
- [ ] OAuth flow test validates authentication
- [ ] Token encryption verified (decryptable)
- [ ] User info mocked with test email
- [ ] Account storage verified in IndexedDB
- [ ] Error handling test included
- [ ] Initial sync trigger verified
- [ ] trackNetworkRequests validates no real API calls

---

## fn-9-e2e.9: Write calendar sync E2E tests

**File:** `src/test/e2e/sync.spec.ts` (UPDATE existing)

```typescript
import { test, expect, injectMSWWorker, trackNetworkRequests } from './e2e-setup'
import { createMockAccount, getAllAccounts } from './fixtures/accounts'
import { clearDatabase, getStoredEvents, getSyncMetadata } from './fixtures/indexeddb'
import { TEST_EMAILS } from '@/test/mocks/handlers-e2e'

test.describe('Calendar Sync', () => {
  test.beforeEach(async ({ page }) => {
    await injectMSWWorker(page)
    await clearDatabase(page)
  })

  test('should perform initial sync (no syncToken)', async ({ page }) => {
    let networkTracker = trackNetworkRequests(page)
    networkTracker.startTracking()

    // Create mock account
    await createMockAccount(page)

    // Navigate to Calendar view
    await page.goto('/')

    // Click refresh button in navbar
    const refreshButton = page.locator('.refresh-button')
    await expect(refreshButton).toBeVisible()
    await refreshButton.click()

    // Wait for sync to start
    await expect(page.locator('.sync-status-bar:has-text("Syncing")')).toBeVisible({
      timeout: 5000,
    })

    // Wait for sync to complete
    await expect(page.locator('.sync-status-bar')).not.toContainText('Syncing', {
      timeout: 10000,
    })

    // Verify events were stored
    const events = await getStoredEvents(page)
    expect(events.length).toBeGreaterThan(0)

    // Verify sync metadata was created
    const metadata = await getSyncMetadata(page, 'primary')
    expect(metadata).toBeDefined()
    expect(metadata?.lastSyncStatus).toBe('success')

    networkTracker.stopTracking()
    networkTracker.assertNoRealCalls()
  })

  test('should perform incremental sync (with existing syncToken)', async ({ page }) => {
    let networkTracker = trackNetworkRequests(page)
    networkTracker.startTracking()

    // Create account and perform initial sync
    await createMockAccount(page)

    // Set up existing sync metadata (simulate previous sync)
    await page.evaluate(async () => {
      const { upsertSyncMetadata } = await import('@/lib/db')
      await upsertSyncMetadata('primary', {
        syncToken: 'existing-sync-token-123',
        lastSyncAt: Date.now() - 3600000, // 1 hour ago
        lastSyncStatus: 'success',
      })
    })

    await page.goto('/')
    await page.locator('.refresh-button').click()

    // Wait for sync completion
    await expect(page.locator('.sync-status-bar')).not.toContainText('Syncing', {
      timeout: 10000,
    })

    // Verify sync metadata was updated (new syncToken)
    const metadata = await getSyncMetadata(page, 'primary')
    expect(metadata?.syncToken).toBeDefined()
    expect(metadata?.syncToken).not.toBe('existing-sync-token-123')

    networkTracker.stopTracking()
    networkTracker.assertNoRealCalls()
  })

  test('should handle sync errors gracefully', async ({ page }) => {
    let networkTracker = trackNetworkRequests(page)
    networkTracker.startTracking()

    // Create account with expired token
    await createMockAccount(page, {
      tokenExpiry: Date.now() - 1000, // Already expired
    })

    await page.goto('/')
    await page.locator('.refresh-button').click()

    // Should show error or offline status, not crash
    await page.waitForTimeout(5000) // Wait for sync attempt

    // Verify app is still functional (not crashed)
    await expect(page.locator('.fc')).toBeVisible()

    networkTracker.stopTracking()
    networkTracker.assertNoRealCalls()
  })
})
```

**Acceptance:**
- [ ] Initial sync test (no syncToken)
- [ ] Incremental sync test (with existing syncToken)
- [ ] Sync status verified via SyncStatusBar
- [ ] Refresh button used (.refresh-button selector)
- [ ] Error handling test included
- [ ] trackNetworkRequests validates no real API calls
- [ ] No pagination testing (smoke test scope)

---

## fn-9-e2e.10: Write calendar view E2E tests

**File:** `src/test/e2e/calendar-view.spec.ts` (UPDATE existing)

```typescript
import { test, expect, injectMSWWorker } from './e2e-setup'
import { clearDatabase, seedMockEvents } from './fixtures/indexeddb'
import { getAllAccounts } from './fixtures/accounts'

test.describe('Calendar View', () => {
  test.beforeEach(async ({ page }) => {
    await injectMSWWorker(page)
    await clearDatabase(page)
  })

  test('should render events with correct colors and times', async ({ page }) => {
    // Seed time-relative events
    await seedMockEvents(page, [
      { offsetHours: 1, summary: 'Event in 1 hour' },
      { offsetHours: 2, summary: 'Event in 2 hours' },
    ])

    await page.goto('/')

    // Verify FullCalendar loaded
    await expect(page.locator('.fc')).toBeVisible()

    // Verify events rendered
    await expect(page.locator('.fc-event:has-text("Event in 1 hour")')).toBeVisible()
    await expect(page.locator('.fc-event:has-text("Event in 2 hours")')).toBeVisible()

    // Verify event colors (should match calendar backgroundColor)
    const eventElement = page.locator('.fc-event').first()
    const backgroundColor = await eventElement.evaluate(el =>
      getComputedStyle(el).backgroundColor
    )
    // Primary calendar color is #039BE5 (from handlers-e2e.ts)
    expect(backgroundColor).toBe('rgb(3, 155, 229)')
  })

  test('should switch between month/week/day views', async ({ page }) => {
    await seedMockEvents(page, [{ offsetHours: 1 }])

    await page.goto('/')

    // Test month view
    await page.click('button:has-text("Month")')
    await expect(page.locator('.fc-daygrid-month-view')).toBeVisible()

    // Test week view
    await page.click('button:has-text("Week")')
    await expect(page.locator('.fc-timegrid-week-view')).toBeVisible()

    // Test day view
    await page.click('button:has-text("Day")')
    await expect(page.locator('.fc-timegrid-day-view')).toBeVisible()
  })

  test('should navigate between dates', async ({ page }) => {
    await seedMockEvents(page, [{ offsetHours: 1 }])

    await page.goto('/')

    const initialTitle = await page.locator('.fc-toolbar-title').textContent()

    // Click next button
    await page.click('button.fc-next-button')

    const newTitle = await page.locator('.fc-toolbar-title').textContent()
    expect(newTitle).not.toBe(initialTitle)

    // Click prev button
    await page.click('button.fc-prev-button')

    const backTitle = await page.locator('.fc-toolbar-title').textContent()
    expect(backTitle).toBe(initialTitle)
  })

  test('should verify event time accuracy', async ({ page }) => {
    const baseTime = Date.now()
    const eventHour = new Date(baseTime + 3600000).getHours()

    await seedMockEvents(page, [
      { offsetHours: 1, summary: 'Time Test Event' },
    ])

    await page.goto('/')

    // Switch to day view for time verification
    await page.click('button:has-text("Day")')

    // Event should appear at the correct time slot
    // (FullCalendar time slots are at specific positions)
    const event = page.locator('.fc-event:has-text("Time Test Event")')
    await expect(event).toBeVisible()

    // Verify event has time information in its data
    const eventTime = await event.evaluate(el => {
      const timeEl = el.querySelector('.fc-event-time')
      return timeEl?.textContent || ''
    })

    expect(eventTime).toBeTruthy()
  })
})
```

**Acceptance:**
- [ ] Event rendering verified (events visible)
- [ ] Event colors verified (matching calendar backgroundColor)
- [ ] Time accuracy verified
- [ ] View switching tested (month/week/day)
- [ ] Date navigation tested (prev/next buttons)
- [ ] No event clicking/popover tests (excluded)
- [ ] No calendar visibility toggle tests (excluded)
- [ ] Time-relative events used (offsetHours parameter)

---

## Task Dependencies

```
fn-9-e2e.1 (handlers-e2e.ts)
    ↓
fn-9-e2e.2 (browser.ts)
    ↓
fn-9-e2e.3 (network.ts fixture)
    ↓
fn-9-e2e.4 (accounts.ts update)
    ↓
fn-9-e2e.5 (oauth.ts update)
    ↓
fn-9-e2e.6 (indexeddb.ts update)
    ↓
fn-9-e2e.7 (e2e-setup.ts update)
    ↓
fn-9-e2e.8 (OAuth tests) ─────┐
fn-9-e2e.9 (Sync tests) ──────┤
fn-9-e2e.10 (View tests) ─────┘
```

## Execution Order

1. **fn-9-e2e.1** - Create Playwright-specific MSW handlers
2. **fn-9-e2e.2** - Create MSW browser worker setup
3. **fn-9-e2e.3** - Create network tracking fixture
4. **fn-9-e2e.4** - Update accounts fixture with mock credentials
5. **fn-9-e2e.5** - Update OAuth fixture with postMessage interception
6. **fn-9-e2e.6** - Update IndexedDB fixtures for time-relative events
7. **fn-9-e2e.7** - Update Playwright e2e-setup with MSW worker injection
8. **fn-9-e2e.8** - Write OAuth flow E2E tests
9. **fn-9-e2e.9** - Write calendar sync E2E tests
10. **fn-9-e2e.10** - Write calendar view E2E tests

## Total Estimated Time

- fn-9-e2e.1: 1.5 hours
- fn-9-e2e.2: 0.5 hours
- fn-9-e2e.3: 1 hour
- fn-9-e2e.4: 1 hour
- fn-9-e2e.5: 1.5 hours
- fn-9-e2e.6: 1.5 hours
- fn-9-e2e.7: 1 hour
- fn-9-e2e.8: 2 hours
- fn-9-e2e.9: 2 hours
- fn-9-e2e.10: 2 hours

**Total: ~14 hours**
