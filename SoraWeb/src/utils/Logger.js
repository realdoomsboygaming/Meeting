/**
 * Logger utility for consistent logging across the application
 */
class Logger {
  constructor() {
    this.logLevels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    }
    
    this.currentLevel = this.logLevels.info
    this.isEnabled = true
  }

  /**
   * Set the current log level
   * @param {string} level - Log level to set
   */
  setLevel(level) {
    if (this.logLevels[level] !== undefined) {
      this.currentLevel = this.logLevels[level]
    }
  }

  /**
   * Enable or disable logging
   * @param {boolean} enabled - Whether logging should be enabled
   */
  setEnabled(enabled) {
    this.isEnabled = enabled
  }

  /**
   * Format a log message with timestamp and type
   * @param {string} message - Message to format
   * @param {string} type - Log type
   * @returns {string} Formatted message
   */
  formatMessage(message, type = '') {
    const timestamp = new Date().toISOString()
    return `[${timestamp}]${type ? ` [${type}]` : ''} ${message}`
  }

  /**
   * Log a debug message
   * @param {string} message - Message to log
   * @param {string} type - Optional type/category
   */
  debug(message, type = '') {
    if (this.isEnabled && this.currentLevel <= this.logLevels.debug) {
      console.debug(this.formatMessage(message, type))
    }
  }

  /**
   * Log an info message
   * @param {string} message - Message to log
   * @param {string} type - Optional type/category
   */
  info(message, type = '') {
    if (this.isEnabled && this.currentLevel <= this.logLevels.info) {
      console.info(this.formatMessage(message, type))
    }
  }

  /**
   * Log a warning message
   * @param {string} message - Message to log
   * @param {string} type - Optional type/category
   */
  warn(message, type = '') {
    if (this.isEnabled && this.currentLevel <= this.logLevels.warn) {
      console.warn(this.formatMessage(message, type))
    }
  }

  /**
   * Log an error message
   * @param {string} message - Message to log
   * @param {string} type - Optional type/category
   */
  error(message, type = '') {
    if (this.isEnabled && this.currentLevel <= this.logLevels.error) {
      console.error(this.formatMessage(message, type))
    }
  }

  /**
   * Log an error with full stack trace
   * @param {string} message - Error message
   * @param {Error} error - Error object
   * @param {string} type - Optional type/category
   */
  logError(message, error, type = '') {
    if (this.isEnabled && this.currentLevel <= this.logLevels.error) {
      console.error(this.formatMessage(message, type))
      if (error && error.stack) {
        console.error(error.stack)
      }
    }
  }
}

// Create singleton instance
const logger = new Logger()
export default logger 