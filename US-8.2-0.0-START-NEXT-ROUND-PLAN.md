# US-8.2-0.0: Facilitator Start Next Round - Implementation Plan

## Overview

**User Story**: As a facilitator, I want to manually start the next round after reviewing consequences, so that I can control the game pace and ensure players are ready to continue.

**Implementation Approach**: ATDD (Acceptance Test-Driven Development)

---

## Gherkin Feature File

```gherkin
Feature: US-8.2-0.0 - Facilitator Start Next Round

  As a facilitator
  I want to manually start the next round after reviewing consequences
  So that I can control the game pace and ensure players are ready to continue

  Background:
    Given a game session exists with room code "GAME01"
    And the game has 2 ESP teams: "SendWave" and "MailMonkey"
    And the game has 2 destinations: "Gmail" and "Outlook"
    And facilitator "Facilitator" is managing the game

  # ========================================================================
  # Scenario 1: Button Visibility Based on Phase and Round
  # ========================================================================

  Scenario: 1.1 - Start Next Round button visibility during planning and consequences phases
    Given the game is in round 1
    And the current phase is "planning"
    When the facilitator views the facilitator dashboard
    Then the "Start Next Round" button should NOT be visible

    When all players lock in their decisions
    And the game transitions to "resolution" phase
    And the game transitions to "consequences" phase
    Then the "Start Next Round" button should be visible

  Scenario: 1.2 - Start Next Round button is NOT visible during consequences phase of Round 4
    Given the game is in round 4
    And the current phase is "consequences"
    When the facilitator views the facilitator dashboard
    Then the "Start Next Round" button should NOT be visible
    # Note: Victory screen button will be implemented in a separate user story

  # ========================================================================
  # Scenario 2: Starting Next Round - Core Functionality
  # ========================================================================

  Scenario: 2.1 - Successfully start Round 2 from Round 1 consequences
    Given the game is in round 1
    And the current phase is "consequences"
    When the facilitator clicks "Start Next Round" button
    Then the game should transition to round 2
    And the current phase should be "planning"
    And a planning phase timer should start with 300 seconds
    And all players should receive a phase transition notification

  # ========================================================================
  # Scenario 3: Lock-In State Reset
  # ========================================================================

  Scenario: 3.1 - Lock-in states are cleared when starting next round
    Given the game is in round 1
    And the current phase is "consequences"
    And ESP "SendWave" is locked in at "2025-01-10T10:30:00Z"
    And ESP "MailMonkey" is locked in at "2025-01-10T10:31:00Z"
    And destination "Gmail" is locked in at "2025-01-10T10:30:30Z"
    And destination "Outlook" is locked in at "2025-01-10T10:31:30Z"
    When the facilitator clicks "Start Next Round" button
    Then ESP "SendWave" should NOT be locked in
    And ESP "MailMonkey" should NOT be locked in
    And destination "Gmail" should NOT be locked in
    And destination "Outlook" should NOT be locked in

  # ========================================================================
  # Scenario 4: Dashboard Read-Only Mode Exit
  # ========================================================================

  Scenario: 4.1 - ESP dashboards exit read-only mode when planning phase starts
    Given the game is in round 1
    And the current phase is "consequences"
    And ESP "SendWave" player is viewing their results
    When the facilitator clicks "Start Next Round" button
    Then "SendWave" player is automatically directed to their dashboard
    And the ESP dashboard should exit read-only mode
    And the player should be able to acquire clients
    And the player should be able to purchase technical upgrades
    And the player should be able to manage client portfolio

  Scenario: 4.2 - Destination dashboards exit read-only mode when planning phase starts
    Given the game is in round 1
    And the current phase is "consequences"
    And destination "Gmail" player is viewing their results
    When the facilitator clicks "Start Next Round" button
    Then "Gmail" player is automatically directed to their dashboard
    And the destination dashboard should exit read-only mode
    And the player should be able to adjust filtering levels
    And the player should be able to purchase tools

  # ========================================================================
  # Scenario 5: State Persistence Across Rounds
  # ========================================================================

  Scenario: 5.1 - Acquired clients remain owned in the next round
    Given the game is in round 1
    And the current phase is "consequences"
    And ESP "SendWave" owns clients: ["client-001", "client-002"]
    When the facilitator clicks "Start Next Round" button
    Then ESP "SendWave" should still own clients: ["client-001", "client-002"]
    And those clients should appear in the portfolio

  Scenario: 5.2 - Purchased technical upgrades remain owned in the next round
    Given the game is in round 1
    And the current phase is "consequences"
    And ESP "SendWave" owns technical upgrades: ["spf", "dkim"]
    When the facilitator clicks "Start Next Round" button
    Then ESP "SendWave" should still own technical upgrades: ["spf", "dkim"]

  Scenario: 5.3 - Purchased destination tools remain owned in the next round
    Given the game is in round 1
    And the current phase is "consequences"
    And destination "Gmail" owns tools: ["content_analysis_filter"]
    When the facilitator clicks "Start Next Round" button
    Then destination "Gmail" should still own tools: ["content_analysis_filter"]

  Scenario: 5.4 - Paused clients remain paused in the next round
    Given the game is in round 1
    And the current phase is "consequences"
    And ESP "SendWave" owns client "client-001" with status "Paused"
    When the facilitator clicks "Start Next Round" button
    Then client "client-001" should still have status "Paused"
    And the player should be able to change the status to "Active" or keep it "Paused"

  Scenario: 5.5 - Suspended clients remain suspended in the next round
    Given the game is in round 1
    And the current phase is "consequences"
    And ESP "SendWave" owns client "client-002" with status "Suspended"
    When the facilitator clicks "Start Next Round" button
    Then client "client-002" should still have status "Suspended"
    And the suspension message should still be displayed

  Scenario: 5.6 - Onboarding options for existing clients are NOT editable in subsequent rounds
    Given the game is in round 1
    And ESP "SendWave" owns client "client-001" with warm-up enabled
    And the client was first activated in round 1
    When the facilitator clicks "Start Next Round" button
    And ESP "SendWave" player views the portfolio in round 2
    Then the warm-up checkbox should be visible but disabled
    And the list hygiene checkbox should be visible but disabled
    And the onboarding section should indicate "Set during Round 1"
    # Note: This behavior is already implemented - verify it still works

  Scenario: 5.7 - Newly acquired clients in Round 2 can have onboarding options configured
    Given the game is in round 2 planning phase
    And ESP "SendWave" acquires a new client "client-003"
    When ESP "SendWave" player views the portfolio
    Then the onboarding checkboxes for "client-003" should be editable
    And the player can enable warm-up and list hygiene for this new client
    # Note: This behavior is already implemented - verify it still works

  # ========================================================================
  # Scenario 6: UI Behavior and Feedback
  # ========================================================================

  Scenario: 6.1 - Button shows loading state while processing
    Given the game is in round 1
    And the current phase is "consequences"
    When the facilitator clicks "Start Next Round" button
    Then the button should show a loading state
    And the button should be disabled while processing
    And when the transition completes, the button should disappear

  Scenario: 6.2 - Error handling when API call fails
    Given the game is in round 1
    And the current phase is "consequences"
    And the next-round API endpoint will fail
    When the facilitator clicks "Start Next Round" button
    Then an error message should be displayed
    And the button should return to clickable state
    And the game should remain in consequences phase

  Scenario: 6.3 - No confirmation dialog is shown
    Given the game is in round 1
    And the current phase is "consequences"
    When the facilitator clicks "Start Next Round" button
    Then NO confirmation dialog should appear
    And the round should start immediately

  # ========================================================================
  # Scenario 7: Real-Time Updates to All Players
  # ========================================================================

  Scenario: 7.1 - All players receive real-time phase transition notification
    Given the game is in round 1
    And the current phase is "consequences"
    And ESP "SendWave" player is viewing consequences
    And destination "Gmail" player is viewing consequences
    When the facilitator clicks "Start Next Round" button
    Then ESP "SendWave" player should see their planning phase dashboard
    And destination "Gmail" player should see their planning phase dashboard
    And both should see "Round 2" displayed
    And both should see the planning timer counting down
```

---

## ATDD Implementation Plan

### Phase 0: Write Feature File and Update Types ✅

**Tasks:**
- [x] Create feature file: `features/US-8.2-0.0-facilitator-start-next-round.feature`
- [ ] Update types if needed (check for any new interfaces)
- [ ] Add test IDs to TEST-IDS-REFERENCE.md

**Test IDs to Add:**
```markdown
## Facilitator Dashboard

| Test ID | Element | Description |
|---------|---------|-------------|
| `game-timer` | `<div>` | Round timer display |
| `current-phase` | Text | Current game phase display |
| `start-next-round-button` | `<button>` | Button to start next round (consequences phase only) |
```

---

### Phase 1: Write Failing Tests (Red) 🔴

**File to Create:** `tests/us-8.2-0.0-facilitator-start-next-round.spec.ts`

**Test Structure:**
```typescript
import { test, expect } from '@playwright/test';
import { createGameInPlanningPhase } from './helpers/game-setup';

test.describe('US-8.2-0.0: Facilitator Start Next Round', () => {
  test('1.1 - Start Next Round button visibility', async ({ browser }) => {
    // Test button not visible in planning, visible in consequences
  });

  test('1.2 - Button not visible in Round 4 consequences', async ({ browser }) => {
    // Test button hidden in final round
  });

  test('2.1 - Successfully start Round 2', async ({ browser }) => {
    // Test full round transition: round increment, phase change, timer start
  });

  test('3.1 - Lock-in states cleared', async ({ browser }) => {
    // Test all locked_in flags reset to false
  });

  test('4.1 - ESP dashboard exits read-only mode', async ({ browser }) => {
    // Test ESP redirected from consequences to dashboard, can interact
  });

  test('4.2 - Destination dashboard exits read-only mode', async ({ browser }) => {
    // Test destination redirected from consequences to dashboard, can interact
  });

  test('5.1-5.7 - State persistence', async ({ browser }) => {
    // Test clients, tech, tools, statuses persist across rounds
  });

  test('6.1 - Button loading state', async ({ browser }) => {
    // Test button shows loading during API call
  });

  test('6.2 - Error handling', async ({ browser }) => {
    // Test error display and recovery
  });

  test('6.3 - No confirmation dialog', async ({ browser }) => {
    // Test immediate transition without confirmation
  });

  test('7.1 - Real-time updates to all players', async ({ browser }) => {
    // Test WebSocket broadcasts update all connected clients
  });
});
```

**Helper Function Needed:**
```typescript
// In tests/helpers/game-setup.ts
export async function createGameInConsequencesPhase(
  browser: Browser,
  roomCode: string,
  round: number
): Promise<{
  facilitatorPage: Page;
  alicePage: Page;
  bobPage: Page;
  carolPage: Page;
  davePage: Page;
}> {
  // Create game in planning phase (existing helper)
  // Lock in all players
  // Wait for resolution
  // Wait for consequences
  // Return page objects
}
```

---

### Phase 2: Implement Backend API Endpoint 🔧

**File to Create:** `src/routes/api/sessions/[roomCode]/next-round/+server.ts`

**Endpoint Specification:**
- **Method:** POST
- **URL:** `/api/sessions/[roomCode]/next-round`
- **Auth:** Check facilitator (session.facilitatorId matches request)
- **Validation:**
  - Room code exists
  - Current phase is "consequences"
  - Current round is 1, 2, or 3 (not 4)

**Implementation Steps:**
1. Validate room code and facilitator
2. Validate current phase is "consequences"
3. Validate round < 4
4. Clear locked_in state for all ESP teams and destinations:
   ```typescript
   session.esp_teams.forEach(team => {
     team.locked_in = false;
     team.locked_in_at = undefined;
   });
   session.destinations.forEach(dest => {
     dest.locked_in = false;
     dest.locked_in_at = undefined;
   });
   ```
5. Increment round: `session.current_round += 1`
6. Transition phase: Call `transitionPhase({ roomCode, toPhase: 'planning' })`
7. Initialize timer: Call `initializeTimer({ roomCode, duration: 300 })`
8. Broadcast WebSocket message:
   ```typescript
   {
     type: 'phase_transition',
     data: {
       phase: 'planning',
       round: session.current_round,
       message: `Round ${session.current_round} - Planning Phase`,
       timer_remaining: 300
     }
   }
   ```
9. Return success response

**Error Handling:**
- Invalid room code → 404
- Not facilitator → 403
- Wrong phase → 400 with message "Can only start next round from consequences phase"
- Round 4 → 400 with message "Cannot start round 5. Use End Game button instead"

---

### Phase 3: Implement Facilitator UI Button 🎨

**File to Modify:** `src/routes/game/[roomCode]/facilitator/+page.svelte`

**Changes:**

1. **Add state for loading and error:**
```typescript
let isStartingRound = $state(false);
let error = $state<string | null>(null);
```

2. **Add computed visibility:**
```typescript
let showStartButton = $derived(
  phase === 'consequences' && round >= 1 && round <= 3
);
```

3. **Add click handler:**
```typescript
async function handleStartNextRound() {
  isStartingRound = true;
  error = null;

  try {
    const response = await fetch(`/api/sessions/${roomCode}/next-round`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const data = await response.json();
      error = data.error || 'Failed to start next round';
      isStartingRound = false;
      return;
    }

    // Success - button will disappear when phase updates via WebSocket
  } catch (err) {
    error = 'Network error. Please try again.';
    isStartingRound = false;
  }
}
```

4. **Add button in template:**
```svelte
{#if showStartButton}
  <button
    data-testid="start-next-round-button"
    onclick={handleStartNextRound}
    disabled={isStartingRound}
    class="px-6 py-3 bg-emerald-500 text-white font-semibold rounded-lg
           hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-500
           focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {isStartingRound ? 'Starting...' : 'Start Next Round'}
  </button>
{/if}

{#if error}
  <div
    data-testid="error-message"
    class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
    role="alert"
  >
    {error}
  </div>
{/if}
```

**Styling:** Use Tailwind CSS with emerald color (primary color from design system)

---

### Phase 4: Run Tests and Fix (Green) ✅

**Tasks:**
- [ ] Run E2E test: `npm run test:e2e -- us-x.x-facilitator-start-next-round.spec.ts`
- [ ] Fix any failing tests
- [ ] Verify all scenarios pass
- [ ] Check WebSocket updates work correctly
- [ ] Verify timer starts automatically

**Common Issues to Watch For:**
- WebSocket message format mismatch
- Timer not initializing
- locked_in state not clearing properly
- Phase transition validation failing
- Race conditions with WebSocket updates

---

### Phase 5: Refactor (Optional) 🔄

**Potential Refactorings:**
- Extract button component if facilitator dashboard grows
- Extract lock-in clearing logic to a manager function
- Add more detailed logging for debugging

---

## Technical Implementation Details

### API Endpoint Flow

```
POST /api/sessions/[roomCode]/next-round

1. Validate request
   ├─ Room code exists?
   ├─ Facilitator authenticated?
   ├─ Phase === 'consequences'?
   └─ Round < 4?

2. Clear state
   ├─ Clear all team.locked_in flags
   └─ Clear all destination.locked_in flags

3. Transition game
   ├─ session.current_round += 1
   ├─ transitionPhase('planning')
   └─ initializeTimer(300)

4. Broadcast update
   └─ WebSocket: phase_transition message

5. Return success
   └─ { success: true, round: X, phase: 'planning' }
```

### WebSocket Message Structure

```typescript
{
  type: 'phase_transition',
  data: {
    phase: 'planning',
    round: 2,  // incremented round number
    message: 'Round 2 - Planning Phase',
    timer_remaining: 300
  }
}
```

### State Changes

**Before (Round 1 Consequences):**
```typescript
{
  current_round: 1,
  current_phase: 'consequences',
  esp_teams: [
    { name: 'SendWave', locked_in: true, locked_in_at: Date, ... }
  ],
  destinations: [
    { name: 'Gmail', locked_in: true, locked_in_at: Date, ... }
  ],
  timer: null
}
```

**After (Round 2 Planning):**
```typescript
{
  current_round: 2,  // ← incremented
  current_phase: 'planning',  // ← changed
  esp_teams: [
    { name: 'SendWave', locked_in: false, locked_in_at: undefined, ... }  // ← cleared
  ],
  destinations: [
    { name: 'Gmail', locked_in: false, locked_in_at: undefined, ... }  // ← cleared
  ],
  timer: { duration: 300, remaining: 300, startedAt: Date, isRunning: true }  // ← initialized
}
```

---

## Files to Create/Modify

### New Files
- [ ] `features/US-8.2-0.0-facilitator-start-next-round.feature`
- [ ] `tests/us-8.2-0.0-facilitator-start-next-round.spec.ts`
- [ ] `src/routes/api/sessions/[roomCode]/next-round/+server.ts`

### Modified Files
- [ ] `src/routes/game/[roomCode]/facilitator/+page.svelte` - Add button and handler
- [ ] `TEST-IDS-REFERENCE.md` - Add new test IDs
- [ ] `tests/helpers/game-setup.ts` - Add `createGameInConsequencesPhase()` helper (if needed)

---

## Progress Tracking

### Phase 0: Setup
- [ ] Create feature file
- [ ] Update TEST-IDS-REFERENCE.md
- [ ] Review types (no changes needed based on investigation)

### Phase 1: Red (Failing Tests)
- [ ] Create test file
- [ ] Write test helper `createGameInConsequencesPhase()`
- [ ] Write test 1.1 - Button visibility
- [ ] Write test 1.2 - Round 4 behavior
- [ ] Write test 2.1 - Core functionality
- [ ] Write test 3.1 - Lock-in reset
- [ ] Write test 4.1 - ESP read-only exit
- [ ] Write test 4.2 - Destination read-only exit
- [ ] Write test 5.x - State persistence (can be combined)
- [ ] Write test 6.1 - Loading state
- [ ] Write test 6.2 - Error handling
- [ ] Write test 6.3 - No confirmation
- [ ] Write test 7.1 - Real-time updates
- [ ] Run tests - confirm all fail ❌

### Phase 2: Backend Implementation
- [ ] Create API endpoint file
- [ ] Implement validation logic
- [ ] Implement state clearing (locked_in)
- [ ] Implement round increment
- [ ] Implement phase transition
- [ ] Implement timer initialization
- [ ] Implement WebSocket broadcast
- [ ] Add error handling
- [ ] Add Pino logging

### Phase 3: Frontend Implementation
- [ ] Add button state management
- [ ] Add computed visibility logic
- [ ] Implement click handler with fetch
- [ ] Add button to template
- [ ] Add error display
- [ ] Add loading state styling
- [ ] Add data-testid attributes

### Phase 4: Green (Passing Tests)
- [ ] Run all tests
- [ ] Fix failing tests
- [ ] Verify WebSocket updates
- [ ] Verify timer starts
- [ ] Verify state persistence
- [ ] Manual testing in browser

### Phase 5: Cleanup
- [ ] Run formatter: `npm run format`
- [ ] Review code for improvements
- [ ] Update documentation if needed
- [ ] Commit changes

---

## Notes

### Key Insights from Codebase Investigation

1. **No existing code resets `locked_in`** - This is the main new logic needed
2. **Timer initialization pattern exists** - Follow `start/+server.ts` pattern
3. **Phase transitions are well-structured** - Use existing `phase-manager.ts`
4. **WebSocket broadcasts work well** - Follow existing patterns
5. **Onboarding editability is already implemented** - Just verify it works

### Dependencies

- Uses existing `phase-manager.ts` for phase transitions
- Uses existing `timer-manager.ts` for timer initialization
- Uses existing WebSocket infrastructure (gameWss)
- Uses existing validation patterns from other endpoints

### Testing Strategy

- Focus on integration tests (E2E with Playwright)
- Test real WebSocket updates between browser contexts
- Use existing test helpers where possible
- Create new helper for consequences phase setup

---

## Definition of Done

- [ ] All Gherkin scenarios pass in E2E tests
- [ ] Code follows project conventions (ATDD, no console.log, Pino logging)
- [ ] All files formatted with Prettier
- [ ] Button only visible during consequences phase (rounds 1-3)
- [ ] Round increments correctly
- [ ] Lock-in state clears for all teams/destinations
- [ ] Timer starts automatically
- [ ] All players receive WebSocket updates
- [ ] Error handling works correctly
- [ ] Manual testing confirms smooth UX
- [ ] Documentation updated (TEST-IDS-REFERENCE.md)

---

## Timeline Estimate

- Phase 0 (Setup): 15 minutes
- Phase 1 (Tests): 1-2 hours (13 test scenarios)
- Phase 2 (Backend): 45 minutes
- Phase 3 (Frontend): 30 minutes
- Phase 4 (Green): 1 hour (debugging/fixes)
- Phase 5 (Cleanup): 15 minutes

**Total: ~4 hours**
