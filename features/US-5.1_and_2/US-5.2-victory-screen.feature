Feature: Victory Screen
  As a player
  I want to see final results and winners
  So that I know how I performed and can celebrate/learn from the outcome

  Background:
    Given final scores have been calculated (US-5.1)
    And winner determination is complete
    And all score data is available

  # ============================================================================
  # SCENARIO 1: Victory Screen Display - ESP Winner
  # ============================================================================

  Scenario: Display victory screen with clear ESP winner
    Given the final scores are:
      | ESP Name    | Total Score | Qualified | Rank |
      | SendBolt    | 78.00       | Yes       | 1    |
      | SendWave    | 77.75       | Yes       | 2    |
      | RocketMail  | 75.50       | Yes       | 3    |
      | MailMonkey  | 75.13       | Yes       | 4    |
      | BluePost    | 68.58       | Yes       | 5    |
    And Destinations succeeded with score 111.10
    When the victory screen is displayed
    Then the screen shows a dramatic reveal animation lasting 3-5 seconds
    And a trophy icon is displayed next to "SendBolt"
    And a congratulations message is shown: "🏆 Congratulations SendBolt! You are the Email Deliverability Champion!"
    And confetti animation plays for 3 seconds
    And the screen layout is optimized for screenshots

  Scenario: Display victory screen with joint winners (tie scenario)
    Given the final scores show a tie:
      | ESP Name  | Total Score | Qualified | Rank |
      | SendBolt  | 78.00       | Yes       | 1    |
      | SendWave  | 78.00       | Yes       | 1    |
      | BluePost  | 70.00       | Yes       | 3    |
    When the victory screen is displayed
    Then both "SendBolt" and "SendWave" display trophy icons
    And the congratulations message shows: "🏆 Joint Winners: SendBolt & SendWave!"
    And both winners are highlighted with gold background

  # ============================================================================
  # SCENARIO 2: ESP Leaderboard Display
  # ============================================================================

  Scenario: Display complete ESP leaderboard with score breakdowns
    Given the final scores and breakdowns are available
    When the ESP leaderboard section is displayed
    Then the leaderboard shows all ESPs in rank order
    And each ESP entry displays:
      | Field                    | Example Value |
      | Rank                     | 1             |
      | Team Name                | SendBolt      |
      | Total Score              | 78.00         |
      | Reputation Score (50%)   | 44.25         |
      | Revenue Score (35%)      | 25.00         |
      | Technical Score (15%)    | 8.75          |
    And the winner (rank 1) has a gold background
    And ranks 2-3 have silver/bronze backgrounds respectively
    And ranks 4-5 have white background

  Scenario: Display reputation standings per kingdom
    Given "SendBolt" has the following reputation values:
      | Kingdom | Reputation |
      | zmail   | 90         |
      | intake | 88         |
      | yagle   | 85         |
    When the reputation section is displayed for "SendBolt"
    Then each kingdom shows:
      | Kingdom | Reputation | Visual Indicator          |
      | zmail   | 90         | Green bar (90% filled)    |
      | intake | 88         | Green bar (88% filled)    |
      | yagle   | 85         | Green bar (85% filled)    |
    And the weighted average is shown: "88.25 (Excellent)"
    And reputation bars use color coding:
      | Range   | Color  | Label      |
      | 90-100  | Green  | Excellent  |
      | 70-89   | Blue   | Good       |
      | 50-69   | Yellow | Warning    |
      | 30-49   | Orange | Poor       |
      | 0-29    | Red    | Blacklisted|

  Scenario: Display total revenue earned
    Given "SendBolt" earned the following revenue:
      | Round | Revenue |
      | 1     | 450     |
      | 2     | 520     |
      | 3     | 580     |
      | 4     | 450     |
    When the revenue section is displayed
    Then the total revenue is shown: "2,000 credits"
    And a mini chart shows revenue per round
    And the revenue percentage vs highest earner is shown: "71% of top earner"

  Scenario: Display technical infrastructure level
    Given "SendBolt" has the following technical investments:
      | Investment           | Status   | Cost |
      | SPF                  | Active   | 100  |
      | DKIM                 | Active   | 150  |
      | DMARC                | Active   | 200  |
      | Content Filtering    | Active   | 100  |
      | Monitoring Analytics | Active   | 120  |
      | IP Warming           | Used 1x  | 150  |
    When the technical infrastructure section is displayed
    Then each investment is shown with a checkmark icon
    And the total investment is displayed: "820 credits"
    And the technical score is shown: "10.25 / 15 points"
    And a progress bar shows: "68% of maximum possible"

  # ============================================================================
  # SCENARIO 3: Disqualified ESP Display
  # ============================================================================

  Scenario: Display disqualified ESP in leaderboard
    Given "SendWave" is disqualified with reason "Reputation below 60 in: yagle"
    And "SendWave" has total score 77.75
    When the leaderboard is displayed
    Then "SendWave" appears in the ranking based on score
    But the entire row is grayed out (50% opacity)
    And a "DISQUALIFIED" badge is displayed prominently
    And the disqualification reason is shown below the name:
      """
      ⚠️ Disqualified: yagle reputation (55) below minimum requirement (60)
      """
    And reputation values are still visible showing the failing kingdom in red
    And score breakdown is still accessible via expand button
    And a tooltip explains: "This team had a high score but failed the minimum reputation requirement"

  Scenario: Display all disqualified ESPs when no winner
    Given all ESPs are disqualified
    When the victory screen is displayed
    Then no trophy icon is shown
    And the header message is: "⚠️ No Qualified Winner - All Teams Failed Minimum Requirements"
    And all ESPs are shown in gray
    And each shows their specific disqualification reasons
    And a learning message is displayed:
      """
      All teams failed to maintain the minimum reputation of 60 across all destinations.
      This demonstrates the critical importance of reputation management in email deliverability.
      """

  # ============================================================================
  # SCENARIO 4: Destination Success Display
  # ============================================================================

  Scenario: Display destination success with score breakdown
    Given Destinations succeeded with collaborative score 111.10
    And the score breakdown is:
      | Component            | Points | Maximum |
      | Industry Protection  | 31.30  | 40      |
      | Coordination Bonus   | 60.00  | varies  |
      | User Satisfaction    | 19.80  | 20      |
    When the Destination section is displayed
    Then a success banner is shown: "✅ Destinations Succeeded - Email Industry Remains Trusted"
    And the collaborative score is prominently displayed: "111.10 / 80 required"
    And a green checkmark icon is shown
    And the score breakdown table is displayed
    And each component shows a progress bar with percentage filled

  Scenario: Display spam blocking effectiveness per destination
    Given the following spam blocking stats:
      | Destination | Spam Sent | Spam Blocked | Block Rate |
      | zmail       | 10000     | 8000         | 80%        |
      | intake     | 8000      | 6000         | 75%        |
      | yagle       | 5000      | 4000         | 80%        |
    When the spam blocking effectiveness section is displayed
    Then each destination shows:
      | Destination | Visual              | Label            |
      | zmail       | Green bar (80%)     | 8K / 10K blocked |
      | intake     | Yellow bar (75%)    | 6K / 8K blocked  |
      | yagle       | Green bar (80%)     | 4K / 5K blocked  |
    And the combined blocking rate is shown: "78% average"
    And a congratulatory message: "Great job protecting users from spam!"

  Scenario: Display user satisfaction rating
    Given the following false positive stats:
      | Destination | Legitimate Emails | False Positives | Rate  |
      | zmail       | 20000             | 200             | 1.0%  |
      | intake     | 15000             | 150             | 1.0%  |
      | yagle       | 10000             | 100             | 1.0%  |
    When the user satisfaction section is displayed
    Then the combined false positive rate is shown: "1.0%"
    And the user satisfaction score is displayed: "19.80 / 20 points"
    And a satisfaction rating is shown with stars: "⭐⭐⭐⭐⭐ (4.95/5)"
    And a message: "Users trust their email service to deliver what matters"

  # ============================================================================
  # SCENARIO 5: Destination Failure Display
  # ============================================================================

  Scenario: Display destination failure with educational message
    Given Destinations failed with collaborative score 35.12
    And the score breakdown is:
      | Component            | Points | Maximum |
      | Industry Protection  | 15.65  | 40      |
      | Coordination Bonus   | 0.00   | varies  |
      | User Satisfaction    | 19.47  | 20      |
    When the Destination section is displayed
    Then a failure banner is shown: "❌ Destinations Failed - Users Lost Trust in Email"
    And the collaborative score is shown in red: "35.12 / 80 required"
    And a red X icon is shown
    And an educational message explains:
      """
      The email industry failed to adequately protect users from spam while maintaining
      legitimate email delivery. Users are now turning to alternative communication channels
      like messaging apps and social media. This demonstrates the delicate balance
      destinations must maintain.
      """
    And the score breakdown shows which components fell short
    And recommendations are displayed:
      """
      • Spam blocking was insufficient (15.65 / 40 points)
      • No coordination between destinations (0 points)
      • User satisfaction was maintained but overshadowed by spam issues
      """

  # ============================================================================
  # SCENARIO 6: Dramatic Reveal Animation
  # ============================================================================

  Scenario: Play reveal animation sequence
    Given the victory screen is ready to display
    When the reveal animation starts
    Then the following sequence plays:
      | Step | Duration | Action                                    |
      | 1    | 1.0s     | Fade in with "The results are in..."      |
      | 2    | 1.5s     | Rankings slide in from bottom, one by one |
      | 3    | 1.0s     | Winner row highlights with golden glow    |
      | 4    | 0.5s     | Trophy icon animates in with bounce       |
      | 5    | 1.0s     | Confetti explosion if winner qualified    |
    And the total animation duration is 3-5 seconds
    And players can skip animation by clicking anywhere

  Scenario: Skip reveal animation
    Given the reveal animation is playing
    And 1.5 seconds have elapsed
    When a player clicks anywhere on the screen
    Then the animation immediately completes
    And the full victory screen is displayed
    And no further animations play

  # ============================================================================
  # SCENARIO 7: Interactive Elements
  # ============================================================================

  Scenario: Expand ESP score breakdown details
    Given the leaderboard is displayed
    When a player clicks on "SendBolt" row
    Then the row expands to show detailed breakdown:
      | Component              | Calculation                           | Points |
      | Weighted Reputation    | (90×0.5 + 88×0.3 + 85×0.2) = 88.25   | -      |
      | Reputation Score       | (88.25 / 100) × 50                    | 44.13  |
      | Revenue Score          | (2000 / 2800) × 35                    | 25.00  |
      | Technical Score        | min(820/1200, 1.0) × 15               | 10.25  |
      | **Total Score**        |                                        | **79.38** |
    And each kingdom's reputation is shown with color-coded bars
    And revenue history per round is shown in a mini chart
    And technical investments are listed with checkmarks

  Scenario: View individual destination performance
    Given the Destination section shows collaborative score
    When a player clicks "View Individual Destinations"
    Then a breakdown per destination is shown:
      | Destination | Spam Blocked | Block Rate | False Positives | FP Rate |
      | zmail       | 8000/10000   | 80%        | 200/20000       | 1.0%    |
      | intake     | 6000/8000    | 75%        | 150/15000       | 1.0%    |
      | yagle       | 4000/5000    | 80%        | 100/10000       | 1.0%    |
    And each destination's contribution to collaborative score is shown

  # ============================================================================
  # SCENARIO 8: Navigation and Next Steps
  # ============================================================================

  Scenario: Return to lobby for new game
    Given the victory screen is displayed
    When a player clicks "Start New Game" button
    Then a confirmation dialog is shown: "Start a new game? Current results will be lost."
    And if confirmed, the system resets to lobby (US-1.3)

  # ============================================================================
  # SCENARIO 9: Celebration Effects and Polish
  # ============================================================================

  Scenario: Play celebration effects for qualified winner
    Given "SendBolt" won and is qualified
    When the winner is revealed
    Then confetti animation plays from top of screen
    And confetti particles fall for 3 seconds
    And particle colors match the Brevo brand (greens: #0B5540, #10B981)
    And a celebratory sound effect plays (optional, respects mute settings)
    And the trophy icon gleams with a gold shimmer animation

  Scenario: Show somber display when all ESPs disqualified
    Given all ESPs are disqualified
    When the victory screen is displayed
    Then no celebration effects play
    And the color scheme is more muted (grays and subdued colors)

  # ============================================================================
  # SCENARIO 10: Responsive Design and Accessibility
  # ============================================================================

  Scenario: Display victory screen on large screens
    Given the victory screen is loaded on a desktop (1920x1080)
    When the layout is rendered
    Then all elements fit on one screen without scrolling
    And the leaderboard uses a multi-column layout
    And charts and graphs are large and easy to read
    And font sizes are optimized for projection (min 16px body, 24px headers)

  Scenario: Display victory screen on phone
    Given the victory screen is loaded on a phone
    When the layout is rendered
    Then the leaderboard switches to single-column layout
    And all critical information remains visible
    And interactive elements are appropriately sized for touch (min 44x44px)
    And minimal scrolling is required (max 1-2 page lengths)

  Scenario: Display victory screen with accessibility features
    Given the victory screen is displayed
    Then all color-coded elements include text labels (not just color)
    And screen readers can announce the winner and rankings
    And keyboard navigation is supported (tab through rankings)
    And animations can be disabled via user preference
    And contrast ratios meet WCAG AA standards (min 4.5:1)
    And focus indicators are clearly visible

  # ============================================================================
  # SCENARIO 14: Integration with Previous US
  # ============================================================================

  Scenario: Receive calculated scores from US-5.1
    Given US-5.1 has completed final score calculation
    When the victory screen component initializes
    Then it receives the following data from US-5.1:
      | Data Element                    | Format |
      | ESP rankings (sorted)           | Array  |
      | Score breakdowns per ESP        | Object |
      | Winner ESP ID                   | String |
      | Disqualified ESPs with reasons  | Array  |
      | Destination collaborative score | Object |
      | Destination success/failure     | Boolean|
      | Calculation timestamp           | ISO    |
    And all data is validated before display
    And missing data triggers graceful error handling

  Scenario: Handle US-5.1 calculation errors
    Given US-5.1 encountered an error during calculation
    When the victory screen attempts to load
    Then an error message is displayed:
      """
      ⚠️ Unable to display complete results due to a calculation error.
      Partial results may be shown below. Please contact the facilitator.
      """
    And partial data is displayed where available
    And a "Retry Calculation" button is shown
    And error details are logged for debugging
