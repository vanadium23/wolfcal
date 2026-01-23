/**
 * Custom hook for managing event filter state (account/calendar visibility)
 */

import { useState, useEffect, useCallback } from 'react';
import { getAllAccounts, getAllCalendars, updateCalendar } from '../lib/db';
import type { Account, Calendar } from '../lib/db/types';

const STORAGE_KEY = 'calendar-filters';

export interface FilterState {
  accounts: Map<string, boolean>; // accountId -> visible
  calendars: Map<string, boolean>; // calendarId -> visible
}

export interface UseEventFiltersReturn {
  accounts: Account[];
  calendars: Calendar[];
  filterState: FilterState;
  toggleAccount: (accountId: string) => Promise<void>;
  toggleCalendar: (calendarId: string) => Promise<void>;
  selectAll: () => Promise<void>;
  deselectAll: () => Promise<void>;
  loading: boolean;
}

/**
 * Load filter state from localStorage
 */
function loadFilterState(): FilterState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        accounts: new Map(parsed.accounts || []),
        calendars: new Map(parsed.calendars || []),
      };
    }
  } catch (err) {
    console.error('Failed to load filter state from localStorage:', err);
  }
  return {
    accounts: new Map(),
    calendars: new Map(),
  };
}

/**
 * Save filter state to localStorage
 */
function saveFilterState(state: FilterState): void {
  try {
    const serialized = {
      accounts: Array.from(state.accounts.entries()),
      calendars: Array.from(state.calendars.entries()),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (err) {
    console.error('Failed to save filter state to localStorage:', err);
  }
}

/**
 * Hook to manage account/calendar filter state
 */
export function useEventFilters(): UseEventFiltersReturn {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [filterState, setFilterState] = useState<FilterState>(loadFilterState);
  const [loading, setLoading] = useState(true);

  /**
   * Load accounts and calendars from IndexedDB
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [loadedAccounts, loadedCalendars] = await Promise.all([
        getAllAccounts(),
        getAllCalendars(),
      ]);

      setAccounts(loadedAccounts);
      setCalendars(loadedCalendars);

      // Initialize filter state if not already present
      const currentState = loadFilterState();
      let hasChanges = false;

      // Default all accounts to visible if not in filter state
      loadedAccounts.forEach((account) => {
        if (!currentState.accounts.has(account.id)) {
          currentState.accounts.set(account.id, true);
          hasChanges = true;
        }
      });

      // Default all calendars to visible if not in filter state
      loadedCalendars.forEach((calendar) => {
        if (!currentState.calendars.has(calendar.id)) {
          currentState.calendars.set(calendar.id, calendar.visible);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setFilterState({ ...currentState });
        saveFilterState(currentState);
      }
    } catch (err) {
      console.error('Failed to load accounts/calendars:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load data on mount
   */
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Toggle account visibility (affects all calendars in account)
   */
  const toggleAccount = useCallback(
    async (accountId: string) => {
      const currentVisibility = filterState.accounts.get(accountId) ?? true;
      const newVisibility = !currentVisibility;

      // Update account filter state
      const newState: FilterState = {
        accounts: new Map(filterState.accounts),
        calendars: new Map(filterState.calendars),
      };
      newState.accounts.set(accountId, newVisibility);

      // Update all calendars belonging to this account
      const accountCalendars = calendars.filter((cal) => cal.accountId === accountId);
      const updatePromises: Promise<void>[] = [];

      for (const calendar of accountCalendars) {
        newState.calendars.set(calendar.id, newVisibility);
        // Update calendar visibility in IndexedDB
        calendar.visible = newVisibility;
        updatePromises.push(updateCalendar(calendar).then(() => {}));
      }

      await Promise.all(updatePromises);
      setFilterState(newState);
      saveFilterState(newState);

      // Reload calendars to reflect changes
      await loadData();
    },
    [filterState, calendars, loadData]
  );

  /**
   * Toggle individual calendar visibility
   */
  const toggleCalendar = useCallback(
    async (calendarId: string) => {
      const currentVisibility = filterState.calendars.get(calendarId) ?? true;
      const newVisibility = !currentVisibility;

      const newState: FilterState = {
        accounts: new Map(filterState.accounts),
        calendars: new Map(filterState.calendars),
      };
      newState.calendars.set(calendarId, newVisibility);

      // Update calendar in IndexedDB
      const calendar = calendars.find((cal) => cal.id === calendarId);
      if (calendar) {
        calendar.visible = newVisibility;
        await updateCalendar(calendar);
      }

      setFilterState(newState);
      saveFilterState(newState);

      // Reload calendars to reflect changes
      await loadData();
    },
    [filterState, calendars, loadData]
  );

  /**
   * Select all accounts and calendars
   */
  const selectAll = useCallback(async () => {
    const newState: FilterState = {
      accounts: new Map(),
      calendars: new Map(),
    };

    accounts.forEach((account) => {
      newState.accounts.set(account.id, true);
    });

    const updatePromises: Promise<void>[] = [];
    calendars.forEach((calendar) => {
      newState.calendars.set(calendar.id, true);
      calendar.visible = true;
      updatePromises.push(updateCalendar(calendar).then(() => {}));
    });

    await Promise.all(updatePromises);
    setFilterState(newState);
    saveFilterState(newState);

    // Reload calendars to reflect changes
    await loadData();
  }, [accounts, calendars, loadData]);

  /**
   * Deselect all accounts and calendars
   */
  const deselectAll = useCallback(async () => {
    const newState: FilterState = {
      accounts: new Map(),
      calendars: new Map(),
    };

    accounts.forEach((account) => {
      newState.accounts.set(account.id, false);
    });

    const updatePromises: Promise<void>[] = [];
    calendars.forEach((calendar) => {
      newState.calendars.set(calendar.id, false);
      calendar.visible = false;
      updatePromises.push(updateCalendar(calendar).then(() => {}));
    });

    await Promise.all(updatePromises);
    setFilterState(newState);
    saveFilterState(newState);

    // Reload calendars to reflect changes
    await loadData();
  }, [accounts, calendars, loadData]);

  return {
    accounts,
    calendars,
    filterState,
    toggleAccount,
    toggleCalendar,
    selectAll,
    deselectAll,
    loading,
  };
}
