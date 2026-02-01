/**
 * IndexedDB Helpers for Playwright E2E Tests
 *
 * These utilities allow tests to manipulate and inspect IndexedDB
 * using direct IndexedDB API instead of app imports.
 */

import type { Page } from '@playwright/test'
import type { Account, CalendarEvent, SyncMetadata } from '../../../lib/db/types'

/**
 * Clear all data from IndexedDB
 *
 * Useful for test cleanup to ensure isolated test state
 *
 * Note: This should be called after page.goto('/') to ensure IndexedDB context exists
 */
export async function clearDatabase(page: Page): Promise<void> {
  await page.evaluate(async () => {
    // Directly delete the wolfcal database
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('wolfcal')
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      request.onblocked = () => resolve() // Resolve even if blocked
    })
  })
}

/**
 * Seed IndexedDB with time-relative mock events
 *
 * Creates events relative to the current time for consistent testing
 */
export async function seedMockEvents(
  page: Page,
  events: Array<Partial<CalendarEvent> & { offsetHours?: number }>
): Promise<void> {
  const baseTime = Date.now()

  await page.evaluate(async ({ baseTime, events: eventsToSeed }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('wolfcal', 3)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    for (const event of eventsToSeed) {
      const offset = event.offsetHours || 0
      const startTime = baseTime + offset * 3600000
      const endTime = startTime + 3600000

      const calendarEvent: CalendarEvent = {
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
      } as CalendarEvent

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('events', 'readwrite')
        const store = tx.objectStore('events')
        const request = store.add(calendarEvent)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    }
  }, { baseTime, events: events as any[] })
}

/**
 * Wait for IndexedDB to be initialized
 */
export async function waitForDatabase(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    return typeof indexedDB !== 'undefined'
  }, { timeout: 5000 })
}

/**
 * Get all stored accounts from IndexedDB
 */
export async function getStoredAccounts(page: Page): Promise<Account[]> {
  return await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('wolfcal', 3)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    return new Promise<Account[]>((resolve, reject) => {
      const tx = db.transaction('accounts', 'readonly')
      const store = tx.objectStore('accounts')
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  })
}

/**
 * Get all stored events from IndexedDB
 */
export async function getStoredEvents(page: Page): Promise<CalendarEvent[]> {
  return await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('wolfcal', 3)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    return new Promise<CalendarEvent[]>((resolve, reject) => {
      const tx = db.transaction('events', 'readonly')
      const store = tx.objectStore('events')
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  })
}

/**
 * Seed IndexedDB with a mock account
 */
export async function seedMockAccount(page: Page, account: Partial<Account> = {}): Promise<void> {
  await page.evaluate(async (accountData) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('wolfcal', 3)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    const newAccount: Account = {
      id: accountData.id || 'mock-account-id',
      email: accountData.email || 'mock@example.com',
      encryptedAccessToken: accountData.encryptedAccessToken || 'mock-encrypted-token',
      encryptedRefreshToken: accountData.encryptedRefreshToken || 'mock-refresh-token',
      tokenExpiry: accountData.tokenExpiry || Date.now() + 3600000,
      createdAt: accountData.createdAt || Date.now(),
      updatedAt: accountData.updatedAt || Date.now(),
      ...accountData,
    } as Account

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('accounts', 'readwrite')
      const store = tx.objectStore('accounts')
      const request = store.add(newAccount)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }, account)
}

/**
 * Get sync metadata for a calendar
 */
export async function getSyncMetadata(page: Page, calendarId: string): Promise<SyncMetadata | undefined> {
  return await page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('wolfcal', 3)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    return new Promise<SyncMetadata | undefined>((resolve, reject) => {
      const tx = db.transaction('syncMetadata', 'readonly')
      const store = tx.objectStore('syncMetadata')
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }, calendarId)
}

/**
 * Check if sync was successful
 */
export async function wasSyncSuccessful(page: Page, calendarId: string): Promise<boolean> {
  const metadata = await getSyncMetadata(page, calendarId)
  return metadata?.lastSyncStatus === 'success'
}
