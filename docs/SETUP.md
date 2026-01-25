# WolfCal Setup Guide

This guide walks you through deploying WolfCal and connecting your first Google Calendar account.

## Prerequisites

Before you begin, ensure you have:

1. **Docker and Docker Compose** installed on your system
   - Docker version 20.10 or higher
   - Docker Compose version 2.0 or higher
   - Verify installation: `docker --version && docker-compose --version`

2. **A Google account** with access to Google Calendar
   - Free Gmail account is sufficient
   - No Google Workspace subscription required

3. **A modern web browser**
   - Chrome (recommended) or Firefox
   - Safari and Edge may work but are not officially supported

## Step 1: Deploy WolfCal with Docker Compose

### 1.1 Clone the Repository

```bash
git clone https://github.com/yourusername/wolfcal.git
cd wolfcal
```

### 1.2 Build and Start the Application

```bash
docker-compose up -d
```

This command will:
- Build the WolfCal frontend application
- Start a Caddy web server serving the application
- Expose the application on port 8080

### 1.3 Verify Deployment

Check that the container is running:

```bash
docker ps | grep wolfcal
```

You should see output like:
```
CONTAINER ID   IMAGE              COMMAND                  STATUS          PORTS
abc123def456   wolfcal-caddy      "caddy run --config …"   Up 10 seconds   0.0.0.0:8080->8080/tcp
```

Open your browser and navigate to http://localhost:8080. You should see the WolfCal interface.

## Step 2: Configure Google OAuth Credentials

Before you can connect a Google account, you need to set up OAuth 2.0 credentials in Google Cloud Console.

**Follow the detailed step-by-step guide with screenshots:** [docs/OAUTH_CONFIG.md](OAUTH_CONFIG.md)

You will obtain:
- **Client ID** (looks like `123456789-abc123def456.apps.googleusercontent.com`)
- **Client Secret** (a random string of characters)

**Important:** Keep these credentials secure. Do not commit them to version control or share them publicly.

## Step 3: Connect Your First Google Account

### 3.1 Launch WolfCal

Navigate to http://localhost:8080 in your browser.

### 3.2 Add Account

1. Click the **Settings** button (gear icon) in the top-right corner
2. Click **Add Account** button
3. You will be prompted to enter your OAuth credentials:
   - **Client ID**: Paste the Client ID from Step 2
   - **Client Secret**: Paste the Client Secret from Step 2
4. Click **Connect**

### 3.3 OAuth Authorization Flow

1. A popup window will open asking you to sign in to Google
2. Select the Google account you want to connect
3. Review the permissions WolfCal is requesting:
   - Read and write access to Google Calendar
4. Click **Allow** to grant permissions
5. The popup will close automatically, and you'll return to WolfCal

### 3.4 Initial Sync

WolfCal will immediately begin syncing your calendars:
- Fetches all calendars associated with your Google account
- Downloads events within a 3-month window (1.5 months past, 1.5 months future)
- Stores events in browser IndexedDB with encrypted OAuth tokens

You should see a sync status indicator showing "Syncing..." followed by "Synced" when complete.

## Step 4: Add Additional Accounts (Optional)

To connect more Google accounts:

1. Go to **Settings** (gear icon)
2. Click **Add Account** again
3. Repeat the OAuth credential entry and authorization flow
4. Each account will have its own color coding in the calendar view

## Step 5: Verify Everything Works

### 5.1 View Your Calendars

- Switch between **Month**, **Week**, and **Day** views using the buttons in the top toolbar
- Events from all connected accounts should be visible
- Each calendar has a unique color

### 5.2 Create a Test Event

1. Click on any date/time in the calendar
2. Fill in the event details (title, time, description)
3. Click **Save**
4. The event should appear in the calendar immediately
5. It will sync to Google Calendar within 15-30 minutes (or click **Refresh** for immediate sync)

### 5.3 Test Offline Functionality

1. Disconnect your internet connection
2. Create, edit, or delete an event
3. Notice the sync status shows "Offline - changes queued"
4. Reconnect to the internet
5. Changes should automatically sync to Google Calendar

## Troubleshooting

### Issue: Container won't start

**Symptoms:** `docker-compose up -d` fails or container exits immediately

**Solutions:**
1. Check if port 8080 is already in use:
   ```bash
   lsof -i :8080
   ```
   If another service is using port 8080, either stop that service or modify `docker-compose.yml` to use a different port.

2. Check Docker logs:
   ```bash
   docker logs wolfcal
   ```

3. Rebuild the container:
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

### Issue: OAuth popup blocked by browser

**Symptoms:** Clicking "Connect" does nothing or shows a browser popup blocker notification

**Solutions:**
1. Allow popups for http://localhost:8080 in your browser settings
2. Try again - the popup should open successfully

### Issue: OAuth callback fails with 400 error

**Symptoms:** After authorizing in Google, you see "Error 400: redirect_uri_mismatch"

**Solutions:**
1. Verify the callback URL in Google Cloud Console is exactly: `http://localhost:8080/callback`
2. Check for typos (no trailing slash, correct port)
3. Re-save the OAuth credentials in Google Cloud Console
4. Try the connection again

### Issue: Events not syncing

**Symptoms:** Events created in WolfCal don't appear in Google Calendar (or vice versa)

**Solutions:**
1. Check sync status indicator in the top-right corner
2. Click the **Refresh** button to force an immediate sync
3. Open browser Developer Tools (F12) → Console tab, look for error messages
4. Verify internet connection is active
5. Check if OAuth token has expired (Settings → disconnect and reconnect account)

### Issue: "Quota exceeded" error

**Symptoms:** Sync fails with quota or rate limit errors

**Solutions:**
1. Google Calendar API has rate limits (default: 1,000,000 queries/day)
2. WolfCal uses exponential backoff - wait 5-10 minutes and try again
3. If you're syncing many accounts with many events, consider reducing the sync window
4. Check Google Cloud Console → APIs & Services → Quotas for your usage

### Issue: Calendar data disappeared

**Symptoms:** After reopening WolfCal, all events are gone

**Solutions:**
1. Check if browser cleared IndexedDB data (Privacy/Clear browsing data settings)
2. Verify you're using the same browser and profile
3. In Settings, reconnect your Google accounts - they will re-sync all events
4. Note: Browser "Incognito/Private" mode doesn't persist IndexedDB data

### Issue: Slow performance with many events

**Symptoms:** Calendar is slow to render or scroll

**Solutions:**
1. WolfCal syncs a 3-month window to balance completeness and performance
2. Try switching to Week or Day view instead of Month view
3. Toggle off calendars you don't need to see (filters in sidebar)
4. Clear old events outside the sync window (automatically pruned)

## Next Steps

- Read the [User Guide](USER_GUIDE.md) to learn all WolfCal features
- Review the [Architecture documentation](ARCHITECTURE.md) to understand how WolfCal works
- Check out the [OAuth Configuration Guide](OAUTH_CONFIG.md) for detailed Google Cloud setup

## Getting Help

If you encounter issues not covered in this troubleshooting section:

1. Check the [GitHub Issues](https://github.com/yourusername/wolfcal/issues) for similar problems
2. Review browser console logs (F12 → Console) for error messages
3. Open a new issue with:
   - Detailed description of the problem
   - Steps to reproduce
   - Browser version and operating system
   - Relevant console error messages
