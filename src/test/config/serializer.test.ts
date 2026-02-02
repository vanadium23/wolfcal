/**
 * Unit tests for configuration serializer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  exportConfig,
  importConfig,
  serializeBundle,
  deserializeBundle,
  type ConfigBundle,
  ConfigError,
} from '../../lib/config/serializer';

// We need to hoist the mock functions before any imports
const { mockGetAll, mockGet, mockPut, mockClear, mockDecryptToken, mockEncryptToken } = vi.hoisted(() => ({
  mockGetAll: vi.fn(),
  mockGet: vi.fn(),
  mockPut: vi.fn(),
  mockClear: vi.fn(),
  mockDecryptToken: vi.fn(),
  mockEncryptToken: vi.fn(),
}));

// Mock the DB module
vi.mock('../../lib/db', () => ({
  getDB: vi.fn().mockResolvedValue({
    getAll: mockGetAll,
    get: mockGet,
    put: mockPut,
    clear: mockClear,
  }),
  closeDB: vi.fn(),
}));

// Mock the encryption module
vi.mock('../../lib/auth/encryption', () => ({
  decryptToken: mockDecryptToken,
  encryptToken: mockEncryptToken,
}));

describe('serializer', () => {
  beforeEach(() => {
    // Clear mocks and localStorage before each test
    mockGetAll.mockReset();
    mockGet.mockReset();
    mockPut.mockReset();
    mockClear.mockReset();
    mockDecryptToken.mockReset();
    mockEncryptToken.mockReset();
    localStorage.clear();
    
    // Setup default mock returns for encryption
    mockDecryptToken.mockResolvedValue('decrypted-token');
    mockEncryptToken.mockResolvedValue('encrypted-token');
    
    // Setup default mock returns for getAll (returns empty arrays by default)
    mockGetAll.mockImplementation((storeName) => {
      if (storeName === 'accounts') return Promise.resolve([]);
      if (storeName === 'calendars') return Promise.resolve([]);
      return Promise.resolve([]);
    });
  });

  describe('exportConfig', () => {
    it('should export empty config when no data exists', async () => {
      const config = await exportConfig();

      expect(config.version).toBe(1);
      expect(config.accounts).toEqual([]);
      expect(config.calendars).toEqual([]);
      expect(config.oauthCredentials).toEqual({ clientId: '', clientSecret: '' });
      expect(config.syncSettings).toEqual({ autoSync: true, syncInterval: 30 });
      expect(config.calendarFilters).toEqual({});
      expect(config.lastUsedCalendarId).toBeUndefined();
      expect(config.exportedAt).toBeLessThanOrEqual(Date.now());
    });

    it('should export accounts with decrypted tokens', async () => {
      const accountData = {
        id: 'test@example.com',
        email: 'test@example.com',
        encryptedAccessToken: 'enc-access',
        encryptedRefreshToken: 'enc-refresh',
        tokenExpiry: Date.now() + 3600000,
        color: '#FF5722',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      mockGetAll.mockImplementation((storeName) => {
        if (storeName === 'accounts') return Promise.resolve([accountData]);
        return Promise.resolve([]);
      });
      
      // Mock decryption to return different tokens
      mockDecryptToken.mockImplementation((encrypted) => {
        if (encrypted === 'enc-access') return Promise.resolve('plaintext-access-token');
        if (encrypted === 'enc-refresh') return Promise.resolve('plaintext-refresh-token');
        return Promise.resolve('decrypted-token');
      });

      const config = await exportConfig();

      expect(config.accounts).toHaveLength(1);
      expect(config.accounts[0]).toEqual({
        email: 'test@example.com',
        accessToken: 'plaintext-access-token',
        refreshToken: 'plaintext-refresh-token',
        tokenExpiry: expect.any(Number),
        color: '#FF5722',
      });
    });

    it('should export calendars', async () => {
      const calendarData = {
        id: 'primary-calendar',
        accountId: 'test@example.com',
        summary: 'My Calendar',
        description: 'Personal calendar',
        color: 'blue',
        backgroundColor: '#0000FF',
        visible: true,
        primary: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      mockGetAll.mockImplementation((storeName) => {
        if (storeName === 'accounts') return Promise.resolve([]);
        if (storeName === 'calendars') return Promise.resolve([calendarData]);
        return Promise.resolve([]);
      });

      const config = await exportConfig();

      expect(config.calendars).toHaveLength(1);
      expect(config.calendars[0]).toEqual({
        id: 'primary-calendar',
        accountId: 'test@example.com',
        summary: 'My Calendar',
        description: 'Personal calendar',
        color: 'blue',
        backgroundColor: '#0000FF',
        visible: true,
        primary: true,
      });
    });

    it('should export sync settings from localStorage', async () => {
      localStorage.setItem('wolfcal:syncSettings', JSON.stringify({
        autoSync: false,
        syncInterval: 60,
      }));

      const config = await exportConfig();

      expect(config.syncSettings).toEqual({
        autoSync: false,
        syncInterval: 60,
      });
    });

    it('should export calendar filters from localStorage', async () => {
      localStorage.setItem('calendar-filters', JSON.stringify({
        'cal1': true,
        'cal2': false,
      }));

      const config = await exportConfig();

      expect(config.calendarFilters).toEqual({
        'cal1': true,
        'cal2': false,
      });
    });

    it('should export last used calendar from localStorage', async () => {
      localStorage.setItem('wolfcal:lastUsedCalendarId', 'primary-calendar');

      const config = await exportConfig();

      expect(config.lastUsedCalendarId).toBe('primary-calendar');
    });

    it('should export OAuth credentials from localStorage', async () => {
      localStorage.setItem('wolfcal:oauth:clientId', 'test-client-id');
      localStorage.setItem('wolfcal:oauth:clientSecret', 'test-client-secret');

      const config = await exportConfig();

      expect(config.oauthCredentials).toEqual({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      });
    });

    it('should handle multiple accounts and calendars', async () => {
      const accounts = [
        {
          id: 'user1@example.com',
          email: 'user1@example.com',
          encryptedAccessToken: 'token1',
          encryptedRefreshToken: 'refresh1',
          tokenExpiry: Date.now() + 3600000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      const calendars = [
        {
          id: 'cal1',
          accountId: 'user1@example.com',
          summary: 'Calendar 1',
          visible: true,
          primary: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'cal2',
          accountId: 'user1@example.com',
          summary: 'Calendar 2',
          visible: false,
          primary: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      
      mockGetAll.mockImplementation((storeName) => {
        if (storeName === 'accounts') return Promise.resolve(accounts);
        if (storeName === 'calendars') return Promise.resolve(calendars);
        return Promise.resolve([]);
      });

      const config = await exportConfig();

      expect(config.accounts).toHaveLength(1);
      expect(config.calendars).toHaveLength(2);
    });
  });

  describe('serializeBundle/deserializeBundle', () => {
    it('should serialize and deserialize correctly', () => {
      const bundle: ConfigBundle = {
        version: 1,
        accounts: [{
          email: 'test@example.com',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          tokenExpiry: Date.now() + 3600000,
        }],
        calendars: [{
          id: 'cal1',
          accountId: 'test@example.com',
          summary: 'Test Calendar',
          visible: true,
          primary: true,
        }],
        oauthCredentials: {
          clientId: 'client-id',
          clientSecret: 'client-secret',
        },
        syncSettings: { autoSync: true, syncInterval: 30 },
        calendarFilters: { cal1: true },
        exportedAt: Date.now(),
      };

      const serialized = serializeBundle(bundle);
      const deserialized = deserializeBundle(serialized);

      expect(deserialized).toEqual(bundle);
    });

    it('should throw on invalid JSON', () => {
      expect(() => deserializeBundle('not-json')).toThrow(ConfigError);
    });

    it('should throw on invalid bundle structure', () => {
      expect(() => deserializeBundle(JSON.stringify({ version: 2 }))).toThrow(ConfigError);
      expect(() => deserializeBundle(JSON.stringify({ version: 1 }))).toThrow(ConfigError);
    });

    it('should throw on missing required fields', () => {
      const partial = { version: 1, accounts: [], calendars: [] };
      expect(() => deserializeBundle(JSON.stringify(partial))).toThrow(ConfigError);
    });
  });

  describe('importConfig - replace mode', () => {
    it('should replace all existing data and re-encrypt tokens', async () => {
      mockClear.mockResolvedValue(undefined);
      mockPut.mockResolvedValue('test@example.com');
      
      // Mock encryption to return specific values
      mockEncryptToken.mockImplementation((token) => {
        return Promise.resolve(`encrypted-${token}`);
      });

      const bundle: ConfigBundle = {
        version: 1,
        accounts: [{
          email: 'test@example.com',
          accessToken: 'plaintext-access',
          refreshToken: 'plaintext-refresh',
          tokenExpiry: Date.now() + 3600000,
        }],
        calendars: [{
          id: 'cal1',
          accountId: 'test@example.com',
          summary: 'Test Calendar',
          visible: true,
          primary: true,
        }],
        oauthCredentials: {
          clientId: 'new-client-id',
          clientSecret: 'new-client-secret',
        },
        syncSettings: { autoSync: false, syncInterval: 60 },
        calendarFilters: { newCal: true },
        exportedAt: Date.now(),
      };

      await importConfig(bundle, 'replace');

      expect(mockClear).toHaveBeenCalledWith('accounts');
      expect(mockClear).toHaveBeenCalledWith('calendars');
      expect(mockPut).toHaveBeenCalled();
      
      // Check that put was called for account
      const accountPutCall = mockPut.mock.calls.find(call => call[0] === 'accounts');
      expect(accountPutCall).toBeDefined();
      expect(accountPutCall![1].email).toBe('test@example.com');
      expect(accountPutCall![1].encryptedAccessToken).toBe('encrypted-plaintext-access');
      
      // Check that put was called for calendar
      const calendarPutCall = mockPut.mock.calls.find(call => call[0] === 'calendars');
      expect(calendarPutCall).toBeDefined();
      expect(calendarPutCall![1].id).toBe('cal1');

      expect(localStorage.getItem('wolfcal:oauth:clientId')).toBe('new-client-id');
      expect(localStorage.getItem('wolfcal:oauth:clientSecret')).toBe('new-client-secret');
    });
  });

  describe('importConfig - merge mode', () => {
    it('should merge accounts and calendars', async () => {
      const existingAccount = {
        id: 'existing@example.com',
        email: 'existing@example.com',
        encryptedAccessToken: 'existing-token',
        encryptedRefreshToken: 'existing-refresh',
        tokenExpiry: Date.now() + 3600000,
        color: '#FF0000',
        createdAt: 1000000,
        updatedAt: 2000000,
      };
      
      mockGet.mockImplementation((storeName, key) => {
        if (storeName === 'accounts' && key === 'new@example.com') return Promise.resolve(undefined);
        if (storeName === 'accounts' && key === 'existing@example.com') return Promise.resolve(existingAccount);
        if (storeName === 'calendars' && key === 'cal1') return Promise.resolve(undefined);
        return Promise.resolve(undefined);
      });
      
      mockPut.mockResolvedValue('new@example.com');
      
      // Mock encryption
      mockEncryptToken.mockImplementation((token) => {
        return Promise.resolve(`encrypted-${token}`);
      });

      const bundle: ConfigBundle = {
        version: 1,
        accounts: [{
          email: 'new@example.com',
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
          tokenExpiry: Date.now() + 3600000,
        }],
        calendars: [{
          id: 'cal1',
          accountId: 'new@example.com',
          summary: 'New Calendar',
          visible: true,
          primary: true,
        }],
        oauthCredentials: { clientId: '', clientSecret: '' },
        syncSettings: { autoSync: true, syncInterval: 30 },
        calendarFilters: {},
        exportedAt: Date.now(),
      };

      await importConfig(bundle, 'merge');

      // Verify put was called for both account and calendar
      expect(mockPut).toHaveBeenCalled();
    });

    it('should merge calendar filters', async () => {
      localStorage.setItem('calendar-filters', JSON.stringify({
        existingCal: true,
        sharedCal: false,
      }));

      const bundle: ConfigBundle = {
        version: 1,
        accounts: [],
        calendars: [],
        oauthCredentials: { clientId: '', clientSecret: '' },
        syncSettings: { autoSync: true, syncInterval: 30 },
        calendarFilters: {
          newCal: true,
          sharedCal: true,
        },
        exportedAt: Date.now(),
      };

      await importConfig(bundle, 'merge');

      const filters = JSON.parse(localStorage.getItem('calendar-filters')!);
      expect(filters).toEqual({
        existingCal: true,
        newCal: true,
        sharedCal: true,
      });
    });

    it('should import OAuth credentials in merge mode', async () => {
      const bundle: ConfigBundle = {
        version: 1,
        accounts: [],
        calendars: [],
        oauthCredentials: {
          clientId: 'imported-client-id',
          clientSecret: 'imported-client-secret',
        },
        syncSettings: { autoSync: true, syncInterval: 30 },
        calendarFilters: {},
        exportedAt: Date.now(),
      };

      await importConfig(bundle, 'merge');

      expect(localStorage.getItem('wolfcal:oauth:clientId')).toBe('imported-client-id');
      expect(localStorage.getItem('wolfcal:oauth:clientSecret')).toBe('imported-client-secret');
    });
  });

  describe('error handling', () => {
    it('should throw ConfigError for invalid bundle', async () => {
      const invalid = { version: 1 } as any;
      
      await expect(importConfig(invalid, 'replace')).rejects.toThrow(ConfigError);
    });

    it('should throw ConfigError with wrong version', async () => {
      const wrongVersion = { 
        version: 2, 
        accounts: [], 
        calendars: [],
        oauthCredentials: { clientId: '', clientSecret: '' },
        syncSettings: {}, 
        calendarFilters: {}, 
        exportedAt: Date.now() 
      } as any;
      
      await expect(importConfig(wrongVersion, 'replace')).rejects.toThrow(ConfigError);
    });
  });
});
