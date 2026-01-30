# fn-2-m4p.1 Refactor AddAccountButton to use Settings OAuth credentials

## Description
Remove embedded OAuth credential form from AddAccountButton component. Make button read credentials from localStorage and show disabled state with tooltip when credentials are missing.

**Size:** S
**Files:** src/components/AddAccountButton.tsx

## Approach

Simplify AddAccountButton:
- Remove all credential input UI (lines 16-18, 59-182 in current implementation)
- Remove showCredentialForm state
- Check localStorage for 'wolfcal:oauth:clientId' and 'wolfcal:oauth:clientSecret' on component mount
- If credentials missing: disable button, add title tooltip attribute
- If credentials present: enable button, call initiateOAuth directly with stored credentials

Follow pattern from existing code at src/components/AddAccountButton.tsx:34-35 which already reads from localStorage.

## Key Context

Per epic spec: "Add Account button is disabled when OAuth credentials are missing" with tooltip "Configure OAuth credentials in Settings to add accounts".

Current implementation already partially reads from localStorage (lines 34-35) but also has fallback to inline form - remove the fallback.
## Acceptance
- [ ] Credential input form removed from AddAccountButton.tsx
- [ ] clientId and clientSecret state removed
- [ ] showCredentialForm state removed
- [ ] Button checks localStorage for wolfcal:oauth:clientId and wolfcal:oauth:clientSecret
- [ ] Button disabled when credentials missing
- [ ] Disabled button shows tooltip: "Configure OAuth credentials in Settings to add accounts"
- [ ] Enabled button calls initiateOAuth with localStorage credentials
- [ ] Button styling updates to show disabled state (grayed out, cursor: not-allowed)
## Done summary
Refactored AddAccountButton to remove embedded OAuth credential form and use credentials from Settings localStorage.
## Evidence
- Commits: 3d249bef17fd8605c39a604f526677bd1952c738
- Tests: Code review - verified acceptance criteria
- PRs: