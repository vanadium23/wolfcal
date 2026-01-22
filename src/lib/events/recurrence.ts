/**
 * Recurrence handling for recurring events
 *
 * Parses RRULE strings from Google Calendar and generates event instances
 * within a specified date range. Does not store instances - generates on-demand.
 */

import { RRule, RRuleSet, rrulestr } from 'rrule';
import type { CalendarEvent } from '../db/types';

/**
 * Expanded event instance from a recurring event
 */
export interface ExpandedEventInstance extends CalendarEvent {
  originalEventId: string; // ID of the parent recurring event
  instanceDate: string; // ISO date string for this instance
}

/**
 * Date range for expanding recurring events
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Parse RRULE string(s) from Google Calendar format
 * @param recurrenceRules - Array of RRULE/EXDATE strings from Google Calendar
 * @returns RRuleSet or RRule object
 */
function parseRecurrenceRules(recurrenceRules: string[]): RRuleSet | RRule | null {
  if (!recurrenceRules || recurrenceRules.length === 0) {
    return null;
  }

  try {
    // Join all rules with newlines to create a full RRULE string
    const rruleString = recurrenceRules.join('\n');

    // Parse using rrulestr which handles both single RRULEs and complex RRULESETs
    const rrule = rrulestr(rruleString, { forceset: true }) as RRuleSet;

    return rrule;
  } catch (error) {
    console.error('Failed to parse recurrence rules:', recurrenceRules, error);
    return null;
  }
}

/**
 * Calculate duration of an event in milliseconds
 */
function getEventDuration(event: CalendarEvent): number {
  const startTime = event.start.dateTime || event.start.date;
  const endTime = event.end.dateTime || event.end.date;

  if (!startTime || !endTime) {
    // Default to 1 hour for events without end time
    return 60 * 60 * 1000;
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  return end.getTime() - start.getTime();
}

/**
 * Check if event is all-day
 */
function isAllDayEvent(event: CalendarEvent): boolean {
  return !!event.start.date && !event.start.dateTime;
}

/**
 * Expand a recurring event into individual instances within a date range
 *
 * @param event - The recurring event with recurrence rules
 * @param dateRange - Date range to generate instances within
 * @param exceptions - Map of instance dates to exception events (modified instances)
 * @returns Array of expanded event instances
 */
export function expandRecurringEvent(
  event: CalendarEvent,
  dateRange: DateRange,
  exceptions: Map<string, CalendarEvent> = new Map()
): ExpandedEventInstance[] {
  // If event has no recurrence rules, return empty array
  if (!event.recurrence || event.recurrence.length === 0) {
    return [];
  }

  const rrule = parseRecurrenceRules(event.recurrence);
  if (!rrule) {
    console.warn('Failed to parse recurrence for event:', event.id);
    return [];
  }

  const instances: ExpandedEventInstance[] = [];
  const duration = getEventDuration(event);
  const isAllDay = isAllDayEvent(event);

  try {
    // Get all occurrences within the date range
    const occurrences = rrule.between(dateRange.start, dateRange.end, true);

    for (const occurrence of occurrences) {
      const instanceDate = occurrence.toISOString().split('T')[0]; // YYYY-MM-DD

      // Check if there's an exception (modified instance) for this date
      if (exceptions.has(instanceDate)) {
        // Use the modified instance instead
        const modifiedInstance = exceptions.get(instanceDate)!;
        instances.push({
          ...modifiedInstance,
          originalEventId: event.id,
          instanceDate,
        });
        continue;
      }

      // Calculate start and end times for this instance
      let instanceStart: CalendarEvent['start'];
      let instanceEnd: CalendarEvent['end'];

      if (isAllDay) {
        // All-day event - use date only
        instanceStart = {
          date: instanceDate,
          timeZone: event.start.timeZone,
        };

        const endDate = new Date(occurrence.getTime() + duration);
        instanceEnd = {
          date: endDate.toISOString().split('T')[0],
          timeZone: event.end.timeZone,
        };
      } else {
        // Timed event - use dateTime
        const instanceStartTime = occurrence.toISOString();
        const instanceEndTime = new Date(occurrence.getTime() + duration).toISOString();

        instanceStart = {
          dateTime: instanceStartTime,
          timeZone: event.start.timeZone,
        };

        instanceEnd = {
          dateTime: instanceEndTime,
          timeZone: event.end.timeZone,
        };
      }

      // Create instance with same properties as parent event
      const instance: ExpandedEventInstance = {
        ...event,
        // Generate unique instance ID
        id: `${event.id}_${instanceDate}`,
        originalEventId: event.id,
        instanceDate,
        start: instanceStart,
        end: instanceEnd,
        // Remove recurrence from instance (it's not a recurring event itself)
        recurrence: undefined,
      };

      instances.push(instance);
    }

    return instances;
  } catch (error) {
    console.error('Failed to expand recurring event:', event.id, error);
    return [];
  }
}

/**
 * Check if an event is a recurring event (has recurrence rules)
 */
export function isRecurringEvent(event: CalendarEvent): boolean {
  return !!event.recurrence && event.recurrence.length > 0;
}

/**
 * Expand multiple recurring events
 *
 * @param events - Array of events (may include both recurring and non-recurring)
 * @param dateRange - Date range to generate instances within
 * @returns Array with non-recurring events + expanded instances from recurring events
 */
export function expandRecurringEvents(
  events: CalendarEvent[],
  dateRange: DateRange
): CalendarEvent[] {
  const expandedEvents: CalendarEvent[] = [];
  const recurringEventMap = new Map<string, CalendarEvent>();
  const exceptionMap = new Map<string, Map<string, CalendarEvent>>();

  // First pass: separate recurring events, non-recurring events, and exceptions
  for (const event of events) {
    if (event.recurrence && event.recurrence.length > 0) {
      // This is a recurring event (master)
      recurringEventMap.set(event.id, event);
    } else {
      // This could be either a regular event or a modified instance of a recurring event
      // Modified instances have the same ID as the original event they're modifying
      // (Google doesn't provide a separate field to identify modified instances in our schema)
      // For now, treat all non-recurring events as regular events
      expandedEvents.push(event);
    }
  }

  // Second pass: expand recurring events
  Array.from(recurringEventMap.entries()).forEach(([eventId, recurringEvent]) => {
    const exceptions = exceptionMap.get(eventId) || new Map();
    const instances = expandRecurringEvent(recurringEvent, dateRange, exceptions);
    expandedEvents.push(...instances);
  });

  return expandedEvents;
}
