---
name: code-quality-evaluation
description: Evaluates generated code for maintainability, modularity, and long-term code health. Use when reviewing generated code, before merging features, or when assessing code quality for refactoring needs. Focuses on architecture, coupling, duplication, test quality (unit + E2E), and test performance—excluding aspects handled by automated tooling like linting or formatting.
version: 1.2.0
author: Christelle Grauer
tags:
  - code-review
  - maintainability
  - refactoring
  - quality-assessment
  - testing
  - e2e
  - performance
---

# Code Quality & Maintainability Evaluation

This Skill guides the evaluation of generated code focusing on **maintainability**, **modularity**, and **long-term code health**. It explicitly excludes aspects handled by automated tooling (linting, formatting, test execution via CI/CD).

## When to Use This Skill

- After generating a new module or feature
- Before merging generated code into main branch
- During code review sessions
- When assessing if refactoring is needed
- When code feels "hard to work with"

## Six Evaluation Pillars

### 1. 🏗️ Architecture & Structure

**Goal**: Code that's easy to navigate and modify

#### Key Questions
- Can I quickly locate where to add new functionality? (< 2 minutes)
- Are responsibilities clearly separated? (UI ≠ business logic ≠ state ≠ utilities)
- Are there any "god files" containing multiple unrelated responsibilities?

#### File Size Guidelines
```
✅ Target Limits:
- Svelte components: < 200 lines
- JavaScript modules: < 250 lines  
- Store modules: < 150 lines

🚩 Alert Threshold:
- Any file > 400 lines requires splitting
```

#### Directory Depth Rule
**Maximum 3 levels deep**

```bash
# ✅ GOOD: 3 levels
src/lib/game/reputation/calculator.js

# ❌ BAD: > 3 levels  
src/lib/features/game/core/engine/reputation/calculation/calculator.js
```

#### Quick Check Commands
```bash
# Find files exceeding size limits
find src -name "*.js" -o -name "*.svelte" | xargs wc -l | sort -rn | head -10

# Check directory depth
find src -type f | awk -F/ '{print NF-1}' | sort -rn | head -5
```

---

### 2. 🔄 Modularity & Coupling

**Goal**: Independent, interchangeable components

#### Decoupling Verification

**Bad Example: Tight Coupling**
```javascript
// ❌ Business logic knows about UI components
import { dashboard } from './components/Dashboard.svelte';

function calculateScore() {
    const score = /* calculation */;
    dashboard.updateUI(score); // ❌ Direct UI manipulation
}
```

**Good Example: Loose Coupling**
```javascript
// ✅ Logic is UI-agnostic
import { scoreStore } from './stores/score';

function calculateScore() {
    const score = /* calculation */;
    scoreStore.set(score); // ✅ UI subscribes if needed
}
```

#### Component Reusability Checklist
When reviewing a component, verify:
- [ ] Has generic naming (no specific use-case references like `ESPDashboardForRound2`)
- [ ] Props are clearly documented with types
- [ ] No hardcoded business logic or magic numbers
- [ ] Can be used in different contexts without modification

**Reusability Test**: "Could I use this component in a similar project without major changes?"

#### Import Depth Rule
**Maximum 1 level up** (`../`)

```javascript
// ❌ BAD: Deep relative imports
import { calc } from '../../../utils/reputation/calculator.js';

// ✅ GOOD: Use import aliases
import { calc } from '$lib/utils/reputation/calculator';
```

**Detection Command**:
```bash
# Find deep imports (red flag)
grep -r "from '\.\./\.\./\.\." src/lib/
```

---

### 3. 🎯 DRY (Don't Repeat Yourself)

**Goal**: Single Source of Truth

#### Automated Duplication Detection

```bash
# Install and run duplication detector
npx jscpd src/ --threshold 10 --format "markdown" -o duplication-report.md
```

#### Acceptable Thresholds
| Level | Duplication | Action |
|-------|-------------|--------|
| 🟢 Excellent | < 5% | No action needed |
| 🟡 Acceptable | 5-10% | Monitor, plan cleanup |
| 🔴 Poor | > 10% | Refactoring required |

#### Common Duplication Patterns

**Type 1: Duplicated Calculations**
```javascript
// ❌ BAD: Same formula in multiple files
// file-a.js
const revenue = client.baseRevenue * (1 + bonuses.total);

// file-b.js  
const revenue = client.baseRevenue * (1 + bonuses.total);

// ✅ GOOD: Shared utility
// lib/utils/revenue-calculator.js
export const calculateRevenue = (client, bonuses) => 
    client.baseRevenue * (1 + bonuses.total);
```

**Type 2: Duplicated Validation**
```javascript
// ❌ BAD: Validation repeated everywhere
if (!client || !client.id || client.budget < 0) {
    throw new Error('Invalid client');
}

// ✅ GOOD: Centralized validator
// lib/validators/client-validator.js
export const validateClient = (client) => {
    if (!client?.id || client.budget < 0) {
        throw new Error('Invalid client');
    }
};
```

**Type 3: Nearly Identical Components**
```svelte
<!-- ❌ BAD: Two 70%+ similar components -->
<ESPCard.svelte>    <!-- 150 lines, ESP-specific -->
<DestinationCard.svelte>    <!-- 145 lines, Destination-specific -->

<!-- ✅ GOOD: One unified component with variants -->
<PlayerCard.svelte role={esp|destination}>    <!-- 180 lines, handles both -->
```

---

### 4. ✅ Test Quality

**Goal**: Effective tests without redundancy

#### Avoiding Redundant Tests

**Bad Example: Repetitive Tests**
```javascript
// ❌ BAD: Testing same logic multiple times
describe('calculateReputation', () => {
    test('with Gmail at 85', () => {
        expect(calculateReputation('gmail', 85)).toBe('good');
    });
    
    test('with Gmail at 90', () => {
        expect(calculateReputation('gmail', 90)).toBe('excellent');
    });
    
    test('with Gmail at 95', () => { // Redundant!
        expect(calculateReputation('gmail', 95)).toBe('excellent');
    });
});
```

**Good Example: Parameterized Tests**
```javascript
// ✅ GOOD: Single test with multiple cases
describe('calculateReputation', () => {
    test.each([
        ['gmail', 85, 'good'],
        ['gmail', 90, 'excellent'],
        ['outlook', 50, 'poor'],
        ['yahoo', 70, 'good']
    ])('%s with score %i returns %s', (destination, score, expected) => {
        expect(calculateReputation(destination, score)).toBe(expected);
    });
});
```

#### Coverage Interpretation

```bash
# Generate coverage report
npm run test -- --coverage
```

**Target Metrics**:
- Line coverage: **> 80%**
- Branch coverage: **> 70%**
- Function coverage: **> 85%**

**Important**: 100% coverage ≠ good tests. Focus on meaningful assertions.

#### Tests Should Cover
- [ ] **Happy path**: Normal, expected usage
- [ ] **Critical edge cases**: Empty inputs, boundary values, zero/null
- [ ] **Expected errors**: Invalid data, business rule violations

#### Tests to Avoid
```javascript
// ❌ USELESS: Testing trivial getters/setters
test('getName returns the name', () => {
    player.name = 'Alice';
    expect(player.name).toBe('Alice'); // Pointless!
});

// ✅ USEFUL: Testing business logic
test('acquiring client deducts correct cost from budget', () => {
    const player = new Player({ budget: 1000 });
    player.acquireClient({ cost: 200 });
    
    expect(player.budget).toBe(800);
    expect(player.clients).toHaveLength(1);
});
```

---

### 5. 🎭 E2E Test Quality

**Goal**: Comprehensive end-to-end testing that validates real user workflows

#### Why E2E Tests Matter

Unit tests alone miss critical issues:
- ❌ API route handlers not tested
- ❌ UI components not validated
- ❌ Real integration paths uncovered
- ❌ WebSocket/real-time features untested

**E2E tests fill this gap** by testing the full stack together.

#### E2E Test Coverage Analysis

```bash
# Run E2E tests (Playwright example)
npm run test:e2e

# Count E2E test files
find tests -name "*.spec.ts" -o -name "*.e2e.ts" | wc -l

# Check E2E duplication
npx jscpd tests/ --min-tokens 50 --min-lines 5
```

#### Combined Coverage Calculation

**Important**: Unit test coverage tools (Vitest, Jest) only measure `src/lib/` business logic. They DON'T measure:
- API route handlers (typically 5-10% of codebase)
- UI components (typically 30-40% of codebase)
- Real WebSocket/integration paths

**Method to calculate combined coverage:**

```
Total Production Code = lib/ + routes/ + stores/
├─ Unit Test Coverage (Vitest):    Business logic only
├─ E2E Test Coverage (Playwright): API + UI + Integration
└─ Combined Coverage = Unit + E2E (minus overlap)
```

**Example**:
```
Production: 2,500 lines total
├─ lib/ (business logic):    1,400 lines → Unit tests: 70% = 980 lines
├─ routes/ (API + UI):        1,000 lines → E2E tests: 90% = 900 lines
└─ stores/:                     100 lines → Both cover: 80% = 80 lines

Combined Coverage = (980 + 900 + 80) / 2,500 = 78.4%
```

#### Target E2E Coverage

| Layer | Target | Rationale |
|-------|--------|-----------|
| **API Routes** | > 90% | All endpoints should be integration tested |
| **UI Components** | > 75% | Main user flows + error states |
| **User Journeys** | > 90% | Each user story scenario |
| **Real-time Features** | > 80% | WebSocket, SSE, polling |

#### E2E Test Quality Checklist

- [ ] **Helper functions** reduce duplication (e.g., `createTestSession()`)
- [ ] **Multi-user testing** for concurrent scenarios (race conditions)
- [ ] **Real integration**: Tests use actual build, not dev server
- [ ] **Accessibility tests** included (ARIA, keyboard navigation)
- [ ] **Error states tested** (network failures, invalid inputs)
- [ ] **Authentication flows** validated (if applicable)
- [ ] **Visual regression** (optional but recommended)

#### E2E Test Organization

**Good Structure**:
```
tests/
├─ fixtures/
│  └─ test-helpers.ts          # Shared helpers
├─ feature-a.spec.ts            # One feature per file
├─ feature-b.spec.ts
└─ accessibility.spec.ts        # Cross-cutting concerns
```

**Anti-pattern**:
```
tests/
└─ all-tests.spec.ts            # ❌ 2000-line god file
```

#### Common E2E Issues

**❌ Flaky Tests**
```javascript
// BAD: Hard-coded timeouts
await page.waitForTimeout(5000); // Flaky!

// GOOD: Wait for specific conditions
await expect(page.locator('[data-testid="result"]')).toBeVisible();
```

**❌ Duplication in E2E Tests**
```javascript
// BAD: Repeated setup code
test('scenario 1', async () => {
  await page.goto('/');
  await page.click('text=Login');
  await page.fill('#username', 'test');
  // ... test logic
});

// GOOD: Extract helper
async function login(page, username) {
  await page.goto('/');
  await page.click('text=Login');
  await page.fill('#username', username);
}
```

#### Duplication Thresholds (E2E Tests)

| Level | Duplication | Action |
|-------|-------------|--------|
| 🟢 Excellent | < 3% | No action |
| 🟡 Acceptable | 3-7% | Extract helpers |
| 🔴 Poor | > 7% | Refactor required |

**Note**: E2E tests should have LOWER duplication than unit tests because setup is more expensive.

---

### 6. ⚡ Test Performance & Execution Time

**Goal**: Fast, reliable test suite that doesn't slow development

#### Why Test Speed Matters

- ❌ Slow tests reduce developer productivity
- ❌ Long feedback loops discourage running tests
- ❌ CI/CD pipeline bottlenecks
- ✅ Fast tests = run more often = catch bugs earlier

#### Benchmark Execution Times

```bash
# Unit tests (Vitest/Jest)
npm run test 2>&1 | grep "Duration"

# E2E tests (Playwright)
npm run test:e2e 2>&1 | tail -5

# Combined
npm run test:all
```

#### Target Execution Times

| Test Type | Files | Target Time | Acceptable | 🔴 Slow |
|-----------|-------|-------------|------------|---------|
| **Unit Tests** | < 50 | < 5 sec | 5-15 sec | > 15 sec |
| **Unit Tests** | 50-200 | < 15 sec | 15-45 sec | > 45 sec |
| **Unit Tests** | > 200 | < 45 sec | 45-120 sec | > 2 min |
| **E2E Tests** | < 20 | < 30 sec | 30-90 sec | > 2 min |
| **E2E Tests** | 20-50 | < 90 sec | 90-180 sec | > 3 min |
| **E2E Tests** | > 50 | < 3 min | 3-5 min | > 5 min |

#### Performance Calculation

**Unit Test Speed (tests/second)**:
```
Speed = Total Tests / Duration (seconds)

Example:
67 tests in 1.2 seconds = 55.8 tests/sec  ✅ Excellent
67 tests in 8.5 seconds = 7.9 tests/sec   🟡 Acceptable
67 tests in 45 seconds = 1.5 tests/sec    🔴 Slow
```

**E2E Test Speed (tests/minute)**:
```
Speed = Total E2E Tests / Duration (minutes)

Example:
29 E2E tests in 0.6 min = 48 tests/min   ✅ Excellent
29 E2E tests in 2.5 min = 11.6 tests/min 🟡 Acceptable
29 E2E tests in 8 min = 3.6 tests/min    🔴 Slow
```

#### Test Performance Report Template

```bash
=== Test Performance Report ===
Generated: $(date)

📊 UNIT TESTS (Vitest)
Files: 4 passed
Tests: 67 passed
Duration: 948ms
Speed: 70.7 tests/sec ✅

🎭 E2E TESTS (Playwright)
Files: 2 passed
Tests: 29 passed
Duration: 36.8s
Speed: 47.3 tests/min ✅

🔄 COMBINED METRICS
Total Tests: 96
Total Duration: 37.7s
Overall Status: ✅ Fast
```

#### Performance Optimization Strategies

**1. Parallelize Tests**
```javascript
// Vitest: Runs in parallel by default
// Playwright: Configure workers
export default {
  workers: process.env.CI ? 2 : 4, // Parallel execution
  fullyParallel: true
};
```

**2. Skip Slow Tests in Watch Mode**
```javascript
test.skipIf(process.env.WATCH)('slow integration test', async () => {
  // Expensive test
});
```

**3. Use Test Fixtures Efficiently**
```javascript
// ❌ BAD: Create new DB for every test (slow)
beforeEach(async () => {
  await createDatabase();
});

// ✅ GOOD: Reuse DB, just clean data
beforeEach(async () => {
  await cleanDatabase(); // Much faster
});
```

**4. Mock External Services**
```javascript
// E2E: Use real services
// Unit: Mock expensive operations

// ❌ BAD: Real API call in unit test
test('fetches user', async () => {
  const user = await fetch('https://api.example.com/user');
});

// ✅ GOOD: Mock in unit test
test('fetches user', async () => {
  mockFetch.mockResolvedValue({ id: 1, name: 'Test' });
});
```

#### Red Flags for Slow Tests

- 🚩 Any single unit test > 1 second
- 🚩 Any single E2E test > 10 seconds
- 🚩 Tests calling real external APIs
- 🚩 Tests with `setTimeout` > 100ms
- 🚩 Database migrations in `beforeEach`
- 🚩 Tests rebuilding the entire app

#### CI/CD Performance Targets

| Pipeline Stage | Target | Acceptable | 🔴 Slow |
|----------------|--------|------------|---------|
| **Lint + Type Check** | < 30s | 30-60s | > 60s |
| **Unit Tests** | < 1 min | 1-3 min | > 3 min |
| **E2E Tests** | < 5 min | 5-10 min | > 10 min |
| **Full Pipeline** | < 8 min | 8-15 min | > 15 min |

**Developer Experience Target**: Full test suite runs in < 1 minute locally for fast feedback.

---

## Quick Evaluation Matrix (20 min)

Use this matrix after generating code:

| Criterion | 🔴 Bad | 🟡 Medium | 🟢 Good |
|-----------|--------|-----------|---------|
| **Files > 300 lines** | > 5 files | 2-4 files | 0-1 file |
| **Deep imports** (`../../../`) | Present | Rare (< 5) | None |
| **Code duplication** | > 10% | 5-10% | < 5% |
| **Reusable components** | < 50% | 50-70% | > 70% |
| **UI ↔ logic coupling** | Strong | Medium | Weak |
| **Redundant tests** | Many | Some | None |
| **Unit test coverage** | < 70% | 70-85% | > 85% |
| **E2E test coverage** | < 50% | 50-80% | > 80% |
| **Combined coverage** | < 65% | 65-80% | > 80% |
| **E2E duplication** | > 7% | 3-7% | < 3% |
| **Unit test speed** | < 5 tests/s | 5-20 tests/s | > 20 tests/s |
| **E2E test speed** | < 10 tests/min | 10-30 tests/min | > 30 tests/min |
| **Total test time** | > 3 min | 1-3 min | < 1 min |

### Decision Tree

**Majority 🟢**: 
- ✅ Code is maintainable
- ✅ Merge confidently
- ✅ No immediate action needed

**Majority 🟡**:
- ⚠️ Plan 1-2 hours of targeted refactoring
- ⚠️ Create refactoring tickets
- ⚠️ Don't let it accumulate

**Majority 🔴**:
- 🚫 Refactoring required before merge
- 🚫 Code review meeting recommended
- 🚫 Consider alternative approach

---

## Refactoring Strategies

### Strategy 1: Split Large Files 🔴

**When**: File > 400 lines or handling > 3 responsibilities

**Method**:
1. Identify logical blocks/responsibilities
2. Extract each block into a dedicated module
3. Original file becomes an orchestrator/coordinator

**Example**:
```javascript
// ❌ BEFORE: game-engine.js (800 lines)
export class GameEngine {
    calculateReputation() { /* 150 lines */ }
    processClientAcquisition() { /* 200 lines */ }
    resolveRound() { /* 180 lines */ }
    applyDramaEvents() { /* 120 lines */ }
    updateScores() { /* 150 lines */ }
}

// ✅ AFTER: Modular structure
// game-engine.js (120 lines - orchestration only)
import { ReputationCalculator } from './reputation/calculator';
import { ClientManager } from './clients/manager';
import { RoundResolver } from './rounds/resolver';
import { DramaEngine } from './drama/engine';
import { ScoreTracker } from './scoring/tracker';

export class GameEngine {
    constructor() {
        this.reputation = new ReputationCalculator();
        this.clients = new ClientManager();
        this.rounds = new RoundResolver();
        this.drama = new DramaEngine();
        this.scores = new ScoreTracker();
    }
    
    // Coordinate between modules
    processRound() {
        this.rounds.resolve();
        this.reputation.recalculate();
        this.scores.update();
    }
}
```

### Strategy 2: Eliminate Duplication 🔴

**When**: Duplication > 7% or same code in 3+ places

**3-Step Process**:

1. **Identify**: Run `npx jscpd src/` or manual code review
2. **Extract**: Create reusable function/component/constant
3. **Replace**: Update all occurrences to use the shared code

**Example**:
```javascript
// 1. IDENTIFY - Found in 3 files
const score = (reputation * 0.5) + (engagement * 0.3) + (auth * 0.2);

// 2. EXTRACT - Create shared utility
// lib/utils/scoring.js
const SCORE_WEIGHTS = {
    reputation: 0.5,
    engagement: 0.3,
    authentication: 0.2
};

export const calculateWeightedScore = (reputation, engagement, auth) => {
    return (reputation * SCORE_WEIGHTS.reputation) +
           (engagement * SCORE_WEIGHTS.engagement) +
           (auth * SCORE_WEIGHTS.authentication);
};

// 3. REPLACE - In all 3 files
import { calculateWeightedScore } from '$lib/utils/scoring';
const score = calculateWeightedScore(reputation, engagement, auth);
```

### Strategy 3: Reduce Coupling 🔴

**When**: Business logic imports UI components or modules have circular dependencies

**Technique: Dependency Injection**

```javascript
// ❌ BEFORE: Tight coupling
class GameEngine {
    sendNotification(message) {
        NotificationService.show(message); // Hardcoded dependency
    }
    
    logEvent(event) {
        AnalyticsService.track(event); // Hardcoded dependency
    }
}

// ✅ AFTER: Loose coupling via injection
class GameEngine {
    constructor(notificationService, analyticsService) {
        this.notifications = notificationService; // Injected
        this.analytics = analyticsService; // Injected
    }
    
    sendNotification(message) {
        this.notifications.show(message); // Uses injected service
    }
    
    logEvent(event) {
        this.analytics.track(event); // Uses injected service
    }
}

// Usage
const engine = new GameEngine(
    new NotificationService(),
    new AnalyticsService()
);
```

**Benefits**:
- Easy to test (inject mocks)
- Easy to replace implementations
- Clear dependencies

### Strategy 4: Consolidate Tests 🔴

**When**: Multiple nearly-identical tests or excessive test duplication

```javascript
// ❌ BEFORE: 10 similar tests (300 lines)
describe('reputation calculation', () => {
    test('client A with score 85', () => { /* test */ });
    test('client B with score 85', () => { /* test */ });
    test('client C with score 85', () => { /* test */ });
    // ... 7 more nearly identical tests
});

// ✅ AFTER: Parameterized tests (50 lines)
describe('reputation calculation', () => {
    const testCases = [
        { client: 'clientA', score: 85, expected: 'good' },
        { client: 'clientB', score: 90, expected: 'excellent' },
        { client: 'clientC', score: 50, expected: 'poor' },
        // ... more cases
    ];
    
    test.each(testCases)(
        '$client with score $score returns $expected',
        ({ client, score, expected }) => {
            expect(calculateReputation(client, score)).toBe(expected);
        }
    );
});
```

---

## Final Maintainability Checklist

Before considering code production-ready:

### ✅ Structure
- [ ] No files > 300 lines (exceptions must be justified)
- [ ] Directory hierarchy ≤ 3 levels
- [ ] Clear separation: UI / Logic / State / Utils
- [ ] Relative imports limited to `../` (use aliases)

### ✅ Modularity  
- [ ] Each module has single, clear responsibility
- [ ] Components are generic (>70% potentially reusable)
- [ ] No coupling between UI and business logic
- [ ] Dependencies are explicit (no hidden globals)

### ✅ DRY
- [ ] Code duplication < 5% (verified via jscpd)
- [ ] Shared constants centralized
- [ ] Business formulas in dedicated utility functions
- [ ] Similar components unified with variants/props

### ✅ Unit Tests
- [ ] Business module coverage > 80%
- [ ] No redundant tests (use parameterized tests)
- [ ] Unit tests focus on logic, not implementation details
- [ ] Each critical edge case is tested
- [ ] Unit tests run in < 15 seconds

### ✅ E2E Tests
- [ ] API routes coverage > 90%
- [ ] UI components coverage > 75%
- [ ] User journey scenarios > 90%
- [ ] Helper functions reduce duplication (< 3%)
- [ ] Multi-user/concurrent scenarios tested
- [ ] E2E tests run in < 2 minutes

### ✅ Test Performance
- [ ] Unit test speed > 20 tests/second
- [ ] E2E test speed > 30 tests/minute
- [ ] Combined test suite < 1 minute locally
- [ ] No single unit test > 1 second
- [ ] No single E2E test > 10 seconds

### ✅ Implicit Documentation
- [ ] Code reads like pseudocode (clear naming)
- [ ] Intuitive structure (quick to locate modifications)
- [ ] Functions are short (< 30 lines ideally)
- [ ] Complex logic has brief explanatory comments

---

## Continuous Quality Monitoring

### Weekly Health Check Script

Create `scripts/check-quality.sh`:

```bash
#!/bin/bash
# Run weekly to track maintainability trends

echo "=== Code Quality Metrics ==="
echo "Generated: $(date)"
echo ""

# 1. File size distribution
echo "📏 FILES EXCEEDING SIZE LIMITS:"
find src -name "*.js" -o -name "*.svelte" | \
    xargs wc -l | \
    awk '$1 > 250 {print $2 " (" $1 " lines)"}' | \
    sort -t'(' -k2 -rn

echo ""

# 2. Code duplication
echo "🔄 DUPLICATION RATE:"
npx jscpd src/ --threshold 10 --format csv | grep "Total:" || echo "No duplication detected"

echo ""

# 3. Unit test coverage
echo "✅ UNIT TEST COVERAGE:"
npm run test -- --coverage --silent 2>/dev/null | grep "All files"

echo ""

# 4. E2E test metrics
echo "🎭 E2E TEST METRICS:"
echo "Test count: $(find tests -name '*.spec.ts' -o -name '*.e2e.ts' 2>/dev/null | wc -l | xargs) files"
echo "Duplication: $(npx jscpd tests/ --min-tokens 50 2>/dev/null | grep 'Total:' | awk '{print $NF}')"

echo ""

# 5. Test performance
echo "⚡ TEST PERFORMANCE:"
echo "Running test suite..."
npm run test --silent 2>&1 | grep -E "(Duration|Test Files|Tests)" | tail -3

echo ""

# 6. Deep imports (coupling indicator)
echo "🔗 DEEP IMPORTS (coupling issues):"
grep -r "from '\.\./\.\./\.\." src/ 2>/dev/null | wc -l | \
    awk '{if ($1 > 0) print $1 " instances found ⚠️"; else print "None found ✅"}'

echo ""
echo "=== End Report ==="
```

**Usage**:
```bash
chmod +x scripts/check-quality.sh
./scripts/check-quality.sh > quality-report.txt
```

### Alert Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| File size | > 300L | Plan splitting session |
| Duplication (prod) | > 7% | Schedule refactoring |
| Duplication (E2E) | > 5% | Extract helper functions |
| Unit coverage | < 75% | Add missing unit tests |
| Combined coverage | < 75% | Add E2E tests for UI/API |
| Unit test speed | < 10 tests/s | Optimize slow tests |
| E2E test time | > 3 min | Parallelize or optimize |
| Deep imports | > 10 | Review architecture |

---

## Integration with Development Workflow

### During Code Generation

**Set expectations upfront**:
```
Generate the reputation calculator module following these constraints:
- Maximum 250 lines
- No code duplication
- Fully testable (no UI coupling)
- Use dependency injection for external services
```

### After Generation

**Run quick evaluation** (20-25 min):
1. Check file sizes: `find src -name "*.js" | xargs wc -l | sort -rn | head -10`
2. Run duplication check (production): `npx jscpd src/`
3. Run duplication check (E2E tests): `npx jscpd tests/`
4. Review 2-3 key files manually using the evaluation matrix
5. Run unit tests with coverage: `npm run test -- --coverage`
6. Run E2E tests and measure time: `time npm run test:e2e`
7. Calculate combined coverage (unit + E2E)

### Before Merging

**Final validation**:
```bash
# Run all checks
./scripts/check-quality.sh

# Review results
# - All 🟢? → Merge
# - Some 🟡? → Create refactoring tickets, then merge
# - Any 🔴? → Refactor before merge
```

---

## Success Criteria

**Code is considered maintainable when**:

1. **Navigation**: Developer can locate where to add functionality in < 2 minutes
2. **Impact**: Adding a feature requires modifying ≤ 3 files typically
3. **DRY**: Same logic/component isn't implemented multiple times
4. **Confidence**: Tests provide confidence without slowing development
5. **Longevity**: Codebase remains understandable after 6 months

---

## Common Anti-Patterns to Avoid

### ❌ The God File
```javascript
// utils.js - 2000 lines of unrelated functions
export function calculateScore() { }
export function formatDate() { }
export function validateEmail() { }
export function parseJSON() { }
// ... 100+ more functions
```

### ❌ The Circular Dependency
```javascript
// player.js
import { GameEngine } from './game-engine';

// game-engine.js  
import { Player } from './player'; // ❌ Circular!
```

### ❌ The Copy-Paste Inheritance
```javascript
// Three 90% identical files that should be one with variants
ESPDashboard.svelte      // 450 lines
DestinationDashboard.svelte  // 440 lines  
AdminDashboard.svelte    // 435 lines
```

### ❌ The Test Theater
```javascript
// Tests that verify implementation details, not behavior
test('uses correct CSS class', () => {
    expect(element.className).toBe('btn-primary'); // Brittle!
});
```

---

## Version History

- **1.1.0** (2025-01-27): E2E Testing & Performance Update
  - Added Pillar 5: E2E Test Quality evaluation
  - Added Pillar 6: Test Performance & Execution Time metrics
  - Updated evaluation matrix with combined coverage metrics
  - Added E2E test duplication thresholds
  - Added test speed benchmarks and targets
  - Enhanced checklist with E2E and performance criteria

- **1.0.0** (2025-01-27): Initial release
  - Four evaluation pillars
  - Quick evaluation matrix
  - Refactoring strategies
  - Quality monitoring script

---

## Related Resources

- [SvelteKit Best Practices](https://kit.svelte.dev/docs/best-practices)
- [Clean Code Principles](https://github.com/ryanmcdermott/clean-code-javascript)
- [Refactoring Catalog](https://refactoring.guru/refactoring/catalog)

---

**Remember**: Perfect code doesn't exist. The goal is **code that's easy to change safely**. This Skill helps you identify when code crosses from "good enough" to "maintenance nightmare" before it's too late.