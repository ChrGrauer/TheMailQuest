Feature: US-8.2-0.1 - Facilitator Basic Controls

  As a facilitator
  I want to control game flow with pause, extend timer, and end phase actions
  So that I can animate the session effectively

  Background:
    Given a game session exists with room code "CTRL01"
    And the game has 2 ESP teams: "SendWave" and "MailMonkey"
    And the game has 2 destinations: "zmail" and "intake"
    And facilitator "Facilitator" is managing the game

  # ========================================================================
  # Scenario Outline: Control Button Visibility Based on Phase
  # ========================================================================

  Scenario Outline: Control buttons visibility during different phases
    Given the game is in round <round>
    And the current phase is "<phase>"
    When the facilitator views the facilitator dashboard
    Then the "Pause Game" button should be <pause_visible>
    And the "Extend Timer" button should be <extend_visible>
    And the "End Current Phase" button should be <end_phase_visible>
    And the "End Game Early" button should be <end_game_visible>

    Examples:
      | round | phase        | pause_visible | extend_visible | end_phase_visible | end_game_visible |
      | 1     | planning     | visible       | visible        | visible           | NOT visible      |
      | 2     | planning     | visible       | visible        | visible           | NOT visible      |
      | 1     | resolution   | NOT visible   | NOT visible    | NOT visible       | NOT visible      |
      | 1     | consequences | NOT visible   | NOT visible    | NOT visible       | visible          |
      | 2     | consequences | NOT visible   | NOT visible    | NOT visible       | visible          |
      | 3     | consequences | NOT visible   | NOT visible    | NOT visible       | visible          |
      | 4     | consequences | NOT visible   | NOT visible    | NOT visible       | NOT visible      |

  # ========================================================================
  # Pause Game Functionality
  # ========================================================================

  Scenario: Pause and resume game during planning phase
    Given the game is in round 1
    And the current phase is "planning"
    And the timer shows 4:59min remaining
    When the facilitator clicks "Pause Game" button
    Then the timer should stop counting down
    And the timer display should show a "Paused" indicator
    And all players should see a "Game Paused" indicator on their timer
    And the "Pause Game" button should change to "Resume Game"
    # Verify timer stays frozen
    When 5 seconds pass in real time
    Then the timer should still show approximately 4:59min remaining
    # Resume
    When the facilitator clicks "Resume Game" button
    Then the timer should resume counting down
    And the timer display should NOT show a "Paused" indicator
    And all players should NOT see a "Game Paused" indicator
    And the "Resume Game" button should change back to "Pause Game"

  Scenario: Players can still interact with dashboard while game is paused
    Given the game is in round 1
    And the current phase is "planning"
    And the game is paused
    When ESP "SendWave" player attempts to purchase technical upgrade "spf"
    Then the purchase should succeed
    And "SendWave" should own technical upgrade "spf"

  # ========================================================================
  # Extend Timer Functionality
  # ========================================================================

  Scenario: Extend timer adds 60 seconds per click for all connected players in real-time
    Given the game is in round 1
    And the current phase is "planning"
    And the timer shows 120 seconds remaining
    And ESP "SendWave" player is viewing their dashboard
    And destination "zmail" player is viewing their dashboard
    When the facilitator clicks "Extend Timer" button
    Then the timer should show approximately 180 seconds remaining
    And an action log entry should be created for "Timer Extended"
    Then ESP "SendWave" player should see timer showing approximately 180 seconds
    And destination "zmail" player should see timer showing approximately 180 seconds
    # Second click
    When the facilitator clicks "Extend Timer" button
    Then the timer should show approximately 240 seconds remaining
    # Third click - verify no limit
    When the facilitator clicks "Extend Timer" button
    Then the timer should show approximately 300 seconds remaining

  # ========================================================================
  # End Current Phase Functionality
  # ========================================================================

  Scenario: End current phase shows confirmation dialog
    Given the game is in round 1
    And the current phase is "planning"
    When the facilitator clicks "End Current Phase" button
    Then a confirmation dialog should appear
    And the dialog should display "Are you sure you want to end the current planning phase?"
    When the facilitator clicks "Cancel" on the confirmation dialog
    Then the dialog should close
    And the current phase should still be "planning"

  Scenario: End current phase triggers resolution after confirmation
    Given the game is in round 1
    And the current phase is "planning"
    And ESP "SendWave" has locked in their decisions
    And ESP "MailMonkey" has NOT locked in their decisions
    When the facilitator clicks "End Current Phase" button
    And the facilitator confirms the action
    Then the game should transition to "resolution" phase
    And all players should receive a phase transition notification
    And an action log entry should be created for "Phase Ended Early"

  Scenario: End current phase applies auto-lock algorithm to players who haven't locked in
    Given the game is in round 2
    And the current phase is "planning"
    And ESP "SendWave" has budget 100
    And ESP "SendWave" has pending onboarding decisions:
      | client     | warm_up | list_hygiene |
      | client-001 | true    | true         |
    # Warm-up costs 150, List hygiene costs 80 = total 230 > 100 budget
    And ESP "SendWave" has NOT locked in their decisions
    When the facilitator clicks "End Current Phase" button
    And the facilitator confirms the action
    Then ESP "SendWave" pending decisions should be auto-corrected
    And warm_up for "client-001" should be removed due to insufficient budget
    And the game should transition to "resolution" phase

  Scenario: End current phase removes investigation votes if destination has insufficient budget
    Given the game is in round 2
    And the current phase is "planning"
    And destination "zmail" has budget 30
    And destination "zmail" has a pending investigation vote for ESP "SendWave"
    # Investigation costs 50 > 30 budget
    And destination "zmail" has NOT locked in their decisions
    When the facilitator clicks "End Current Phase" button
    And the facilitator confirms the action
    Then the investigation vote from "zmail" should be removed
    And the game should transition to "resolution" phase

  # ========================================================================
  # End Game Early Functionality
  # ========================================================================

  Scenario: End game early shows confirmation dialog
    Given the game is in round 2
    And the current phase is "consequences"
    When the facilitator clicks "End Game Early" button
    Then a confirmation dialog should appear
    And the dialog should display "Are you sure you want to end the game early? Final scores will be calculated based on current state."
    When the facilitator clicks "Cancel" on the confirmation dialog
    Then the dialog should close
    And the current phase should still be "consequences"
    And the game should still be in round 2

  Scenario: End game early calculates final scores after confirmation
    Given the game is in round 2
    And the current phase is "consequences"
    When the facilitator clicks "End Game Early" button
    And the facilitator confirms the action
    Then final scores should be calculated for all teams
    And the game should transition to "finished" phase
    And all players should see the victory screen
    And an action log entry should be created for "Game Ended Early"

  # ========================================================================
  # Real-time Updates and Logging
  # ========================================================================

  Scenario: All facilitator actions are logged
    Given the game is in round 1
    And the current phase is "planning"
    When the facilitator clicks "Pause Game" button
    Then an action log entry should be created with:
      | field     | value        |
      | action    | pause_game   |
      | timestamp | current_time |
    When the facilitator clicks "Resume Game" button
    Then an action log entry should be created with:
      | field     | value        |
      | action    | resume_game  |
      | timestamp | current_time |
    When the facilitator clicks "Extend Timer" button
    Then an action log entry should be created with:
      | field           | value        |
      | action          | extend_timer |
      | added_seconds   | 60           |
      | timestamp       | current_time |
