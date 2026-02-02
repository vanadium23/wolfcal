# fn-9-nas Implement URL Hash Transfer for Cross-Device Configuration

## Overview
Implement encrypted URL hash transfer for cross-device configuration in WolfCal. Configuration (OAuth credentials, calendar settings, preferences) is serialized, encrypted with a user-provided passphrase (AES-GCM via Web Crypto API), base64-encoded, and embedded in the URL fragment hash.

## Scope
**Priority: Core crypto and transfer flow**
- Web Crypto API utilities for AES-GCM encryption/decryption
- Configuration serialization/deserialization
- Export flow: encrypt config → generate URL → display URL + optional QR code
- Import flow: detect #config hash on page load → prompt for passphrase → decrypt → import
- UI: Export button in Settings

**Coverage Level: Critical flows**
- Encryption/decryption with passphrase
- URL generation and parsing
- Import detection on app initialization
- Error handling (wrong passphrase, corrupted data)

**Framework**
- No backend required (respects NoBackend invariant)
- Uses standard Web Crypto API (respects WebCryptoOnly invariant)

## Approach
1. **Crypto Utilities**: Implement AES-GCM encrypt/decrypt with passphrase-derived keys
2. **Config Serialization**: Create config object with OAuth tokens, calendar IDs, preferences
3. **Export Flow**: Settings button → encrypt → generate URL → display for copy + QR code
4. **Import Flow**: Check for #config hash on load → prompt passphrase → decrypt → merge into localStorage
5. **UX**: Clear error messages, success feedback, safe merge strategy

## Quick commands
- `npm run dev` - Run dev server to test import flow with URL hash
- Manual test: Export config → copy URL → open in new window → import

## Acceptance
- [ ] Web Crypto utilities (encrypt/decrypt with AES-GCM)
- [ ] Config serialization includes OAuth tokens, calendars, preferences
- [ ] Export button in Settings generates encrypted URL hash
- [ ] URL with #config hash triggers import prompt on page load
- [ ] Passphrase required to decrypt (no plaintext credentials)
- [ ] Optional QR code display for scan-to-transfer
- [ ] Error handling for wrong passphrase, corrupted data, invalid format
- [ ] E2E tests for complete export/import flow
- [ ] URL size validated (< 2KB hash)

## References
- DRR: `.quint/decisions/DRR-2026-02-02-use-url-hash-transfer-for-cross-device-configuration.md`
- L2 Knowledge: `.quint/knowledge/L2/url-hash-transfer-refined.md`
- Web Crypto API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
