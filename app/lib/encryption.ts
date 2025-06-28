import crypto from 'crypto';

// Use environment variables for encryption keys
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a-32-character-key-for-aes-256-gcm!';
// We need to generate an initialization vector for each encryption operation
const IV_LENGTH = 16; // For AES, this is always 16 bytes

/**
 * Determines if the encrypted data is in the legacy format (without IV)
 * @param encryptedText - The encrypted text to check
 * @returns boolean indicating if it's legacy format
 */
function isLegacyEncryptedData(encryptedText: string): boolean {
  return !encryptedText.includes(':');
}

/**
 * Creates a crypto key from the encryption key string
 * @returns A proper key object compatible with the Cipher API
 */
function getDerivedKey(): crypto.KeyObject {
  // For AES-256, we need a 32-byte key
  const rawKey = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  // Convert to proper KeyObject for TypeScript compatibility
  return crypto.createSecretKey(rawKey);
}

/**
 * Encrypts sensitive data
 * @param text - The plaintext to encrypt
 * @returns The encrypted text as a base64 string with IV prepended
 */
export function encrypt(text: string): string {
  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Get the derived key as a proper KeyObject
    const key = getDerivedKey();
    
    // Create cipher with key and iv
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    // Encrypt the data
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Prepend the IV to the encrypted data (we'll need it for decryption)
    // Both the IV and the encrypted data need to be stored
    return iv.toString('base64') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data that was encrypted with the encrypt function
 * @param encryptedText - The encrypted text (either with IV prepended or legacy format)
 * @returns The original plaintext
 */
export function decrypt(encryptedText: string): string {
  try {
    // Check if this is using the legacy format (without IV)
    if (isLegacyEncryptedData(encryptedText)) {
      return decryptLegacy(encryptedText);
    }
    
    // Split the IV and encrypted text
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'base64');
    const encrypted = parts[1];
    
    // Get the derived key as a proper KeyObject
    const key = getDerivedKey();
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Decrypts data encrypted with the legacy method (without IV)
 * @param encryptedText - The encrypted text from the legacy format
 * @returns The original plaintext
 * @private
 */
function decryptLegacy(encryptedText: string): string {
  try {
    // WARNING: This uses deprecated methods, but is needed for backward compatibility
    const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Legacy decryption error:', error);
    throw new Error('Failed to decrypt legacy data');
  }
}

/**
 * Mask sensitive data for display
 * @param text - The sensitive text to mask
 * @param visibleChars - Number of characters to show at the start
 * @returns The masked string
 */
export function maskSensitiveData(text: string, visibleChars = 4): string {
  if (!text || text.length <= visibleChars) return text;
  
  const visible = text.slice(0, visibleChars);
  const masked = '•'.repeat(Math.min(text.length - visibleChars, 16));
  
  return `${visible}${masked}`;
}