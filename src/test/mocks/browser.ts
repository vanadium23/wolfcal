/**
 * MSW Browser Worker Setup for Playwright E2E Tests
 *
 * This file configures MSW (Mock Service Worker) to run in a browser context,
 * allowing Playwright tests to intercept and mock network requests to Google APIs.
 *
 * Key difference from vitest setup:
 * - Uses `setupWorker` instead of `setupServer`
 * - Runs in browser context via Service Worker
 * - Injected via page.addInitScript() in Playwright tests
 */

import { setupWorker } from 'msw/browser'
import { handlers } from './handlers-e2e'

/**
 * MSW browser worker instance
 *
 * This worker intercepts fetch requests in the browser and routes them
 * through our mock handlers defined in handlers-e2e.ts
 *
 * Uses Playwright-specific handlers (separate from Vitest handlers)
 */
export const worker = setupWorker(...handlers)

/**
 * Start the MSW worker
 *
 * @returns Promise that resolves when worker is ready
 */
export async function startWorker(): Promise<void> {
  await worker.start({
    // Don't warn about unhandled requests in tests
    // (Playwright makes many requests we don't need to mock)
    onUnhandledRequest: 'bypass',
  })
  console.log('[MSW] Browser worker started')
}

/**
 * Stop the MSW worker
 *
 * Call this in test cleanup if needed (though usually not necessary
 * as each test gets a fresh browser context)
 */
export function stopWorker(): void {
  worker.stop()
  console.log('[MSW] Browser worker stopped')
}

/**
 * Reset request handlers to initial state
 *
 * Useful for tests that need to temporarily override handlers
 */
export function resetHandlers(): void {
  worker.resetHandlers()
}

/**
 * Use custom handlers for a specific test
 *
 * Example:
 * ```ts
 * useCustomHandlers([
 *   http.get('/api/test', () => HttpResponse.json({ custom: true }))
 * ])
 * ```
 */
export function useCustomHandlers(...customHandlers: typeof handlers): void {
  worker.use(...customHandlers)
}

// Export handlers for direct use if needed
export { handlers }
