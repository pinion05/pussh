const { BYTES_PER_KB } = require('./constants');

/**
 * Formatting utilities
 */
class Formatter {
  /**
   * Format file size to human-readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted size (e.g., "1.25 KB")
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= BYTES_PER_KB && unitIndex < units.length - 1) {
      size /= BYTES_PER_KB;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Format date to locale string
   * @param {Date|number} date - Date object or Unix timestamp (seconds)
   * @returns {string} Formatted date string
   */
  static formatDate(date) {
    if (typeof date === 'number') {
      // Convert Unix timestamp (seconds) to milliseconds
      date = new Date(date * 1000);
    }
    return date.toLocaleString('en-US');
  }

  /**
   * Calculate percentage difference
   * @param {number} value1 - First value
   * @param {number} value2 - Second value (denominator)
   * @returns {string} Percentage difference
   */
  static calculatePercentage(value1, value2) {
    if (value2 === 0) {
      return value1 === 0 ? '0.00' : '100.00';
    }
    return ((value1 - value2) / value2 * 100).toFixed(2);
  }

  /**
   * Truncate string with ellipsis
   * @param {string} str - String to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated string
   */
  static truncate(str, maxLength = 50) {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }
}

module.exports = Formatter;
