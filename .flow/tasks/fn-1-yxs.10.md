# fn-1-yxs.10 Add exponential backoff retry logic

## Description
Add exponential backoff retry logic to API client for handling rate limiting and transient errors from Google Calendar API.

**Size:** S
**Files:** src/lib/api/retry.ts, src/lib/api/calendar.ts (update)

## Approach

Create retry wrapper function with exponential backoff:
- Initial delay: 1 second
- Max delay: 60 seconds
- Max retries: 5
- Backoff multiplier: 2x
- Add jitter (random ±20%) to prevent thundering herd

Retry on:
- 429 (Too Many Requests) - rate limit
- 500, 502, 503, 504 (server errors)
- Network timeouts

Do NOT retry on:
- 401 (handled by token refresh)
- 403 (permission denied)
- 400, 404 (client errors)

Wrap all CalendarClient API methods with retry logic.

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:30`:
- "Rate limiting: Exponential backoff retry strategy"

Google Calendar API quotas: https://developers.google.com/calendar/api/guides/quota
## Acceptance
- [ ] src/lib/api/retry.ts exports retryWithBackoff() wrapper function
- [ ] Retry logic implements exponential backoff (1s, 2s, 4s, 8s, 16s)
- [ ] Jitter added to delays (±20% randomization)
- [ ] Max retries set to 5 attempts
- [ ] Retries on 429, 500, 502, 503, 504 status codes
- [ ] Does NOT retry on 401, 403, 400, 404
- [ ] Network timeout errors trigger retry
- [ ] CalendarClient methods wrapped with retryWithBackoff
- [ ] Retry attempts logged to console
- [ ] Final failure throws error after max retries exhausted
## Done summary
Implemented exponential backoff retry logic for Google Calendar API client with configurable retry parameters, jitter, and automatic retries on transient errors (429, 5xx) while skipping client errors (400, 401, 403, 404).
## Evidence
- Commits: 9b7d102654c9e101e69e6e59575591dec6ba0641
- Tests: Visual inspection - no test suite configured yet
- PRs: