# fn-1-yxs.7 Build credential management UI in settings

## Description
Create settings UI for managing Google Cloud OAuth credentials and connected accounts. Allow users to add/remove accounts and configure sync preferences.

**Size:** M
**Files:** src/pages/Settings.tsx, src/components/AccountList.tsx, src/components/CredentialForm.tsx

## Approach

Create Settings page with sections:
1. **OAuth Credentials**: Form to enter Google Cloud client_id and client_secret (stored in localStorage, not IndexedDB)
2. **Connected Accounts**: List of connected Google accounts with remove buttons
3. **Sync Settings**: Auto-sync toggle, sync interval selector (15/20/30 minutes)

Account list shows:
- Account email (fetch from Google People API or Calendar API)
- Last sync time
- Remove button (clears account + calendars + events from IndexedDB)

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:25-26`:
- Users provide their own Google Cloud OAuth credentials
- Support multiple Google accounts

Per spec at `.flow/specs/fn-1-yxs.md:73`:
- Full settings page for managing accounts, preferences, sync settings
## Acceptance
- [ ] src/pages/Settings.tsx created with tabbed/sectioned layout
- [ ] CredentialForm component has inputs for client_id and client_secret
- [ ] Credentials saved to localStorage on submit
- [ ] AccountList component displays connected accounts from IndexedDB
- [ ] Each account shows email, last sync time, and remove button
- [ ] Remove button deletes account, calendars, events from IndexedDB
- [ ] Sync settings section has auto-sync toggle (on/off)
- [ ] Sync interval dropdown (15/20/30 minutes)
- [ ] Settings accessible via navigation (link in header/sidebar)
- [ ] Settings page styled consistently with app theme
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
