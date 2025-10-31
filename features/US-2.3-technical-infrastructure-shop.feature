# US-2.3: Technical Infrastructure Shop (ESP)
# Epic 2: Player Interfaces

Feature: Technical Infrastructure Shop for ESP players
  As an ESP player
  I want to purchase authentication and infrastructure upgrades
  So that I can improve delivery success rates and meet mandatory requirements

  Background:
    Given an ESP team "SendWave" is in an active game
    And the team has a budget of 1000 credits
    And the current round is round 2 of 4

  # ============================================================================
  # SECTION 1: SHOP DISPLAY AND VISIBILITY
  # ============================================================================

  Scenario: Display available technical upgrades in shop
    When the ESP player opens the technical infrastructure shop
    Then the shop should display the following upgrades:
      | Upgrade Name         | Category                    | Status    |
      | SPF Authentication   | Email Authentication        | Available |
      | DKIM Signature       | Email Authentication        | Available |
      | DMARC Policy         | Email Authentication        | Available |
      | Content Filtering    | Quality Control             | Available |
      | Advanced Monitoring  | Intelligence                | Available |
    And each upgrade should show its cost in credits
    And each upgrade should show a description of its effects
    And each upgrade should show its category label

  Scenario: Display purchase requirements for each upgrade
    When the ESP player opens the technical infrastructure shop
    Then "SPF Authentication" should show "No requirements"
    And "DKIM Signature" should show "Requires: SPF Authentication"
    And "DMARC Policy" should show "Requires: SPF Authentication, DKIM Signature"
    And "Content Filtering" should show "No requirements"
    And "Advanced Monitoring" should show "No requirements"

  Scenario: Highlight DMARC as mandatory from Round 3
    Given the current round is round 2
    When the ESP player opens the technical infrastructure shop
    Then "DMARC Policy" should be visually highlighted
    And "DMARC Policy" description should contain "MANDATORY from Round 3!"
    And "DMARC Policy" should display the warning badge prominently

  # ============================================================================
  # SECTION 2: PURCHASE VALIDATION - DEPENDENCY ENFORCEMENT
  # ============================================================================

  Scenario Outline: Enforce purchase order for authentication stack
    Given the ESP team owns the following upgrades: <owned_upgrades>
    When the ESP player attempts to purchase "<target_upgrade>"
    Then the purchase should <result>
    And if purchase fails, error message should say "<error_message>"

    Examples:
      | owned_upgrades    | target_upgrade        | result  | error_message                                    |
      | none              | SPF Authentication    | succeed |                                                  |
      | none              | DKIM Signature        | fail    | You must purchase SPF Authentication first       |
      | none              | DMARC Policy          | fail    | You must purchase SPF and DKIM first             |
      | SPF               | DKIM Signature        | succeed |                                                  |
      | SPF               | DMARC Policy          | fail    | You must purchase DKIM Signature first           |
      | SPF,DKIM          | DMARC Policy          | succeed |                                                  |

  Scenario: Independent upgrades can be purchased without dependencies
    Given the ESP team owns no upgrades
    When the ESP player attempts to purchase "Content Filtering"
    Then the purchase should succeed
    And the ESP team should own "Content Filtering"

  Scenario: Display locked status for upgrades with unmet dependencies
    Given the ESP team owns no upgrades
    When the ESP player opens the technical infrastructure shop
    Then "DKIM Signature" should show status "Locked"
    And "DMARC Policy" should show status "Locked"
    And "SPF Authentication" should show status "Available"
    And the purchase button for "DKIM Signature" should be disabled
    And the purchase button for "DMARC Policy" should be disabled

  # ============================================================================
  # SECTION 3: PURCHASE VALIDATION - BUDGET CONSTRAINTS
  # ============================================================================

  Scenario Outline: Validate budget before purchase
    Given the ESP team has a budget of <budget> credits
    And "SPF Authentication" costs 200 credits
    When the ESP player attempts to purchase "SPF Authentication"
    Then the purchase should <result>
    And if purchase fails, error message should say "Insufficient budget"

    Examples:
      | budget | result  |
      | 200    | succeed |
      | 199    | fail    |
      | 500    | succeed |
      | 0      | fail    |

  Scenario: Budget is deducted immediately upon successful purchase
    Given the ESP team has a budget of 1000 credits
    And "SPF Authentication" costs 200 credits
    When the ESP player successfully purchases "SPF Authentication"
    Then the team budget should be 800 credits
    And the purchase should be logged with timestamp and upgrade name

  Scenario: Purchase button shows disabled state when unaffordable
    Given the ESP team has a budget of 150 credits
    And "SPF Authentication" costs 200 credits
    When the ESP player opens the technical infrastructure shop
    Then the purchase button for "SPF Authentication" should be disabled
    And the button should display "Insufficient Budget"

  # ============================================================================
  # SECTION 4: OWNED UPGRADES STATE
  # ============================================================================

  Scenario: Display owned upgrades with distinct visual style
    Given the ESP team owns "SPF Authentication" and "DKIM Signature"
    When the ESP player opens the technical infrastructure shop
    Then "SPF Authentication" should show status "✓ Active"
    And "DKIM Signature" should show status "✓ Active"
    And both upgrades should have green highlighted background
    And both upgrades should display "Owned" instead of cost
    And the purchase button should not be visible for owned upgrades

  Scenario: Owned upgrades persist across rounds
    Given the ESP team owns "SPF Authentication" in round 1
    When the game progresses to round 2
    And the ESP player opens the technical infrastructure shop
    Then "SPF Authentication" should still show status "✓ Active"
    And the team should still own "SPF Authentication"

  Scenario: Owned upgrades unlock dependent upgrades
    Given the ESP team owns no upgrades
    When the ESP player successfully purchases "SPF Authentication"
    Then "DKIM Signature" status should change from "Locked" to "Available"
    And the purchase button for "DKIM Signature" should be enabled
    But "DMARC Policy" should remain "Locked"

  # ============================================================================
  # SECTION 5: DETAILED INFORMATION TOOLTIPS
  # ============================================================================

  Scenario: Display detailed benefits on hover or click
    When the ESP player clicks details for "DMARC Policy"
    Then a detailed view should display:
      | Field       | Value                                                    |
      | Benefits    | +5 reputation per round                                  |
      | Benefits    | Complete authentication stack                            |
      | Benefits    | Avoid 80% rejection from R3                              |
      | Benefits    | Detailed reporting                                       |
      | Description | Domain-based Message Authentication, Reporting & Conformance |

  Scenario: Benefits section shows concrete reputation improvements
    When the ESP player views details for "SPF Authentication"
    Then the benefits section should include "+2 reputation per round"
    And the benefits section should include "Prevents spoofing"
    And the benefits section should include "Required for DKIM"

  # ============================================================================
  # SECTION 6: INTEGRATION WITH DASHBOARD
  # ============================================================================

  Scenario: Dashboard shows current technical infrastructure status
    Given the ESP team owns "SPF Authentication" and "DKIM Signature"
    But does not own "DMARC Policy"
    When the ESP player views their dashboard
    Then the technical infrastructure card should show:
      | Upgrade              | Status        |
      | SPF Authentication   | ✅ Active     |
      | DKIM Signature       | ✅ Active     |
      | DMARC Policy         | ❌ Not Installed |
      | Content Filtering    | ❌ Not Installed |

  Scenario: Quick action badge alerts for missing critical upgrades
    Given the current round is round 2
    And the ESP team does not own "DMARC Policy"
    When the ESP player views their dashboard
    Then the technical shop quick action button should display badge "DMARC needed!"
    And the badge should be visually prominent in warning color

  # ============================================================================
  # SECTION 7: ERROR HANDLING AND LOGGING
  # ============================================================================

  Scenario: Log all purchase attempts with outcome
    Given logging is enabled
    When the ESP player attempts to purchase "SPF Authentication"
    Then the system should log:
      | Field         | Value                  |
      | action        | purchase_attempt       |
      | team          | SendWave               |
      | upgrade       | SPF Authentication     |
      | cost          | 200                    |
      | budget_before | 1000                   |
      | result        | success                |
      | budget_after  | 800                    |
      | timestamp     | [current timestamp]    |

  Scenario: Log failed purchase attempts with reason
    Given the ESP team has a budget of 100 credits
    And logging is enabled
    When the ESP player attempts to purchase "SPF Authentication" costing 200 credits
    Then the system should log:
      | Field       | Value                           |
      | action      | purchase_attempt                |
      | result      | failed                          |
      | reason      | insufficient_budget             |
      | required    | 200                             |
      | available   | 100                             |
      | timestamp   | [current timestamp]             |

  Scenario: Log dependency validation failures
    Given the ESP team owns no upgrades
    And logging is enabled
    When the ESP player attempts to purchase "DMARC Policy"
    Then the system should log:
      | Field            | Value                    |
      | action           | purchase_attempt         |
      | result           | failed                   |
      | reason           | unmet_dependencies       |
      | missing_deps     | SPF,DKIM                 |
      | timestamp        | [current timestamp]      |

  # ============================================================================
  # NOTES
  # ============================================================================

  # What we're testing:
  # - Shop displays all available upgrades with correct information
  # - Dependency chain enforcement (SPF → DKIM → DMARC)
  # - Budget validation before purchase
  # - Visual distinction between owned/available/locked upgrades
  # - Persistence of owned upgrades across rounds
  # - DMARC mandatory warning for Round 3
  # - Detailed information tooltips
  # - Integration with dashboard status display
  # - Comprehensive logging of all purchase attempts
  #
  # What we're NOT testing:
  # - UI interaction details (click handlers, animations) - covered by component tests
  # - Actual reputation calculation from owned upgrades - covered by US-3.3
  # - WebSocket synchronization of purchases - covered by US-7.5
  # - Modal open/close mechanics - UI implementation detail
  #
  # Dependencies:
  # - US-2.1: ESP Dashboard - provides the context where shop is accessed
  # - US-3.3: Reputation Calculation - uses owned upgrades for scoring
  # - Game state management must track owned upgrades per team
  # - Budget management system must support atomic deduction
