# Bounded Context

## Vocabulary

{
  "Account": "A connected Google Calendar account with OAuth credentials, stored in IndexedDB with encrypted tokens",
  "Calendar": "A calendar resource belonging to an Account, with metadata like summary, color, and visibility state",
  "Event": "A calendar event with start/end times, recurrence rules, attendees, and sync metadata (etag, updated, locallyModified)",
  "IndexedDB": "Browser-based client-side database (wolfcal) with object stores: accounts, calendars, events, pending_changes, encryption_key",
  "OAuth": "OpenID Connect / OAuth 2.0 flow for Google Calendar API authorization with popup-based authorization code grant",
  "PendingChange": "Queued offline operation (create/update/delete) awaiting sync, with retry tracking and exponential backoff",
  "SyncEngine": "Orchestrator that fetches from Google Calendar API, merges with local IndexedDB, detects conflicts, and processes offline queue",
  "Conflict": "State where an event has both locallyModified=true and newer remote version, requiring user resolution",
  "FullCalendar": "Third-party React component library providing month/week/day views with drag-and-drop interaction",
  "AES-GCM": "Authenticated encryption algorithm (256-bit) used for OAuth token encryption in Web Crypto API"
}

## Invariants

{
  "NoBackend": "Application is frontend-only; all data stored in browser IndexedDB, no server-side database or API",
  "DirectGoogleAPI": "Browser communicates directly with Google Calendar API v3 and OAuth endpoints; no proxy or intermediary",
  "TokenEncryption": "OAuth access/refresh tokens and client secrets MUST be encrypted using AES-GCM before IndexedDB storage",
  "OfflineFirst": "All operations MUST work offline; changes queued to pending_changes and synced when connectivity restored",
  "ConflictResolution": "Events modified both locally and remotely MUST pause sync and show user resolution UI",
  "SyncWindow": "Events synced within 3-month window (1.5 months past to 1.5 months future) to manage IndexedDB quota",
  "SingleUser": "Each deployment serves one user; no multi-tenant account isolation or sharing between users",
  "IncrementalSync": "Sync uses updatedMin parameter based on lastSync timestamp to fetch only changed events",
  "ExponentialBackoff": "Failed pending_change retries use exponential backoff with max 5 attempts before error logging",
  "EtagOptimisticLock": "Event updates use Google's etag header for optimistic concurrency control",
  "React19Only": "UI uses React 19 features (useOptimistic, transitions) throughout for state management",
  "WebCryptoOnly": "Token encryption MUST use Web Crypto API with non-extractable keys; no third-party crypto libraries",
  "TypeScriptStrict": "TypeScript strict mode enabled; no 'any' types allowed without explicit rationale"
}
