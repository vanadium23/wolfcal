/**
 * Playwright E2E Test Setup
 *
 * This file configures the Playwright test environment, including:
 * - MSW worker injection for API mocking
 * - Custom test fixtures
 * - Global test hooks
 */

import { test as base, type Page } from '@playwright/test'
import { trackNetworkRequests } from './e2e/fixtures/network'

/**
 * Helper to inject MSW worker into a page
 *
 * This function injects the MSW worker setup into a page before navigation,
 * allowing tests to mock Google API requests.
 */
export async function injectMSWWorker(page: Page): Promise<void> {
  // Inject MSW setup into the browser context
  await page.addInitScript(() => {
    // This runs in the browser context
    // The actual MSW worker will be initialized when the app loads
    ;(window as any).mswEnabled = true
  })

  // Navigate to enable MSW (worker starts on first navigation)
  await page.goto('about:blank')
}

/**
 * Extended test fixture with MSW support
 */
export const test = base.extend<{
  // Define fixture type (optional, can be used in test parameters)
}>({})

// Re-export expect for convenience
export const expect = test.expect

// Re-export network tracking helper
export { trackNetworkRequests }
