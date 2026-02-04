---
scope: Same as existing export/import feature (Web Crypto API, modern browsers)
kind: system
content_hash: b159f6f4fc4f6d414e46e920dfcc4501
---

# Hypothesis: Add Calendar Sharing via Encrypted Configuration URL

Enable sharing calendar visibility (read-only) with other WolfCal users. Create a "share calendar" feature that exports an encrypted configuration bundle (similar to current QR code export) but with read-only tokens and filtered calendar selection. Generate a shareable URL that recipients can import to view selected calendars. Include expiration dates and ability to revoke access by regenerating the share URL.

## Rationale
{"anomaly": "Users cannot collaborate or share their calendar with others while maintaining local-first privacy", "approach": "Extend existing encrypted export system to create shareable, time-limited read-only access tokens", "alternatives_rejected": ["Google Calendar native sharing (requires additional OAuth scopes and backend)", "Public calendar publishing (no access control)", "Real-time collaboration (violates local-first architecture, requires backend)"]}