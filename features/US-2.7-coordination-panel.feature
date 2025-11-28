# ============================================================================
# US-2.7: Coordination Panel (Destination) - Acceptance Tests
# ============================================================================

Feature: US-2.7 Coordination Panel (Destination)
  As a Destination player
  I want to coordinate with other destination players to launch joint investigations
  So that we can identify and penalize ESPs with bad practices

  Background:
    Given a game session "COORD01" exists with status "in_progress"
    And the game is in Round 2, planning phase
    And the following ESP teams exist:
      | team_name   | budget |
      | SendWave    | 1200   |
      | MailMonkey  | 1100   |
      | BluePost    | 1000   |
      | SendBolt    | 1300   |
      | RocketMail  | 1150   |
    And the following Destination players exist:
      | player_name | destination | budget |
      | Grace       | Gmail       | 500    |
      | Henry       | Outlook     | 500    |
      | Iris        | Yahoo       | 500    |

  # ============================================================================
  # SECTION 1: INVESTIGATION VOTING INTERFACE
  # ============================================================================

  Scenario: Display coordination panel with ESP targets and voting controls
    Given I am Destination player "Grace" from "Gmail"
    When I open the Coordination Panel
    Then I should see a section titled "Joint Investigation"
    And I should see all 5 ESP teams as selectable investigation targets
    And each target should show "0/3 votes"
    And I should see the cost displayed as "50 credits per voting destination (only charged if investigation triggers)"

  Scenario: Select, change, and clear investigation vote
    Given I am Destination player "Grace" from "Gmail"
    And I open the Coordination Panel
    When I select "BluePost" as my investigation target
    Then "BluePost" should show as my selected vote
    When I select "SendWave" instead
    Then "SendWave" should show as my selected vote
    And "BluePost" should no longer show my vote
    When I deselect "SendWave"
    Then I should have no active investigation vote

  Scenario: Real-time updates show other destinations' votes
    Given I am Destination player "Grace" from "Gmail"
    And I open the Coordination Panel
    When Destination player "Henry" from "Outlook" votes to investigate "BluePost"
    Then I should see "BluePost" update to "1/3 votes" in real-time
    And I should see "Outlook" listed as a voter for "BluePost"

  Scenario: Insufficient budget disables voting
    Given I am Destination player "Grace" from "Gmail"
    And I have 30 credits budget
    When I open the Coordination Panel
    Then all ESP vote buttons should be disabled
    And the buttons should display "Not enough budget"

  # ============================================================================
  # SECTION 2: INVESTIGATION TRIGGER LOGIC
  # ============================================================================

  Scenario Outline: Investigation trigger based on vote distribution
    Given the following investigation votes are locked in:
      | destination | target   |
      | Gmail       | <gmail>  |
      | Outlook     | <outlook>|
      | Yahoo       | <yahoo>  |
    When the planning phase ends and resolution begins
    Then investigation launched should be "<triggered>"
    And credits charged should be "<charged>"

    Examples:
      | gmail    | outlook  | yahoo    | triggered | charged                    |
      | BluePost | BluePost | (none)   | yes       | Gmail: 50, Outlook: 50     |
      | BluePost | BluePost | BluePost | yes       | Gmail: 50, Outlook: 50, Yahoo: 50 |
      | BluePost | (none)   | (none)   | no        | none                       |
      | BluePost | SendWave | (none)   | no        | none                       |
      | BluePost | SendWave | MailMonkey | no      | none                       |

  # ============================================================================
  # SECTION 3: INVESTIGATION RESOLUTION
  # ============================================================================

  Scenario Outline: Investigation detects violation based on risk level and protections
    Given "BluePost" has the following client:
      | client_name | risk_level   | has_warmup   | has_list_hygiene   | spam_rate | status |
      | Test Client | <risk_level> | <has_warmup> | <has_list_hygiene> | 2.0       | active |
    And an investigation is launched against "BluePost"
    When the investigation resolution runs
    Then suspension should be "<suspended>"

    Examples:
      | risk_level | has_warmup | has_list_hygiene | suspended |
      | high       | false      | true             | yes       |
      | high       | true       | false            | yes       |
      | high       | false      | false            | yes       |
      | high       | true       | true             | no        |
      | medium     | false      | false            | no        |
      | low        | false      | false            | no        |

  Scenario: Multiple violations - highest spam rate client is suspended
    Given "BluePost" has the following clients:
      | client_name   | risk_level | has_warmup | has_list_hygiene | spam_rate | status |
      | Bad Actor     | high       | false      | true             | 2.0       | active |
      | Worse Actor   | high       | true       | false            | 3.5       | active |
      | Worst Actor   | high       | false      | false            | 5.0       | active |
    And an investigation is launched against "BluePost"
    When the investigation resolution runs
    Then only "Worst Actor" should be suspended

  Scenario: Paused and already-suspended clients are not investigated
    Given "BluePost" has the following clients:
      | client_name      | risk_level | has_warmup | has_list_hygiene | spam_rate | status    |
      | Paused Risky     | high       | false      | false            | 5.0       | paused    |
      | Already Suspended| high       | false      | false            | 4.0       | suspended |
      | Active Safe      | high       | true       | true             | 1.0       | active    |
    And an investigation is launched against "BluePost"
    When the investigation resolution runs
    Then no clients should be suspended
    And the investigation result should be "No violations detected"

  Scenario: Spam rate tie results in random selection
    Given "BluePost" has the following clients:
      | client_name | risk_level | has_warmup | has_list_hygiene | spam_rate | status |
      | Bad Actor A | high       | false      | true             | 3.0       | active |
      | Bad Actor B | high       | true       | false            | 3.0       | active |
    And an investigation is launched against "BluePost"
    When the investigation resolution runs
    Then exactly one of "Bad Actor A" or "Bad Actor B" should be suspended (random)

  Scenario: Investigation against ESP with empty portfolio
    Given "BluePost" has no clients
    And an investigation is launched against "BluePost"
    When the investigation resolution runs
    Then no clients should be suspended
    And the investigation result should be "No violations detected"

  # ============================================================================
  # SECTION 4: SUSPENSION PERMANENCE
  # ============================================================================

  Scenario: Suspended client cannot be reactivated and persists across rounds
    Given "BluePost" has client "Risky Marketer" suspended in Round 2
    When Round 3 begins
    Then "Risky Marketer" should still have status "suspended"
    When "BluePost" attempts to change "Risky Marketer" status to "active"
    Then the status change should be rejected
    And an error message should indicate "Suspended clients cannot be reactivated"

  # ============================================================================
  # SECTION 5: INVESTIGATION RESULTS DISPLAY
  # ============================================================================

  Scenario: All destinations see investigation results with violation
    Given an investigation against "BluePost" suspended "Risky Marketer" (high risk, missing warm-up)
    When the consequence phase begins
    Then all Destination players should see in their consequence dashboard:
      | field            | value                |
      | Investigation    | BluePost             |
      | Result           | Bad practices found  |
      | Suspended Client | Risky Marketer       |
      | Risk Level       | High                 |
      | Onboarding       | Missing warm-up      |
    And this includes "Yahoo" who did not vote for the investigation

  Scenario: All destinations see investigation results with no violation
    Given an investigation against "SendBolt" found no violations
    When the consequence phase begins
    Then all Destination players should see:
      """
      Investigation: SendBolt
      Result: No bad practices detected - appears compliant
      """

  # ============================================================================
  # SECTION 6: ESP CONSEQUENCE DASHBOARD IMPACT
  # ============================================================================

  Scenario: Investigated ESP sees results in consequence dashboard
    Given an investigation was launched against "BluePost" by 2 destinations
    And the investigation suspended client "Risky Marketer"
    When the consequence phase begins
    And I am ESP player from "BluePost"
    Then in my "Client Performance" section I should see in red:
      """
      Investigation launched against you by 2 destinations
      Risky Marketer has been suspended due to bad practices
      """
    And in my client list "Risky Marketer" should appear locked and grayed out with status "suspended"

  Scenario: ESP not under investigation sees no investigation message
    Given an investigation was launched against "BluePost"
    When the consequence phase begins
    And I am ESP player from "SendWave"
    Then I should not see any investigation-related messages

  # ============================================================================
  # SECTION 7: INVESTIGATION HISTORY
  # ============================================================================

  Scenario: Investigation history tracks all investigations
    Given the following investigations occurred:
      | round | target   | result                  | voters         |
      | 2     | BluePost | Suspended: Risky Marketer | Gmail, Outlook |
      | 3     | SendBolt | No violations found     | Gmail, Yahoo   |
    When I view the investigation history in the Coordination Panel
    Then I should see both investigations in reverse chronological order
    And each entry should show round, target, result, and voters

  Scenario: Votes reset at start of each planning phase
    Given in Round 2 I voted to investigate "BluePost" but it was not triggered (only 1 vote)
    When Round 3 planning phase begins
    And I open the Coordination Panel
    Then I should have no active vote
    And all ESP targets should show "0/3 votes"

  # ============================================================================
  # SECTION 8: BUDGET RESERVATION
  # ============================================================================

  Scenario: Display budget reservation for investigation vote
    Given I am Destination player "Grace" from "Gmail"
    And I have 500 credits budget
    When I vote to investigate "BluePost"
    Then I should see my budget display as "450 available (50 reserved)"
    And the reservation display should match ESP onboarding pattern

  Scenario: Vote automatically removed if budget insufficient at lock-in
    Given I am Destination player "Grace" from "Gmail"
    And I have 100 credits budget
    And I vote to investigate "BluePost" (reserved: 50 credits)
    And I purchase tools totaling 80 credits
    When I attempt to lock in my decisions
    Then my investigation vote should be automatically removed
    And I should see notification "Investigation vote removed - insufficient budget"
    And lock-in should proceed with tool purchases only

  # ============================================================================
  # SECTION 9: PHASE RESTRICTIONS AND EDGE CASES
  # ============================================================================

  Scenario: Voting only available before lock-in during planning phase
    Given the game is in planning phase
    And Destination player "Grace" from "Gmail" has locked-in their decisions
    When Destination player "Grace" from "Gmail" opens the Coordination Panel
    Then the voting controls should be disabled