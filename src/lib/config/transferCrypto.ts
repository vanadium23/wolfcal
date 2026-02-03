/**
 * Configuration transfer encryption using Web Crypto API
 *
 * Encrypts configuration data with a user-provided passphrase for cross-device transfer.
 * Uses PBKDF2 for key derivation and AES-GCM for authenticated encryption.
 */

// Current format version for binary encoding
export const CURRENT_FORMAT_VERSION = 1;

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
 * Converts Uint8Array to base64url-encoded string
 * @param data - Binary data to encode
 * @returns Base64url-encoded string (URL-safe: -_ instead of +/)
 */
function uint8ArrayToBase64Url(data: Uint8Array): string {
  // Convert to binary string
  const binary = String.fromCharCode(...data);
  // Encode as standard base64
  const base64 = btoa(binary);
  // Convert to base64url (replace + with -, / with _, remove = padding)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes base64url-encoded string to Uint8Array
 * @param base64url - Base64url-encoded string
 * @returns Decoded binary data
 */
export function base64UrlToUint8Array(base64url: string): Uint8Array {
  // Convert base64url to standard base64
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  // Decode to binary string
  const binary = atob(base64);
  // Convert to Uint8Array
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

/**
 * Compresses data using gzip compression
 * @param data - String data to compress
 * @returns Compressed data as Uint8Array
 */
async function compressData(data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);

  // Use CompressionStream API (available in modern browsers)
  const compressionStream = new CompressionStream('gzip');
  const writer = compressionStream.writable.getWriter();
  const reader = compressionStream.readable.getReader();

  // Write data to the compressor
  writer.write(dataBytes);
  writer.close();

  // Read compressed data
  const chunks: Uint8Array[] = [];
  let done = false;
  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    if (value) chunks.push(value);
  }

  // Concatenate all chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const compressed = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    compressed.set(chunk, offset);
    offset += chunk.length;
  }

  return compressed;
}

/**
 * Encrypts data with a passphrase
 * New binary format: version(1) || salt(16) || iv(12) || compressed_ciphertext
 * @param data - String data to encrypt (typically JSON)
 * @param passphrase - User-provided passphrase
 * @returns Base64url-encoded string containing version + salt + iv + ciphertext
 */
export async function encrypt(data: string, passphrase: string): Promise<string> {
  // Step 1: Compress the data first
  const compressedData = await compressData(data);

  // Step 2: Generate random salt for key derivation
  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_CONFIG.saltLength));

  // Step 3: Derive encryption key from passphrase
  const key = await deriveKey(passphrase, salt);

  // Step 4: Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(AES_CONFIG.ivLength));

  // Step 5: Encrypt compressed data
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: AES_CONFIG.algorithm,
      iv,
    },
    key,
    compressedData as unknown as BufferSource
  );

  // Step 6: Concatenate raw bytes: version(1) || salt(16) || iv(12) || ciphertext
  const ciphertextBytes = new Uint8Array(ciphertext);
  const combined = new Uint8Array(1 + PBKDF2_CONFIG.saltLength + AES_CONFIG.ivLength + ciphertextBytes.length);
  combined[0] = CURRENT_FORMAT_VERSION; // Version byte
  combined.set(salt, 1); // Salt at position 1
  combined.set(iv, 1 + PBKDF2_CONFIG.saltLength); // IV after salt
  combined.set(ciphertextBytes, 1 + PBKDF2_CONFIG.saltLength + AES_CONFIG.ivLength); // Ciphertext after IV

  // Step 7: Encode as base64url for URL-safe use
  return uint8ArrayToBase64Url(combined);
}

/**
 * Decompresses data using gzip decompression
 * @param compressedData - Compressed data as Uint8Array
 * @returns Decompressed string
 */
async function decompressData(compressedData: Uint8Array): Promise<string> {
  // Use DecompressionStream API (available in modern browsers)
  const decompressionStream = new DecompressionStream('gzip');
  const writer = decompressionStream.writable.getWriter();
  const reader = decompressionStream.readable.getReader();

  // Write compressed data to the decompressor
  await writer.write(compressedData as unknown as BufferSource);
  writer.close();

  // Read decompressed data
  const chunks: Uint8Array[] = [];
  let done = false;
  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    if (value) chunks.push(value);
  }

  // Concatenate all chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const decompressed = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    decompressed.set(chunk, offset);
    offset += chunk.length;
  }

  // Decode bytes to string
  const decoder = new TextDecoder();
  return decoder.decode(decompressed);
}

/**
 * Decrypts data with a passphrase
 * Supports both old (double-base64 JSON) and new (binary) formats
 * @param encryptedData - Base64-encoded string from encrypt()
 * @param passphrase - User-provided passphrase
 * @returns Decrypted string data
 * @throws Error if decryption fails (wrong passphrase or corrupted data)
 */
export async function decrypt(encryptedData: string, passphrase: string): Promise<string> {
  try {
    // Detect format by checking first character after base64 decode
    // Old format: starts with '{' (JSON structure)
    // New format: starts with version byte (0x01 for version 1)
    let decodedBytes: Uint8Array;

    try {
      decodedBytes = base64UrlToUint8Array(encryptedData);
    } catch (e) {
      // If base64url decode fails, try standard base64 (old format)
      try {
        const binary = atob(encryptedData);
        decodedBytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      } catch (e2) {
        // Both decoding attempts failed - likely corrupted data
        throw new Error('Decryption failed. Check your passphrase and try again.');
      }
    }

    // Check format by looking at first byte
    const firstByte = decodedBytes[0];

    if (firstByte === CURRENT_FORMAT_VERSION) {
      // New binary format: version(1) || salt(16) || iv(12) || compressed_ciphertext
      if (decodedBytes.length < 1 + PBKDF2_CONFIG.saltLength + AES_CONFIG.ivLength) {
        throw new Error('Invalid encrypted data: truncated');
      }

      // Extract components
      const salt = decodedBytes.slice(1, 1 + PBKDF2_CONFIG.saltLength);
      const iv = decodedBytes.slice(1 + PBKDF2_CONFIG.saltLength, 1 + PBKDF2_CONFIG.saltLength + AES_CONFIG.ivLength);
      const ciphertext = decodedBytes.slice(1 + PBKDF2_CONFIG.saltLength + AES_CONFIG.ivLength);

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

      // Decompress the decrypted data
      const decryptedBytes = new Uint8Array(decrypted);
      return await decompressData(decryptedBytes);
    } else if (firstByte === 123 || String.fromCharCode(firstByte) === '{') {
      // Old JSON format (first byte is ASCII for '{' = 123)
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
    } else {
      throw new Error('Unsupported encrypted data format');
    }
  } catch (error) {
    // Throw a more user-friendly error
    // For backward compatibility, maintain the same error message format
    // Check if it's a crypto operation failure (likely wrong passphrase)
    if (error instanceof Error && error.message.includes('The operation failed')) {
      throw new Error('Decryption failed. Check your passphrase and try again.');
    }
    // For other errors, preserve the original message for debugging
    if (error instanceof Error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
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
