# US-2.2: Client Marketplace (ESP)
# Epic 2: Player Interfaces

Feature: Client Marketplace for ESP Teams
  As an ESP player
  I want to view and acquire available clients
  So that I can generate revenue

  Background:
    Given the application is running
    And a game session with room code "ABC123" exists
    And the game is in "planning" phase, round 1
    And player "Alice" is on ESP team "SendWave"
    And ESP team "SendWave" has 1000 credits
    And player "Alice" is on the Client Marketplace modal

  # ============================================================================
  # SECTION 1: CLIENT MARKETPLACE DISPLAY
  # ============================================================================

  Scenario: Marketplace displays all client details
    Given the marketplace has a "Growing Startup" client named "Tech Innovators" available
    When player "Alice" views the marketplace
    Then the client card should display:
      | field         | value             |
      | name          | Tech Innovators   |
      | cost          | 150               |
      | revenue       | 180 per round     |
      | volume        | 35K emails        |
      | risk_level    | Medium            |
      | spam_rate     | 1.2%              |
      | requirements  | none              |

  Scenario: Premium brand displays authentication and reputation requirements
    Given the marketplace has a "Premium Brand" client named "Luxury Corp" available
    And the game is in round 3
    When player "Alice" views the marketplace
    Then the client card should display "Requires: SPF + DKIM + DMARC"
    And the client card should display "Minimum Reputation: 85"
    And the requirements should be visually highlighted

  # ============================================================================
  # SECTION 2: CLIENT AVAILABILITY BY ROUND
  # ============================================================================

  Scenario Outline: Client availability varies by round
    Given the game is in round <round_number>
    When player "Alice" views the marketplace
    Then the following client types should be visible: <available_clients>
    And the following client types should not be visible: <unavailable_clients>

    Examples:
      | round_number | available_clients                              | unavailable_clients          |
      | 1            | Growing Startup, Re-engagement, Event/Seasonal | Aggressive Marketer, Premium |
      | 2            | Growing Startup, Re-engagement, Event/Seasonal, Aggressive Marketer | Premium |
      | 3            | Growing Startup, Re-engagement, Event/Seasonal, Aggressive Marketer, Premium | none |

  # ============================================================================
  # SECTION 3: CLIENT FILTERING
  # ============================================================================

  Scenario Outline: Filter clients by risk level
    Given the marketplace has clients with various risk levels
    When player "Alice" filters by "<risk_level>"
    Then only clients with risk level "<risk_level>" should be displayed
    And the filter should be visually active
    And the client count should update to show filtered results

    Examples:
      | risk_level |
      | Low        |
      | Medium     |
      | High       |

  Scenario: Filter clients by revenue
    Given the marketplace has clients with revenues: 180, 250, 320
    When player "Alice" sets minimum revenue filter to 200
    Then only clients with revenue >= 200 should be displayed
    And clients with revenue 250 and 320 should be visible
    And client with revenue 180 should not be visible
    And the client count should show "2 clients match your filters"

  Scenario: Combine multiple filters
    Given the marketplace has clients with various attributes
    When player "Alice" filters by risk level "Medium" and minimum revenue 200
    Then only clients matching both criteria should be displayed
    And the filter count should show how many filters are active

  # ============================================================================
  # SECTION 4: CLIENT ACQUISITION - SUCCESS CASES
  # ============================================================================

  Scenario: Successfully acquire a client with sufficient credits
    Given the marketplace has a client named "Tech Innovators" costing 150 credits
    And ESP team "SendWave" has 500 credits
    When player "Alice" clicks "Acquire" on the client
    Then the client should be acquired successfully
    And the team's credits should update to 350 in real-time
    And a success message should be displayed
    And the client should no longer be in the marketplace
    And the client should be added to the team's portfolio
    And a log entry should be created for the acquisition

  Scenario: Client remains unavailable in marketplace after acquisition
    Given player "Alice" has acquired client "Tech Innovators"
    And player "Alice" closes and reopens the marketplace modal
    When player "Alice" views the marketplace
    Then "Tech Innovators" should not appear in the available clients list
    And the total available client count should be reduced by 1

  Scenario: Successfully acquire a premium client with requirements met
    Given the game is in round 3
    And the marketplace has a "Premium Brand" client named "Luxury Corp" requiring SPF+DKIM+DMARC and reputation 85
    And ESP team "SendWave" has installed SPF, DKIM, and DMARC
    And ESP team "SendWave" has overall reputation of 88
    And ESP team "SendWave" has 300 credits
    And the client costs 200 credits
    When player "Alice" clicks "Acquire" on the client
    Then the client should be acquired successfully
    And the team's credits should update to 100 in real-time
    And a success message should be displayed
    And the client should be added to the team's portfolio

  # ============================================================================
  # SECTION 5: CLIENT ACQUISITION - FAILURE CASES
  # ============================================================================

  Scenario: Cannot acquire client with insufficient credits
    Given the marketplace has a client named "Expensive Client" costing 200 credits
    And ESP team "SendWave" has 150 credits
    When player "Alice" views the marketplace
    Then the "Acquire" button should be disabled for "Expensive Client"
    And the button should display "Insufficient credits"
    And the disabled state should be visually clear
    And hovering over the button should show a tooltip explaining the reason

  Scenario: Cannot acquire premium client without tech requirements
    Given the game is in round 3
    And the marketplace has a "Premium Brand" client named "Luxury Corp" requiring SPF+DKIM+DMARC and reputation 85
    And ESP team "SendWave" has only SPF and DKIM installed
    And ESP team "SendWave" has overall reputation of 88
    And ESP team "SendWave" has 500 credits
    When player "Alice" views the marketplace
    Then the "Acquire" button should be disabled for "Luxury Corp"
    And the button should display "Missing DMARC"
    And the requirements section should highlight the missing tech in red
    And installed tech (SPF, DKIM) should be highlighted in green

  Scenario: Cannot acquire premium client with insufficient reputation
    Given the game is in round 3
    And the marketplace has a "Premium Brand" client named "Luxury Corp" requiring SPF+DKIM+DMARC and reputation 85
    And ESP team "SendWave" has installed SPF, DKIM, and DMARC
    And ESP team "SendWave" has overall reputation of 80
    And ESP team "SendWave" has 500 credits
    When player "Alice" views the marketplace
    Then the "Acquire" button should be disabled for "Luxury Corp"
    And the button should display "Reputation too low (80/85)"
    And the reputation requirement should be highlighted in red

  Scenario: Premium client button shows "Available" when all requirements met
    Given the game is in round 3
    And the marketplace has a "Premium Brand" client named "Luxury Corp" requiring SPF+DKIM+DMARC and reputation 85
    And ESP team "SendWave" has installed SPF, DKIM, and DMARC
    And ESP team "SendWave" has overall reputation of 88
    And ESP team "SendWave" has 500 credits
    When player "Alice" views the marketplace
    Then the "Acquire" button should be enabled for "Luxury Corp"
    And all required tech should be highlighted in green with checkmarks
    And the reputation requirement should be highlighted in green with checkmark

  Scenario Outline: Acquire button disabled for various missing tech requirements
    Given the game is in round 3
    And the marketplace has a "Premium Brand" client named "Luxury Corp" requiring SPF+DKIM+DMARC and reputation 85
    And ESP team "SendWave" has <installed_tech> installed
    And ESP team "SendWave" has overall reputation of 88
    And ESP team "SendWave" has 500 credits
    When player "Alice" views the marketplace
    Then the "Acquire" button should be disabled for "Luxury Corp"
    And the button should display "<missing_message>"

    Examples:
      | installed_tech | missing_message     |
      | none           | Missing SPF         |
      | SPF            | Missing DKIM        |
      | SPF, DKIM      | Missing DMARC       |

  # ============================================================================
  # SECTION 6: CLIENT STOCK INDEPENDENCE
  # ============================================================================

  Scenario: ESP team acquires client from their own stock only
    Given player "Alice" is on ESP team "SendWave"
    And player "Alice" acquires client "Tech Innovators" from SendWave's marketplace
    And player "Bob" is on ESP team "MailMonkey" in the same game
    When player "Bob" opens the MailMonkey marketplace
    Then player "Bob" should still see all MailMonkey's available clients
    And MailMonkey's client stock should be unaffected by SendWave's acquisition

  Scenario: Marketplace shows helpful message when all clients acquired
    Given ESP team "SendWave" has acquired all 13 available clients
    When player "Alice" opens the marketplace
    Then the marketplace should display a message:
      """
      All clients acquired! You now have the maximum portfolio size.
      """
    And no client cards should be displayed
    And there should be a "Close" button to return to the dashboard

  # ============================================================================
  # SECTION 7: REAL-TIME BUDGET UPDATE
  # ============================================================================

  Scenario: Budget updates immediately after acquisition
    Given ESP team "SendWave" has 1000 credits displayed in the header
    And the marketplace has a client named "Tech Innovators" costing 200 credits
    And player "Alice" is viewing the dashboard
    When player "Alice" acquires the client from the marketplace
    Then the header budget should update to 800 credits in real-time
    And the update should be smooth without page refresh
    And the "After Lock-in" forecast should update accordingly

  # ============================================================================
  # SECTION 8: LOGGING
  # ============================================================================

  Scenario: Client acquisition is logged
    Given ESP team "SendWave" has 500 credits
    And player "Alice" is on ESP team "SendWave"
    When player "Alice" acquires a client named "Tech Innovators" costing 200 credits
    Then a log entry should be created with:
      | field             | value                                    |
      | event             | client_acquired                          |
      | team              | SendWave                                 |
      | player            | Alice                                    |
      | client_name       | Tech Innovators                          |
      | client_type       | Growing Startup                          |
      | cost              | 200                                      |
      | remaining_credits | 300                                      |
      | round             | 1                                        |
      | timestamp         | [current timestamp]                      |

  Scenario: Failed acquisition attempt is logged
    Given ESP team "SendWave" has 100 credits
    And player "Alice" is on ESP team "SendWave"
    When player "Alice" attempts to acquire a client costing 200 credits
    Then a log entry should be created with:
      | field          | value                                    |
      | event          | client_acquisition_failed                |
      | team           | SendWave                                 |
      | player         | Alice                                    |
      | reason         | insufficient_credits                     |
      | required       | 200                                      |
      | available      | 100                                      |
      | round          | 1                                        |
      | timestamp      | [current timestamp]                      |

  Scenario: Failed premium client acquisition due to missing tech is logged
    Given the game is in round 3
    And ESP team "SendWave" has only SPF installed
    And ESP team "SendWave" has overall reputation of 88
    And ESP team "SendWave" has 500 credits
    And player "Alice" is on ESP team "SendWave"
    When player "Alice" attempts to acquire a premium client requiring SPF+DKIM+DMARC and reputation 85
    Then a log entry should be created with:
      | field          | value                                    |
      | event          | client_acquisition_failed                |
      | team           | SendWave                                 |
      | player         | Alice                                    |
      | reason         | missing_tech_requirements                |
      | required_tech  | SPF, DKIM, DMARC                         |
      | installed_tech | SPF                                      |
      | missing_tech   | DKIM, DMARC                              |
      | round          | 3                                        |
      | timestamp      | [current timestamp]                      |

  Scenario: Failed premium client acquisition due to insufficient reputation is logged
    Given the game is in round 3
    And ESP team "SendWave" has installed SPF, DKIM, and DMARC
    And ESP team "SendWave" has overall reputation of 80
    And ESP team "SendWave" has 500 credits
    And player "Alice" is on ESP team "SendWave"
    When player "Alice" attempts to acquire a premium client requiring SPF+DKIM+DMARC and reputation 85
    Then a log entry should be created with:
      | field               | value                                    |
      | event               | client_acquisition_failed                |
      | team                | SendWave                                 |
      | player              | Alice                                    |
      | reason              | insufficient_reputation                  |
      | required_reputation | 85                                       |
      | actual_reputation   | 80                                       |
      | round               | 3                                        |
      | timestamp           | [current timestamp]                      |

  # ============================================================================
  # NOTES
  # ============================================================================

  # What we're testing:
  # - Client marketplace display with all required information (name, cost, revenue, volume, risk, spam rate, requirements)
  # - Client availability rules by round (R1: Growing/Re-engagement/Event, R2: +Aggressive, R3: +Premium)
  # - Filtering functionality (risk level, revenue)
  # - Successful client acquisition with immediate credit deduction and portfolio addition
  # - Premium client acquisition with dual requirements: SPF+DKIM+DMARC + Reputation >= 85
  # - Disabled acquire button for insufficient credits, missing tech, or low reputation
  # - Independent client stocks per ESP team (no race conditions between teams)
  # - Real-time budget updates in header after acquisition (matches US-2.1 pattern)
  # - Portfolio update when client is acquired (verification that client is added)
  # - Comprehensive logging for acquisition events (success and failures including reputation)
  # - Visual feedback on acquisition (success messages, disabled states, requirement highlighting)
  #
  # What we're NOT testing:
  # - UI modal opening/closing mechanics (basic UI interaction)
  # - WebSocket real-time sync details (covered by US-7.5)
  # - Quick action button navigation from dashboard (covered by US-2.1)
  # - Portfolio UI layout and detailed display (will be covered by US-2.4.0)
  # - Client Active/Pause toggles (covered by US-2.4.0)
  # - First-round client onboarding options like Warm-up and List Hygiene (covered by US-2.4.0)
  # - Technical infrastructure purchase flow (covered by US-2.3)
  # - Detailed styling and color schemes (covered by design specs)
  # - Filter by cost (not implemented in MVP)
  #
  # Dependencies:
  # - US-2.1: ESP Dashboard provides:
  #   * Header budget display that must update in real-time
  #   * Quick action button to open marketplace modal
  #   * "After Lock-in" forecast calculation
  # - US-2.4.0: Client Management will handle:
  #   * Display of acquired clients in portfolio
  #   * Active/Pause toggles for client management
  #   * First-round onboarding options (Warm-up, List Hygiene)
  # - US-2.3: Technical Infrastructure Shop provides:
  #   * SPF/DKIM/DMARC purchase capability
  #   * Tech status used for Premium client requirement validation
  # - US-1.4: Resources Allocation provides initial credits per team
  #
  # Technical Implementation Notes:
  # - Create 13 clients per ESP team distributed as:
  #   * 2 Premium Brand (available R3+)
  #   * 3 Growing Startup (available R1+)
  #   * 3 Re-engagement (available R1+)
  #   * 2 Aggressive Marketer (available R2+)
  #   * 3 Event/Seasonal (available R1+)
  # - Randomize values ±10% from profile baseline (revenue, volume, spam rate)
  # - Each client needs unique name (not just profile name - e.g., "Tech Innovators", "Luxury Corp")
  # - Client stock is team-specific, no shared pool between teams
  # - Immediate credit deduction on acquisition (no delayed processing or lock-in wait)
  # - Premium clients require BOTH conditions:
  #   * Technical: ALL three SPF + DKIM + DMARC (cannot acquire with partial)
  #   * Reputation: Overall reputation >= 85
  # - Button states: Enabled (all conditions met), Disabled with specific reason shown
  # - Logging captures: team, player, client details, credit changes, failure reasons (tech/reputation)
  # - Portfolio verification: Acquired client must be added to team's portfolio (basic check, detailed UI in US-2.4.0)
