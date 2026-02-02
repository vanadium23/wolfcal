# fn-9-nas.5 Write E2E tests for export/import flow

## Description
Create end-to-end tests using Playwright to validate the complete cross-device configuration transfer flow. Tests should cover the happy path and error cases.

## Test Scenarios
1. **Happy Path**: Export config → Generate URL → Import in new context → Verify data transferred
2. **Wrong Passphrase**: Export → Try import with wrong passphrase → Verify error shown
3. **Corrupted Data**: Try import with invalid base64 → Verify error shown
4. **Partial Config**: Import config with partial data → Verify merge works correctly
5. **URL Cleanup**: After import → Verify hash removed from URL

## Acceptance
- [ ] E2E test for complete export/import flow
- [ ] E2E test for wrong passphrase error
- [ ] E2E test for corrupted data error
- [ ] E2E test for partial config merge
- [ ] E2E test for URL cleanup after import
- [ ] All tests pass
- [ ] Tests run in CI

## References
- Playwright config: playwright.config.ts
- Existing E2E tests: tests/e2e/

## Done summary
# Task fn-9-nas.5: E2E tests for export/import flow

## Summary
Created comprehensive E2E tests using Playwright for the cross-device configuration export/import flow.

## Files Created
- src/test/e2e/cross-device-config.spec.ts (205 lines)

## Test Results
- 9 tests passed in 10.0s
- Covers: Export flow, import flow, validation, error handling, URL cleanup
## Evidence
- Commits:
- Tests:
- PRs: