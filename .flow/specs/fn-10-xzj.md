# fn-10-xzj Fix Export Settings to Exclude Tokens - Require Re-auth on Import

## Overview
Fix the export settings functionality to exclude access/refresh tokens to prevent race conditions when syncing across multiple devices. Users will need to re-authenticate on the new device after importing settings.

## Problem
The current export functionality includes access/refresh tokens in the ConfigBundle, which creates race conditions:
- Tokens have limited lifetimes (access tokens expire in ~1 hour)
- Both devices could try to refresh tokens simultaneously
- Google's OAuth system may invalidate tokens when used from multiple locations
- Device-specific master keys create decryption complexity

## Scope
**Priority: Core export/import refactoring**
- Modify ConfigBundle interface to remove token fields
- Update exportConfig() to exclude tokens
- Update importConfig() to handle accounts without tokens
- Create re-authentication flow for imported accounts
- Update UI to set proper user expectations

**Coverage Level: Critical flows**
- Export serialization excludes sensitive tokens
- Import creates placeholder accounts requiring re-auth
- UI informs users of re-authentication requirement
- Re-auth flow integrates with existing OAuth

**Framework**
- No backend required (respects NoBackend invariant)
- Uses existing IndexedDB and Web Crypto patterns

## Approach

### Phase 1: Modify Data Structures
**File: `src/lib/config/serializer.ts`**
- Update `ConfigBundle` interface:
  - Remove `accessToken` and `refreshToken` fields
  - Add `needsReauth: true` flag to account export
  - Keep `email`, `createdAt`, and other metadata
- Keep `clientId` and `clientSecret` in oauthCredentials (these are app credentials, not user tokens)

### Phase 2: Modify Export Logic
**File: `src/lib/config/serializer.ts`**
- Update `exportConfig()` function (lines 218-284):
  - Remove token decryption logic (lines 225-243)
  - Export only account metadata
  - Remove `decryptToken` import (no longer needed)

### Phase 3: Modify Import Logic
**File: `src/lib/config/serializer.ts`**
- Update `importConfig()` - Replace mode (lines 307-358):
  - Create accounts with empty placeholder tokens
  - Set `tokenExpiry: 0` to force re-auth
- Update `importConfig()` - Merge mode (lines 359-417):
  - Similar changes for merge mode
  - Preserve existing tokens if account exists

### Phase 4: Create Re-authentication Flow
**File: `src/pages/Settings.tsx`**
- Add detection for accounts needing re-auth:
  - Check if `encryptedAccessToken` is empty or `tokenExpiry === 0`
  - Show prompt on Settings page after import
- Integrate with existing OAuth flow for re-authentication

**File: `src/components/ImportConfiguration.tsx`**
- Update success message to show re-auth requirement
- Add re-authentication step after import
- Provide "Authenticate" button for each account needing re-auth

### Phase 5: Update UI Components
**File: `src/components/ExportConfiguration.tsx`**
- Update modal text to clarify tokens are NOT exported
- Update result modal with re-auth warning

### Phase 6: Update Tests
**File: `src/test/config/serializer.test.ts`**
- Update export tests to verify tokens are excluded
- Update import tests for token-free expectations
- Add tests for re-authentication flag

## Quick commands
- `npm run dev` - Run dev server to test export/import flow
- `npm run test` - Run unit tests for serializer
- Manual test: Export config → verify no tokens → import → verify re-auth prompt

## Acceptance
- [ ] ConfigBundle interface updated to exclude tokens
- [ ] exportConfig() excludes access/refresh tokens
- [ ] exportConfig() sets `needsReauth: true` flag
- [ ] importConfig() creates accounts with empty tokens
- [ ] importConfig() sets `tokenExpiry: 0` for re-auth
- [ ] Settings page detects accounts needing re-auth
- [ ] Re-auth prompt appears after import
- [ ] OAuth flow works for imported accounts
- [ ] Export UI clarifies tokens are not exported
- [ ] Import UI shows re-auth requirement
- [ ] Unit tests updated and passing
- [ ] E2E test for re-authentication flow

## References
- Current serializer: `src/lib/config/serializer.ts`
- Export component: `src/components/ExportConfiguration.tsx`
- Import component: `src/components/ImportConfiguration.tsx`
- Settings page: `src/pages/Settings.tsx`
- Existing tests: `src/test/config/serializer.test.ts`
