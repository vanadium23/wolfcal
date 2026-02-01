/**
 * Calendar Sync E2E Tests
 *
 * Tests the calendar synchronization functionality, including:
 * - Initial sync (no syncToken)
 * - Incremental sync (with syncToken)
 * - Sync error handling
 * - Sync status updates
 * - Event storage in IndexedDB
 *
 * All tests use MSW to mock Google Calendar API - no real network calls.
 * Tests use navbar RefreshButton (.refresh-button) for manual sync triggering.
 * Tests use SyncStatusBar (.sync-status-bar) to verify sync state.
 *
 * Coverage: Smoke tests only (no pagination, conflict testing, etc.)
 */

import { test, expect, injectMSWWorker, trackNetworkRequests } from '../e2e-setup'
import {
  createMockAccount,
  createValidAccount,
  getAllAccounts,
} from './fixtures/accounts'
import {
  clearDatabase,
  getStoredEvents,
  getSyncMetadata,
  wasSyncSuccessful,
} from './fixtures/indexeddb'
import { TEST_EMAILS } from '../mocks/handlers-e2e'

test.describe('Calendar Sync', () => {
  let networkTracker: ReturnType<typeof trackNetworkRequests>

  test.beforeEach(async ({ page }) => {
    await injectMSWWorker(page)

    networkTracker = trackNetworkRequests(page)
    networkTracker.startTracking()

    await clearDatabase(page)
  })

  test.afterEach(async ({ page }) => {
    networkTracker.stopTracking()
    networkTracker.assertNoRealCalls()
  })

  test('should perform initial sync (no syncToken)', async ({ page }) => {
    // Create a valid account
    await createValidAccount(page)

    // Navigate to Calendar view
    await page.goto('/')

    // Trigger manual sync via navbar RefreshButton
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

    // Verify events were stored in IndexedDB
    const events = await getStoredEvents(page)
    expect(events.length).toBeGreaterThan(0)

    // Verify sync metadata was created
    const accounts = await getAllAccounts(page)
    if (accounts.length > 0) {
      const metadata = await getSyncMetadata(page, 'primary')
      expect(metadata).toBeDefined()
      expect(await wasSyncSuccessful(page, 'primary')).toBe(true)
    }
  })

  test('should perform incremental sync (with existing syncToken)', async ({ page }) => {
    // Create account
    await createValidAccount(page)

    // Set up existing sync metadata (simulate previous sync)
    await page.evaluate(async () => {
      const { upsertSyncMetadata } = await import('@/lib/db')
      await upsertSyncMetadata('primary', {
        accountId: TEST_EMAILS.primary,
        syncToken: 'existing-sync-token-123',
        lastSyncAt: Date.now() - 3600000, // 1 hour ago
        lastSyncStatus: 'success',
      })
    })

    await page.goto('/')

    // Trigger manual sync via navbar RefreshButton
    await page.locator('.refresh-button').click()

    // Wait for sync completion
    await expect(page.locator('.sync-status-bar')).not.toContainText('Syncing', {
      timeout: 10000,
    })

    // Verify sync metadata was updated (new syncToken)
    const metadata = await getSyncMetadata(page, 'primary')
    expect(metadata?.syncToken).toBeDefined()
    expect(metadata?.syncToken).not.toBe('existing-sync-token-123')
  })

  test('should handle sync errors gracefully', async ({ page }) => {
    // Create account with expired token
    await createMockAccount(page, {
      tokenExpiry: Date.now() - 1000, // Already expired
    })

    await page.goto('/')

    // Trigger sync
    await page.locator('.refresh-button').click()

    // Should show error or offline status, not crash
    await page.waitForTimeout(5000) // Wait for sync attempt

    // Verify app is still functional (not crashed)
    await expect(page.locator('.fc')).toBeVisible()
  })
})
