# fn-12-zlg Regression Suite and Bug Fixes

## Overview

Create a comprehensive regression test suite for all known bugs in WolfCal, then systematically fix each bug. This epic ensures that bug fixes are verified by tests that prevent regressions.

### Known Bugs to Address

| Bug ID | Description | Area | Severity |
|--------|-------------|------|----------|
| BUG-1 | Event added does not sync to destination | Sync | High |
| BUG-2 | Event created locally, deleted from Google, stays as "unsync" in UI | Sync/Delete | High |
| BUG-3 | Accepting or declining event does not update anything | Event Actions | High |
| BUG-4 | QR code shared URL not readable by camera (low resolution) | QR Code/Export | Medium |
| BUG-5 | UI not updating after sync changes | UI State | Medium |
| BUG-6 | Calendar list display issues (wrong calendars, duplicates) | Calendar Management | Medium |

## Scope

### In Scope
- Writing regression tests for each identified bug using Vitest
- Fixing all 6 bugs listed above
- Ensuring CI/CD runs regression tests and blocks on failure
- Adding test coverage for sync engine, event operations, and QR code generation

### Out of Scope
- New features unrelated to bug fixes
- Performance optimizations (unless directly related to a bug)
- UI redesigns (unless required for a bug fix)

## Approach

### Phase 1: Regression Suite (Write Failing Tests First)

For each bug, write a test that:
1. Reproduces the bug scenario
2. Expects the correct behavior
3. Will fail until the bug is fixed

### Phase 2: Bug Fixes

After all regression tests are written, fix each bug systematically:
1. Fix BUG-1: Event sync to destination
2. Fix BUG-2: Delete propagation from Google to local
3. Fix BUG-3: Accept/decline event functionality
4. Fix BUG-4: QR code resolution improvement
5. Fix BUG-5: UI update after sync
6. Fix BUG-6: Calendar list display

### Test Strategy

- **Unit Tests**: Test individual functions (sync logic, QR code generation)
- **Integration Tests**: Test component interactions (EventPopover, CalendarManagement)
- **MSW Mocks**: Mock Google Calendar API responses for deterministic testing
- **Test Files**:
  - `src/test/sync/bugs-sync.test.ts` - BUG-1, BUG-2
  - `src/test/components/bugs-event-actions.test.tsx` - BUG-3
  - `src/test/components/bugs-qr-code.test.tsx` - BUG-4
  - `src/test/components/bugs-ui-state.test.tsx` - BUG-5
  - `src/test/components/bugs-calendar-list.test.tsx` - BUG-6

## Detailed Bug Analysis

### BUG-1: Event Added Does Not Sync to Destination

**Symptom**: Events created locally are not appearing in Google Calendar

**Files to Investigate**:
- `src/lib/sync/processor.ts` - Queue processing logic
- `src/lib/sync/engine.ts` - Sync engine
- `src/lib/api/calendar.ts` - Google Calendar API client

**Test Scenarios**:
- Create event while online → verify API call is made
- Create event while offline → verify queued for sync
- Process queue → verify event appears in Google Calendar

### BUG-2: Event Deleted from Google Stays as "Unsync" in UI

**Symptom**: When an event is deleted from Google Calendar web UI, it still shows in WolfCal with "unsync" status

**Files to Investigate**:
- `src/lib/sync/engine.ts:238-243` - Cancelled event handling
- `src/lib/sync/engine.ts:245-275` - Tombstone handling

**Test Scenarios**:
- Sync with cancelled event → verify local deletion
- Verify tombstone is removed after successful deletion
- Verify UI updates to remove the deleted event

### BUG-3: Accepting/Declining Event Does Nothing

**Symptom**: Clicking Accept/Decline buttons in EventPopover doesn't update the event response status

**Files to Investigate**:
- `src/components/EventPopover.tsx:95-168` - handleResponse function
- `src/lib/api/calendar.ts:375-410` - respondToInvitation method

**Test Scenarios**:
- Accept event online → verify API call and local update
- Decline event online → verify API call and local update
- Accept event offline → verify queued for sync
- Verify attendee responseStatus is updated correctly

### BUG-4: QR Code Not Readable by Camera (Low Resolution)

**Symptom**: QR codes generated for config export are too small/low resolution for mobile cameras to read

**Files to Investigate**:
- `src/components/ExportConfiguration.tsx:259-266` - QRCodeSVG props

**Current Settings**:
- Size: 200x200 pixels
- Error correction: "L" (lowest)
- Margin: included

**Test Scenarios**:
- Verify QR code size is at least 300x300 pixels
- Verify error correction level is "M" or "H" for better scanability
- Test QR code readability with various payload sizes

### BUG-5: UI Not Updating After Sync Changes

**Symptom**: UI shows stale data after sync operations complete

**Files to Investigate**:
- `src/components/SyncStatusBar.tsx` - Status updates
- `src/lib/sync/scheduler.ts` - Auto-sync triggers
- `src/components/Calendar.tsx` - Event display updates

**Test Scenarios**:
- After sync completes → verify calendar refreshes
- After pending change processes → verify UI updates
- Verify event list updates without requiring page reload

### BUG-6: Calendar List Display Issues

**Symptom**: Calendar list shows wrong calendars or duplicates

**Files to Investigate**:
- `src/components/CalendarManagement.tsx` - Calendar list rendering
- `src/lib/sync/engine.ts` - Calendar sync logic

**Test Scenarios**:
- After OAuth → verify correct calendars are loaded
- After account removal → verify calendars are removed from list
- After sync → verify no duplicate calendars appear

## Quick commands
```bash
# Run all regression tests
npm test -- src/test/sync/bugs-sync.test.ts src/test/components/bugs-*.test.tsx

# Run specific bug test suite
npm test -- src/test/sync/bugs-sync.test.ts

# Run all tests with coverage
npm test -- --coverage

# Run tests in CI mode
npm test -- --run
```

## Acceptance

- [ ] All 6 regression tests written and failing (before fixes)
- [ ] BUG-1: Events created locally sync to Google Calendar
- [ ] BUG-2: Events deleted from Google are removed from local UI
- [ ] BUG-3: Accept/Decline buttons update event response status
- [ ] BUG-4: QR codes are scannable by mobile cameras (min 300x300, error correction M)
- [ ] BUG-5: UI updates automatically after sync operations
- [ ] BUG-6: Calendar list displays correct calendars without duplicates
- [ ] All regression tests passing after fixes
- [ ] CI/CD runs regression tests and blocks merges on failure
- [ ] Test coverage for sync engine >= 80%
- [ ] No regressions when running full test suite

## References

- Existing test infrastructure: `src/test/`
- Sync engine: `src/lib/sync/engine.ts`
- Event popover: `src/components/EventPopover.tsx`
- QR export: `src/components/ExportConfiguration.tsx`
- CI/CD: `.github/workflows/deploy.yml`
- MSW handlers: `src/test/mocks/handlers.ts`
