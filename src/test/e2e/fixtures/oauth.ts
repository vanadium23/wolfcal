/**
 * OAuth Flow Helpers for Playwright E2E Tests
 *
 * These utilities mock the OAuth popup flow by intercepting postMessage
 * communication, allowing tests to bypass the actual Google OAuth consent
 * screen while validating the application's OAuth handling logic.
 */

import type { Page, BrowserContext } from '@playwright/test'
import type { OAuthTokenResponse } from '../../../lib/auth/types'
import { TEST_EMAILS } from '../../mocks/handlers-e2e'

/**
 * Mock OAuth popup by intercepting postMessage
 *
 * This approach intercepts the postMessage communication from the
 * OAuth popup window, rather than mocking the popup HTML itself.
 *
 * @param context - Playwright browser context
 * @param tokens - Mock tokens to return
 */
export async function mockOAuthPopup(
  context: BrowserContext,
  tokens: Partial<OAuthTokenResponse> = {}
): Promise<void> {
  // Listen for popup opens and inject message poster
  context.on('page', async (popup) => {
    await popup.evaluate((tokensToPost) => {
      // Post the OAuth success message back to opener
      window.opener.postMessage(
        {
          type: 'oauth-success',
          tokens: tokensToPost,
        },
        '*'
      )
      // Close popup after posting
      window.close()
    }, {
      access_token: tokens.access_token || 'mock_access_token_e2e',
      refresh_token: tokens.refresh_token || 'mock_refresh_token_e2e',
      expires_in: tokens.expires_in || 3600,
      token_type: tokens.token_type || 'Bearer',
      scope: tokens.scope || 'https://www.googleapis.com/auth/calendar',
    } satisfies OAuthTokenResponse)
  })
}

/**
 * Mock OAuth popup error
 *
 * Simulates an OAuth error (e.g., user denies consent, invalid credentials)
 */
export async function mockOAuthError(
  context: BrowserContext,
  error: string = 'access_denied',
  description: string = 'User denied the request'
): Promise<void> {
  await context.route('https://accounts.google.com/o/oauth2/v2/auth', async (route) => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>OAuth Error</title></head>
        <body>
          <h1>OAuth Error</h1>
          <script>
            window.opener.postMessage({
              type: 'oauth-error',
              error: '${error}',
              error_description: '${description}'
            }, '*');
            window.close();
          </script>
        </body>
      </html>
    `

    await route.fulfill({
      status: 200,
      body: html,
      headers: { 'content-type': 'text/html' },
    })
  })
}

/**
 * Mock OAuth token endpoint
 *
 * Intercepts the token exchange endpoint to return mock tokens
 * This is an alternative to mocking the popup - useful for testing
 * the token exchange logic directly
 */
export async function mockOAuthTokenEndpoint(
  context: BrowserContext,
  tokens: Partial<OAuthTokenResponse> = {}
): Promise<void> {
  await context.route('https://oauth2.googleapis.com/token', async (route) => {
    const mockTokens: OAuthTokenResponse = {
      access_token: tokens.access_token || 'mock_access_token',
      refresh_token: tokens.refresh_token || 'mock_refresh_token',
      expires_in: tokens.expires_in || 3600,
      token_type: tokens.token_type || 'Bearer',
      scope: tokens.scope || 'https://www.googleapis.com/auth/calendar',
    }

    await route.fulfill({
      status: 200,
      body: JSON.stringify(mockTokens),
      headers: { 'content-type': 'application/json' },
    })
  })
}

/**
 * Trigger OAuth flow from Settings page
 *
 * Navigates to Settings and clicks the "Add Account" button
 */
export async function triggerOAuthFlow(page: Page): Promise<void> {
  // Navigate to Settings
  await page.goto('/')
  await page.click('button:has-text("Settings")')
  await page.waitForURL(/\/settings/)

  // Click Add Account button
  const addButton = page.locator('button:has-text("Add Account"), button:has-text("Connect Account")')
  await addButton.click()
}

/**
 * Wait for OAuth completion
 *
 * Waits for the OAuth success message to be processed and UI to update
 */
export async function waitForOAuthCompletion(page: Page): Promise<void> {
  // Wait for success alert or account list update
  await page.waitForSelector('text=Account added, text=Account successfully added', { timeout: 5000 })
}

/**
 * Wait for OAuth error
 *
 * Waits for the OAuth error message to be displayed
 */
export async function waitForOAuthError(page: Page): Promise<void> {
  await page.waitForSelector('text=Failed to add account, text=OAuth error', { timeout: 5000 })
}

/**
 * Complete full OAuth flow (mock popup + wait for completion)
 *
 * Convenience function that combines mocking and waiting
 */
export async function completeOAuthFlow(
  context: BrowserContext,
  page: Page,
  tokens?: Partial<OAuthTokenResponse>
): Promise<void> {
  await mockOAuthPopup(context, tokens)
  await triggerOAuthFlow(page)
  await waitForOAuthCompletion(page)
}

/**
 * Verify account was stored in IndexedDB after OAuth
 *
 * Checks that the OAuth tokens were properly encrypted and stored
 * and that the account email matches the test email from handlers-e2e.ts
 */
export async function verifyAccountStored(page: Page): Promise<boolean> {
  const accounts = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('wolfcal', 3)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    return new Promise<any[]>((resolve, reject) => {
      const tx = db.transaction('accounts', 'readonly')
      const store = tx.objectStore('accounts')
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  })
  return accounts.length > 0 && accounts.some((a: any) => a.email === TEST_EMAILS.primary)
}

/**
 * Get stored account count
 */
export async function getAccountCount(page: Page): Promise<number> {
  return await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('wolfcal', 3)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    return new Promise<number>((resolve, reject) => {
      const tx = db.transaction('accounts', 'readonly')
      const store = tx.objectStore('accounts')
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result.length)
      request.onerror = () => reject(request.error)
    })
  })
}
