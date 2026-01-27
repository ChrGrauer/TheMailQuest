# US-1.2: Join Game Session
# Epic: Epic 1 - Game Session Management

Feature: Join Game Session
  As a player
  I want to join an existing game session
  So that I can participate in the game

  Background:
    Given the application is running
    And a game session with room code "ABC123" exists
    And the game session is in "lobby" phase

  # ============================================================================
  # ROOM CODE ENTRY AND VALIDATION
  # ============================================================================

  Scenario: Player enters valid room code
    Given a player is on the landing page
    When the player clicks "Join a game"
    And the player enters room code "ABC123"
    And the player submits the form
    Then the system should validate the room code
    And the player should be redirected to the lobby page
    And the player should see the role selection screen

  Scenario Outline: Player enters invalid or non-existent room code
    Given a player is on the join page
    When the player enters room code "<room_code>"
    And the player submits the form
    Then the system should validate the room code
    And the validation should fail
    And the player should see an error message "Room not found. Please check the code."
    And the player should remain on the join page

    Examples:
      | room_code |
      | INVALID   |
      | XYZ999    |
      | 123456    |

  Scenario: Player enters room code with wrong format
    Given a player is on the join page
    When the player enters room code "AB12" 
    And the player submits the form
    Then the system should show a format error
    And the error message should say "Room code must be 6 characters"

  # ============================================================================
  # ROLE SELECTION SCREEN
  # ============================================================================

  Scenario: Player sees available roles on lobby page
    Given a player has entered valid room code "ABC123"
    When the player is on the lobby page
    Then the player should see 5 ESP team slots
    And the player should see 3 Destination slots

  Scenario: Player sees occupied slots as unavailable
    Given player "Alice" has joined as "SendWave" team
    And player "Bob" has joined as "zmail" destination
    When a new player "Charlie" joins the lobby
    Then Charlie should see "SendWave" as unavailable/occupied
    And Charlie should see "zmail" as unavailable/occupied
    And Charlie should see the other 7 slots as available

  # ============================================================================
  # PLAYER JOINS GAME
  # ============================================================================

  Scenario: Player selects ESP team role and joins
    Given a player is on the lobby page
    When the player selects "SendWave" team slot
    And the player enters display name "Alice"
    And the player confirms their selection
    Then the player should be added to the game session
    And the player's role should be "ESP" 
    And the player's team should be "SendWave"
    And the player's display name should be "Alice"
    And the "SendWave" slot should be marked as occupied

  Scenario: Player selects Destination role and joins
    Given a player is on the lobby page
    When the player selects "zmail" destination slot
    And the player enters display name "Bob"
    And the player confirms their selection
    Then the player should be added to the game session
    And the player's role should be "Destination"
    And the player's team should be "zmail"
    And the player's display name should be "Bob"
    And the "zmail" slot should be marked as occupied

  Scenario: Player cannot join with empty display name
    Given a player is on the lobby page
    When the player selects "SendWave" team slot
    And the player leaves the display name field empty
    And the player tries to confirm their selection
    Then the system should show a validation error
    And the error message should say "Name is required"
    And the player should not be added to the game session

  # ============================================================================
  # PREVENT DUPLICATE ROLE SELECTION
  # ============================================================================

  Scenario: Player cannot select already occupied ESP team slot
    Given player "Alice" has joined as "SendWave" team
    When a new player "Bob" tries to select "SendWave" team slot
    Then the system should prevent the selection
    And the player should see a message "This role is already taken"
    And the player should remain on role selection

  Scenario: Player cannot select already occupied Destination slot
    Given player "Alice" has joined as "zmail" destination
    When a new player "Bob" tries to select "zmail" destination slot
    Then the system should prevent the selection
    And the player should see a message "This role is already taken"

  Scenario: Two players try to select same role simultaneously
    Given two players "Alice" and "Bob" are on the lobby page
    When both players select "SendWave" team slot at the same time
    And both players confirm their selection simultaneously
    Then only the first player to confirm should be added
    And the second player should see "This role is already taken"
    And the second player should be able to select another available role

  # ============================================================================
  # REAL-TIME LOBBY UPDATES
  # ============================================================================

  Scenario: All players see lobby updates when someone joins
    Given players "Alice" and "Bob" are in the lobby
    And both have selected their roles
    When a new player "Charlie" joins as "BluePost" team
    Then Alice should see "BluePost" slot marked as occupied
    And Bob should see "BluePost" slot marked as occupied
    And the lobby should show 3 players in total

  Scenario: Player count is updated in real-time
    Given the lobby shows "ESP Teams: 0/5" and "Destinations: 0/3"
    When player "Alice" joins as "SendWave" team
    Then all players in the lobby should see "ESP Teams: 1/5"
    When player "Bob" joins as "zmail" destination
    Then all players in the lobby should see "Destinations: 1/3"

  # ============================================================================
  # SESSION VALIDATION
  # ============================================================================

  Scenario: Player cannot join expired session
    Given a game session with room code "OLD123" expired 1 hour ago
    When a player tries to join room "OLD123"
    Then the system should reject the join request
    And the player should see "This session has expired"

  Scenario: Player cannot join full session
    Given a game session "ABC123" has all 8 slots occupied
    When a new player tries to join room "ABC123"
    Then the system should reject the join request
    And the player should see "This session is full"

  Scenario: Player cannot join session that already started
    Given a game session "ABC123" has started (round 1)
    When a new player tries to join room "ABC123"
    Then the system should reject the join request
    And the player should see "This game has already started"

  # ============================================================================
  # ERROR HANDLING & LOGGING
  # ============================================================================

  Scenario: Player join failure is logged
    Given a player tries to join with invalid data
    When the join attempt fails
    Then an error log should be created with:
      | field       | value                          |
      | type        | player_join_failed             |
      | roomCode    | <room code>                    |
      | playerName  | <attempted display name>       |
      | reason      | <failure reason>               |
      | timestamp   | <ISO timestamp>                |

  Scenario: Successful player join is logged
    Given a player successfully joins a game session
    Then an info log should be created with:
      | field       | value                          |
      | type        | player_joined                  |
      | roomCode    | <room code>                    |
      | playerId    | <player ID>                    |
      | playerName  | <display name>                 |
      | role        | <ESP or Destination>           |
      | team        | <team name>                    |
      | timestamp   | <ISO timestamp>                |

  # ============================================================================
  # NOTES
  # ============================================================================

  # What we're testing:
  # - Room code validation workflow
  # - Role selection and display
  # - Player joining logic
  # - Duplicate role prevention
  # - Real-time lobby updates
  # - One-player-per-ESP-team restriction
  # - Session state validation
  # - Error handling and logging
  #
  # What we're NOT testing:
  # - WebSocket connection details (covered in US-7.5)
  # - Game start logic (covered in US-2.x)
  # - Player disconnection handling (covered in US-1.3)
  # - Advanced lobby features
  #
  # Dependencies:
  # - US-1.1: Game session must exist
  # - WebSocket infrastructure for real-time updates
  # - Session validation logic
