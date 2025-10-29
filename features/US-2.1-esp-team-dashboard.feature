# US-2.1: ESP Team Dashboard
# Epic: Epic 2 - Player Interfaces

Feature: ESP Team Dashboard
  As an ESP player
  I want to see my team's current status
  So that I can make informed decisions

  Background:
    Given the application is running
    And a game session with room code "ABC123" exists
    And the game is in "planning" phase, round 1
    And player "Alice" is on ESP team "SendWave"
    And player "Alice" is on the ESP dashboard at "/game/ABC123/esp/sendwave"

  # ============================================================================
  # BUDGET DISPLAY
  # ============================================================================

  Scenario: Budget is displayed prominently
    Given ESP team "SendWave" has 1000 credits
    When player "Alice" views the dashboard
    Then the budget should be displayed prominently
    And the budget value should show "1000"
    And the budget should be clearly visible without scrolling

  Scenario: Budget updates in real-time when spending credits on purchases
    Given ESP team "SendWave" has 1000 credits
    And player "Alice" is viewing the dashboard
    When the team spends 200 credits on a client acquisition
    Then the budget should update to "800" in real-time
    And the update should be smooth without page refresh
# TODO : review this scenario once client marketplace is available to improve the test

  Scenario: Budget forecast is displayed after making decisions
    Given ESP team "SendWave" has 1000 credits
    And the team has made decisions that will cost 330 credits this round
    When player "Alice" views the dashboard
    Then a budget forecast should show "670" as "After Lock-in" value
    And the forecast should be visually distinct from current budget
# TODO : review this scenario once Tech Shop is available to improve the test

  # ============================================================================
  # REPUTATION DISPLAY
  # ============================================================================

  Scenario: Reputation per destination is displayed with color-coded gauges
    Given ESP team "SendWave" has the following reputation:
      | Destination | Reputation |
      | Gmail       | 85         |
      | Outlook     | 72         |
      | Yahoo       | 58         |
    When player "Alice" views the dashboard
    Then reputation gauges should be displayed for each destination
    And the Gmail gauge should show "85" with excellent/green styling
    And the Outlook gauge should show "72" with good/blue styling
    And the Yahoo gauge should show "58" with warning/orange styling

  Scenario: Reputation color coding follows defined thresholds
    Given ESP team "SendWave" has reputation scores across different ranges
    When player "Alice" views the reputation gauges
    Then reputations should be color-coded as follows:
      | Reputation Range | Color  | Status    |
      | 90-100          | Green  | Excellent |
      | 70-89           | Blue   | Good      |
      | 50-69           | Orange | Warning   |
      | 30-49           | Red    | Poor      |
      | 0-29            | Black  | Blacklist |

  Scenario: Visual warning appears when reputation drops to warning zone
    Given ESP team "SendWave" has Gmail reputation at 65
    When the round starts
    Then a visual warning should appear for Gmail reputation
    And the warning should indicate "Warning Zone"
    And the gauge should change to orange/warning styling

  Scenario: Visual alert appears when reputation drops to danger zone
    Given ESP team "SendWave" has Gmail reputation at 45
    When the round starts
    Then a visual alert should appear for Gmail reputation
    And the alert should indicate "Danger Zone"
    And the gauge should change to red/poor styling
    And the alert should be more prominent than a warning

  Scenario: Destination weight is displayed with reputation
    Given ESP team "SendWave" is viewing reputation gauges
    When player "Alice" views the dashboard
    Then each destination should display its market weight:
      | Destination | Weight |
      | Gmail       | 50%    |
      | Outlook     | 30%    |
      | Yahoo       | 20%    |
    And the weight should be shown near each reputation gauge

  # ============================================================================
  # CURRENT CLIENTS (ACTIVE PORTFOLIO)
  # ============================================================================

  Scenario: Active clients are listed in portfolio
    Given ESP team "SendWave" has the following active clients:
      | Client Name         | Status | Revenue | Volume | Risk   |
      | Premium Brand Co.   | Active | 250     | 50K    | Low    |
      | Growing Startup     | Active | 180     | 35K    | Medium |
      | Aggressive Marketer | Paused | 320     | 80K    | High   |
    When player "Alice" views the dashboard
    Then the active portfolio should display 3 clients
    And each client should show its name, status, revenue, volume, and risk level
    And active clients should be visually distinct from paused clients

  Scenario: Empty portfolio displays helpful message
    Given ESP team "SendWave" has no clients acquired yet
    When player "Alice" views the dashboard
    Then the portfolio section should display a message:
      """
      No clients yet. Visit the Client Marketplace to acquire your first client.
      """
    And there should be a clear call-to-action to access the marketplace

  Scenario: Client status is clearly indicated
    Given ESP team "SendWave" has clients with different statuses
    When player "Alice" views the active portfolio
    Then active clients should display a green "Active" badge
    And paused clients should display an orange "Paused" badge
    And the badges should be easily distinguishable

  Scenario: Portfolio displays client count
    Given ESP team "SendWave" has 4 active clients
    When player "Alice" views the dashboard
    Then the portfolio header should show "4 active clients"
    And the count should update in real-time when clients are added or paused

  # ============================================================================
  # TECHNICAL INFRASTRUCTURE STATUS
  # ============================================================================

  Scenario: Owned technical upgrades are displayed
    Given ESP team "SendWave" has purchased the following tech:
      | Technology          | Status |
      | SPF Authentication  | Active |
      | DKIM Signature      | Active |
    When player "Alice" views the dashboard
    Then the technical infrastructure section should list owned tech
    And SPF Authentication should show as "Active"
    And DKIM Signature should show as "Active"
    And active tech should have green checkmark icons

  Scenario: Missing critical tech is highlighted
    Given ESP team "SendWave" has SPF and DKIM but not DMARC
    And the game is in round 2 where DMARC becomes mandatory
    When player "Alice" views the dashboard
    Then DMARC should be highlighted as "Not Installed"
    And there should be a warning indicator "MANDATORY from Round 3"
    And the missing tech should have a red cross icon

  Scenario: Missing technical upgrades are indicated
    Given ESP team "SendWave" has not purchased all available tech
    When player "Alice" views the technical infrastructure section
    Then missing tech should show as "Not Installed"
    And there should be an indication that upgrades are available
    And missing tech should be styled differently from owned tech

  # ============================================================================
  # GAME STATE INFORMATION
  # ============================================================================

  Scenario: Current round number is visible
    Given the game is in round 2 of 4
    When player "Alice" views the dashboard
    Then the round number should be clearly displayed as "Round 2 / 4"
    And it should be positioned in the header or prominent location

  Scenario: Timer shows remaining time in current phase
    Given the planning phase has 4 minutes and 32 seconds remaining
    When player "Alice" views the dashboard
    Then a countdown timer should display "4:32"
    And the timer should decrement every second
    And the timer should be prominent and easy to read

  Scenario: Timer changes color as time runs out
    Given the planning phase timer is counting down
    When the timer reaches 1 minute remaining
    Then the timer should change to a warning color (orange)
    When the timer reaches 30 seconds remaining
    Then the timer should change to an urgent color (red)
    And the timer may flash or pulse to draw attention

  Scenario: Phase transition is indicated
    Given the planning phase timer reaches 0:00
    When the phase transitions to "resolution"
    Then the phase indicator should update to "Resolution"
    And a brief notification should appear: "Planning phase ended"
    And all the decisions should be locked in

  # ============================================================================
  # REAL-TIME UPDATES
  # ============================================================================

  Scenario: Dashboard receives WebSocket updates
    Given player "Alice" is viewing the dashboard
    And the WebSocket connection is active
    When a game state update is broadcast
    Then the dashboard should receive the update via WebSocket
    And relevant sections should update automatically
    And no manual refresh should be required

  Scenario: Dashboard handles disconnection gracefully
    Given player "Alice" is viewing the dashboard
    When the WebSocket connection is lost
    Then a connection status indicator should show "Disconnected"
    And the dashboard should attempt to reconnect automatically
    When the connection is restored
    Then the status indicator should show "Connected"
    And the dashboard should sync with the latest game state

  # ============================================================================
  # QUICK ACTIONS / NAVIGATION
  # ============================================================================

  Scenario: Quick action buttons are accessible
    Given player "Alice" is viewing the dashboard
    When player "Alice" looks for ways to make decisions
    Then there should be prominent quick action buttons for:
      | Action               |
      | Client Marketplace   |
      | Technical Shop       |
      | Client Management    |
    And each button should be clearly labeled with an icon

  Scenario: Lock-in button is visible during planning phase
    Given the game is in "planning" phase
    When player "Alice" views the dashboard
    Then a "Lock In Decisions" button should be visible
    And the button should be prominent and easy to find
    And the button should be enabled

  Scenario: Lock-in button is disabled during resolution phase
    Given the game is in "resolution" phase
    When player "Alice" views the dashboard
    Then the "Lock In Decisions" button should not be visible
    Or the button should be disabled and grayed out

  # ============================================================================
  # RESPONSIVE DESIGN
  # ============================================================================

  Scenario: Dashboard is responsive on desktop
    Given player "Alice" is viewing the dashboard on desktop (1920x1080)
    When the dashboard loads
    Then all elements should fit properly on screen
    And the layout should use a multi-column grid
    And no horizontal scrolling should be required

  Scenario: Dashboard is responsive on mobile
    Given player "Alice" is viewing the dashboard on mobile (375x667)
    When the dashboard loads
    Then the layout should stack vertically for mobile
    And text should be readable without zooming
    And buttons should be large enough for thumb interaction
    And critical information should be visible without scrolling

  # ============================================================================
  # ACCESSIBILITY
  # ============================================================================

  Scenario: Color-coding is accessible to color-blind users
    Given player "Alice" has color vision deficiency
    When viewing reputation gauges with color coding
    Then each status should also use patterns or icons:
      | Status    | Visual Indicator                  |
      | Excellent | Green + checkmark icon            |
      | Good      | Blue + thumb up icon              |
      | Warning   | Orange + warning triangle icon    |
      | Poor      | Red + exclamation icon            |
      | Blacklist | Black/gray + prohibition icon     |
    And the status should be readable by screen readers

  Scenario: Dashboard is keyboard navigable
    Given player "Alice" is using keyboard navigation
    When player "Alice" tabs through the dashboard
    Then focus should move logically through elements
    And focused elements should have visible focus indicators
    And all interactive elements should be reachable by keyboard

  # ============================================================================
  # ERROR HANDLING
  # ============================================================================

  Scenario: Dashboard handles missing data gracefully
    Given player "Alice" is viewing the dashboard
    And some game data fails to load
    When the dashboard attempts to display the data
    Then placeholder content or loading indicators should be shown
    And an error message should appear: "Unable to load some data. Retrying..."
    And the dashboard should attempt to reload the data

  Scenario: Dashboard shows error when game state is invalid
    Given player "Alice" is viewing the dashboard
    When the game state becomes corrupted or invalid
    Then an error banner should appear at the top
    And the message should say: "Game state sync error. Please refresh the page."
    And critical information should still be displayed if available

  # ============================================================================
  # NOTES
  # ============================================================================

  # What we're testing:
  # - Budget display (prominent, real-time updates, forecast)
  # - Reputation gauges (color-coded, thresholds, warnings, weights)
  # - Active client portfolio (list, status, counts, empty state)
  # - Technical infrastructure status (owned, missing, available)
  # - Game state information (round, phase, timer)
  # - Real-time updates via WebSocket
  # - Quick actions and navigation (buttons only, not content)
  # - Responsive design (desktop, tablet, mobile)
  # - Accessibility (color-blind friendly, keyboard navigation)
  # - Error handling and graceful degradation
  #
  # What we're NOT testing:
  # - Team member synchronization (only 1 player per team)
  # - Marketplace content and interactions (covered in US-2.2)
  # - Technical shop content and interactions (covered in US-2.3)
  # - Client management actions (covered in US-2.4)
  # - Lock-in decision logic (covered in US-3.1)
  # - Phase resolution calculations (covered in US-5.x)
  #
  # Dependencies:
  # - US-1.4: Resources allocation (provides initial state)
  # - WebSocket infrastructure for real-time updates
  # - Game state management system
  #
  # Display Requirements:
  # Budget:
  #   - Prominently displayed (large font, top of dashboard)
  #   - Real-time updates
  #   - Forecast available after decisions
  #
  # Reputation:
  #   - Per destination (Gmail, Outlook, Yahoo)
  #   - Color-coded: Excellent (90+, green), Good (70-89, blue),
  #     Warning (50-69, orange), Poor (30-49, red), Blacklist (0-29, black)
  #   - Visual warnings in warning/danger zones
  #   - Destination weights shown (Gmail 50%, Outlook 30%, Yahoo 20%)
  #
  # Active Clients:
  #   - List view with name, status, revenue, volume, risk
  #   - Active/Paused status badges
  #   - Client count
  #   - Empty state with CTA
  #
  # Technical Infrastructure:
  #   - Owned tech with active status
  #   - Missing tech highlighted (especially mandatory ones)
  #   - Link to Tech Shop for upgrades
  #
  # Game State:
  #   - Round number (X / 4)
  #   - Current phase (Planning, Resolution, Consequences)
  #   - Countdown timer (MM:SS format)
  #   - Timer color changes (normal → orange at 1min → red at 30s)
  #
  # Responsive Breakpoints:
  #   - Desktop: 1024px+
  #   - Tablet: 768px - 1023px
  #   - Mobile: < 768px
  #
  # Accessibility:
  #   - Color-blind friendly (icons + colors)
  #   - Keyboard navigation support
  #   - ARIA labels for screen readers
  #   - Touch targets minimum 44x44px
  #
  # Real-time Updates:
  #   - WebSocket connection for live updates
  #   - Smooth animations for value changes
  #   - Connection status indicator
  #   - Auto-reconnect on disconnection
  #   - Note: Only 1 player per team, no teammate synchronization needed
  #
  # Performance:
  #   - Dashboard should load within 2 seconds
  #   - Real-time updates should appear within 500ms
  #   - Animations should be smooth (60fps)
