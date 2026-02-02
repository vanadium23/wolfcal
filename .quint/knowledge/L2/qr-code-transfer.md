---
scope: WolfCal application, requires devices with cameras for scanning. Transfer limited to: OAuth credentials (clientId, clientSecret), account objects with encrypted access/refresh tokens, and calendar sync preferences. Estimated size: ~500-1500 bytes using JSON + compression.
kind: system
content_hash: 5bbaf4d5201564c8e290372a0439a78f
---

# Hypothesis: QR Code Transfer (Refined)

Configuration transfer via QR code encoding with optimized data structure. Users generate a QR code containing ONLY essential configuration: OAuth credentials (clientId, clientSecret), account objects with encrypted access/refresh tokens, and enabled calendar IDs for sync. Data is JSON-encoded, optionally compressed, and base64-encoded to fit within QR capacity (~3KB).

## Rationale
{"anomaly": "No way to transfer configuration between devices", "approach": "Minimize data to essentials: OAuth credentials (clientId, clientSecret), accounts with encrypted tokens, enabled calendar IDs. Estimated ~500-1500 bytes using JSON + optional compression. Fits within 3KB QR limit.", "alternatives_rejected": ["Manual JSON export (requires file transfer)", "URL-based (limited by URL length)", "Full config export (too large for QR)"]}