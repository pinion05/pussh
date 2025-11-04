const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Logging utility
 */
class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.enableFile = options.enableFile || false;
    this.logDir = options.logDir || path.join(os.homedir(), '.pussh', 'logs');

    if (this.enableFile) {
      this._ensureLogDir();
    }
  }

  /**
   * Ensure log directory exists
   */
  _ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Write log to file
   * @param {string} level - Log level
   * @param {string} message - Log message
   */
  _writeToFile(level, message) {
    if (!this.enableFile) return;

    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    const logFile = path.join(this.logDir, `pussh-${new Date().toISOString().split('T')[0]}.log`);

    try {
      fs.appendFileSync(logFile, logLine, { encoding: 'utf-8', mode: 0o600 });
    } catch (error) {
      // Silently fail to avoid infinite loop
    }
  }

  /**
   * Log info message
   * @param {string} message - Message to log
   */
  info(message) {
    console.log(chalk.white(message));
    this._writeToFile('info', message);
  }

  /**
   * Log success message
   * @param {string} message - Message to log
   */
  success(message) {
    console.log(chalk.green(message));
    this._writeToFile('success', message);
  }

  /**
   * Log warning message
   * @param {string} message - Message to log
   */
  warn(message) {
    console.log(chalk.yellow(message));
    this._writeToFile('warn', message);
  }

  /**
   * Log error message
   * @param {string} message - Message to log
   */
  error(message) {
    console.error(chalk.red(message));
    this._writeToFile('error', message);
  }

  /**
   * Log debug message
   * @param {string} message - Message to log
   */
  debug(message) {
    if (this.level === 'debug') {
      console.log(chalk.gray(message));
      this._writeToFile('debug', message);
    }
  }
}

// Export singleton instance
module.exports = new Logger();
module.exports.Logger = Logger;
