/**
 * IndexedDB Helpers for Playwright E2E Tests
 *
 * These utilities allow tests to manipulate and inspect IndexedDB
 * from the Node.js context by executing scripts in the browser context.
 */

import type { Page } from '@playwright/test'
import type { Account, CalendarEvent, SyncMetadata } from '../../../lib/db/types'

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
      const startTime = baseTime + offset * 3600000
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
 * Verify tokens are decryptable (not just different from plaintext)
 *
 * Tests the encryption/decryption flow end-to-end to ensure tokens
 * can be successfully decrypted, not just that they're different
 * from the plaintext.
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
 * Seed IndexedDB with a mock account
 *
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
export async function getSyncMetadata(page: Page, calendarId: string): Promise<SyncMetadata | undefined> {
  return await page.evaluate(async (id) => {
    const { getSyncMetadata } = await import('@/lib/db')
    return await getSyncMetadata(id)
  }, calendarId)
}

/**
 * Check if sync was successful
 *
 * @param calendarId - Calendar ID to check
 */
export async function wasSyncSuccessful(page: Page, calendarId: string): Promise<boolean> {
  const metadata = await getSyncMetadata(page, calendarId)
  return metadata?.lastSyncStatus === 'success'
}

/**
 * Execute a function in browser context with access to app imports
 *
 * Generic helper for custom IndexedDB operations
 */
export async function executeInBrowser<T>(
  page: Page,
  fn: () => Promise<T>
): Promise<T> {
  return await page.evaluate(async () => {
    // Function will be stringified and executed in browser
    return await (fn as unknown as () => Promise<T>)()
  })
}
