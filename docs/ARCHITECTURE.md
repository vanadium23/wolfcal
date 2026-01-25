# WolfCal Architecture

Technical documentation for developers and contributors explaining WolfCal's system design, data flow, and implementation details.

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Application Architecture](#application-architecture)
4. [Data Flow](#data-flow)
5. [IndexedDB Schema](#indexeddb-schema)
6. [OAuth and Security](#oauth-and-security)
7. [Sync Engine](#sync-engine)
8. [Deployment Architecture](#deployment-architecture)

## System Overview

WolfCal is a **frontend-only** web application that provides a local-first interface to Google Calendar. Unlike traditional calendar applications with backend servers, WolfCal runs entirely in the browser and stores all data in IndexedDB.

### Key Design Principles

1. **No backend server** - No database, no API server, no persistent storage outside the browser
2. **Local-first** - All data stored in browser IndexedDB, synced to Google Calendar periodically
3. **Offline-capable** - Full functionality without internet connection for extended periods
4. **Privacy-focused** - Direct browser-to-Google API communication, no intermediary servers
5. **User-owned credentials** - Each user creates their own OAuth app, ensuring data isolation

### Why Frontend-Only?

**Advantages:**
- **Simple deployment** - Just serve static files, no database to manage
- **High privacy** - No third-party servers have access to calendar data
- **Low cost** - Static file hosting is cheap/free
- **Scalability** - No server-side resources to scale

**Tradeoffs:**
- **Browser storage limits** - IndexedDB quota (50-100 MB typical)
- **Single-user only** - No multi-user support per deployment
- **OAuth complexity** - Each user must create Google Cloud credentials

## Technology Stack

### Frontend

- **React 19** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **FullCalendar** - Calendar UI component library
  - `@fullcalendar/react` - React integration
  - `@fullcalendar/daygrid` - Month view
  - `@fullcalendar/timegrid` - Week/Day views
  - `@fullcalendar/interaction` - Drag-and-drop support
- **React Router** - Client-side routing (for Settings page, OAuth callback)
- **idb** - IndexedDB wrapper library (provides Promises API)
- **rrule** - Recurrence rule parsing (RFC 5545)

### Browser APIs

- **IndexedDB** - Client-side database for events and tokens
- **Web Crypto API** - Token encryption (AES-GCM)
- **Fetch API** - Google Calendar API requests
- **Popup API** - OAuth authorization flow

### Deployment

- **Docker** - Containerization
- **Caddy 2** - Static file server with automatic HTTPS
- **Docker Compose** - Single-command deployment

### External APIs

- **Google Calendar API v3** - Calendar data synchronization
- **Google OAuth 2.0** - User authentication and authorization

## Application Architecture

### Directory Structure

```
wolfcal/
├── src/
│   ├── components/        # Reusable React components
│   │   ├── Calendar.tsx   # Main calendar component (FullCalendar wrapper)
│   │   ├── EventDialog.tsx # Create/edit event modal
│   │   └── Sidebar.tsx    # Account/calendar filter sidebar
│   ├── pages/
│   │   ├── CalendarPage.tsx # Main calendar view page
│   │   ├── SettingsPage.tsx # Account management and settings
│   │   └── CallbackPage.tsx # OAuth redirect handler
│   ├── lib/
│   │   ├── db/            # IndexedDB abstraction
│   │   │   ├── schema.ts  # Database schema definitions
│   │   │   ├── events.ts  # Event CRUD operations
│   │   │   ├── accounts.ts # Account management
│   │   │   └── queue.ts   # Offline change queue
│   │   ├── auth/          # OAuth authentication
│   │   │   ├── oauth.ts   # OAuth popup flow
│   │   │   └── encryption.ts # Token encryption (Web Crypto)
│   │   ├── api/           # Google Calendar API wrapper
│   │   │   ├── calendar.ts # Calendar list API
│   │   │   ├── events.ts   # Events API
│   │   │   └── retry.ts    # Exponential backoff retry logic
│   │   ├── sync/          # Sync engine
│   │   │   ├── sync.ts    # Main sync orchestrator
│   │   │   ├── conflict.ts # Conflict detection and resolution
│   │   │   └── queue.ts   # Offline change queue processing
│   │   └── events/        # Event utilities
│   │       ├── recurrence.ts # RRULE parsing and instance generation
│   │       └── validation.ts # Event data validation
│   ├── hooks/             # Custom React hooks
│   │   ├── useAccounts.ts # Account state management
│   │   ├── useEvents.ts   # Event state management
│   │   └── useSync.ts     # Sync status and control
│   ├── App.tsx            # Root component and routing
│   ├── main.tsx           # Application entry point
│   └── index.css          # Global styles
├── docs/                  # Documentation
├── public/                # Static assets
├── Dockerfile             # Multi-stage build
├── docker-compose.yml     # Deployment configuration
├── Caddyfile              # Caddy web server config
└── package.json           # Dependencies
```

### Component Hierarchy

```
App
├── Router
│   ├── CalendarPage
│   │   ├── Sidebar (account/calendar filters)
│   │   ├── Calendar (FullCalendar wrapper)
│   │   └── EventDialog (create/edit modal)
│   ├── SettingsPage
│   │   ├── AccountList
│   │   ├── AddAccountForm
│   │   └── ErrorLog
│   └── CallbackPage (OAuth redirect handler)
```

## Data Flow

### Sync Flow (Online)

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  React UI (Calendar View)                             │  │
│  └──────────────────┬────────────────────────────────────┘  │
│                     │ User creates/edits event              │
│                     ▼                                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Event State (React Context/Hooks)                    │  │
│  └──────────────────┬────────────────────────────────────┘  │
│                     │ Save to IndexedDB                     │
│                     ▼                                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  IndexedDB (events, accounts, queue)                  │  │
│  └──────────────────┬────────────────────────────────────┘  │
│                     │ Trigger sync (auto or manual)         │
│                     ▼                                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Sync Engine                                          │  │
│  │  - Read from queue (pending changes)                  │  │
│  │  - Fetch from Google Calendar API                     │  │
│  │  - Detect conflicts                                   │  │
│  │  - Merge changes                                      │  │
│  └──────────────────┬────────────────────────────────────┘  │
│                     │ HTTP requests with OAuth token        │
└─────────────────────┼────────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │  Google Calendar API v3    │
         └────────────────────────────┘
```

### OAuth Flow

```
┌─────────────────┐                  ┌──────────────────┐
│  WolfCal UI     │                  │  Google OAuth    │
│  (Browser)      │                  │  Server          │
└────────┬────────┘                  └────────┬─────────┘
         │                                    │
         │ 1. User clicks "Add Account"       │
         │                                    │
         │ 2. Open popup window               │
         ├────────────────────────────────────>
         │    https://accounts.google.com/    │
         │    o/oauth2/v2/auth?               │
         │    client_id=...&                  │
         │    redirect_uri=.../callback&      │
         │    scope=calendar                  │
         │                                    │
         │ 3. User authorizes                 │
         │                                    │
         │ 4. Redirect to callback            │
         <────────────────────────────────────┤
         │    http://localhost:8080/callback? │
         │    code=AUTH_CODE                  │
         │                                    │
         │ 5. Exchange code for tokens        │
         ├────────────────────────────────────>
         │    POST /token                     │
         │    code=AUTH_CODE&                 │
         │    client_id=...&                  │
         │    client_secret=...               │
         │                                    │
         │ 6. Return access & refresh tokens  │
         <────────────────────────────────────┤
         │    { access_token, refresh_token,  │
         │      expires_in }                  │
         │                                    │
         │ 7. Encrypt tokens (Web Crypto)     │
         │ 8. Store in IndexedDB              │
         │ 9. Fetch calendar list             │
         │ 10. Initial event sync             │
         │                                    │
```

### Offline Change Queue Flow

```
User creates event offline
         │
         ▼
Event saved to IndexedDB
         │
         ▼
Add to offline queue
(table: pending_changes)
         │
         ▼
Display "pending sync" indicator
         │
         ▼
(User reconnects to internet)
         │
         ▼
Sync engine activates
         │
         ▼
Process queue items in order:
  - Create events (POST to API)
  - Update events (PUT to API)
  - Delete events (DELETE to API)
         │
         ▼
For each success:
  - Remove from queue
  - Update event with server ID
         │
         ▼
For each failure:
  - Exponential backoff retry
  - Max 5 attempts
  - If still fails, show error log
```

## IndexedDB Schema

WolfCal uses multiple object stores in a single IndexedDB database.

### Database: `wolfcal`

**Version:** 1

### Object Stores

#### `accounts`

Stores connected Google account information.

```typescript
interface Account {
  id: string;                    // UUID
  email: string;                 // Google account email
  encryptedAccessToken: string;  // AES-GCM encrypted access token
  encryptedRefreshToken: string; // AES-GCM encrypted refresh token
  tokenExpiry: number;           // Timestamp when access token expires
  clientId: string;              // OAuth client ID (unencrypted)
  encryptedClientSecret: string; // AES-GCM encrypted client secret
  lastSync: number;              // Timestamp of last successful sync
  createdAt: number;             // Timestamp when account was added
}
```

**Indexes:**
- `email` (unique)

#### `calendars`

Stores calendar metadata for each account.

```typescript
interface Calendar {
  id: string;                    // Google Calendar ID
  accountId: string;             // Foreign key to accounts.id
  summary: string;               // Calendar name/title
  description?: string;          // Calendar description
  timeZone: string;              // e.g., "America/New_York"
  backgroundColor: string;       // Hex color code
  foregroundColor: string;       // Hex color code
  accessRole: string;            // "owner", "writer", "reader"
  primary: boolean;              // Is this the primary calendar?
  visible: boolean;              // UI toggle state (user preference)
  createdAt: number;             // Timestamp when calendar was added
}
```

**Indexes:**
- `accountId` (non-unique)
- `[accountId, id]` (compound, unique)

#### `events`

Stores calendar events.

```typescript
interface Event {
  id: string;                    // Google Calendar event ID
  calendarId: string;            // Foreign key to calendars.id
  accountId: string;             // Foreign key to accounts.id
  summary: string;               // Event title
  description?: string;          // Event description
  location?: string;             // Event location
  start: EventDateTime;          // Start date/time
  end: EventDateTime;            // End date/time
  recurrence?: string[];         // RRULE array (if recurring)
  attendees?: Attendee[];        // List of attendees
  attachments?: Attachment[];    // File attachments
  organizer?: Organizer;         // Event organizer
  status: string;                // "confirmed", "tentative", "cancelled"
  responseStatus?: string;       // User's response: "accepted", "declined", "tentative"
  iCalUID: string;               // Unique event identifier
  etag: string;                  // Google Calendar etag for conflict detection
  updated: string;               // ISO timestamp of last update
  locallyModified: boolean;      // Has local changes pending sync?
  deleted: boolean;              // Tombstone flag (soft delete)
  createdAt: number;             // Timestamp when event was created locally
  updatedAt: number;             // Timestamp when event was last updated locally
}

interface EventDateTime {
  dateTime?: string;             // ISO timestamp (for timed events)
  date?: string;                 // YYYY-MM-DD (for all-day events)
  timeZone?: string;             // Time zone
}

interface Attendee {
  email: string;
  displayName?: string;
  responseStatus: string;        // "accepted", "declined", "tentative", "needsAction"
  organizer?: boolean;
}

interface Attachment {
  fileUrl: string;
  title?: string;
  mimeType?: string;
}

interface Organizer {
  email: string;
  displayName?: string;
}
```

**Indexes:**
- `calendarId` (non-unique)
- `accountId` (non-unique)
- `[calendarId, start.dateTime]` (compound, non-unique, for query performance)
- `iCalUID` (unique, for deduplication)

#### `pending_changes`

Queue of offline changes waiting to sync.

```typescript
interface PendingChange {
  id: string;                    // UUID
  accountId: string;             // Foreign key to accounts.id
  calendarId: string;            // Foreign key to calendars.id
  eventId: string;               // Event ID (may be temporary for creates)
  operation: "create" | "update" | "delete";
  eventData?: Event;             // Full event object (for create/update)
  attempts: number;              // Number of sync attempts
  lastAttempt?: number;          // Timestamp of last sync attempt
  createdAt: number;             // Timestamp when change was queued
}
```

**Indexes:**
- `accountId` (non-unique)
- `createdAt` (non-unique, for processing in order)

#### `encryption_key`

Stores the encryption key used for token encryption.

```typescript
interface EncryptionKey {
  id: "master";                  // Single row
  key: CryptoKey;                // Web Crypto API key (AES-GCM)
  createdAt: number;             // Timestamp when key was generated
}
```

**Note:** The encryption key is generated once per browser using Web Crypto API and stored in IndexedDB (non-exportable for security).

## OAuth and Security

### Token Encryption

WolfCal encrypts sensitive OAuth tokens before storing them in IndexedDB.

**Encryption process:**

1. **Generate master key** (once per browser):
   ```javascript
   const key = await crypto.subtle.generateKey(
     { name: "AES-GCM", length: 256 },
     false, // non-extractable
     ["encrypt", "decrypt"]
   );
   ```

2. **Encrypt tokens**:
   ```javascript
   const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit nonce
   const encrypted = await crypto.subtle.encrypt(
     { name: "AES-GCM", iv },
     key,
     encoder.encode(token)
   );
   // Store: { iv, ciphertext }
   ```

3. **Decrypt tokens** (when making API calls):
   ```javascript
   const decrypted = await crypto.subtle.decrypt(
     { name: "AES-GCM", iv },
     key,
     ciphertext
   );
   const token = decoder.decode(decrypted);
   ```

**Security properties:**
- **AES-GCM**: Authenticated encryption (prevents tampering)
- **Non-extractable key**: Key cannot be exported from Web Crypto API
- **Unique IV per encryption**: Prevents replay attacks
- **Browser sandboxing**: IndexedDB is origin-isolated

**Threat model:**

**Protected against:**
- Casual browsing of IndexedDB (tokens are encrypted)
- Tampering with stored tokens (GCM authentication tag)
- Token extraction via XSS (assuming Content Security Policy is set)

**Not protected against:**
- Malicious browser extensions with IndexedDB access
- User's operating system compromise
- Physical access to the device (if browser is unlocked)

### Token Refresh

Access tokens expire after 1 hour. WolfCal automatically refreshes them.

**Refresh flow:**

1. Detect expired token (check `tokenExpiry` before API call)
2. Use refresh token to get new access token:
   ```javascript
   const response = await fetch("https://oauth2.googleapis.com/token", {
     method: "POST",
     headers: { "Content-Type": "application/x-www-form-urlencoded" },
     body: new URLSearchParams({
       client_id: clientId,
       client_secret: decryptedClientSecret,
       refresh_token: decryptedRefreshToken,
       grant_type: "refresh_token"
     })
   });
   ```
3. Encrypt new access token
4. Update `accounts` object store with new token and expiry

**Error handling:**
- If refresh fails (401/403), assume token revoked
- Show UI prompt to reconnect account
- Clear local data for that account

## Sync Engine

### Sync Triggers

**Automatic sync:**
- Every 15-30 minutes when browser tab is active
- Uses `setInterval` in React component
- Checks `document.visibilityState` to avoid syncing inactive tabs

**Manual sync:**
- User clicks "Refresh" button
- Immediately triggers sync

**Event-driven sync:**
- After creating/editing/deleting an event
- Debounced 5 seconds to batch rapid changes

### Sync Algorithm

**High-level steps:**

1. **Fetch calendar list** for each account
   - Compare with local `calendars` table
   - Add new calendars, remove deleted ones

2. **For each calendar**, fetch events:
   - Query Google Calendar API with:
     - `timeMin`: 1.5 months ago
     - `timeMax`: 1.5 months from now
     - `showDeleted`: true (to detect deletions)
     - `updatedMin`: last sync time (incremental sync)

3. **Merge remote events** into local IndexedDB:
   - Compare `etag` and `updated` timestamp
   - If remote is newer: update local event
   - If local has pending changes: conflict detected

4. **Process offline queue**:
   - For each pending change:
     - Send to Google Calendar API
     - If success: remove from queue, update event with server ID
     - If failure: increment attempts, exponential backoff

5. **Detect conflicts**:
   - Event modified both locally and remotely
   - Show conflict resolution UI
   - User chooses: keep local, keep remote, or merge

### Exponential Backoff

For transient failures (network errors, rate limits), WolfCal retries with exponential backoff.

**Algorithm:**

```javascript
const delay = Math.min(
  1000 * Math.pow(2, attempts), // 1s, 2s, 4s, 8s, 16s, ...
  60000 // max 60 seconds
);

setTimeout(() => retry(), delay);
```

**Max attempts:** 5

If all attempts fail, the change remains in the queue and an error is logged.

### Conflict Detection

**Conflict occurs when:**
- Local event has `locallyModified: true` (pending changes in queue)
- Remote event has newer `updated` timestamp or different `etag`

**Resolution:**
- Pause sync for this event
- Show conflict UI with side-by-side comparison
- User selects: keep local, keep remote, or manual merge
- Apply selected version, mark `locallyModified: false`, resume sync

## Deployment Architecture

### Docker Multi-Stage Build

**Build stage:**
1. Use `node:20-alpine` base image
2. Install npm dependencies (`npm ci`)
3. Build React app (`npm run build`)
4. Output: `dist/` directory with static files

**Production stage:**
1. Use `caddy:2-alpine` base image
2. Copy `dist/` from build stage to `/usr/share/caddy`
3. Copy `Caddyfile` configuration
4. Expose port 8080

**Result:** Minimal production image (~30 MB) with just Caddy and static files.

### Caddy Configuration

**Caddyfile:**

```
:8080 {
    root * /usr/share/caddy
    file_server
    try_files {path} /index.html
}
```

**Behavior:**
- Serve static files from `/usr/share/caddy`
- If file not found, serve `index.html` (SPA fallback for client-side routing)
- Listen on port 8080 (HTTP only for localhost; use HTTPS for production domains)

### Production Deployment Considerations

**For public internet deployment:**

1. **Use HTTPS:**
   - Caddy automatically gets Let's Encrypt certificates
   - Update `Caddyfile` to use your domain:
     ```
     yourdomain.com {
         root * /usr/share/caddy
         file_server
         try_files {path} /index.html
     }
     ```

2. **Update OAuth redirect URIs:**
   - Change from `http://localhost:8080/callback` to `https://yourdomain.com/callback`
   - Update in Google Cloud Console

3. **Content Security Policy:**
   - Add CSP headers in Caddyfile to prevent XSS:
     ```
     header Content-Security-Policy "default-src 'self'; script-src 'self'; connect-src 'self' https://www.googleapis.com https://accounts.google.com"
     ```

4. **Monitoring:**
   - No built-in monitoring (frontend-only app)
   - Use browser analytics (e.g., Google Analytics) if desired
   - Check Caddy logs for HTTP access logs

## Performance Considerations

### IndexedDB Quota

**Browser limits:**
- Chrome: ~60% of available disk space (up to several GB)
- Firefox: 50 MB per origin (can request more)
- Safari: 1 GB limit

**WolfCal mitigation:**
- Sync window limited to 3 months (reduces data size)
- Auto-prune events outside sync window
- Estimate: ~10 KB per event, ~5000 events = 50 MB (fits in quota)

### Sync Performance

**Factors affecting sync time:**
- Number of accounts
- Number of calendars per account
- Number of events in sync window
- Network latency to Google APIs

**Optimizations:**
- Incremental sync (only fetch events updated since last sync)
- Parallel requests for different calendars
- IndexedDB batch writes (transaction per calendar)

**Typical sync times:**
- Initial sync (3 months, 10 calendars): 10-30 seconds
- Incremental sync (no changes): 2-5 seconds
- Incremental sync (few changes): 3-10 seconds

## Future Architecture Improvements

**Potential enhancements:**

1. **Web Workers** for sync:
   - Move sync logic to background worker
   - Avoid blocking main UI thread
   - Requires refactoring IndexedDB access

2. **Service Worker** for offline:
   - Cache static assets for true offline-first
   - Background sync API for queueing changes
   - Push notifications (if scope expands)

3. **WebAssembly** for performance:
   - Faster recurrence rule parsing (rrule.js is slow for complex patterns)
   - Encryption/decryption acceleration

4. **Shared Workers** for multi-tab sync:
   - Avoid duplicate syncs across multiple tabs
   - Synchronize state between tabs

5. **IndexedDB sharding**:
   - Split events across multiple object stores by time range
   - Faster queries for large datasets

## Conclusion

WolfCal's frontend-only architecture provides a unique balance of simplicity, privacy, and offline capability. By leveraging modern browser APIs (IndexedDB, Web Crypto, Fetch), it delivers a full-featured calendar experience without the complexity and cost of backend infrastructure.

For developers looking to contribute, understanding this architecture is crucial. All changes must work within the constraints of browser-based storage and direct API communication.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development setup and contribution guidelines.
