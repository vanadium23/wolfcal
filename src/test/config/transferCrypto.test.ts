/**
 * Unit tests for transfer crypto utilities
 */

import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, validatePassphrase } from '../../lib/config/transferCrypto';

describe('transferCrypto', () => {
  describe('encrypt/decrypt round-trip', () => {
    it('should encrypt and decrypt correctly with same passphrase', async () => {
      const plaintext = 'Hello, World!';
      const passphrase = 'test-passphrase-123';

      const encrypted = await encrypt(plaintext, passphrase);
      const decrypted = await decrypt(encrypted, passphrase);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same input (random IV/salt)', async () => {
      const plaintext = 'Same input';
      const passphrase = 'same-passphrase';

      const encrypted1 = await encrypt(plaintext, passphrase);
      const encrypted2 = await encrypt(plaintext, passphrase);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same value
      expect(await decrypt(encrypted1, passphrase)).toBe(plaintext);
      expect(await decrypt(encrypted2, passphrase)).toBe(plaintext);
    });

    it('should handle JSON data correctly', async () => {
      const jsonData = JSON.stringify({
        accounts: [{ email: 'test@example.com', token: 'abc123' }],
        settings: { syncInterval: 30 },
      });
      const passphrase = 'json-passphrase';

      const encrypted = await encrypt(jsonData, passphrase);
      const decrypted = await decrypt(encrypted, passphrase);

      expect(JSON.parse(decrypted)).toEqual(JSON.parse(jsonData));
    });

    it('should handle empty strings', async () => {
      const plaintext = '';
      const passphrase = 'empty-test';

      const encrypted = await encrypt(plaintext, passphrase);
      const decrypted = await decrypt(encrypted, passphrase);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', async () => {
      const plaintext = 'Special chars: äöü ñ 中文 🎉';
      const passphrase = 'special-ß-test';

      const encrypted = await encrypt(plaintext, passphrase);
      const decrypted = await decrypt(encrypted, passphrase);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings (simulating config data)', async () => {
      const longData = JSON.stringify({
        accounts: Array(10).fill(null).map((_, i) => ({
          email: `user${i}@example.com`,
          token: `token-${i}-`.repeat(20),
          refreshToken: `refresh-${i}-`.repeat(20),
        })),
        settings: { syncInterval: 30, autoSync: true },
        filters: { calendar1: true, calendar2: false },
      });
      const passphrase = 'long-data-passphrase';

      const encrypted = await encrypt(longData, passphrase);
      const decrypted = await decrypt(encrypted, passphrase);

      expect(decrypted).toBe(longData);
    });
  });

  describe('wrong passphrase handling', () => {
    it('should throw error with wrong passphrase', async () => {
      const plaintext = 'Secret data';
      const correctPassphrase = 'correct-passphrase';
      const wrongPassphrase = 'wrong-passphrase';

      const encrypted = await encrypt(plaintext, correctPassphrase);

      await expect(decrypt(encrypted, wrongPassphrase)).rejects.toThrow(
        'Decryption failed. Check your passphrase and try again.'
      );
    });

    it('should throw error with empty passphrase', async () => {
      const plaintext = 'Secret data';
      const correctPassphrase = 'correct-passphrase';
      const emptyPassphrase = '';

      const encrypted = await encrypt(plaintext, correctPassphrase);

      await expect(decrypt(encrypted, emptyPassphrase)).rejects.toThrow(
        'Decryption failed. Check your passphrase and try again.'
      );
    });
  });

  describe('corrupted data handling', () => {
    it('should throw error for invalid base64', async () => {
      const invalidData = 'not-valid-base64!!!';
      const passphrase = 'any-passphrase';

      await expect(decrypt(invalidData, passphrase)).rejects.toThrow();
    });

    it('should throw error for valid base64 but invalid JSON', async () => {
      const invalidJson = btoa('not-json-structure');
      const passphrase = 'any-passphrase';

      await expect(decrypt(invalidJson, passphrase)).rejects.toThrow();
    });

    it('should throw error for truncated data (missing components)', async () => {
      const partialData = btoa(JSON.stringify({ salt: 'abc', iv: 'def' })); // missing 'data'
      const passphrase = 'any-passphrase';

      await expect(decrypt(partialData, passphrase)).rejects.toThrow();
    });

    it('should throw error for corrupted encrypted data', async () => {
      const plaintext = 'Secret data';
      const passphrase = 'correct-passphrase';

      const encrypted = await encrypt(plaintext, passphrase);

      // Corrupt the encrypted data by changing a character
      const corrupted = encrypted.slice(0, -10) + 'CORRUPTED!';

      await expect(decrypt(corrupted, passphrase)).rejects.toThrow(
        'Decryption failed. Check your passphrase and try again.'
      );
    });
  });

  describe('validatePassphrase', () => {
    it('should return true for correct passphrase', async () => {
      const plaintext = 'Test data';
      const passphrase = 'correct-pass';

      const encrypted = await encrypt(plaintext, passphrase);

      expect(await validatePassphrase(encrypted, passphrase)).toBe(true);
    });

    it('should return false for wrong passphrase', async () => {
      const plaintext = 'Test data';
      const correctPassphrase = 'correct-pass';
      const wrongPassphrase = 'wrong-pass';

      const encrypted = await encrypt(plaintext, correctPassphrase);

      expect(await validatePassphrase(encrypted, wrongPassphrase)).toBe(false);
    });

    it('should return false for corrupted data', async () => {
      const corruptedData = btoa('corrupted-data');
      const passphrase = 'any-pass';

      expect(await validatePassphrase(corruptedData, passphrase)).toBe(false);
    });
  });

  describe('URL safety', () => {
    it('should produce URL-safe base64 output', async () => {
      const plaintext = 'URL safe test';
      const passphrase = 'url-test';

      const encrypted = await encrypt(plaintext, passphrase);

      // Standard base64 may contain + and / which are URL-safe
      // If we needed URL-safe encoding (with - and _), we'd need to use btoa replacement
      // For now, we're using standard base64 which works in URL hash fragments
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('should produce reasonably compact output for URL use', async () => {
      // Simulate a typical config bundle
      const configData = JSON.stringify({
        version: 1,
        accounts: [
          {
            email: 'user@example.com',
            encryptedAccessToken: 'token-' + 'x'.repeat(100),
            encryptedRefreshToken: 'refresh-' + 'x'.repeat(100),
            tokenExpiry: Date.now() + 3600000,
          },
        ],
        syncSettings: { autoSync: true, syncInterval: 30 },
        calendarFilters: { cal1: true, cal2: false },
        exportedAt: Date.now(),
      });
      const passphrase = 'config-pass';

      const encrypted = await encrypt(configData, passphrase);

      // URL hashes can typically handle 2KB-8KB
      // Our encrypted data should be well under that limit
      console.log('Encrypted length:', encrypted.length);
      expect(encrypted.length).toBeLessThan(2048);
    });
  });
});
