# Acceptance Tests: US-3.5 - Consequences Phase Display

**User Story:** As a player, I want to see detailed results of my decisions so that I can learn and adjust my strategy

**Test Strategy:** Split into 4 iterations to ensure progressive validation and manageable implementation
- Iteration 1: Basic consequences display structure
- Iteration 2: ESP-specific detailed results
- Iteration 3: Destination-specific detailed results
- Iteration 4: Visual enhancements and alerts

**Terminology Clarifications:**
- **Credits:** The game currency (e.g., "500 credits")
- **Budget:** The field storing credit amounts in both ESPTeam and Destination
- **Spam Rate / Complaint Rate:** Same metric (use "spam rate" in UI, stored as `complaint_rate`)
- **Filtered (ESP view):** Total non-delivered emails = Sent - Delivered (includes spam blocked + false positives)
- **Spam Blocked (Destination view):** Only correctly identified spam emails that were blocked
- **False Positives (Destination view):** Legitimate emails incorrectly blocked

**Prerequisites:**
- US-3.3 Iterations 1-5 must be fully integrated (reputation & complaint calculators)
- **Iteration 3 BLOCKED until US-3.3 Iteration 6 complete** (destination filtering system)

NB: Consequence phase has no timer. this phase ends when the facilitator launches next round from his panel. This way players can discuss their results and interact with facilitator if needed without any time constraint

---

## ITERATION 1: Basic Consequences Display Structure

### Scenario 1.1: Transition to Consequences Phase
```gherkin
Feature: Consequences Phase Display Initialization
  As a player
  I want the game to automatically display consequences after resolution
  So that I can see the results of my decisions

Scenario: Successful transition from Resolution to Consequences phase
  Given the game is in "Resolution" phase for Round 2
  When the resolution calculation completes
  Then the phase should change to "Consequences"
  And all players should see the Consequences Phase screen (no timer for this phase)
```

### Scenario 1.2: Consequences screen displays for ESP player
```gherkin
Scenario: ESP player sees consequences screen structure
  Given I am logged in as ESP player "Alice" from team "SendWave"
  And the game transitions to "Consequences" phase for Round 2
  When I view my consequences screen
  Then I should see a header showing "Round 2 Results"
  And I should see my team name "SendWave" prominently displayed
  And I should see the following sections:
    | Section Title              |
    | Client Performance         |
    | Revenue Summary            |
    | Reputation Changes         |
    | Budget Update              |
    | Alerts & Notifications     |
  And each section should have a clear visual container
```

### Scenario 1.3: Consequences screen displays for Destination player
```gherkin
Scenario: Destination player sees consequences screen structure
  Given I am logged in as Destination player "Grace" from "zmail"
  And the game transitions to "Consequences" phase for Round 2
  When I view my consequences screen
  Then I should see a header showing "Round 2 Results"
  And I should see my destination name "zmail" prominently displayed
  And I should see the following sections:
    | Section Title              |
    | Spam Blocking Summary      |
    | User Satisfaction          |
    | Revenue Summary            |
    | Budget Update              |
    | ESP Behavior Alerts        |
  And each section should have a clear visual container
```

---

## ITERATION 2: ESP-Specific Detailed Results

### Scenario 2.1: Client performance display - individual client success
```gherkin
Feature: ESP Client Performance Display
  As an ESP player
  I want to see how each of my clients performed
  So that I can understand which clients are helping or hurting my reputation

Scenario: Display individual client delivery success rates
  Given I am ESP player "Alice" from "SendWave"
  And in Round 2 my team had the following active clients:
    | Client Name       | Type              | Emails Sent| Delivered | Filtered |
    | Growing Startup   | growing_startup   | 35,000     | 31,500    | 3,500    |
    | Re-engagement Co. | re_engagement     | 50,000     | 38,750    | 11,250   |
    |Aggressive Marketer| aggressive_marketer| 80,000    | 56,000    | 24,000   |
  When I view the "Client Performance" section
  Then I should see a card for "Growing Startup" showing:
    | Metric                  | Value    | Visual Indicator | Notes                                    |
    | Delivery Success Rate   | 90%      | Blue badge       | Calculated: 31,500 / 35,000              |
    | Emails Delivered        | 31,500   | -                | Successfully reached inboxes             |
    | Emails Filtered         | 3,500    | -                | Blocked by destinations (spam + FP)      |
    | Spam Rate               | 1.2%     | Orange badge     | Client's complaint rate                  |
  And I should see a card for "Re-engagement Co." showing:
    | Metric                  | Value    | Visual Indicator | Notes                                    |
    | Delivery Success Rate   | 77.5%    | Orange badge     | Calculated: 38,750 / 50,000              |
    | Emails Delivered        | 38,750   | -                | Successfully reached inboxes             |
    | Emails Filtered         | 11,250   | Red indicator    | Higher filtering due to re-engagement    |
    | Spam Rate               | 2.5%     | Red badge        | Client's complaint rate                  |
  And I should see a card for "Aggressive Marketer" showing:
    | Metric                  | Value    | Visual Indicator | Notes                                    |
    | Delivery Success Rate   | 70%      | Orange badge     | Calculated: 56,000 / 80,000              |
    | Emails Delivered        | 56,000   | -                | Successfully reached inboxes             |
    | Emails Filtered         | 24,000   | Red indicator    | High filtering due to aggressive tactics |
    | Spam Rate               | 3.0%     | Red badge        | Client's complaint rate (high risk)      |

  # NOTE: "Filtered" from ESP perspective = Sent - Delivered
  # This includes both spam correctly blocked AND false positives
  # Calculation: filtered = sent - delivered
```

### Scenario 2.2: Client revenue contribution display
```gherkin
Scenario: Display revenue earned from each client
  Given I am ESP player "Alice" from "SendWave"
  And in Round 2 my clients had the following configurations:
    | Client Name          | Type              | Status | Base Revenue | Delivery Rate | Actual Revenue |
    | Growing Startup      | growing_startup   | Active | 180          | 90%           | 162            |
    | Re-engagement Co.    | re_engagement     | Active | 150          | 77.5%         | 116            |
    | Aggressive Marketer  | aggressive_marketer| Paused | 350          | 0%            | 0              |
  When I view the "Client Performance" section
  Then each client card should display:
    | Client              | Revenue Display    | Calculation                        | Performance Note      |
    | Growing Startup     | +162 credits       | 180 × 0.90 = 162                   | 90% of base revenue   |
    | Re-engagement Co.   | +116 credits       | 150 × 0.775 = 116                  | 77.5% of base revenue |
    | Aggressive Marketer | 0 credits (Paused) | Revenue not earned while paused    | No revenue generated  |
  And I should see a tooltip on "Aggressive Marketer" explaining: "This client was paused and generated no revenue this round"

  # NOTE: Actual Revenue = Base Revenue × Delivery Rate
  # Paused clients generate 0 revenue regardless of base revenue
```

### Scenario 2.3: Client reputation impact display
```gherkin
Scenario: Display how each client affected reputation at each destination
  Given I am ESP player "Alice" from "SendWave"
  And in Round 2 my clients had the following reputation impacts:
    | Client              | zmail Impact | intake Impact | yagle Impact |
    | Premium Brand Co.   | +2           | +2             | +1           |
    | Growing Startup     | +1           | 0              | +1           |
    | Aggressive Marketer | -3           | -4             | -2           |
  When I view each client's detail card
  Then "Premium Brand Co." should show:
    | Destination | Impact | Visual |
    | zmail       | +2     | Green ↑ |
    | intake     | +2     | Green ↑ |
    | yagle       | +1     | Green ↑ |
  And "Growing Startup" should show:
    | Destination | Impact | Visual |
    | zmail       | +1     | Green ↑ |
    | intake     | 0      | Gray =  |
    | yagle       | +1     | Green ↑ |
  And "Aggressive Marketer" should show:
    | Destination | Impact | Visual  |
    | zmail       | -3     | Red ↓   |
    | intake     | -4     | Red ↓   |
    | yagle       | -2     | Red ↓   |
```

### Scenario 2.4: Reputation changes per destination for ESP
```gherkin
Scenario: Display updated reputation scores with change indicators
  Given I am ESP player "Alice" from "SendWave"
  And at the start of Round 2 my reputations were:
    | Destination | Previous Score |
    | zmail       | 82             |
    | intake     | 69             |
    | yagle       | 55             |
  And in Round 2 my total reputation changes were:
    | Destination | Change |
    | zmail       | +3     |
    | intake     | -1     |
    | yagle       | +4     |
  When I view the "Reputation Changes" section
  Then I should see:
    | Destination | Old Score | New Score | Change | Visual Indicator |
    | zmail       | 82        | 85        | +3 ↑   | Green badge      |
    | intake     | 69        | 68        | -1 ↓   | Orange badge     |
    | yagle       | 55        | 59        | +4 ↑   | Green badge      |
  And each reputation bar should animate from old score to new score
  And the change indicator should be clearly visible next to the new score
```

### Scenario 2.5: Budget update for ESP
```gherkin
Scenario: Display updated budget after round resolution
  Given I am ESP player "Alice" from "SendWave"
  And at the start of Round 2 my budget was 1,450 credits
  And in Round 2 my financial activity was:
    | Activity         | Amount |
    | Starting Budget  | 1,450  |
    | Revenue Earned   | +430   |
  When I view the "Budget Update" section
  Then I should see:
    | Metric             | Value         | Visual Style |
    | Previous Budget    | 1,450 credits | Gray, small  |
    | Round Net Income   | +430 credits  | Green        |
    | New Budget         | 1,880 credits | Large, bold  |
  And the budget change should show the calculation: 1,450 + 430 = 1,880

  # NOTE: Budget stored in ESPTeam.credits field
  # Display as "X credits" for consistency
```

### Scenario 2.6: ESP alerts and warnings
```gherkin
Scenario: Display critical alerts about reputation thresholds
  Given I am ESP player "Alice" from "SendWave"
  And in Round 2 my zmail reputation dropped from 62 to 58
  And the "Warning" threshold is 60
  And the "Critical" threshold is 40
  When I view the "Alerts & Notifications" section
  Then I should see a warning alert:
    """
    ⚠️ zmail reputation dropped to Warning zone (58)
    Your reputation at zmail fell below 60. Further drops may result in increased filtering.
    """
  And the alert should have an orange/yellow background
  And the alert should include an icon indicating severity level
```

### Scenario 2.7: ESP positive achievements notifications
```gherkin
Scenario: Display positive achievements when unlocking new opportunities
  Given I am ESP player "Alice" from "SendWave"
  And in Round 2 my zmail reputation increased to 85
  And reaching 85+ reputation unlocks "Premium Enterprise Client" tier
  When I view the "Alerts & Notifications" section
  Then I should see a success notification:
    """
    🎉 New Client Tier Unlocked: Premium Enterprise
    Your excellent zmail reputation (85) has unlocked access to premium enterprise clients in the marketplace!
    """
  And the notification should have a green background
  And the notification should include a celebration icon
```

### Scenario 2.8: Technology effectiveness feedback
```gherkin
Scenario: Display feedback on technology investments
  Given I am ESP player "Alice" from "SendWave"
  And I have DMARC installed
  And in Round 2 DMARC provided +5 reputation bonus across all destinations
  When I view the "Alerts & Notifications" section
  Then I should see an informational message:
    """
    ℹ️ DMARC Policy Active
    Your DMARC policy provided +5 reputation bonus this round across all destinations.
    """
  And the message should have a blue informational background
```

---
## ITERATION 3: Destination-Specific Detailed Results

**⚠️ IMPLEMENTATION BLOCKER:** This iteration is fully blocked until US-3.3 Iteration 6 is complete.

**Required Prerequisites:**
- US-3.3 Iteration 6: Destination filtering system
- US-3.3 Iteration 6.1: User satisfaction calculation & false positive tracking
- Filtering effectiveness formulas implemented
- Per-ESP filtering metrics tracked

**Estimated Prerequisite Effort:** 10-15 hours

---

### Scenario 3.1: Spam blocking effectiveness summary
```gherkin
Feature: Destination Spam Blocking Display
  As a Destination player
  I want to see how effectively I blocked spam
  So that I can evaluate my filtering strategy

Scenario: Display overall spam blocking statistics
  Given I am Destination player "Grace" from "zmail"
  And in Round 2 the total email volume targeting my destination was:
    | Category        | Volume  |
    | Legitimate      | 315,000 |
    | Spam            | 45,000  |
    | Total           | 360,000 |
  And my filtering decisions resulted in:
    | Outcome                    | Volume  | Notes                                      |
    | Legitimate Delivered       | 300,000 | Good emails that reached users             |
    | Legitimate Blocked (FP)    | 15,000  | False Positives - incorrectly blocked      |
    | Spam Blocked               | 40,000  | Spam correctly identified and blocked      |
    | Spam Delivered (FN)        | 5,000   | False Negatives - spam that got through    |
  When I view the "Spam Blocking Summary" section
  Then I should see:
    | Metric                      | Value      | Calculation                           |
    | Total Spam Detected         | 45,000     | Sum of all spam emails sent           |
    | Spam Successfully Blocked   | 40,000     | Correctly identified spam blocked     |
    | Spam Blocking Rate          | 88.9%      | (40,000 / 45,000) × 100               |
    | Spam Delivered (Missed)     | 5,000      | Spam that got through (false negative)|
  And the spam blocking rate should be calculated as: (40,000 / 45,000) × 100 = 88.9%

  # NOTE: From Destination perspective:
  # - "Spam Blocked" = ONLY correctly identified spam (not including false positives)
  # - "False Positives" tracked separately as legitimate emails incorrectly blocked
  # - Total blocked by filter = Spam Blocked + False Positives
```

### Scenario 3.2: False positive impact display
```gherkin
Scenario: Display false positive statistics and impact
  Given I am Destination player "Grace" from "zmail"
  And in Round 2 I had:
    | Metric                  | Value   | Calculation                    |
    | Legitimate Emails Sent  | 315,000 | Total legitimate volume        |
    | Legitimate Delivered    | 300,000 | Successfully delivered         |
    | False Positives         | 15,000  | Legitimate incorrectly blocked |
    | False Positive Rate     | 4.8%    | (15,000 / 315,000) × 100       |
  When I view the "Spam Blocking Summary" section
  Then I should see a "False Positives" subsection showing:
    | Metric                    | Value   | Visual Indicator | Impact                          |
    | Legitimate Emails Blocked | 15,000  | Orange/Red       | Hurts user satisfaction         |
    | False Positive Rate       | 4.8%    | Orange badge     | Percentage of legitimate blocked|
  And the false positive rate should be calculated as: (15,000 / 315,000) × 100 = 4.8%

  # NOTE: False Positive = Legitimate email incorrectly blocked by filter
  # False Positive Rate = FP / Total Legitimate Emails (NOT total volume)
  # This is separate from "Spam Blocked" which only counts correctly identified spam
```

### Scenario 3.3: ESP-specific filtering breakdown
```gherkin
Scenario: Display filtering effectiveness per ESP
  Given I am Destination player "Grace" from "zmail"
  And in Round 2 my filtering decisions per ESP were:
    | ESP        | Filtering Level | Spam Blocked | Spam Missed | FP Count |
    | SendWave   | Permissive     | 2,000        | 500         | 800      |
    | MailMonkey | Moderate       | 8,000        | 1,500       | 3,000    |
    | BluePost   | Strict         | 25,000       | 2,000       | 9,000    |
    | SendBolt   | Permissive     | 3,000        | 800         | 1,200    |
    | RocketMail | Permissive     | 2,000        | 200         | 1,000    |
  When I view the "Spam Blocking Summary" section
  Then I should see a table with ESP-specific results:
    | ESP        | Filter Level | Spam Blocked | Effectiveness | False Positives |
    | SendWave   | Permissive   | 2,000        | 80%           | 800             |
    | MailMonkey | Moderate     | 8,000        | 84%           | 3,000           |
    | BluePost   | Strict       | 25,000       | 93%           | 9,000           |
    | SendBolt   | Permissive   | 3,000        | 79%           | 1,200           |
    | RocketMail | Permissive   | 2,000        | 91%           | 1,000           |
```

### Scenario 3.4: User satisfaction change for Destination
```gherkin
Scenario: Display user satisfaction score and changes
  Given I am Destination player "Grace" from "zmail"
  And at the start of Round 2 my user satisfaction was 78%
  And in Round 2 my filtering decisions resulted in:
    | Factor                  | Percentage of Volume | Impact Multiplier | Points Impact |
    | Spam Delivered          | 2.5%                 | ×400              | -10 points    |
    | False Positives         | 1.5%                 | ×100              | -1.5 points   |
    | Spam Blocked            | 8%                   | ×300              | +24 points    |
  When I view the "User Satisfaction" section
  Then I should see:
    | Metric                    | Value      | Visual  | Calculation                      |
    | Previous Satisfaction     | 78%        | -       | Starting value                   |
    | Spam Blocked Gain         | +24 points | Green ↑ | 8% of volume × 300               |
    | Spam Delivered Penalty    | -10 points | Red ↓   | 2.5% of volume × 400             |
    | False Positive Penalty    | -1.5 points| Red ↓   | 1.5% of volume × 100             |
    | Net Change                | +12.5      | Green ↑ | +24 -10 -1.5                     |
    | New Satisfaction          | 90.5%      | Green   | 78 + 12.5 (capped at 100)        |
  And the satisfaction bar should animate from 78% to 90.5%
  And the change indicator should show "+12.5%" in green

  # NOTE: User Satisfaction Formula (US-3.3 Iteration 6.1):
  # base_satisfaction = 75
  # satisfaction = base + (spam_blocked% × 300) - (spam_through% × 400) - (false_positive% × 100)
  # Capped between 0 and 100
  #
  # Display can show either:
  # - Raw percentages (8% spam blocked)
  # - Calculated points (8% × 300 = 24 points)
  # - Final impact on satisfaction (78% → 90.5%)
```

### Scenario 3.5: Destination revenue display
```gherkin
Scenario: Display revenue earned based on performance
  Given I am Destination player "Grace" from "zmail"
  And zmail has the following in Round 2:
    | Metric                    | Value   |
    | Base Revenue              | 300     |
    | Total Emails Processed    | 500,000 |
    | Volume Bonus              | 100     |
    | User Satisfaction         | 82%     |
    | Satisfaction Multiplier   | 1.3     |
    | Total Revenue             | 520     |
  When I view the "Revenue Summary" section
  Then I should see:
    | Metric                    | Value         | Visual Style  |
    | Base Revenue              | 300 credits   | Gray, small   |
    | Volume Bonus              | +100 credits  | Blue          |
    | Satisfaction Multiplier   | ×1.3          | Green         |
    | Total Revenue Earned      | 520 credits   | Large, bold   |
  And I should see a tooltip explaining the revenue calculation:
    """
    Revenue Calculation:

    Base Revenue: 300 credits (zmail's base)
    Volume Bonus: (500,000 / 100,000) × 20 = 100 credits
    Subtotal: 300 + 100 = 400 credits

    Satisfaction Multiplier: 82% satisfaction → 1.3× multiplier
    Final Revenue: 400 × 1.3 = 520 credits

    Higher satisfaction = higher multiplier (up to 1.5× for 90%+)
    Lower satisfaction = penalty multiplier (down to 0.3× for <50%)
    """

  # NOTE: Destination Revenue Formula (US-3.3 Iteration 6.1):
  # base_revenue = { zmail: 300, intake: 200, yagle: 150 }
  # volume_bonus = (total_emails_processed / 100000) × 20
  # satisfaction_multiplier = based on satisfaction brackets (90-100: 1.5, 80-89: 1.3, etc.)
  # final_revenue = (base_revenue + volume_bonus) × satisfaction_multiplier
```

### Scenario 3.6: ESP behavior alerts for Destination
```gherkin
Scenario: Display alerts about problematic ESP behavior
  Given I am Destination player "Grace" from "zmail"
  And in Round 2 "BluePost" had:
    | Metric                | Value |
    | Spam Complaint Rate   | 2.8%  |
    | Reputation Score      | 52    |
    | Previous Reputation   | 58    |
  And the alert threshold for high spam is 2.0%
  When I view the "ESP Behavior Alerts" section
  Then I should see a warning alert:
    """
    🚨 High Spam Activity Detected: BluePost
    BluePost generated 2.8% spam complaints this round (threshold: 2.0%)
    Reputation dropped from 58 to 52 (-6 points)
    Consider increasing filtering level to protect your users.
    """
  And the alert should have an orange background
  And the alert should include the ESP name and specific metrics
```

### Scenario 3.7: ESP improvement recognition
```gherkin
Scenario: Display positive alerts for improving ESP behavior
  Given I am Destination player "Grace" from "zmail"
  And in Round 2 "MailMonkey" had:
    | Metric                  | Value |
    | Previous Reputation     | 58    |
    | New Reputation          | 65    |
    | Reputation Improvement  | +7    |
  When I view the "ESP Behavior Alerts" section
  Then I should see a positive notification (as increase > 5pts):
    """
    ✅ ESP Reputation Improvement: MailMonkey
    MailMonkey's reputation improved from 58 to 65 (+7 points)
    Their content quality and user engagement have significantly improved this round.
    """
  And the notification should have a green background
```


---

## ITERATION 4: Visual Enhancements and Polish

### Scenario 4.1: Change indicators with animations
```gherkin
Feature: Visual Feedback and Animations
  As a player
  I want to see clear visual feedback for changes
  So that I can quickly understand positive and negative trends

Scenario: Reputation changes animate with directional indicators
  Given I am viewing my consequences screen
  And my reputation scores have changed
  When the consequences screen loads
  Then each reputation bar should animate from the old value to the new value over 1 second
  And positive changes should show a green upward arrow "↑"
  And negative changes should show a red downward arrow "↓"
  And no change should show a gray equals sign "="
  And the change amount should be displayed next to the arrow (e.g., "+3 ↑" or "-2 ↓")
```

### Scenario 4.2: Color-coded severity indicators
```gherkin
Scenario: Alerts use consistent color coding for severity
  Given I am viewing the consequences screen
  And there are multiple alerts of different types
  When I view the "Alerts & Notifications" section
  Then critical alerts should have:
    | Visual Element | Style                    |
    | Background     | Red (#FEE2E2)            |
    | Border         | Dark Red (#DC2626)       |
    | Icon           | 🚨 or ⚠️                 |
  And warning alerts should have:
    | Visual Element | Style                    |
    | Background     | Orange (#FED7AA)         |
    | Border         | Dark Orange (#D97706)    |
    | Icon           | ⚠️                       |
  And informational messages should have:
    | Visual Element | Style                    |
    | Background     | Blue (#DBEAFE)           |
    | Border         | Dark Blue (#2563EB)      |
    | Icon           | ℹ️                       |
  And success notifications should have:
    | Visual Element | Style                    |
    | Background     | Green (#D1FAE5)          |
    | Border         | Dark Green (#059669)     |
    | Icon           | ✅ or 🎉                 |
```

### Scenario 4.3: Tooltips for complex metrics
```gherkin
Scenario: Hovering over metrics shows explanatory tooltips
  Given I am viewing my consequences screen as an ESP player
  When I hover over the "Delivery Success Rate" metric for a client
  Then a tooltip should appear explaining:
    """
    Delivery Success Rate
    
    Percentage of emails that successfully reached user inboxes.
    
    Calculation: (Delivered / Total Sent) × 100
    
    • Delivered: Emails that reached inboxes
    • Filtered: Emails blocked by destination spam filters
    • Bounced: Emails rejected due to invalid addresses
    """
  And the tooltip should appear within 500ms
  And the tooltip should remain visible while hovering
  And the tooltip should disappear 200ms after mouse leaves
```

### Scenario 4.4: Reputation threshold visual indicators
```gherkin
Scenario: Reputation scores show visual zones
  Given I am viewing reputation scores
  And reputation zones are defined as:
    | Zone       | Range  | Color |
    | Excellent  | 80-100 | Green |
    | Good       | 60-79  | Blue  |
    | Warning    | 40-59  | Orange|
    | Critical   | 0-39   | Red   |
  When I view a reputation score of 85
  Then the reputation bar should be colored green
  And the score should be labeled "Excellent"
  When I view a reputation score of 58
  Then the reputation bar should be colored orange
  And the score should be labeled "Warning"
  And a warning icon should appear next to the score
```

### Scenario 4.5: Client card visual hierarchy
```gherkin
Scenario: Client performance cards have clear visual hierarchy
  Given I am viewing client performance cards
  When a client has positive performance (>85% delivery)
  Then the card should have:
    | Element              | Style                          |
    | Border               | Green, 2px                     |
    | Background gradient  | Light green to white           |
    | Success badge        | Green with ✓ icon              |
  When a client has problematic performance (<70% delivery)
  Then the card should have:
    | Element              | Style                          |
    | Border               | Orange/Red, 2px                |
    | Background gradient  | Light orange to white          |
    | Warning badge        | Orange/Red with ⚠️ icon        |
  And paused clients should have:
    | Element              | Style                          |
    | Border               | Gray, 2px dashed               |
    | Background           | Light gray                     |
    | Opacity              | 70%                            |
    | Status badge         | Gray with ⏸ icon               |
```

### Scenario 4.6: Revenue summary with visual emphasis
```gherkin
Scenario: Revenue displays emphasize key information
  Given I am viewing the "Revenue Summary" section
  When the total revenue for the round is positive
  Then the net revenue should be displayed:
    | Element      | Style                              |
    | Font size    | 2.5rem (40px)                      |
    | Font weight  | 700 (bold)                         |
    | Color        | Blue (#1E40AF)                     |
    | Icon         | Green upward arrow ↑               |
  When the total revenue for the round is negative
  Then the net revenue should be displayed:
    | Element      | Style                              |
    | Font size    | 2.5rem (40px)                      |
    | Font weight  | 700 (bold)                         |
    | Color        | Red (#DC2626)                      |
    | Icon         | Red downward arrow ↓               |
  And revenue components should use consistent sizing hierarchy:
    | Component           | Font Size | Weight |
    | Total/Net Revenue   | 2.5rem    | 700    |
    | Major Components    | 1.5rem    | 600    |
    | Minor Details       | 1rem      | 400    |
```

### Scenario 4.7: Alert priority and grouping
```gherkin
Scenario: Alerts are displayed in order of priority
  Given I have multiple alerts of different severities
  And the alerts are:
    | Type        | Message                                    |
    | Critical    | zmail reputation in critical zone (38)    |
    | Warning     | intake reputation dropped to warning (58) |
    | Info        | DMARC providing +5 bonus                   |
    | Success     | New client tier unlocked                   |
  When I view the "Alerts & Notifications" section
  Then alerts should be displayed in this order:
    1. Critical alerts (red background)
    2. Warning alerts (orange background)
    3. Success notifications (green background)
    4. Informational messages (blue background)
  And each severity group should be visually separated
  And critical alerts should appear at the top and be most prominent
```

### Scenario 4.8: Responsive layout for different screen sizes
```gherkin
Scenario: Consequences display adapts to mobile screens
  Given I am viewing the consequences screen on a mobile device (width < 768px)
  When the screen loads
  Then sections should stack vertically instead of in a grid
  And client cards should take full width
  And font sizes should scale down appropriately:
    | Desktop Size | Mobile Size |
    | 2.5rem       | 2rem        |
    | 1.5rem       | 1.25rem     |
    | 1rem         | 0.875rem    |
  And horizontal tables should convert to card-based layouts
  And tooltips should be replaced with expandable sections on tap
```

### Scenario 4.9: Loading states during calculation
```gherkin
Scenario: Show loading state while consequences are being calculated
  Given the game is transitioning from Resolution to Consequences phase
  And consequence calculations are in progress
  When I view my screen
  Then I should see a loading overlay with:
    | Element              | Content                                      |
    | Loading spinner      | Animated spinner icon                        |
    | Message              | "Calculating round results..."               |
    | Progress indicator   | Determinate progress bar (if available)      |
  And the loading overlay should prevent interaction
  And the overlay should disappear when calculations complete
  And the consequences screen should fade in smoothly
```

### Scenario 4.10: Accessibility features
```gherkin
Scenario: Consequences screen is accessible to all players
  Given I am viewing the consequences screen
  Then all interactive elements should have proper ARIA labels
  And color-coded indicators should also have text labels (not just colors)
  And icons should have descriptive alt text
  And the screen should be navigable by keyboard:
    | Key       | Action                                |
    | Tab       | Move to next interactive element      |
    | Shift+Tab | Move to previous interactive element  |
    | Enter     | Activate button or expand details     |
    | Escape    | Close tooltips or modals              |
  And screen readers should announce:
    | Element               | Announcement Example                              |
    | Reputation change     | "zmail reputation increased from 82 to 85, up 3 points" |
    | Budget update         | "Budget increased from 1,450 to 1,650 credits"    |
    | Alert                 | "Warning: zmail reputation dropped to warning zone"|
```

### Scenario 4.11: Interactive elements for exploration
```gherkin
Scenario: Players can expand client cards for detailed breakdown
  Given I am viewing a client performance card
  And the card shows summary information
  When I click on the "View Details" button on the client card
  Then the card should expand to show additional information:
    | Additional Info              |
    | Delivery breakdown by destination |
    | Detailed reputation impact timeline |
    | Spam complaint details |
    | Bounce reason categories |
  And the expanded view should include a "Collapse" button
  And clicking "Collapse" should return to summary view
  And the expansion should be animated smoothly
```

### Scenario 4.12: Comparison with previous round
```gherkin
Scenario: Show trend indicators comparing to previous round
  Given I am in Round 3 viewing consequences
  And I have data from Round 2 for comparison
  When I view reputation scores
  Then each score should show:
    | Element              | Example                    |
    | Current Score        | 85                         |
    | Previous Score       | 82                         |
    | Change This Round    | +3 ↑                       |
    | Trend Arrow          | ↗️ (improving trend)       |
  And I should be able to toggle a "Compare to Previous Round" view
  And the comparison should highlight:
    | Metric              | Status     | Visual |
    | Improved            | Better     | Green  |
    | Declined            | Worse      | Red    |
    | Maintained          | Same       | Gray   |
```

---

## CROSS-CUTTING SCENARIOS (All Iterations)

### Scenario X.1: Network error during consequences load
```gherkin
Scenario: Handle network errors gracefully when loading consequences
  Given the game transitions to Consequences phase
  And the WebSocket connection is interrupted during data fetch
  When the client attempts to load consequences data
  Then the system should retry the request up to 3 times
  And if all retries fail, display an error message:
    """
    ⚠️ Unable to load round results
    Connection lost. Attempting to reconnect...
    """
  And provide a "Retry" button
  And when the connection is restored, automatically load the consequences
```

### Scenario X.2: Data inconsistency detection
```gherkin
Scenario: Detect and handle inconsistent consequence data
  Given the server sends consequences data
  And the data contains mathematical inconsistencies (e.g., sum doesn't match total)
  When the client validates the data
  Then the system should log an error to the console
  And display the data with a warning banner:
    """
    ⚠️ Data Verification Warning
    Some calculations may be inconsistent. Facilitator has been notified.
    """
  And send an error report to the facilitator dashboard
  And still display the data to avoid blocking the game
```

### Scenario X.3: Synchronization across team members
```gherkin
Scenario: All team members see identical consequences data
  Given I am ESP player "Alice" from team "SendWave"
  And my teammate "Bob" is also logged in
  When the consequences phase begins
  Then Alice and Bob should both see:
    | Data Element          | Alice's View | Bob's View |
    | Total Revenue         | 430          | 430        |
    | Client Performance    | Identical    | Identical  |
    | Reputation Changes    | Identical    | Identical  |
    | Budget Update         | Identical    | Identical  |
  And any discrepancy should trigger a data sync request
```

### Scenario X.4: Performance with large data sets
```gherkin
Scenario: Consequences display performs well with many data points
  Given the consequences screen contains:
    | Data Category         | Count |
    | Active Clients        | 8     |
    | Destinations          | 3     |
    | Alerts/Notifications  | 12    |
  When the screen loads
  Then the initial render should complete within 500ms
  And animations should run at 60fps
  And scrolling should be smooth without lag
  And no memory leaks should occur when navigating away
```

### Scenario X.5: Consequences data persists for review
```gherkin
Scenario: Players can review previous round consequences
  Given the game has progressed to Round 3 Planning Phase
  When I click on "View Round 2 Results" in the history panel
  Then I should see the consequences screen for Round 2
  And the screen should show historical data (not current Round 3 data)
  And I should see a header indicating "Round 2 Results (Historical)"
  And a "Return to Current Round" button should be available
```

---

## TEST DATA REQUIREMENTS

For comprehensive testing, the following test data scenarios should be prepared:

### ESP Test Data Sets
1. **Successful ESP** - All clients performing well, positive reputation growth
2. **Struggling ESP** - Multiple clients with poor performance, reputation decline
3. **Mixed Performance ESP** - Some clients excellent, some problematic
4. **New Client ESP** - Contains newly acquired clients with onboarding investments
5. **Paused Client ESP** - Contains a mix of active and paused clients

### Destination Test Data Sets
1. **Balanced Destination** - Good spam blocking with acceptable FP rate
2. **Over-Filtering Destination** - High spam blocking but excessive false positives
3. **Under-Filtering Destination** - Low false positives but too much spam delivered
4. **Coordinated Destination** - Active coordination agreements with other destinations
5. **Critical Performance Destination** - Multiple critical alerts and low satisfaction

### Edge Cases
1. **Zero Revenue Round** - All clients paused or very poor performance
2. **Perfect Round** - All metrics at maximum positive values
3. **Budget Bankruptcy** - Budget drops to zero or negative
4. **Reputation Critical** - One or more reputations below 40
5. **Data Limits** - Maximum number of clients, alerts, and data points

---

## NOTES FOR IMPLEMENTATION

### Priority Order for Iterations
1. **Iteration 1** (Critical Path): Basic structure must work for game to be playable
   - **Status:** Can implement NOW with minor fixes
   - **Effort:** 14-22 hours
   - **Blockers:** Must integrate reputation & complaint calculators from US-3.3 Iterations 3-5

2. **Iteration 2** (High Priority): ESP consequences are core to game learning objectives
   - **Status:** Partially ready after Iteration 1 fixes
   - **Effort:** 8-12 hours
   - **Blockers:** Needs filtered count calculation, per-client reputation breakdown

3. **Iteration 3** (High Priority): Destination consequences are equally important
   - **Status:** ⚠️ FULLY BLOCKED until US-3.3 Iteration 6 complete
   - **Effort:** Cannot estimate until prerequisites met
   - **Blockers:** Requires destination filtering system, user satisfaction calculation, false positive tracking

4. **Iteration 4** (Medium Priority): Enhances experience but game is functional without it
   - **Status:** Can implement incrementally as polish layer
   - **Effort:** 10-15 hours
   - **Blockers:** None (can start anytime)

### Integration Points
- **US-3.3 Iterations 1-5**: Must be fully integrated in resolution-manager.ts (currently incomplete)
- **US-3.3 Iteration 6**: Required for all Destination consequences (Iteration 3)
- **US-3.4**: Must properly track phase transitions and timing
- **US-3.6**: Must integrate with round progression logic

### Known Issues & Clarifications
1. **Terminology Standardized:**
   - Spam rate = complaint rate (same metric)
   - Credits = currency, Budget = field name
   - Filtered (ESP) = Sent - Delivered (includes spam + FP)
   - Spam Blocked (Dest) = Only correctly identified spam
   - False Positives (Dest) = Legitimate emails incorrectly blocked

2. **Data Structure Issues:**
   - ESPTeam has both `budget` and `credits` fields (needs cleanup)
   - No historical data storage for before/after comparisons
   - No per-client-per-destination reputation breakdown

3. **Missing Implementations:**
   - Resolution manager not calling reputation/complaint calculators
   - No consequences phase transition logic
   - No filtered email count calculation
   - No alert/notification system

### Technical Considerations
- Use WebSocket for real-time consequence delivery to all players simultaneously
- Implement client-side data validation to catch calculation errors
- Cache consequences data for historical review functionality
- Ensure animations don't block the UI or cause performance issues
- Consider using skeleton loaders during data fetch

### UX Priorities
1. **Clarity**: Information should be immediately understandable
2. **Hierarchy**: Most important information (revenue, reputation) should be prominent
3. **Actionability**: Alerts should guide players on what to do next
4. **Feedback**: Changes should be visually clear with animations and indicators

---

## DEFINITION OF DONE CHECKLIST

Each scenario is considered complete when:
- [ ] Gherkin scenario is implemented as automated test (Playwright/Vitest)
- [ ] UI components render correctly with test data
- [ ] WebSocket events properly trigger consequences display
- [ ] All visual elements match design specifications
- [ ] Animations perform at 60fps on target devices
- [ ] Tooltips and accessibility features work correctly
- [ ] Error states and edge cases are handled gracefully
- [ ] Data validation catches inconsistencies
- [ ] Historical review functionality works
- [ ] All team members see synchronized data
- [ ] Mobile responsive layout functions correctly
- [ ] Performance metrics meet targets (<500ms initial load)

---

