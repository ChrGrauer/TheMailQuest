# US-1.3: Game Lobby Management
# Epic: Epic 1 - Game Session Management

Feature: Game Lobby Management
  As a facilitator
  I want to start the game from the lobby
  So that all players can begin playing

  Background:
    Given the application is running
    And a game session with room code "ABC123" exists
    And the lobby is in "lobby" phase

  # ============================================================================
  # FACILITATOR IDENTIFICATION
  # ============================================================================

  Scenario: Facilitator is identified when creating a room
    Given a facilitator creates a new game session with room code "ABC123"
    Then the facilitator should be marked as "facilitator" in the session
    And the facilitator should be redirected to the lobby page
    And the facilitator should see the same lobby as other players

  # ============================================================================
  # START GAME BUTTON VISIBILITY
  # ============================================================================

  Scenario: Only facilitator sees Start Game button
    Given the facilitator is on the lobby page
    And player "Alice" has joined as "SendWave" team
    When the facilitator views the lobby
    Then the facilitator should see a "Start Game" button
    And the button should be clearly visible

  Scenario: Regular players do not see Start Game button
    Given player "Alice" has joined as "SendWave" team
    When player "Alice" views the lobby
    Then player "Alice" should NOT see a "Start Game" button
    And player "Alice" should see all other lobby elements normally

  # ============================================================================
  # START GAME BUTTON STATE
  # ============================================================================

  Scenario: Start Game button is disabled when not enough players
    Given the facilitator is on the lobby page
    And only 1 player has joined
    When the facilitator views the lobby
    Then the "Start Game" button should be disabled
    And there should be a message indicating why the button is disabled
    And the message should mention minimum requirements

  Scenario: Start Game button is enabled when minimum players are present
    Given the facilitator is on the lobby page
    And at least 1 ESP team player has joined
    And at least 1 Destination player has joined
    When the facilitator views the lobby
    Then the "Start Game" button should be enabled
    And the facilitator should be able to click it

  # ============================================================================
  # STARTING THE GAME
  # ============================================================================

  Scenario: Clicking Start Game launches resource allocation phase
    Given the facilitator is on the lobby page
    And player "Alice" has joined as "SendWave" team
    And player "Bob" has joined as "Gmail" destination
    And the "Start Game" button is enabled
    When the facilitator clicks the "Start Game" button
    Then the game should transition from "lobby" phase to "resource_allocation" phase
    And the game round should be set to 1
    And all connected players should be notified of the game start

  Scenario: Players are redirected after game starts
    Given the facilitator is on the lobby page
    And sufficient players have joined
    When the facilitator clicks "Start Game"
    Then ESP team players should be redirected to their ESP dashboard
    And Destination players should be redirected to their Destination dashboard
    And the facilitator should see a game overview or remain in a control panel

  Scenario: Cannot start game twice
    Given the facilitator has clicked "Start Game"
    And the game has transitioned to "resource_allocation" phase
    When the facilitator tries to click "Start Game" again
    Then the button should no longer be visible or clickable
    And the game phase should remain "resource_allocation"

  # ============================================================================
  # ERROR HANDLING & VALIDATION
  # ============================================================================

  Scenario: Cannot start game without minimum configuration
    Given the facilitator is on the lobby page
    And only ESP teams are present (no Destinations)
    When the facilitator tries to click "Start Game"
    Then the button should be disabled
    And an error message should indicate "At least 1 Destination is required"

  Scenario: Cannot start game if already started
    Given a game session "ABC123" is already in "resource_allocation" phase
    When someone tries to access the lobby
    Then they should see a message "Game already started"
    And they should not see the lobby interface

  # ============================================================================
  # LOGGING
  # ============================================================================

  Scenario: Game start is logged
    Given the facilitator is on the lobby page
    And sufficient players have joined
    When the facilitator clicks "Start Game"
    Then an info log should be created with:
      | field           | value                          |
      | type            | game_started                   |
      | roomCode        | ABC123                         |
      | facilitatorId   | <facilitator ID>               |
      | playerCount     | <number of players>            |
      | espTeams        | <list of ESP team names>       |
      | destinations    | <list of destination names>    |
      | timestamp       | <ISO timestamp>                |

  Scenario: Failed game start attempt is logged
    Given the facilitator is on the lobby page
    And insufficient players are present
    When the facilitator tries to start the game
    Then a warning log should be created with:
      | field           | value                          |
      | type            | game_start_failed              |
      | roomCode        | ABC123                         |
      | reason          | insufficient_players           |
      | playerCount     | <current player count>         |
      | minRequired     | 2 (1 ESP + 1 Destination)      |
      | timestamp       | <ISO timestamp>                |

  # ============================================================================
  # NOTES
  # ============================================================================

  # What we're testing:
  # - Facilitator identification in session
  # - Start Game button visibility (only for facilitator)
  # - Start Game button state (enabled/disabled)
  # - Game launch process (lobby → resource_allocation, round 1)
  # - Player redirections after game start
  # - Error handling and validation
  # - Logging of game start events
  #
  # What we're NOT testing:
  # - Lobby display and player list (covered in US-1.2)
  # - Real-time updates (covered in US-1.2)
  # - Empty slots display (covered in US-1.2)
  # - Player counts (covered in US-1.2)
  # - WebSocket details (covered in US-7.5)
  # - Actual game logic after start (covered in US-2.x)
  #
  # Dependencies:
  # - US-1.1: Game session creation
  # - US-1.2: Player joining and lobby display
  # - WebSocket infrastructure for real-time updates
  #
  # Minimum requirements to start game:
  # - At least 1 ESP team player
  # - At least 1 Destination player
