# US-3.2: Decision Lock-In
# Epic 3: Game Flow & Phases

Feature: Decision Lock-In
  As a player
  I want to lock in my decisions
  So that I can confirm my choices and wait for resolution

  Background:
    Given a game session is active with 5 ESP teams and 3 Destinations
    And the Planning Phase is running with 5 minutes remaining
    And teams have made various decisions
    # Note: "Pending decisions" refers to uncommitted onboarding options (warm-up, list hygiene)
    # Client acquisitions and tech purchases are committed immediately upon purchase

  # ============================================================================
  # SECTION 1: SUCCESSFUL LOCK-IN
  # ============================================================================

  Scenario: ESP team successfully locks in valid decisions
    Given "SendWave" team has valid decisions:
      | decision_type    | details                          | cost |
      | acquire_client   | Premium Brand Co.                | 200  |
      | buy_tech         | DMARC Policy                     | 300  |
    And "SendWave" has budget of 1450 credits
    And "SendWave" decisions total 500 credits
    When "SendWave" clicks the "Lock In" button
    Then "SendWave" decisions should be marked as locked
    And "SendWave" dashboard should become read-only
    And "SendWave" should see "Locked In ✓" confirmation
    And "SendWave" should see "Waiting for others..." message
    And game state should show "SendWave" as locked

  Scenario: Destination successfully locks in filtering decisions
    Given "zmail" has set filtering levels:
      | esp        | filter_level |
      | BluePost   | Strict       |
      | MailMonkey | Moderate     |
    And "zmail" has budget of 800 credits
    When "zmail" clicks the "Lock In" button
    Then "zmail" decisions should be marked as locked
    And "zmail" dashboard should become read-only
    And "zmail" should see "Locked In ✓" confirmation
    And game state should show "zmail" as locked

  # ============================================================================
  # SECTION 2: LOCK-IN BUTTON STATE
  # ============================================================================

  Scenario: Lock-in button is disabled when pending onboarding options exceed budget
    Given "SendWave" has budget of 1450 credits
    And "SendWave" has acquired clients and tech totaling 1300 credits
    And "SendWave" has selected pending onboarding options:
      | client              | warm_up | list_hygiene |
      | Client A            | Yes     | Yes          |
      | Client B            | No      | Yes          |
    And pending onboarding costs are 310 credits (150 + 80 + 80)
    And total would be 1610 credits (exceeding budget by 160)
    Then "SendWave" should see "Lock In" button as disabled on main dashboard
    And "SendWave" should see "Lock In" button as disabled on Portfolio Management modal
    And "SendWave" should see budget warning "Budget exceeded by 160 credits"
    When "SendWave" removes warm-up from Client A (150 credits)
    Then total becomes 1460 credits (still over by 10)
    When "SendWave" removes list hygiene from Client B (80 credits)
    Then "SendWave" should see "Lock In" button as enabled

  Scenario: Lock-in button is enabled when budget is within limits
    Given "SendWave" has budget of 1450 credits
    And "SendWave" has decisions totaling 500 credits
    Then "SendWave" should see "Lock In" button as enabled

  # ============================================================================
  # SECTION 3: EARLY LOCK-IN WAITING
  # ============================================================================

  Scenario: First player to lock in sees waiting state
    Given "SendWave" has locked in their decisions
    And 7 other players have not locked in yet
    Then "SendWave" should see "Waiting for others..." message
    And "SendWave" should see "7 players remaining"
    And "SendWave" dashboard should remain read-only

  Scenario: Waiting count updates as more players lock in
    Given "SendWave" has locked in and sees "7 players remaining"
    When "BluePost" locks in their decisions
    Then "SendWave" should see "6 players remaining"
    When "zmail" locks in their decisions
    Then "SendWave" should see "5 players remaining"

  # ============================================================================
  # SECTION 4: AUTO-LOCK AT TIMER EXPIRY
  # ============================================================================

  Scenario: Warning displayed at 15 seconds remaining
    Given Planning Phase timer shows 15 seconds remaining
    And 3 players have not locked in yet
    When timer reaches exactly 15 seconds
    Then all players should see warning message "Decisions will be automatically locked in 15 seconds"
    And warning should persist until timer expires
    # Note: This system message is in addition to visual timer color changes (orange at 60s, red at 30s)

  Scenario: Valid decisions auto-locked when timer reaches zero
    Given Planning Phase timer reaches 0 seconds
    And "SendWave" has not locked in
    And "SendWave" has valid decisions totaling 500 credits with budget 1450
    When timer expires
    Then "SendWave" decisions should be auto-locked as-is
    And "SendWave" should see "Time's up! Decisions locked automatically"

  Scenario: Invalid decisions are corrected during auto-lock (onboarding options exceed budget)
    Given Planning Phase timer reaches 0 seconds
    And "BluePost" has not locked in
    And "BluePost" has budget of 1000 credits
    And "BluePost" has acquired clients (committed):
      | client_name          | acquisition_cost |
      | Premium Brand Co.    | 200              |
      | Growing Startup      | 150              |
    And "BluePost" has purchased tech (committed):
      | tech_name            | cost |
      | DMARC Policy         | 300  |
      | DKIM Signature       | 40   |
    And committed costs total 690 credits (350 clients + 340 tech)
    And "BluePost" has selected pending onboarding options:
      | client_name          | warm_up | list_hygiene | onboarding_cost |
      | Premium Brand Co.    | Yes     | Yes          | 230             |
      | Growing Startup      | Yes     | Yes          | 230             |
      | Client C             | Yes     | No           | 150             |
    And pending onboarding costs total 610 credits (150+80 + 150+80 + 150)
    And total costs would be 1300 credits (exceeding budget by 300)
    When timer expires
    Then system should auto-correct "BluePost" onboarding options to fit budget
    And auto-correction removes warm-up options one by one until valid:
      | step | warm_up_removed_from      | cost_saved | running_total |
      | 1    | Premium Brand Co.         | 150        | 1150          |
      | 2    | Growing Startup           | 150        | 1000          |
    And Client C keeps its warm-up option (150cr) as budget is now valid
    And all list hygiene options remain (2 × 80 = 160cr)
    And "BluePost" should have valid decisions totaling exactly 1000 credits
    And "BluePost" should see "Time's up! Some onboarding options were removed to fit your budget"
    And removed onboarding options should be logged with client names

  Scenario: Empty decisions auto-locked when timer reaches zero
    Given Planning Phase timer reaches 0 seconds
    And "RocketMail" has not locked in
    And "RocketMail" has made no decisions
    When timer expires
    Then "RocketMail" should be auto-locked with empty decisions
    And "RocketMail" should see "Time's up! No decisions submitted"

  # ============================================================================
  # SECTION 5: TRANSITION TO RESOLUTION
  # ============================================================================

  Scenario: Resolution phase starts when all players lock in before timer
    Given there are 8 total players
    And 7 players have already locked in
    And Planning Phase timer shows 2:30 remaining
    When the 8th player locks in their decisions
    Then Planning Phase should end immediately
    And Resolution Phase should start
    And all players should see "All players locked in - Starting Resolution"

  Scenario: Resolution phase starts when timer expires
    Given Planning Phase timer reaches 0 seconds
    And 5 out of 8 players have locked in
    When timer expires and auto-locks remaining players
    Then Planning Phase should end
    And Resolution Phase should start

  # ============================================================================
  # SECTION 6: LOCK-IN STATE PERSISTENCE
  # ============================================================================

  Scenario: Lock-in state persists after disconnection
    Given "SendWave" has locked in their decisions
    When "SendWave" disconnects from the game
    And "SendWave" reconnects after 10 seconds
    Then "SendWave" should still see their locked state
    And "SendWave" dashboard should remain read-only
    And "SendWave" should see "Locked In ✓" confirmation

  Scenario: Cannot unlock once locked in
    Given "SendWave" has locked in their decisions
    When "SendWave" attempts to modify a decision
    Then modification should be rejected
    And "SendWave" should see "Cannot modify locked decisions"
    And dashboard should remain read-only

  Scenario: ESP dashboard becomes read-only after lock-in
    Given "SendWave" has locked in their decisions
    When "SendWave" views their ESP dashboard
    Then "SendWave" should not be able to acquire new clients
    And "SendWave" should not be able to change client status (Active/Paused/Suspended)
    And "SendWave" should not be able to modify onboarding options (warm-up, list hygiene)
    And "SendWave" should not be able to purchase new tech upgrades
    And modals (Client Marketplace, Portfolio, Tech Shop) can still be opened
    But all action buttons within modals should be disabled
    And modals should display "Locked In - View Only" banner

  Scenario: Destination dashboard becomes read-only after lock-in
    Given "zmail" has locked in their decisions
    When "zmail" views their Destination dashboard
    Then "zmail" should not be able to change filtering levels for any ESP
    And "zmail" should not be able to purchase new tools
    And modals (Filtering Controls, Tech Shop) can still be opened
    But all action buttons within modals should be disabled
    And modals should display "Locked In - View Only" banner

  # ============================================================================
  # SECTION 7: LOGGING
  # ============================================================================

  Scenario: Successful lock-in events are logged
    Given "SendWave" clicks "Lock In" button
    When lock-in succeeds
    Then system should log:
      | level | message_contains                    |
      | info  | Player SendWave locked in decisions |
      | info  | Dashboard set to read-only          |

  Scenario: Auto-lock events are logged
    Given Planning Phase timer expires
    And 3 players have not locked in
    When auto-lock occurs
    Then system should log:
      | level | message_contains                              |
      | info  | Timer expired - auto-locking all players      |
      | info  | Auto-locked player: SendWave (valid)          |
      | info  | Auto-locked player: BluePost (valid)          |
      | info  | Auto-locked player: zmail (valid)             |

  Scenario: Auto-correction during auto-lock is logged
    Given Planning Phase timer expires
    And "BluePost" has invalid decisions (budget exceeded by 300 credits due to onboarding options)
    When auto-lock corrects decisions
    Then system should log:
      | level | message_contains                                               |
      | info  | Auto-locked player: BluePost (corrected)                       |
      | info  | Removed warm-up option (150cr) for client: Premium Brand Co.   |
      | info  | Removed warm-up option (150cr) for client: Growing Startup     |
      | info  | BluePost final budget after auto-correction: 1000/1000 credits |

# ============================================================================
# NOTES
# ============================================================================

# What we're testing:
# - Lock-in button enablement/disablement based on budget validity (considering pending onboarding options)
# - UI state transitions (editable → read-only) for both ESP and Destination dashboards
# - Waiting messages and countdown of remaining players
# - Auto-lock at timer expiry (0s) with auto-correction of invalid onboarding options
# - Warning at 15 seconds (system message in addition to visual timer color changes)
# - Transition to Resolution Phase (earliest of all-locked or timer-expired)
# - State persistence after disconnection
# - Prevention of unlock/modification after lock-in
# - Read-only modal behavior (modals can open but actions disabled with "View Only" banner)
# - Comprehensive logging of lock-in events including auto-corrections
#
# What we're NOT testing:
# - Detailed budget calculation logic (covered by client/tech acquisition US)
# - Actual resolution calculations (US-3.3)
# - DMARC enforcement penalties (handled in resolution, not lock-in validation)
# - WebSocket message format details (will be implemented as lock_in_confirmed, player_locked_in, etc.)
# - UI button styling and animations
# - Specific timer implementation (covered by US-3.1)
#
# Dependencies:
# - US-3.1: Timer & Phase Display (for countdown and phase transitions)
# - US-3.3: Resolution Phase (for what happens after lock-in)
# - US-2.2: Client acquisition (committed immediately, affects budget)
# - US-2.3: Tech shop (committed immediately, affects budget)
# - US-2.4: Client portfolio management (onboarding options are "pending" until lock-in)
# - US-2.5: Destination dashboard (read-only behavior after lock-in)
# - US-2.6.1: Filtering controls (committed immediately for destinations)
# - US-2.6.2: Destination tech shop (committed immediately, affects budget)
#
# Edge cases handled:
# - Budget exceeded by pending onboarding options: buttons disabled (both dashboard and modal)
# - Auto-lock with budget exceeded: system auto-corrects onboarding options only
# - Disconnection during locked state
# - Empty decisions at auto-lock (valid - player just doesn't make changes)
# - Race condition: last player locks vs timer expires
#
# Design decisions clarified:
# - "Pending decisions" = uncommitted onboarding options (warm-up: 150cr, list hygiene: 80cr) only
# - Client acquisitions and tech purchases are committed immediately upon purchase
# - Lock-in button is preventively disabled when pending onboarding options would exceed budget
# - Auto-correction algorithm:
#   Priority 1: Remove ALL warm-up options (150cr each) one by one until budget valid
#   Priority 2: If still invalid, remove list hygiene options (80cr each) one by one until valid
#   Example: If over by 300cr with 3 warm-ups and 2 list hygiene selected:
#     Step 1: Remove warm-up #1 (-150cr) → still over by 150cr
#     Step 2: Remove warm-up #2 (-150cr) → now valid! Stop here.
#     Result: Warm-up #3 and both list hygiene options are kept
# - DMARC non-compliance doesn't block lock-in (consequences in resolution)
# - Auto-correction is logged for transparency with client names and credit amounts
# - Modals can be opened in locked state for viewing, but all action buttons are disabled
# - Phase transition: planning → resolution (no intermediate 'action' phase)
# - Visual timer warnings (orange 60s, red 30s) + system message warning at 15s