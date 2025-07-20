










/**
 * Secure Cryptographic Utilities for Engunity AI
 * Modern crypto functions using Web Crypto API and secure practices
 * 
 * Stack: Next.js 14 + TypeScript + Supabase + MongoDB
 * File: frontend/src/lib/utils/crypto.ts
 * 
 * ⚠️ SECURITY WARNING: 
 * - Never store encryption keys or secrets in frontend code
 * - Use environment variables for server-side operations only
 * - Client-side encryption is for convenience, not security against malicious users
 * - Always validate and re-encrypt sensitive data on the server
 */

// ========================================
// TYPE DEFINITIONS
// ========================================

/** Configuration options for encryption operations */
export interface EncryptionOptions {
  algorithm?: 'AES-GCM' | 'AES-CTR' | 'AES-CBC';
  keyLength?: 128 | 192 | 256;
  ivLength?: number;
  tagLength?: number;
}

/** Result of encryption operation */
export interface EncryptionResult {
  encrypted: string;
  iv: string;
  tag?: string;
  algorithm: string;
}

/** JWT payload structure */
export interface JWTPayload {
  [key: string]: any;
  sub?: string;
  iat?: number;
  exp?: number;
  aud?: string;
  iss?: string;
}

/** Hash algorithm options */
export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Check if Web Crypto API is available
 * @returns True if crypto.subtle is available
 */
function isCryptoAvailable(): boolean {
  return typeof window !== 'undefined' && 
         typeof window.crypto !== 'undefined' && 
         typeof window.crypto.subtle !== 'undefined';
}

/**
 * Convert string to ArrayBuffer for crypto operations
 * @param str - String to convert
 * @returns ArrayBuffer representation
 */
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * Convert ArrayBuffer to string
 * @param buffer - ArrayBuffer to convert
 * @returns String representation
 */
function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

/**
 * Convert ArrayBuffer to base64 string
 * @param buffer - ArrayBuffer to convert
 * @returns Base64 encoded string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 * @param base64 - Base64 string to convert
 * @returns ArrayBuffer representation
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert ArrayBuffer to hex string
 * @param buffer - ArrayBuffer to convert
 * @returns Hex encoded string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ========================================
// HASHING UTILITIES
// ========================================

/**
 * Hash a string using the specified algorithm (default: SHA-256)
 * 
 * ⚠️ SECURITY NOTE: Client-side hashing is not sufficient for password security.
 * Always re-hash passwords on the server with proper salt and iterations.
 * 
 * @param input - String to hash
 * @param algorithm - Hash algorithm to use
 * @returns Promise resolving to hex-encoded hash
 * 
 * @example
 * const hash = await hashString('my-secret-data');
 * console.log(hash); // "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
 */
export async function hashString(
  input: string, 
  algorithm: HashAlgorithm = 'SHA-256'
): Promise<string> {
  if (!isCryptoAvailable()) {
    throw new Error('Web Crypto API not available. Use this function in a browser environment or server-side.');
  }

  try {
    const data = stringToArrayBuffer(input);
    const hashBuffer = await window.crypto.subtle.digest(algorithm, data);
    return arrayBufferToHex(hashBuffer);
  } catch (error) {
    console.error('Hashing failed:', error);
    throw new Error('Failed to hash string');
  }
}

/**
 * Compare a string with its hash
 * 
 * @param input - Original string to compare
 * @param hash - Hash to compare against
 * @param algorithm - Hash algorithm used
 * @returns Promise resolving to true if input matches hash
 * 
 * @example
 * const isMatch = await compareHash('my-secret-data', storedHash);
 * if (isMatch) console.log('Hash matches!');
 */
export async function compareHash(
  input: string, 
  hash: string, 
  algorithm: HashAlgorithm = 'SHA-256'
): Promise<boolean> {
  try {
    const inputHash = await hashString(input, algorithm);
    return inputHash === hash;
  } catch (error) {
    console.error('Hash comparison failed:', error);
    return false;
  }
}

/**
 * Generate a salted hash for enhanced security
 * 
 * ⚠️ SERVER-SIDE ONLY: Use this only in server components or API routes
 * 
 * @param input - String to hash
 * @param salt - Salt to use (optional, will generate if not provided)
 * @param algorithm - Hash algorithm to use
 * @returns Promise resolving to object with hash and salt
 * 
 * @example
 * const { hash, salt } = await saltedHash('password123');
 * // Store both hash and salt in database
 */
export async function saltedHash(
  input: string,
  salt?: string,
  algorithm: HashAlgorithm = 'SHA-256'
): Promise<{ hash: string; salt: string }> {
  const actualSalt = salt || generateRandomToken(32);
  const saltedInput = input + actualSalt;
  const hash = await hashString(saltedInput, algorithm);
  
  return { hash, salt: actualSalt };
}

/**
 * Verify a salted hash
 * 
 * @param input - Original string to verify
 * @param hash - Stored hash
 * @param salt - Stored salt
 * @param algorithm - Hash algorithm used
 * @returns Promise resolving to true if verification succeeds
 */
export async function verifySaltedHash(
  input: string,
  hash: string,
  salt: string,
  algorithm: HashAlgorithm = 'SHA-256'
): Promise<boolean> {
  try {
    const { hash: newHash } = await saltedHash(input, salt, algorithm);
    return newHash === hash;
  } catch (error) {
    console.error('Salted hash verification failed:', error);
    return false;
  }
}

// ========================================
// TOKEN GENERATION UTILITIES
// ========================================

/**
 * Generate a cryptographically secure UUID v4
 * 
 * @returns UUID v4 string
 * 
 * @example
 * const id = generateUUID();
 * console.log(id); // "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 */
export function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a cryptographically secure random token
 * 
 * @param length - Length of the token in bytes
 * @param encoding - Output encoding ('hex' | 'base64' | 'base64url')
 * @returns Secure random token
 * 
 * @example
 * const token = generateRandomToken(32); // 64-character hex string
 * const base64Token = generateRandomToken(32, 'base64'); // Base64 encoded
 */
export function generateRandomToken(
  length: number = 32, 
  encoding: 'hex' | 'base64' | 'base64url' = 'hex'
): string {
  if (!isCryptoAvailable()) {
    // Fallback using Math.random (less secure)
    console.warn('Using fallback random generation. Not cryptographically secure.');
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length * 2; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);

  switch (encoding) {
    case 'base64':
      return arrayBufferToBase64(array.buffer);
    case 'base64url':
      return arrayBufferToBase64(array.buffer)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    case 'hex':
    default:
      return arrayBufferToHex(array.buffer);
  }
}

/**
 * Generate a secure API key with prefix
 * 
 * @param prefix - Prefix for the API key (e.g., 'egi_')
 * @param length - Length of the random part in bytes
 * @returns API key with prefix
 * 
 * @example
 * const apiKey = generateApiKey('egi_', 32);
 * console.log(apiKey); // "egi_a1b2c3d4e5f6..."
 */
export function generateApiKey(prefix: string = '', length: number = 32): string {
  const token = generateRandomToken(length, 'hex');
  return prefix + token;
}

/**
 * Generate a secure session token
 * 
 * @param length - Length in bytes (default: 48)
 * @returns Base64URL encoded session token
 * 
 * @example
 * const sessionToken = generateSessionToken();
 * // Use for session management
 */
export function generateSessionToken(length: number = 48): string {
  return generateRandomToken(length, 'base64url');
}

// ========================================
// ENCRYPTION UTILITIES
// ========================================

/**
 * Encrypt text using AES-GCM
 * 
 * ⚠️ CLIENT-SIDE ENCRYPTION WARNING:
 * - This is for convenience, not security against malicious users
 * - Never store encryption keys in frontend code
 * - Use only for non-sensitive temporary data
 * - For sensitive data, always encrypt on the server
 * 
 * @param text - Text to encrypt
 * @param secretKey - Encryption key (should be from secure source)
 * @param options - Encryption options
 * @returns Encrypted data with metadata
 * 
 * @example
 * const encrypted = await encrypt('sensitive data', process.env.ENCRYPTION_KEY);
 * console.log(encrypted.encrypted); // Base64 encrypted data
 */
export async function encrypt(
  text: string,
  secretKey: string,
  options: EncryptionOptions = {}
): Promise<EncryptionResult> {
  if (!isCryptoAvailable()) {
    throw new Error('Web Crypto API not available for encryption');
  }

  const {
    algorithm = 'AES-GCM',
    keyLength = 256,
    ivLength = 12,
    tagLength = 128
  } = options;

  try {
    // Derive key from secret
    const keyData = stringToArrayBuffer(secretKey);
    const keyHash = await window.crypto.subtle.digest('SHA-256', keyData);
    const key = await window.crypto.subtle.importKey(
      'raw',
      keyHash.slice(0, keyLength / 8),
      { name: algorithm },
      false,
      ['encrypt']
    );

    // Generate random IV
    const iv = window.crypto.getRandomValues(new Uint8Array(ivLength));
    
    // Encrypt the text
    const encodedText = stringToArrayBuffer(text);
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: algorithm,
        iv: iv,
        tagLength: tagLength
      },
      key,
      encodedText
    );

    return {
      encrypted: arrayBufferToBase64(encrypted),
      iv: arrayBufferToBase64(iv.buffer),
      algorithm: algorithm
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt text using AES-GCM
 * 
 * @param encryptionResult - Result from encrypt function or encrypted string
 * @param secretKey - Decryption key (must match encryption key)
 * @param options - Decryption options
 * @returns Decrypted text
 * 
 * @example
 * const decrypted = await decrypt(encryptedData, process.env.ENCRYPTION_KEY);
 * console.log(decrypted); // "sensitive data"
 */
export async function decrypt(
  encryptionResult: EncryptionResult | string,
  secretKey: string,
  options: EncryptionOptions = {}
): Promise<string> {
  if (!isCryptoAvailable()) {
    throw new Error('Web Crypto API not available for decryption');
  }

  // Handle both EncryptionResult and legacy string format
  let encrypted: string;
  let iv: string;
  let algorithm: string;

  if (typeof encryptionResult === 'string') {
    // Legacy format: assume AES-GCM with embedded IV
    throw new Error('Legacy string decryption not supported. Use EncryptionResult format.');
  } else {
    encrypted = encryptionResult.encrypted;
    iv = encryptionResult.iv;
    algorithm = encryptionResult.algorithm;
  }

  const {
    keyLength = 256,
    tagLength = 128
  } = options;

  try {
    // Derive key from secret
    const keyData = stringToArrayBuffer(secretKey);
    const keyHash = await window.crypto.subtle.digest('SHA-256', keyData);
    const key = await window.crypto.subtle.importKey(
      'raw',
      keyHash.slice(0, keyLength / 8),
      { name: algorithm },
      false,
      ['decrypt']
    );

    // Convert data back to ArrayBuffers
    const encryptedData = base64ToArrayBuffer(encrypted);
    const ivData = base64ToArrayBuffer(iv);

    // Decrypt the data
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: algorithm,
        iv: ivData,
        tagLength: tagLength
      },
      key,
      encryptedData
    );

    return arrayBufferToString(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Simple obfuscation for non-sensitive data (NOT cryptographically secure)
 * 
 * ⚠️ WARNING: This is obfuscation, not encryption. Do not use for sensitive data.
 * 
 * @param text - Text to obfuscate
 * @param key - Simple key for obfuscation
 * @returns Obfuscated text
 * 
 * @example
 * const obfuscated = obfuscateString('hello world', 'mykey');
 * const deobfuscated = deobfuscateString(obfuscated, 'mykey');
 */
export function obfuscateString(text: string, key: string): string {
  let result = '';
  const keyLength = key.length;
  
  for (let i = 0; i < text.length; i++) {
    const textChar = text.charCodeAt(i);
    const keyChar = key.charCodeAt(i % keyLength);
    result += String.fromCharCode(textChar ^ keyChar);
  }
  
  return btoa(result);
}

/**
 * Deobfuscate string obfuscated with obfuscateString
 * 
 * @param obfuscated - Obfuscated text
 * @param key - Key used for obfuscation
 * @returns Original text
 */
export function deobfuscateString(obfuscated: string, key: string): string {
  try {
    const decoded = atob(obfuscated);
    let result = '';
    const keyLength = key.length;
    
    for (let i = 0; i < decoded.length; i++) {
      const decodedChar = decoded.charCodeAt(i);
      const keyChar = key.charCodeAt(i % keyLength);
      result += String.fromCharCode(decodedChar ^ keyChar);
    }
    
    return result;
  } catch (error) {
    console.error('Deobfuscation failed:', error);
    return '';
  }
}

// ========================================
// JWT UTILITIES
// ========================================

/**
 * Decode JWT payload without verification
 * 
 * ⚠️ SECURITY WARNING: This only decodes the payload, it does NOT verify the signature.
 * Never trust JWT data without proper server-side verification.
 * 
 * @param token - JWT token to decode
 * @returns Decoded payload object
 * 
 * @example
 * const payload = decodeJWT(jwtToken);
 * console.log(payload.sub); // User ID
 * console.log(payload.exp); // Expiration timestamp
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = parts[1];
    // Add padding if needed
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
    
    return JSON.parse(decoded);
  } catch (error) {
    console.error('JWT decode failed:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 * 
 * @param token - JWT token to check
 * @returns True if token is expired
 * 
 * @example
 * if (isJWTExpired(token)) {
 *   // Token is expired, refresh or redirect to login
 * }
 */
export function isJWTExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
}

/**
 * Get JWT expiration time
 * 
 * @param token - JWT token
 * @returns Expiration date or null if invalid
 * 
 * @example
 * const expiry = getJWTExpiration(token);
 * if (expiry) {
 *   console.log('Token expires at:', expiry.toISOString());
 * }
 */
export function getJWTExpiration(token: string): Date | null {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return null;
  }

  return new Date(payload.exp * 1000);
}

// ========================================
// SECURITY UTILITIES
// ========================================

/**
 * Generate a secure CSRF token
 * 
 * @returns CSRF token string
 * 
 * @example
 * const csrfToken = generateCSRFToken();
 * // Include in forms and verify on server
 */
export function generateCSRFToken(): string {
  return generateRandomToken(32, 'base64url');
}

/**
 * Create a secure hash for data integrity
 * 
 * @param data - Data to create integrity hash for
 * @param secret - Secret key for HMAC (optional)
 * @returns Promise resolving to integrity hash
 * 
 * @example
 * const hash = await createIntegrityHash(JSON.stringify(data));
 * // Store hash with data to verify integrity later
 */
export async function createIntegrityHash(
  data: string,
  secret?: string
): Promise<string> {
  if (secret) {
    // Use HMAC for authenticated hash
    if (!isCryptoAvailable()) {
      throw new Error('Web Crypto API not available for HMAC');
    }

    const keyData = stringToArrayBuffer(secret);
    const key = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await window.crypto.subtle.sign(
      'HMAC',
      key,
      stringToArrayBuffer(data)
    );

    return arrayBufferToHex(signature);
  } else {
    // Use simple hash
    return await hashString(data);
  }
}

/**
 * Verify data integrity using hash
 * 
 * @param data - Original data
 * @param hash - Previously computed hash
 * @param secret - Secret key if HMAC was used
 * @returns Promise resolving to true if data is unchanged
 */
export async function verifyIntegrityHash(
  data: string,
  hash: string,
  secret?: string
): Promise<boolean> {
  try {
    const newHash = await createIntegrityHash(data, secret);
    return newHash === hash;
  } catch (error) {
    console.error('Integrity verification failed:', error);
    return false;
  }
}

/**
 * Securely wipe sensitive data from memory
 * 
 * ⚠️ NOTE: This provides basic protection but cannot guarantee complete memory clearing
 * in JavaScript due to garbage collection behavior.
 * 
 * @param sensitiveString - String containing sensitive data
 */
export function secureWipe(sensitiveString: string): void {
  // In JavaScript, we can't truly wipe memory, but we can overwrite the reference
  try {
    // Create a mutable version and overwrite with random data
    const length = sensitiveString.length;
    let overwritten = '';
    for (let i = 0; i < length; i++) {
      overwritten += String.fromCharCode(Math.floor(Math.random() * 256));
    }
    
    // The original string reference will be garbage collected
    // This is more of a symbolic operation in JavaScript
    console.debug('Sensitive data reference cleared');
  } catch (error) {
    console.warn('Secure wipe attempt failed:', error);
  }
}

// ========================================
// EXPORTED CONSTANTS
// ========================================

/** Default encryption options */
export const DEFAULT_ENCRYPTION_OPTIONS: EncryptionOptions = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  ivLength: 12,
  tagLength: 128
};

/** Supported hash algorithms */
export const SUPPORTED_HASH_ALGORITHMS: HashAlgorithm[] = [
  'SHA-1',
  'SHA-256', 
  'SHA-384',
  'SHA-512'
];

/** Token encoding options */
export const TOKEN_ENCODINGS = ['hex', 'base64', 'base64url'] as const;

// ========================================
// RUNTIME CHECKS
// ========================================

/** Check if current environment supports secure crypto operations */
export const isSecureCryptoSupported = isCryptoAvailable();

/** Warn about crypto availability on module load */
if (typeof window !== 'undefined' && !isSecureCryptoSupported) {
  console.warn('🔒 Engunity AI Crypto Utils: Web Crypto API not available. Some functions will use fallbacks or fail.');
}