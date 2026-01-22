/**
 * Event handlers for calendar interactions (drag-drop, resize, etc.)
 */

import { CalendarClient } from '../api';
import { updateEvent, addPendingChange, getEvent } from '../db';
import type { CalendarEvent, PendingChange } from '../db/types';
import type { GoogleEvent } from '../api/types';
import type { EventDropArg } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';

/**
 * Handle event drag-and-drop rescheduling
 * Works both online and offline with optimistic UI updates
 */
export async function handleEventDrop(
  dropInfo: EventDropArg,
  onSuccess?: () => void
): Promise<void> {
  const { event, revert } = dropInfo;

  try {
    // Extract event data from FullCalendar event object
    const eventId = event.id;
    const accountId = event.extendedProps.accountId;
    const calendarId = event.extendedProps.calendarId;

    // Get the full event from IndexedDB
    const storedEvent = await getEvent(eventId);
    if (!storedEvent) {
      console.error('Event not found in IndexedDB:', eventId);
      revert();
      return;
    }

    // Build updated start/end times from the dropped position
    const isAllDay = event.allDay;
    const newStart = isAllDay
      ? { date: event.startStr.split('T')[0], timeZone: storedEvent.start.timeZone }
      : { dateTime: event.start!.toISOString(), timeZone: storedEvent.start.timeZone };
    const newEnd = isAllDay
      ? { date: event.endStr ? event.endStr.split('T')[0] : event.startStr.split('T')[0], timeZone: storedEvent.end.timeZone }
      : { dateTime: event.end!.toISOString(), timeZone: storedEvent.end.timeZone };

    // Update the stored event with new times
    const updatedEvent: CalendarEvent = {
      ...storedEvent,
      start: newStart,
      end: newEnd,
      updatedAt: Date.now(),
    };

    // Check if online
    const isOnline = navigator.onLine;

    if (isOnline) {
      // Online: make API call and update IndexedDB
      await updateEventOnline(accountId, calendarId, eventId, updatedEvent);
    } else {
      // Offline: queue to pending_changes and update IndexedDB
      await updateEventOffline(accountId, calendarId, eventId, updatedEvent);
    }

    // Optimistic update succeeded (IndexedDB updated)
    if (onSuccess) {
      onSuccess();
    }
  } catch (error) {
    console.error('Failed to update event after drop:', error);
    // Revert the event to its original position
    revert();
  }
}

/**
 * Handle event resize (duration change)
 * Works both online and offline with optimistic UI updates
 */
export async function handleEventResize(
  resizeInfo: EventResizeDoneArg,
  onSuccess?: () => void
): Promise<void> {
  const { event, revert } = resizeInfo;

  try {
    // Extract event data from FullCalendar event object
    const eventId = event.id;
    const accountId = event.extendedProps.accountId;
    const calendarId = event.extendedProps.calendarId;

    // Get the full event from IndexedDB
    const storedEvent = await getEvent(eventId);
    if (!storedEvent) {
      console.error('Event not found in IndexedDB:', eventId);
      revert();
      return;
    }

    // Build updated start/end times from the resized event
    const isAllDay = event.allDay;
    const newStart = isAllDay
      ? { date: event.startStr.split('T')[0], timeZone: storedEvent.start.timeZone }
      : { dateTime: event.start!.toISOString(), timeZone: storedEvent.start.timeZone };
    const newEnd = isAllDay
      ? { date: event.endStr ? event.endStr.split('T')[0] : event.startStr.split('T')[0], timeZone: storedEvent.end.timeZone }
      : { dateTime: event.end!.toISOString(), timeZone: storedEvent.end.timeZone };

    // Update the stored event with new times
    const updatedEvent: CalendarEvent = {
      ...storedEvent,
      start: newStart,
      end: newEnd,
      updatedAt: Date.now(),
    };

    // Check if online
    const isOnline = navigator.onLine;

    if (isOnline) {
      // Online: make API call and update IndexedDB
      await updateEventOnline(accountId, calendarId, eventId, updatedEvent);
    } else {
      // Offline: queue to pending_changes and update IndexedDB
      await updateEventOffline(accountId, calendarId, eventId, updatedEvent);
    }

    // Optimistic update succeeded (IndexedDB updated)
    if (onSuccess) {
      onSuccess();
    }
  } catch (error) {
    console.error('Failed to update event after resize:', error);
    // Revert the event to its original size
    revert();
  }
}

/**
 * Update event online - make API call and update IndexedDB
 */
async function updateEventOnline(
  accountId: string,
  calendarId: string,
  eventId: string,
  updatedEvent: CalendarEvent
): Promise<void> {
  const client = new CalendarClient();

  // Prepare Google Event payload
  const googleEvent: Partial<GoogleEvent> = {
    summary: updatedEvent.summary,
    description: updatedEvent.description,
    location: updatedEvent.location,
    start: updatedEvent.start,
    end: updatedEvent.end,
    attendees: updatedEvent.attendees?.map((a) => ({
      email: a.email,
      displayName: a.displayName,
    })),
  };

  try {
    // Make API call
    const responseEvent = await client.updateEvent(
      accountId,
      calendarId,
      eventId,
      googleEvent
    );

    // Update IndexedDB with response
    const syncedEvent: CalendarEvent = {
      ...updatedEvent,
      id: responseEvent.id,
      summary: responseEvent.summary || updatedEvent.summary,
      description: responseEvent.description || updatedEvent.description,
      start: responseEvent.start,
      end: responseEvent.end,
      location: responseEvent.location || updatedEvent.location,
      updatedAt: Date.now(),
    };

    await updateEvent(syncedEvent);
  } catch (error) {
    // If API call fails, we already updated IndexedDB optimistically
    // Queue it as a pending change to retry later
    console.warn('API call failed, queueing for offline sync:', error);
    await updateEventOffline(accountId, calendarId, eventId, updatedEvent);
    throw error; // Re-throw to trigger revert in caller
  }
}

/**
 * Update event offline - queue to pending_changes and update IndexedDB
 */
async function updateEventOffline(
  accountId: string,
  calendarId: string,
  eventId: string,
  updatedEvent: CalendarEvent
): Promise<void> {
  // Save to IndexedDB
  await updateEvent(updatedEvent);

  // Queue to pending_changes
  const pendingChange: PendingChange = {
    id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    operation: 'update',
    entityType: 'event',
    accountId,
    calendarId,
    eventId,
    eventData: {
      summary: updatedEvent.summary,
      description: updatedEvent.description,
      start: updatedEvent.start,
      end: updatedEvent.end,
      location: updatedEvent.location,
      attendees: updatedEvent.attendees,
    },
    createdAt: Date.now(),
    retryCount: 0,
  };

  await addPendingChange(pendingChange);
}
