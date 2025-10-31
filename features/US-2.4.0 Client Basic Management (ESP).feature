# US-2.4.0: Client Basic Management (ESP)
# Epic 2: Player Interfaces

Feature: Client Basic Management for ESP Players
  As an ESP player
  I want to activate/inactivate my clients and configure onboarding optimization options
  So that I can optimize revenue and reputation without complex configuration

  Background:
    Given an ESP team "SendWave" exists with 1000 credits
    And the current game round is 1
    And the team has acquired the following clients:
      | client_name       | type                | risk_level | revenue | volume | first_active_round |
      | TechStart Inc.    | Growing Startup     | Medium     | 200     | 50000  | null               |
      | RetailWin Co.     | Re-engagement       | Medium     | 180     | 40000  | 1                  |
      | PromoMax Agency   | Aggressive Marketer | High       | 300     | 150000 | null               |
      | Premium Finance   | Premium Brand       | Low        | 150     | 10000  | 1                  |
    # Note: Clients with first_active_round = null have not been activated yet (are "new")
    # Note: Clients with first_active_round = 1 were already activated in round 1 (are "existing")

  # ============================================================================
  # SECTION 1: CLIENT LIST DISPLAY
  # ============================================================================

  Scenario: Display all owned clients with their status
    Given the team is on the client management page
    When the client list loads
    Then the following clients should be displayed:
      | client_name       | status |
      | TechStart Inc.    | Active |
      | RetailWin Co.     | Active |
      | PromoMax Agency   | Active |
      | Premium Finance   | Active |
    And each client should show: name, type, risk level, potential revenue, and volume

  Scenario Outline: Visual distinction between client status
    Given a client "<client_name>" has status "<status>"
    When the client list is displayed
    Then the client "<client_name>" should have visual style "<visual_style>"

    Examples:
      | client_name     | status    | visual_style              |
      | TechStart Inc.  | Active    | normal                    |
      | RetailWin Co.   | Paused    | grayed_out                |
      | PromoMax Agency | Suspended | locked_and_not_activable  |

  # ============================================================================
  # SECTION 2: NEW CLIENT ONBOARDING (FIRST ROUND)
  # ============================================================================

  Scenario: Display onboarding options for a new client
    Given the client "TechStart Inc." has not been activated yet (first_active_round is null)
    When the team views "TechStart Inc." card in client portfolio
    Then an "Onboarding" section should be displayed
    And the following options should be available:
      | option             | cost | effect_description                                              |
      | Activate Warm-up   | 150  | Reduces volume 50%, +2 reputation, reduce reputation risk      |
      | Activate List Hygiene | 80   | Permanent risk reduction 50%                                    |
    And both options should be checkboxes that can be selected independently
    And neither option should be mandatory

  Scenario: Purchase warm-up for a new high-risk client
    Given the client "PromoMax Agency" has not been activated yet with risk level "High"
    And the team has 1000 credits
    When the team checks "Activate Warm-up" for "PromoMax Agency"
    Then the warm-up option should be selected
    And the estimated cost should increase by 150 credits
    And the budget preview should show 850 remaining credits

  Scenario: Purchase list hygiene for a new client
    Given the client "TechStart Inc." has not been activated yet
    And the team has 1000 credits
    When the team checks "Activate List Hygiene" for "TechStart Inc."
    Then the list hygiene option should be selected
    And the estimated cost should increase by 80 credits
    And the budget preview should show 920 remaining credits

  Scenario: Purchase both warm-up and list hygiene for a new client
    Given the client "PromoMax Agency" has not been activated yet with risk level "High"
    And the team has 1000 credits
    When the team checks "Activate Warm-up" for "PromoMax Agency"
    And the team checks "Activate List Hygiene" for "PromoMax Agency"
    Then both options should be selected
    And the estimated cost should increase by 230 credits
    And the budget preview should show 770 remaining credits

  Scenario: Warning displayed for risky client without protections
    Given the client "PromoMax Agency" has not been activated yet with risk level "High"
    When the team views the client without selecting any onboarding options
    Then a warning should be displayed saying "High-risk client without protections"
    But the team should still be able to activate the client

  Scenario: Toggle new client active/paused
    Given the client "TechStart Inc." has not been activated yet
    When the team toggles "TechStart Inc." to "Paused"
    Then "TechStart Inc." should show status "Paused"
    And "TechStart Inc." should be excluded from revenue calculations
    And the onboarding options should still be available for future activation

  # ============================================================================
  # SECTION 3: EXISTING CLIENT MANAGEMENT (SUBSEQUENT ROUNDS)
  # ============================================================================

  Scenario: Display existing client without onboarding options
    Given the client "RetailWin Co." has been activated before (first_active_round is 1)
    When the team views "RetailWin Co." details
    Then no "Onboarding" section should be displayed
    And only an "Active/Pause" toggle should be available
    But the client's permanent attributes should be shown:
      | attribute           | value |
      | Has Warm-up History | Yes   |
      | Has List Hygiene    | Yes   |

  Scenario: Toggle existing client between active and paused
    Given the client "RetailWin Co." has first_active_round of 1
    And the current game round is 3
    And "RetailWin Co." currently has status "Active"
    When the team toggles "RetailWin Co." to "Paused"
    Then "RetailWin Co." should show status "Paused"
    And "RetailWin Co." should be excluded from revenue calculations
    When the team toggles "RetailWin Co." to "Active"
    Then "RetailWin Co." should show status "Active"
    And "RetailWin Co." should be included in revenue calculations

  Scenario: Existing client with no onboarding history
    Given the client "Premium Finance" has first_active_round of 1
    And "Premium Finance" never had warm-up or list hygiene activated
    When the team views "Premium Finance" details
    Then the client's permanent attributes should show:
      | attribute           | value |
      | Has Warm-up History | No    |
      | Has List Hygiene    | No    |

  # ============================================================================
  # SECTION 4: BUDGET MANAGEMENT
  # ============================================================================

  Scenario: Real-time budget calculation as options are selected
    Given the team has 1000 credits
    And the following clients have not been activated yet:
      | client_name     | warm_up_cost | list_hygiene_cost |
      | TechStart Inc.  | 150          | 80                |
      | PromoMax Agency | 150          | 80                |
    When the team checks "Activate Warm-up" for "TechStart Inc."
    Then the budget preview should show 850 remaining credits
    When the team checks "Activate List Hygiene" for "PromoMax Agency"
    Then the budget preview should show 770 remaining credits

  Scenario: Warning when insufficient budget
    Given the team has 150 credits
    And the client "TechStart Inc." has not been activated yet
    When the team checks "Activate Warm-up" for "TechStart Inc."
    Then the warm-up option should be selected without warning
    When the team tries to check "Activate List Hygiene" for "TechStart Inc."
    Then a warning should be displayed: "Insufficient budget"
    And the budget preview should show -80 credits (negative)
    And the lock-in button should be disabled

  Scenario: Prevent confirmation when over budget
    Given the team has 100 credits
    And the client "PromoMax Agency" has not been activated yet
    When the team checks "Activate Warm-up" for "PromoMax Agency"
    And the team checks "Activate List Hygiene" for "PromoMax Agency"
    Then the budget preview should show -130 credits
    And the lock-in button should be disabled
    And a message should say "Cannot lock in: over budget by 130 credits"

  # ============================================================================
  # SECTION 5: REVENUE PREVIEW
  # ============================================================================

  Scenario: Calculate estimated revenue with active clients
    Given the following clients are active:
      | client_name       | revenue_per_round |
      | TechStart Inc.    | 200               |
      | RetailWin Co.     | 180               |
      | Premium Finance   | 150               |
    When the team views the revenue preview
    Then the estimated revenue should be 530 credits

  Scenario: Exclude paused clients from revenue preview
    Given the following clients exist:
      | client_name       | status | revenue_per_round |
      | TechStart Inc.    | Active | 200               |
      | RetailWin Co.     | Paused | 180               |
      | Premium Finance   | Active | 150               |
    When the team views the revenue preview
    Then the estimated revenue should be 350 credits
    And "RetailWin Co." should not be included in the calculation

  Scenario: Account for onboarding costs in net revenue
    Given the team has 1000 credits
    And the following clients have not been activated yet:
      | client_name     | revenue_per_round | warm_up_selected | list_hygiene_selected |
      | TechStart Inc.  | 200               | true             | true                  |
      | PromoMax Agency | 300               | false            | true                  |
    When the team views the budget after lock-in preview
    Then the onboarding costs should be 310 credits
    And the estimated revenue should be 500 credits
    And the net budget change should be +190 credits
    And the final budget preview should show 1190 credits

  # ============================================================================
  # SECTION 6: CLIENT STATE PERSISTENCE
  # ============================================================================

  Scenario: Client state is stored correctly
    Given the client "TechStart Inc." has not been activated yet
    And the current game round is 1
    When the team activates "TechStart Inc." with warm-up
    And the team locks in decisions
    Then "TechStart Inc." should have the following stored attributes:
      | attribute          | value  |
      | status             | Active |
      | has_warmup         | true   |
      | has_list_hygiene   | false  |
      | first_active_round | 1      |

  Scenario: Client becomes existing after first active round
    Given the client "TechStart Inc." was activated in round 2 with warm-up
    And the game advances to round 3
    When the team views "TechStart Inc." in round 3
    Then "TechStart Inc." should not be considered new (first_active_round = 2, current round = 3)
    And no onboarding options should be available
    And the permanent attributes should show:
      | attribute        | value |
      | has_warmup       | true  |
      | has_list_hygiene | false |

  # ============================================================================
  # SECTION 7: SUSPENDED CLIENTS
  # ============================================================================

  Scenario: Suspended client cannot be activated
    Given the client "BadReputation Corp." has status "Suspended"
    When the team views "BadReputation Corp." details
    Then the client should have a locked visual indicator
    And the Active/Pause toggle should be disabled
    And a message should explain "Client suspended due to severe reputation damage"

  # ============================================================================
  # SECTION 8: DECISION LOCK-IN
  # ============================================================================

  Scenario: Lock in client decisions within budget
    Given the team has 1000 credits
    And the following decisions are made:
      | client_name     | status | warm_up | list_hygiene |
      | TechStart Inc.  | Active | true    | true         |
      | PromoMax Agency | Paused | false   | false        |
      | Premium Finance | Active | false   | false        |
    When the team locks in decisions
    Then the team should have 770 credits remaining
    And "TechStart Inc." should be marked as active with onboarding options purchased
    And "PromoMax Agency" should be marked as paused
    And "Premium Finance" should be marked as active

  Scenario: Prevent lock-in when over budget
    Given the team has 100 credits
    And the client "TechStart Inc." has warm-up and list hygiene selected (230 credits)
    When the team attempts to lock in decisions
    Then the lock-in should be prevented
    And an error message should say "Cannot lock in: insufficient budget"

  # ============================================================================
  # NOTES
  # ============================================================================

  # What we're testing:
  # - Client list display with correct status visualization
  # - New client onboarding options (warm-up, list hygiene) availability and cost calculation
  # - Existing client simple toggle (no configuration)
  # - Real-time budget calculations as user makes selections
  # - Revenue preview calculations including active/paused status
  # - Client state persistence (status: active/paused/suspended, has_warmup, has_list_hygiene, first_active_round)
  # - Budget validation and lock-in prevention when over budget
  # - Suspended client handling (cannot be activated)
  # - Distinction between new clients (first_active_round = null) and existing clients (first_active_round set)
  #
  # What we're NOT testing:
  # - UI/UX details (modal opening, button styling, animations) - implementation details
  # - Client acquisition process - covered by US-2.2
  # - Actual gameplay mechanics (reputation calculation, email delivery) - covered by game engine US
  # - WebSocket real-time synchronization - covered by US-7.5
  # - Logging details - will be verified in integration tests
  #
  # Dependencies:
  # - US-2.2: Client Marketplace (ESP) - clients must be acquired before management
  # - US-2.1: ESP Dashboard - provides the interface context
  # - Game engine mechanics for reputation and revenue calculations
