Feature: US-8.2-0.0 - Facilitator Start Next Round

  As a facilitator
  I want to manually start the next round after reviewing consequences
  So that I can control the game pace and ensure players are ready to continue

  Background:
    Given a game session exists with room code "GAME01"
    And the game has 2 ESP teams: "SendWave" and "MailMonkey"
    And the game has 2 destinations: "zmail" and "intake"
    And facilitator "Facilitator" is managing the game

  # ========================================================================
  # Scenario 1: Button Visibility Based on Phase and Round
  # ========================================================================

  Scenario: 1.1 - Start Next Round button visibility during planning and consequences phases
    Given the game is in round 1
    And the current phase is "planning"
    When the facilitator views the facilitator dashboard
    Then the "Start Next Round" button should NOT be visible

    When all players lock in their decisions
    And the game transitions to "resolution" phase
    And the game transitions to "consequences" phase
    Then the "Start Next Round" button should be visible

  Scenario: 1.2 - Start Next Round button is NOT visible during consequences phase of Round 4
    Given the game is in round 4
    And the current phase is "consequences"
    When the facilitator views the facilitator dashboard
    Then the "Start Next Round" button should NOT be visible
    # Note: Victory screen button will be implemented in a separate user story

  # ========================================================================
  # Scenario 2: Starting Next Round - Core Functionality
  # ========================================================================

  Scenario: 2.1 - Successfully start Round 2 from Round 1 consequences
    Given the game is in round 1
    And the current phase is "consequences"
    When the facilitator clicks "Start Next Round" button
    Then the game should transition to round 2
    And the current phase should be "planning"
    And a planning phase timer should start with 300 seconds
    And all players should receive a phase transition notification

  # ========================================================================
  # Scenario 3: Lock-In State Reset
  # ========================================================================

  Scenario: 3.1 - Lock-in states are cleared when starting next round
    Given the game is in round 1
    And the current phase is "consequences"
    And ESP "SendWave" is locked in at "2025-01-10T10:30:00Z"
    And ESP "MailMonkey" is locked in at "2025-01-10T10:31:00Z"
    And destination "zmail" is locked in at "2025-01-10T10:30:30Z"
    And destination "intake" is locked in at "2025-01-10T10:31:30Z"
    When the facilitator clicks "Start Next Round" button
    Then ESP "SendWave" should NOT be locked in
    And ESP "MailMonkey" should NOT be locked in
    And destination "zmail" should NOT be locked in
    And destination "intake" should NOT be locked in

  # ========================================================================
  # Scenario 4: Dashboard Read-Only Mode Exit
  # ========================================================================

  Scenario: 4.1 - ESP dashboards exit read-only mode when planning phase starts
    Given the game is in round 1
    And the current phase is "consequences"
    And ESP "SendWave" player is viewing their results
    When the facilitator clicks "Start Next Round" button
    Then "SendWave" player is automatically directed to their dashboard
    And the ESP dashboard should exit read-only mode
    And the player should be able to acquire clients
    And the player should be able to purchase technical upgrades
    And the player should be able to manage client portfolio

  Scenario: 4.2 - Destination dashboards exit read-only mode when planning phase starts
    Given the game is in round 1
    And the current phase is "consequences"
    And destination "zmail" player is viewing their results
    When the facilitator clicks "Start Next Round" button
    Then "zmail" player is automatically directed to their dashboard
    And the destination dashboard should exit read-only mode
    And the player should be able to adjust filtering levels
    And the player should be able to purchase tools

  # ========================================================================
  # Scenario 5: State Persistence Across Rounds
  # ========================================================================

  Scenario: 5.1 - Acquired clients remain owned in the next round
    Given the game is in round 1
    And the current phase is "consequences"
    And ESP "SendWave" owns clients: ["client-001", "client-002"]
    When the facilitator clicks "Start Next Round" button
    Then ESP "SendWave" should still own clients: ["client-001", "client-002"]
    And those clients should appear in the portfolio

  Scenario: 5.2 - Purchased technical upgrades remain owned in the next round
    Given the game is in round 1
    And the current phase is "consequences"
    And ESP "SendWave" owns technical upgrades: ["spf", "dkim"]
    When the facilitator clicks "Start Next Round" button
    Then ESP "SendWave" should still own technical upgrades: ["spf", "dkim"]

  Scenario: 5.3 - Purchased destination tools remain owned in the next round
    Given the game is in round 1
    And the current phase is "consequences"
    And destination "zmail" owns tools: ["content_analysis_filter"]
    When the facilitator clicks "Start Next Round" button
    Then destination "zmail" should still own tools: ["content_analysis_filter"]

  Scenario: 5.4 - Paused clients remain paused in the next round
    Given the game is in round 1
    And the current phase is "consequences"
    And ESP "SendWave" owns client "client-001" with status "Paused"
    When the facilitator clicks "Start Next Round" button
    Then client "client-001" should still have status "Paused"
    And the player should be able to change the status to "Active" or keep it "Paused"

  Scenario: 5.5 - Suspended clients remain suspended in the next round
    Given the game is in round 1
    And the current phase is "consequences"
    And ESP "SendWave" owns client "client-002" with status "Suspended"
    When the facilitator clicks "Start Next Round" button
    Then client "client-002" should still have status "Suspended"
    And the suspension message should still be displayed

  Scenario: 5.6 - Onboarding options for existing clients are NOT editable in subsequent rounds
    Given the game is in round 1
    And ESP "SendWave" owns client "client-001" with warm-up enabled
    And the client was first activated in round 1
    When the facilitator clicks "Start Next Round" button
    And ESP "SendWave" player views the portfolio in round 2
    Then the warm-up checkbox should be visible but disabled
    And the list hygiene checkbox should be visible but disabled
    And the onboarding section should indicate "Set during Round 1"
    # Note: This behavior is already implemented - verify it still works

  Scenario: 5.7 - Newly acquired clients in Round 2 can have onboarding options configured
    Given the game is in round 2 planning phase
    And ESP "SendWave" acquires a new client "client-003"
    When ESP "SendWave" player views the portfolio
    Then the onboarding checkboxes for "client-003" should be editable
    And the player can enable warm-up and list hygiene for this new client
    # Note: This behavior is already implemented - verify it still works

  # ========================================================================
  # Scenario 6: UI Behavior and Feedback
  # ========================================================================

  Scenario: 6.1 - Button shows loading state while processing
    Given the game is in round 1
    And the current phase is "consequences"
    When the facilitator clicks "Start Next Round" button
    Then the button should show a loading state
    And the button should be disabled while processing
    And when the transition completes, the button should disappear

  Scenario: 6.2 - Error handling when API call fails
    Given the game is in round 1
    And the current phase is "consequences"
    And the next-round API endpoint will fail
    When the facilitator clicks "Start Next Round" button
    Then an error message should be displayed
    And the button should return to clickable state
    And the game should remain in consequences phase

  Scenario: 6.3 - No confirmation dialog is shown
    Given the game is in round 1
    And the current phase is "consequences"
    When the facilitator clicks "Start Next Round" button
    Then NO confirmation dialog should appear
    And the round should start immediately

  # ========================================================================
  # Scenario 7: Real-Time Updates to All Players
  # ========================================================================

  Scenario: 7.1 - All players receive real-time phase transition notification
    Given the game is in round 1
    And the current phase is "consequences"
    And ESP "SendWave" player is viewing consequences
    And destination "zmail" player is viewing consequences
    When the facilitator clicks "Start Next Round" button
    Then ESP "SendWave" player should see their planning phase dashboard
    And destination "zmail" player should see their planning phase dashboard
    And both should see "Round 2" displayed
    And both should see the planning timer counting down
