# US-2.6.1: Destination Filtering Controls
# Epic 2: Player Interfaces

Feature: Destination Filtering Controls
  As a Destination player
  I want to adjust filtering levels for different ESPs
  So that I can balance spam protection with legitimate email delivery

  Background:
    Given the game is in the Planning phase
    And I am a Destination player for "zmail"
    And the Filtering Controls modal is open

  # === VIEWING ESP FILTERING STATUS ===

  Scenario: View filtering controls with all active ESPs
    Given all 5 ESP teams are active in the game
    When I open the Filtering Controls modal
    Then I should see 5 ESP entries
    And each ESP should display complete zmail-specific metrics:
      | ESP name                    |
      | Current filtering level     |
      | Email volume last round     |
      | Reputation score            |
      | User satisfaction           |
      | Spam rate                   |

  Scenario: ESP metrics are destination-specific
    Given "BluePost" has different metrics at each destination:
      | Destination | User Satisfaction | Spam Rate| Current filtering level | Email volume last round | Reputation score |
      | zmail       | 52%               | 2.8%     | Strict                  | 54k                     | 70               |
      | intake     | 58%               | 2.2%     | Permissive              | 37k                     | 82               |
    When I am "zmail" and view "BluePost" filtering item
    Then I should see Satisfaction: 52% and Spam: 2.8%
    When I am "intake" and view "BluePost" filtering item
    Then I should see Satisfaction: 58% and Spam: 2.2%

  # === FILTERING LEVELS AND IMPACT ===

  Scenario Outline: View filter impact for each filtering level
    Given an ESP is set to "<Level>"
    When I drag the slider through all positions
    Then the title should show "<Title>"
    And spam reduction should show "<Spam Reduction>"
    And false positives (legitimate emails blocked) should show "<False Positives>"

    Examples:
      | Level      | Title                     | Spam Reduction | False Positives |
      | Permissive | Current Impact            | 0%            | 0%              |
      | Moderate   | Active Filtering Impact   | 35%           | 3%              |
      | Strict     | Active Filtering Impact   | 65%           | 8%              |
      | Maximum    | Active Filtering Impact   | 85%           | 15%             | 

  # === SLIDER INTERACTION ===

  Scenario: Slider visual feedback and gradient
    When I interact with the filtering slider
    Then the slider background should show a color gradient:
      | Permissive (green) at 0%  |
      | Moderate (blue) at 33%    |
      | Strict (orange) at 66%    |
      | Maximum (red) at 100%     |
    And the slider thumb should be white with blue border (#1E40AF)
    And the level display should show current level with appropriate color

  # === MULTIPLE ESP FILTERING ===

  Scenario: Apply different filtering levels to multiple ESPs
    Given multiple ESP teams are active
    When I set the following filtering levels:
      | ESP         | Level      |
      | SendWave    | Permissive |
      | MailMonkey  | Moderate   |
      | BluePost    | Strict     |
    Then each ESP should display its respective impact:
      | ESP         | Spam Reduction | False Positives |
      | SendWave    | 0%            | 0%              |
      | MailMonkey  | 35%           | 3%              |
      | BluePost    | 65%           | 8%              |

  # === PERSISTENCE AND ROUND BEHAVIOR ===

  Scenario: Filtering settings persist across modal sessions
    Given I set filtering levels:
      | ESP        | Level    |
      | BluePost   | Strict   |
      | MailMonkey | Moderate |
    When I close the Filtering Controls modal
    And I reopen the Filtering Controls modal
    Then "BluePost" should still be at "Strict"
    And "MailMonkey" should still be at "Moderate"
    And impact values should be preserved

  Scenario: Filtering applies during Resolution phase
    Given I set "BluePost" to "Strict" (65% spam reduction, 8% false positives)
    When the game transitions to Resolution phase
    Then the filtering should be applied to "BluePost" emails at "zmail"
    And 65% of spam should be blocked
    And 8% of legitimate emails should be incorrectly filtered
    And user satisfaction should be affected accordingly
    # TODO: Resolution phase application logic to be implemented later

  Scenario: Filtering maintains state across rounds
    Given I set filtering in Round 1:
      | ESP        | Level    |
      | SendWave   | Moderate |
      | BluePost   | Strict   |
    When Round 2 Planning phase begins
    Then the filtering levels should remain unchanged
    And I can adjust them during the new Planning phase

  # === UI STATE AND MODAL INTERACTION ===

  Scenario: Open and close Filtering Controls modal
    Given I am on the Destination dashboard
    When I click the "Filtering Controls" quick action button
    Then the Filtering Controls modal should open
    And I should see modal header containing "Filtering Controls"
    And I should see filtering items for all active ESPs
    When I click the close button "✕" or click outside the modal
    Then the modal should close
    And all filtering settings should be preserved

  # === ERROR HANDLING ===

  Scenario: Handle ESP data loading error
    Given ESP data fails to load
    When I open the Filtering Controls modal
    Then I should see error message "Unable to load ESP data"
    And I should see a retry button
    And the modal should remain functional after successful retry

  Scenario: Handle slider interaction error
    Given a slider control encounters a technical issue
    When I attempt to adjust filtering and the operation fails
    Then I should see error message "Failed to update filtering level"
    And the previous filtering level should remain unchanged
    And I can retry the adjustment
