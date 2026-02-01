/**
 * Account Management Helpers for Playwright E2E Tests
 *
 * Utilities for creating, managing, and verifying mock accounts in tests.
 * Uses mock credentials from handlers-e2e.ts for consistency.
 */

import type { Page } from '@playwright/test'
import type { Account } from '../../../lib/db/types'
import { MOCK_CREDENTIALS, TEST_EMAILS } from '../../mocks/handlers-e2e'

/**
 * Create a mock account in IndexedDB
 *
 * Uses mock credentials from handlers-e2e.ts for consistency
 *
 * @param overrides - Override default account values
 * @returns The created account ID
 */
export async function createMockAccount(
  page: Page,
  overrides: Partial<Account> = {}
): Promise<string> {
  const accountId = await page.evaluate(async (accountData) => {
    const { addAccount } = await import('@/lib/db')

    const account = {
      id: accountData.id || TEST_EMAILS.primary,
      email: accountData.email || TEST_EMAILS.primary,
      encryptedAccessToken: accountData.encryptedAccessToken || 'encrypted_access_token',
      encryptedRefreshToken: accountData.encryptedRefreshToken || 'encrypted_refresh_token',
      tokenExpiry: accountData.tokenExpiry || Date.now() + 3600000, // 1 hour from now
      createdAt: accountData.createdAt || Date.now(),
      updatedAt: accountData.updatedAt || Date.now(),
      ...accountData,
    }

    return await addAccount(account)
  }, overrides)

  return accountId
}

/**
 * Create multiple mock accounts
 */
export async function createMockAccounts(
  page: Page,
  count: number,
  overrides?: Partial<Account>
): Promise<string[]> {
  const accountIds: string[] = []

  for (let i = 0; i < count; i++) {
    const id = await createMockAccount(page, {
      ...overrides,
      email: overrides?.email || `test${i}@example.com`,
      id: overrides?.id || `test-account-${i}`,
    })
    accountIds.push(id)
  }

  return accountIds
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
 * Get a specific account by ID
 */
export async function getAccountById(page: Page, accountId: string): Promise<Account | undefined> {
  return await page.evaluate(async (id) => {
    const { getAccounts } = await import('@/lib/db')
    const accounts = await getAccounts()
    return accounts.find((a) => a.id === id)
  }, accountId)
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
 * Verify account exists in IndexedDB
 */
export async function accountExists(page: Page, accountId: string): Promise<boolean> {
  const account = await getAccountById(page, accountId)
  return account !== undefined
}

/**
 * Verify account count matches expected
 */
export async function verifyAccountCount(page: Page, expectedCount: number): Promise<boolean> {
  const accounts = await getAllAccounts(page)
  return accounts.length === expectedCount
}

/**
 * Get account by email
 */
export async function getAccountByEmail(page: Page, email: string): Promise<Account | undefined> {
  return await page.evaluate(async (emailAddress) => {
    const { getAccounts } = await import('@/lib/db')
    const accounts = await getAccounts()
    return accounts.find((a) => a.email === emailAddress)
  }, email)
}

/**
 * Check if account token is expired
 */
export async function isTokenExpired(page: Page, accountId: string): Promise<boolean> {
  const account = await getAccountById(page, accountId)
  if (!account) return true

  return await page.evaluate(async (expiry) => {
    return Date.now() >= expiry
  }, account.tokenExpiry)
}

/**
 * Create a mock account with valid (non-expired) token
 */
export async function createValidAccount(
  page: Page,
  overrides?: Partial<Account>
): Promise<string> {
  return createMockAccount(page, {
    tokenExpiry: Date.now() + 3600000, // 1 hour from now
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
    tokenExpiry: Date.now() - 1000, // Already expired
    ...overrides,
  })
}
