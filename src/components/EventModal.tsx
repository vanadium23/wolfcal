import { useState, useEffect } from 'react';
import EventForm from './EventForm';
import { CalendarClient } from '../lib/api';
import {
  addEvent,
  updateEvent,
  addPendingChange,
  getAllCalendars,
  getEvent,
} from '../lib/db';
import type { CalendarEvent, Calendar, PendingChange } from '../lib/db/types';
import type { EventFormData } from '../lib/events/validation';
import type { GoogleEvent } from '../lib/api/types';
import './EventForm.css';

interface EventModalProps {
  isOpen: boolean;
  eventId?: string; // If provided, opens in edit mode
  defaultCalendarId?: string; // For create mode
  onClose: () => void;
  onSaved?: () => void; // Callback after successful save
}

export default function EventModal({
  isOpen,
  eventId,
  defaultCalendarId,
  onClose,
  onSaved,
}: EventModalProps) {
  const [event, setEvent] = useState<CalendarEvent | undefined>(undefined);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load event and calendars when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Load calendars
        const allCalendars = await getAllCalendars();
        const visibleCalendars = allCalendars.filter((c) => c.visible);
        setCalendars(visibleCalendars);

        // Load event if in edit mode
        if (eventId) {
          const existingEvent = await getEvent(eventId);
          if (!existingEvent) {
            setError('Event not found');
            return;
          }
          setEvent(existingEvent);
        } else {
          setEvent(undefined);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load event data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isOpen, eventId]);

  const handleSubmit = async (formData: EventFormData) => {
    try {
      // Check if online
      const isOnline = navigator.onLine;

      if (isOnline) {
        // Online: make API call and update IndexedDB
        await saveEventOnline(formData);
      } else {
        // Offline: queue to pending_changes and update IndexedDB
        await saveEventOffline(formData);
      }

      // Close modal and notify parent
      onClose();
      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      console.error('Failed to save event:', err);
      throw err; // Let form handle error display
    }
  };

  const saveEventOnline = async (formData: EventFormData) => {
    const client = new CalendarClient();
    const calendar = calendars.find((c) => c.id === formData.calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    // Prepare Google Event payload
    const googleEvent: Partial<GoogleEvent> = {
      summary: formData.summary,
      description: formData.description,
      location: formData.location,
      start: formData.allDay
        ? { date: formData.start.date, timeZone: formData.start.timeZone }
        : { dateTime: new Date(formData.start.dateTime!).toISOString(), timeZone: formData.start.timeZone },
      end: formData.allDay
        ? { date: formData.end.date, timeZone: formData.end.timeZone }
        : { dateTime: new Date(formData.end.dateTime!).toISOString(), timeZone: formData.end.timeZone },
      attendees: formData.attendees?.map((a) => ({
        email: a.email,
        displayName: a.displayName,
      })),
    };

    let responseEvent: GoogleEvent;

    if (eventId && event) {
      // Update existing event
      responseEvent = await client.updateEvent(
        calendar.accountId,
        calendar.id,
        eventId,
        googleEvent
      );
    } else {
      // Create new event
      responseEvent = await client.createEvent(
        calendar.accountId,
        calendar.id,
        googleEvent
      );
    }

    // Update IndexedDB with response
    const calendarEvent: CalendarEvent = {
      id: responseEvent.id,
      accountId: calendar.accountId,
      calendarId: calendar.id,
      summary: responseEvent.summary || '',
      description: responseEvent.description,
      start: responseEvent.start,
      end: responseEvent.end,
      location: responseEvent.location,
      attendees: responseEvent.attendees?.map((a) => ({
        email: a.email || '',
        displayName: a.displayName,
        responseStatus: a.responseStatus || 'needsAction',
        organizer: a.organizer,
      })),
      status: responseEvent.status,
      createdAt: event?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    if (eventId && event) {
      await updateEvent(calendarEvent);
    } else {
      await addEvent(calendarEvent);
    }
  };

  const saveEventOffline = async (formData: EventFormData) => {
    const calendar = calendars.find((c) => c.id === formData.calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    // Generate temporary ID for new events
    const tempEventId = eventId || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create event data for IndexedDB
    const calendarEvent: CalendarEvent = {
      id: tempEventId,
      accountId: calendar.accountId,
      calendarId: calendar.id,
      summary: formData.summary,
      description: formData.description,
      start: formData.allDay
        ? { date: formData.start.date, timeZone: formData.start.timeZone }
        : { dateTime: new Date(formData.start.dateTime!).toISOString(), timeZone: formData.start.timeZone },
      end: formData.allDay
        ? { date: formData.end.date, timeZone: formData.end.timeZone }
        : { dateTime: new Date(formData.end.dateTime!).toISOString(), timeZone: formData.end.timeZone },
      location: formData.location,
      attendees: formData.attendees?.map((a) => ({
        email: a.email,
        displayName: a.displayName,
        responseStatus: 'needsAction',
      })),
      status: 'confirmed',
      createdAt: event?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    // Save to IndexedDB
    if (eventId && event) {
      await updateEvent(calendarEvent);
    } else {
      await addEvent(calendarEvent);
    }

    // Queue to pending_changes
    const pendingChange: PendingChange = {
      id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operation: eventId ? 'update' : 'create',
      entityType: 'event',
      accountId: calendar.accountId,
      calendarId: calendar.id,
      eventId: tempEventId,
      eventData: {
        summary: formData.summary,
        description: formData.description,
        start: calendarEvent.start,
        end: calendarEvent.end,
        location: formData.location,
        attendees: calendarEvent.attendees,
      },
      createdAt: Date.now(),
      retryCount: 0,
    };

    await addPendingChange(pendingChange);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{eventId ? 'Edit Event' : 'Create Event'}</h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {isLoading ? (
            <div className="loading-message">Loading...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : calendars.length === 0 ? (
            <div className="error-message">
              No calendars available. Please add a Google account first.
            </div>
          ) : (
            <EventForm
              event={event}
              calendars={calendars}
              defaultCalendarId={defaultCalendarId}
              onSubmit={handleSubmit}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
