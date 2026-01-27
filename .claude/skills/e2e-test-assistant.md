# E2E Test Assistant Skill

## Purpose
Assist with writing, reviewing, and validating E2E tests for The Mail Quest. This skill ensures tests follow project conventions, use correct test IDs, leverage existing helpers, and focus on business logic rather than setup.

## When to Use This Skill
- Writing new E2E tests
- Reviewing existing E2E tests for correctness
- Debugging failing E2E tests
- Ensuring test ID consistency
- Verifying proper helper usage
- Checking resource cleanup

## Core Testing Philosophy

### What to Test (✅ Do This)
- **Business logic**: Calculations, thresholds, game rules, formulas
- **Error states**: Validation failures, edge cases, negative scenarios
- **Feature-specific behavior**: Unique interactions and flows
- **Data updates**: Verify correct values after operations

### What NOT to Test (❌ Avoid This)
- **Setup validation**: Helpers are already tested by usage
- **Generic UI patterns**: Visibility, navigation, loading states (unless feature-specific)
- **Happy paths**: Implicitly covered by feature tests
- **Helper functionality**: Don't re-test what helpers already validate

### Trust Your Helpers
If a helper is used successfully in 10+ tests, **don't test it again**. Use it and focus on your feature.

## Boy Scout Rule: Leave Tests Cleaner Than You Found Them

**Principle**: When touching any test file, always look for opportunities to improve it beyond your immediate task.

### Quick Wins to Look For

When working on a test file, scan for these common issues and fix them:

#### 1. **Missing Resource Cleanup** 🚨 (CRITICAL)
```typescript
// ❌ BAD - No cleanup
test('should do something', async ({ page, context }) => {
  const { alicePage } = await createGameInPlanningPhase(page, context);
  // ... test code ...
  // Pages never closed!
});

// ✅ GOOD - Proper cleanup
let alicePage: Page;

test.afterEach(async ({ page }) => {
  await closePages(page, alicePage);
});

test('should do something', async ({ page, context }) => {
  const result = await createGameInPlanningPhase(page, context);
  alicePage = result.alicePage;
  // ... test code ...
});
```

#### 2. **Manual Setup Instead of Helpers**
```typescript
// ❌ BAD - Manual setup (5+ lines)
await alicePage.locator('[data-testid="lock-in-button"]').click();
await bobPage.locator('[data-testid="lock-in-button"]').click();
await zmailPage.locator('[data-testid="lock-in-button"]').click();
await page.waitForTimeout(2000);

// ✅ GOOD - Use helper
await lockInAllPlayers([alicePage, bobPage, zmailPage]);
```

#### 3. **Invalid or Missing Test IDs**
```typescript
// ❌ BAD - Test ID doesn't exist
await page.getByTestId('submit-button'); // Not in TEST-IDS-REFERENCE.md

// ✅ GOOD - Use valid test ID
await page.getByTestId('lock-in-button'); // Documented in reference
```

#### 4. **Inconsistent Page Variable Patterns**
```typescript
// ❌ BAD - Mixing patterns
test('test 1', async ({ page, context }) => {
  const { alicePage } = await helper(page, context);
});

test('test 2', async ({ page, context }) => {
  const result = await helper(page, context);
  const alicePage = result.alicePage;
});

// ✅ GOOD - Consistent pattern
let alicePage: Page;

test('test 1', async ({ page, context }) => {
  const result = await helper(page, context);
  alicePage = result.alicePage;
});

test('test 2', async ({ page, context }) => {
  const result = await helper(page, context);
  alicePage = result.alicePage;
});
```

#### 5. **Outdated Comments or Dead Code**
```typescript
// ❌ BAD - Outdated comment
// Wait for WebSocket sync (legacy approach)
await page.waitForTimeout(3000);

// ✅ GOOD - Accurate comment or remove if obvious
await lockInAllPlayers([alicePage, bobPage]);
```

### Boy Scout Checklist

When working on any test file, quickly check:
- [ ] All `describe` blocks have `afterEach` with `closePages()`
- [ ] No manual lock-in patterns (use `lockInAllPlayers`)
- [ ] No manual session setup (use `createTestSession` + `addPlayer`)
- [ ] All test IDs exist in TEST-IDS-REFERENCE.md
- [ ] Consistent destructuring pattern for page variables
- [ ] No `console.log()` statements
- [ ] Comments are accurate and helpful

### When to Apply Boy Scout Rule

**Always apply** when:
- Writing new tests in existing file
- Fixing a bug in a test
- Reviewing test code
- File is already open for changes

**Consider skipping** if:
- Changes would be too invasive (>50% of file)
- File has failing tests you'd need to fix first
- Time-sensitive emergency fix

### Impact Example

```typescript
// BEFORE Boy Scout Rule:
// - No resource cleanup (resource leak)
// - Manual lock-in pattern (5 lines × 8 tests = 40 lines)
// - Inconsistent page variables

// AFTER Boy Scout Rule:
// - ✅ afterEach cleanup added
// - ✅ lockInAllPlayers helper (8 lines total)
// - ✅ Consistent page patterns
// Result: Safer, -32 lines, more maintainable
```

**Remember**: Small improvements compound. If every developer improves 2-3 things when touching a file, the entire test suite improves rapidly.

## Step-by-Step Process

### 1. Context Loading
First, load critical context files:

```typescript
// Load these files to understand what's available:
- tests/helpers/game-setup.ts      // Session, player, and game state helpers
- tests/helpers/client-management.ts  // Client portfolio operations
- tests/helpers/e2e-actions.ts     // Common UI actions and waits
- TEST-IDS-REFERENCE.md            // All valid test IDs
```

### 2. Available Helpers Reference

Helpers should be stored in common files, not in test files.

#### From `game-setup.ts`:
- `createTestSession(page)` - Create session, return room code
- `addPlayer(context, roomCode, displayName, role, teamName)` - Join player to session
- `closePages(...pages)` - **CRITICAL**: Cleanup to prevent resource leaks
- `createSessionWithMinimumPlayers(facilitatorPage, context)` - 1 ESP + 1 Destination
- `createSessionWithMultiplePlayers(facilitatorPage, context)` - 3 ESP + 1 Destination
- `createGameInPlanningPhase(facilitatorPage, context)` - Game started, planning phase
- `createGameWithDestinationPlayer(facilitatorPage, context)` - Includes acquired clients
- `createGameInSecondRound(facilitatorPage, context)` - Advanced to round 2
- `createGameWithyagleDestination(facilitatorPage, context)` - yagle-specific tests
- `createGameWithDestination(facilitatorPage, context, 'zmail'|'intake'|'yagle')` - Generic destination
- `createGameWith2ESPTeams(facilitatorPage, context)` - 2 ESP teams
- `createGameWith3ESPTeams(facilitatorPage, context)` - 3 ESP teams
- `createGameWith5ESPTeams(facilitatorPage, context)` - 5 ESP teams for filtering tests

#### From `client-management.ts`:

**API-Based Helpers** (bypass UI for fast setup):
- `acquireClient(page, roomCode, teamName, clientId)` - Acquire client via API
- `toggleClientStatus(page, roomCode, teamName, clientId, 'Active'|'Paused')` - Change status via API
- `configureOnboarding(page, roomCode, teamName, clientId, warmup, listHygiene)` - Set onboarding via API
- `configurePendingOnboarding(page, roomCode, teamName, clientId, warmup, listHygiene)` - Set pending onboarding
- `getPortfolio(page, roomCode, teamName)` - Fetch portfolio data via API
- `getAvailableClientIds(page, roomCode, teamName)` - Get marketplace clients via API

**UI-Based Helpers** (for testing user flows):
- `openClientManagementModal(page)` - Open modal with wait
- `closeClientManagementModal(page)` - Close modal
- `waitForClientManagementModal(page)` - Wait for modal ready

#### From `e2e-actions.ts`:
- `waitForDashboardReady(page, 'esp'|'destination', timeout)` - Wait for test API ready
- `openModal(page, buttonTestId, modalTestId, timeout)` - Generic modal opener
- `performPurchaseAction(page, buttonLocator, options)` - Handle purchase flow
- `extractBudget(page, testId)` - Parse budget from display
- `extractNumeric(locator)` - Parse any numeric value
- `waitForContentUpdate(locator, expectedPattern, timeout)` - Wait for UI update
- `lockInAllPlayers(pages, waitTime)` - Lock in multiple players
- `triggerIncident(facilitatorPage, incidentId, teamName?, waitTime)` - Trigger drama incident (with optional team selection)
- `advanceToRound(facilitatorPage, playerPages, targetRound)` - Advance game to specific round (assumes starting from Round 1)

### 3. API-Based Testing vs UI Testing

**Strategy**: Use API helpers for test setup, use UI for testing actual user flows.

#### When to Use API Helpers (✅ Preferred for Setup)

Use API helpers from `client-management.ts` to bypass UI for faster, more reliable test setup:

```typescript
// ✅ GOOD - Fast API-based setup
test('should calculate correct revenue after acquisition', async ({ page, context }) => {
  const { alicePage, roomCode } = await createGameInPlanningPhase(page, context);

  // Setup: Use API to quickly acquire clients
  const clientIds = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
  await acquireClient(alicePage, roomCode, 'SendWave', clientIds[0]);
  await configureOnboarding(alicePage, roomCode, 'SendWave', clientIds[0], false, true);

  // Test: Focus on business logic
  await lockInAllPlayers([alicePage]);
  await page.click('[data-testid="start-resolution-button"]');
  await page.waitForTimeout(2000);

  // Verify revenue calculation
  const revenue = await alicePage.getByTestId('revenue-earned').textContent();
  expect(revenue).toContain('150'); // Base revenue calculation
});
```

**Benefits:**
- ⚡ Faster test execution (no UI interactions)
- 🎯 More focused tests (setup doesn't pollute test intent)
- 💪 More reliable (no flaky UI waits)
- 🔧 Easier complex state setup

#### When to Use UI Interactions (✅ For Testing User Flows)

Use UI interactions when testing the actual feature being developed:

```typescript
// ✅ GOOD - Testing the acquisition UI flow
test('should show success message after acquiring client', async ({ page, context }) => {
  const { alicePage } = await createGameInPlanningPhase(page, context);

  // Test the UI flow itself
  await alicePage.getByTestId('open-client-marketplace').click();
  await expect(alicePage.getByTestId('client-marketplace-modal')).toBeVisible();

  await alicePage.getByTestId('client-card-0').getByTestId('acquire-button').click();

  // Verify UI feedback
  await expect(alicePage.getByTestId('success-message')).toBeVisible();
  await expect(alicePage.getByTestId('success-message')).toContainText('acquired');
});
```

#### Mixed Approach Example

```typescript
test('should update filtering level after ESP loses reputation', async ({ page, context }) => {
  const { alicePage, zmailPage, roomCode } = await createGameWithDestinationPlayer(page, context);

  // Setup: API-based (fast, not what we're testing)
  const clientIds = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
  await acquireClient(alicePage, roomCode, 'SendWave', clientIds[0]);

  // Test: UI-based (what we're actually testing)
  await zmailPage.getByTestId('open-filtering-controls').click();
  const filteringSlider = zmailPage.getByTestId('filtering-slider-sendwave');
  await expect(filteringSlider).toHaveAttribute('data-recommended', 'moderate');

  // Trigger reputation loss somehow...
  // Then verify UI updates
  await expect(filteringSlider).toHaveAttribute('data-recommended', 'aggressive');
});
```

#### Available API Endpoints (Advanced)

For complex state manipulation not covered by helpers:

**`/api/test/set-team-state`** - Directly set ESP team state (test-only)
```typescript
// Direct state manipulation for complex scenarios
await page.evaluate(async ({ roomCode, teamName, credits }) => {
  const response = await fetch('/api/test/set-team-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomCode,
      teamName,
      credits,
      budget: 500,
      pending_onboarding_decisions: { 'client-1': { warmup: true, list_hygiene: false } }
    })
  });
  return await response.json();
}, { roomCode: 'ABC123', teamName: 'SendWave', credits: 2000 });
```

**When to use test endpoints:**
- Setting up edge cases (e.g., negative credits)
- Testing specific state transitions
- Bypassing multiple steps for deep testing

**⚠️ Warning:** Don't overuse test endpoints. They bypass validation and can hide bugs.

#### Decision Flow

```
Need to set up test state?
  ↓
  Is there a helper function? → YES → Use helper
  ↓ NO
  Testing UI interaction? → YES → Use UI
  ↓ NO
  Complex state needed? → YES → Consider test endpoint
  ↓ NO
  Create a helper function (don't repeat yourself)
```

### 4. Test ID Validation

**Before using any test ID:**
1. Check if it exists in TEST-IDS-REFERENCE.md
2. Verify correct naming pattern (kebab-case)
3. Use dynamic patterns correctly:
   - `filtering-item-{espName}` → `filtering-item-sendwave` (lowercase, no spaces)
   - `reputation-{destName}` → `reputation-zmail` (lowercase)
   - `client-card-{index}` → `client-card-0`, `client-card-1`
   - `tech-item-{id}` → `tech-item-dmarc`

**Common Test ID Patterns:**
```typescript
// ✅ CORRECT
page.getByTestId('lock-in-button')
page.getByTestId('budget-current')
page.getByTestId('filtering-item-sendwave')
page.locator('[data-testid="esp-dashboard"]')

// ❌ WRONG - These don't exist
page.getByTestId('submit-button')           // Not in reference
page.getByTestId('client-portfolio-card')   // Wrong name
page.getByTestId('filtering_item_sendwave') // Wrong case
```

### 5. Resource Cleanup (CRITICAL)

**ALWAYS use `closePages()` in `afterEach` or at end of test:**

```typescript
import { closePages } from './helpers/game-setup';

test.afterEach(async () => {
  // Include ALL pages created in the test
  await closePages(page, alicePage, bobPage, zmailPage);
});
```

**Common Mistake:** Forgetting to close the facilitator `page` variable.

### 6. Test Structure Template

```typescript
import { test, expect } from '@playwright/test';
import {
  createGameInPlanningPhase,
  closePages
} from './helpers/game-setup';

test.describe('Feature Name - Business Logic', () => {
  let alicePage: Page;

  test.afterEach(async ({ page }) => {
    await closePages(page, alicePage);
  });

  test('should calculate [specific business rule] correctly', async ({ page, context }) => {
    // Setup using helper (don't test the setup itself)
    const { roomCode, alicePage: alice } = await createGameInPlanningPhase(page, context);
    alicePage = alice;

    // Perform feature-specific actions
    await alicePage.getByTestId('open-client-marketplace').click();
    await alicePage.getByTestId('acquire-button').first().click();

    // Wait for state update
    await alicePage.waitForTimeout(500);

    // Test business logic - specific values, calculations, rules
    const budget = await alicePage.getByTestId('budget-current').textContent();
    expect(budget).toContain('800'); // 1000 - 200 cost

    // Verify derived/computed values
    const forecast = await alicePage.getByTestId('budget-forecast').textContent();
    expect(forecast).toContain('950'); // 800 + 150 revenue
  });
});
```

### 7. Common Patterns

#### Waiting for WebSocket Updates
```typescript
// ✅ Simple and reliable
await playerPage.click('[data-testid="lock-in-button"]');
await playerPage.waitForTimeout(500);

// ❌ Fragile - can match multiple elements
await expect(playerPage.locator(`text=${displayName}`)).toBeVisible();
```

#### Testing Calculations
```typescript
// ✅ Test specific business values
const reputation = await alicePage.getByTestId('reputation-zmail');
await expect(reputation).toContainText('85'); // After resolution calculation

// ❌ Don't just check visibility
await expect(reputation).toBeVisible(); // Too generic
```

#### Triggering Incidents
```typescript
// ✅ Use helper for clean, readable code
await triggerIncident(page, 'INC-003', 'SendWave'); // With team selection
await triggerIncident(page, 'INC-009'); // Without team selection

// ❌ Don't repeat the 5-line pattern
await page.click('[data-testid="drama-trigger-incident-button"]');
await page.click('[data-testid="drama-incident-INC-009"]');
await page.click('[data-testid="drama-trigger-button"]');
await page.waitForTimeout(500);
```

#### Advancing Through Rounds
```typescript
// ✅ Use helper for semantic, concise code
await advanceToRound(page, [alicePage, bobPage], 4); // Advance to Round 4
await advanceToRound(page, [alicePage], 2); // Advance to Round 2 (single player)

// For consequences phase: advance to round, then lock in once more
await advanceToRound(page, [alicePage, bobPage], 3);
await lockInAllPlayers([alicePage, bobPage]); // Now in Round 3 consequences

// ❌ Don't repeat the 15-line pattern
await lockInAllPlayers([alicePage, bobPage]);
await page.waitForTimeout(1000);
await page.click('[data-testid="start-next-round-button"]');
await page.waitForTimeout(500);
await lockInAllPlayers([alicePage, bobPage]);
await page.waitForTimeout(1000);
await page.click('[data-testid="start-next-round-button"]');
await page.waitForTimeout(500);
// ... repeated for each round
```

#### Using Test APIs
```typescript
// Expose test API for E2E state checks
(window as any).__espDashboardTest = {
  get ready() { return !loading && !error; },  // Reactive getter
  setCredits: (value: number) => (credits = value)
};

// Wait for ready flag
await page.waitForFunction(
  () => (window as any).__espDashboardTest?.ready === true,
  {},
  { timeout: 10000 }
);
```

#### WebSocket Synchronization

Generic WebSocket sync is already tested in `tests/websocket-sync.spec.ts`. **Don't re-test generic sync in feature tests.**

```typescript
// ❌ BAD: Re-testing WebSocket sync in feature file
test('should see real-time updates when player joins', async ({ page, context }) => {
  const roomCode = await createTestSession(page);
  const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
  await expect(page.locator('text=Alice')).toBeVisible(); // Generic sync - already tested!
});

// ✅ GOOD: Test feature-specific data, not the sync mechanism
test('should update reputation with correct value after resolution', async ({ page, context }) => {
  const { alicePage } = await createGameInSecondRound(page, context);
  const reputation = await alicePage.getByTestId('reputation-zmail');
  await expect(reputation).toContainText('85'); // Specific business value
});
```

**Reference**: See `tests/websocket-sync.spec.ts` for WebSocket sync coverage.

## Validation Checklist

Before submitting a test, verify:

- [ ] All test IDs are in TEST-IDS-REFERENCE.md
- [ ] Helpers are used for setup (not manual navigation)
- [ ] `closePages()` is called with ALL pages
- [ ] Test focuses on business logic, not setup validation
- [ ] No unnecessary happy path tests
- [ ] Numeric values are verified (budgets, reputation, etc.)
- [ ] Timeouts are simple (`waitForTimeout`) not complex waits
- [ ] No console.log() - use Pino logger if needed
- [ ] Test names describe WHAT is being tested, not HOW

## Red Flags to Watch For

🚩 **Re-testing helpers**: If you're testing that a session was created successfully, you're testing `createTestSession()`, not your feature.

🚩 **Generic visibility tests**: `await expect(element).toBeVisible()` without checking actual content/values.

🚩 **Missing cleanup**: No `closePages()` in afterEach or test end.

🚩 **Wrong test IDs**: Using test IDs not in TEST-IDS-REFERENCE.md.

🚩 **Over-complicated waits**: Complex promise races instead of simple timeouts.

🚩 **Testing the same thing multiple times**: If another test already covers it, don't duplicate.

## Example: Good vs Bad Test

### ❌ BAD - Tests setup, not feature
```typescript
test('should load ESP dashboard', async ({ page, context }) => {
  const roomCode = await createTestSession(page);
  const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
  await page.click('button:has-text("Start Game")');
  await alicePage.waitForURL(/\/game\/.+\/esp\/.+/);

  // Just checking it loaded - not testing any feature
  await expect(alicePage.getByTestId('esp-dashboard')).toBeVisible();
  await closePages(page, alicePage);
});
```

### ✅ GOOD - Tests business logic
```typescript
test('should deduct acquisition cost from budget', async ({ page, context }) => {
  const { alicePage } = await createGameInPlanningPhase(page, context);

  // Get initial budget
  const initialBudget = await extractBudget(alicePage, 'budget-current');
  expect(initialBudget).toBe(1000); // Known starting value

  // Acquire client with known cost
  await alicePage.getByTestId('open-client-marketplace').click();
  const firstClient = alicePage.getByTestId('client-card-0');
  const costText = await firstClient.getByTestId('client-cost').textContent();
  const cost = parseInt(costText?.replace(/[^0-9]/g, '') || '0');

  await firstClient.getByTestId('acquire-button').click();
  await alicePage.waitForTimeout(500);

  // Verify calculation: budget = initial - cost
  const newBudget = await extractBudget(alicePage, 'budget-current');
  expect(newBudget).toBe(initialBudget - cost);

  await closePages(page, alicePage);
});
```

## Task Execution

When asked to write or review an E2E test:

1. **Load context files** (helpers and TEST-IDS-REFERENCE.md)
2. **Apply Boy Scout Rule** - Scan file for quick wins (cleanup, helpers, test IDs)
3. **Identify the feature** being tested (not the setup)
4. **Find similar tests** for pattern reference
5. **Choose the right approach** for setup:
   - Use API helpers for complex state setup (faster, more reliable)
   - Use UI interactions only when testing the UI itself
6. **Validate test IDs** against reference
7. **Focus test on business logic** (calculations, thresholds, rules)
8. **Ensure cleanup** with closePages()
9. **Review against checklist** before finalizing
10. **Report improvements** made beyond the primary task

## Output Format

When reviewing a test, provide:

1. **Summary**: What the test does (1-2 sentences)
2. **Boy Scout Opportunities**: Quick wins found in the file (cleanup, helpers, test IDs)
3. **Issues Found**: List of problems with explanations
4. **Suggested Fixes**: Concrete code changes
5. **Test ID Validation**: Confirm all IDs are valid or list invalid ones
6. **Helper Opportunities**: Point out where helpers could be used
7. **Cleanup Check**: Verify closePages() usage

When writing a test, provide:

1. **Test Structure**: Complete test code following template
2. **Setup Approach**: Explain why API helpers or UI interactions were chosen
3. **Helper Usage**: Which helpers are used and why
4. **Test IDs Used**: List all test IDs with references to where they're defined
5. **Business Logic Focus**: Explain what specific business rule is tested
6. **Cleanup**: Show closePages() usage
7. **Boy Scout Improvements**: List any additional improvements made to the file

---

**Remember**: The goal is to write focused, maintainable tests that verify business logic, not to re-test the framework or helpers. Trust what's already working, and test what matters for your feature.
