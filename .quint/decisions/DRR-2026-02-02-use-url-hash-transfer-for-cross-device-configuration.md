---
type: DRR
winner_id: url-hash-transfer-refined
created: 2026-02-02T09:27:00Z
content_hash: 04b91346b1d21e12767f4ee061261de4
---

# Use URL Hash Transfer for Cross-Device Configuration

## Context
WolfCal needs a way to transfer initial configuration (OAuth credentials, calendar settings, preferences) between devices. The app is frontend-only with no backend server. Users may access WolfCal from multiple devices (phone, tablet, desktop).

## Decision
**Selected Option:** url-hash-transfer-refined

We decided to use URL Hash Transfer with encryption for cross-device configuration. Configuration is serialized, encrypted with user-provided passphrase (AES-GCM via Web Crypto API), base64-encoded, and embedded in the URL fragment hash. The receiver opens the URL and enters the decryption passphrase to import settings.

## Rationale
Chosen for its balance of security, UX, and flexibility:
- R_eff: 1.00 (all hypotheses had equal reliability)
- Security: Credentials encrypted with passphrase; even if URL is logged, data is useless without passphrase
- UX: Easy to share via messaging apps, email, etc.
- Flexibility: Can also generate QR code containing the URL for scan-to-transfer (hybrid approach)
- Size validated: 874 bytes encrypted (43% of 2KB conservative URL limit)
- No backend required (respects NoBackend invariant)
- Uses standard Web Crypto API (respects WebCryptoOnly invariant)

Rejected alternatives:
- JSON Export/Import: Requires manual file transfer, less convenient
- QR Code-only: Limited to devices with cameras, size constraints
- No Sync: Poor UX for multi-device users

### Characteristic Space (C.16)
{"complexity": "medium", "security": "high (passphrase-encrypted)", "ux": "good (shareable URL)", "offline_capable": "true (after URL received)", "platform_risk": "low (standard browser APIs)"}

## Consequences
Implementation requirements:
1. Export flow: Encrypt config → Generate URL → Display URL + optional QR code
2. Import flow: Detect #config hash on page load → Prompt for passphrase → Decrypt → Import
3. Security: Passphrase input, clear error on decrypt failure
4. UX: Clear export/import buttons in Settings

Trade-offs:
- Users must establish shared passphrase out-of-band
- URL length limits apply (but validated to fit)
- Receiver must enter passphrase (extra step, but provides security)

Next steps:
1. Implement crypto utilities (encrypt/decrypt with passphrase)
2. Add Export button to Settings
3. Add import detection on app initialization
4. Create QR code display option (hybrid UX)
5. E2E tests for export/import flow
