# Task fn-9-nas.1: Web Crypto utilities for AES-GCM encryption/decryption

## Summary
Implemented Web Crypto API utilities for passphrase-based encryption/decryption of configuration data. Created a new `src/lib/config/` module with transfer encryption capabilities separate from the existing at-rest token encryption.

## Files Created
- `src/lib/config/transferCrypto.ts` - Core crypto utilities
- `src/lib/config/index.ts` - Module exports
- `src/test/config/transferCrypto.test.ts` - Comprehensive unit tests

## Implementation Details
- **encrypt(data, passphrase)**: Encrypts string data with user-provided passphrase
  - Uses PBKDF2 with 100,000 iterations for key derivation
  - AES-GCM 256-bit encryption
  - Random salt and IV for each encryption
  - Returns base64-encoded JSON with salt, iv, and ciphertext

- **decrypt(encryptedData, passphrase)**: Decrypts data encrypted with encrypt()
  - Derives key from passphrase and salt
  - Validates and decrypts ciphertext
  - Throws user-friendly error on failure

- **validatePassphrase(encryptedData, passphrase)**: Validates passphrase without decrypting

## Test Results
17 tests passed covering:
- Encrypt/decrypt round-trip with various data types
- Random IV/salt produces different ciphertext
- JSON, empty strings, special characters, long data
- Wrong passphrase error handling
- Corrupted/invalid data error handling
- URL-safe base64 output
- Compact output for URL use (964 bytes for typical config)

## Technical Notes
- OWASP-compliant PBKDF2 iterations (100,000)
- Uses standard Web Crypto API (no external dependencies)
- Separate from existing `src/lib/auth/encryption.ts` which uses stored keys
- Encrypted output is URL-safe for hash fragment use
