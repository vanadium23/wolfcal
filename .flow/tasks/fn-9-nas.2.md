# fn-9-nas.2 Implement configuration serialization/deserialization

## Description
Create functions to serialize and deserialize WolfCal configuration data. The config should include OAuth credentials (tokens from IndexedDB), calendar settings (calendar IDs, selected calendars from localStorage), and user preferences (sync interval, etc.).

## Technical Details
- Read from multiple sources:
  - IndexedDB (`wolfcal.accounts` store): OAuth tokens, account data
  - localStorage (`calendar-filters`): Calendar visibility
  - localStorage (`wolfcal:syncSettings`): Sync settings
  - localStorage (`wolfcal:lastUsedCalendarId`): Last used calendar
- Create structured config object with:
  - OAuth tokens (access_token, refresh_token, expires_at) - from IndexedDB
  - Account data (email, color, etc.)
  - Calendar list and selected calendars (from filters)
  - User preferences (syncInterval, autoSync)
- Serialize to JSON string for encryption
- Deserialize and validate on import

## Data Structure
```typescript
interface ConfigBundle {
  version: 1; // For future migration
  accounts: Array<{
    email: string;
    encryptedAccessToken: string;
    encryptedRefreshToken: string;
    tokenExpiry: number;
    color?: string;
  }>;
  syncSettings: {
    autoSync: boolean;
    syncInterval: number;
  };
  calendarFilters: Record<string, boolean>; // calendarId -> visible
  lastUsedCalendarId?: string;
  exportedAt: number; // timestamp
}
```

## Acceptance
- [ ] `exportConfig(): Promise<ConfigBundle>` function
- [ ] `importConfig(configBundle: ConfigBundle, mode: 'replace' | 'merge'): Promise<void>` function
- [ ] Reads from both IndexedDB and localStorage
- [ ] Handles missing/invalid data gracefully
- [ ] Validation for required fields (version, accounts array)
- [ ] Supports both 'replace' and 'merge' modes
- [ ] Merge mode preserves existing valid data
- [ ] Replace mode overwrites all settings
- [ ] Unit tests for serialization/deserialization

## Done summary
# Task fn-9-nas.2: Configuration serialization/deserialization

## Summary
Implemented configuration serialization and deserialization for cross-device transfer. Created a ConfigBundle structure that reads from both IndexedDB (accounts) and localStorage (settings, filters).

## Files Created
- src/lib/config/serializer.ts (284 lines)
- src/test/config/serializer.test.ts (329 lines)

## Implementation Details
- exportConfig(): Reads accounts from IndexedDB, sync settings/filters from localStorage
- importConfig(bundle, mode): 'replace' clears all, 'merge' preserves existing
- ConfigBundle v1 structure for future migration support
- validateConfigBundle(): Validates structure before import

## Test Results
19 tests passed covering:
- Export with various account configurations
- Serialize/deserialize round-trip
- Import in replace mode (clears all existing)
- Import in merge mode (smart merge)
- Error handling for invalid bundles
## Evidence
- Commits:
- Tests: file, test_count, passed, failed
- PRs: