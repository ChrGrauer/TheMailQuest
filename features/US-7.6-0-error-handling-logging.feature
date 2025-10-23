# US-7.6-0: Error Handling & Logging
# Sprint: MVP
# Priority: High

Feature: Logging Integration
  As a developer
  I want to verify that Pino is correctly integrated
  So that I can use logging in the application

  Background:
    Given the Pino library is installed

  # ============================================================================
  # PINO INTEGRATION
  # ============================================================================

  Scenario: Logger instance is available and functional
    When the application starts
    Then a logger instance should be available
    And the logger should be based on Pino
    And the logger should provide logging methods:
      | method          |
      | logger.debug()  |
      | logger.info()   |
      | logger.warn()   |
      | logger.error()  |

  Scenario: Logger can write logs with different levels
    Given the logger is initialized
    When I call "logger.info('test message')"
    Then a log entry should be created
    And the log entry should have level "info"
    And the log entry should contain the message "test message"

  Scenario: Logger includes timestamp in logs
    Given the logger is initialized
    When a log is written
    Then the log should include a timestamp field
    And the timestamp should be in ISO format

  # ============================================================================
  # DEBUG LOGS IN PRODUCTION
  # ============================================================================

  Scenario: DEBUG logs are disabled in production mode
    Given the application is running in "production" mode
    And the logger is initialized
    When I call "logger.debug('debug message')"
    Then the debug log should NOT be written
    And no output should be produced for debug level

  Scenario: INFO logs and above are enabled in production mode
    Given the application is running in "production" mode
    And the logger is initialized
    When I call the following logging methods:
      | method                                |
      | logger.info('info message')           |
      | logger.warn('warning message')        |
      | logger.error('error message')         |
    Then all three logs should be written
    And each log should be visible in the output

  Scenario: DEBUG logs are enabled in development mode
    Given the application is running in "development" mode
    And the logger is initialized
    When I call "logger.debug('debug message')"
    Then the debug log should be written
    And the debug message should be visible in the output

  # ============================================================================
  # NOTES
  # ============================================================================

  # What we're testing:
  # - Pino is installed and can be imported
  # - Logger instance is created and accessible
  # - Basic logging methods work (debug, info, warn, error)
  # - Log level filtering works (debug disabled in prod)
  # - Logs include basic metadata (timestamp)
  #
  # What we're NOT testing:
  # - Pino's internal functionality (already tested by Pino maintainers)
  # - Advanced Pino features (transports, serializers, etc.)
  # - Performance of logging
  # - Log rotation or retention
  # - Error monitoring integration (future feature)
