/**
 * OAuth Flow E2E Tests
 *
 * Tests the OAuth authentication flow, including:
 * - Opening OAuth popup
 * - Token exchange via postMessage interception
 * - Token storage in IndexedDB with encryption verification
 * - Account creation
 * - Error handling
 *
 * All tests use MSW to mock Google OAuth endpoints - no real network calls.
 */

import { test, expect, injectMSWWorker, trackNetworkRequests } from '../e2e-setup'
import {
  mockOAuthPopup,
  mockOAuthError,
  waitForOAuthCompletion,
  waitForOAuthError,
  completeOAuthFlow,
  verifyAccountStored,
  getAccountCount,
} from './fixtures/oauth'
import { clearAllAccounts } from './fixtures/accounts'
import { verifyTokensDecryptable } from './fixtures/indexeddb'
import { TEST_EMAILS } from '../mocks/handlers-e2e'

test.describe('OAuth Flow', () => {
  let networkTracker: ReturnType<typeof trackNetworkRequests>

  test.beforeEach(async ({ page, context }) => {
    // Inject MSW worker
    await injectMSWWorker(page)

    // Track network calls to verify offline requirement
    networkTracker = trackNetworkRequests(page)
    networkTracker.startTracking()

    // Clear any existing accounts
    await clearAllAccounts(page)
  })

  test.afterEach(async ({ page }) => {
    networkTracker.stopTracking()
    networkTracker.assertNoRealCalls()
  })

  test('should complete OAuth flow and store account', async ({ page, context }) => {
    // Mock successful OAuth popup
    await mockOAuthPopup(context, {
      access_token: 'test_access_token_123',
      refresh_token: 'test_refresh_token_456',
    })

    // Navigate to Settings and trigger OAuth
    await page.goto('/')
    await page.click('button:has-text("Settings")')

    // Wait for Settings page to load
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible()

    // Click Add Account button
    const addButton = page.locator('button:has-text("Add Account")')
    await expect(addButton).toBeVisible()
    await addButton.click()

    // Wait for OAuth completion
    await waitForOAuthCompletion(page)

    // Verify account was stored
    await expect(async () => {
      const stored = await verifyAccountStored(page)
      expect(stored).toBe(true)
    }).toPass({ timeout: 5000 })

    // Verify account count
    const count = await getAccountCount(page)
    expect(count).toBe(1)

    // Verify account appears in UI with test email
    await expect(page.locator(`text=${TEST_EMAILS.primary}`)).toBeVisible()

    // Verify tokens are decryptable (not just encrypted)
    const decryptable = await verifyTokensDecryptable(page)
    expect(decryptable).toBe(true)
  })

  test('should handle OAuth error gracefully', async ({ page, context }) => {
    // Mock OAuth error (user denies consent)
    await mockOAuthError(context, 'access_denied', 'User denied the request')

    // Navigate to Settings
    await page.goto('/')
    await page.click('button:has-text("Settings")')

    // Click Add Account button
    await page.click('button:has-text("Add Account")')

    // Wait for error to be displayed
    await waitForOAuthError(page)

    // Verify error message is shown
    await expect(page.locator('text=Failed to add account')).toBeVisible()

    // Verify no account was created
    const count = await getAccountCount(page)
    expect(count).toBe(0)
  })

  test('should trigger initial calendar sync after OAuth', async ({ page, context }) => {
    await completeOAuthFlow(context, page)

    // Wait for sync to start
    await expect(page.locator('.sync-status-bar:has-text("Syncing")')).toBeVisible({
      timeout: 5000,
    })

    // Wait for sync to complete
    await expect(page.locator('.sync-status-bar')).toContainText(['ago', 'just now'], {
      timeout: 10000,
    })
  })
})
