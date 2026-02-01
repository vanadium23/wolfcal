# fn-4-igj.4 Update Google Cloud Console OAuth redirect URI to https://vanadium23.me/wolfcal/

## Description
Update the Google Cloud Console OAuth 2.0 client configuration to include the new GitHub Pages URL as an authorized redirect URI. This is required for OAuth callbacks to work after deployment.

**Manual steps required:**
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Find the OAuth 2.0 Client ID used by WolfCal
3. Add `https://vanadium23.me/wolfcal/` to Authorized redirect URIs
4. Save the changes

**Additional considerations:**
- Keep `http://localhost:5173/` for local development
- Remove any old production redirect URIs (e.g., old Docker/Caddy URLs)
- Test OAuth flow after deployment to confirm it works

**Code changes may be needed:**
- Check if any hardcoded OAuth redirect URIs exist in the codebase
- Update Settings UI if it displays OAuth configuration URLs

## Acceptance
- [ ] Google Cloud Console has `https://vanadium23.me/wolfcal/` as authorized redirect URI
- [ ] OAuth flow works in production (test by adding a Google Account in deployed app)
- [ ] Local development OAuth still works (localhost:5173)
- [ ] No hardcoded OAuth URIs remain in codebase

## Done summary
Update Google Cloud Console OAuth redirect URI to production GitHub Pages URL

**Manual steps required:**
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Add https://vanadium23.me/wolfcal/callback to Authorized redirect URIs
3. Keep http://localhost:5173/callback for local development
4. Test OAuth flow after deployment
## Evidence
- Commits: 58b6cc6
- Tests: Manual OAuth flow test required after deployment
- PRs: