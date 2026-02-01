# WolfCal

**A local-first, privacy-focused Google Calendar wrapper that works offline**

WolfCal is a self-hosted calendar application that syncs with multiple Google Calendar accounts while maintaining complete data ownership and extended offline capability. Built as a single-page React application with browser-based storage, it provides all the features you need without sending your data to third-party servers.

## Features

- **Multi-account Google Calendar sync** - Connect multiple Google accounts and view all calendars in one place
- **Centralized OAuth configuration** - Configure OAuth credentials once in Settings for all accounts
- **Calendar management** - Enable/disable calendars per account with a 20-calendar limit
- **Offline-first architecture** - Work without internet for days or weeks, changes sync automatically when reconnected
- **Optimistic UI** - Events appear immediately while syncing, with retry functionality for failed syncs
- **Simplified event form** - Essential fields by default with expandable "More options" for advanced features
- **Full event management** - Create, edit, delete, and reschedule events with drag-and-drop
- **Multiple calendar views** - Month, week, and day views powered by FullCalendar
- **Privacy-focused** - All data stored locally in your browser with encrypted OAuth tokens
- **No backend required** - Frontend-only app served via Docker with Caddy
- **Invitation management** - Accept or decline event invitations directly from the calendar
- **Automatic sync** - Background sync every 15-30 minutes with manual refresh option
- **Conflict resolution** - Side-by-side comparison UI for handling sync conflicts
- **Account filtering** - Toggle individual calendars and accounts on/off with color coding

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Google Cloud account (free tier is sufficient)
- Modern web browser (Chrome or Firefox recommended)

### Deployment

1. Clone the repository:
```bash
git clone https://github.com/yourusername/wolfcal.git
cd wolfcal
```

2. Build and start the application:
```bash
docker-compose up -d
```

3. Access WolfCal at http://localhost:8080

4. Set up Google OAuth credentials in Settings (required for first use):
   - Click **Settings** (gear icon)
   - Follow the detailed guide in [docs/OAUTH_CONFIG.md](docs/OAUTH_CONFIG.md)
   - You'll need to create a Google Cloud project and OAuth 2.0 credentials
   - Configure the callback URL as `http://localhost:8080/callback`
   - Enter Client ID and Client Secret in Settings and click **Save**
   - Click **Add Account** to connect your Google account

5. Start using WolfCal!

## Documentation

- **[Setup Guide](docs/SETUP.md)** - Complete deployment and configuration instructions
- **[OAuth Configuration](docs/OAUTH_CONFIG.md)** - Step-by-step Google Cloud Console setup with screenshots
- **[User Guide](docs/USER_GUIDE.md)** - How to use WolfCal features and manage your calendars
- **[Architecture](docs/ARCHITECTURE.md)** - System design, data flow, and technical details
- **[Contributing](CONTRIBUTING.md)** - Development setup and contribution guidelines

## Architecture Overview

WolfCal is a **frontend-only** web application:
- **Frontend**: React + TypeScript + Vite
- **Calendar UI**: FullCalendar library
- **Storage**: Browser IndexedDB (no backend database)
- **Security**: Web Crypto API for OAuth token encryption
- **Deployment**: Docker Compose + Caddy static file server

All calendar data and OAuth tokens are stored in your browser's IndexedDB. When you connect a Google account, WolfCal syncs events within a 3-month window (1.5 months past and future) and keeps them available offline.

## Browser Compatibility

WolfCal is tested and supported on:
- Chrome (latest version)
- Firefox (latest version)

Safari and Edge may work but are not officially supported.

## Data Privacy

- **No data sent to WolfCal servers** - There are no WolfCal servers; it's entirely self-hosted
- **OAuth tokens encrypted** - Stored in IndexedDB using Web Crypto API encryption
- **Browser storage only** - All data remains in your browser's IndexedDB
- **Direct Google API access** - Your browser communicates directly with Google Calendar API
- **Single-user deployment** - Each Docker instance is for one user (no multi-tenant data mixing)

## License

MIT License - see [LICENSE](LICENSE) for details

## Support

For issues, questions, or feature requests, please visit the [GitHub Issues](https://github.com/yourusername/wolfcal/issues) page.

## Acknowledgments

- [FullCalendar](https://fullcalendar.io/) for the calendar UI component
- [Google Calendar API](https://developers.google.com/calendar) for calendar synchronization
- [Caddy](https://caddyserver.com/) for simple and secure static file serving
