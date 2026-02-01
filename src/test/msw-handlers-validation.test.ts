import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './mocks/server'

describe('MSW Handlers - Google Calendar API Endpoints', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  describe('OAuth Endpoints', () => {
    it('should handle OAuth authorization code grant', async () => {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: 'test_code',
          client_id: 'test',
          client_secret: 'test',
          redirect_uri: 'http://localhost:5173/callback',
          grant_type: 'authorization_code',
        }),
      })

      const data = await response.json()
      expect(data).toHaveProperty('access_token', 'mock_access_token')
      expect(data).toHaveProperty('refresh_token', 'mock_refresh_token')
    })

    it('should handle OAuth token refresh', async () => {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: 'existing_refresh_token',
          client_id: 'test',
          client_secret: 'test',
          grant_type: 'refresh_token',
        }),
      })

      const data = await response.json()
      expect(data).toHaveProperty('access_token', 'mock_refreshed_access_token')
    })
  })

  describe('Calendar List Endpoint', () => {
    it('should return list of calendars', async () => {
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { Authorization: 'Bearer mock_token' },
      })

      const data = await response.json()
      expect(data).toHaveProperty('items')
      expect(data.items).toBeInstanceOf(Array)
      expect(data.items[0]).toHaveProperty('id', 'primary')
    })
  })

  describe('Events List Endpoint', () => {
    it('should return events for a calendar (full sync)', async () => {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=2026-02-01T00:00:00Z&timeMax=2026-02-01T23:59:59Z',
        { headers: { Authorization: 'Bearer mock_token' } }
      )

      const data = await response.json()
      expect(data).toHaveProperty('items')
      expect(data).toHaveProperty('nextSyncToken', 'initial-sync-token')
      expect(data).toHaveProperty('nextPageToken', 'page-token-2')
    })

    it('should handle incremental sync with syncToken', async () => {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?syncToken=existing-token',
        { headers: { Authorization: 'Bearer mock_token' } }
      )

      const data = await response.json()
      expect(data).toHaveProperty('items')
      expect(data).toHaveProperty('nextSyncToken', 'new-sync-token')
      expect(data.items[0]).toHaveProperty('id', 'event-primary-incremental')
    })

    it('should handle pagination with pageToken', async () => {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?pageToken=page-token-2',
        { headers: { Authorization: 'Bearer mock_token' } }
      )

      const data = await response.json()
      expect(data).toHaveProperty('items')
      expect(data).toHaveProperty('nextSyncToken', 'final-sync-token')
      expect(data.items[0]).toHaveProperty('id', 'event-primary-page2')
    })
  })

  describe('Event CRUD Operations', () => {
    it('should create a new event', async () => {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: 'New Test Event',
          start: { dateTime: '2026-02-01T10:00:00Z' },
          end: { dateTime: '2026-02-01T11:00:00Z' },
        }),
      })

      const data = await response.json()
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('summary', 'New Test Event')
      expect(data).toHaveProperty('status', 'confirmed')
    })

    it('should update an event (PUT)', async () => {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/event-123', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer mock_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: 'Updated Event',
        }),
      })

      const data = await response.json()
      expect(data).toHaveProperty('id', 'event-123')
      expect(data).toHaveProperty('summary', 'Updated Event')
    })

    it('should patch an event (PATCH)', async () => {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/event-123', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer mock_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: 'Patched Event',
        }),
      })

      const data = await response.json()
      expect(data).toHaveProperty('id', 'event-123')
    })

    it('should delete an event', async () => {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/event-123', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer mock_token' },
      })

      expect(response.status).toBe(204)
    })
  })

  describe('Invitation Response', () => {
    it('should handle invitation response (PATCH attendees)', async () => {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/meeting-123', {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer mock_token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendees: [
            { email: 'user@example.com', self: true, responseStatus: 'accepted' },
          ],
        }),
      })

      const data = await response.json()
      expect(data).toHaveProperty('id', 'meeting-123')
      expect(data).toHaveProperty('attendees')
      expect(data.attendees).toBeInstanceOf(Array)
    })
  })

  describe('User Info Endpoint', () => {
    it('should return user email', async () => {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: 'Bearer mock_token' },
      })

      const data = await response.json()
      expect(data).toHaveProperty('email', 'mock@example.com')
    })
  })
})
