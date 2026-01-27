# US-2.5: Destination Kingdom Dashboard
# Epic 2: Player Interfaces

Feature: Destination Kingdom Dashboard Display
  As a Destination player
  I want to see my kingdom's current status
  So that I can make informed decisions during the Planning phase

  Background:
    Given a Mail Quest game session is in progress
    And the game has at least 1 ESP team and 1 Destination player

  # ============================================================================
  # SECTION 1: DASHBOARD INITIAL LOAD & BRANDING
  # ============================================================================

  Scenario: Dashboard displays destination-specific branding
    Given I am logged in as a Destination player for "<destination>"
    When I navigate to the Destination dashboard
    Then I should see the destination name as "<destination>"
    And I should see an appropriate destination icon
    And the color theme should use blue tones (not ESP green)
    And I should see my current budget displayed
    And I should see the round and phase information
    And I should see the timer counting down

    Examples:
      | destination |
      | zmail       |
      | intake     |
      | yagle       |

  # Note: Detailed testing of header and budget components is covered in 
  # ESP dashboard tests (US-2.1). This is a smoke test for Destination-specific data.

  # ============================================================================
  # SECTION 2: ESP TRAFFIC STATISTICS DISPLAY
  # ============================================================================

  Scenario Outline: Dashboard displays statistics for all playing ESPs
    Given I am logged in as a Destination player for "zmail"
    And there are <num_esps> ESP teams active in the game
    And each ESP has traffic data to my destination
    When I view the ESP Statistics Overview section
    Then I should see exactly <num_esps> ESP teams listed
    And each ESP should display:
      | Field                  | Format              |
      | Team identifier        | 2-letter code       |
      | Team name              | Full name           |
      | Active clients count   | Number              |
      | Email volume           | e.g. "185K"         |
      | Reputation score       | 0-100 with color    |
      | User satisfaction      | Percentage + color  |
      | Spam complaint rate    | Percentage + color  |

    Examples:
      | num_esps |
      | 1        |
      | 3        |
      | 5        |

  Scenario: ESP statistics show complete data for each ESP
    Given I am logged in as a Destination player for "zmail"
    And the following ESP teams are active:
      | ESP Team      | Volume  | Reputation | Satisfaction | Spam Rate | Active Clients |
      | SendWave      | 185K    | 78         | 78%          | 0.04%      | 4              |
      | MailMonkey    | 142K    | 65         | 65%          | 0.14%      | 3              |
      | BluePost      | 238K    | 52         | 52%          | 0.28%      | 5              |
    When I view the ESP Statistics Overview
    Then each ESP card should display in a grid layout
    And each card should contain exactly 4 statistics: Volume, Reputation, User Satisfaction, Spam Complaints
    And the data should match the table above

  Scenario: ESP with zero volume displays correctly
    Given I am viewing the Destination dashboard
    And an ESP team "SendBolt" has 0 active clients
    And the ESP has 0 email volume to my destination
    When I view the ESP Statistics Overview
    Then "SendBolt" should still appear in the list
    And the volume should display as "0"
    And all other statistics should display their current values

  # ============================================================================
  # SECTION 3: REPUTATION & METRICS COLOR CODING
  # ============================================================================

  Scenario : Reputation scores display with correct color coding
    Given I am viewing the ESP Statistics Overview
    When an ESP has a reputation score of <score>
    Then the reputation value should be displayed in <color> color
    And the classification should be <classification>

    Examples:
      | score | color  | classification |
      | 95    | Green  | Excellent      |
      | 90    | Green  | Excellent      |
      | 85    | Blue   | Good           |
      | 70    | Blue   | Good           |
      | 65    | Orange | Warning        |
      | 50    | Orange | Warning        |
      | 45    | Red    | Poor           |
      | 30    | Red    | Poor           |

  Scenario Outline: User satisfaction scores display with correct color coding
    Given I am viewing the ESP Statistics Overview
    When an ESP has a user satisfaction score of <satisfaction>
    Then the satisfaction value should be displayed in <color> color
    And the classification should be <classification>

    Examples:
      | satisfaction | color  | classification |
      | 88%          | Green  | Excellent      |
      | 80%          | Green  | Excellent      |
      | 75%          | Blue   | Good           |
      | 70%          | Blue   | Good           |
      | 65%          | Orange | Warning        |
      | 60%          | Orange | Warning        |
      | 55%          | Red    | Poor           |
      | 50%          | Red    | Poor           |

  Scenario Outline: Spam complaint rates display with correct color coding
    Given I am viewing the ESP Statistics Overview
    When an ESP has a spam complaint rate of <rate>
    Then the spam rate should be displayed in <color> color
    And the classification should be <classification>

    Examples:
      | rate  | color  | classification |
      | 0.01% | Green  | Low            |
      | 0.04% | Green  | Low            |
      | 0.05% | Orange | Medium         |
      | 0.10% | Orange | Medium         |
      | 0.14% | Orange | Medium         |
      | 0.15% | Red    | High           |
      | 0.30% | Red    | High           |
      | 2.80% | Red    | High           |

  # ============================================================================
  # SECTION 4: COORDINATION STATUS DISPLAY
  # ============================================================================

  Scenario: Dashboard shows coordination status when no collaborations exist
    Given I am logged in as a Destination player for "yagle"
    And I have no active collaborations with other destinations
    When I view the Inter-Destination Coordination card
    Then I should see "Active Collaborations: 0"

  # Note: Active collaboration scenarios are tested in US-2.7 (Coordination Panel)

  # ============================================================================
  # SECTION 5: PAST VOLUMES & SPAM LEVEL AGGREGATION
  # ============================================================================

  Scenario: Dashboard displays past volumes aggregated by ESP
    Given I am logged in as a Destination player for "zmail"
    And in the previous round, ESPs sent the following volumes to my destination:
      | ESP Team      | Volume  |
      | SendWave      | 165K    |
      | MailMonkey    | 128K    |
      | BluePost      | 215K    |
    When I view my dashboard statistics
    Then I should see the aggregated past volumes by ESP
    And the total past volume should equal 508K

  Scenario: Dashboard displays current spam level based on previous rounds
    Given I am logged in as a Destination player for "zmail"
    And based on previous rounds my current spam level is calculated at 0.18%
    When I view my kingdom status
    Then I should see the current spam level indicator
    And it should display the 0.18% spam rate
    And the color coding should reflect the appropriate classification

  # ============================================================================
  # TECHNICAL INFRASTRUCTURE STATUS
  # ============================================================================

  Scenario: Owned technical upgrades are displayed
    Given I am logged in as a Destination player for "zmail"
    And has purchased the following tech:
      | Technology               | Status |
      | SPF Authentication Check | Active |
      | DKIM Signature Check     | Active |
    When I view the dashboard
    Then the technical infrastructure section should list owned tech
    And SPF Authentication Check should show as "Active"
    And DKIM Signature Check should show as "Active"
    And active tech should have green checkmark icons
    And DMARC Check should show as "Inactive"


  # ============================================================================
  # SECTION 6: MULTI-PLAYER & DATA ISOLATION
  # ============================================================================

  Scenario: Each destination player sees only their own data
    Given multiple Destination players are viewing their dashboards:
      | Player  | Budget |
      | zmail   | 800    |
      | intake | 600    |
      | yagle   | 450    |
    When each player views their dashboard
    Then each should see only their own budget value
    And ESP statistics should show data specific to their destination

  # ============================================================================
  # SECTION 7: UI LAYOUT & RESPONSIVENESS
  # ============================================================================

  Scenario: Lock-in button is visible and properly positioned
    Given I am viewing the Destination dashboard
    When I scroll to the bottom of the page
    Then I should see a "Lock In Decisions" button
    And the button should be prominent and full-width
    And the button should have a lock icon
    And the button should be sticky at the bottom of the viewport

  Scenario Outline: Dashboard layout adapts to different screen sizes
    Given I am viewing the Destination dashboard
    When the viewport width is <width>
    Then the dashboard layout should be <layout>

    Examples:
      | width      | layout                                |
      | 1600px     | Two-column grid with side-by-side cards |
      | 1024px     | Single column layout                   |
      | 768px      | Stacked layout with full-width cards   |

  Scenario: Dashboard information follows correct visual hierarchy
    Given I am viewing the Destination dashboard
    Then the information should be organized in priority order:
      | Priority | Section                           |
      | 1        | Header (Identity, Budget, Timer)  |
      | 2        | Quick Actions (Coordination)      |
      | 3        | ESP Statistics Overview           |
      | 4        | Coordination Status Summary       |
      | 5        | Lock-in Button                    |
    And each section should be clearly separated with visual spacing
    And the most critical information should be visible without scrolling

  # ============================================================================
  # SECTION 8: PERFORMANCE & LOADING
  # ============================================================================

  Scenario: Dashboard loads within performance requirements
    Given I am logged in as a Destination player
    When I navigate to the Destination dashboard
    Then the dashboard should load within 2 seconds
    And all ESP statistics should be visible
    And all sections should be fully rendered
    And no loading errors should occur

  # ============================================================================
  # NOTES
  # ============================================================================

  # What we're testing:
  # - Destination-specific dashboard display with complete game state
  # - ESP statistics aggregation and visualization
  # - Reputation, satisfaction, and spam rate color coding per game rules
  # - Past volumes and spam level calculations
  # - Multi-player data isolation
  # - Responsive layout and visual hierarchy
  # - Performance requirements
  #
  # What we're NOT testing:
  # - Detailed header/budget component behavior (covered in US-2.4 ESP Dashboard)
  # - Timer countdown mechanics (covered in US-2.4)
  # - Lock-in button interaction (covered in US-2.8 Lock-in Mechanism)
  # - Filtering controls UI and logic (covered in US-2.6)
  # - Active coordination scenarios (covered in US-2.7)
  # - Real-time WebSocket updates (will be covered later)
  # - Round transitions and phase changes (covered in game loop US)
  # - Reputation changes during Planning phase (no changes occur)
  #
  # Dependencies:
  # - US-1.4: Game State Management (provides game data)
  # - US-2.4: ESP Dashboard (shared components: header, budget display, timer)
  #
  # Color Coding Rules (from Game Formulas):
  # Reputation & Satisfaction:
  #   - Excellent (Green): ≥90
  #   - Good (Blue): 70-89
  #   - Warning (Orange): 50-69
  #   - Poor (Red): <50
  #
  # Spam Complaint Rate:
  #   - Low (Green): <0.05%
  #   - Medium (Orange): 0.05%-0.15%
  #   - High (Red): ≥0.15%
  #
  # Edge Cases Handled:
  # - Minimum game setup: 1 ESP + 1 Destination
  # - ESP with zero volume/clients
  # - No active collaborations
  # - Very large numbers (999K+ volume)
