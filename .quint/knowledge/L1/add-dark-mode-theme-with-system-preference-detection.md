---
scope: All modern browsers supporting CSS custom properties and prefers-color-scheme
kind: system
content_hash: 2596b1c1f4edd456cc112147f9b5998d
---

# Hypothesis: Add Dark Mode Theme with System Preference Detection

Implement dark mode theme throughout the application. Create a comprehensive color scheme (backgrounds, text, borders, calendar events) for dark mode. Detect user's system preference using `prefers-color-scheme` CSS media query. Add manual toggle in settings that persists to IndexedDB. Ensure all components (FullCalendar, modals, forms) have proper dark mode styles. Use CSS custom properties for easy theme switching.

## Rationale
{"anomaly": "No dark mode support - users with dark system preference experience bright, jarring interface", "approach": "Implement CSS custom property based theming with system preference detection", "alternatives_rejected": ["Separate dark mode build (doubles bundle size)", "Third-party theme library (unnecessary dependency for theming)"]}