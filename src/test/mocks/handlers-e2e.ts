/**
 * Playwright-specific MSW Handlers for E2E Tests
 *
 * These handlers are separate from the Vitest handlers in handlers.ts
 * to ensure E2E tests have their own mock data and don't share state
 * with unit tests.
 *
 * Key differences from handlers.ts:
 * - Uses TEST_EMAILS for consistent email addresses
 * - Uses MOCK_CREDENTIALS for OAuth credentials
 * - Events are time-relative (not fixed dates)
 * - Optimized for smoke test scenarios (no pagination)
 */

import { http, HttpResponse } from 'msw'
import type { OAuthTokenResponse } from '../../lib/auth/types'

// Mock credentials for E2E tests
export const MOCK_CREDENTIALS = {
  clientId: 'test-e2e-client-id',
  clientSecret: 'test-e2e-client-secret',
}

// Test email addresses for E2E tests
export const TEST_EMAILS = {
  primary: 'test-e2e@example.com',
  secondary: 'test-e2e-2@example.com',
}

// Time constants for time-relative events
const hour = 3600000 // 1 hour in milliseconds
const day = 24 * hour // 24 hours in milliseconds

// Mock OAuth token endpoint
export const oauthTokenHandler = http.post('https://oauth2.googleapis.com/token', async ({ request }) => {
  const body = await request.text()
  const params = new URLSearchParams(body)
  const grantType = params.get('grant_type')
  const refreshToken = params.get('refresh_token')

  if (grantType === 'refresh_token' && refreshToken) {
    return HttpResponse.json({
      access_token: `mock_access_token_${refreshToken}`,
      refresh_token: 'mock_refresh_token',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'https://www.googleapis.com/auth/calendar',
    } satisfies OAuthTokenResponse)
  }

  if (grantType === 'authorization_code' && params.get('code')) {
    return HttpResponse.json({
      access_token: 'mock_e2e_access_token',
      refresh_token: 'mock_e2e_refresh_token',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'https://www.googleapis.com/auth/calendar',
    } satisfies OAuthTokenResponse)
  }

  return HttpResponse.json({ error: 'invalid_request' }, { status: 400 })
})

// Mock user info endpoint - returns specific test email
export const userInfoHandler = http.get('https://www.googleapis.com/oauth2/v2/userinfo', () => {
  return HttpResponse.json({
    email: TEST_EMAILS.primary,
    verified_email: true,
    name: 'E2E Test User',
    given_name: 'E2E',
    family_name: 'User',
    picture: 'https://example.com/avatar.png',
  })
})

// Mock calendar list endpoint
export const calendarListHandler = http.get('https://www.googleapis.com/calendar/v3/users/me/calendarList', () => {
  return HttpResponse.json({
    kind: 'calendar#calendarList',
    items: [
      {
        id: 'primary',
        summary: TEST_EMAILS.primary,
        primary: true,
        backgroundColor: '#039BE5',
        foregroundColor: '#ffffff',
        selected: true,
        accessRole: 'owner',
      },
    ],
  })
})

// Helper to create time-relative events (relative to test execution)
function createRelativeEvents(baseTime: number) {
  return [
    // Event starting in 1 hour
    {
      id: `rel-event-${baseTime}-1`,
      summary: 'Event in 1 hour',
      start: { dateTime: new Date(baseTime + hour).toISOString() },
      end: { dateTime: new Date(baseTime + 2 * hour).toISOString() },
      status: 'confirmed',
      created: new Date(baseTime).toISOString(),
      updated: new Date(baseTime).toISOString(),
    },
    // Event starting yesterday
    {
      id: `rel-event-${baseTime}-2`,
      summary: 'Event yesterday',
      start: { dateTime: new Date(baseTime - day).toISOString() },
      end: { dateTime: new Date(baseTime - day + hour).toISOString() },
      status: 'confirmed',
      created: new Date(baseTime - day - hour).toISOString(),
      updated: new Date(baseTime - day - hour).toISOString(),
    },
    // Event starting tomorrow
    {
      id: `rel-event-${baseTime}-3`,
      summary: 'Event tomorrow',
      start: { dateTime: new Date(baseTime + day).toISOString() },
      end: { dateTime: new Date(baseTime + day + hour).toISOString() },
      status: 'confirmed',
      created: new Date(baseTime).toISOString(),
      updated: new Date(baseTime).toISOString(),
    },
  ]
}

// Mock events list endpoint - returns time-relative events
export const eventsHandler = http.get(
  'https://www.googleapis.com/calendar/v3/calendars/:calendarId/events',
  ({ params, request }) => {
    const baseTime = Date.now()
    const url = new URL(request.url)
    const syncToken = url.searchParams.get('syncToken')

    const events = createRelativeEvents(baseTime)

    // For incremental sync, return just one new event
    if (syncToken) {
      return HttpResponse.json({
        kind: 'calendar#events',
        etag: `"etag-${baseTime}"`,
        summary: params.calendarId === 'primary' ? TEST_EMAILS.primary : params.calendarId,
        updated: new Date(baseTime).toISOString(),
        timeZone: 'UTC',
        items: [
          {
            id: `incremental-event-${baseTime}`,
            summary: 'Incremental Sync Event',
            start: { dateTime: new Date(baseTime + 2 * hour).toISOString() },
            end: { dateTime: new Date(baseTime + 3 * hour).toISOString() },
            status: 'confirmed',
            created: new Date(baseTime).toISOString(),
            updated: new Date(baseTime).toISOString(),
          },
        ],
        nextSyncToken: `new-sync-token-${baseTime}`,
      })
    }

    // Initial sync - return all events
    return HttpResponse.json({
      kind: 'calendar#events',
      etag: `"etag-${baseTime}"`,
      summary: params.calendarId === 'primary' ? TEST_EMAILS.primary : params.calendarId,
      updated: new Date(baseTime).toISOString(),
      timeZone: 'UTC',
      items: events,
      nextSyncToken: `initial-sync-token-${baseTime}`,
      // No pagination for smoke tests
      nextPageToken: undefined,
    })
  }
)

// Export all handlers
export const handlers = [
  oauthTokenHandler,
  userInfoHandler,
  calendarListHandler,
  eventsHandler,
]
