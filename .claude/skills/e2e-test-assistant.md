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
await gmailPage.locator('[data-testid="lock-in-button"]').click();
await page.waitForTimeout(2000);

// ✅ GOOD - Use helper
await lockInAllPlayers([alicePage, bobPage, gmailPage]);
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

#### From `game-setup.ts`:
- `createTestSession(page)` - Create session, return room code
- `addPlayer(context, roomCode, displayName, role, teamName)` - Join player to session
- `closePages(...pages)` - **CRITICAL**: Cleanup to prevent resource leaks
- `createSessionWithMinimumPlayers(facilitatorPage, context)` - 1 ESP + 1 Destination
- `createSessionWithMultiplePlayers(facilitatorPage, context)` - 3 ESP + 1 Destination
- `createGameInPlanningPhase(facilitatorPage, context)` - Game started, planning phase
- `createGameWithDestinationPlayer(facilitatorPage, context)` - Includes acquired clients
- `createGameInSecondRound(facilitatorPage, context)` - Advanced to round 2
- `createGameWithYahooDestination(facilitatorPage, context)` - Yahoo-specific tests
- `createGameWithDestination(facilitatorPage, context, 'Gmail'|'Outlook'|'Yahoo')` - Generic destination
- `createGameWith2ESPTeams(facilitatorPage, context)` - 2 ESP teams
- `createGameWith3ESPTeams(facilitatorPage, context)` - 3 ESP teams
- `createGameWith5ESPTeams(facilitatorPage, context)` - 5 ESP teams for filtering tests

#### From `client-management.ts`:
- `acquireClient(page, roomCode, teamName, clientId)` - Acquire via API
- `toggleClientStatus(page, roomCode, teamName, clientId, 'Active'|'Paused')` - Change status
- `configureOnboarding(page, roomCode, teamName, clientId, warmup, listHygiene)` - Set onboarding
- `getPortfolio(page, roomCode, teamName)` - Fetch portfolio data
- `openClientManagementModal(page)` - Open modal with wait
- `closeClientManagementModal(page)` - Close modal
- `waitForClientManagementModal(page)` - Wait for modal ready
- `getAvailableClientIds(page, roomCode, teamName)` - Get marketplace clients

#### From `e2e-actions.ts`:
- `waitForDashboardReady(page, 'esp'|'destination', timeout)` - Wait for test API ready
- `openModal(page, buttonTestId, modalTestId, timeout)` - Generic modal opener
- `performPurchaseAction(page, buttonLocator, options)` - Handle purchase flow
- `extractBudget(page, testId)` - Parse budget from display
- `extractNumeric(locator)` - Parse any numeric value
- `waitForContentUpdate(locator, expectedPattern, timeout)` - Wait for UI update
- `lockInAllPlayers(pages, waitTime)` - Lock in multiple players

### 3. Test ID Validation

**Before using any test ID:**
1. Check if it exists in TEST-IDS-REFERENCE.md
2. Verify correct naming pattern (kebab-case)
3. Use dynamic patterns correctly:
   - `filtering-item-{espName}` → `filtering-item-sendwave` (lowercase, no spaces)
   - `reputation-{destName}` → `reputation-gmail` (lowercase)
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

### 4. Resource Cleanup (CRITICAL)

**ALWAYS use `closePages()` in `afterEach` or at end of test:**

```typescript
import { closePages } from './helpers/game-setup';

test.afterEach(async () => {
  // Include ALL pages created in the test
  await closePages(page, alicePage, bobPage, gmailPage);
});
```

**Common Mistake:** Forgetting to close the facilitator `page` variable.

### 5. Test Structure Template

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

### 6. Common Patterns

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
const reputation = await alicePage.getByTestId('reputation-gmail');
await expect(reputation).toContainText('85'); // After resolution calculation

// ❌ Don't just check visibility
await expect(reputation).toBeVisible(); // Too generic
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
5. **Choose the right helper** for setup
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
2. **Helper Usage**: Which helpers are used and why
3. **Test IDs Used**: List all test IDs with references to where they're defined
4. **Business Logic Focus**: Explain what specific business rule is tested
5. **Cleanup**: Show closePages() usage
6. **Boy Scout Improvements**: List any additional improvements made to the file

---

**Remember**: The goal is to write focused, maintainable tests that verify business logic, not to re-test the framework or helpers. Trust what's already working, and test what matters for your feature.
