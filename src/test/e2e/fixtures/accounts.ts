/**
 * Account Management Helpers for Playwright E2E Tests
 *
 * Utilities for creating, managing, and verifying mock accounts in tests.
 * Uses direct IndexedDB manipulation instead of app imports.
 */

import type { Page } from '@playwright/test'
import type { Account } from '../../../lib/db/types'

/**
 * Create a mock account in IndexedDB using direct IndexedDB API
 */
export async function createMockAccount(
  page: Page,
  overrides: Partial<Account> = {}
): Promise<string> {
  const accountId = await page.evaluate(async (accountData) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('wolfcal', 3)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    const account = {
      id: accountData.id || 'test-e2e@example.com',
      email: accountData.email || 'test-e2e@example.com',
      encryptedAccessToken: accountData.encryptedAccessToken || 'encrypted_access_token',
      encryptedRefreshToken: accountData.encryptedRefreshToken || 'encrypted_refresh_token',
      tokenExpiry: accountData.tokenExpiry || Date.now() + 3600000,
      createdAt: accountData.createdAt || Date.now(),
      updatedAt: accountData.updatedAt || Date.now(),
      ...accountData,
    } as Account

    return new Promise<string>((resolve, reject) => {
      const tx = db.transaction('accounts', 'readwrite')
      const store = tx.objectStore('accounts')
      const request = store.add(account)
      request.onsuccess = () => resolve(account.id)
      request.onerror = () => reject(request.error)
    })
  }, overrides)

  return accountId
}

/**
 * Get all accounts from IndexedDB
 */
export async function getAllAccounts(page: Page): Promise<Account[]> {
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
 * Clear all accounts from IndexedDB
 */
export async function clearAllAccounts(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('wolfcal', 3)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('accounts', 'readwrite')
      const store = tx.objectStore('accounts')
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  })
}

/**
 * Verify account exists in IndexedDB
 */
export async function accountExists(page: Page, accountId: string): Promise<boolean> {
  const accounts = await getAllAccounts(page)
  return accounts.some((a) => a.id === accountId)
}

/**
 * Verify account count matches expected
 */
export async function verifyAccountCount(page: Page, expectedCount: number): Promise<boolean> {
  const accounts = await getAllAccounts(page)
  return accounts.length === expectedCount
}

/**
 * Create a mock account with valid (non-expired) token
 */
export async function createValidAccount(
  page: Page,
  overrides?: Partial<Account>
): Promise<string> {
  return createMockAccount(page, {
    tokenExpiry: Date.now() + 3600000,
    ...overrides,
  })
}

/**
 * Create a mock account with expired token
 */
export async function createExpiredAccount(
  page: Page,
  overrides?: Partial<Account>
): Promise<string> {
  return createMockAccount(page, {
    tokenExpiry: Date.now() - 1000,
    ...overrides,
  })
}
