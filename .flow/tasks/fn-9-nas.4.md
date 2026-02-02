# fn-9-nas.4 Implement import flow detection and prompt

## Description
Add detection for URL hash containing encrypted configuration data on app initialization. When detected:
1. Parse the #config hash parameter
2. Decode base64 to get encrypted data
3. Prompt user for passphrase
4. Decrypt and validate the configuration
5. Prompt user to choose merge strategy (replace vs merge)
6. Import into IndexedDB and localStorage
7. Reload/redirect to clean URL

## Technical Details
- Check `window.location.hash` on app mount (in App.tsx)
- Parse `#config=<base64>` format
- Create modal/dialog (separate from settings, full-screen overlay):
  - Passphrase input (password type, with show/hide toggle)
  - Decrypt button
  - Error display area
  - Merge strategy selection (after successful decrypt):
    - Radio buttons: "Replace all settings" vs "Merge with existing"
    - Import button
    - Cancel button
- Import flow:
  - Decrypt config with passphrase
  - Validate ConfigBundle structure
  - Show merge strategy options
  - Call `importConfig(configBundle, mode)` with selected mode
  - Store to IndexedDB (accounts) and localStorage (settings)
  - Clear hash from URL (history.replaceState)
  - Show success notification
  - Optionally reload app to apply new settings
- Error handling:
  - Invalid base64 format
  - Decryption failed (wrong passphrase)
  - Invalid config structure
  - Import failed

## Acceptance
- [ ] URL hash detection on app mount
- [ ] Passphrase prompt modal with decrypt
- [ ] Decryption and validation
- [ ] Merge strategy prompt (replace vs merge)
- [ ] Config import to IndexedDB and localStorage
- [ ] URL cleanup after import (remove hash)
- [ ] Error handling (wrong passphrase, corrupt data, invalid format)
- [ ] Success notification
- [ ] App reload after successful import
- [ ] Unit tests for import flow

## Done summary
# Task fn-9-nas.4: Import flow detection and prompt

## Summary
Implemented import flow with URL hash detection, multi-step modal dialog, and merge strategy selection.

## Files Created/Modified
- src/components/ImportConfiguration.tsx (213 lines)
- src/App.tsx (added hash detection)
- src/pages/Settings.css (added import modal styles)

## Implementation Details
- Hash detection on app mount (#config=<encrypted>)
- Multi-step flow: passphrase → decrypt → merge choice → import → success
- Merge strategy: Replace all vs Merge with existing
- URL cleanup after import
- Auto-reload after successful import
## Evidence
- Commits:
- Tests:
- PRs: