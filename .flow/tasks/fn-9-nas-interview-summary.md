# fn-9-nas Interview Summary

## Interview Questions & Decisions

### Q1: Should the URL hash export include OAuth tokens?
**Answer:** Yes, encrypt tokens with passphrase

**Rationale:** Users expect full configuration transfer including OAuth credentials. The passphrase encryption provides security - even if the URL is logged or intercepted, the tokens remain protected without the passphrase.

### Q2: What QR code library should be used?
**Answer:** None - URL copy only

**Rationale:** QR code adds complexity with library dependencies. URL copy functionality is sufficient for most use cases (messaging apps, email). QR can be added later if there's user demand.

### Q3: What should the merge strategy be?
**Answer:** Prompt user to choose

**Rationale:** Gives users control over their configuration. "Replace all" is good for new device setup. "Merge" preserves existing settings when adding another account or syncing preferences.

## Codebase Architecture Findings

### Storage Locations
| Data Type | Storage | Key/Store |
|-----------|---------|-----------|
| OAuth Tokens | IndexedDB | `wolfcal.accounts` |
| Sync Settings | localStorage | `wolfcal:syncSettings` |
| Calendar Filters | localStorage | `calendar-filters` |
| Last Used Calendar | localStorage | `wolfcal:lastUsedCalendarId` |

### Existing Encryption
- WolfCal already has Web Crypto API encryption in `src/lib/auth/encryption.ts`
- Uses AES-GCM for token encryption at rest
- Encryption keys stored in separate IndexedDB (`wolfcal-encryption`)

### Implementation Approach
1. **Task 1 (Crypto)**: Create NEW encryption functions for transfer (separate from at-rest encryption)
   - User-provided passphrase via PBKDF2 key derivation
   - Different from existing at-rest encryption keys

2. **Task 2 (Serialization)**: Read from both IndexedDB and localStorage
   - Must handle async IndexedDB operations
   - Bundle into single Config object

3. **Task 3 (Export UI)**: Add to Settings component
   - Modal for passphrase input
   - Result modal with URL copy

4. **Task 4 (Import UI)**: Add to App.tsx mount
   - Full-screen modal for import flow
   - Merge strategy selection after decrypt

5. **Task 5 (E2E Tests)**: Playwright tests for complete flow

## ConfigBundle Structure
```typescript
interface ConfigBundle {
  version: 1;
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
  calendarFilters: Record<string, boolean>;
  lastUsedCalendarId?: string;
  exportedAt: number;
}
```
