# WolfCal - Local-First Google Calendar Wrapper

## Overview

WolfCal is a self-hosted, privacy-focused calendar application that syncs with multiple Google Calendar accounts while maintaining offline-first functionality. Built as a single-page React application with IndexedDB storage, it provides data ownership and extended offline capability (days to weeks) while preserving full Google Calendar integration.

**Architecture**: Frontend-only web app (React + Vite) served via Docker Compose + Caddy. No backend database - all data stored in browser IndexedDB with encrypted OAuth tokens.

## Scope

### In Scope (MVP)
- Multi-account Google OAuth with user-provided credentials
- Basic event CRUD (create, read, update, delete) with offline queueing
- Month, week, and day calendar views (FullCalendar library)
- Drag-and-drop rescheduling (offline-capable)
- Accept/decline invitations with inline actions
- Auto-sync every 15-30 minutes + manual refresh
- 3-month sync window (1.5 months past/future)
- Manual conflict resolution via side-by-side comparison UI
- Account/calendar toggle filters with color coding
- Settings page for account management
- Docker Compose deployment with Caddy static server

### Out of Scope (MVP)
- Event reminders/notifications
- Search functionality
- Import/export (iCal, CSV)
- Calendar sharing features
- Keyboard shortcuts
- Theme customization beyond event/calendar colors

## Approach

### Phase 1: Foundation & Infrastructure (Tasks 1-4)
Bootstrap the project with React + Vite + TypeScript, configure FullCalendar, set up IndexedDB abstraction, and create Docker deployment configuration.

### Phase 2: OAuth & Authentication (Tasks 5-7)
Implement OAuth popup flow with token encryption using Web Crypto API. Store encrypted tokens in IndexedDB with credential management UI.

### Phase 3: Google Calendar Sync (Tasks 8-11)
Build sync engine with queue management, exponential backoff retry, 3-month window filtering, and recurring event handling (store rule, generate instances on-demand).

### Phase 4: Calendar UI & Event Management (Tasks 12-16)
Create calendar views (month/week/day), event CRUD forms, drag-and-drop handlers, multi-account display with filters, and invitation acceptance UI.

### Phase 5: Offline & Conflict Resolution (Tasks 17-19)
Implement offline change queueing, sync status indicators, and manual conflict resolution with side-by-side comparison UI.

### Phase 6: Polish & Documentation (Tasks 20-22)
Error handling, soft delete with tombstones, settings page, and comprehensive documentation (README, SETUP, OAUTH_CONFIG, USER_GUIDE).

## Dependencies & Risks

### External Dependencies
- **Google Calendar API v3**: Requires user to create Google Cloud project and OAuth credentials
- **FullCalendar library**: UI component for calendar rendering
- **IndexedDB**: Browser storage API (quota limits vary by browser)
- **Web Crypto API**: Token encryption (browser support needed)

### Key Risks
1. **IndexedDB quota limits** (50-100MB typical): Mitigate with event pruning outside sync window
2. **Google API rate limiting**: Mitigate with exponential backoff and 15-30 min sync intervals
3. **Complex conflict scenarios**: Manual resolution required - no automatic merge logic
4. **OAuth credential setup friction**: Mitigate with detailed documentation and screenshots
5. **Browser compatibility**: Target modern Chrome/Firefox only (no Safari/Edge guarantees)

### Epic Dependencies
No dependencies on other epics (greenfield project).

## Quick commands

```bash
# Build and run with Docker Compose
docker-compose up -d

# Access application
open http://localhost:8080

# Run tests
npm run test

# Development mode
npm run dev
```

## Acceptance

- [ ] User can connect multiple Google accounts via OAuth popup flow
- [ ] OAuth tokens encrypted with Web Crypto API before IndexedDB storage
- [ ] Calendar displays month, week, and day views using FullCalendar
- [ ] Events from all connected accounts visible with color coding per account
- [ ] User can toggle individual calendars and accounts on/off
- [ ] User can create new events (works offline, queued for sync)
- [ ] User can edit existing events (works offline, queued for sync)
- [ ] User can delete events (soft delete with tombstones for sync)
- [ ] User can drag-and-drop events to reschedule (works offline)
- [ ] User can accept/decline event invitations with inline buttons
- [ ] App auto-syncs with Google Calendar every 15-30 minutes when online
- [ ] Manual refresh button triggers immediate sync with exponential backoff on failure
- [ ] Sync only fetches events within 3-month window (1.5 months past/future from today)
- [ ] App works offline for extended periods (days to weeks)
- [ ] Pending offline changes have clear visual indicators in UI
- [ ] Sync conflicts show side-by-side comparison for manual resolution
- [ ] When Google access revoked, local data for that account is cleared
- [ ] Settings page allows managing connected accounts and sync preferences
- [ ] Event attachments shown as clickable links to Google Drive
- [ ] All-day events displayed in separate section at top of views
- [ ] Recurring events stored as recurrence rule, instances generated on-demand
- [ ] Error log/history available for troubleshooting sync failures
- [ ] Docker Compose setup with Caddy serves application on http://localhost:8080
- [ ] OAuth callback redirects to http://localhost:8080/callback
- [ ] Application is single-user per deployment (no multi-user auth)
- [ ] Works in latest Chrome and Firefox browsers
- [ ] Unit tests cover core sync logic and conflict resolution
- [ ] Documentation includes: README, SETUP.md, OAUTH_CONFIG.md, USER_GUIDE.md
- [ ] MIT licensed and published on GitHub

## References

- Epic spec: `.flow/specs/fn-1-yxs.md`
- Google Calendar API v3: https://developers.google.com/calendar/api/v3/reference
- FullCalendar React: https://fullcalendar.io/docs/react
- Web Crypto API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
- IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
