/**
 * Event form validation utilities
 */

export interface EventFormData {
  summary: string;
  start: {
    dateTime?: string; // ISO 8601 string for date-time events
    date?: string; // YYYY-MM-DD for all-day events
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  allDay: boolean;
  description?: string;
  location?: string;
  attendees?: Array<{ email: string; displayName?: string }>;
  calendarId: string;
}

export interface ValidationErrors {
  summary?: string;
  start?: string;
  end?: string;
  attendees?: string;
  general?: string;
}

/**
 * Validates event form data
 * @param data - Event form data
 * @returns Validation errors (empty object if valid)
 */
export function validateEventForm(data: EventFormData): ValidationErrors {
  const errors: ValidationErrors = {};

  // Title is required
  if (!data.summary || !data.summary.trim()) {
    errors.summary = 'Title is required';
  }

  // Start date/time is required
  if (data.allDay) {
    if (!data.start.date) {
      errors.start = 'Start date is required';
    }
  } else {
    if (!data.start.dateTime) {
      errors.start = 'Start date and time is required';
    }
  }

  // End date/time is required
  if (data.allDay) {
    if (!data.end.date) {
      errors.end = 'End date is required';
    }
  } else {
    if (!data.end.dateTime) {
      errors.end = 'End date and time is required';
    }
  }

  // Validate end is after start
  if (data.allDay) {
    if (data.start.date && data.end.date) {
      const startDate = new Date(data.start.date);
      const endDate = new Date(data.end.date);
      if (endDate < startDate) {
        errors.end = 'End date must be on or after start date';
      }
    }
  } else {
    if (data.start.dateTime && data.end.dateTime) {
      const startDateTime = new Date(data.start.dateTime);
      const endDateTime = new Date(data.end.dateTime);
      if (endDateTime <= startDateTime) {
        errors.end = 'End time must be after start time';
      }
    }
  }

  // Validate email format for attendees
  if (data.attendees && data.attendees.length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = data.attendees.filter(
      (attendee) => !emailRegex.test(attendee.email)
    );
    if (invalidEmails.length > 0) {
      errors.attendees = 'One or more attendee email addresses are invalid';
    }
  }

  return errors;
}

/**
 * Checks if there are any validation errors
 */
export function hasValidationErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Formats a date to YYYY-MM-DD
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date-time to YYYY-MM-DDTHH:mm format for datetime-local input
 */
export function formatDateTimeForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Parses a date from YYYY-MM-DD format
 */
export function parseDateFromInput(dateString: string): Date {
  return new Date(dateString + 'T00:00:00');
}

/**
 * Parses a date-time from YYYY-MM-DDTHH:mm format
 */
export function parseDateTimeFromInput(dateTimeString: string): Date {
  return new Date(dateTimeString);
}
