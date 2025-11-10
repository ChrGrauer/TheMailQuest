# US-3.3 Iteration 3 Implementation Plan
## Authentication Impact

**Date:** 2025-11-07
**Status:** Ready for Implementation
**Methodology:** ATDD (Acceptance Test-Driven Development)

---

## 📋 Overview

### Current Status (Completed)
- ✅ **Iteration 1:** Basic volume and revenue calculation
- ✅ **Iteration 2:** Reputation-based delivery success with fixed zones

### Iteration 3 Goal
**Implement SPF, DKIM, DMARC authentication effects on delivery and reputation**

### Key Mechanics to Add
1. **Delivery Bonuses:** SPF (+5%), DKIM (+8%), DMARC (+12%) - cumulative
2. **Reputation Bonuses:** SPF (+2), DKIM (+3), DMARC (+5) per destination per round
3. **DMARC Enforcement:** Round 3+ without DMARC = 80% rejection penalty
4. **Reputation Tracking:** Track per-destination reputation changes

---

## 🎯 Acceptance Criteria (from Feature File)

```gherkin
Scenario: Full authentication stack
  Given ESP "SendWave" has SPF, DKIM, and DMARC
  And base delivery success is 70%
  When resolution phase calculates
  Then delivery bonus should be 25% (5+8+12)
  And final delivery success should be 95% (70+25)
  And reputation change should be +10 (2+3+5)

Scenario: DMARC enforcement in Round 3
  Given current round is 3
  And ESP "SendWave" does NOT have DMARC
  And base delivery would be 85%
  When resolution phase calculates
  Then delivery success should be 17% (85% × 0.2)
  And warning message should show "80% rejection due to missing DMARC"

Scenario: Gradual reputation improvement
  Given ESP "SendWave" has SPF and DKIM
  And current reputation at Gmail is 70
  When resolution phase calculates
  Then new reputation at Gmail should be 75 (70 + 2 + 3)
```

---

## 🏗️ Architecture Components

### 1. Reputation Calculator (NEW)
**File:** `src/lib/server/game/calculators/reputation-calculator.ts`

**Purpose:** Calculate reputation changes from tech stack and client risk

**Responsibilities:**
- Calculate tech stack reputation bonuses (SPF +2, DKIM +3, DMARC +5)
- Calculate per-destination reputation changes
- Return breakdown of reputation changes for logging

**Note:** Iteration 3 focuses ONLY on tech stack bonuses. Client risk impact comes in Iteration 4.

### 2. Delivery Calculator (ENHANCE)
**File:** `src/lib/server/game/calculators/delivery-calculator.ts`

**Purpose:** Add authentication bonuses and DMARC penalty

**Enhancements:**
- Apply cumulative authentication delivery bonuses
- Apply DMARC missing penalty (Round 3+: multiply by 0.2)
- Track breakdown of all factors
- Cap final rate at 100%

---

## 📝 ATDD Workflow Steps

### Phase 1: Types and Config (Already Done ✅)
The following are already in place:
- `AUTHENTICATION_DELIVERY_BONUSES` in [technical-upgrades.ts](src/lib/config/technical-upgrades.ts)
- `getAuthenticationDeliveryBonus()` helper function
- `getAuthenticationReputationBonus()` helper function
- `DMARC_MISSING_PENALTY` constant

### Phase 2: Write Reputation Calculator Tests (Red Phase)

**File to create:** `src/lib/server/game/calculators/reputation-calculator.test.ts`

#### Test Suite Structure:
```typescript
describe('Reputation Calculator - Iteration 3: Authentication Impact', () => {
  describe('Tech stack reputation bonuses', () => {
    // Test: No tech = 0 bonus
    // Test: SPF only = +2
    // Test: SPF + DKIM = +5
    // Test: Full stack (SPF + DKIM + DMARC) = +10
    // Test: DKIM without SPF = +3 (no dependency checking here)
    // Test: Empty tech array = 0
  });

  describe('Per-destination reputation changes', () => {
    // Test: Tech bonus applies to all destinations equally
    // Test: Single destination receives bonus
    // Test: Three destinations all receive same bonus
    // Test: Empty destinations array returns empty result
  });

  describe('Breakdown tracking', () => {
    // Test: Breakdown includes tech bonus entry
    // Test: Multiple destinations each have their own breakdown
  });
});
```

#### Test Data Patterns:
```typescript
// Simple test with single destination
const result = calculateReputationChanges({
  techStack: ['spf', 'dkim'],
  destinations: ['Gmail']
});
expect(result.perDestination['Gmail'].techBonus).toBe(5);
expect(result.perDestination['Gmail'].totalChange).toBe(5);

// Multiple destinations
const result = calculateReputationChanges({
  techStack: ['spf', 'dkim', 'dmarc'],
  destinations: ['Gmail', 'Outlook', 'Yahoo']
});
expect(result.perDestination['Gmail'].techBonus).toBe(10);
expect(result.perDestination['Outlook'].techBonus).toBe(10);
expect(result.perDestination['Yahoo'].techBonus).toBe(10);
```

**Expected Result:** Tests fail because function doesn't exist yet ❌

---

### Phase 3: Implement Reputation Calculator (Green Phase)

**File to create:** `src/lib/server/game/calculators/reputation-calculator.ts`

#### Implementation Outline:
```typescript
import { getAuthenticationReputationBonus } from '$lib/config/technical-upgrades';
import type { ReputationParams, ReputationResult } from '../resolution-types';

export function calculateReputationChanges(params: ReputationParams): ReputationResult {
  // 1. Get tech bonus (same for all destinations)
  const techBonus = getAuthenticationReputationBonus(params.techStack);

  // 2. Build per-destination results
  const perDestination: Record<string, DestinationReputationChange> = {};

  for (const dest of params.destinations) {
    perDestination[dest] = {
      techBonus,
      clientImpact: 0, // Iteration 4
      warmupBonus: 0,  // Iteration 5
      totalChange: techBonus,
      breakdown: [
        { source: 'Authentication Tech', value: techBonus }
      ]
    };
  }

  // 3. Return result
  return {
    perDestination,
    volumeWeightedClientImpact: 0 // Iteration 4
  };
}
```

**Expected Result:** All reputation calculator tests pass ✅

---

### Phase 4: Update Resolution Types

**File to modify:** `src/lib/server/game/resolution-types.ts`

#### Add Reputation Types:
```typescript
/**
 * Reputation Calculator Types
 * US 3.3: Iteration 3
 */
export interface ReputationParams {
  techStack: string[];
  destinations: string[];
  // Future iterations will add:
  // clients?: Client[];
  // clientStates?: Record<string, ClientState>;
  // volumeData?: VolumeResult;
  // currentRound?: number;
}

export interface ReputationBreakdownItem {
  source: string;
  value: number;
}

export interface DestinationReputationChange {
  techBonus: number;
  clientImpact: number; // Iteration 4
  warmupBonus: number;  // Iteration 5
  totalChange: number;
  breakdown: ReputationBreakdownItem[];
}

export interface ReputationResult {
  perDestination: Record<string, DestinationReputationChange>;
  volumeWeightedClientImpact: number; // Iteration 4
}
```

#### Update DeliveryParams and DeliveryResult:
```typescript
export interface DeliveryParams {
  reputation: number;
  techStack: string[];
  currentRound: number;
}

export interface DeliveryResult {
  baseRate: number;
  authBonus: number;          // NEW for Iteration 3
  dmarcPenalty?: number;      // NEW for Iteration 3
  finalRate: number;
  zone: string;
  breakdown: DeliveryBreakdownItem[];  // NEW for Iteration 3
}

export interface DeliveryBreakdownItem {
  factor: string;
  value: number;
}
```

#### Update ESPResolutionResult:
```typescript
export interface ESPResolutionResult {
  volume: VolumeResult;
  reputation: ReputationResult;  // NEW for Iteration 3
  delivery: DeliveryResult;
  revenue: RevenueResult;
}
```

---

### Phase 5: Write Delivery Calculator Tests (Red Phase)

**File to modify:** `src/lib/server/game/calculators/delivery-calculator.test.ts`

#### Add Test Suite for Iteration 3:
```typescript
describe('Delivery Calculator - Iteration 3: Authentication Impact', () => {
  describe('Authentication delivery bonuses', () => {
    test('SPF only: +5% delivery', () => {
      const result = calculateDeliverySuccess({
        reputation: 75, // Good zone = 85% base
        techStack: ['spf'],
        currentRound: 1
      });

      expect(result.baseRate).toBe(0.85);
      expect(result.authBonus).toBe(0.05);
      expect(result.finalRate).toBe(0.90); // 85% + 5%
    });

    test('SPF + DKIM: +13% delivery', () => {
      const result = calculateDeliverySuccess({
        reputation: 75,
        techStack: ['spf', 'dkim'],
        currentRound: 1
      });

      expect(result.authBonus).toBe(0.13); // 5% + 8%
      expect(result.finalRate).toBe(0.98); // 85% + 13%
    });

    test('Full stack (SPF + DKIM + DMARC): +25% delivery', () => {
      const result = calculateDeliverySuccess({
        reputation: 75,
        techStack: ['spf', 'dkim', 'dmarc'],
        currentRound: 1
      });

      expect(result.authBonus).toBe(0.25); // 5% + 8% + 12%
      expect(result.finalRate).toBe(1.0); // 85% + 25% = 110%, capped at 100%
    });

    test('No tech: 0% bonus', () => {
      const result = calculateDeliverySuccess({
        reputation: 75,
        techStack: [],
        currentRound: 1
      });

      expect(result.authBonus).toBe(0);
      expect(result.finalRate).toBe(0.85); // Base only
    });
  });

  describe('Delivery rate capping', () => {
    test('Excellent zone (95%) + full auth (25%) = capped at 100%', () => {
      const result = calculateDeliverySuccess({
        reputation: 95, // Excellent = 95%
        techStack: ['spf', 'dkim', 'dmarc'],
        currentRound: 1
      });

      expect(result.baseRate).toBe(0.95);
      expect(result.authBonus).toBe(0.25);
      expect(result.finalRate).toBe(1.0); // Capped
    });
  });

  describe('DMARC enforcement (Round 3+)', () => {
    test('Round 3 without DMARC: 80% rejection penalty', () => {
      const result = calculateDeliverySuccess({
        reputation: 75, // Good zone = 85%
        techStack: ['spf', 'dkim'], // No DMARC
        currentRound: 3
      });

      expect(result.baseRate).toBe(0.85);
      expect(result.authBonus).toBe(0.13); // SPF + DKIM
      expect(result.dmarcPenalty).toBe(0.8); // 80% rejection
      // Calculation: (85% + 13%) × 20% = 98% × 0.2 = 19.6%
      expect(result.finalRate).toBeCloseTo(0.196, 2);
    });

    test('Round 3 with DMARC: no penalty', () => {
      const result = calculateDeliverySuccess({
        reputation: 75,
        techStack: ['spf', 'dkim', 'dmarc'],
        currentRound: 3
      });

      expect(result.dmarcPenalty).toBeUndefined();
      expect(result.finalRate).toBe(1.0); // 85% + 25% = capped
    });

    test('Round 2 without DMARC: no penalty yet', () => {
      const result = calculateDeliverySuccess({
        reputation: 75,
        techStack: ['spf'],
        currentRound: 2
      });

      expect(result.dmarcPenalty).toBeUndefined();
      expect(result.finalRate).toBe(0.90); // 85% + 5%
    });

    test('Round 4 without DMARC: penalty still applies', () => {
      const result = calculateDeliverySuccess({
        reputation: 75,
        techStack: [],
        currentRound: 4
      });

      expect(result.dmarcPenalty).toBe(0.8);
      // 85% × 20% = 17%
      expect(result.finalRate).toBeCloseTo(0.17, 2);
    });
  });

  describe('Breakdown tracking', () => {
    test('includes all factors in breakdown', () => {
      const result = calculateDeliverySuccess({
        reputation: 75,
        techStack: ['spf', 'dkim'],
        currentRound: 1
      });

      expect(result.breakdown).toEqual([
        { factor: 'Base (Good zone)', value: 0.85 },
        { factor: 'Authentication Bonus', value: 0.13 },
        { factor: 'Final Rate', value: 0.98 }
      ]);
    });

    test('includes DMARC penalty in breakdown', () => {
      const result = calculateDeliverySuccess({
        reputation: 75,
        techStack: [],
        currentRound: 3
      });

      expect(result.breakdown).toContainEqual({
        factor: 'DMARC Missing Penalty',
        value: -0.68 // Shows the reduction amount
      });
    });
  });
});
```

**Expected Result:** Tests fail because implementation not updated yet ❌

---

### Phase 6: Enhance Delivery Calculator (Green Phase)

**File to modify:** `src/lib/server/game/calculators/delivery-calculator.ts`

#### Implementation:
```typescript
import type { DeliveryParams, DeliveryResult, DeliveryBreakdownItem } from '../resolution-types';
import { getDeliverySuccessRate, getReputationStatus } from '$lib/config/metrics-thresholds';
import {
  getAuthenticationDeliveryBonus,
  DMARC_MISSING_PENALTY
} from '$lib/config/technical-upgrades';

export function calculateDeliverySuccess(params: DeliveryParams): DeliveryResult {
  // 1. Base rate from reputation zone
  const baseRate = getDeliverySuccessRate(params.reputation);
  const status = getReputationStatus(params.reputation);

  // 2. Authentication bonus (cumulative)
  const authBonus = getAuthenticationDeliveryBonus(params.techStack);

  // 3. Calculate intermediate rate
  let finalRate = baseRate + authBonus;

  // 4. Build breakdown
  const breakdown: DeliveryBreakdownItem[] = [
    { factor: `Base (${status.status} zone)`, value: baseRate }
  ];

  if (authBonus > 0) {
    breakdown.push({ factor: 'Authentication Bonus', value: authBonus });
  }

  // 5. DMARC enforcement (Round 3+)
  let dmarcPenalty: number | undefined;
  if (params.currentRound >= 3 && !params.techStack.includes('dmarc')) {
    dmarcPenalty = 1 - DMARC_MISSING_PENALTY; // 0.8 (80% rejection)
    const beforePenalty = finalRate;
    finalRate = finalRate * DMARC_MISSING_PENALTY; // Multiply by 0.2
    breakdown.push({
      factor: 'DMARC Missing Penalty',
      value: finalRate - beforePenalty // Negative value
    });
  }

  // 6. Cap at 100%
  finalRate = Math.min(finalRate, 1.0);

  breakdown.push({ factor: 'Final Rate', value: finalRate });

  return {
    baseRate,
    authBonus,
    dmarcPenalty,
    finalRate,
    zone: status.status,
    breakdown
  };
}
```

**Expected Result:** All delivery calculator tests pass (Iteration 2 + 3) ✅

---

### Phase 7: Create Test Helpers

**File to create:** `tests/helpers/client-test-fixtures.ts` (if not exists)

```typescript
import type { Client, ClientType } from '$lib/server/game/types';
import { getClientProfile } from '$lib/config/client-profiles';

/**
 * Build a test client with base values from config
 * No ±10% variance applied (predictable for tests)
 */
export function buildTestClient(
  type: ClientType,
  overrides?: Partial<Client>
): Client {
  const profile = getClientProfile(type);
  if (!profile) {
    throw new Error(`Unknown client type: ${type}`);
  }

  return {
    id: overrides?.id || `test-${type}-${Date.now()}`,
    name: overrides?.name || `Test ${profile.type}`,
    type: profile.type,
    volume: overrides?.volume ?? profile.baseVolume,
    revenue: overrides?.revenue ?? profile.baseRevenue,
    risk: overrides?.risk ?? profile.risk,
    spam_rate: overrides?.spam_rate ?? profile.baseSpamRate,
    requirements: profile.requirements,
    description: profile.description
  };
}
```

**Note:** Check if this file already exists from previous work. If so, skip creation.

---

### Phase 8: Integration Test (Resolution Manager)

**File to check:** `src/lib/server/game/resolution-manager.test.ts`

If this file doesn't exist yet, we'll create it in a future iteration. For now, focus on unit tests.

**If it exists, add Iteration 3 test:**
```typescript
describe('Resolution Manager - Iteration 3: Authentication Impact', () => {
  test('ESP with full auth stack gets delivery and reputation bonuses', async () => {
    const client = buildTestClient('premium_brand');
    const session = buildTestSession({
      currentRound: 1,
      teams: [
        buildTestTeam('SendWave', {
          reputation: { gmail: 75, outlook: 75, yahoo: 75 }, // Good zone
          clients: [client],
          clientStates: {
            [client.id]: { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null }
          },
          techStack: ['spf', 'dkim', 'dmarc']
        })
      ]
    });

    const results = await executeResolution(session, 'TEST-123');

    // Reputation changes
    expect(results.espResults.SendWave.reputation.perDestination.gmail.techBonus).toBe(10);
    expect(results.espResults.SendWave.reputation.perDestination.gmail.totalChange).toBe(10);

    // Delivery with auth bonus (85% + 25% = capped at 100%)
    expect(results.espResults.SendWave.delivery.authBonus).toBe(0.25);
    expect(results.espResults.SendWave.delivery.finalRate).toBe(1.0);

    // Revenue with 100% delivery
    expect(results.espResults.SendWave.revenue.actualRevenue).toBe(350);
  });

  test('Round 3 without DMARC suffers severe penalty', async () => {
    const client = buildTestClient('premium_brand');
    const session = buildTestSession({
      currentRound: 3,
      teams: [
        buildTestTeam('SendWave', {
          reputation: { gmail: 75, outlook: 75, yahoo: 75 },
          clients: [client],
          clientStates: {
            [client.id]: { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null }
          },
          techStack: [] // No auth tech
        })
      ]
    });

    const results = await executeResolution(session, 'TEST-123');

    // DMARC penalty applied
    expect(results.espResults.SendWave.delivery.dmarcPenalty).toBe(0.8);
    expect(results.espResults.SendWave.delivery.finalRate).toBeCloseTo(0.17, 2); // 85% × 0.2

    // Revenue suffers
    expect(results.espResults.SendWave.revenue.actualRevenue).toBeCloseTo(59.5, 1); // 350 × 0.17
  });
});
```

---

### Phase 9: Update Resolution Manager (if exists)

**File to check:** `src/lib/server/game/resolution-manager.ts`

If this file exists, update it to:
1. Call `calculateReputationChanges()` after volume calculation
2. Apply reputation changes to team's reputation object
3. Include reputation in result structure
4. Log reputation changes

**Pseudocode:**
```typescript
// After volume calculation...

// Calculate reputation changes
const reputationResult = calculateReputationChanges({
  techStack: team.owned_tech_upgrades,
  destinations: session.destinations.map(d => d.name)
});
logger.debug({ reputation: reputationResult }, 'Reputation changes calculated');

// Apply reputation changes to session (mutate team object)
for (const [dest, change] of Object.entries(reputationResult.perDestination)) {
  team.reputation[dest] = (team.reputation[dest] || 70) + change.totalChange;
  team.reputation[dest] = Math.max(0, Math.min(100, team.reputation[dest])); // Clamp 0-100
}

// Include in results
results.espResults[team.name] = {
  volume: volumeResult,
  reputation: reputationResult,  // NEW
  delivery: deliveryResult,
  revenue: revenueResult
};
```

**Note:** If resolution-manager.ts doesn't exist yet, that's fine - it will be created in a later iteration when we do full integration.

---

## 🧪 Test Execution Plan

### Step 1: Run Unit Tests
```bash
# Run reputation calculator tests
npm test -- reputation-calculator.test.ts

# Run delivery calculator tests
npm test -- delivery-calculator.test.ts
```

**Expected:** All tests pass ✅

### Step 2: Run Integration Tests (if resolution-manager exists)
```bash
npm test -- resolution-manager.test.ts
```

### Step 3: Run Full Test Suite
```bash
npm test
```

---

## 📊 Expected Outcomes

### Test Results
- ✅ All Iteration 1 tests still pass (backward compatibility)
- ✅ All Iteration 2 tests still pass (backward compatibility)
- ✅ All Iteration 3 reputation calculator tests pass
- ✅ All Iteration 3 delivery calculator tests pass
- ✅ Integration tests pass (if they exist)

### Code Coverage
- `reputation-calculator.ts`: 100%
- `delivery-calculator.ts`: 100%
- `resolution-types.ts`: Updated with new types

### Business Logic Validation
- SPF/DKIM/DMARC provide cumulative bonuses
- DMARC becomes critical in Round 3+
- Reputation improves each round with tech stack
- Delivery success can reach 100% with good reputation + full auth

---

## ⚠️ Important Notes

### What NOT to Implement Yet
- ❌ Client risk reputation impact (Iteration 4)
- ❌ Warmup reputation bonus (Iteration 5)
- ❌ Volume-weighted client impact (Iteration 4)
- ❌ Filtering penalties (Iteration 6)
- ❌ Content filtering complaint reduction (Iteration 7)

### Backward Compatibility
- All existing tests (Iteration 1 & 2) must still pass
- Reputation calculator returns 0 for client impact (placeholder)
- Delivery calculator accepts but doesn't use filtering params yet

### Config Dependencies
- Authentication bonuses already defined in [technical-upgrades.ts](src/lib/config/technical-upgrades.ts) ✅
- Helper functions `getAuthenticationDeliveryBonus()` and `getAuthenticationReputationBonus()` already exist ✅
- `DMARC_MISSING_PENALTY` constant already defined ✅

---

## 🚀 Implementation Checklist

### Pre-Implementation
- [ ] Review feature file (Iteration 3 section)
- [ ] Review architecture design document
- [ ] Confirm config helpers exist in [technical-upgrades.ts](src/lib/config/technical-upgrades.ts)
- [ ] Check if test fixtures exist in `tests/helpers/`

### Phase 1: Reputation Calculator
- [ ] Update [resolution-types.ts](src/lib/server/game/resolution-types.ts) with reputation types
- [ ] Write reputation calculator tests (TDD: Red phase)
- [ ] Run tests, confirm they fail ❌
- [ ] Implement reputation calculator
- [ ] Run tests, confirm they pass ✅
- [ ] Review code for clarity and maintainability

### Phase 2: Delivery Calculator Enhancement
- [ ] Update `DeliveryParams` and `DeliveryResult` types in [resolution-types.ts](src/lib/server/game/resolution-types.ts)
- [ ] Write Iteration 3 delivery tests (TDD: Red phase)
- [ ] Run tests, confirm new tests fail ❌
- [ ] Enhance delivery calculator implementation
- [ ] Run tests, confirm all tests pass (Iteration 2 + 3) ✅
- [ ] Review code for clarity and maintainability

### Phase 3: Integration (if applicable)
- [ ] Check if [resolution-manager.ts](src/lib/server/game/resolution-manager.ts) exists
- [ ] If yes: Add reputation calculation step
- [ ] If yes: Update result structure
- [ ] If yes: Add integration tests
- [ ] If yes: Run integration tests ✅

### Phase 4: Validation
- [ ] Run full test suite: `npm test`
- [ ] Verify all tests pass (Iterations 1, 2, 3) ✅
- [ ] Check test coverage for new files
- [ ] Review all code changes
- [ ] Format code: `npm run format`

### Phase 5: Documentation
- [ ] Add inline comments for complex logic
- [ ] Update any relevant README sections
- [ ] Document any assumptions or design decisions

### Phase 6: Commit
- [ ] Stage changes: `git add .`
- [ ] Commit with message: `feat: Implement US-3.3 Iteration 3 - Authentication impact on delivery and reputation`
- [ ] Verify commit includes all files
- [ ] Push to remote (if applicable)

---

## 🎓 Learning Points

### ATDD Benefits Observed
1. **Clear Requirements:** Gherkin scenarios drive test cases
2. **Incremental Development:** Each iteration builds on previous
3. **Regression Prevention:** Old tests ensure nothing breaks
4. **Documentation:** Tests serve as usage examples

### Calculator Pattern Benefits
1. **Testability:** Pure functions easy to test
2. **Reusability:** Calculators can be composed
3. **Clarity:** Each calculator has single responsibility
4. **Debugging:** Easy to isolate issues

### Configuration-Driven Design
1. **Game Balance:** Change constants without code changes
2. **Flexibility:** Easy to tune gameplay
3. **Clarity:** Business rules visible in config files

---

## 📚 Reference Files

### Implementation Reference
- [US-3.3 Resolution Phase Automation iterative implementation.md](features/US-3.3%20Resolution%20Phase%20Automation%20iterative%20implementation.md) - Iteration 3 section (lines 159-199)
- [US-3.3 Architecture Design.md](features/US-3.3%20Architecture%20Design.md) - Calculator specifications and patterns
- [technical-upgrades.ts](src/lib/config/technical-upgrades.ts) - Authentication bonuses config

### Existing Code to Study
- [volume-calculator.ts](src/lib/server/game/calculators/volume-calculator.ts) - Example calculator pattern
- [delivery-calculator.ts](src/lib/server/game/calculators/delivery-calculator.ts) - Current implementation (Iteration 2)
- [resolution-types.ts](src/lib/server/game/resolution-types.ts) - Type definitions

### Testing Reference
- [delivery-calculator.test.ts](src/lib/server/game/calculators/delivery-calculator.test.ts) - Example test structure
- [volume-calculator.test.ts](src/lib/server/game/calculators/volume-calculator.test.ts) - Example test patterns

---

## ❓ FAQ

### Q: Why not implement client risk impact now?
**A:** Following the iterative approach keeps changes focused and testable. Client risk (Iteration 4) adds complexity with volume-weighted calculations.

### Q: What if reputation goes above 100?
**A:** Clamp to 0-100 range when applying changes to team reputation.

### Q: Do we need to create resolution-manager.ts now?
**A:** Not required for Iteration 3. Focus on calculator unit tests. Integration comes later.

### Q: Should we add logging in calculators?
**A:** No - calculators are pure functions. Logging happens in resolution-manager (orchestrator).

### Q: What about WebSocket broadcasts?
**A:** Handled by resolution-manager. Calculators just compute values.

---

## ✅ Definition of Done

- [ ] All reputation calculator tests pass
- [ ] All delivery calculator tests pass (Iterations 2 + 3)
- [ ] All volume calculator tests still pass (Iteration 1)
- [ ] All revenue calculator tests still pass (Iteration 1)
- [ ] Code formatted with `npm run format`
- [ ] Types properly defined in resolution-types.ts
- [ ] No console.log statements (use Pino in manager)
- [ ] Inline comments for complex logic
- [ ] Commit message follows convention
- [ ] Ready for Iteration 4

---

**Status:** Ready for Implementation 🚀
**Next Iteration:** Iteration 4 - Client Risk Profiles
**Estimated Time:** 2-3 hours for Iteration 3
