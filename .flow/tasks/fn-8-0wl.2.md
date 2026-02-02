# fn-8-0wl.2 Write tests for RefreshButton sync behavior

## Description
TBD

## Acceptance
- [ ] TBD

## Done summary
# RefreshButton Component Tests - Complete

Created comprehensive test suite for RefreshButton component with 13 passing tests covering all sync behavior and UI states.

## Test Coverage

### Render States (4 tests)
- Show refresh button when online and not syncing
- Show syncing state while syncing (with spinner)
- Be disabled when offline
- Be disabled while syncing

### Sync Behavior (9 tests)
- Process queue first when clicked
- Sync all accounts after processing queue
- Call onSyncStart when sync begins
- Call onSyncComplete when sync finishes successfully
- Call onSyncError when sync fails
- Re-enable button after sync completes
- Continue syncing other accounts if one fails
- Not trigger sync when offline and button is clicked
- Not trigger sync when already syncing

## Technical Details

**Test file:** `src/test/components/RefreshButton.test.tsx`

**Key technical challenges solved:**
1. **Mocking complex dependencies** - Used `vi.hoisted()` to create mock functions before module imports
2. **Class constructor mocking** - SyncEngine required a proper class mock, not `vi.fn()`
3. **userEvent integration** - Used `userEvent.setup()` for realistic user interactions
4. **Async state testing** - Used `waitFor()` with increased timeout for async operations

**Mock setup:**
```typescript
const { mockUseOnlineStatus, mockProcessQueue, mockSyncAccount, mockGetAllAccounts } = vi.hoisted(() => ({
  mockUseOnlineStatus: vi.fn(() => ({ isOnline: true })),
  mockProcessQueue: vi.fn(),
  mockSyncAccount: vi.fn(),
  mockGetAllAccounts: vi.fn(),
}))

vi.mock('../../lib/sync/engine', () => ({
  SyncEngine: class {
    syncAccount = mockSyncAccount
  },
}))
```

**Result:** 13/13 tests passing (100%)
## Evidence
- Commits:
- Tests: src/test/components/RefreshButton.test.tsx - 13 tests, all passing, Tests cover: render states, sync behavior, online/offline handling, error cases, concurrent click prevention
- PRs: