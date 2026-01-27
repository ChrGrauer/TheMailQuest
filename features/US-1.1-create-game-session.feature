# US-1.1: Create Game Session
# Epic: Epic 1 - Game Session Management

Feature: Create Game Session
  As a facilitator
  I want to create a new game session
  So that players can join and start playing

  Background:
    Given the application is running
    And the session management system is initialized

  # ============================================================================
  # BASIC GAME SESSION CREATION
  # ============================================================================

  Scenario: Facilitator creates a new game session
    Given a facilitator is on the  "/create" page
    When the facilitator clicks the "Create a session" button
    Then a new game session should be created
    And a unique room code should be generated
    And the facilitator should see the room code displayed prominently

  Scenario: Room code format is correct
    Given a facilitator creates a new game session
    When the room code is generated
    Then the room code should be exactly 6 characters long
    And the room code should only contain uppercase letters and numbers
    And the room code should match the format "[A-Z0-9]{6}"

  Scenario: Room code is displayed prominently on the lobby page  "/lobby/[roomCode]"
    Given a facilitator has created a game session
    When the facilitator is on the lobby page
    Then the room code should be visible in the header
    And the room code should be easily readable
    And there should be a "Copy" button next to the room code

  # ============================================================================
  # INITIAL GAME CONFIGURATION
  # ============================================================================

  Scenario: Game session is created with correct initial configuration
    Given a facilitator creates a new game session
    Then the game session should have the following configuration:
      | property              | value                                                    |
      | current_round         | 0                                                        |
      | current_phase         | lobby                                                    |
      | esp_team_slots        | 5                                                        |
      | destination_slots     | 3                                                        |
      | esp_team_names        | SendWave, MailMonkey, BluePost, SendBolt, RocketMail     |
      | destination_names     | zmail, intake, yagle                                    |

  Scenario: ESP team slots are initialized empty
    Given a facilitator creates a new game session
    Then each of the 5 ESP team slots should be empty
    And each ESP team should have initial values:
      | property          | value |
      | players           | []    |
      | budget            | 0     |
      | clients           | []    |
      | technical_stack   | []    |

  Scenario: Destination slots are initialized empty
    Given a facilitator creates a new game session
    Then each of the 3 destination slots should be empty
    And each destination should have initial values:
      | property          | value |
      | players           | []    |
      | budget            | 0     |

  # ============================================================================
  # ROOM CODE UNIQUENESS
  # ============================================================================

  Scenario: Each game session gets a unique room code
    Given no game sessions exist
    When a facilitator creates 10 game sessions
    Then all 10 room codes should be different
    And no two sessions should have the same room code

  Scenario: System handles room code collision
    Given a game session with room code "ABC123" already exists
    When the random generator produces "ABC123" again
    Then the system should regenerate a different room code
    And the new session should be created with the new unique code

  # ============================================================================
  # SESSION EXPIRATION
  # ============================================================================

  Scenario: Game session expires after 2 hours of inactivity
    Given a game session was created 2 hours ago
    And there has been no activity in the session
    When the system checks for expired sessions
    Then the session should be marked as expired
    And the session should be removed from active sessions

  Scenario: Active game session does not expire
    Given a game session was created 2 hours ago
    But there was activity in the session 30 minutes ago
    When the system checks for expired sessions
    Then the session should NOT be expired
    And the session should remain in active sessions

  Scenario: Activity resets the inactivity timer
    Given a game session was created 1 hour ago
    When a player performs an action in the session
    Then the inactivity timer should be reset
    And the session should have 2 hours before expiration

  # ============================================================================
  # SESSION STATE PERSISTENCE
  # ============================================================================

  Scenario: Game session state is stored in memory
    Given a facilitator creates a new game session
    Then the session state should be stored in the game server memory
    And the session should be retrievable by its room code
    And the session should include all initial configuration

  # ============================================================================
  # ERROR HANDLING
  # ============================================================================

  Scenario: System handles session creation failure gracefully
    Given the session creation service is unavailable
    When a facilitator tries to create a new game session
    Then the system should show an error message
    And the error message should say "Unable to create game session. Please try again."
    And the facilitator should remain on the "/create" page

  # ============================================================================
  # MULTIPLE SESSIONS
  # ============================================================================

  Scenario: Multiple game sessions can exist simultaneously
    Given the system is running
    When 5 facilitators each create a game session
    Then 5 separate game sessions should exist
    And each session should have its own unique room code
    And each session should be independent of the others

  # ============================================================================
  # NOTES
  # ============================================================================

  # What we're testing:
  # - Game session creation workflow
  # - Room code generation and uniqueness
  # - Initial game state configuration
  # - Session expiration logic
  # - Basic facilitator interactions
  #
  # What we're NOT testing:
  # - Player joining (covered in US-1.2)
  # - Game start logic (covered in US-2.x)
  # - WebSocket connections (covered in US-7.5)
  # - Advanced game state management
  #
  # Dependencies:
  # - Session storage mechanism (in-memory for MVP)
  # - Room code generation utility
  # - Timer/scheduler for expiration checks
