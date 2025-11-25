Feature: Final Score Calculation
  As the system
  I want to calculate final scores after Round 4
  So that winners can be determined based on reputation, revenue, and technical investments

  Background:
    Given a game session with 5 ESP teams and 3 Destinations
    And all 4 rounds have been completed
    And the facilitator is on the post-Round-4 screen

  # ============================================================================
  # SCENARIO 1: Standard Winner Determination
  # ============================================================================

  Scenario: Calculate final scores with clear winner
    Given the following ESP final stats after Round 4:
      | ESP Name    | Gmail Rep | Outlook Rep | Yahoo Rep | Total Revenue | Tech Investments |
      | SendWave    | 85        | 78          | 72        | 2400          | 600              |
      | MailMonkey  | 72        | 68          | 65        | 2800          | 450              |
      | BluePost    | 68        | 70          | 66        | 2200          | 550              |
      | SendBolt    | 90        | 88          | 85        | 2000          | 700              |
      | RocketMail  | 75        | 72          | 70        | 2600          | 500              |
    When the facilitator triggers final score calculation
    Then the system displays "Calculating final scores..." animation
    And the system calculates ESP scores as follows:
      | ESP Name    | Reputation Score | Revenue Score | Tech Score | Total Score | Qualified |
      | SendWave    | 40.25            | 30.00         | 7.50       | 77.75       | Yes       |
      | MailMonkey  | 34.50            | 35.00         | 5.63       | 75.13       | Yes       |
      | BluePost    | 34.20            | 27.50         | 6.88       | 68.58       | Yes       |
      | SendBolt    | 44.25            | 25.00         | 8.75       | 78.00       | Yes       |
      | RocketMail  | 36.75            | 32.50         | 6.25       | 75.50       | Yes       |
    And "SendBolt" is determined as the winner with highest total score
    And the final ranking is displayed:
      | Rank | ESP Name    | Total Score |
      | 1    | SendBolt    | 78.00       |
      | 2    | SendWave    | 77.75       |
      | 3    | RocketMail  | 75.50       |
      | 4    | MailMonkey  | 75.13       |
      | 5    | BluePost    | 68.58       |
    And score details are logged in JSON format

  # ============================================================================
  # SCENARIO 2: Score Component Calculations
  # ============================================================================

  Scenario: Calculate reputation score with weighted kingdoms
    Given an ESP "SendWave" with the following reputation:
      | Kingdom | Reputation |
      | Gmail   | 80         |
      | Outlook | 70         |
      | Yahoo   | 60         |
    When the system calculates the reputation score
    Then the weighted reputation is calculated as:
      """
      (80 × 0.5) + (70 × 0.3) + (60 × 0.2) = 40 + 21 + 12 = 73
      """
    And the reputation score is calculated as:
      """
      (73 / 100) × 50 = 36.50 points
      """
    And the reputation score is 36.50

  Scenario: Calculate revenue score relative to highest earner
    Given the following ESP revenue totals:
      | ESP Name   | Total Revenue |
      | SendWave   | 2000          |
      | MailMonkey | 3000          |
      | BluePost   | 1500          |
    When the system calculates revenue scores
    Then the highest revenue is 3000
    And revenue scores are calculated as:
      | ESP Name   | Calculation              | Revenue Score |
      | SendWave   | (2000 / 3000) × 35      | 23.33         |
      | MailMonkey | (3000 / 3000) × 35      | 35.00         |
      | BluePost   | (1500 / 3000) × 35      | 17.50         |

  Scenario: Calculate technical score from investments
    Given an ESP "SendWave" with the following technical investments:
      | Investment Type      | Cost | Quantity | Total |
      | SPF                  | 100  | 1        | 100   |
      | DKIM                 | 150  | 1        | 150   |
      | DMARC                | 200  | 1        | 200   |
      | Content Filtering    | 100  | 1        | 100   |
      | Monitoring Analytics | 120  | 1        | 120   |
      | IP Warming           | 150  | 2        | 300   |
      | List Hygiene         | 80   | 2        | 160   |
    When the system calculates the technical score
    Then the total technical investments are 1130
    And the technical score is calculated as:
      """
      min(1130 / 1200, 1.0) × 15 = 0.9417 × 15 = 14.13 points
      """
    And the technical score is 14.13

  Scenario: Technical score capped at maximum
    Given an ESP with total technical investments of 1500
    When the system calculates the technical score
    Then the technical score is calculated as:
      """
      min(1500 / 1200, 1.0) × 15 = 1.0 × 15 = 15.00 points
      """
    And the technical score is 15.00

  # ============================================================================
  # SCENARIO 3: Disqualification - Single ESP Below Threshold
  # ============================================================================

  Scenario: ESP disqualified for low reputation in one kingdom
    Given the following ESP final stats:
      | ESP Name   | Gmail Rep | Outlook Rep | Yahoo Rep | Total Revenue | Tech Investments |
      | SendWave   | 85        | 78          | 55        | 2400          | 600              |
      | MailMonkey | 75        | 70          | 68        | 2800          | 450              |
    When the facilitator triggers final score calculation
    Then "SendWave" is marked as disqualified
    And the disqualification reason is "Reputation below 60 in: Yahoo"
    And the score breakdown is still calculated for "SendWave"
    And the final ranking is displayed with "SendWave" grayed out:
      | Rank | ESP Name   | Total Score | Status       |
      | 1    | MailMonkey | 73.13       | Winner       |
      | -    | SendWave   | 77.75       | Disqualified |
    And a message is displayed: "SendWave: Disqualified - Reputation below 60 in Yahoo"
    And the reputation values are visible on the results page

  Scenario: ESP disqualified for low reputation in multiple kingdoms
    Given an ESP "BluePost" with final stats:
      | Gmail Rep | Outlook Rep | Yahoo Rep | Total Revenue | Tech Investments |
      | 55        | 58          | 62        | 2200          | 550              |
    When the system evaluates qualification
    Then "BluePost" is marked as disqualified
    And the disqualification reason is "Reputation below 60 in: Gmail, Outlook"

  # ============================================================================
  # SCENARIO 4: All ESPs Disqualified
  # ============================================================================

  Scenario: All ESPs disqualified - show rankings for learning
    Given the following ESP final stats:
      | ESP Name   | Gmail Rep | Outlook Rep | Yahoo Rep | Total Revenue | Tech Investments |
      | SendWave   | 55        | 58          | 52        | 2400          | 600              |
      | MailMonkey | 58        | 55          | 50        | 2800          | 450              |
      | BluePost   | 52        | 60          | 48        | 2200          | 550              |
    When the facilitator triggers final score calculation
    Then all ESPs are marked as disqualified
    And the system displays message: "No qualified winner - All ESPs failed minimum reputation requirements"
    And the final ranking is displayed with all ESPs grayed out:
      | Rank | ESP Name   | Total Score | Status       | Failing Kingdoms    |
      | -    | MailMonkey | 70.63       | Disqualified | Gmail, Outlook, Yahoo |
      | -    | SendWave   | 72.25       | Disqualified | Gmail, Outlook, Yahoo |
      | -    | BluePost   | 65.58       | Disqualified | Gmail, Yahoo          |
    And scores are still shown for learning purposes

  # ============================================================================
  # SCENARIO 5: Tie-Breaker Using Weighted Reputation
  # ============================================================================

  Scenario: Two ESPs tied on total score - use weighted reputation
    Given the following ESP final stats:
      | ESP Name | Gmail Rep | Outlook Rep | Yahoo Rep | Total Revenue | Tech Investments |
      | SendWave | 88        | 82          | 78        | 2400          | 600              |
      | BluePost | 82        | 88          | 85        | 2400          | 600              |
    When the facilitator triggers final score calculation
    Then both ESPs have the same total score
    And "SendWave" has weighted reputation:
      """
      (88 × 0.5) + (82 × 0.3) + (78 × 0.2) = 84.2
      """
    And "BluePost" has weighted reputation:
      """
      (82 × 0.5) + (88 × 0.3) + (85 × 0.2) = 84.4
      """
    And "BluePost" wins the tie-breaker with higher weighted reputation
    And the final ranking shows "BluePost" as rank 1

  Scenario: Multiple winners declared for exact tie (unlikely edge case)
    Given two ESPs with identical scores and identical weighted reputation
    When the facilitator triggers final score calculation
    Then both ESPs are declared as winners
    And the ranking shows: "Joint Winners: SendWave, BluePost"

  # ============================================================================
  # SCENARIO 6: Zero Revenue Edge Case
  # ============================================================================

  Scenario: All ESPs generated zero revenue
    Given the following ESP final stats:
      | ESP Name   | Gmail Rep | Outlook Rep | Yahoo Rep | Total Revenue | Tech Investments |
      | SendWave   | 75        | 70          | 68        | 0             | 600              |
      | MailMonkey | 72        | 68          | 65        | 0             | 450              |
    When the system calculates revenue scores
    Then the maximum revenue is 0
    And all ESPs receive revenue score of 0
    And the winner is determined by reputation and technical scores only

  Scenario: Some ESPs have zero revenue while others don't
    Given the following ESP final stats:
      | ESP Name   | Gmail Rep | Outlook Rep | Yahoo Rep | Total Revenue | Tech Investments |
      | SendWave   | 75        | 70          | 68        | 2000          | 600              |
      | MailMonkey | 72        | 68          | 65        | 0             | 450              |
    When the system calculates revenue scores
    Then "SendWave" receives full revenue score: "(2000 / 2000) × 35 = 35.00"
    And "MailMonkey" receives revenue score: "(0 / 2000) × 35 = 0.00"

  # ============================================================================
  # SCENARIO 7: Destination Collaborative Score
  # ============================================================================

  Scenario: Calculate destination collaborative score with success
    Given the following Destination cumulative stats after Round 4:
      | Destination | Spam Blocked | Total Spam Sent | False Positives | Total Legitimate Emails | Coordinated Actions |
      | Gmail       | 8000         | 10000           | 200             | 20000                   | 2                   |
      | Outlook     | 6000         | 8000            | 150             | 15000                   | 2                   |
      | Yahoo       | 4000         | 5000            | 100             | 10000                   | 2                   |
    When the system calculates the destination collaborative score
    Then the Industry Protection score is calculated as:
      """
      Spam blocked rate = (8000 + 6000 + 4000) / (10000 + 8000 + 5000)
                        = 18000 / 23000 = 0.7826
      Industry Protection = 0.7826 × 40 = 31.30 points
      """
    And the Coordination Bonus is calculated as:
      """
      Total coordinated actions = 2 + 2 + 2 = 6
      Coordination Bonus = 6 × 10 = 60 points (placeholder - not yet implemented)
      """
    And the User Satisfaction score is calculated as:
      """
      False positive rate = (200 + 150 + 100) / (20000 + 15000 + 10000)
                          = 450 / 45000 = 0.01
      User Satisfaction = (1 - 0.01) × 20 = 19.80 points
      """
    And the collaborative score is: "31.30 + 60 + 19.80 = 111.10"
    And Destinations succeed because score > 80
    And a success message is displayed: "Destinations succeeded in protecting users while allowing legitimate mail"

  Scenario: Destinations fail collaborative score threshold
    Given the following Destination cumulative stats:
      | Destination | Spam Blocked | Total Spam Sent | False Positives | Total Legitimate Emails | Coordinated Actions |
      | Gmail       | 4000         | 10000           | 500             | 20000                   | 0                   |
      | Outlook     | 3000         | 8000            | 400             | 15000                   | 0                   |
      | Yahoo       | 2000         | 5000            | 300             | 10000                   | 0                   |
    When the system calculates the destination collaborative score
    Then the Industry Protection score is: "(9000 / 23000) × 40 = 15.65"
    And the Coordination Bonus is: "0 × 10 = 0"
    And the User Satisfaction score is: "(1 - 0.0267) × 20 = 19.47"
    And the collaborative score is: "15.65 + 0 + 19.47 = 35.12"
    And Destinations fail because score ≤ 80
    And a failure message is displayed: "Destinations failed - Users dissatisfied with email industry, turning to other communication channels"

  # ============================================================================
  # SCENARIO 8: Calculation Timing and Animation
  # ============================================================================

  Scenario: Facilitator triggers calculation after Round 4 consequences
    Given Round 4 has completed
    And the Consequences Phase results are displayed
    When the facilitator clicks "Calculate Final Scores" button
    Then the system immediately starts calculation
    And displays "Calculating final scores..." with spinner animation
    And the calculation completes within 2 seconds
    And the results screen is displayed with rankings

  Scenario: Cannot calculate before all 4 rounds completed
    Given only 3 rounds have been completed
    When the facilitator attempts to access final score calculation
    Then the "Calculate Final Scores" button is disabled
    And a tooltip displays: "All 4 rounds must be completed"

  # ============================================================================
  # SCENARIO 9: Score Breakdown Display and Logging
  # ============================================================================

  Scenario: Display detailed score breakdown for each ESP
    Given final scores have been calculated
    When the results screen is displayed
    Then each ESP shows the following breakdown:
      | Component          | Value  | Weight |
      | Weighted Reputation| 84.2   | -      |
      | Reputation Score   | 42.10  | 50%    |
      | Revenue Score      | 30.00  | 35%    |
      | Technical Score    | 7.50   | 15%    |
      | Total Score        | 79.60  | 100%   |
    And reputation per kingdom is displayed:
      | Gmail   | 88 |
      | Outlook | 82 |
      | Yahoo   | 78 |
    And total revenue is displayed: "2400 credits"
    And technical investments are displayed: "600 credits"

  Scenario: Log score calculations in JSON format
    Given final scores have been calculated for "SendWave"
    Then the following data is logged in structured JSON format:
      """json
      {
        "esp_name": "SendWave",
        "timestamp": "2025-01-17T14:30:00Z",
        "round": 4,
        "reputation": {
          "gmail": 85,
          "outlook": 78,
          "yahoo": 72,
          "weighted": 80.5
        },
        "total_revenue": 2400,
        "tech_investments": 600,
        "scores": {
          "reputation_score": 40.25,
          "revenue_score": 30.00,
          "tech_score": 7.50,
          "total_score": 77.75
        },
        "qualified": true,
        "disqualification_reason": null,
        "rank": 2
      }
      """

  Scenario: Log destination collaborative score in JSON format
    Given destination collaborative score has been calculated
    Then the following data is logged in structured JSON format:
      """json
      {
        "timestamp": "2025-01-17T14:30:00Z",
        "round": 4,
        "destinations": {
          "gmail": {
            "spam_blocked": 8000,
            "total_spam_sent": 10000,
            "false_positives": 200,
            "total_legitimate_emails": 20000,
            "coordinated_actions": 2
          },
          "outlook": {
            "spam_blocked": 6000,
            "total_spam_sent": 8000,
            "false_positives": 150,
            "total_legitimate_emails": 15000,
            "coordinated_actions": 2
          },
          "yahoo": {
            "spam_blocked": 4000,
            "total_spam_sent": 5000,
            "false_positives": 100,
            "total_legitimate_emails": 10000,
            "coordinated_actions": 2
          }
        },
        "collaborative_score": {
          "industry_protection": 31.30,
          "coordination_bonus": 60,
          "user_satisfaction": 19.80,
          "total": 111.10,
          "success": true
        }
      }
      """

  # ============================================================================
  # SCENARIO 10: Edge Cases and Data Validation
  # ============================================================================

  Scenario: Handle missing cumulative data gracefully
    Given some ESP data is incomplete due to errors
    When the system calculates final scores
    Then missing revenue data defaults to 0
    And missing tech investment data defaults to 0
    And a warning is logged: "Incomplete data for ESP: SendWave"
    And calculation proceeds with available data

  Scenario: Validate data ranges before calculation
    Given an ESP with reputation values:
      | Gmail   | 150  |
      | Outlook | -10  |
      | Yahoo   | 75   |
    When the system validates data before calculation
    Then Gmail reputation is clamped to 100
    And Outlook reputation is clamped to 0
    And a warning is logged: "Invalid reputation values detected and corrected"
    And calculation proceeds with corrected values

  Scenario: Round scores to 2 decimal places for display
    Given calculated scores with high precision:
      | Component        | Raw Value        |
      | Reputation Score | 40.256789        |
      | Revenue Score    | 30.123456        |
      | Tech Score       | 7.891234         |
    When scores are prepared for display
    Then scores are rounded to 2 decimal places:
      | Component        | Display Value |
      | Reputation Score | 40.26         |
      | Revenue Score    | 30.12         |
      | Tech Score       | 7.89          |
      | Total Score      | 78.27         |

  # ============================================================================
  # SCENARIO 11: Integration with Victory Screen (US-5.2)
  # ============================================================================

  Scenario: Prepare score data for Victory Screen display
    Given final scores have been calculated
    When the system transitions to Victory Screen (US-5.2)
    Then the following data is available:
      | Data Element              | Value       |
      | Winner ESP Name           | SendBolt    |
      | Winner Total Score        | 78.00       |
      | Winner Rank               | 1           |
      | Complete Rankings         | [all 5 ESP] |
      | Score Breakdowns          | [all ESP]   |
      | Destination Success       | true        |
      | Destination Score         | 111.10      |
    And score calculation logs are accessible for analytics

  # ============================================================================
  # SCENARIO 12: Performance and Response Time
  # ============================================================================

  Scenario: Calculate scores within acceptable time
    Given a game with 5 ESP teams and 3 Destinations
    And complete data for all 4 rounds
    When the facilitator triggers final score calculation
    Then the calculation completes in less than 5 seconds
    And all score components are calculated correctly
    And results are ready for display

  Scenario: Handle calculation for maximum game size
    Given a game with maximum configuration:
      | Element      | Count |
      | ESP Teams    | 5     |
      | Destinations | 3     |
      | Rounds       | 4     |
    When the system calculates final scores
    Then performance remains acceptable (< 2 seconds)
    And all calculations are accurate
