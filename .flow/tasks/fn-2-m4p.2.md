# fn-2-m4p.2 Add OAuth credential validation in Settings

## Description
Add validation functionality to CredentialForm in Settings that tests OAuth credentials against Google API and displays Valid/Invalid status. Show success toast when credentials are saved.

**Size:** S
**Files:** src/components/CredentialForm.tsx, src/lib/auth/validation.ts (new)

## Approach

Create validation module:
- Function to test OAuth credentials by making a test request to Google OAuth token endpoint
- Use client_id and client_secret to verify they are valid (can exchange dummy code or validate format)

Update CredentialForm:
- Add "Validate" button next to Save button
- After Save, show toast notification: "OAuth configured successfully. You can now add accounts."
- Display validation status indicator (green checkmark for Valid, red X for Invalid)
- Store validation result in component state

## Key Context

Per epic spec: "Settings includes OAuth credential validation that tests credentials and shows status" and "After OAuth configured, success toast appears".

Reuse toast notification pattern if one exists in the codebase, otherwise implement simple toast component.
## Acceptance
- [ ] src/lib/auth/validation.ts created with validateOAuthCredentials(clientId, clientSecret) function
- [ ] Validation tests credentials against Google API
- [ ] CredentialForm shows validation status (Valid/Invalid) after test
- [ ] "Validate" button added to CredentialForm
- [ ] After Save, success toast appears: "OAuth configured successfully. You can now add accounts."
- [ ] Toast notification component created or reused
- [ ] Validation status persists in component state
- [ ] Invalid credentials prevent Save or show warning
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
