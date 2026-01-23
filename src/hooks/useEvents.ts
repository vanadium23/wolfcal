/**
 * Custom hook for fetching and managing events from all connected accounts
 */

import { useState, useCallback, useEffect } from 'react';
import type { EventInput } from '@fullcalendar/core';
import {
  getAllEvents,
  getVisibleCalendars,
  getAllAccounts,
  updateAccount,
  getPendingChangesByCalendar,
} from '../lib/db';
import { expandRecurringEvents, isRecurringEvent } from '../lib/events';
import type { CalendarEvent } from '../lib/db/types';
import { assignAccountColors } from '../lib/events/colors';

/**
 * Convert CalendarEvent to FullCalendar EventInput format with account color
 */
function convertToEventInput(
  event: CalendarEvent,
  accountColor: string,
  hasPendingChanges: boolean
): EventInput {
  const isAllDay = !!event.start.date && !event.start.dateTime;

  // Add visual indicator for pending offline changes
  const title = hasPendingChanges ? `⏱ ${event.summary}` : event.summary;
  const backgroundColor = hasPendingChanges
    ? '#9ca3af' // Gray color for pending events
    : accountColor;

  return {
    id: event.id,
    title,
    start: event.start.dateTime || event.start.date || '',
    end: event.end.dateTime || event.end.date || '',
    allDay: isAllDay,
    backgroundColor,
    extendedProps: {
      description: event.description,
      location: event.location,
      attendees: event.attendees,
      attachments: event.attachments,
      accountId: event.accountId,
      calendarId: event.calendarId,
      isRecurring: isRecurringEvent(event),
      hasPendingChanges,
    },
  };
}

export interface UseEventsReturn {
  events: EventInput[];
  accountColors: Map<string, { email: string; color: string }>;
  loading: boolean;
  error: Error | null;
  refresh: (range: { start: Date; end: Date }) => Promise<void>;
}

/**
 * Hook to fetch events from all connected accounts with color coding
 */
export function useEvents(): UseEventsReturn {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [accountColors, setAccountColors] = useState<Map<string, { email: string; color: string }>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);

  /**
   * Load events from all accounts with color coding
   */
  const loadEvents = useCallback(async (range: { start: Date; end: Date }) => {
    try {
      setLoading(true);
      setError(null);

      // Get all accounts
      const accounts = await getAllAccounts();
      if (accounts.length === 0) {
        setEvents([]);
        setAccountColors(new Map());
        setLoading(false);
        return;
      }

      // Assign colors to accounts if they don't have colors already
      const accountIds = accounts.map((acc) => acc.id);
      const colorAssignments = assignAccountColors(accountIds);

      // Update accounts with assigned colors if needed
      const accountUpdates: Promise<void>[] = [];
      accounts.forEach((account) => {
        if (!account.color) {
          const assignedColor = colorAssignments.get(account.id);
          if (assignedColor) {
            account.color = assignedColor;
            accountUpdates.push(updateAccount(account).then(() => {}));
          }
        }
      });
      await Promise.all(accountUpdates);

      // Build account color map with emails for legend
      const accountColorMap = new Map<string, { email: string; color: string }>();
      accounts.forEach((account) => {
        accountColorMap.set(account.id, {
          email: account.email,
          color: account.color || colorAssignments.get(account.id) || '#3b82f6',
        });
      });
      setAccountColors(accountColorMap);

      // Get all events from IndexedDB
      const allEvents = await getAllEvents();

      // Get visible calendars to filter events
      const visibleCalendars = await getVisibleCalendars();
      const visibleCalendarIds = new Set(visibleCalendars.map((cal) => cal.id));

      // Filter events to only include those from visible calendars
      const eventsToDisplay = allEvents.filter((event) =>
        visibleCalendarIds.has(event.calendarId)
      );

      // Expand recurring events within the visible date range
      const expandedEvents = expandRecurringEvents(eventsToDisplay, range);

      // Check for pending changes to show indicators
      const pendingEventIds = new Set<string>();
      for (const calendarId of visibleCalendarIds) {
        const pendingChanges = await getPendingChangesByCalendar(calendarId);
        pendingChanges.forEach((change) => {
          if (change.eventId) {
            pendingEventIds.add(change.eventId);
          }
        });
      }

      // Convert to FullCalendar format with account colors
      const fullCalendarEvents = expandedEvents.map((event) => {
        const accountInfo = accountColorMap.get(event.accountId);
        const accountColor = accountInfo?.color || '#3b82f6';
        return convertToEventInput(event, accountColor, pendingEventIds.has(event.id));
      });

      setEvents(fullCalendarEvents);
    } catch (err) {
      console.error('Failed to load events:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh events for a given date range
   */
  const refresh = useCallback(
    async (range: { start: Date; end: Date }) => {
      setDateRange(range);
      await loadEvents(range);
    },
    [loadEvents]
  );

  /**
   * Reload events when date range changes
   */
  useEffect(() => {
    if (dateRange) {
      loadEvents(dateRange);
    }
  }, [dateRange, loadEvents]);

  return {
    events,
    accountColors,
    loading,
    error,
    refresh,
  };
}
