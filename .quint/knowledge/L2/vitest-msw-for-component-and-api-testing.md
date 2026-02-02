---
scope: WolfCal React + Vite + TypeScript project
kind: system
content_hash: 04ba7dee3a3a7a82c72fdd75f4e351b5
---

# Hypothesis: Vitest + MSW for component and API testing

Use Vitest (Vite's native test runner) with MSW (Mock Service Worker) for component testing and Google Calendar API mocking. Vitest provides fast unit testing with ESM support and matches the Vite build tool. MSW intercepts fetch requests to mock Google Calendar API responses in both unit tests and E2E scenarios.

## Rationale
{"anomaly": "No automated tests exist", "approach": "Vitest for unit/component tests with MSW for API mocking. Native Vite integration, fast ESM support, zero config.", "alternatives_rejected": ["Jest (Vite config conflicts)", "Custom mocking infrastructure"]}