---
date: 2026-02-01
id: 2026-02-01-audit_report-vitest-msw-for-component-and-api-testing.md
type: audit_report
target: vitest-msw-for-component-and-api-testing
verdict: pass
assurance_level: L2
carrier_ref: auditor
valid_until: 2026-05-02
content_hash: 08e84c71f904b61e5c5c7774f9af6f5c
---

WLNK: None - Self Score 1.00 with no dependencies. Evidence: Internal tests (7/7 passed) with CL3 (same context). MSW handlers verified for Google Calendar API mocking (OAuth, calendar list, events). Vitest native ESM support confirmed. R_eff: 1.00. Bias Check: Low - Vite-native test runner is standard choice, not a pet idea. No "Not Invented Here" bias observed.