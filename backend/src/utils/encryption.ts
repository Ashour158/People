import crypto from 'crypto';
import { env } from '../config/env';

/**
 * Encryption utility for field-level data encryption
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Derives an encryption key from the JWT secret
 */
function getEncryptionKey(): Buffer {
  const secret = env.jwt.secret;
  // Use PBKDF2 to derive a proper encryption key
  return crypto.pbkdf2Sync(secret, 'hr-system-salt', 100000, 32, 'sha256');
}

/**
 * Encrypt sensitive data
 */
export function encrypt(text: string): string {
  if (!text) return text;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;

    const ivHex = parts[0];
    const authTagHex = parts[1];
    const encrypted = parts[2];

    if (!ivHex || !authTagHex || !encrypted) {
      return encryptedText;
    }

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decryptedBuffer = decipher.update(encrypted, 'hex');
    const finalBuffer = decipher.final();
    const decrypted = Buffer.concat([decryptedBuffer, finalBuffer]).toString('utf8');

    return decrypted;
  } catch (error) {
    // If decryption fails, return original (might not be encrypted)
    return encryptedText;
  }
}

/**
 * Hash sensitive data (one-way, for search/comparison)
 */
export function hashData(text: string): string {
  if (!text) return text;
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a random OTP (One-Time Password)
 */
export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  return otp;
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Encrypt multiple fields in an object
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field] as string) as any;
    }
  }
  return result;
}

/**
 * Decrypt multiple fields in an object
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = decrypt(result[field] as string) as any;
    }
  }
  return result;
}
