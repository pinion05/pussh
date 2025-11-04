const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Security utilities
 */
class Security {
  /**
   * Generate a secure random filename
   * @param {string} prefix - Prefix for filename
   * @param {string} extension - File extension
   * @returns {string} Random filename
   */
  static generateSecureFilename(prefix = '', extension = '') {
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `${prefix}${randomBytes}${extension}`;
  }

  /**
   * Create a secure temporary file
   * @param {string} dir - Directory for temp file
   * @param {string} prefix - Prefix for filename
   * @returns {string} Path to temporary file
   */
  static createSecureTempFile(dir = '/tmp', prefix = 'pussh_') {
    const filename = this.generateSecureFilename(prefix, '_temp');
    return path.join(dir, filename);
  }

  /**
   * Escape shell arguments to prevent command injection
   * @param {string} arg - Argument to escape
   * @returns {string} Escaped argument
   */
  static escapeShellArg(arg) {
    // Replace single quotes with '\'' and wrap in single quotes
    return "'" + arg.replace(/'/g, "'\\''") + "'";
  }

  /**
   * Escape multiple shell arguments
   * @param {Array<string>} args - Arguments to escape
   * @returns {Array<string>} Escaped arguments
   */
  static escapeShellArgs(args) {
    return args.map(arg => this.escapeShellArg(arg));
  }

  /**
   * Validate file permissions are secure
   * @param {string} filePath - Path to file
   * @param {number} expectedMode - Expected permission mode (e.g., 0o600)
   * @returns {boolean} True if permissions are correct
   */
  static validateFilePermissions(filePath, expectedMode) {
    try {
      const stats = fs.statSync(filePath);
      const actualMode = stats.mode & 0o777; // Get only permission bits
      return actualMode === expectedMode;
    } catch (error) {
      return false;
    }
  }

  /**
   * Set secure file permissions
   * @param {string} filePath - Path to file
   * @param {number} mode - Permission mode
   */
  static setSecurePermissions(filePath, mode) {
    try {
      fs.chmodSync(filePath, mode);
    } catch (error) {
      throw new Error(`Failed to set secure permissions: ${error.message}`);
    }
  }

  /**
   * Check if path contains traversal attempts
   * @param {string} filePath - Path to check
   * @returns {boolean} True if safe
   */
  static isPathSafe(filePath) {
    // Normalize path and check for traversal
    const normalized = path.normalize(filePath);
    return !normalized.includes('..') && !normalized.includes('\0');
  }

  /**
   * Warn about insecure configuration
   * @param {string} message - Warning message
   */
  static warnInsecure(message) {
    console.warn(chalk.yellow(`⚠️  SECURITY WARNING: ${message}`));
  }
}

module.exports = Security;
