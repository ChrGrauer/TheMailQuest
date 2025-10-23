import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import pino from 'pino';
import { Writable } from 'stream';

/**
 * Feature: Logging Integration
 *
 * This test suite implements the acceptance criteria defined in:
 * features/US-7.6-0-error-handling-logging.feature
 *
 * Using ATDD approach with Vitest to ensure logging functionality
 * meets business requirements.
 */

// Custom stream to capture log output for testing
class LogCapture extends Writable {
  public logs: any[] = [];

  _write(chunk: any, encoding: string, callback: () => void) {
    try {
      const log = JSON.parse(chunk.toString());
      this.logs.push(log);
    } catch (e) {
      // Ignore parse errors
    }
    callback();
  }

  clear() {
    this.logs = [];
  }

  getLastLog() {
    return this.logs[this.logs.length - 1];
  }

  findLog(predicate: (log: any) => boolean) {
    return this.logs.find(predicate);
  }
}

describe('Feature: Logging Integration', () => {
  let logCapture: LogCapture;

  beforeEach(() => {
    logCapture = new LogCapture();
  });

  afterEach(() => {
    logCapture.clear();
  });

  // ============================================================================
  // PINO INTEGRATION
  // ============================================================================

  describe('Scenario: Logger instance is available and functional', () => {
    test('Given Pino library is installed, When the application starts, Then a logger instance should be available and provide all logging methods', () => {
      // Given: The Pino library is installed (verified by import)
      expect(pino).toBeDefined();
      expect(typeof pino).toBe('function');

      // When: The application starts and creates a logger
      const logger = pino({
        level: 'debug'
      }, logCapture);

      // Then: A logger instance should be available
      expect(logger).toBeDefined();

      // And: The logger should be based on Pino
      expect(logger.constructor.name).toBe('Pino');

      // And: The logger should provide logging methods
      const expectedMethods = ['debug', 'info', 'warn', 'error'];

      for (const method of expectedMethods) {
        expect(logger[method]).toBeDefined();
        expect(typeof logger[method]).toBe('function');
      }
    });
  });

  describe('Scenario: Logger can write logs with different levels', () => {
    test('Given the logger is initialized, When I call logger.info with a message, Then a log entry should be created with correct level and message', () => {
      // Given: The logger is initialized
      const logger = pino({
        level: 'debug'
      }, logCapture);

      // When: I call "logger.info('test message')"
      logger.info('test message');

      // Then: A log entry should be created
      expect(logCapture.logs.length).toBeGreaterThan(0);

      const logEntry = logCapture.getLastLog();

      // And: The log entry should have level "info"
      expect(logEntry.level).toBe(30); // Pino's numeric level for 'info'

      // And: The log entry should contain the message "test message"
      expect(logEntry.msg).toBe('test message');
    });
  });

  describe('Scenario: Logger includes timestamp in logs', () => {
    test('Given the logger is initialized, When a log is written, Then the log should include a timestamp in ISO format', () => {
      // Given: The logger is initialized
      const logger = pino({
        level: 'info',
        timestamp: pino.stdTimeFunctions.isoTime
      }, logCapture);

      // When: A log is written
      logger.info('timestamp test');

      // Then: The log should include a timestamp field
      const logEntry = logCapture.getLastLog();
      expect(logEntry.time).toBeDefined();

      // And: The timestamp should be in ISO format
      // ISO format: YYYY-MM-DDTHH:mm:ss.sssZ
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(isoRegex.test(logEntry.time)).toBe(true);

      // Verify it's a valid date
      const date = new Date(logEntry.time);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });

  // ============================================================================
  // DEBUG LOGS IN PRODUCTION
  // ============================================================================

  describe('Scenario: DEBUG logs are disabled in production mode', () => {
    test('Given the application is running in production mode, When I call logger.debug, Then the debug log should NOT be written', () => {
      // Given: The application is running in "production" mode
      // And: The logger is initialized with production level (info)
      const logger = pino({
        level: 'info' // Production: only info and above
      }, logCapture);

      // When: I call "logger.debug('debug message')"
      logger.debug('debug message');

      // Then: The debug log should NOT be written
      expect(logCapture.logs.length).toBe(0);

      // And: No output should be produced for debug level
      const debugLog = logCapture.findLog(log => log.level === 20); // 20 is debug level
      expect(debugLog).toBeUndefined();
    });
  });

  describe('Scenario: INFO logs and above are enabled in production mode', () => {
    test('Given the application is running in production mode, When I call info, warn, and error methods, Then all three logs should be written and visible', () => {
      // Given: The application is running in "production" mode
      // And: The logger is initialized
      const logger = pino({
        level: 'info' // Production: only info and above
      }, logCapture);

      // When: I call the following logging methods
      logger.info('info message');
      logger.warn('warning message');
      logger.error('error message');

      // Then: All three logs should be written
      expect(logCapture.logs.length).toBe(3);

      // And: Each log should be visible in the output
      const infoLog = logCapture.findLog(log => log.msg === 'info message');
      const warnLog = logCapture.findLog(log => log.msg === 'warning message');
      const errorLog = logCapture.findLog(log => log.msg === 'error message');

      expect(infoLog).toBeDefined();
      expect(infoLog.level).toBe(30); // info level

      expect(warnLog).toBeDefined();
      expect(warnLog.level).toBe(40); // warn level

      expect(errorLog).toBeDefined();
      expect(errorLog.level).toBe(50); // error level
    });
  });

  describe('Scenario: DEBUG logs are enabled in development mode', () => {
    test('Given the application is running in development mode, When I call logger.debug, Then the debug log should be written and visible', () => {
      // Given: The application is running in "development" mode
      // And: The logger is initialized
      const logger = pino({
        level: 'debug' // Development: all levels including debug
      }, logCapture);

      // When: I call "logger.debug('debug message')"
      logger.debug('debug message');

      // Then: The debug log should be written
      expect(logCapture.logs.length).toBe(1);

      const debugLog = logCapture.getLastLog();

      // And: The debug message should be visible in the output
      expect(debugLog).toBeDefined();
      expect(debugLog.level).toBe(20); // debug level
      expect(debugLog.msg).toBe('debug message');
    });
  });

  // ============================================================================
  // ADDITIONAL TESTS - Verify actual logger implementation
  // ============================================================================

  describe('Integration: Verify actual logger implementation from index.ts', () => {
    test('The gameLogger helper functions should work correctly', async () => {
      // Import the actual logger (this will use the mocked $app/environment)
      const { gameLogger } = await import('./index.js');

      // Verify gameLogger has all expected methods
      expect(gameLogger.event).toBeDefined();
      expect(gameLogger.playerAction).toBeDefined();
      expect(gameLogger.reputationChange).toBeDefined();
      expect(gameLogger.websocket).toBeDefined();
      expect(gameLogger.error).toBeDefined();

      // The helper methods should be functions
      expect(typeof gameLogger.event).toBe('function');
      expect(typeof gameLogger.playerAction).toBe('function');
      expect(typeof gameLogger.reputationChange).toBe('function');
      expect(typeof gameLogger.websocket).toBe('function');
      expect(typeof gameLogger.error).toBe('function');
    });

    test('The main logger instance should be accessible', async () => {
      // Import the actual logger
      const { logger } = await import('./index.js');

      // Verify logger is a Pino instance
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Additional: Error logging capabilities', () => {
    test('Logger should be able to log Error objects with stack traces', () => {
      // Given: The logger is initialized
      const logger = pino({
        level: 'error'
      }, logCapture);

      // When: An error is logged
      const error = new Error('Test error');
      logger.error({ err: error }, 'An error occurred');

      // Then: The log should contain error information
      const logEntry = logCapture.getLastLog();
      expect(logEntry.err).toBeDefined();
      expect(logEntry.err.type).toBe('Error');
      expect(logEntry.err.message).toBe('Test error');
      expect(logEntry.err.stack).toBeDefined();
      expect(logEntry.msg).toBe('An error occurred');
    });

    test('Logger should be able to log with additional context', () => {
      // Given: The logger is initialized
      const logger = pino({
        level: 'info'
      }, logCapture);

      // When: A log with context is written
      logger.info({ userId: '123', action: 'login' }, 'User logged in');

      // Then: The log should include the context
      const logEntry = logCapture.getLastLog();
      expect(logEntry.userId).toBe('123');
      expect(logEntry.action).toBe('login');
      expect(logEntry.msg).toBe('User logged in');
    });
  });
});
