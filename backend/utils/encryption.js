const crypto = require('crypto');
const logger = require('./logger');

class EncryptionService {
  constructor() {
    // Use environment variable or generate a key
    const encryptionKey = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }
    
    // Create a 32-byte key from the provided key
    this.key = crypto.createHash('sha256').update(encryptionKey).digest();
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * Encrypt a string
   * @param {string} text - Text to encrypt
   * @returns {string} Encrypted text with IV and auth tag
   */
  encrypt(text) {
    try {
      if (!text) return null;
      
      // Generate a random initialization vector
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      // Encrypt the text
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get the auth tag
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted text
      const combined = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
      
      return combined;
    } catch (error) {
      logger.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt a string
   * @param {string} encryptedText - Encrypted text with IV and auth tag
   * @returns {string} Decrypted text
   */
  decrypt(encryptedText) {
    try {
      if (!encryptedText) return null;
      
      // Split the combined string
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt the text
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash a password using bcrypt-compatible method
   * @param {string} password - Password to hash
   * @returns {string} Hashed password
   */
  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verify a password against a hash
   * @param {string} password - Password to verify
   * @param {string} hashedPassword - Hashed password to compare against
   * @returns {boolean} True if password matches
   */
  verifyPassword(password, hashedPassword) {
    const [salt, originalHash] = hashedPassword.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === originalHash;
  }

  /**
   * Generate a secure random token
   * @param {number} length - Token length in bytes (default 32)
   * @returns {string} Random token as hex string
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a secure API key
   * @returns {string} API key in format: sk_live_xxxxx
   */
  generateApiKey() {
    const prefix = 'sk_live_';
    const randomPart = crypto.randomBytes(24).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return prefix + randomPart;
  }
}

module.exports = new EncryptionService();