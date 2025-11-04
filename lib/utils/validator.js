const {
  SERVER_NAME_PATTERN,
  HOST_PATTERN,
  PORT_PATTERN,
  SSH_MIN_PORT,
  SSH_MAX_PORT
} = require('./constants');

/**
 * Input validation utilities
 */
class Validator {
  /**
   * Validate server name
   * @param {string} name - Server name
   * @returns {boolean} True if valid
   * @throws {Error} If invalid
   */
  static validateServerName(name) {
    if (!name || typeof name !== 'string') {
      throw new Error('Server name is required');
    }

    if (!SERVER_NAME_PATTERN.test(name)) {
      throw new Error('Server name must contain only alphanumeric characters, dash, and underscore');
    }

    if (name.length > 50) {
      throw new Error('Server name must be less than 50 characters');
    }

    return true;
  }

  /**
   * Validate and parse host string
   * @param {string} host - Host string (user@hostname or user@hostname:port)
   * @returns {object} { user, hostname, port }
   * @throws {Error} If invalid
   */
  static validateAndParseHost(host) {
    if (!host || typeof host !== 'string') {
      throw new Error('Host is required');
    }

    const match = host.match(HOST_PATTERN);
    if (!match) {
      throw new Error('Invalid host format. Use: user@hostname or user@hostname:port');
    }

    const [, user, hostname, portStr] = match;

    // Validate user
    if (user.length === 0 || user.length > 32) {
      throw new Error('Username must be 1-32 characters');
    }

    // Validate hostname
    if (hostname.length === 0 || hostname.length > 253) {
      throw new Error('Hostname must be 1-253 characters');
    }

    // Validate port if provided
    let port = 22; // Default SSH port
    if (portStr) {
      port = this.validatePort(portStr);
    }

    return { user, hostname, port };
  }

  /**
   * Validate port number
   * @param {string|number} port - Port number
   * @returns {number} Validated port
   * @throws {Error} If invalid
   */
  static validatePort(port) {
    const portStr = String(port);

    if (!PORT_PATTERN.test(portStr)) {
      throw new Error(`Port must be an integer: ${port}`);
    }

    const portNum = parseInt(portStr, 10);

    if (portNum < SSH_MIN_PORT || portNum > SSH_MAX_PORT) {
      throw new Error(`Port must be between ${SSH_MIN_PORT} and ${SSH_MAX_PORT}`);
    }

    return portNum;
  }

  /**
   * Validate file path for safety
   * @param {string} filePath - File path
   * @returns {boolean} True if valid
   * @throws {Error} If potentially dangerous
   */
  static validateFilePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('File path is required');
    }

    // Check for path traversal attempts
    if (filePath.includes('..')) {
      throw new Error('Path traversal detected in file path');
    }

    // Check for null bytes
    if (filePath.includes('\0')) {
      throw new Error('Null byte detected in file path');
    }

    return true;
  }

  /**
   * Sanitize filename for shell commands
   * @param {string} filename - Filename to sanitize
   * @returns {string} Sanitized filename
   */
  static sanitizeFilename(filename) {
    // Remove or escape potentially dangerous characters
    // This is a basic implementation - for production, consider using shell-escape package
    return filename.replace(/[;&|`$()]/g, '');
  }

  /**
   * Validate directory path
   * @param {string} dirPath - Directory path
   * @returns {boolean} True if valid
   * @throws {Error} If invalid
   */
  static validateDirectory(dirPath) {
    if (!dirPath || typeof dirPath !== 'string') {
      throw new Error('Directory path is required');
    }

    // Allow ~ for home directory
    if (dirPath === '~') {
      return true;
    }

    // Check for absolute paths or relative paths starting with ~
    if (!dirPath.startsWith('/') && !dirPath.startsWith('~')) {
      throw new Error('Directory path must be absolute or start with ~');
    }

    return true;
  }
}

module.exports = Validator;
