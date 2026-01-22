/**
 * Token encryption using Web Crypto API (AES-GCM)
 *
 * Encrypts OAuth tokens before storing in IndexedDB to prevent casual inspection.
 * Note: This provides protection against casual access, but not sophisticated attacks
 * since the encryption key is stored in the same browser profile.
 */

import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

// IndexedDB schema for encryption key storage
interface EncryptionKeyDB extends DBSchema {
  keys: {
    key: string;
    value: CryptoKey;
  };
}

const ENCRYPTION_DB_NAME = 'wolfcal-encryption';
const ENCRYPTION_DB_VERSION = 1;
const KEY_STORE_NAME = 'keys';
const MASTER_KEY_ID = 'master-aes-key';

/**
 * Opens or creates the encryption key database
 */
async function getEncryptionDB(): Promise<IDBPDatabase<EncryptionKeyDB>> {
  return openDB<EncryptionKeyDB>(ENCRYPTION_DB_NAME, ENCRYPTION_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(KEY_STORE_NAME)) {
        db.createObjectStore(KEY_STORE_NAME);
      }
    },
  });
}

/**
 * Generates a new AES-GCM 256-bit encryption key
 * @returns CryptoKey that can be used for encryption/decryption
 */
export async function generateKey(): Promise<CryptoKey> {
  const key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable (needed for storing in IndexedDB)
    ['encrypt', 'decrypt']
  );

  // Store the key in IndexedDB
  const db = await getEncryptionDB();
  await db.put(KEY_STORE_NAME, key, MASTER_KEY_ID);

  return key;
}

/**
 * Retrieves the master encryption key from IndexedDB, generating one if it doesn't exist
 * @returns CryptoKey for encryption/decryption
 */
async function getMasterKey(): Promise<CryptoKey> {
  const db = await getEncryptionDB();
  let key = await db.get(KEY_STORE_NAME, MASTER_KEY_ID);

  if (!key) {
    // Generate new key on first run
    key = await generateKey();
  }

  return key;
}

/**
 * Encrypts a plaintext token using AES-GCM
 * @param plaintext - The token string to encrypt
 * @returns Base64-encoded string containing IV + ciphertext
 */
export async function encryptToken(plaintext: string): Promise<string> {
  const key = await getMasterKey();

  // Generate random IV (12 bytes is recommended for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encode plaintext to bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    data
  );

  // Combine IV + ciphertext for storage
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Convert to base64 for string storage
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts an encrypted token string
 * @param encrypted - Base64-encoded string containing IV + ciphertext
 * @returns Decrypted plaintext token
 */
export async function decryptToken(encrypted: string): Promise<string> {
  const key = await getMasterKey();

  // Decode from base64
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));

  // Extract IV (first 12 bytes) and ciphertext (rest)
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    ciphertext
  );

  // Decode bytes to string
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
