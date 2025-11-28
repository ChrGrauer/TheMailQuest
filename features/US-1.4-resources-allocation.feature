# US-1.4: Resources Allocation
# Epic: Epic 1 - Game Session Management

Feature: Resources Allocation and Game Start
  As a facilitator
  Once I create the session and start the game
  I want to allocate the starting resources
  So that the game first round can begin

  Background:
    Given the application is running
    And a game session with room code "ABC123" exists
    And the facilitator has clicked "Start Game"
    And the game has transitioned to "resource_allocation" phase

  # ============================================================================
  # STARTING RESOURCES DISTRIBUTION - ESP TEAMS
  # ============================================================================

  Scenario: ESP teams receive starting resources
    Given 3 ESP teams have joined the game:
      | Team Name   | Player Name |
      | SendWave    | Alice       |
      | MailMonkey  | Bob         |
      | BluePost    | Charlie     |
    When the resource allocation process starts
    Then each ESP team should receive:
      | Resource   | Value |
      | Credits    | 1000  |
      | Reputation | 70    |
    And each ESP team state should be initialized with:
      | Field               | Value |
      | Active Clients      | []    |
      | Technical Auth      | []    |
      | Round History       | []    |

  # ============================================================================
  # STARTING RESOURCES DISTRIBUTION - DESTINATIONS
  # ============================================================================

  Scenario: Destinations receive starting resources
    Given 3 Destination players have joined the game:
      | Destination | Player Name | Budget |
      | Gmail       | Grace       | 500    |
      | Outlook     | Henry       | 350    |
      | Yahoo       | Iris        | 200    |
    When the resource allocation process starts
    Then each destination should receive their specific budget
    And each destination state should be initialized with:
      | Field              | Value |
      | Filtering Policies | {}    |
      | ESP Reputation     | {}    |
      | User Satisfaction  | 100   |

  # ============================================================================
  # GAME STATE TRANSITION
  # ============================================================================

  Scenario: Game transitions to Planning Phase
    Given all starting resources have been allocated
    When the resource allocation completes successfully
    Then the game phase should transition to "planning"
    And the current round should be set to 1
    And the phase start time should be recorded
    And a WebSocket message should be broadcast with:
      | field          | value    |
      | type           | game_state_update |
      | phase          | planning |
      | round          | 1        |
      | timer_duration | 300      |
      | timer_remaining| 300      |

  Scenario: Game timer starts automatically
    Given the game has transitioned to Planning Phase
    When the phase transition completes
    Then a countdown timer should start with:
      | Property        | Value       |
      | Duration        | 300 seconds |
      | Auto-decrement  | true        |
      | Visible to all  | true        |
    And the timer should decrement every second
    And the remaining time should be broadcast via WebSocket every second

  # ============================================================================
  # PLAYER DASHBOARD REDIRECTION
  # ============================================================================

  Scenario: ESP player redirects to ESP dashboard
    Given player "Alice" is on ESP team "SendWave"
    And the resource allocation has completed
    When the game transitions to Planning Phase
    Then player "Alice" should be automatically redirected to "/game/ABC123/esp/sendwave"

  Scenario: Destination player redirects to Destination dashboard
    Given player "Grace" is a Destination player for "Gmail"
    And the resource allocation has completed
    When the game transitions to Planning Phase
    Then player "Grace" should be automatically redirected to "/game/ABC123/destination/gmail"

  Scenario: Facilitator redirects to facilitator dashboard
    Given the facilitator is on the lobby page
    And the resource allocation has completed
    When the game transitions to Planning Phase
    Then the facilitator should be automatically redirected to "/game/ABC123/facilitator"

  # ============================================================================
  # WEBSOCKET SYNCHRONIZATION
  # ============================================================================

  Scenario: All clients receive resource allocation notification
    Given 5 ESP teams and 3 Destinations are connected
    When the resource allocation process completes
    Then all 8 clients should receive a WebSocket message of type "resources_allocated"
    And the message should contain:
      | field         | description                    |
      | esp_teams     | array of ESP team resources    |
      | destinations  | array of destination resources |
    And each client should update their local state
    And each client should acknowledge receipt within 2 seconds

  Scenario: Client fails to receive allocation notification
    Given ESP team "SendWave" is experiencing network issues
    And the resource allocation process starts
    When the WebSocket message fails to deliver after 3 attempts
    Then the server should log a warning:
      """
      Failed to deliver resources_allocated to team SendWave after 3 attempts
      """
    And the team should be marked as "sync_pending"

  Scenario: Late-joining client receives current game state
    Given the game has already started and is in Planning Phase
    And ESP team "SendWave" player "Alice" has disconnected
    When player "Alice" reconnects to the game
    Then "Alice" should receive a full state sync message of type "full_state_sync"
    And the message should contain:
      | field          | value                    |
      | phase          | planning                 |
      | round          | 1                        |
      | team_resources | credits: 1000, rep: 70   |
      | timer_remaining| current remaining time   |
    And "Alice" should be redirected to "/game/ABC123/esp/sendwave"
    And "Alice" should see the current game state

  # ============================================================================
  # ERROR HANDLING AND EDGE CASES
  # ============================================================================

  Scenario: Allocation fails due to missing configuration
    Given the game session is missing default configuration values
    When the facilitator clicks "Start Game"
    Then the resource allocation should fail
    And an error message should be displayed:
      """
      Cannot start game: Missing game configuration
      """
    And the game should remain in "lobby" phase
    And an error log should be created with:
      | field  | value                                                      |
      | type   | resource_allocation_failed                                 |
      | reason | missing config values [starting_credits, starting_reputation] |

  Scenario: Allocation succeeds with custom configuration
    Given the facilitator has customized starting values:
      | Parameter            | Custom Value |
      | ESP Starting Credits | 1200         |
      | ESP Reputation       | 80           |
      | Gmail Budget         | 600          |
    When the resource allocation process starts
    Then ESP teams should receive starting credits of 1200
    And ESP teams should receive starting reputation of 80
    And Gmail should receive budget of 600

  Scenario: No destinations joined the game
    Given only ESP teams have joined the game
    And no Destination players are present
    When the facilitator attempts to start the game
    Then the resource allocation should not begin
    And an error message should be displayed:
      """
      Cannot start game: At least 1 Destination player required
      """
    And the "Start Game" button should remain disabled

  Scenario: Insufficient ESP teams
    Given only Destination players have joined the game
    And no ESP teams are present
    When the facilitator attempts to start the game
    Then the resource allocation should not begin
    And an error message should be displayed:
      """
      Cannot start game: At least 1 ESP team required
      """

  Scenario: Allocation process interrupted by server restart
    Given the resource allocation process has started
    And 2 out of 5 teams have received their resources
    When the server crashes or restarts
    Then the allocation process should be rolled back
    And the game should remain in "lobby" phase
    And all players should be notified:
      """
      Game start was interrupted. Please try again.
      """
    And the facilitator should be able to restart the process

  # ============================================================================
  # LOGGING AND AUDIT TRAIL
  # ============================================================================

  Scenario: Successful allocation is logged
    Given the resource allocation completes successfully
    When all resources are distributed
    Then info logs should be created documenting:
      | log entry                                  |
      | Resource allocation started for room ABC123|
      | Allocated 1000 credits to ESP team SendWave|
      | Allocated 500 credits to destination Gmail |
      | Game transitioned to phase: planning       |
      | Resource allocation completed successfully |
    And the total allocation time should be logged

  Scenario: Failed allocation is logged with details
    Given the resource allocation fails due to network error
    When the failure is detected
    Then error logs should be created with:
      | field         | value                                      |
      | type          | resource_allocation_failed                 |
      | roomCode      | ABC123                                     |
      | reason        | WebSocket connection timeout               |
      | teams_notified| 2/5                                        |
      | action        | Rolling back allocation                    |
    And the error should include a stack trace
    And the game session state should be available for debugging

  Scenario: Timer start is logged
    Given the game has transitioned to Planning Phase
    When the timer starts
    Then an info log should be created with:
      | field          | value                          |
      | type           | timer_started                  |
      | phase          | planning                       |
      | duration       | 300                            |
      | expected_end   | <calculated timestamp>         |
      | clients_count  | 8                              |

  # ============================================================================
  # PERFORMANCE AND LOAD
  # ============================================================================

  Scenario: Allocation completes within time limit
    Given a game with 5 ESP teams and 3 Destinations
    When the resource allocation process starts
    Then the entire process should complete within 2 seconds
    And all WebSocket messages should be delivered within 500ms
    And the timer should start within 100ms of phase transition

  Scenario: Allocation handles maximum player count
    Given a game with 5 ESP teams and 3 Destinations
    When the resource allocation process starts
    Then all 8 clients should receive notifications
    And the process should complete successfully
    And no client should experience timeout errors
    And the game should transition smoothly to Planning Phase

  # ============================================================================
  # STATE PERSISTENCE (IN-MEMORY)
  # ============================================================================

  Scenario: Game state is available in memory after allocation
    Given the resource allocation has completed successfully
    When the game state is stored in memory
    Then the following should be available:
      | Field            | Value          |
      | phase            | planning       |
      | round            | 1              |
      | phase_start_time | <timestamp>    |
      | esp_teams        | <team_data>    |
      | destinations     | <dest_data>    |
    And the state should be queryable by all game components

  Scenario: Player can reconnect and resume after allocation
    Given player "Alice" from team "SendWave" disconnects after resource allocation
    When player "Alice" reconnects to the game
    Then "Alice" should be redirected to the ESP dashboard
    And "Alice" should see the allocated resources:
      | Credits    | 1000 |
      | Reputation | 70   |
    And the timer should show the current remaining time
    And "Alice" should be able to continue playing normally

  # ============================================================================
  # NOTES
  # ============================================================================

  # What we're testing:
  # - Starting resources distribution (ESP: 1000 credits, 70 reputation)
  # - Starting resources distribution (Destinations: kingdom-specific budgets)
  # - Game state transition (lobby → resource_allocation → planning)
  # - Timer initialization and start (5 minutes = 300 seconds)
  # - Automatic player redirections to appropriate dashboards
  # - Facilitator redirection to facilitator dashboard
  # - WebSocket synchronization for all clients
  # - Error handling (missing players, configuration, network failures)
  # - Logging and audit trail
  # - Performance requirements (2s total, 500ms messages, 100ms timer)
  # - In-memory state availability
  # - Reconnection and state recovery
  #
  # What we're NOT testing:
  # - Lobby display (covered in US-1.2)
  # - Start Game button (covered in US-1.3)
  # - Actual game logic during Planning Phase (covered in US-3.x for ESP, US-4.x for Destinations)
  # - Dashboard UI details (covered in their respective US)
  # - Database persistence (not implemented in MVP)
  #
  # Dependencies:
  # - US-1.1: Game session creation
  # - US-1.2: Player joining
  # - US-1.3: Start game button
  # - US-3.x: ESP dashboard (for redirect target)
  # - US-4.x: Destination dashboard (for redirect target)
  #
  # Starting Resources:
  # ESP Teams:
  #   - Credits: 1,000
  #   - Reputation: 70 (per destination)
  #
  # Destinations:
  #   - Gmail: 500 credits
  #   - Outlook: 350 credits
  #   - Yahoo: 200 credits
  #
  # Timer Configuration:
  #   - Planning Phase: 5 minutes (300 seconds)
  #   - Updates broadcast every second via WebSocket
  #
  # Performance Requirements:
  #   - Total allocation process: < 2 seconds
  #   - WebSocket message delivery: < 500ms
  #   - Timer start delay: < 100ms
  #
  # Critical Success Factors:
  #   1. Resources must be allocated atomically (all or nothing)
  #   2. WebSocket synchronization must be reliable
  #   3. Timer must start exactly when phase transition completes
  #   4. Redirects must be automatic and immediate
  #   5. Error recovery must be robust
