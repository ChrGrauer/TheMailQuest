Feature: Destination Filtering Controls
  As a Destination player
  I want to adjust filtering levels for different ESPs
  So that I can balance spam protection with legitimate email delivery

  Background:
    Given the game is in the Planning phase
    And I am a Destination player for "Gmail"
    And the Filtering Controls modal is open

  # === VIEWING ESP FILTERING STATUS ===

  Scenario: View all ESPs with their current filtering levels
    When I open the Filtering Controls modal
    Then I should see 5 ESP entries
    And each ESP should display:
      | ESP name |
      | Current filtering level |
      | Email volume per round |
      | Reputation score |
      | Number of active clients |

  Scenario: View ESP with no filtering applied
    Given "SendWave" has filtering level "Permissive"
    When I view the "SendWave" filtering item
    Then the filtering level should display "Permissive"
    And the item should not have the "filtering-active" visual state
    And the spam reduction should show "0%"
    And the legitimate emails blocked should show "0%"

  Scenario: View ESP with active filtering
    Given "BluePost" has filtering level "Strict"
    When I view the "BluePost" filtering item
    Then the filtering level should display "Strict"
    And the item should have the "filtering-active" visual state
    And the border color should be "#EF4444" (red)
    And the background should be a gradient from "#FEE2E2" to "#FEF2F2"

  Scenario: View ESP statistics in filtering item
    Given "MailMonkey" has the following stats:
      | Email volume | 142K emails/round |
      | Reputation   | 65                |
      | Clients      | 3 active clients  |
    When I view the "MailMonkey" filtering item
    Then I should see "142K emails/round • Reputation: 65 • 3 clients"

  # === ADJUSTING FILTERING LEVELS WITH SLIDER ===

  Scenario: Adjust filtering level using slider
    Given "SendWave" is at filtering level "Permissive" (value 0)
    When I drag the slider to position 2
    Then the filtering level should update to "Strict"
    And the level display should show "Strict" in orange color (#D97706)

  Scenario: Filtering level options on slider
    When I interact with the filtering slider
    Then I should see 4 level options:
      | Position | Level      | Color        |
      | 0        | Permissive | Green        |
      | 1        | Moderate   | Blue         |
      | 2        | Strict     | Orange       |
      | 3        | Maximum    | Red          |

  Scenario: Slider visual feedback
    When I adjust the slider
    Then the slider background should show a gradient:
      | From Permissive (green) at 0%  |
      | To Moderate (blue) at 33%      |
      | To Strict (orange) at 66%      |
      | To Maximum (red) at 100%       |

  Scenario: Change from Permissive to Moderate filtering
    Given "RocketMail" is at "Permissive" level
    When I move the slider to position 1
    Then the filtering level should change to "Moderate"
    And the level display should show "Moderate" in blue color (#2563EB)
    And the filter impact section should activate
    And spam reduction should show "-35%"
    And legitimate emails blocked should show "3%"

  Scenario: Change from Moderate to Strict filtering
    Given "MailMonkey" is at "Moderate" level
    When I move the slider to position 2
    Then the filtering level should change to "Strict"
    And the level display should show "Strict" in orange color (#D97706)
    And spam reduction should show "-65%"
    And legitimate emails blocked should show "8%"

  Scenario: Change from Strict to Maximum filtering
    Given "BluePost" is at "Strict" level
    When I move the slider to position 3
    Then the filtering level should change to "Maximum"
    And the level display should show "Maximum" in red color (#DC2626)
    And spam reduction should show "-85%"
    And legitimate emails blocked should show "15%"

  Scenario: Reset filtering to Permissive level
    Given "BluePost" is at "Strict" level with active filtering
    When I move the slider back to position 0
    Then the filtering level should change to "Permissive"
    And the "filtering-active" visual state should be removed
    And the filter impact section should show "Current Impact"
    And spam reduction should show "0%"
    And legitimate emails blocked should show "0%"

  # === FILTER IMPACT CALCULATION ===

  Scenario: View impact for Permissive filtering
    Given an ESP is set to "Permissive"
    When I view the filter impact section
    Then it should have the "no-filter" class
    And the border color should be green (#10B981)
    And the title should show "Current Impact"
    And spam reduction should be "0%"
    And legitimate emails blocked should be "0%"

  Scenario: View impact for Moderate filtering
    Given an ESP is set to "Moderate"
    When I view the filter impact section
    Then it should not have the "no-filter" class
    And the border color should be red (#EF4444)
    And the title should show "Active Filtering Impact"
    And spam reduction should be "-35%" in positive green color
    And legitimate emails blocked should be "3%" in negative red color

  Scenario: View impact for Strict filtering
    Given an ESP is set to "Strict"
    When I view the filter impact section
    Then the title should show "Active Filtering Impact"
    And spam reduction should be "-65%" in positive green color
    And legitimate emails blocked should be "8%" in negative red color

  Scenario: View impact for Maximum filtering
    Given an ESP is set to "Maximum"
    When I view the filter impact section
    Then the title should show "Active Filtering Impact"
    And spam reduction should be "-85%" in positive green color
    And legitimate emails blocked should be "15%" in negative red color

  # === MULTIPLE ESP FILTERING ===

  Scenario: Apply different filtering levels to multiple ESPs
    When I set "SendWave" to "Permissive"
    And I set "MailMonkey" to "Moderate"
    And I set "BluePost" to "Strict"
    And I set "SendBolt" to "Permissive"
    And I set "RocketMail" to "Permissive"
    Then "SendWave" should show no active filtering
    And "MailMonkey" should show active filtering with moderate impact
    And "BluePost" should show active filtering with strict impact
    And "SendBolt" should show no active filtering
    And "RocketMail" should show no active filtering

  Scenario: Track number of ESPs with active filtering
    Given I have set filtering levels as:
      | ESP         | Level      |
      | SendWave    | Permissive |
      | MailMonkey  | Moderate   |
      | BluePost    | Strict     |
      | SendBolt    | Permissive |
      | RocketMail  | Permissive |
    When I view the dashboard quick action badge
    Then it should display "2 active filters"

  # === FILTERING DECISIONS PERSIST ===

  Scenario: Filtering settings persist when closing modal
    Given I set "BluePost" to "Strict"
    And I set "MailMonkey" to "Moderate"
    When I close the Filtering Controls modal
    And I reopen the Filtering Controls modal
    Then "BluePost" should still be at "Strict"
    And "MailMonkey" should still be at "Moderate"

  Scenario: Filtering settings apply in Resolution phase
    Given I set "BluePost" to "Strict" during Planning phase
    When the game transitions to Resolution phase
    Then the filtering should be applied to "BluePost" emails
    And spam reduction of 65% should take effect
    And 8% of legitimate emails should be filtered

  # === REPUTATION-BASED FILTERING STRATEGY ===

  Scenario: Filter high-reputation ESP minimally
    Given "SendBolt" has reputation score "88"
    When I view filtering recommendations
    Then "Permissive" should be the suggested level
    And I should see low risk of spam from this ESP

  Scenario: Filter low-reputation ESP aggressively
    Given "BluePost" has reputation score "52"
    When I view filtering recommendations
    Then "Strict" or "Maximum" should be suggested
    And I should see high spam risk from this ESP

  Scenario: Filter medium-reputation ESP moderately
    Given "MailMonkey" has reputation score "65"
    When I view filtering recommendations
    Then "Moderate" should be suggested
    And I should see medium spam risk from this ESP

  # === UI STATE MANAGEMENT ===

  Scenario: ESP with Permissive filtering displays default state
    Given "SendWave" is at "Permissive" level
    When I view the ESP filtering item
    Then it should have default border color "#E5E7EB"
    And background should be "#F9FAFB"
    And the filter impact section should have green border

  Scenario: ESP with active filtering displays alert state
    Given "BluePost" is at "Strict" level
    When I view the ESP filtering item
    Then it should have the "filtering-active" class
    And border color should be "#EF4444" (red)
    And background should have red gradient
    And the filter impact section should have red border

  Scenario: Slider thumb visual feedback
    When I interact with the filtering slider
    Then the thumb should be white with blue border (#1E40AF)
    And it should have a shadow for depth
    And it should move smoothly along the gradient background

  # === MODAL INTERACTION ===

  Scenario: Open Filtering Controls modal
    Given I am on the Destination dashboard
    When I click the "Filtering Controls" quick action button
    Then the Filtering Controls modal should open
    And I should see the modal header "🛡️ Filtering Controls"
    And I should see all 5 ESP filtering items

  Scenario: Close Filtering Controls modal with close button
    Given the Filtering Controls modal is open
    When I click the close button "✕"
    Then the modal should close
    And any unsaved changes should be preserved
    And I should return to the Destination dashboard

  Scenario: Close modal by clicking backdrop
    Given the Filtering Controls modal is open
    When I click outside the modal content on the backdrop
    Then the modal should close
    And filtering settings should be preserved

  # === DASHBOARD INTEGRATION ===

  Scenario: Quick action badge shows active filter count
    Given I have set the following filtering levels:
      | ESP        | Level    |
      | BluePost   | Strict   |
      | MailMonkey | Moderate |
    When I view the "Filtering Controls" quick action button
    Then the badge should display "2 active filters"

  Scenario: Quick action badge updates when filtering changes
    Given the badge shows "2 active filters"
    When I change "MailMonkey" from "Moderate" to "Permissive"
    And I close the modal
    Then the badge should update to "1 active filter"

  Scenario: Quick action badge shows zero when no filtering
    Given all ESPs are at "Permissive" level
    When I view the "Filtering Controls" quick action button
    Then the badge should display "0 active filters"

  # === REAL-TIME IMPACT PREVIEW ===

  Scenario: Preview filtering impact while dragging slider
    Given "BluePost" is at "Permissive"
    When I start dragging the slider
    And I hover over position 2 (Strict)
    Then the impact section should show preview values:
      | Spam reduction              | -65% |
      | Legitimate emails blocked   | 8%   |
    But the changes should not be committed until I release

  Scenario: Real-time level display updates while sliding
    Given "SendWave" is at "Permissive"
    When I drag the slider continuously from position 0 to 3
    Then the level display should update in real-time:
      | Permissive → Moderate → Strict → Maximum |

  # === COST CONSIDERATIONS ===

  Scenario: Filtering has no direct cost
    Given my budget is "800" credits
    When I set any ESP to any filtering level
    Then my budget should remain "800" credits
    And no deduction message should appear

  Scenario: Filtering cost is in trade-offs, not credits
    When I set "BluePost" to "Maximum"
    Then I should understand the trade-off:
      | Benefit: 85% spam reduction       |
      | Cost: 15% legitimate email blocks |
    But no credit cost should apply

  # === ERROR HANDLING ===

  Scenario: Handle ESP data loading error
    Given ESP data fails to load
    When I open the Filtering Controls modal
    Then I should see an error message "Unable to load ESP data"
    And I should see a retry button
    And the modal should remain functional after retry

  Scenario: Handle slider interaction error
    Given the slider control has a technical issue
    When I attempt to adjust filtering
    And the operation fails
    Then I should see an error message "Failed to update filtering level"
    And the previous filtering level should remain unchanged

  # === ROUND TRANSITION BEHAVIOR ===

  Scenario: Filtering settings locked during Resolution phase
    Given the game is in Resolution phase
    And I have filtering controls open
    When I attempt to adjust any slider
    Then the slider should be disabled
    And I should see a message "Filtering adjustments locked during Resolution"

  Scenario: Filtering settings editable during Planning phase
    Given the game is in Planning phase
    When I open the Filtering Controls modal
    Then all sliders should be enabled
    And I should be able to adjust any ESP filtering level

  Scenario: New filtering takes effect in next round
    Given it is Round 2 Planning phase
    And "BluePost" is currently at "Permissive"
    When I change "BluePost" to "Strict"
    And I lock in my decisions
    Then the filtering should take effect during Round 2 Resolution
    And should continue in subsequent rounds unless changed
