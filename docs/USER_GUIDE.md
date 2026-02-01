# WolfCal User Guide

Complete guide to using WolfCal's features for managing your Google Calendars offline-first.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Calendar Views](#calendar-views)
3. [Managing Events](#managing-events)
4. [Account Management](#account-management)
5. [Offline Functionality](#offline-functionality)
6. [Conflict Resolution](#conflict-resolution)
7. [Settings and Configuration](#settings-and-configuration)
8. [Tips and Best Practices](#tips-and-best-practices)

## Getting Started

### First Launch

After deploying WolfCal and setting up OAuth credentials in Settings (see [SETUP.md](SETUP.md)), you'll start with an empty calendar view.

**To connect your first Google account:**
1. Click the **Settings** icon (gear) in the top-right corner
2. Configure OAuth credentials if not already done (see Settings section below)
3. Click **Add Account**
4. Click **Connect** and authorize in the popup window
5. Wait for initial sync to complete (typically 10-30 seconds)

**Note:** OAuth credentials are configured once in Settings and reused for all accounts. You don't need to re-enter credentials for each account.

### Interface Overview

The WolfCal interface consists of:

- **Top toolbar:**
  - View switcher buttons (Month / Week / Day)
  - Today button (jump to current date)
  - Navigation arrows (previous/next period)
  - Date range display
  - Refresh button (manual sync)
  - Sync status indicator
  - Settings button

- **Left sidebar:**
  - Account list with expand/collapse
  - Individual calendar toggles with color coding
  - Select all / deselect all options

- **Main calendar area:**
  - Grid view of events
  - Drag-and-drop enabled
  - Click to create events
  - Click events to view/edit details

## Calendar Views

WolfCal offers three calendar views powered by FullCalendar.

### Month View

**Activate:** Click the **Month** button in the top toolbar

**Features:**
- Shows entire month in a grid
- All-day events appear at the top of each day
- Timed events shown in the day cell
- Events with times show start time
- Click any day to create a new event
- Click an event to view/edit details

**Best for:** High-level overview, seeing patterns across weeks

### Week View

**Activate:** Click the **Week** button in the top toolbar

**Features:**
- Shows one week with hourly time slots
- All-day events in a separate section at the top
- Timed events appear in their time slots
- Half-hour granularity for event display
- Drag events vertically to change time
- Drag events horizontally to change day
- Click any time slot to create a new event

**Best for:** Detailed weekly planning, scheduling meetings

### Day View

**Activate:** Click the **Day** button in the top toolbar

**Features:**
- Shows a single day with hourly time slots
- All-day events at the top
- Precise time display down to the minute
- Easier to see overlapping events
- Great for busy days with many events
- Click any time to create a new event

**Best for:** Day-of agenda view, detailed hourly planning

### Navigation

**Jump to today:** Click the **Today** button (returns to current date in any view)

**Navigate forward/backward:**
- Click the **left/right arrows** in the toolbar
- Month view: moves by month
- Week view: moves by week
- Day view: moves by day

**Jump to specific date:**
- Click on any date in Month view to switch to Day view for that date
- Use browser back/forward buttons to navigate history (if supported)

## Managing Events

### Creating Events

**Quick create (any view):**
1. Click on a date (Month view) or time slot (Week/Day view)
2. A create event dialog appears with essential fields only:
   - **Title:** Event name (required)
   - **Calendar:** Choose which calendar to add to (flat list with account badges)
   - **Start date/time:** Pre-filled based on where you clicked
   - **End date/time:** Defaults to 1 hour after start
   - **All-day:** Toggle for all-day events
3. Click **More options** to expand additional fields:
   - **Description:** Optional event details
   - **Location:** Event location
   - **Attendees:** Add people to invite
   - **Attachments:** Add files
   - **Recurrence:** Set repeating events
4. Click **Save**

**Optimistic UI:** Events appear immediately in the calendar with 80% opacity while syncing to Google Calendar. Once synced successfully, the event displays at full opacity. If sync fails, the event remains with reduced opacity and shows an error in the event details.

**Last-used calendar:** WolfCal remembers the last calendar you used (stored in localStorage as `wolfcal:lastUsedCalendarId`) and selects it by default for new events.

**Offline note:** Events created offline will show a "pending sync" indicator and will sync automatically when you reconnect.

### Viewing Event Details

**To view event information:**
1. Click on any event in the calendar
2. Event details popup appears showing:
   - Title and time
   - Calendar name and color
   - Description (if any)
   - Attendees (if any)
   - Attachments (if any, shown as clickable links)
   - Organizer information
   - **Sync status:** If the event failed to sync, you'll see an error message with a **Retry Sync** button
3. Options in the popup:
   - **Edit:** Modify event details
   - **Delete:** Remove event
   - **Retry Sync:** Appears if sync failed; re-attempts to sync the event to Google Calendar
   - **Close:** Dismiss popup

**Retry failed syncs:** If an event shows a sync error, click **Retry Sync** in the event details popup. WolfCal will re-queue the event for syncing and attempt to upload it to Google Calendar again.

### Editing Events

**Method 1: Edit dialog**
1. Click on an event to open details
2. Click **Edit** button
3. Modify any field (title, time, calendar, description)
4. Click **Save**

**Method 2: Drag and drop (reschedule)**
1. Click and hold on an event
2. Drag to a new date or time
3. Release to drop
4. Event automatically updates
5. Works offline - will sync when reconnected

**Drag behavior:**
- **In Month view:** Drag to change date (time preserved)
- **In Week/Day view:** Drag vertically to change time, horizontally to change date
- **All-day events:** Drag to change date only

**Offline note:** Edits made offline queue for sync. A "pending changes" indicator shows on modified events.

### Deleting Events

**To delete an event:**
1. Click on the event to open details
2. Click **Delete** button
3. Confirm deletion in the dialog
4. Event is soft-deleted (marked for deletion, not immediately removed from IndexedDB)
5. Deletion syncs to Google Calendar on next sync

**Note:** Deleted events are tombstoned locally to ensure proper sync. They won't reappear from Google Calendar.

### Managing Invitations

When you receive an event invitation, it appears in your calendar with special indicators.

**To respond to an invitation:**
1. Click on the event
2. In the event details, you'll see your invitation status
3. Click one of the action buttons:
   - **Accept:** Mark as attending
   - **Tentative:** Mark as maybe attending
   - **Decline:** Mark as not attending
4. Your response syncs to Google Calendar
5. Organizer receives your response

**Offline behavior:** Invitation responses queue offline and sync when reconnected.

### Recurring Events

WolfCal handles recurring events (daily, weekly, monthly, yearly).

**How recurring events work:**
- Recurrence rule is stored in IndexedDB
- Individual instances are generated on-demand when viewing the calendar
- Editing a recurring event shows options:
  - Edit "This event only" (creates an exception)
  - Edit "All events" (modifies the recurrence rule)

**Note:** Creating recurring events is not yet supported in the MVP (you can create them in Google Calendar and they'll sync to WolfCal).

## Account Management

### Viewing Connected Accounts

**To see all connected accounts:**
1. Click **Settings** (gear icon)
2. The Settings page shows:
   - List of connected Google accounts
   - Email address for each account
   - Last sync time
   - Number of calendars synced
   - Actions: Disconnect, Re-sync, Refresh Calendars
   - Expandable calendar list with enable/disable toggles

### Adding Additional Accounts

WolfCal supports multiple Google accounts simultaneously.

**To add another account:**
1. Go to **Settings**
2. Click **Add Account**
3. Click **Connect** to authorize (OAuth credentials are already configured in Settings)
4. Complete the OAuth authorization flow in the popup window
5. Primary calendar is synced by default; other calendars are disabled

**Note:** OAuth credentials are configured once in Settings and reused for all accounts. You don't need to re-enter credentials for each additional account.

**Use cases for multiple accounts:**
- Personal + work calendars
- Multiple personal Gmail accounts
- Family member accounts (shared calendar management)

### Disconnecting Accounts

**To remove an account from WolfCal:**
1. Go to **Settings**
2. Find the account in the list
3. Click **Disconnect**
4. Confirm the action
5. All data for that account is removed from IndexedDB
6. Calendars and events from that account disappear from the view

**Note:** This only removes data from your local WolfCal instance. Your Google Calendar data remains unchanged.

### Managing Calendars in Settings

WolfCal provides calendar management in both Settings and the sidebar, with a 20-calendar limit per account.

**In Settings:**
1. Click **Settings** (gear icon)
2. Expand an account to see all calendars
3. Each calendar shows:
   - Calendar name (summary)
   - Enable/disable toggle (controls visibility and syncing)
   - Color indicator (matches calendar color in Google)
   - Primary calendar indicator (if applicable)
4. Use **Refresh Calendars** to fetch the latest calendar list from Google
   - Preserves your enable/disable choices
   - Adds new calendars as disabled
   - Updates metadata (name, color) for existing calendars

**Calendar limit:** Maximum 20 enabled calendars per account. If you try to enable more than 20, WolfCal will show an alert: "Maximum 20 calendars per account (20/20 enabled)."

**Syncing disabled calendars:** When you disable a calendar in Settings, events remain in IndexedDB but are hidden from the calendar view. Disabled calendars are not synced with Google Calendar, saving bandwidth and improving performance.

### Filtering Calendars

Use the sidebar to control which calendars are visible.

**Toggle individual calendars:**
- Click the checkbox next to any calendar name
- Unchecked calendars are hidden from the view
- Events are still synced and stored locally
- Enforces the same 20-calendar limit as Settings

**Toggle entire accounts:**
- Click the checkbox next to an account name
- All calendars under that account are shown/hidden
- If enabling would exceed 20 calendars, only the first 20 (alphabetically) are enabled

**Select all / Deselect all:**
- Use the links at the top of the sidebar
- Quickly show or hide all calendars across all accounts
- Respects the 20-calendar limit per account

**Settings and sidebar sync:** Calendar visibility changes in Settings immediately reflect in the sidebar, and vice versa. Both interfaces share the same calendar state from IndexedDB.

**Use cases:**
- Hide work calendars on weekends
- Focus on specific projects
- Reduce visual clutter for busy calendars

## Offline Functionality

WolfCal is designed to work without an internet connection for extended periods (days to weeks).

### How Offline Mode Works

**When online:**
- WolfCal syncs with Google Calendar every 15-30 minutes automatically
- Fetches events within a 3-month window (1.5 months past, 1.5 months future)
- Stores events in browser IndexedDB
- Encrypts OAuth tokens for security

**When offline:**
- All create, edit, and delete operations work normally
- Changes are queued in IndexedDB
- Sync status indicator shows "Offline - changes queued"
- Events display normally from local storage

**When reconnected:**
- Queued changes automatically sync to Google Calendar
- Uses exponential backoff for retries if sync fails
- Sync status shows "Syncing..." then "Synced"
- Conflicts are detected and presented for resolution

**Optimistic UI behavior:**
- Events appear immediately at 80% opacity when created (before sync confirms)
- Once synced successfully, events display at full opacity
- If sync fails, events remain at 80% opacity and show an error in event details
- Click **Retry Sync** in event details to re-attempt uploading failed events

### Sync Status Indicators

**Look for the sync indicator in the top-right corner:**

- **Green checkmark:** "Synced" - all changes uploaded, local data current
- **Blue spinning icon:** "Syncing..." - sync in progress
- **Orange clock icon:** "Offline - changes queued" - no internet, changes pending
- **Red exclamation:** "Sync error" - click for details, often rate limiting or network issues

### Manual Refresh

**To force an immediate sync:**
1. Click the **Refresh** button in the top toolbar
2. WolfCal immediately attempts to sync with Google Calendar
3. Watch the sync status indicator for progress

**Use cases:**
- After making changes you want uploaded immediately
- To fetch new events from Google Calendar right away
- To resolve conflicts after being offline

### Offline Limitations

**What works offline:**
- Viewing all synced events
- Creating new events
- Editing existing events
- Deleting events
- Rescheduling via drag-and-drop
- Responding to invitations
- Switching views and filtering calendars

**What doesn't work offline:**
- Syncing changes to Google Calendar
- Fetching new events from Google Calendar
- Viewing events outside the 3-month sync window
- Adding new Google accounts (requires OAuth flow)

**Note:** IndexedDB quota limits (typically 50-100 MB) mean you can't store unlimited events. WolfCal automatically prunes old events outside the sync window.

## Conflict Resolution

When WolfCal detects conflicting changes between local and Google Calendar, it presents a manual resolution UI.

### When Conflicts Occur

**Common scenarios:**
1. You edit an event offline in WolfCal
2. Someone else edits the same event in Google Calendar
3. When you reconnect, both versions exist

**Or:**
1. You delete an event offline
2. Someone updates the event in Google Calendar
3. Conflict: which version is correct?

### Resolving Conflicts

**Conflict resolution UI:**
1. When a conflict is detected during sync, a notification appears
2. Click to open the **Conflict Resolution** dialog
3. You'll see a side-by-side comparison:
   - **Local version** (your WolfCal changes)
   - **Remote version** (from Google Calendar)
4. Fields that differ are highlighted
5. Choose one option:
   - **Keep Local:** Use the WolfCal version (overwrite Google Calendar)
   - **Keep Remote:** Use the Google Calendar version (overwrite local)
   - **Merge:** Manually pick fields from each version (if supported)

**Best practices:**
- Review both versions carefully before choosing
- If unsure, keep the remote version (safer to not overwrite others' changes)
- Check timestamps to see which is more recent

### Preventing Conflicts

**To minimize conflicts:**
1. Sync frequently (use manual Refresh button before and after edits)
2. Avoid long offline periods if collaborating with others
3. Communicate with team members about calendar changes
4. Use Google Calendar directly for critical shared events

## Settings and Configuration

Access settings by clicking the **Settings** gear icon in the top-right corner.

### Settings Page Sections

**OAuth Credentials:**
- **Client ID:** Your Google OAuth Client ID (format: `*.apps.googleusercontent.com`)
- **Client Secret:** Your Google OAuth Client Secret (24+ characters)
- **Save button:** Stores credentials in localStorage (`wolfcal:oauth:clientId`, `wolfcal:oauth:clientSecret`)
- **Status:** Shows "Configured" (green) or "Not configured" (gray)
- **Validation:** Format-only validation (clientId pattern check, secret length check)
  - Real validation happens during the first successful account connection
  - `alert()` notifications for save success and validation errors

**Accounts:**
- List of connected Google accounts with email addresses
- **Add Account button:** Initiates OAuth flow using credentials from above (disabled if credentials not configured)
- **Disconnect option:** Remove account and all associated data from IndexedDB
- **Refresh Calendars:** Fetch latest calendar list from Google (preserves enable/disable choices)
- **Expandable calendar lists:** Each account shows its calendars with:
  - Calendar name (summary)
  - Enable/disable toggle (controls visibility and syncing)
  - Color indicator (matches Google Calendar color)
  - Primary calendar indicator

**Sync Preferences:**
- Auto-sync interval (default: 15-30 minutes)
- Manual sync button (Refresh)
- Sync window configuration (default: 3 months)

**Error Log:**
- View recent sync errors and failures
- Useful for troubleshooting issues
- Click "Clear Log" to remove old entries

**About:**
- WolfCal version information
- Links to documentation
- License information

### Configuring OAuth Credentials

OAuth credentials are configured once in Settings and reused for all accounts.

**To set up OAuth credentials:**
1. Go to **Settings** (gear icon)
2. Under "OAuth Credentials", enter:
   - **Client ID:** Paste your Google OAuth Client ID
   - **Client Secret:** Paste your Google OAuth Client Secret
3. Click **Save**
4. Status should change to "Configured" (green)
5. You can now add accounts without re-entering credentials

**Note:** See [SETUP.md](SETUP.md) and [OAUTH_CONFIG.md](OAUTH_CONFIG.md) for detailed instructions on creating OAuth credentials in Google Cloud Console.

### Troubleshooting via Settings

**If events aren't syncing:**
1. Go to Settings → Error Log
2. Look for recent error messages
3. Common errors:
   - "401 Unauthorized": OAuth token expired, reconnect account
   - "403 Rate limit": Too many requests, wait 5-10 minutes
   - "Network error": Check internet connection

**If an account stops working:**
1. Go to Settings
2. Disconnect the account
3. Reconnect with the same OAuth credentials
4. All events will re-sync

## Tips and Best Practices

### General Usage

1. **Sync regularly**
   - Click Refresh before and after making important changes
   - Don't rely solely on auto-sync for critical events

2. **Use filtering effectively**
   - Hide calendars you don't need to see to reduce clutter
   - Toggle work calendars on/off based on time of day

3. **Leverage offline mode**
   - Feel free to work offline - WolfCal queues all changes safely
   - Great for editing calendars on flights or in low-connectivity areas

4. **Multi-account organization**
   - Use separate accounts for work/personal
   - Color coding helps distinguish calendars at a glance

### Performance Optimization

1. **Limit the number of calendars**
   - Toggle off calendars you rarely view
   - Only sync essential calendars from each account

2. **Use Week or Day view for busy schedules**
   - Month view can slow down with 100+ events
   - Week/Day views render faster

3. **Clear browser cache periodically**
   - WolfCal stores data in IndexedDB indefinitely
   - If performance degrades, disconnect and reconnect accounts to refresh data

### Security

1. **Keep OAuth credentials secure**
   - Don't share your Client ID/Secret with others
   - Each person should create their own OAuth app

2. **Use HTTPS in production**
   - If deploying to a public domain, always use HTTPS
   - Update OAuth redirect URIs to match

3. **Browser privacy modes**
   - Incognito/Private browsing doesn't persist IndexedDB
   - Use a regular browser window for normal usage

4. **Revoke access when done**
   - If you stop using WolfCal, revoke its Google Calendar access:
     - Go to https://myaccount.google.com/permissions
     - Find your WolfCal OAuth app
     - Click "Remove Access"

### Data Management

1. **No automatic backups**
   - WolfCal doesn't backup your Google Calendar data
   - Your calendar data remains safely in Google's servers
   - Local IndexedDB data can be cleared by the browser

2. **Sync window awareness**
   - Only events within 1.5 months past/future are synced
   - To view older events, use Google Calendar directly
   - WolfCal automatically prunes events outside the window

3. **Quota limits**
   - Google Calendar API has free tier limits (1M requests/day)
   - Normal usage won't hit this limit
   - If you do, WolfCal shows a quota error and uses exponential backoff

## Keyboard Shortcuts

**Note:** Keyboard shortcuts are not yet implemented in the MVP. This section is reserved for future versions.

Planned shortcuts:
- `n`: Create new event
- `t`: Jump to today
- `r`: Refresh / manual sync
- `m`: Switch to Month view
- `w`: Switch to Week view
- `d`: Switch to Day view
- Arrow keys: Navigate dates

## Getting Help

**If you encounter issues:**

1. Check the [Troubleshooting section in SETUP.md](SETUP.md#troubleshooting)
2. Review browser console for error messages (F12 → Console)
3. Check Settings → Error Log for sync errors
4. Visit [GitHub Issues](https://github.com/yourusername/wolfcal/issues)

**For feature requests:**
- Open an issue on GitHub with the "enhancement" label
- Describe your use case and desired functionality

## What's Next?

Planned features for future releases:
- Search functionality
- Keyboard shortcuts
- Event reminders/notifications
- Calendar import/export (iCal, CSV)
- Theme customization
- Recurring event creation
- Attachment uploads

Stay tuned for updates!
