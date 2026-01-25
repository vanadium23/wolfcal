/**
 * Custom hook for fetching and managing events from all connected accounts
 */

import { useState, useCallback, useEffect } from 'react';
import type { EventInput } from '@fullcalendar/core';
import {
  getAllEvents,
  getVisibleCalendars,
  getPendingChangesByCalendar,
} from '../lib/db';
import { expandRecurringEvents, isRecurringEvent } from '../lib/events';
import type { CalendarEvent } from '../lib/db/types';

/**
 * Convert CalendarEvent to FullCalendar EventInput format with account color
 */
function convertToEventInput(
  event: CalendarEvent,
  accountColor: string,
  hasPendingChanges: boolean
): EventInput {
  const isAllDay = !!event.start.date && !event.start.dateTime;

  // Add visual indicators for conflicts and pending changes
  let title = event.summary;
  let backgroundColor = accountColor;

  if (event.hasConflict) {
    // Conflict takes priority over pending changes
    title = `⚠️ ${event.summary}`;
    backgroundColor = '#dc3545'; // Red color for conflicts
  } else if (hasPendingChanges) {
    title = `⏱ ${event.summary}`;
    backgroundColor = '#9ca3af'; // Gray color for pending events
  }

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
      hasConflict: event.hasConflict,
    },
  };
}

export interface UseEventsReturn {
  events: EventInput[];
  calendarColors: Map<string, { summary: string; color: string }>;
  loading: boolean;
  error: Error | null;
  refresh: (range: { start: Date; end: Date }) => Promise<void>;
}

/**
 * Hook to fetch events from all connected accounts with color coding
 */
export function useEvents(): UseEventsReturn {
  const [events, setEvents] = useState<EventInput[]>([]);
  const [calendarColors, setCalendarColors] = useState<
    Map<string, { summary: string; color: string }>
  >(new Map());
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

      // Get visible calendars to filter events
      const visibleCalendars = await getVisibleCalendars();
      if (visibleCalendars.length === 0) {
        setEvents([]);
        setCalendarColors(new Map());
        setLoading(false);
        return;
      }

      // Build calendar color map for legend
      const calendarColorMap = new Map<string, { summary: string; color: string }>();
      visibleCalendars.forEach((calendar) => {
        calendarColorMap.set(calendar.id, {
          summary: calendar.summary,
          color: calendar.backgroundColor || calendar.color || '#3b82f6',
        });
      });
      setCalendarColors(calendarColorMap);

      // Get all events from IndexedDB
      const allEvents = await getAllEvents();

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
        const calendarInfo = calendarColorMap.get(event.calendarId);
        const calendarColor = calendarInfo?.color || '#3b82f6';
        return convertToEventInput(event, calendarColor, pendingEventIds.has(event.id));
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
    calendarColors,
    loading,
    error,
    refresh,
  };
}
