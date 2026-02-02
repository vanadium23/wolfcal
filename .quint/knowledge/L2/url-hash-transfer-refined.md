---
scope: WolfCal application, limited by URL length (2KB-8KB for hash), requires URL-safe encoding. OAuth credentials encrypted with user-provided passphrase; receiver must enter same passphrase to decrypt.
kind: system
content_hash: encrypted-refined
---

# Hypothesis: URL Hash Transfer (Refined - Encrypted)

Configuration transfer via URL fragment encoding with encryption. Configuration is serialized, encrypted with user-provided passphrase (using AES-GCM via Web Crypto API), then base64-encoded into the URL hash. The receiver opens the URL and is prompted to enter the decryption passphrase. OAuth credentials are never stored in plaintext in the URL.

## Rationale
{"anomaly": "No way to transfer configuration between devices", "approach": "Encrypt credentials with user passphrase before encoding in URL hash. Receiver enters passphrase to decrypt. Solves security issue of credentials in URL.", "alternatives_rejected": ["QR code (requires camera)", "File export (requires manual transfer)", "Plaintext URL (security risk)"]}