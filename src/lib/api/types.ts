/**
 * Google Calendar API v3 types
 */

/**
 * Calendar list entry from Google Calendar API
 * https://developers.google.com/calendar/api/v3/reference/calendarList
 */
export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  timeZone?: string;
  summaryOverride?: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  selected?: boolean;
  accessRole: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  defaultReminders?: Array<{
    method: 'email' | 'popup';
    minutes: number;
  }>;
  primary?: boolean;
}

/**
 * Calendar list response from Google Calendar API
 */
export interface GoogleCalendarListResponse {
  kind: 'calendar#calendarList';
  etag: string;
  nextPageToken?: string;
  nextSyncToken?: string;
  items: GoogleCalendar[];
}

/**
 * Event from Google Calendar API
 * https://developers.google.com/calendar/api/v3/reference/events
 */
export interface GoogleEvent {
  id: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink?: string;
  created?: string;
  updated?: string;
  summary?: string;
  description?: string;
  location?: string;
  colorId?: string;
  creator?: {
    id?: string;
    email?: string;
    displayName?: string;
    self?: boolean;
  };
  organizer?: {
    id?: string;
    email?: string;
    displayName?: string;
    self?: boolean;
  };
  start: {
    date?: string; // YYYY-MM-DD for all-day events
    dateTime?: string; // RFC3339 timestamp
    timeZone?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  endTimeUnspecified?: boolean;
  recurrence?: string[]; // Array of RRULE, EXRULE, RDATE, EXDATE strings
  recurringEventId?: string;
  originalStartTime?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  transparency?: 'opaque' | 'transparent';
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  iCalUID?: string;
  sequence?: number;
  attendees?: Array<{
    id?: string;
    email?: string;
    displayName?: string;
    organizer?: boolean;
    self?: boolean;
    resource?: boolean;
    optional?: boolean;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
    comment?: string;
    additionalGuests?: number;
  }>;
  attendeesOmitted?: boolean;
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
  hangoutLink?: string;
  conferenceData?: {
    createRequest?: {
      requestId: string;
      conferenceSolutionKey: {
        type: string;
      };
      status?: {
        statusCode: string;
      };
    };
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
      pin?: string;
      accessCode?: string;
      meetingCode?: string;
      passcode?: string;
      password?: string;
    }>;
    conferenceSolution?: {
      key: {
        type: string;
      };
      name: string;
      iconUri?: string;
    };
    conferenceId?: string;
    signature?: string;
    notes?: string;
  };
  gadget?: {
    type: string;
    title?: string;
    link?: string;
    iconLink?: string;
    width?: number;
    height?: number;
    display?: string;
    preferences?: Record<string, string>;
  };
  anyoneCanAddSelf?: boolean;
  guestsCanInviteOthers?: boolean;
  guestsCanModify?: boolean;
  guestsCanSeeOtherGuests?: boolean;
  privateCopy?: boolean;
  locked?: boolean;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  source?: {
    url: string;
    title: string;
  };
  attachments?: Array<{
    fileUrl: string;
    title: string;
    mimeType?: string;
    iconLink?: string;
    fileId?: string;
  }>;
  eventType?: 'default' | 'outOfOffice' | 'focusTime';
}

/**
 * Events list response from Google Calendar API
 */
export interface GoogleEventsListResponse {
  kind: 'calendar#events';
  etag: string;
  summary: string;
  description?: string;
  updated: string;
  timeZone: string;
  accessRole: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  defaultReminders?: Array<{
    method: 'email' | 'popup';
    minutes: number;
  }>;
  nextPageToken?: string;
  nextSyncToken?: string;
  items: GoogleEvent[];
}

/**
 * Token refresh request
 */
export interface TokenRefreshRequest {
  refresh_token: string;
  client_id: string;
  client_secret: string;
  grant_type: 'refresh_token';
}

/**
 * Token refresh response
 */
export interface TokenRefreshResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  // Note: refresh_token is NOT returned on refresh, only on initial authorization
}

/**
 * Google API error response
 */
export interface GoogleApiError {
  error: {
    code: number;
    message: string;
    errors?: Array<{
      domain: string;
      reason: string;
      message: string;
      locationType?: string;
      location?: string;
    }>;
    status?: string;
  };
}
