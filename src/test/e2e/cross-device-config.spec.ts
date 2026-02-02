/**
 * Cross-Device Configuration Export/Import E2E Tests
 *
 * Tests the complete flow for exporting configuration with a passphrase
 * and importing it on another device (simulated via URL hash).
 */

import { test, expect } from '@playwright/test';

test.describe('Cross-Device Configuration Export/Import', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Settings
    await page.goto('/');
    await page.click('button:has-text("Settings")');
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Close any open modals
    const overlay = page.locator('.modal-overlay');
    if (await overlay.isVisible()) {
      // Try clicking outside or cancel button
      const cancelButton = page.locator('.modal-actions .button-secondary, .modal-actions button:has-text("Cancel")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
    }
  });

  test('should show Export Configuration button', async ({ page }) => {
    // Verify Export Configuration button exists
    const exportButton = page.locator('button:has-text("Export Configuration")');
    await expect(exportButton).toBeVisible();
  });

  test('should show passphrase modal when clicking Export', async ({ page }) => {
    // Click Export Configuration button
    await page.click('button:has-text("Export Configuration")');

    // Verify passphrase modal appears
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.locator('.modal-content h2:has-text("Export Configuration")')).toBeVisible();
    await expect(page.locator('#export-passphrase')).toBeVisible();
    await expect(page.locator('#export-confirm-passphrase')).toBeVisible();
  });

  test('should validate passphrase requirements', async ({ page }) => {
    // Click Export Configuration button
    await page.click('button:has-text("Export Configuration")');

    // Try to export with empty passphrase
    const exportButton = page.locator('.modal-content button:has-text("Export")');
    await exportButton.click();

    // Should show error about empty passphrase
    await expect(page.locator('.modal-error:has-text("passphrase")')).toBeVisible();

    // Enter mismatched passphrases
    await page.fill('#export-passphrase', 'test12345');
    await page.fill('#export-confirm-passphrase', 'different');
    await exportButton.click();

    // Should show error about mismatch
    await expect(page.locator('.modal-error:has-text("do not match")')).toBeVisible();

    // Enter short passphrase
    await page.fill('#export-passphrase', 'short');
    await page.fill('#export-confirm-passphrase', 'short');
    await exportButton.click();

    // Should show error about minimum length
    await expect(page.locator('.modal-error:has-text("8 characters")')).toBeVisible();
  });

  test('should complete export flow and show URL', async ({ page }) => {
    // Click Export Configuration button
    await page.click('button:has-text("Export Configuration")');

    // Enter passphrase
    await page.fill('#export-passphrase', 'test-passphrase-123');
    await page.fill('#export-confirm-passphrase', 'test-passphrase-123');

    // Click Export
    const exportButton = page.locator('.modal-content button:has-text("Export")');
    await exportButton.click();

    // Wait for export to complete and result modal to appear
    await expect(page.locator('.modal-content h2:has-text("Configuration Exported")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#export-url')).toBeVisible();

    // Verify URL contains #config=
    const urlInput = page.locator('#export-url');
    const url = await urlInput.inputValue();
    expect(url).toContain('#config=');
    expect(url.length).toBeGreaterThan(0);

    // Test copy button exists and is clickable
    const copyButton = page.locator('.url-input-group button');
    await expect(copyButton).toBeVisible();
    // Note: Clipboard API in automated tests may not update button state
    // We verify the button is present and functional
    await copyButton.click();
  });

  test('should close result modal', async ({ page }) => {
    // Complete export flow first
    await page.click('button:has-text("Export Configuration")');
    await page.fill('#export-passphrase', 'test-passphrase-123');
    await page.fill('#export-confirm-passphrase', 'test-passphrase-123');
    const exportButton = page.locator('.modal-content button:has-text("Export")');
    await exportButton.click();
    await expect(page.locator('.modal-content h2:has-text("Configuration Exported")')).toBeVisible({ timeout: 10000 });

    // Click Done button
    const doneButton = page.locator('.modal-content button:has-text("Done")');
    await doneButton.click();

    // Modal should be closed
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });

  test('should cancel export modal', async ({ page }) => {
    // Click Export Configuration button
    await page.click('button:has-text("Export Configuration")');

    // Click Cancel button
    const cancelButton = page.locator('.modal-content button:has-text("Cancel")');
    await cancelButton.click();

    // Modal should be closed
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });
});

test.describe('Cross-Device Configuration Import', () => {
  test('should show import modal when URL has #config hash', async ({ page }) => {
    // Create a simple base64 config for testing (not real encrypted, just for UI test)
    const testConfig = btoa(JSON.stringify({
      version: 1,
      accounts: [],
      syncSettings: { autoSync: true, syncInterval: 30 },
      calendarFilters: {},
      exportedAt: Date.now(),
    }));

    // Navigate to URL with #config hash
    await page.goto(`/#config=${testConfig}`);

    // Import modal should appear
    await expect(page.locator('.modal-overlay')).toBeVisible();
    await expect(page.locator('.modal-content h2:has-text("Import Configuration")')).toBeVisible();
    await expect(page.locator('#import-passphrase')).toBeVisible();
  });

  test('should cancel import and remove URL hash', async ({ page }) => {
    // Create test config
    const testConfig = btoa(JSON.stringify({
      version: 1,
      accounts: [],
      syncSettings: { autoSync: true, syncInterval: 30 },
      calendarFilters: {},
      exportedAt: Date.now(),
    }));

    // Navigate to URL with #config hash
    await page.goto(`/#config=${testConfig}`);

    // Verify modal appears
    await expect(page.locator('.modal-overlay')).toBeVisible();

    // Click Cancel
    const cancelButton = page.locator('.modal-content button:has-text("Cancel")');
    await cancelButton.click();

    // Modal should close
    await expect(page.locator('.modal-overlay')).not.toBeVisible();

    // URL hash should be removed
    const url = page.url();
    expect(url).not.toContain('#config=');
  });
});

test.describe('Cross-Device Configuration Integration', () => {
  test('should complete export flow and verify URL structure', async ({ page }) => {
    // Step 1: Go to Settings and start export
    await page.goto('/');
    await page.click('button:has-text("Settings")');
    await page.click('button:has-text("Export Configuration")');

    // Step 2: Enter passphrase and export
    await page.fill('#export-passphrase', 'integration-test-123');
    await page.fill('#export-confirm-passphrase', 'integration-test-123');
    const exportButton = page.locator('.modal-content button:has-text("Export")');
    await exportButton.click();

    // Step 3: Get the exported URL
    await expect(page.locator('#export-url')).toBeVisible({ timeout: 10000 });
    const urlInput = page.locator('#export-url');
    const exportedUrl = await urlInput.inputValue();

    // Verify URL format
    expect(exportedUrl).toContain('#config=');

    // Verify encrypted data is substantial
    const hashPart = exportedUrl.split('#config=')[1];
    expect(hashPart).toBeTruthy();
    expect(hashPart.length).toBeGreaterThan(100);

    // Close the modal
    await page.click('.modal-content button:has-text("Done")');
  });
});
