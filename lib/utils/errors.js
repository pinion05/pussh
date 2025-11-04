const { ERROR_CODES } = require('./constants');

/**
 * Base application error
 */
class AppError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details
    };
  }
}

/**
 * SSH connection error
 */
class SSHConnectionError extends AppError {
  constructor(message, details = null) {
    super(message, ERROR_CODES.SSH_CONNECTION_FAILED, details);
  }
}

/**
 * Authentication error
 */
class AuthenticationError extends AppError {
  constructor(message, details = null) {
    super(message, ERROR_CODES.AUTHENTICATION_FAILED, details);
  }
}

/**
 * File not found error
 */
class FileNotFoundError extends AppError {
  constructor(message, details = null) {
    super(message, ERROR_CODES.FILE_NOT_FOUND, details);
  }
}

/**
 * Invalid input error
 */
class InvalidInputError extends AppError {
  constructor(message, details = null) {
    super(message, ERROR_CODES.INVALID_INPUT, details);
  }
}

/**
 * Permission denied error
 */
class PermissionDeniedError extends AppError {
  constructor(message, details = null) {
    super(message, ERROR_CODES.PERMISSION_DENIED, details);
  }
}

/**
 * Config corrupted error
 */
class ConfigCorruptedError extends AppError {
  constructor(message, details = null) {
    super(message, ERROR_CODES.CONFIG_CORRUPTED, details);
  }
}

/**
 * Resource limit error
 */
class ResourceLimitError extends AppError {
  constructor(message, details = null) {
    super(message, ERROR_CODES.RESOURCE_LIMIT, details);
  }
}

/**
 * Network error
 */
class NetworkError extends AppError {
  constructor(message, details = null) {
    super(message, ERROR_CODES.NETWORK_ERROR, details);
  }
}

/**
 * Command injection error
 */
class CommandInjectionError extends AppError {
  constructor(message, details = null) {
    super(message, ERROR_CODES.COMMAND_INJECTION, details);
  }
}

module.exports = {
  AppError,
  SSHConnectionError,
  AuthenticationError,
  FileNotFoundError,
  InvalidInputError,
  PermissionDeniedError,
  ConfigCorruptedError,
  ResourceLimitError,
  NetworkError,
  CommandInjectionError
};
