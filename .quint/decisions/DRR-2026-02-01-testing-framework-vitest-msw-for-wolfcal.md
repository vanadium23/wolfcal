---
type: DRR
winner_id: vitest-msw-for-component-and-api-testing
created: 2026-02-01T16:51:27Z
content_hash: 5ddab68e506b7e1c70faca2bf3d01a57
---

# Testing Framework: Vitest + MSW for WolfCal

## Context
WolfCal React + Vite + TypeScript project has no automated tests. Need a testing framework for unit/component testing and Google Calendar API mocking. Requirements: (1) Vite-native ESM support, (2) Fast test execution, (3) Mock fetch() API for Google Calendar, (4) TypeScript support.

## Decision
**Selected Option:** vitest-msw-for-component-and-api-testing

We decided to use Vitest with MSW (Mock Service Worker) as our testing framework. Vitest is the Vite-native test runner with zero-config ESM support. MSW provides fetch() interception for mocking Google Calendar API responses.

## Rationale
Vitest + MSW achieved the highest R_eff (1.00) based on internal validation evidence. 7/7 tests passed proving: (1) Vite-native ESM support works, (2) MSW successfully intercepts Google Calendar API endpoints, (3) OAuth token mocking confirmed, (4) Fast execution (2.3s). Chose minimal setup over full stack (RTL + Playwright) to prioritize speed of iteration and reduce complexity. RTL (R:0.90) was rejected due to dependency overhead and sufficient coverage with Vitest assertions. Playwright (R:1.00) was rejected due to heavier setup and browser dependencies; E2E testing can be added later if needed.

### Characteristic Space (C.16)
{"evidence_quality": "internal", "validation_method": "test_execution", "risk_tolerance": "low"}

## Consequences
(1) Testing infrastructure is in place: vitest.config.ts, MSW handlers for Google Calendar API, test scripts added to package.json. (2) npm run test:run executes all tests in ~2.3s. (3) Google Calendar API mocking is functional via MSW. (4) No user-centric queries (RTL) or E2E tests (Playwright) - these can be added later if testing needs evolve. (5) Next step: Write actual tests for WolfCal components and sync logic. (6) Revisit decision if: testing proves insufficient for user scenarios, or E2E coverage becomes critical.
