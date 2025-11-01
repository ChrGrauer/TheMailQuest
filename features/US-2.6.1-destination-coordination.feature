# US-2.6.1: Destination Tech Shop
# Epic 2: Destination Interfaces

Feature: Destination Coordination Panel
  As a Destination player
  I want to coordinate with other Destination players
  So that we can share intelligence and pool resources to better manage ESP behavior

  Background:
    Given the game is in the Planning phase
    And I am a Destination player for "Gmail"
    And the Coordination Panel modal is open

  # === SHARED BUDGET POOL ===

  Scenario: View shared budget pool information when no collaboration is active
    Given no collaborations are active
    When I view the Shared Budget Pool section
    Then I should see the Total Pool amount as "0"
    And I should see my Contribution as "0"
    And I should see Available to Use as "0"

  Scenario: View shared budget pool information with active collaboration
    Given a collaboration is active between "Gmail" and "Outlook"
    And "Gmail" has contributed "150" credits
    And "Outlook" has contributed "300" credits
    When I view the Shared Budget Pool section
    Then I should see the Total Pool amount as "450"
    And I should see my Contribution as "150"
    And I should see Available to Use as "450"

  Scenario: Shared budget pool updates when new collaboration is activated
    Given a collaboration is active between "Gmail" and "Outlook"
    And the shared budget pool total is "450"
    When "Yahoo" joins the collaboration with "250" credits
    Then the Total Pool amount should update to "700"
    And the Available to Use amount should update to "700"

  # === VIEWING COLLABORATION OPTIONS ===

  Scenario: View available collaboration agreements
    Given no collaborations are active
    When I view the Collaboration Agreements section
    Then I should see collaboration option "Gmail ↔ Outlook" with status "Available"
    And I should see collaboration option "Gmail ↔ Yahoo" with status "Available"
    And I should see collaboration option "Outlook ↔ Yahoo" with status "Available"

  Scenario: View collaboration option details
    When I view the "Gmail ↔ Outlook" collaboration option
    Then I should see the description "Share real-time intelligence about ESP behavior patterns, reputation changes, and emerging threats. Coordinate filtering strategies for problematic ESPs."
    And I should see benefit "Intelligence Sharing" with value "Medium Level"
    And I should see benefit "Coordination Cost" with value "-50 cr/round"
    And I should see benefit "Effectiveness Bonus" with value "+15%"
    And I should see benefit "Shared Budget Access" with value "450 credits"

  Scenario: View three-way collaboration option details
    When I view the "Gmail ↔ Yahoo" collaboration option after "Gmail ↔ Outlook" is active
    Then I should see the description "Extend intelligence sharing to Yahoo. Creates a three-way coordination network for comprehensive ESP monitoring and unified response strategies."
    And I should see benefit "Intelligence Sharing" with value "High Level"
    And I should see benefit "Coordination Cost" with value "-75 cr/round"
    And I should see benefit "Effectiveness Bonus" with value "+25%"
    And I should see benefit "Shared Budget Access" with value "700+ credits"

  # === ACTIVATING COLLABORATIONS ===

  Scenario: Activate a two-way collaboration
    Given no collaborations are active
    And my budget is "800" credits
    When I click "Activate Collaboration" on the "Gmail ↔ Outlook" option
    Then the collaboration "Gmail ↔ Outlook" should be marked as "Active"
    And my budget should be reduced by "150" credits for contribution
    And the shared budget pool should show "150" for my contribution
    And I should see an "Deactivate Collaboration" button

  Scenario: Cannot activate collaboration with insufficient budget
    Given no collaborations are active
    And my budget is "100" credits
    When I attempt to activate the "Gmail ↔ Outlook" collaboration
    Then I should see an error message "Insufficient budget for collaboration contribution"
    And the collaboration should remain inactive

  Scenario: Activate three-way collaboration
    Given a collaboration is active between "Gmail" and "Outlook"
    And "Yahoo" player has sufficient budget
    When the "Yahoo" player activates collaboration
    Then the collaboration network should include "Gmail", "Outlook", and "Yahoo"
    And the shared budget pool should increase accordingly
    And the Intelligence Sharing level should upgrade to "High Level"
    And the Effectiveness Bonus should increase to "+25%"

  Scenario: Collaboration requires mutual agreement from both destinations
    Given I am "Gmail" player
    When I click "Activate Collaboration" on "Gmail ↔ Outlook"
    Then the collaboration should be pending activation
    And the "Outlook" player should receive a collaboration request notification
    And the collaboration becomes active only after both players agree
    And both players must contribute to the shared budget pool

  Scenario: View collaboration that requires third-party agreement
    Given "Gmail" is viewing the Coordination Panel
    And neither "Outlook" nor "Yahoo" are in an active collaboration
    When I view the "Outlook ↔ Yahoo" collaboration option
    Then the "Activate Collaboration" button should be disabled
    And I should see the text "Requires Outlook & Yahoo Agreement"
    And I should not be able to activate this collaboration

  # === DEACTIVATING COLLABORATIONS ===

  Scenario: Deactivate an active collaboration
    Given a collaboration is active between "Gmail" and "Outlook"
    And the shared budget pool is "450" credits
    When I click "Deactivate Collaboration"
    Then I should receive a confirmation prompt
    And after confirmation, the collaboration status should change to "Available"
    And my contributed budget should be returned to my main budget
    And the shared budget pool should be dissolved

  Scenario: Deactivation affects all participating destinations
    Given a three-way collaboration is active between "Gmail", "Outlook", and "Yahoo"
    When any destination deactivates the collaboration
    Then all destinations should receive notification of deactivation
    And all contributed budgets should be returned
    And the shared budget pool should be dissolved
    And all collaboration benefits should be removed

  # === COORDINATION COST MANAGEMENT ===

  Scenario: Coordination cost deducted at round end
    Given a collaboration is active between "Gmail" and "Outlook"
    And the coordination cost is "50 cr/round"
    And the game transitions to Resolution phase
    When the round completes
    Then "50" credits should be deducted from the shared budget pool
    And if shared budget is insufficient, cost is split from individual budgets

  Scenario: Shared budget pool insufficient for coordination cost
    Given a collaboration is active
    And the shared budget pool has "20" credits
    And the coordination cost is "50 cr/round"
    When the round completes
    Then the remaining "30" credits should be split equally between participating destinations
    And each destination should be notified of individual cost deduction

  # === INTELLIGENCE SHARING LEVELS ===

  Scenario: Medium level intelligence sharing provides ESP insights
    Given a two-way collaboration is active
    And Intelligence Sharing is "Medium Level"
    When I view an ESP's statistics
    Then I should see shared filtering decisions from partner destination
    And I should see reputation change trends from partner's perspective
    And I should receive alerts about problematic ESP behavior identified by partner

  Scenario: High level intelligence sharing in three-way collaboration
    Given a three-way collaboration is active
    And Intelligence Sharing is "High Level"
    When I view an ESP's statistics
    Then I should see comprehensive filtering data from all partner destinations
    And I should see coordinated filtering recommendations
    And I should see predictive alerts about emerging threats
    And I should access detailed ESP behavior patterns across all destinations

  # === EFFECTIVENESS BONUS ===

  Scenario: Apply effectiveness bonus to filtering actions
    Given a collaboration is active
    And the Effectiveness Bonus is "+15%"
    When I apply filtering to an ESP
    Then the filtering effectiveness should be increased by 15%
    And spam reduction should be higher than without collaboration
    And the false positive rate should be lower than without collaboration

  Scenario: Increased effectiveness bonus with three-way collaboration
    Given a three-way collaboration is active
    And the Effectiveness Bonus is "+25%"
    When coordinated filtering is applied to problematic ESPs
    Then the filtering effectiveness should be increased by 25%
    And coordinated actions should show significantly better results

  # === SHARED BUDGET USAGE ===

  Scenario: Use shared budget for coordinated actions
    Given a collaboration is active
    And the shared budget pool has "450" credits
    When I need to fund an action using "100" credits
    Then I should have the option to use shared budget
    Or I can use my individual budget
    And any destination in the collaboration can access the shared pool

  Scenario: Shared budget tracks contributions and usage
    Given a collaboration is active
    And "Gmail" contributed "150" credits
    And "Outlook" contributed "300" credits
    When "Gmail" uses "80" credits from shared pool
    Then the shared pool should decrease to "370" credits
    And usage should be tracked by destination
    And remaining pool should still be accessible to all collaborators

  # === UI STATE MANAGEMENT ===

  Scenario: Active collaboration displays with distinct styling
    Given a collaboration is active between "Gmail" and "Outlook"
    When I view the Collaboration Agreements section
    Then the "Gmail ↔ Outlook" item should have an "active" visual state
    And it should have a border-color of "#3B82F6"
    And the background should be a gradient from "#DBEAFE" to "#EFF6FF"
    And the status badge should show "✓ Active" with green styling

  Scenario: Available collaboration displays with default styling
    Given no collaboration is active for "Gmail ↔ Yahoo"
    When I view the Collaboration Agreements section
    Then the "Gmail ↔ Yahoo" item should have default styling
    And the border-color should be "#E5E7EB"
    And the status badge should show "Available" with gray styling

  Scenario: Disabled collaboration displays inactive state
    Given neither "Outlook" nor "Yahoo" are in collaboration
    When I view the "Outlook ↔ Yahoo" collaboration option
    Then the "Activate Collaboration" button should be visually disabled
    And the button should display "Requires Outlook & Yahoo Agreement"
    And hover effects should be disabled

  # === MODAL INTERACTION ===

  Scenario: Open coordination panel modal
    Given I am on the Destination dashboard
    When I click the "Coordination Panel" quick action button
    Then the Coordination Panel modal should open
    And I should see the modal header "🤝 Inter-Destination Coordination"
    And I should see the Shared Budget Pool section
    And I should see the Collaboration Agreements section

  Scenario: Close coordination panel modal
    Given the Coordination Panel modal is open
    When I click the close button "✕"
    Then the modal should close
    And I should return to the Destination dashboard

  Scenario: Close modal by clicking backdrop
    Given the Coordination Panel modal is open
    When I click outside the modal content on the backdrop
    Then the modal should close

  # === DASHBOARD STATUS CARD INTEGRATION ===

  Scenario: View coordination status on main dashboard
    Given a collaboration is active between "Gmail" and "Outlook"
    When I view the main dashboard
    Then the Coordination card should show "Active Collaborations: 1"
    And it should show "Shared Budget Pool: 450"
    And it should show "Intelligence Level: Medium"
    And it should display "Gmail ↔ Outlook intelligence sharing"

  Scenario: Dashboard reflects no active collaborations
    Given no collaborations are active
    When I view the main dashboard
    Then the Coordination card should show "Active Collaborations: 0"
    And it should show "Shared Budget Pool: 0"
    And it should show "Intelligence Level: None"

  Scenario: Quick action badge shows active collaboration count
    Given a collaboration is active between "Gmail" and "Outlook"
    When I view the Coordination Panel quick action button
    Then the badge should display "1 active"

  # === CROSS-DESTINATION SYNCHRONIZATION ===

  Scenario: Collaboration state synchronized across destinations in real-time
    Given "Gmail" and "Outlook" are both online
    When "Gmail" activates a collaboration
    Then "Outlook" should immediately see the collaboration request
    And both players should see synchronized collaboration state

  Scenario: Shared budget updates synchronized in real-time
    Given an active collaboration with shared budget
    When one destination uses shared budget credits
    Then all collaborating destinations should see the updated pool amount immediately

  # === ERROR HANDLING ===

  Scenario: Handle network error during collaboration activation
    Given network connection is unstable
    When I attempt to activate a collaboration
    And the request fails
    Then I should see an error message "Failed to activate collaboration. Please try again."
    And the collaboration should remain inactive
    And my budget should not be deducted

  Scenario: Handle invalid collaboration state
    Given a collaboration appears active in my UI
    But the server state shows inactive
    When I open the Coordination Panel
    Then the system should reconcile the state
    And display the correct server state
    And notify me if synchronization occurred

  # === ROUND TRANSITION EFFECTS ===

  Scenario: Coordination benefits apply during Resolution phase
    Given a collaboration is active
    And both destinations have applied coordinated filtering
    When the game transitions to Resolution phase
    Then the Effectiveness Bonus should be applied to filtering outcomes
    And shared intelligence should enhance reputation calculations
    And coordination costs should be deducted from shared pool

  Scenario: New collaboration activated mid-round takes effect next round
    Given it is Round 2 Planning phase
    When I activate a collaboration
    Then the collaboration should be marked active immediately
    And benefits should take effect starting in Round 3
    And costs should begin in Round 3
