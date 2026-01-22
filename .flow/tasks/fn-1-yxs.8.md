# fn-1-yxs.8 Create Google Calendar API client wrapper

## Description
Create wrapper client for Google Calendar API v3. Handle authentication, token refresh, and common API operations (list calendars, list events, create/update/delete events).

**Size:** M
**Files:** src/lib/api/calendar.ts, src/lib/api/types.ts, src/lib/auth/oauth.ts (update for refresh)

## Approach

Create CalendarClient class with methods:
- `listCalendars(accountId)` - fetch calendar list for account
- `listEvents(calendarId, timeMin, timeMax)` - fetch events in date range
- `createEvent(calendarId, event)` - create new event
- `updateEvent(calendarId, eventId, event)` - update event
- `deleteEvent(calendarId, eventId)` - delete event

All methods:
- Fetch encrypted token from IndexedDB by accountId
- Decrypt token
- Make API request with Authorization header
- Handle 401 (token expired) → refresh token → retry
- Return typed responses

Token refresh logic:
- POST to https://oauth2.googleapis.com/token with refresh_token
- Update access_token in IndexedDB (encrypted)
- Retry original request

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:28-30`:
- Auto-sync every 15-30 minutes
- 3-month sync window
- Exponential backoff retry (handled in separate task)

Google Calendar API v3 reference: https://developers.google.com/calendar/api/v3/reference
## Acceptance
- [ ] src/lib/api/calendar.ts exports CalendarClient class
- [ ] CalendarClient.listCalendars() calls GET /users/me/calendarList
- [ ] CalendarClient.listEvents() calls GET /calendars/{id}/events with timeMin/timeMax
- [ ] CalendarClient.createEvent() calls POST /calendars/{id}/events
- [ ] CalendarClient.updateEvent() calls PUT /calendars/{id}/events/{eventId}
- [ ] CalendarClient.deleteEvent() calls DELETE /calendars/{id}/events/{eventId}
- [ ] All methods include Authorization: Bearer {access_token} header
- [ ] 401 responses trigger token refresh via POST to token endpoint
- [ ] Refreshed access_token encrypted and stored in IndexedDB
- [ ] Original request retried after token refresh
- [ ] TypeScript types defined for API responses (Calendar, Event, etc.)
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
