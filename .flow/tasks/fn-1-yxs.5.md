# fn-1-yxs.5 Implement OAuth popup flow with callback handler

## Description
Implement OAuth 2.0 popup flow for Google Calendar API. Handle popup window, callback route, and authorization code exchange for access/refresh tokens.

**Size:** M
**Files:** src/lib/auth/oauth.ts, src/lib/auth/types.ts, src/components/AddAccountButton.tsx, src/pages/OAuthCallback.tsx

## Approach

Create OAuth flow:
1. User clicks "Add Account" → opens popup to Google OAuth consent URL
2. User grants consent → Google redirects to http://localhost:8080/callback?code=...
3. Callback page exchanges code for tokens (access_token, refresh_token)
4. Tokens passed to parent window via postMessage
5. Parent window stores tokens in IndexedDB (encryption handled in next task)

Use Google OAuth 2.0 endpoints:
- Authorization: https://accounts.google.com/o/oauth2/v2/auth
- Token exchange: https://oauth2.googleapis.com/token

Required scopes: https://www.googleapis.com/auth/calendar (full read/write access).

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:24-26`:
- OAuth popup flow (not redirect)
- Callback URL: `http://localhost:8080/callback`
- Users provide their own Google Cloud OAuth credentials (client_id, client_secret)
- Support multiple Google accounts (personal + Workspace)

Google OAuth docs: https://developers.google.com/identity/protocols/oauth2/web-server
## Acceptance
- [ ] src/lib/auth/oauth.ts exports initiateOAuth(clientId, clientSecret) function
- [ ] Function opens popup to Google OAuth consent screen
- [ ] Popup URL includes correct scope (calendar), client_id, redirect_uri
- [ ] src/pages/OAuthCallback.tsx handles /callback route
- [ ] Callback page extracts authorization code from URL params
- [ ] Callback page exchanges code for tokens via POST to Google token endpoint
- [ ] Tokens (access_token, refresh_token, expires_in) returned as JSON
- [ ] Callback page sends tokens to parent window via postMessage
- [ ] Parent window receives tokens via message event listener
- [ ] AddAccountButton.tsx component triggers OAuth flow on click
- [ ] Error handling for popup blocked, consent denied, token exchange failure
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
