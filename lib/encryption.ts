import crypto from 'crypto';

// Use environment variables for encryption keys
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a-32-character-key-for-aes-256-gcm!';
// We need to generate an initialization vector for each encryption operation
const IV_LENGTH = 16; // For AES, this is always 16 bytes

/**
 * Encrypts sensitive data
 * @param text - The plaintext to encrypt
 * @returns The encrypted text as a base64 string with IV prepended
 */
export function encrypt(text: string): string {
  try {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create a key buffer from our encryption key
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    
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
 * @param encryptedText - The encrypted text with IV prepended
 * @returns The original plaintext
 */
export function decrypt(encryptedText: string): string {
  try {
    // Split the IV and encrypted text
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'base64');
    const encrypted = parts[1];
    
    // Create key buffer from our encryption key
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    
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