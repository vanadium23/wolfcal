/**
 * Network Request Tracking Fixture for Playwright E2E Tests
 *
 * This utility tracks all network requests made during a test to verify
 * the strict offline requirement - all Google API calls must be intercepted
 * by MSW, not reach the real network.
 *
 * Usage:
 * ```ts
 * const tracker = trackNetworkRequests(page)
 * tracker.startTracking()
 * // ... run test ...
 * tracker.stopTracking()
 * tracker.assertNoRealCalls()
 * ```
 */

import type { Page } from '@playwright/test'

export function trackNetworkRequests(page: Page) {
  const trackedRequests: Array<{ url: string; method: string }> = []
  let isTracking = false

  const handler = (request: { url: () => string; method: () => string }) => {
    if (!isTracking) return

    const url = request.url()
    // Track Google API calls
    if (
      url.includes('googleapis.com') ||
      url.includes('accounts.google.com') ||
      url.includes('oauth2.googleapis.com')
    ) {
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
        const urls = trackedRequests.map((r) => r.url).join('\n  ')
        throw new Error(
          `Real Google API calls detected (MSW failed to intercept):\n  ${urls}\n` +
            `All tests must run offline without real network calls.`
        )
      }
    },
  }
}
