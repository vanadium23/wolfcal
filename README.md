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

- Node.js 20+ (for local development)
- Google Cloud account (free tier is sufficient)
- Modern web browser (Chrome or Firefox recommended)

### Production Deployment (GitHub Pages)

WolfCal is deployed to GitHub Pages with automatic deployments on push to master:

1. Visit **https://vanadium23.me/wolfcal/**

2. Set up Google OAuth credentials in Settings (required for first use):
   - Click **Settings** (gear icon)
   - Follow the detailed guide in [docs/OAUTH_CONFIG.md](docs/OAUTH_CONFIG.md)
   - You'll need to create a Google Cloud project and OAuth 2.0 credentials
   - Configure the callback URL as `https://vanadium23.me/wolfcal/callback`
   - Enter Client ID and Client Secret in Settings and click **Save**
   - Click **Add Account** to connect your Google account

### Local Development

**Option 1: npm run dev (Recommended for development)**
```bash
git clone https://github.com/yourusername/wolfcal.git
cd wolfcal
npm install
npm run dev
```
Access at http://localhost:5173

**Option 2: Docker + Caddy (For OAuth testing)**
```bash
docker-compose up -d
```
Access at http://localhost:8080

Note: OAuth redirect URI for local dev is `http://localhost:5173/callback` (npm) or `http://localhost:8080/callback` (Docker).

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
- **Production**: GitHub Pages (automatic deployment on push to master)
- **Local Dev**: npm dev server or Docker + Caddy

All calendar data and OAuth tokens are stored in your browser's IndexedDB. When you connect a Google account, WolfCal syncs events within a 3-month window (1.5 months past and future) and keeps them available offline.

## Browser Compatibility

WolfCal is tested and supported on:
- Chrome (latest version)
- Firefox (latest version)

Safari and Edge may work but are not officially supported.

## Data Privacy

- **No data sent to WolfCal servers** - All communication is directly between your browser and Google APIs
- **OAuth tokens encrypted** - Stored in IndexedDB using Web Crypto API encryption
- **Browser storage only** - All data remains in your browser's IndexedDB
- **Direct Google API access** - Your browser communicates directly with Google Calendar API
- **Self-hosted option** - Can be deployed locally using Docker + Caddy for complete control

## License

MIT License - see [LICENSE](LICENSE) for details

## Support

For issues, questions, or feature requests, please visit the [GitHub Issues](https://github.com/yourusername/wolfcal/issues) page.

## Acknowledgments

- [FullCalendar](https://fullcalendar.io/) for the calendar UI component
- [Google Calendar API](https://developers.google.com/calendar) for calendar synchronization
- [Caddy](https://caddyserver.com/) for simple and secure static file serving
