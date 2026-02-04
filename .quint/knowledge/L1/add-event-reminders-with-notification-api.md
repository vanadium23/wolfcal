---
scope: Browsers supporting Web Notifications API with HTTPS (required for notifications)
kind: system
content_hash: 071df45a878fc81a72ce81f0996539ea
---

# Hypothesis: Add Event Reminders with Notification API

Implement browser-based event reminders using the Web Notifications API. Allow users to set reminders (e.g., 5 min, 15 min, 1 hour, 1 day before) when creating/editing events. Store reminder settings in IndexedDB. Create a background sync/Service Worker that checks for upcoming reminders even when the app is closed (optional). Show browser notifications when reminders trigger. Include a "snooze" feature.

## Rationale
{"anomaly": "Missing core calendar feature - users have no way to receive reminders for upcoming events", "approach": "Use native browser notifications with Service Worker for background checking", "alternatives_rejected": ["Email reminders (requires backend server)", "Push notifications (requires service subscription and server)", "In-app only (useless if app closed)"]}