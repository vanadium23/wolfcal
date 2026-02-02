---
scope: WolfCal application, all browsers, requires user to physically transfer file between devices
kind: system
content_hash: d9435d5fd2c932bf3a30880bc7bec5a5
---

# Hypothesis: Manual JSON Export/Import

Configuration export/import feature where users can download their configuration as a JSON file and upload it on another device. The config would include OAuth credentials (clientId, clientSecret), calendar visibility settings, and user preferences.

## Rationale
{"anomaly": "No way to transfer configuration between devices", "approach": "Simple file-based export/import that users manually transfer", "alternatives_rejected": ["No solution (each device configured separately)", "Cloud sync (requires backend server)"]}