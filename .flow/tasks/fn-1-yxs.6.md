# fn-1-yxs.6 Add token encryption with Web Crypto API

## Description
Encrypt OAuth tokens using Web Crypto API before storing in IndexedDB. Generate encryption key and implement encrypt/decrypt functions.

**Size:** S
**Files:** src/lib/auth/encryption.ts, src/lib/auth/oauth.ts (update)

## Approach

Use Web Crypto API (SubtleCrypto):
- Generate AES-GCM encryption key (256-bit) on first app load
- Store encryption key in IndexedDB (non-extractable key wrapped format)
- Encrypt access_token and refresh_token before IndexedDB storage
- Decrypt tokens when needed for API calls

Algorithm: AES-GCM with random IV per encryption operation.

Update oauth.ts to encrypt tokens after receiving from Google before storing in IndexedDB.

## Key Context

Per spec at `.flow/specs/fn-1-yxs.md:36`:
- "Encrypt OAuth tokens using Web Crypto API before IndexedDB storage"

Security consideration: Encryption protects against casual IndexedDB inspection but not sophisticated attacks (key stored in same browser profile). Primary goal is preventing accidental token exposure.

Web Crypto API docs: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
## Acceptance
- [ ] src/lib/auth/encryption.ts exports generateKey() function
- [ ] generateKey() creates AES-GCM 256-bit key using crypto.subtle.generateKey()
- [ ] Encryption key stored in IndexedDB (wrapped/non-extractable)
- [ ] encryptToken(plaintext) function encrypts using AES-GCM with random IV
- [ ] decryptToken(ciphertext) function decrypts and returns plaintext
- [ ] IV prepended to ciphertext for storage (combined format)
<!-- Updated by plan-sync: fn-1-yxs.3 exports standalone functions, not db.accounts pattern -->
- [ ] oauth.ts updated to encrypt access_token and refresh_token before calling addAccount()
- [ ] Tokens stored as encrypted strings in IndexedDB
- [ ] Decryption works: encrypted token can be decrypted back to original
## Done summary
Implemented token encryption using Web Crypto API with AES-GCM 256-bit encryption. Created encryption module with generateKey(), encryptToken(), and decryptToken() functions. Updated App.tsx to encrypt OAuth tokens before storing in IndexedDB.
## Evidence
- Commits: 34ca4f6bfaaccb82c1291bed844e0fae0011a9e4
- Tests: npm run build
- PRs: