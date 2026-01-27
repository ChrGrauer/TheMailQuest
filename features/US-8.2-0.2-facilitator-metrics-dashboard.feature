Feature: US-8.2-0.2 - Facilitator Metrics Dashboard

  As a facilitator
  I want to see comprehensive metrics for all players in a compact table format
  So that I can monitor game progress and make informed decisions

  Background:
    Given a game session exists with room code "METR01"
    And the game has 3 ESP teams: "SendWave", "MailMonkey", "BluePost"
    And the game has 3 destinations: "zmail", "intake", "yagle"
    And facilitator "Facilitator" is managing the game
    And the game is in round 2
    And the current phase is "planning"

  # ========================================================================
  # Dashboard Layout
  # ========================================================================

  Scenario: Facilitator dashboard displays header with game status
    When the facilitator views the facilitator dashboard
    Then the header should display room code "METR01"
    And the header should display "Round 2 / 4"
    And the header should display current phase "planning"
    And the header should display the remaining timer updated in real time

  Scenario: Dashboard layout structure with controls and metrics sections
    When the facilitator views the facilitator dashboard
    Then the control buttons should be displayed at the top below the header
    And the ESP metrics table should be displayed below the control buttons
    And the Destination metrics table should be displayed below the ESP metrics
    And on mobile/tablet the layout should collapse to single column

  # ========================================================================
  # ESP Metrics Table
  # ========================================================================

  Scenario: ESP metrics table displays all required columns
    Given ESP "SendWave" has the following state:
      | budget     | 850                                    |
      | reputation | zmail:75, intake:70, yagle:65         |
      | spam_rate  | 1.2                                    |
      | clients    | premium_brand:1, growing_startup:2, aggressive_marketer:1 |
      | tech       | spf, dkim                              |
    When the facilitator views the facilitator dashboard
    Then the ESP metrics table should have columns:
      | column              |
      | Team Name           |
      | Budget              |
      | zmail Rep           |
      | intake Rep         |
      | yagle Rep           |
      | Spam Rate           |
      | Clients by Type     |
      | Tech Tools          |
    And the row for "SendWave" should display:
      | field           | value                                  |
      | Budget          | 850                                    |
      | zmail Rep       | 75                                     |
      | intake Rep     | 70                                     |
      | yagle Rep       | 65                                     |
      | Spam Rate       | 1.2%                                   |
      | Clients by Type | 1 Premium, 2 Startup, 1 Aggressive     |
      | Tech Tools      | SPF ✓, DKIM ✓, DMARC ✗, Content ✗, Monitor ✗ |

  Scenario Outline: ESP tech tools display shows ownership status with checkmarks
    Given ESP "SendWave" owns technical upgrades: <owned_tech>
    When the facilitator views the facilitator dashboard
    Then the tech tools cell for "SendWave" should show:
      | tool              | status   |
      | SPF               | <spf>    |
      | DKIM              | <dkim>   |
      | DMARC             | <dmarc>  |
      | Content Filtering | <content>|
      | Monitoring        | <monitor>|

    Examples:
      | owned_tech                           | spf | dkim | dmarc | content | monitor |
      | []                                   | ✗   | ✗    | ✗     | ✗       | ✗       |
      | ["spf"]                              | ✓   | ✗    | ✗     | ✗       | ✗       |
      | ["spf", "dkim"]                      | ✓   | ✓    | ✗     | ✗       | ✗       |
      | ["spf", "dkim", "dmarc"]             | ✓   | ✓    | ✓     | ✗       | ✗       |
      | ["spf", "dkim", "dmarc", "content-filtering"] | ✓   | ✓    | ✓     | ✓       | ✗       |
      | ["spf", "dkim", "dmarc", "content-filtering", "advanced-monitoring"] | ✓   | ✓    | ✓     | ✓       | ✓       |

  Scenario: ESP clients by type displays breakdown
    Given ESP "MailMonkey" has clients:
      | type               | count |
      | premium_brand      | 2     |
      | growing_startup    | 3     |
      | re_engagement      | 1     |
      | aggressive_marketer| 2     |
      | event_seasonal     | 1     |
    When the facilitator views the facilitator dashboard
    Then the clients cell for "MailMonkey" should display "2 Premium, 3 Startup, 1 Re-engage, 2 Aggressive, 1 Event"

  # ========================================================================
  # Destination Metrics Table
  # ========================================================================

  Scenario: Destination metrics table displays all required columns
    Given destination "zmail" has the following state:
      | budget            | 420                                    |
      | user_satisfaction | 78                                     |
      | owned_tools       | content_analysis_filter, auth_validator_l1, auth_validator_l2 |
    When the facilitator views the facilitator dashboard
    Then the Destination metrics table should have columns:
      | column              |
      | Destination Name    |
      | Budget              |
      | User Satisfaction   |
      | Tech Tools          |
    And the row for "zmail" should display:
      | field             | value                                  |
      | Budget            | 420                                    |
      | User Satisfaction | 78%                                    |
      | Tech Tools        | Content ✓, Auth L1 ✓, Auth L2 ✓, Auth L3 ✗, ML ✗, Trap ✗, Throttle ✗ |

  Scenario Outline: Destination tech tools display shows ownership status
    Given destination "intake" owns tools: <owned_tools>
    When the facilitator views the facilitator dashboard
    Then the tech tools cell for "intake" should show:
      | tool                | status       |
      | Content Analysis    | <content>    |
      | Auth Validator L1   | <auth_l1>    |
      | Auth Validator L2   | <auth_l2>    |
      | Auth Validator L3   | <auth_l3>    |
      | ML System           | <ml>         |
      | Spam Trap           | <trap>       |
      | Volume Throttling   | <throttle>   |

    Examples:
      | owned_tools                                          | content | auth_l1 | auth_l2 | auth_l3 | ml | trap | throttle |
      | []                                                   | ✗       | ✗       | ✗       | ✗       | ✗  | ✗    | ✗        |
      | ["content_analysis_filter"]                          | ✓       | ✗       | ✗       | ✗       | ✗  | ✗    | ✗        |
      | ["auth_validator_l1", "auth_validator_l2"]           | ✗       | ✓       | ✓       | ✗       | ✗  | ✗    | ✗        |
      | ["ml_system"]                                        | ✗       | ✗       | ✗       | ✗       | ✓  | ✗    | ✗        |
      | ["spam_trap_network"]                                | ✗       | ✗       | ✗       | ✗       | ✗  | ✓    | ✗        |

  # ========================================================================
  # Real-time Updates
  # ========================================================================

  Scenario: Metrics update in real-time when ESP makes a purchase
    Given ESP "SendWave" has budget 500
    And ESP "SendWave" owns technical upgrades: ["spf"]
    When the facilitator views the facilitator dashboard
    Then the budget for "SendWave" should show 500
    And the tech tools for "SendWave" should show SPF as owned
    # ESP makes purchase
    When ESP "SendWave" purchases technical upgrade "dkim" for 150 credits
    Then the facilitator dashboard should update in real-time
    And the budget for "SendWave" should show 350
    And the tech tools for "SendWave" should show DKIM as owned

  Scenario: Metrics update in real-time when destination changes filtering
    Given destination "zmail" has user satisfaction 80
    When the facilitator views the facilitator dashboard
    Then the user satisfaction for "zmail" should show 80%
    # After resolution with filtering decisions
    When the game transitions through resolution phase
    And "zmail" user satisfaction changes to 75
    Then the facilitator dashboard should update
    And the user satisfaction for "zmail" should show 75%

  Scenario: Metrics update in real-time when ESP acquires a client
    Given ESP "BluePost" has 2 growing_startup clients
    When the facilitator views the facilitator dashboard
    Then the clients cell for "BluePost" should include "2 Startup"
    # ESP acquires new client
    When ESP "BluePost" acquires a new "aggressive_marketer" client
    Then the facilitator dashboard should update in real-time
    And the clients cell for "BluePost" should include "1 Aggressive"

  # ========================================================================
  # Spam Rate Display
  # ========================================================================

  Scenario: Spam rate displays current round's rate
    Given the game is in round 2
    And ESP "SendWave" had spam rate 0.8% in round 1
    And ESP "SendWave" has spam rate 1.5% in round 2
    When the facilitator views the facilitator dashboard
    Then the spam rate for "SendWave" should show "1.5%"

  Scenario: Spam rate displays N/A for round 1 before resolution
    Given the game is in round 1
    And the current phase is "planning"
    When the facilitator views the facilitator dashboard
    Then the spam rate for all ESPs should show "N/A"

  # ========================================================================
  # All Teams Displayed
  # ========================================================================

  Scenario: All ESP teams and destinations are displayed
    When the facilitator views the facilitator dashboard
    Then the ESP metrics table should have rows for:
      | team       |
      | SendWave   |
      | MailMonkey |
      | BluePost   |
    And the Destination metrics table should have rows for:
      | destination |
      | zmail       |
      | intake     |
      | yagle       |
