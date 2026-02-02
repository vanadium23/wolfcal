# fn-9-nas.3 Implement export flow UI in Settings

## Description
Add an "Export Configuration" button to the Settings component. When clicked, it should:
1. Serialize the current configuration (including OAuth tokens from IndexedDB)
2. Prompt user for a passphrase (will be used for encryption)
3. Encrypt the config with the passphrase
4. Generate a URL with the encrypted data in the hash fragment
5. Display the URL in a modal for copying

## Technical Details
- Add "Export Configuration" button to Settings component (near account management)
- Create modal/dialog with:
  - Passphrase input (password type, with show/hide toggle)
  - Passphrase confirmation input
  - Export button
- On export:
  - Call `exportConfig()` to get ConfigBundle
  - Encrypt with user-provided passphrase
  - Generate URL: `${window.location.origin}${window.location.pathname}#config=<base64-encrypted>`
- Display result modal with:
  - Text input with URL (auto-selected, copy button)
  - Success message with instructions
  - Close button
- Show error messages for:
  - Passphrase mismatch
  - Encryption failures
  - Export failures

## Acceptance
- [ ] Export button in Settings component
- [ ] Passphrase input dialog with confirmation
- [ ] URL generation with encrypted data in hash
- [ ] Result modal with copy-to-clipboard functionality
- [ ] Error handling for encryption failures
- [ ] Error handling for passphrase mismatch
- [ ] Success feedback with instructions
- [ ] NO QR code (per decision - URL copy only)
- [ ] Component tests for export flow

## Done summary
# Task fn-9-nas.3: Export flow UI in Settings

## Summary
Implemented export configuration UI in Settings page with modal dialogs for passphrase input and result display.

## Files Created/Modified
- src/components/ExportConfiguration.tsx (152 lines)
- src/pages/Settings.css (added modal styles)
- src/pages/Settings.tsx (added export section)

## Implementation Details
- Export button triggers passphrase modal
- Passphrase validation (8+ characters, must match confirmation)
- URL generation with #config=<encrypted> hash
- Result modal with copy-to-clipboard
- Error handling and loading states
## Evidence
- Commits:
- Tests:
- PRs: