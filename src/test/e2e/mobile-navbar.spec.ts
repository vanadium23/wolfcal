/**
 * Mobile Navigation Regression Test
 *
 * Tests the mobile navbar functionality to ensure users can navigate
 * between Calendar and Settings views on mobile devices.
 *
 * Regression test for: Mobile navbar Settings button does not switch view
 */

import { test, expect, injectMSWWorker, trackNetworkRequests } from '../e2e-setup'

test.describe('Mobile Navigation Regression', () => {
  test.use({ viewport: { width: 375, height: 667 } }) // Mobile viewport (iPhone SE)

  let networkTracker: ReturnType<typeof trackNetworkRequests>

  test.beforeEach(async ({ page }) => {
    await injectMSWWorker(page)
    networkTracker = trackNetworkRequests(page)
    networkTracker.startTracking()

    // Configure mock OAuth credentials
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('wolfcal:oauth:clientId', 'test-client-id')
      localStorage.setItem('wolfcal:oauth:clientSecret', 'test-client-secret')
    })
  })

  test.afterEach(async ({ page: _page }) => {
    networkTracker.stopTracking()
    networkTracker.assertNoRealCalls()
  })

  test('REGRESSION: Mobile navbar Settings button should switch to Settings view', async ({ page }) => {
    // REGRESSION TEST - This test documents the bug where clicking Settings
    // in the mobile navbar does not switch the view to Settings

    // Wait for app to load
    await expect(page.locator('.fc')).toBeVisible({ timeout: 5000 })

    // Click hamburger menu to open mobile menu
    const hamburger = page.locator('.hamburger')
    await expect(hamburger).toBeVisible()
    await hamburger.click()

    // Wait for mobile menu to appear
    await expect(page.locator('.mobile-menu')).toBeVisible()

    // Click Settings button in mobile menu
    const settingsButton = page.locator('.mobile-menu-link:has-text("Settings")')
    await expect(settingsButton).toBeVisible()
    await settingsButton.click()

    // BUG EXPECTED: The view does NOT switch to Settings
    // The page stays on Calendar view

    // Verify: Should show Settings view, but it shows Calendar instead
    // This is the REGRESSION - the Settings button in mobile menu doesn't work

    // Current buggy behavior: Calendar is still visible (FAILS)
    // Expected behavior: Settings should be visible, Calendar should not be

    // This assertion will FAIL until the bug is fixed
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 3000 })

    // Additional verification: Calendar should NOT be visible when on Settings page
    await expect(page.locator('.fc')).not.toBeVisible()
  })

  test('REGRESSION: Mobile navbar Calendar button should switch to Calendar view', async ({ page }) => {
    // Verify Calendar button works (for comparison)
    await expect(page.locator('.fc')).toBeVisible({ timeout: 5000 })

    // First navigate to Settings to test switching back
    const hamburger = page.locator('.hamburger')
    await hamburger.click()
    await expect(page.locator('.mobile-menu')).toBeVisible()

    const settingsButton = page.locator('.mobile-menu-link:has-text("Settings")')
    await settingsButton.click()

    // Wait for navigation
    await page.waitForTimeout(500)

    // Now try to go back to Calendar via mobile menu
    await hamburger.click()
    await expect(page.locator('.mobile-menu')).toBeVisible()

    const calendarButton = page.locator('.mobile-menu-link:has-text("Calendar")')
    await expect(calendarButton).toBeVisible()
    await calendarButton.click()

    // Calendar should be visible again
    await expect(page.locator('.fc')).toBeVisible({ timeout: 3000 })
  })

  test('Mobile menu should open and close correctly', async ({ page }) => {
    // Verify hamburger menu exists on mobile
    const hamburger = page.locator('.hamburger')
    await expect(hamburger).toBeVisible()

    // Open mobile menu
    await hamburger.click()
    await expect(page.locator('.mobile-menu')).toBeVisible()
    await expect(hamburger).toHaveAttribute('aria-expanded', 'true')

    // Close mobile menu by clicking hamburger again
    await hamburger.click()
    await expect(page.locator('.mobile-menu')).not.toBeVisible()
    await expect(hamburger).toHaveAttribute('aria-expanded', 'false')
  })

  test('Mobile menu should close when clicking outside', async ({ page }) => {
    // Open mobile menu
    const hamburger = page.locator('.hamburger')
    await hamburger.click()
    await expect(page.locator('.mobile-menu')).toBeVisible()

    // Click outside the menu (on the calendar)
    await page.locator('.fc').click()

    // Menu should close
    await expect(page.locator('.mobile-menu')).not.toBeVisible()
  })
})
