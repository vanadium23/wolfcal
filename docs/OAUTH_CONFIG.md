# Google OAuth Configuration Guide

This guide provides step-by-step instructions for creating OAuth 2.0 credentials in Google Cloud Console. You'll need these credentials to connect WolfCal to your Google Calendar.

## Overview

WolfCal uses OAuth 2.0 to securely access your Google Calendar data. Unlike many applications that provide a single set of credentials for all users, **WolfCal requires you to create your own OAuth credentials**. This approach ensures:

- **Full data ownership** - Only your WolfCal instance can access your calendars
- **No third-party intermediaries** - Direct communication between your browser and Google
- **Enhanced privacy** - No shared credentials that could be compromised
- **No subscription fees** - Google Calendar API is free for personal use

## Prerequisites

- A Google account (free Gmail account is sufficient)
- 10-15 minutes to complete setup
- No prior Google Cloud experience required

## Step-by-Step Instructions

### Step 1: Access Google Cloud Console

1. Open your web browser and navigate to: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Sign in with your Google account if prompted
3. Accept the Terms of Service if this is your first time using Google Cloud Console

**Screenshot placeholder:** Google Cloud Console homepage

### Step 2: Create a New Project

1. In the top navigation bar, click the **project dropdown** (to the right of "Google Cloud")
2. Click **"New Project"** button in the top-right of the dialog
3. Fill in the project details:
   - **Project name:** `WolfCal` (or any name you prefer)
   - **Organization:** Leave as "No organization" (unless you have a Google Workspace)
4. Click **"Create"**
5. Wait 10-20 seconds for the project to be created

**Screenshot placeholder:** New Project dialog with WolfCal name entered

### Step 3: Enable Google Calendar API

1. Ensure your new project is selected in the project dropdown
2. In the left sidebar, navigate to: **"APIs & Services" → "Library"**
   - Or use the search bar and type "API Library"
3. In the API Library search box, type: `Google Calendar API`
4. Click on **"Google Calendar API"** from the search results
5. Click the blue **"Enable"** button
6. Wait for the API to be enabled (5-10 seconds)

**Screenshot placeholder:** Google Calendar API page with Enable button

### Step 4: Configure OAuth Consent Screen

Before creating credentials, you must configure the OAuth consent screen.

#### 4.1 Start Consent Screen Setup

1. In the left sidebar, go to: **"APIs & Services" → "OAuth consent screen"**
2. Select **"External"** user type (this allows you to use any Google account)
3. Click **"Create"**

**Screenshot placeholder:** OAuth consent screen user type selection

#### 4.2 Fill in App Information

On the "OAuth consent screen" configuration page:

1. **App name:** `WolfCal` (or your preferred name)
2. **User support email:** Select your Google account email from the dropdown
3. **App logo:** (Optional - you can skip this)
4. **Application home page:** `http://localhost:8080` (or your actual domain if deploying remotely)
5. **Application privacy policy link:** Leave blank for personal use
6. **Application terms of service link:** Leave blank for personal use
7. **Authorized domains:** Leave blank (localhost doesn't need to be added)
8. **Developer contact information:** Enter your email address

Click **"Save and Continue"**

**Screenshot placeholder:** OAuth consent screen app information filled in

#### 4.3 Configure Scopes

1. Click **"Add or Remove Scopes"**
2. In the scopes list, search for: `calendar`
3. Check the following scope:
   - `https://www.googleapis.com/auth/calendar` (Read/write access to Calendars)
4. Click **"Update"** at the bottom
5. Click **"Save and Continue"**

**Screenshot placeholder:** Scopes selection with calendar scope checked

#### 4.4 Add Test Users (Required for External Apps)

Since you selected "External" user type, you need to add test users:

1. Click **"Add Users"**
2. Enter the email addresses of Google accounts you want to use with WolfCal
   - Add your own email address at minimum
   - You can add up to 100 test users
3. Click **"Add"**
4. Click **"Save and Continue"**

**Note:** While your app is in "Testing" mode, only these test users can connect. To allow any Google account, you'd need to publish the app (not required for personal use).

**Screenshot placeholder:** Test users configuration

#### 4.5 Review and Finish

1. Review the summary page
2. Click **"Back to Dashboard"**

### Step 5: Create OAuth 2.0 Credentials

Now you're ready to create the actual credentials WolfCal will use.

#### 5.1 Navigate to Credentials

1. In the left sidebar, go to: **"APIs & Services" → "Credentials"**
2. Click **"Create Credentials"** button at the top
3. Select **"OAuth client ID"** from the dropdown

**Screenshot placeholder:** Create Credentials dropdown menu

#### 5.2 Configure OAuth Client ID

1. **Application type:** Select **"Web application"**
2. **Name:** `WolfCal Web Client` (or any descriptive name)
3. **Authorized JavaScript origins:**
   - Click **"Add URI"**
   - Enter: `http://localhost:8080`
   - (If deploying to a domain, also add `https://yourdomain.com`)
4. **Authorized redirect URIs:**
   - Click **"Add URI"**
   - Enter: `http://localhost:8080/callback`
   - **Important:** This must be exactly `http://localhost:8080/callback` (no trailing slash)
   - (If deploying to a domain, also add `https://yourdomain.com/callback`)
5. Click **"Create"**

**Screenshot placeholder:** OAuth client ID configuration form filled out

### Step 6: Save Your Credentials

After clicking "Create", a dialog will appear with your credentials:

1. **Client ID:** A long string like `123456789012-abcdefghijklmnop12345678.apps.googleusercontent.com`
2. **Client secret:** A shorter string like `GOCSPX-abcd1234efgh5678ijkl`

**Important Steps:**

1. **Copy both values immediately** - save them to a secure location (password manager or encrypted note)
2. Click **"OK"** to close the dialog
3. You can always retrieve these later by clicking on the credential name in the Credentials page

**Screenshot placeholder:** OAuth client created dialog showing Client ID and Client secret

**Security Note:** Treat the Client Secret like a password. Do not:
- Commit it to version control (Git)
- Share it publicly
- Include it in screenshots or documentation

### Step 7: Verify Configuration

Before leaving Google Cloud Console, verify everything is set up correctly:

1. Go to **"APIs & Services" → "Credentials"**
2. Under "OAuth 2.0 Client IDs", you should see your `WolfCal Web Client`
3. Click on the name to view details and verify:
   - Authorized JavaScript origins includes `http://localhost:8080`
   - Authorized redirect URIs includes `http://localhost:8080/callback`

**Screenshot placeholder:** Credentials page showing the created OAuth client

### Step 8: Use Credentials in WolfCal

Now you can use these credentials to connect WolfCal to your Google account:

1. Open WolfCal in your browser: http://localhost:8080
2. Click **Settings** (gear icon)
3. Click **Add Account**
4. Enter your credentials:
   - **Client ID:** Paste the Client ID from Step 6
   - **Client Secret:** Paste the Client Secret from Step 6
5. Click **Connect**
6. Complete the OAuth authorization flow in the popup window

See [SETUP.md](SETUP.md) for detailed instructions on connecting your account.

## Common Issues and Solutions

### Issue: "Error 400: redirect_uri_mismatch"

**Cause:** The callback URL in your WolfCal doesn't match the redirect URI in Google Cloud Console.

**Solution:**
1. Verify the redirect URI in Google Cloud Console is exactly: `http://localhost:8080/callback`
2. Check for typos (no trailing slash, correct port, http not https)
3. If you changed the port in docker-compose.yml, update the redirect URI accordingly
4. Save changes and wait 5 minutes for Google to propagate the update

### Issue: "Access blocked: This app's request is invalid"

**Cause:** OAuth consent screen is not properly configured.

**Solution:**
1. Go back to "OAuth consent screen" in Google Cloud Console
2. Ensure "Publishing status" shows "Testing"
3. Verify you added your email as a test user
4. Make sure you selected at least the calendar scope

### Issue: "403: org_internal"

**Cause:** You selected "Internal" user type, which requires a Google Workspace organization.

**Solution:**
1. Go to "OAuth consent screen"
2. Edit the app
3. Change user type to "External"
4. Save and try again

### Issue: Can't find Google Calendar API in the library

**Cause:** Search not working or API already enabled.

**Solution:**
1. Check if the API is already enabled: "APIs & Services" → "Enabled APIs & services"
2. If not there, try direct link: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
3. Ensure the correct project is selected in the project dropdown

### Issue: "Access Not Configured" error when syncing

**Cause:** Google Calendar API is not enabled for the project.

**Solution:**
1. Go to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click "Enable" if not already enabled
4. Wait 1-2 minutes and try syncing again in WolfCal

## Security Best Practices

1. **Keep credentials secure:**
   - Store in a password manager
   - Never commit to Git repositories
   - Don't share publicly

2. **Limit test users:**
   - Only add Google accounts you trust
   - Remove test users you no longer need

3. **Monitor usage:**
   - Check "APIs & Services" → "Quotas" periodically
   - Look for unusual API call patterns

4. **Rotate credentials if compromised:**
   - If you accidentally expose credentials, immediately:
     1. Go to "Credentials" page
     2. Delete the compromised OAuth client
     3. Create a new one
     4. Update WolfCal with new credentials

5. **Use HTTPS in production:**
   - If deploying to a public domain, always use HTTPS
   - Update authorized origins and redirect URIs to use `https://`

## Additional Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 for Client-side Web Applications](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)
- [Google Cloud Console](https://console.cloud.google.com/)

## Next Steps

After successfully creating your OAuth credentials:

1. Return to [SETUP.md](SETUP.md) to complete WolfCal deployment
2. Connect your Google account using the credentials you just created
3. Explore the [User Guide](USER_GUIDE.md) to learn all WolfCal features
