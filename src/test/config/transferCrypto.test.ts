/**
 * Unit tests for transfer crypto utilities
 */

import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, validatePassphrase, base64UrlToUint8Array } from '../../lib/config/transferCrypto';
import { CURRENT_FORMAT_VERSION } from '../../lib/config/transferCrypto';

// Old format test vector generated for backward compatibility testing
const OLD_FORMAT_VECTOR = {
  plaintext: 'Hello, old format!',
  passphrase: 'test-passphrase-123',
  encrypted: 'eyJzYWx0IjoiZ1RRakpubERBejJ6TDBMYTFpSHovZz09IiwiaXYiOiJVOFlhblRQM25Sc05lbXFaIiwiZGF0YSI6InpvVmg4WlJpakNYdVJNOWUwQW1RZ2N2QU02blhCQ0ZhempHK3hLR096amRaS2c9PSJ9'
};

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

      // New format uses base64url (with - and _ instead of + and /)
      expect(encrypted).toMatch(/^[A-Za-z0-9\-_]+$/);
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

  describe('new binary format (version 1)', () => {
    it('should use format version 1', async () => {
      const plaintext = 'Test version marker';
      const passphrase = 'version-test';

      const encrypted = await encrypt(plaintext, passphrase);
      const decoded = base64UrlToUint8Array(encrypted);

      // First byte should be the format version
      expect(decoded[0]).toBe(CURRENT_FORMAT_VERSION);
    });

    it('should have correct binary structure: version || salt || iv || ciphertext', async () => {
      const plaintext = 'Test binary structure';
      const passphrase = 'structure-test';

      const encrypted = await encrypt(plaintext, passphrase);
      const decoded = base64UrlToUint8Array(encrypted);

      // Structure: version(1) || salt(16) || iv(12) || ciphertext
      expect(decoded[0]).toBe(CURRENT_FORMAT_VERSION);
      expect(decoded.length).toBeGreaterThan(1 + 16 + 12); // At least version + salt + iv + some ciphertext

      // Extract and verify we can decrypt with the components
      const version = decoded[0];
      const salt = decoded.slice(1, 17);
      const iv = decoded.slice(17, 29);
      const ciphertext = decoded.slice(29);

      expect(version).toBe(CURRENT_FORMAT_VERSION);
      expect(salt).toHaveLength(16);
      expect(iv).toHaveLength(12);
      expect(ciphertext.length).toBeGreaterThan(0);
    });

    it('should successfully decrypt new format', async () => {
      const plaintext = 'New format round-trip test';
      const passphrase = 'round-trip-pass';

      const encrypted = await encrypt(plaintext, passphrase);
      const decrypted = await decrypt(encrypted, passphrase);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext each time (random salt/iv)', async () => {
      const plaintext = 'Same input for randomness test';
      const passphrase = 'randomness-test';

      const encrypted1 = await encrypt(plaintext, passphrase);
      const encrypted2 = await encrypt(plaintext, passphrase);

      // Ciphertexts should be different due to random salt/IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same value
      expect(await decrypt(encrypted1, passphrase)).toBe(plaintext);
      expect(await decrypt(encrypted2, passphrase)).toBe(plaintext);
    });
  });

  describe('backward compatibility with old format', () => {
    it('should decrypt old double-base64 JSON format', async () => {
      const decrypted = await decrypt(
        OLD_FORMAT_VECTOR.encrypted,
        OLD_FORMAT_VECTOR.passphrase
      );

      expect(decrypted).toBe(OLD_FORMAT_VECTOR.plaintext);
    });

    it('should handle both old and new formats seamlessly', async () => {
      const plaintext = 'Format compatibility test';
      const passphrase = 'compat-test';

      // New format
      const newFormatEncrypted = await encrypt(plaintext, passphrase);
      const newFormatDecrypted = await decrypt(newFormatEncrypted, passphrase);
      expect(newFormatDecrypted).toBe(plaintext);

      // Old format (using known test vector)
      const oldFormatDecrypted = await decrypt(
        OLD_FORMAT_VECTOR.encrypted,
        OLD_FORMAT_VECTOR.passphrase
      );
      expect(oldFormatDecrypted).toBe(OLD_FORMAT_VECTOR.plaintext);
    });
  });

  describe('size reduction', () => {
    it('should produce significantly smaller output than old double-base64 format', async () => {
      // Create a realistic config payload
      const configData = JSON.stringify({
        version: 1,
        accounts: [
          {
            email: 'user1@example.com',
            createdAt: Date.now(),
            color: '#3B82F6',
            backgroundColor: '#DBEAFE',
          },
          {
            email: 'user2@example.com',
            createdAt: Date.now(),
            color: '#10B981',
            backgroundColor: '#D1FAE5',
          },
        ],
        calendars: Array.from({ length: 9 }, (_, i) => ({
          id: `cal-${i}`,
          email: `calendar${i}@example.com`,
          primary: i === 0,
          selected: true,
          color: `#FF${i.toString(16).padStart(4, '0')}00`,
          backgroundColor: `#FF${i.toString(16).padStart(4, '0')}00`,
        })),
        settings: { syncInterval: 30 },
        exportedAt: Date.now(),
      });
      const passphrase = 'size-test-pass';

      // Encrypt with new format
      const newFormatEncrypted = await encrypt(configData, passphrase);

      // Calculate what old format would have been (double base64)
      // We can simulate this by encoding the JSON as base64
      const estimatedOldFormatSize = btoa(JSON.stringify({
        salt: 'x'.repeat(24), // 16 bytes base64 ~ 24 chars
        iv: 'y'.repeat(16), // 12 bytes base64 ~ 16 chars
        data: btoa(configData), // This would be the actual encrypted data
      })).length;

      console.log('New format size:', newFormatEncrypted.length);
      console.log('Estimated old format size:', estimatedOldFormatSize);
      console.log('Size ratio:', (newFormatEncrypted.length / estimatedOldFormatSize * 100).toFixed(1) + '%');

      // New format should be less than 50% of old double-base64 format
      expect(newFormatEncrypted.length).toBeLessThan(estimatedOldFormatSize * 0.5);
    });

    it('should fit within QR code version 40-L limit (2953 bytes)', async () => {
      // The reported case: 2 accounts + 9 calendars
      const realisticConfig = JSON.stringify({
        version: 1,
        accounts: [
          {
            email: 'account1@example.com',
            createdAt: 1704067200000,
            color: '#3B82F6',
            backgroundColor: '#DBEAFE',
          },
          {
            email: 'account2@example.com',
            createdAt: 1704067200000,
            color: '#10B981',
            backgroundColor: '#D1FAE5',
          },
        ],
        calendars: Array.from({ length: 9 }, (_, i) => ({
          id: `cal-${i}`,
          email: `calendar${i}@group.calendar.google.com`,
          primary: i === 0,
          selected: true,
          color: `#FF${i.toString(16).padStart(4, '0')}00`,
          backgroundColor: `#FF${i.toString(16).padStart(4, '0')}00`,
        })),
        settings: { syncInterval: 30, autoSync: true },
        filters: {},
        exportedAt: Date.now(),
      });

      const encrypted = await encrypt(realisticConfig, 'realistic-pass');

      console.log('Realistic config encrypted size:', encrypted.length);

      // Should fit within QR code version 40-L limit
      expect(encrypted.length).toBeLessThan(2953);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', async () => {
      const plaintext = '';
      const passphrase = 'empty-test';

      const encrypted = await encrypt(plaintext, passphrase);
      const decrypted = await decrypt(encrypted, passphrase);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode content - emoji', async () => {
      const plaintext = 'Emoji test: 😀 🎉 ❤️ 🚀 🌟';
      const passphrase = 'emoji-test';

      const encrypted = await encrypt(plaintext, passphrase);
      const decrypted = await decrypt(encrypted, passphrase);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode content - CJK characters', async () => {
      const plaintext = 'CJK test: 中文 日本語 한국어';
      const passphrase = 'cjk-test';

      const encrypted = await encrypt(plaintext, passphrase);
      const decrypted = await decrypt(encrypted, passphrase);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode content - mixed scripts', async () => {
      const plaintext = 'Mixed: Hello мир Привет שלום مرحبا こんにちは 안녕하세요';
      const passphrase = 'mixed-test';

      const encrypted = await encrypt(plaintext, passphrase);
      const decrypted = await decrypt(encrypted, passphrase);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle large payload (stress test)', async () => {
      // Create a large config (simulating many accounts/calendars)
      const largeData = JSON.stringify({
        version: 1,
        accounts: Array.from({ length: 50 }, (_, i) => ({
          email: `user${i}@example.com`,
          createdAt: Date.now() + i,
          color: '#FF0000',
          backgroundColor: '#FFCCCC',
        })),
        calendars: Array.from({ length: 100 }, (_, i) => ({
          id: `cal-${i}`,
          email: `calendar${i}@example.com`,
          primary: i === 0,
          selected: i % 2 === 0,
          color: `#${i.toString(16).padStart(6, '0')}`,
          backgroundColor: `#${(i + 1).toString(16).padStart(6, '0')}`,
        })),
        settings: { syncInterval: 30 },
        exportedAt: Date.now(),
      });
      const passphrase = 'large-payload-test';

      const encrypted = await encrypt(largeData, passphrase);
      const decrypted = await decrypt(encrypted, passphrase);

      expect(decrypted).toBe(largeData);
      console.log('Large payload input size:', largeData.length);
      console.log('Large payload encrypted size:', encrypted.length);
    });

    it('should handle very long single line', async () => {
      const plaintext = 'x'.repeat(10000);
      const passphrase = 'long-line-test';

      const encrypted = await encrypt(plaintext, passphrase);
      const decrypted = await decrypt(encrypted, passphrase);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle data with many special characters', async () => {
      const plaintext = 'Special: \n\r\t\\\'"<>&{}[]|;:$%^&*()_+-=~`@#';
      const passphrase = 'special-chars-test';

      const encrypted = await encrypt(plaintext, passphrase);
      const decrypted = await decrypt(encrypted, passphrase);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('error handling - descriptive errors', () => {
    it('should throw descriptive error for wrong passphrase', async () => {
      const plaintext = 'Secret data';
      const correctPassphrase = 'correct-passphrase';
      const wrongPassphrase = 'wrong-passphrase';

      const encrypted = await encrypt(plaintext, correctPassphrase);

      await expect(decrypt(encrypted, wrongPassphrase)).rejects.toThrow(
        'Decryption failed. Check your passphrase and try again.'
      );
    });

    it('should throw descriptive error for corrupted binary format', async () => {
      const plaintext = 'Secret data';
      const passphrase = 'correct-passphrase';

      const encrypted = await encrypt(plaintext, passphrase);

      // Corrupt by truncating
      const truncated = encrypted.slice(0, -20);

      await expect(decrypt(truncated, passphrase)).rejects.toThrow();
    });

    it('should throw descriptive error for invalid base64', async () => {
      const invalidData = 'not-valid-base64!!!@#$';
      const passphrase = 'any-passphrase';

      await expect(decrypt(invalidData, passphrase)).rejects.toThrow();
    });

    it('should throw error for truncated binary format (too short for header)', async () => {
      // Create a valid encrypted blob then truncate it below minimum header size
      const encrypted = await encrypt('test', 'test');
      const decoded = base64UrlToUint8Array(encrypted);

      // Truncate to less than 1 + 16 + 12 = 29 bytes (version + salt + iv)
      const truncatedBytes = decoded.slice(0, 20);
      const binary = String.fromCharCode(...truncatedBytes);
      const truncatedBase64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      await expect(decrypt(truncatedBase64, 'test')).rejects.toThrow('truncated');
    });

    it('should throw error for unsupported format version', async () => {
      // Create a binary blob with unsupported version byte
      const fakeData = new Uint8Array(30);
      fakeData[0] = 255; // Invalid version
      crypto.getRandomValues(fakeData.slice(1));

      const binary = String.fromCharCode(...fakeData);
      const fakeBase64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      await expect(decrypt(fakeBase64, 'test')).rejects.toThrow();
    });
  });

  describe('compression effectiveness', () => {
    it('should compress repetitive JSON data effectively', async () => {
      // Create highly repetitive JSON (compresses well)
      const repetitiveData = JSON.stringify({
        accounts: Array.from({ length: 10 }, () => ({
          email: 'user@example.com',
          createdAt: Date.now(),
          color: '#FF0000',
          backgroundColor: '#FFCCCC',
        })),
        calendars: Array.from({ length: 20 }, () => ({
          email: 'calendar@example.com',
          selected: true,
        })),
      });

      const encrypted = await encrypt(repetitiveData, 'compression-test');

      // The encrypted result should be significantly smaller than the input
      // even before encryption, thanks to compression
      console.log('Repetitive data size:', repetitiveData.length);
      console.log('Compressed + encrypted size:', encrypted.length);

      // Compression should make the encrypted output smaller than the raw input
      expect(encrypted.length).toBeLessThan(repetitiveData.length);
    });

    it('should handle incompressible data gracefully', async () => {
      // Random-looking data (already compressed or encrypted) won't compress well
      // but gzip should handle it without exploding
      const randomData = Array.from({ length: 1000 }, () =>
        Math.random().toString(36).substring(2)
      ).join('');

      const encrypted = await encrypt(randomData, 'random-test');

      // Should still work even if compression doesn't help
      const decrypted = await decrypt(encrypted, 'random-test');
      expect(decrypted).toBe(randomData);
    });
  });
});
