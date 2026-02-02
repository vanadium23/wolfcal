/**
 * Configuration transfer encryption using Web Crypto API
 *
 * Encrypts configuration data with a user-provided passphrase for cross-device transfer.
 * Uses PBKDF2 for key derivation and AES-GCM for authenticated encryption.
 */

// Configuration for PBKDF2 key derivation
const PBKDF2_CONFIG = {
  algorithm: 'PBKDF2' as const,
  hash: 'SHA-256' as const,
  iterations: 100000, // OWASP recommended minimum as of 2024
  saltLength: 16, // 128 bits
};

// Configuration for AES-GCM encryption
const AES_CONFIG = {
  algorithm: 'AES-GCM' as const,
  keyLength: 256, // bits
  ivLength: 12, // bytes (96 bits, recommended for GCM)
};

/**
 * Result structure for encrypted data
 * Contains all components needed for decryption
 */
interface EncryptedData {
  salt: string; // base64-encoded salt
  iv: string; // base64-encoded IV
  data: string; // base64-encoded ciphertext
}

/**
 * Derives an encryption key from a passphrase using PBKDF2
 * @param passphrase - User-provided passphrase
 * @param salt - Salt for key derivation (base64-encoded)
 * @returns CryptoKey for AES-GCM encryption/decryption
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);

  // Import passphrase as a key
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    passphraseBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive the actual encryption key
  return crypto.subtle.deriveKey(
    {
      name: PBKDF2_CONFIG.algorithm,
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_CONFIG.iterations,
      hash: PBKDF2_CONFIG.hash,
    },
    passphraseKey,
    {
      name: AES_CONFIG.algorithm,
      length: AES_CONFIG.keyLength,
    },
    false, // key is not extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts data with a passphrase
 * @param data - String data to encrypt (typically JSON)
 * @param passphrase - User-provided passphrase
 * @returns Base64-encoded string containing salt + iv + ciphertext
 */
export async function encrypt(data: string, passphrase: string): Promise<string> {
  // Generate random salt for key derivation
  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_CONFIG.saltLength));

  // Derive encryption key from passphrase
  const key = await deriveKey(passphrase, salt);

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(AES_CONFIG.ivLength));

  // Encode data to bytes
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: AES_CONFIG.algorithm,
      iv,
    },
    key,
    dataBytes
  );

  // Encode components as base64
  const saltB64 = btoa(String.fromCharCode(...salt));
  const ivB64 = btoa(String.fromCharCode(...iv));
  const dataB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));

  // Store as structured JSON for easy parsing
  const encrypted: EncryptedData = {
    salt: saltB64,
    iv: ivB64,
    data: dataB64,
  };

  // Return as base64-encoded JSON for URL hash
  return btoa(JSON.stringify(encrypted));
}

/**
 * Decrypts data with a passphrase
 * @param encryptedData - Base64-encoded string from encrypt()
 * @param passphrase - User-provided passphrase
 * @returns Decrypted string data
 * @throws Error if decryption fails (wrong passphrase or corrupted data)
 */
export async function decrypt(encryptedData: string, passphrase: string): Promise<string> {
  try {
    // Decode base64 to get structured data
    const encryptedJson = atob(encryptedData);
    const encrypted: EncryptedData = JSON.parse(encryptedJson);

    // Decode components from base64
    const salt = Uint8Array.from(atob(encrypted.salt), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(encrypted.data), c => c.charCodeAt(0));

    // Derive decryption key from passphrase
    const key = await deriveKey(passphrase, salt);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: AES_CONFIG.algorithm,
        iv,
      },
      key,
      ciphertext
    );

    // Decode bytes to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    // Throw a more user-friendly error
    throw new Error('Decryption failed. Check your passphrase and try again.');
  }
}

/**
 * Validates a passphrase by attempting to decrypt data
 * @param encryptedData - Base64-encoded encrypted data
 * @param passphrase - Passphrase to validate
 * @returns true if passphrase is correct, false otherwise
 */
export async function validatePassphrase(
  encryptedData: string,
  passphrase: string
): Promise<boolean> {
  try {
    await decrypt(encryptedData, passphrase);
    return true;
  } catch {
    return false;
  }
}
