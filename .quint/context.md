# Bounded Context

## Vocabulary

- **First**: Data stored primarily on user's device, not cloud servers
- **IndexedDB**: Browser storage API for persistent data
- **OAuth**: OpenID Connect/Google OAuth for authentication
Sync
- **Engine**: Background process that syncs local data with Google Calendar API
- **CRUD**: Create, Read, Update, Delete operations
Recurring
- **Event**: Event with RRULE (recurrence rule)
Soft
- **Delete**: Deletion that marks records as deleted rather than removing them
- **Tombstone**: Marker for deleted records in sync context
- **FullCalendar**: Third-party calendar UI library
Web Crypto
- **API**: Browser native encryption/decryption API
Service
- **Worker**: Background script for offline functionality

## Invariants

Local-First Architecture: All user data stored primarily in IndexedDB on user's device
Privacy-First: No user data sent to third-party analytics or tracking services
No Backend Server: Application is client-side only, deployed as static files
Google Calendar API Integration: OAuth-based sync with Google Calendar as optional backend
Offline-First: Application must function without internet connection for extended periods
Multi-Account Support: Users can connect multiple Google Calendar accounts simultaneously
Browser Compatibility: Target modern Chrome and Firefox only (no Safari/Edge guarantees)
