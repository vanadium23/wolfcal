/**
 * Debug test to check what gets imported
 */

import { test, expect } from '@playwright/test';

test('debug import - check IndexedDB contents', async ({ page }) => {
  // Create test config
  const testConfig = btoa(JSON.stringify({
    version: 1,
    accounts: [{
      email: 'test@example.com',
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      tokenExpiry: Date.now() + 3600000,
    }],
    oauthCredentials: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    },
    syncSettings: { autoSync: true, syncInterval: 30 },
    calendarFilters: {},
    exportedAt: Date.now(),
  }));

  // Navigate with config
  await page.goto(`/#config=${testConfig}`);

  // Wait for import modal
  await expect(page.locator('.modal-overlay')).toBeVisible();

  // Enter passphrase
  await page.fill('#import-passphrase', 'any-passphrase');
  await page.click('.modal-content button:has-text("Decrypt")');

  // Check what error we get (since this isn't real encrypted data)
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'debug-import.png' });
  console.log('URL:', page.url());
});
