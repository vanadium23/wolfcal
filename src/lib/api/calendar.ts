/**
 * Google Calendar API v3 client wrapper
 *
 * Handles authentication, token refresh, and common API operations.
 * All methods fetch encrypted tokens from IndexedDB, decrypt them, and
 * automatically handle token refresh on 401 errors.
 */

import { getAccount, updateAccount } from '../db';
import { decryptToken, encryptToken } from '../auth/encryption';
import { retryWithBackoff } from './retry';
import type {
  GoogleCalendarListResponse,
  GoogleEventsListResponse,
  GoogleEvent,
  TokenRefreshResponse,
  GoogleApiError,
} from './types';

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/**
 * Error thrown when token refresh fails
 */
export class TokenRefreshError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenRefreshError';
  }
}

/**
 * Error thrown when API request fails
 */
export class CalendarApiError extends Error {
  code: number;
  status?: string;

  constructor(message: string, code: number, status?: string) {
    super(message);
    this.name = 'CalendarApiError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Google Calendar API client
 */
export class CalendarClient {
  /**
   * Fetches and decrypts access token for an account
   */
  private async getAccessToken(accountId: string): Promise<string> {
    const account = await getAccount(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    // Check if token is expired
    const now = Date.now();
    if (account.tokenExpiry <= now) {
      // Token expired, refresh it
      await this.refreshToken(accountId);
      // Re-fetch account with new token
      const refreshedAccount = await getAccount(accountId);
      if (!refreshedAccount) {
        throw new Error(`Account not found after refresh: ${accountId}`);
      }
      return decryptToken(refreshedAccount.encryptedAccessToken);
    }

    return decryptToken(account.encryptedAccessToken);
  }

  /**
   * Retrieves OAuth client credentials from localStorage
   */
  private getClientCredentials(): { clientId: string; clientSecret: string } {
    const clientId = localStorage.getItem('wolfcal:oauth:clientId');
    const clientSecret = localStorage.getItem('wolfcal:oauth:clientSecret');

    if (!clientId || !clientSecret) {
      throw new TokenRefreshError(
        'OAuth client credentials not found. Please configure them in Settings.'
      );
    }

    return { clientId, clientSecret };
  }

  /**
   * Refreshes access token using refresh token
   */
  private async refreshToken(accountId: string): Promise<void> {
    const account = await getAccount(accountId);
    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    // Decrypt refresh token
    const refreshToken = await decryptToken(account.encryptedRefreshToken);

    // Get client credentials from localStorage
    const { clientId, clientSecret } = this.getClientCredentials();

    const tokenParams = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    });

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!response.ok) {
      const error: GoogleApiError = await response.json();
      throw new TokenRefreshError(
        error.error.message || 'Failed to refresh token'
      );
    }

    const tokenData: TokenRefreshResponse = await response.json();

    // Encrypt and update access token
    const encryptedAccessToken = await encryptToken(tokenData.access_token);
    const tokenExpiry = Date.now() + tokenData.expires_in * 1000;

    await updateAccount({
      ...account,
      encryptedAccessToken,
      tokenExpiry,
      updatedAt: Date.now(),
    });
  }

  /**
   * Makes an authenticated API request with automatic token refresh on 401
   * Note: This method does NOT include retry logic - retries are handled at the caller level
   */
  private async makeAuthenticatedRequest<T>(
    accountId: string,
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Get access token
    let accessToken = await this.getAccessToken(accountId);

    // Make request
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Handle 401 (token expired) - refresh and retry
    if (response.status === 401) {
      await this.refreshToken(accountId);
      accessToken = await this.getAccessToken(accountId);

      // Retry request with new token
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!retryResponse.ok) {
        const error: GoogleApiError = await retryResponse.json();
        throw new CalendarApiError(
          error.error.message,
          error.error.code,
          error.error.status
        );
      }

      return retryResponse.json();
    }

    // Handle other errors
    if (!response.ok) {
      const error: GoogleApiError = await response.json();
      throw new CalendarApiError(
        error.error.message,
        error.error.code,
        error.error.status
      );
    }

    return response.json();
  }

  /**
   * Lists all calendars for an account
   * @param accountId - Account ID
   * @returns Array of calendars
   */
  async listCalendars(accountId: string): Promise<GoogleCalendarListResponse> {
    return retryWithBackoff(async () => {
      const url = `${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList`;
      return this.makeAuthenticatedRequest<GoogleCalendarListResponse>(accountId, url);
    });
  }

  /**
   * Lists events for a calendar within a date range
   * @param accountId - Account ID
   * @param calendarId - Calendar ID
   * @param timeMin - Start of time range (RFC3339 timestamp)
   * @param timeMax - End of time range (RFC3339 timestamp)
   * @param syncToken - Optional sync token for incremental sync
   * @param pageToken - Optional page token for pagination
   * @returns Events list response
   */
  async listEvents(
    accountId: string,
    calendarId: string,
    timeMin: string,
    timeMax: string,
    syncToken?: string,
    pageToken?: string
  ): Promise<GoogleEventsListResponse> {
    return retryWithBackoff(async () => {
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true', // Expand recurring events into instances
        orderBy: 'startTime',
      });

      if (syncToken) {
        params.set('syncToken', syncToken);
      }
      if (pageToken) {
        params.set('pageToken', pageToken);
      }

      const url = `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(
        calendarId
      )}/events?${params.toString()}`;

      return this.makeAuthenticatedRequest<GoogleEventsListResponse>(accountId, url);
    });
  }

  /**
   * Creates a new event
   * @param accountId - Account ID
   * @param calendarId - Calendar ID
   * @param event - Event data
   * @returns Created event
   */
  async createEvent(
    accountId: string,
    calendarId: string,
    event: Partial<GoogleEvent>
  ): Promise<GoogleEvent> {
    return retryWithBackoff(async () => {
      const url = `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`;

      return this.makeAuthenticatedRequest<GoogleEvent>(accountId, url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    });
  }

  /**
   * Updates an existing event
   * @param accountId - Account ID
   * @param calendarId - Calendar ID
   * @param eventId - Event ID
   * @param event - Updated event data
   * @returns Updated event
   */
  async updateEvent(
    accountId: string,
    calendarId: string,
    eventId: string,
    event: Partial<GoogleEvent>
  ): Promise<GoogleEvent> {
    return retryWithBackoff(async () => {
      const url = `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(
        calendarId
      )}/events/${encodeURIComponent(eventId)}`;

      return this.makeAuthenticatedRequest<GoogleEvent>(accountId, url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    });
  }

  /**
   * Deletes an event
   * @param accountId - Account ID
   * @param calendarId - Calendar ID
   * @param eventId - Event ID
   */
  async deleteEvent(
    accountId: string,
    calendarId: string,
    eventId: string
  ): Promise<void> {
    return retryWithBackoff(async () => {
      const url = `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(
        calendarId
      )}/events/${encodeURIComponent(eventId)}`;

      await this.makeAuthenticatedRequest<void>(accountId, url, {
        method: 'DELETE',
      });
    });
  }
}
