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

      expect(config.version).toBe(2);
      expect(config.accounts).toEqual([]);
      expect(config.calendars).toEqual([]);
      expect(config.oauthCredentials).toEqual({ clientId: '', clientSecret: '' });
      expect(config.syncSettings).toEqual({ autoSync: true, syncInterval: 30 });
      expect(config.calendarFilters).toEqual({});
      expect(config.lastUsedCalendarId).toBeUndefined();
      expect(config.exportedAt).toBeLessThanOrEqual(Date.now());
    });

    it('should export accounts without tokens (metadata only)', async () => {
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

      const config = await exportConfig();

      expect(config.accounts).toHaveLength(1);
      expect(config.accounts[0]).toEqual({
        email: 'test@example.com',
        needsReauth: true,
        createdAt: expect.any(Number),
      });
      // Verify tokens are NOT exported
      expect('accessToken' in config.accounts[0]).toBe(false);
      expect('refreshToken' in config.accounts[0]).toBe(false);
      expect('tokenExpiry' in config.accounts[0]).toBe(false);
      // Verify decryptToken was NOT called
      expect(mockDecryptToken).not.toHaveBeenCalled();
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
        color: 'blue',
        backgroundColor: '#0000FF',
        visible: true,
        primary: true,
        // description omitted (will be fetched from Google API)
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
          description: 'First calendar',
          color: 'red',
          backgroundColor: '#FF0000',
          visible: true,
          primary: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          id: 'cal2',
          accountId: 'user1@example.com',
          summary: 'Calendar 2',
          description: 'Second calendar',
          color: 'blue',
          backgroundColor: '#0000FF',
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
    it('should serialize and deserialize correctly (version 2)', () => {
      const bundle: ConfigBundle = {
        version: 2,
        accounts: [{
          email: 'test@example.com',
          needsReauth: true,
          createdAt: Date.now(),
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

    it('should support version 1 bundles for migration', () => {
      const v1Bundle = {
        version: 1,
        accounts: [{
          email: 'test@example.com',
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          tokenExpiry: Date.now() + 3600000,
          createdAt: Date.now(),
        }],
        calendars: [],
        oauthCredentials: { clientId: '', clientSecret: '' },
        syncSettings: { autoSync: true, syncInterval: 30 },
        calendarFilters: {},
        exportedAt: Date.now(),
      };

      const serialized = serializeBundle(v1Bundle as ConfigBundle);
      const deserialized = deserializeBundle(serialized);

      expect(deserialized.version).toBe(1);
    });

    it('should throw on invalid JSON', () => {
      expect(() => deserializeBundle('not-json')).toThrow(ConfigError);
    });

    it('should throw on invalid bundle structure', () => {
      expect(() => deserializeBundle(JSON.stringify({ version: 3 }))).toThrow(ConfigError);
      expect(() => deserializeBundle(JSON.stringify({ version: 1 }))).toThrow(ConfigError);
    });

    it('should throw on missing required fields', () => {
      const partial = { version: 1, accounts: [], calendars: [] };
      expect(() => deserializeBundle(JSON.stringify(partial))).toThrow(ConfigError);
    });
  });

  describe('importConfig - replace mode', () => {
    it('should replace all existing data with placeholder accounts (version 2)', async () => {
      mockClear.mockResolvedValue(undefined);
      mockPut.mockResolvedValue('test@example.com');

      const bundle: ConfigBundle = {
        version: 2,
        accounts: [{
          email: 'test@example.com',
          needsReauth: true,
          createdAt: Date.now(),
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

      // Check that put was called for account with empty tokens
      const accountPutCall = mockPut.mock.calls.find(call => call[0] === 'accounts');
      expect(accountPutCall).toBeDefined();
      expect(accountPutCall![1].email).toBe('test@example.com');
      expect(accountPutCall![1].encryptedAccessToken).toBe('');
      expect(accountPutCall![1].encryptedRefreshToken).toBe('');
      expect(accountPutCall![1].tokenExpiry).toBe(0);

      // Check that put was called for calendar
      const calendarPutCall = mockPut.mock.calls.find(call => call[0] === 'calendars');
      expect(calendarPutCall).toBeDefined();
      expect(calendarPutCall![1].id).toBe('cal1');

      expect(localStorage.getItem('wolfcal:oauth:clientId')).toBe('new-client-id');
      expect(localStorage.getItem('wolfcal:oauth:clientSecret')).toBe('new-client-secret');
    });

    it('should support version 1 bundles with token re-encryption', async () => {
      mockClear.mockResolvedValue(undefined);
      mockPut.mockResolvedValue('test@example.com');

      // Mock encryption to return specific values
      mockEncryptToken.mockImplementation((token) => {
        return Promise.resolve(`encrypted-${token}`);
      });

      const v1Bundle = {
        version: 1,
        accounts: [{
          email: 'test@example.com',
          accessToken: 'plaintext-access',
          refreshToken: 'plaintext-refresh',
          tokenExpiry: Date.now() + 3600000,
          createdAt: Date.now(),
        }],
        calendars: [],
        oauthCredentials: { clientId: '', clientSecret: '' },
        syncSettings: { autoSync: true, syncInterval: 30 },
        calendarFilters: {},
        exportedAt: Date.now(),
      };

      await importConfig(v1Bundle as ConfigBundle, 'replace');

      // Check that encryptToken was called for version 1 bundle
      expect(mockEncryptToken).toHaveBeenCalledWith('plaintext-access');
      expect(mockEncryptToken).toHaveBeenCalledWith('plaintext-refresh');
    });
  });

  describe('importConfig - merge mode', () => {
    it('should merge accounts and calendars with placeholder tokens (version 2)', async () => {
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

      const bundle: ConfigBundle = {
        version: 2,
        accounts: [{
          email: 'new@example.com',
          needsReauth: true,
          createdAt: Date.now(),
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

      // Check that new account has empty tokens
      const newAccountPutCall = mockPut.mock.calls.find(call =>
        call[0] === 'accounts' && call[1].email === 'new@example.com'
      );
      expect(newAccountPutCall).toBeDefined();
      expect(newAccountPutCall![1].encryptedAccessToken).toBe('');
      expect(newAccountPutCall![1].encryptedRefreshToken).toBe('');
      expect(newAccountPutCall![1].tokenExpiry).toBe(0);
    });

    it('should merge calendar filters', async () => {
      localStorage.setItem('calendar-filters', JSON.stringify({
        existingCal: true,
        sharedCal: false,
      }));

      const bundle: ConfigBundle = {
        version: 2,
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
        version: 2,
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

    it('should throw ConfigError with unsupported version', async () => {
      const wrongVersion = {
        version: 3,
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
