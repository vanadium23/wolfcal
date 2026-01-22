import { useState, useEffect } from 'react';
import type { CalendarEvent, Calendar } from '../lib/db/types';
import {
  validateEventForm,
  hasValidationErrors,
  formatDateForInput,
  formatDateTimeForInput,
  type EventFormData,
  type ValidationErrors,
} from '../lib/events/validation';
import './EventForm.css';

interface EventFormProps {
  event?: CalendarEvent; // If provided, form is in edit mode
  calendars: Calendar[]; // Available calendars for selection
  defaultCalendarId?: string; // Default calendar to select
  onSubmit: (data: EventFormData) => void | Promise<void>;
  onCancel: () => void;
}

export default function EventForm({
  event,
  calendars,
  defaultCalendarId,
  onSubmit,
  onCancel,
}: EventFormProps) {
  // Initialize form state
  const [formData, setFormData] = useState<EventFormData>(() => {
    if (event) {
      // Edit mode: populate from existing event
      return {
        summary: event.summary,
        start: event.start,
        end: event.end,
        allDay: !!event.start.date, // If has 'date' field, it's all-day
        description: event.description || '',
        location: event.location || '',
        attendees: event.attendees || [],
        calendarId: event.calendarId,
      };
    } else {
      // Create mode: use defaults
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

      return {
        summary: '',
        start: {
          dateTime: formatDateTimeForInput(now),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: formatDateTimeForInput(oneHourLater),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        allDay: false,
        description: '',
        location: '',
        attendees: [],
        calendarId: defaultCalendarId || calendars[0]?.id || '',
      };
    }
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [newAttendeeEmail, setNewAttendeeEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update start/end format when allDay toggle changes
  useEffect(() => {
    if (formData.allDay) {
      // Convert to all-day format
      const startDate = formData.start.dateTime
        ? formatDateForInput(new Date(formData.start.dateTime))
        : formatDateForInput(new Date());
      const endDate = formData.end.dateTime
        ? formatDateForInput(new Date(formData.end.dateTime))
        : formatDateForInput(new Date());

      setFormData((prev) => ({
        ...prev,
        start: {
          date: startDate,
          timeZone: prev.start.timeZone,
        },
        end: {
          date: endDate,
          timeZone: prev.end.timeZone,
        },
      }));
    } else {
      // Convert to date-time format
      const startDateTime = formData.start.date
        ? formatDateTimeForInput(new Date(formData.start.date + 'T09:00:00'))
        : formatDateTimeForInput(new Date());
      const endDateTime = formData.end.date
        ? formatDateTimeForInput(new Date(formData.end.date + 'T10:00:00'))
        : formatDateTimeForInput(new Date(Date.now() + 60 * 60 * 1000));

      setFormData((prev) => ({
        ...prev,
        start: {
          dateTime: startDateTime,
          timeZone: prev.start.timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: prev.end.timeZone,
        },
      }));
    }
  }, [formData.allDay]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationErrors = validateEventForm(formData);
    if (hasValidationErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Parent will handle closing the form
    } catch (error) {
      console.error('Failed to submit event:', error);
      setErrors({ general: 'Failed to save event. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAttendee = () => {
    if (!newAttendeeEmail.trim()) return;

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newAttendeeEmail)) {
      setErrors({ ...errors, attendees: 'Invalid email address' });
      return;
    }

    // Check for duplicates
    if (formData.attendees?.some((a) => a.email === newAttendeeEmail)) {
      setErrors({ ...errors, attendees: 'Attendee already added' });
      return;
    }

    setFormData({
      ...formData,
      attendees: [
        ...(formData.attendees || []),
        { email: newAttendeeEmail },
      ],
    });
    setNewAttendeeEmail('');
    setErrors({ ...errors, attendees: undefined });
  };

  const handleRemoveAttendee = (email: string) => {
    setFormData({
      ...formData,
      attendees: formData.attendees?.filter((a) => a.email !== email) || [],
    });
  };

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      {/* Title */}
      <div className="form-group">
        <label htmlFor="event-title">
          Title <span className="required">*</span>
        </label>
        <input
          id="event-title"
          type="text"
          value={formData.summary}
          onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
          className={`form-input ${errors.summary ? 'error' : ''}`}
          placeholder="Event title"
        />
        {errors.summary && <span className="error-message">{errors.summary}</span>}
      </div>

      {/* All-day toggle */}
      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.allDay}
            onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
          />
          All-day event
        </label>
      </div>

      {/* Start date/time */}
      <div className="form-group">
        <label htmlFor="event-start">
          Start {formData.allDay ? 'Date' : 'Date & Time'} <span className="required">*</span>
        </label>
        {formData.allDay ? (
          <input
            id="event-start"
            type="date"
            value={formData.start.date || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                start: { ...formData.start, date: e.target.value },
              })
            }
            className={`form-input ${errors.start ? 'error' : ''}`}
          />
        ) : (
          <input
            id="event-start"
            type="datetime-local"
            value={formData.start.dateTime || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                start: { ...formData.start, dateTime: e.target.value },
              })
            }
            className={`form-input ${errors.start ? 'error' : ''}`}
          />
        )}
        {errors.start && <span className="error-message">{errors.start}</span>}
      </div>

      {/* End date/time */}
      <div className="form-group">
        <label htmlFor="event-end">
          End {formData.allDay ? 'Date' : 'Date & Time'} <span className="required">*</span>
        </label>
        {formData.allDay ? (
          <input
            id="event-end"
            type="date"
            value={formData.end.date || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                end: { ...formData.end, date: e.target.value },
              })
            }
            className={`form-input ${errors.end ? 'error' : ''}`}
          />
        ) : (
          <input
            id="event-end"
            type="datetime-local"
            value={formData.end.dateTime || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                end: { ...formData.end, dateTime: e.target.value },
              })
            }
            className={`form-input ${errors.end ? 'error' : ''}`}
          />
        )}
        {errors.end && <span className="error-message">{errors.end}</span>}
      </div>

      {/* Calendar selector */}
      <div className="form-group">
        <label htmlFor="event-calendar">
          Calendar <span className="required">*</span>
        </label>
        <select
          id="event-calendar"
          value={formData.calendarId}
          onChange={(e) => setFormData({ ...formData, calendarId: e.target.value })}
          className="form-input"
        >
          {calendars.map((calendar) => (
            <option key={calendar.id} value={calendar.id}>
              {calendar.summary}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="form-group">
        <label htmlFor="event-description">Description</label>
        <textarea
          id="event-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="form-input"
          placeholder="Add description"
          rows={4}
        />
      </div>

      {/* Location */}
      <div className="form-group">
        <label htmlFor="event-location">Location</label>
        <input
          id="event-location"
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="form-input"
          placeholder="Add location"
        />
      </div>

      {/* Attendees */}
      <div className="form-group">
        <label htmlFor="event-attendees">Attendees</label>
        <div className="attendee-input-group">
          <input
            id="event-attendees"
            type="email"
            value={newAttendeeEmail}
            onChange={(e) => setNewAttendeeEmail(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddAttendee();
              }
            }}
            className="form-input"
            placeholder="email@example.com"
          />
          <button
            type="button"
            onClick={handleAddAttendee}
            className="btn btn-secondary"
          >
            Add
          </button>
        </div>
        {errors.attendees && <span className="error-message">{errors.attendees}</span>}

        {formData.attendees && formData.attendees.length > 0 && (
          <ul className="attendee-list">
            {formData.attendees.map((attendee) => (
              <li key={attendee.email} className="attendee-item">
                <span>{attendee.email}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttendee(attendee.email)}
                  className="btn-remove"
                  aria-label={`Remove ${attendee.email}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* General error */}
      {errors.general && (
        <div className="error-message error-general">{errors.general}</div>
      )}

      {/* Actions */}
      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
