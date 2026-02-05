import { http, HttpResponse } from 'msw'

const googleCalendarBase = 'https://www.googleapis.com/calendar/v3'

export const handlers = [
  // Mock OAuth token endpoint (authorization code grant)
  http.post('https://oauth2.googleapis.com/token', async ({ request }) => {
    const body = await request.text()
    const params = new URLSearchParams(body)
    const grantType = params.get('grant_type')

    if (grantType === 'authorization_code' && params.get('code')) {
      return HttpResponse.json({
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        expires_in: 3600,
        token_type: 'Bearer',
      })
    }

    // Mock OAuth token refresh
    if (grantType === 'refresh_token' && params.get('refresh_token')) {
      return HttpResponse.json({
        access_token: 'mock_refreshed_access_token',
        expires_in: 3600,
        token_type: 'Bearer',
      })
    }

    return new HttpResponse(null, { status: 400 })
  }),

  // Mock calendar list endpoint
  http.get(`${googleCalendarBase}/users/me/calendarList`, () => {
    return HttpResponse.json({
      items: [
        {
          id: 'primary',
          summary: 'mock@example.com',
          accessRole: 'owner',
          backgroundColor: '#795548',
          foregroundColor: '#ffffff',
        },
        {
          id: 'test-calendar-1',
          summary: 'Test Calendar',
          accessRole: 'owner',
          backgroundColor: '#03a9f4',
          foregroundColor: '#ffffff',
        },
      ],
    })
  }),

  // Mock events list endpoint
  http.get(`${googleCalendarBase}/calendars/:calendarId/events`, async ({ request }) => {
    const url = new URL(request.url)
    const timeMin = url.searchParams.get('timeMin')
    const timeMax = url.searchParams.get('timeMax')
    const syncToken = url.searchParams.get('syncToken')
    const pageToken = url.searchParams.get('pageToken')
    const calendarId = url.pathname.split('/').filter(Boolean).slice(-2)[0] // e.g., "primary/events" -> "primary"

    // Return different responses based on sync token (incremental vs full sync)
    if (syncToken) {
      return HttpResponse.json({
        items: [
          {
            id: `event-${calendarId}-incremental`,
            summary: 'Incremental Sync Event',
            start: { dateTime: timeMin || '2026-02-01T10:00:00Z' },
            end: { dateTime: timeMax || '2026-02-01T11:00:00Z' },
            status: 'confirmed',
            updated: new Date().toISOString(),
          },
        ],
        nextSyncToken: 'new-sync-token',
      })
    }

    // Pagination support
    if (pageToken === 'page-token-2') {
      return HttpResponse.json({
        items: [
          {
            id: `event-${calendarId}-page2`,
            summary: 'Page 2 Event',
            start: { dateTime: '2026-02-01T12:00:00Z' },
            end: { dateTime: '2026-02-01T13:00:00Z' },
            status: 'confirmed',
          },
        ],
        nextSyncToken: 'final-sync-token',
      })
    }

    // First page or full sync
    return HttpResponse.json({
      items: [
        {
          id: `event-${calendarId}-1`,
          summary: 'Test Event',
          start: { dateTime: timeMin || '2026-02-01T10:00:00Z' },
          end: { dateTime: timeMax || '2026-02-01T11:00:00Z' },
          status: 'confirmed',
          created: '2026-02-01T00:00:00Z',
          updated: '2026-02-01T00:00:00Z',
        },
      ],
      nextPageToken: 'page-token-2',
      nextSyncToken: 'initial-sync-token',
    })
  }),

  // Mock event creation
  http.post(`${googleCalendarBase}/calendars/:calendarId/events`, async ({ request, params: _params }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: `created-${Date.now()}`,
      ...body,
      status: 'confirmed',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })
  }),

  // Mock event update (PUT)
  http.put(`${googleCalendarBase}/calendars/:calendarId/events/:eventId`, async ({ request, params }) => {
    const { eventId } = params
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      id: eventId,
      ...body,
      status: 'confirmed',
      updated: new Date().toISOString(),
    })
  }),

  // Mock single event fetch (GET) - used by respondToInvitation
  http.get(`${googleCalendarBase}/calendars/:calendarId/events/:eventId`, ({ params }) => {
    const { eventId } = params
    // Return event with attendees including current user (self: true)
    return HttpResponse.json({
      id: eventId,
      summary: 'Meeting Invitation',
      start: { dateTime: '2026-02-01T10:00:00Z' },
      end: { dateTime: '2026-02-01T11:00:00Z' },
      status: 'confirmed',
      attendees: [
        {
          email: 'user@example.com',
          self: true,
          responseStatus: 'needsAction',
          organizer: false,
        },
        {
          email: 'organizer@example.com',
          self: false,
          responseStatus: 'accepted',
          organizer: true,
        },
      ],
      created: '2026-02-01T00:00:00Z',
      updated: new Date().toISOString(),
    })
  }),

  // Mock event update (PATCH) - used for respondToInvitation and general updates
  http.patch(`${googleCalendarBase}/calendars/:calendarId/events/:eventId`, async ({ request, params }) => {
    const { eventId } = params
    const body = await request.json() as Record<string, unknown>

    // If attendees are being updated (invitation response)
    if ('attendees' in body && body.attendees) {
      return HttpResponse.json({
        id: eventId,
        summary: 'Meeting Invitation',
        start: { dateTime: '2026-02-01T10:00:00Z' },
        end: { dateTime: '2026-02-01T11:00:00Z' },
        status: 'confirmed',
        attendees: body.attendees as Array<{
          email: string
          self?: boolean
          responseStatus: string
          organizer?: boolean
        }>,
        updated: new Date().toISOString(),
      })
    }

    // General event update
    return HttpResponse.json({
      id: eventId,
      ...body,
      updated: new Date().toISOString(),
    })
  }),

  // Mock event deletion
  http.delete(`${googleCalendarBase}/calendars/:calendarId/events/:eventId`, ({ params: _params }) => {
    // Return 204 No Content on successful deletion
    return new HttpResponse(null, { status: 204 })
  }),

  // Mock user info endpoint
  http.get('https://www.googleapis.com/oauth2/v2/userinfo', () => {
    return HttpResponse.json({
      email: 'mock@example.com',
    })
  }),
]
