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
const { mockGetAll, mockGet, mockPut, mockClear } = vi.hoisted(() => ({
  mockGetAll: vi.fn(),
  mockGet: vi.fn(),
  mockPut: vi.fn(),
  mockClear: vi.fn(),
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

describe('serializer', () => {
  beforeEach(() => {
    // Clear mocks and localStorage before each test
    mockGetAll.mockReset();
    mockGet.mockReset();
    mockPut.mockReset();
    mockClear.mockReset();
    localStorage.clear();
  });

  describe('exportConfig', () => {
    it('should export empty config when no data exists', async () => {
      mockGetAll.mockResolvedValue([]);

      const config = await exportConfig();

      expect(config.version).toBe(1);
      expect(config.accounts).toEqual([]);
      expect(config.syncSettings).toEqual({ autoSync: true, syncInterval: 30 });
      expect(config.calendarFilters).toEqual({});
      expect(config.lastUsedCalendarId).toBeUndefined();
      expect(config.exportedAt).toBeLessThanOrEqual(Date.now());
    });

    it('should export accounts from IndexedDB', async () => {
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
      mockGetAll.mockResolvedValue([accountData]);

      const config = await exportConfig();

      expect(config.accounts).toHaveLength(1);
      expect(config.accounts[0]).toEqual({
        email: 'test@example.com',
        encryptedAccessToken: 'enc-access',
        encryptedRefreshToken: 'enc-refresh',
        tokenExpiry: expect.any(Number),
        color: '#FF5722',
      });
    });

    it('should export sync settings from localStorage', async () => {
      mockGetAll.mockResolvedValue([]);
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
      mockGetAll.mockResolvedValue([]);
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
      mockGetAll.mockResolvedValue([]);
      localStorage.setItem('wolfcal:lastUsedCalendarId', 'primary-calendar');

      const config = await exportConfig();

      expect(config.lastUsedCalendarId).toBe('primary-calendar');
    });

    it('should handle multiple accounts', async () => {
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
        {
          id: 'user2@example.com',
          email: 'user2@example.com',
          encryptedAccessToken: 'token2',
          encryptedRefreshToken: 'refresh2',
          tokenExpiry: Date.now() + 3600000,
          color: '#2196F3',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      mockGetAll.mockResolvedValue(accounts);

      const config = await exportConfig();

      expect(config.accounts).toHaveLength(2);
      expect(config.accounts.map(a => a.email)).toEqual([
        'user1@example.com',
        'user2@example.com',
      ]);
    });
  });

  describe('serializeBundle/deserializeBundle', () => {
    it('should serialize and deserialize correctly', () => {
      const bundle: ConfigBundle = {
        version: 1,
        accounts: [{
          email: 'test@example.com',
          encryptedAccessToken: 'enc-token',
          encryptedRefreshToken: 'enc-refresh',
          tokenExpiry: Date.now() + 3600000,
        }],
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
      const partial = { version: 1, accounts: [] };
      expect(() => deserializeBundle(JSON.stringify(partial))).toThrow(ConfigError);
    });
  });

  describe('importConfig - replace mode', () => {
    it('should replace all existing data', async () => {
      mockClear.mockResolvedValue(undefined);
      mockPut.mockResolvedValue('test@example.com');

      const bundle: ConfigBundle = {
        version: 1,
        accounts: [{
          email: 'test@example.com',
          encryptedAccessToken: 'new-token',
          encryptedRefreshToken: 'new-refresh',
          tokenExpiry: Date.now() + 3600000,
        }],
        syncSettings: { autoSync: false, syncInterval: 60 },
        calendarFilters: { newCal: true },
        exportedAt: Date.now(),
      };

      await importConfig(bundle, 'replace');

      expect(mockClear).toHaveBeenCalledWith('accounts');
      expect(mockPut).toHaveBeenCalled();
      
      const putCall = mockPut.mock.calls[0];
      expect(putCall[0]).toBe('accounts');
      expect(putCall[1].email).toBe('test@example.com');

      expect(localStorage.getItem('wolfcal:syncSettings')).toBeTruthy();
      expect(JSON.parse(localStorage.getItem('wolfcal:syncSettings')!)).toEqual({
        autoSync: false,
        syncInterval: 60,
      });

      expect(localStorage.getItem('calendar-filters')).toBeTruthy();
      expect(JSON.parse(localStorage.getItem('calendar-filters')!)).toEqual({
        newCal: true,
      });
    });

    it('should clear localStorage in replace mode', async () => {
      mockClear.mockResolvedValue(undefined);
      localStorage.setItem('wolfcal:lastUsedCalendarId', 'old-calendar');

      const bundle: ConfigBundle = {
        version: 1,
        accounts: [],
        syncSettings: { autoSync: true, syncInterval: 30 },
        calendarFilters: {},
        exportedAt: Date.now(),
      };

      await importConfig(bundle, 'replace');

      expect(localStorage.getItem('wolfcal:lastUsedCalendarId')).toBeNull();
    });
  });

  describe('importConfig - merge mode', () => {
    it('should merge accounts with new ones', async () => {
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
      
      mockGet.mockResolvedValue(existingAccount);
      mockPut.mockResolvedValue('new@example.com');

      const bundle: ConfigBundle = {
        version: 1,
        accounts: [{
          email: 'new@example.com',
          encryptedAccessToken: 'new-token',
          encryptedRefreshToken: 'new-refresh',
          tokenExpiry: Date.now() + 3600000,
        }],
        syncSettings: { autoSync: true, syncInterval: 30 },
        calendarFilters: {},
        exportedAt: Date.now(),
      };

      await importConfig(bundle, 'merge');

      // Should check for existing account
      expect(mockGet).toHaveBeenCalledWith('accounts', 'new@example.com');
      expect(mockPut).toHaveBeenCalled();
    });

    it('should update existing account in merge mode', async () => {
      const existingAccount = {
        id: 'user@example.com',
        email: 'user@example.com',
        encryptedAccessToken: 'old-token',
        encryptedRefreshToken: 'old-refresh',
        tokenExpiry: 1000000,
        color: '#FF0000',
        createdAt: 1000000,
        updatedAt: 2000000,
      };
      
      mockGet.mockResolvedValue(existingAccount);
      mockPut.mockResolvedValue('user@example.com');

      const bundle: ConfigBundle = {
        version: 1,
        accounts: [{
          email: 'user@example.com',
          encryptedAccessToken: 'new-token',
          encryptedRefreshToken: 'new-refresh',
          tokenExpiry: 3000000,
          color: '#00FF00',
        }],
        syncSettings: { autoSync: true, syncInterval: 30 },
        calendarFilters: {},
        exportedAt: Date.now(),
      };

      await importConfig(bundle, 'merge');

      expect(mockGet).toHaveBeenCalledWith('accounts', 'user@example.com');
      expect(mockPut).toHaveBeenCalled();
      
      const putCall = mockPut.mock.calls[0];
      expect(putCall[1].encryptedAccessToken).toBe('new-token');
      expect(putCall[1].color).toBe('#00FF00');
      expect(putCall[1].createdAt).toBe(1000000); // Preserved
    });

    it('should merge calendar filters', async () => {
      localStorage.setItem('calendar-filters', JSON.stringify({
        existingCal: true,
        sharedCal: false,
      }));

      const bundle: ConfigBundle = {
        version: 1,
        accounts: [],
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
        sharedCal: true, // Overridden
      });
    });

    it('should not override last used calendar if already set', async () => {
      localStorage.setItem('wolfcal:lastUsedCalendarId', 'existing-calendar');

      const bundle: ConfigBundle = {
        version: 1,
        accounts: [],
        syncSettings: { autoSync: true, syncInterval: 30 },
        calendarFilters: {},
        lastUsedCalendarId: 'new-calendar',
        exportedAt: Date.now(),
      };

      await importConfig(bundle, 'merge');

      expect(localStorage.getItem('wolfcal:lastUsedCalendarId')).toBe('existing-calendar');
    });

    it('should set last used calendar if not already set', async () => {
      const bundle: ConfigBundle = {
        version: 1,
        accounts: [],
        syncSettings: { autoSync: true, syncInterval: 30 },
        calendarFilters: {},
        lastUsedCalendarId: 'new-calendar',
        exportedAt: Date.now(),
      };

      await importConfig(bundle, 'merge');

      expect(localStorage.getItem('wolfcal:lastUsedCalendarId')).toBe('new-calendar');
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
        syncSettings: {}, 
        calendarFilters: {}, 
        exportedAt: Date.now() 
      } as any;
      
      await expect(importConfig(wrongVersion, 'replace')).rejects.toThrow(ConfigError);
    });
  });
});
