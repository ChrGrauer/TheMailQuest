# US-2.6.2: Destination Tech Shop
# Epic 2: Player Interfaces

Feature: Destination Tech Shop
  As a Destination player
  I want to purchase and activate advanced filtering tools
  So that I can improve spam detection across all ESPs and protect my users more effectively

  Background:
    Given a game session is in progress
    And the game is in round 1
    And the planning phase is active

  # ============================================================================
  # SECTION 1: TECH SHOP DISPLAY & TOOL CATALOG
  # ============================================================================

  Scenario Outline: Display kingdom-specific tool catalog
    Given I am playing as "<kingdom>" destination
    When I open the tech shop
    Then I should see the following tools with their costs:
      | tool_name             | acquisition_cost | available |
      | Content Analysis      | <content_cost>   | true      |
      | Auth Validator L1     | 50               | true      |
      | Auth Validator L2     | 50               | true      |
      | Auth Validator L3     | 50               | true      |
      | ML System             | <ml_cost>        | <ml_available> |
      | Spam Trap Network     | <trap_cost>      | true      |
      | Volume Throttling     | <throttle_cost>  | true      |
    And each tool should display its effect description
    And each tool should display its scope as "Applies to ALL ESPs"
    And each tool should show status "Not Owned"

    Examples:
      | kingdom | content_cost | ml_cost | ml_available | trap_cost | throttle_cost |
      | Gmail   | 300          | 500     | true         | 250       | 200           |
      | Outlook | 240          | 400     | true         | 200       | 150           |
      | Yahoo   | 160          | N/A     | false        | 150       | 100           |

  Scenario: Tool displays comprehensive information
    Given I am playing as "Gmail" destination
    And I open the tech shop
    When I view the "Content Analysis Filter" tool
    Then I should see:
      | field               | value                                                    |
      | name                | Content Analysis Filter                                  |
      | category            | Content Analysis                                         |
      | acquisition_cost    | 300                                                      |
      | scope               | Applies to ALL ESPs                                      |
      | effect              | +15% spam detection, -2% false positives                 |
      | description         | Analyzes message content for promotional language...     |
      | status              | Not Owned                                                |

  # ============================================================================
  # SECTION 2: BASIC TOOL PURCHASE
  # ============================================================================

  Scenario Outline: Successfully purchase a permanent tool
    Given I am playing as "<kingdom>" destination
    And my current budget is <budget>
    And I open the tech shop
    When I purchase "<tool_name>"
    Then the purchase should succeed
    And my budget should be <remaining_budget>
    And the tool status should show "Owned"
    And the tool should be listed on my main dashboard
    And the tool should apply to all ESPs automatically

    Examples:
      | kingdom | budget | tool_name            | remaining_budget |
      | Gmail   | 500    | Content Analysis     | 200              |
      | Outlook | 350    | Volume Throttling    | 200              |
      | Yahoo   | 200    | Content Analysis     | 40               |

  Scenario: Purchase fails when budget insufficient
    Given I am playing as "Yahoo" destination
    And my current budget is 100
    And I open the tech shop
    When I attempt to purchase "Content Analysis" costing 160
    Then the purchase should fail
    And I should see error "Insufficient budget"
    And my budget should remain 100
    And the tool status should remain "Not Owned"

  Scenario: Confirmation dialog for expensive tools
    Given I am playing as "Gmail" destination
    And my current budget is 500
    And I open the tech shop
    When I click purchase on "ML System" costing 500
    Then I should see a confirmation dialog
    And the dialog should show "This tool costs 500 credits (your entire budget). Continue?"
    When I confirm the purchase
    Then the purchase should succeed
    And my budget should be 0

  # ============================================================================
  # SECTION 3: AUTHENTICATION VALIDATOR PROGRESSION
  # ============================================================================

  Scenario: Authentication Validator requires sequential purchase
    Given I am playing as "Gmail" destination
    And my authentication level is 0
    And I open the tech shop
    When I view "Auth Validator L2 (DKIM)"
    Then the tool should show status "Locked"
    And I should see "Requires: SPF (Level 1)"
    When I view "Auth Validator L3 (DMARC)"
    Then the tool should show status "Locked"
    And I should see "Requires: SPF (Level 1) and DKIM (Level 2)"

  Scenario: Progressive Authentication Validator purchase
    Given I am playing as "Outlook" destination
    And my current budget is 350
    And my authentication level is 0
    And I open the tech shop
    When I purchase "Auth Validator L1 (SPF)" for 50 credits
    Then my authentication level should be 1
    And my budget should be 300
    And "Auth Validator L2 (DKIM)" should show status "Available"
    And "Auth Validator L3 (DMARC)" should show status "Locked"
    When I purchase "Auth Validator L2 (DKIM)" for 50 credits
    Then my authentication level should be 2
    And my budget should be 250
    And "Auth Validator L3 (DMARC)" should show status "Available"
    When I purchase "Auth Validator L3 (DMARC)" for 50 credits
    Then my authentication level should be 3
    And my budget should be 200

  Scenario: Complete authentication stack is affordable for all kingdoms
    Given I am playing as "Yahoo" destination
    And my current budget is 200
    And my authentication level is 0
    When I calculate the total cost for all authentication levels
    Then the total should be 150 credits
    And I should have sufficient budget

  # ============================================================================
  # SECTION 4: AUTHENTICATION ENFORCEMENT ON ESPs
  # ============================================================================

  Scenario Outline: Authentication enforcement creates ESP traffic rejection
    Given I am a "Gmail" destination
    And I have purchased "Auth Validator <level>"
    And ESP "SendWave" has authentication status:
      | spf   | <esp_spf>   |
      | dkim  | <esp_dkim>  |
      | dmarc | <esp_dmarc> |
    When the delivery resolution phase begins
    Then ESP "SendWave" should have <rejection_rate>% of traffic rejected
    And the rejection reason should be "Missing <missing_auth>"

    Examples:
      | level       | esp_spf | esp_dkim | esp_dmarc | rejection_rate | missing_auth |
      | L1 (SPF)    | false   | false    | false     | 20             | SPF          |
      | L1 (SPF)    | true    | false    | false     | 0              | N/A          |
      | L2 (DKIM)   | false   | false    | false     | 30             | DKIM         |
      | L2 (DKIM)   | true    | false    | false     | 10             | DKIM         |
      | L2 (DKIM)   | true    | true     | false     | 0              | N/A          |
      | L3 (DMARC)  | false   | false    | false     | 50             | DMARC        |
      | L3 (DMARC)  | true    | false    | false     | 30             | DMARC        |
      | L3 (DMARC)  | true    | true     | false     | 20             | DMARC        |
      | L3 (DMARC)  | true    | true     | true      | 0              | N/A          |

  # ============================================================================
  # SECTION 5: SPAM TRAP NETWORK (SPECIAL SINGLE-ROUND TOOL)
  # ============================================================================

  Scenario Outline: Purchase Spam Trap Network with announcement option
    Given I am playing as "<kingdom>" destination
    And my current budget is <budget>
    And I open the tech shop
    When I purchase "Spam Trap Network" for <cost> credits
    Then I should see announcement options:
      | option      | description                                    |
      | Announce    | Alert ESPs (deterrent effect)                  |
      | Keep Secret | Surprise deployment (maximum trap hits)        |
    When I select "<announcement>" option
    Then the purchase should succeed
    And my budget should be <remaining_budget>
    And the spam trap should be active for round 1 only
    And the announcement setting should be recorded as "<announcement>"

    Examples:
      | kingdom | budget | cost | announcement | remaining_budget |
      | Gmail   | 500    | 250  | Announce     | 250              |
      | Outlook | 350    | 200  | Keep Secret  | 150              |
      | Yahoo   | 200    | 150  | Announce     | 50               |

  Scenario: Spam Trap Network must be repurchased each round
    Given I am playing as "Gmail" destination
    And I purchased "Spam Trap Network" in round 1
    When round 2 begins
    Then "Spam Trap Network" should show status "Not Owned"
    And the tool should be available for purchase again
    And my previous announcement setting should not persist

  Scenario: Spam Trap Network triples trap hit probability
    Given I am a "Outlook" destination
    And I have purchased and activated "Spam Trap Network" with "Keep Secret" option
    And ESP "BluePost" sends emails with baseline 2% trap hit probability
    When the delivery resolution phase calculates spam trap hits
    Then ESP "BluePost" should have 6% trap hit probability (2% × 3)
    And if ESP hits traps, they should receive:
      | penalty          | value |
      | reputation       | -10   |
      | delivery_rate    | -30%  |
    And my destination should receive +10 Industry Protection score

  # ============================================================================
  # SECTION 6: TOOL EFFECTS & STACKING
  # ============================================================================

  Scenario: Tool effects apply globally to all ESPs
    Given I am a "Gmail" destination
    And I have purchased "Content Analysis Filter"
    And the game has 5 active ESPs: SendWave, MailMonkey, BluePost, SendBolt, RocketMail
    When the delivery resolution phase begins
    Then all 5 ESPs should receive +15% spam detection boost
    And all 5 ESPs should have -2% false positive rate
    And no per-ESP configuration should be required

  Scenario Outline: Multiple tools stack additively
    Given I am a "Outlook" destination
    And I have purchased the following tools:
      | tool_name            | spam_detection_bonus | false_positive_impact |
      | <tool1>              | <bonus1>             | <fp1>                 |
      | <tool2>              | <bonus2>             | <fp2>                 |
    When the delivery resolution phase calculates spam detection
    Then the total spam detection bonus should be <total_bonus>%
    And the total false positive reduction should be <total_fp>%

    Examples:
      | tool1               | bonus1 | fp1  | tool2                  | bonus2 | fp2  | total_bonus | total_fp |
      | Content Analysis    | 15     | -2   | Volume Throttling      | 5      | -1   | 20          | -3       |
      | Auth Validator L1   | 5      | 0    | Auth Validator L2      | 8      | 0    | 13          | 0        |
      | Content Analysis    | 15     | -2   | ML System              | 25     | -3   | 40          | -5       |

  Scenario: Complete tool stack with authentication
    Given I am a "Gmail" destination
    And I have purchased:
      | tool_name              | effect                    |
      | Content Analysis       | +15% spam, -2% FP         |
      | Auth Validator L1      | +5% spam                  |
      | Auth Validator L2      | +8% spam                  |
      | Auth Validator L3      | +12% spam                 |
      | Volume Throttling      | +5% spam, -1% FP          |
    When I calculate total filtering effectiveness
    Then the total spam detection boost should be 45%
    And the total false positive reduction should be -3%

  # ============================================================================
  # SECTION 7: KINGDOM-SPECIFIC CONSTRAINTS
  # ============================================================================

  Scenario: ML System unavailable for Yahoo
    Given I am playing as "Yahoo" destination
    When I open the tech shop
    Then "ML System" should show status "Unavailable"
    And I should see reason "Insufficient computational resources"
    And the purchase button should be disabled

  Scenario: ML System available for Gmail and Outlook
    Given I am playing as "Gmail" destination
    When I open the tech shop
    Then "ML System" should show status "Not Owned"
    And the purchase button should be enabled
    And the cost should be 500 credits

  # ============================================================================
  # SECTION 8: BUDGET MANAGEMENT & REAL-TIME CALCULATION
  # ============================================================================

  Scenario: Real-time budget calculation during shopping
    Given I am playing as "Outlook" destination
    And my current budget is 350
    And I open the tech shop
    When I select "Content Analysis" (240 credits) for purchase
    Then I should see "After purchase: 110 credits remaining"
    When I additionally select "Volume Throttling" (150 credits)
    Then I should see "After purchases: -40 credits (over budget)"
    And I should see warning "Insufficient budget for all selected tools"
    And the purchase button should be disabled

  Scenario: Budget sufficient for multiple small tools
    Given I am playing as "Gmail" destination
    And my current budget is 500
    When I select for purchase:
      | tool_name              | cost |
      | Auth Validator L1      | 50   |
      | Auth Validator L2      | 50   |
      | Auth Validator L3      | 50   |
      | Volume Throttling      | 200  |
    Then I should see "Total: 350 credits"
    And I should see "After purchase: 150 credits remaining"
    And the purchase button should be enabled

  # ============================================================================
  # SECTION 9: TOOL MANAGEMENT & PERSISTENCE
  # ============================================================================

  Scenario: Owned tools display on main dashboard
    Given I am a "Gmail" destination
    And I have purchased:
      | tool_name              | purchased_round |
      | Content Analysis       | 1               |
      | Auth Validator L1      | 1               |
      | Volume Throttling      | 2               |
    When I view my main dashboard
    Then I should see a "Owned Tools" section
    And the section should list all 3 tools
    And each tool should show its active status
    And authentication level should show "Level 1 (SPF)"

  Scenario: Tool ownership persists across rounds
    Given I am a "Gmail" destination
    And I purchased "Content Analysis Filter" in round 1
    When round 2 begins
    Then "Content Analysis Filter" should still show status "Owned"
    And it should continue applying its effects
    And it should not require repurchase
    Exception: "Spam Trap Network" which must be repurchased

  # ============================================================================
  # SECTION 10: LOGGING & AUDIT TRAIL
  # ============================================================================

  Scenario: Tool purchase logging
    Given I am a "Outlook" destination
    When I successfully purchase "Volume Throttling" for 150 credits in round 2
    Then the system should log:
      | field            | value             |
      | event            | tool_purchased    |
      | tool_id          | volume_throttling |
      | destination      | Outlook           |
      | kingdom          | Outlook           |
      | acquisition_cost | 150               |
      | round            | 2                 |
      | timestamp        | [current_time]    |

  Scenario: Authentication level upgrade logging
    Given I am a "Gmail" destination
    When I purchase "Auth Validator L2 (DKIM)" upgrading from level 1 to level 2
    Then the system should log:
      | field            | value                   |
      | event            | auth_level_upgraded     |
      | destination      | Gmail                   |
      | from_level       | 1                       |
      | to_level         | 2                       |
      | round            | 1                       |
      | timestamp        | [current_time]          |

  Scenario: ESP traffic rejection logging
    Given I am a "Outlook" destination with Auth Validator L3
    And ESP "MailMonkey" has no DMARC configured
    When delivery resolution rejects 50% of their traffic
    Then the system should log:
      | field                  | value                |
      | event                  | traffic_rejected     |
      | esp_id                 | MailMonkey           |
      | destination_id         | Outlook              |
      | auth_level_required    | 3                    |
      | missing_auth           | DMARC                |
      | rejection_percentage   | 50                   |
      | round                  | 1                    |
      | timestamp              | [current_time]       |

  Scenario: Spam trap deployment logging
    Given I am a "Gmail" destination
    When I purchase "Spam Trap Network" with "Keep Secret" option in round 2
    Then the system should log:
      | field            | value                |
      | event            | spam_trap_deployed   |
      | destination      | Gmail                |
      | announced        | false                |
      | round            | 2                    |
      | cost             | 250                  |
      | timestamp        | [current_time]       |

  # ============================================================================
  # NOTES
  # ============================================================================

  # What we're testing:
  # - Tool catalog display with kingdom-specific costs and availability
  # - Basic tool purchase flow with budget validation
  # - Authentication Validator progressive purchase system (L1→L2→L3)
  # - Authentication enforcement on ESPs (traffic rejection)
  # - Spam Trap Network single-round activation with announcement options
  # - Tool effects applying globally to all ESPs
  # - Tool stacking (additive bonuses)
  # - Kingdom-specific constraints (ML System unavailable for Yahoo)
  # - Real-time budget calculation
  # - Tool persistence across rounds (except Spam Trap)
  # - Comprehensive logging of all tool actions
  #
  # What we're NOT testing:
  # - UI rendering details (covered by component tests)
  # - WebSocket broadcasting of tool purchases (covered by US-7.5)
  # - Detailed delivery resolution formulas (covered by US-3.3)
  # - ESP-specific filtering levels (covered by US-2.6.1)
  # - Modal interactions and animations (UI implementation details)
  #
  # Dependencies:
  # - US-2.5: Destination Dashboard (provides main interface)
  # - US-2.6.1: Filtering Controls (per-ESP filtering levels)
  # - US-3.3: Delivery Resolution (where tool effects are calculated)
  # - US-2.3: ESP Tech Shop (ESPs must respond to auth requirements)
  # - US-7.5: WebSocket Integration (real-time tool purchase broadcasts)
