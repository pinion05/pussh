/**
 * Application constants
 */

module.exports = {
  // File size units
  BYTES_PER_KB: 1024,

  // File size limits
  MAX_FILE_SIZE_FOR_COMPARISON: 100 * 1024 * 1024, // 100MB

  // SSH connection settings
  SSH_DEFAULT_PORT: 22,
  SSH_MIN_PORT: 1,
  SSH_MAX_PORT: 65535,
  SSH_CONNECTION_TIMEOUT: 30000, // 30 seconds
  SSH_READY_TIMEOUT: 20000, // 20 seconds

  // File permissions
  CONFIG_DIR_MODE: 0o700,  // rwx------
  CONFIG_FILE_MODE: 0o600, // rw-------

  // Backup settings
  MAX_BACKUP_COUNT: 5,
  BACKUP_EXTENSION: '.pushbackup',

  // Temporary file settings
  TEMP_DIR: '/tmp',
  TEMP_FILE_PREFIX: 'pussh_',

  // Validation patterns
  SERVER_NAME_PATTERN: /^[a-zA-Z0-9_-]+$/,
  HOST_PATTERN: /^([a-zA-Z0-9_-]+)@([a-zA-Z0-9.-]+)(?::(\d+))?$/,
  PORT_PATTERN: /^\d+$/,

  // Error codes
  ERROR_CODES: {
    SSH_CONNECTION_FAILED: 'ERR_SSH_CONNECT',
    AUTHENTICATION_FAILED: 'ERR_AUTH',
    FILE_NOT_FOUND: 'ERR_FILE_NOT_FOUND',
    INVALID_INPUT: 'ERR_INVALID_INPUT',
    PERMISSION_DENIED: 'ERR_PERMISSION',
    CONFIG_CORRUPTED: 'ERR_CONFIG_CORRUPTED',
    RESOURCE_LIMIT: 'ERR_RESOURCE_LIMIT',
    NETWORK_ERROR: 'ERR_NETWORK',
    COMMAND_INJECTION: 'ERR_COMMAND_INJECTION'
  }
};
