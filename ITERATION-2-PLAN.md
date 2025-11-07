# Iteration 2 Implementation Plan
## US 3.3: Simple Reputation System

**Goal:** Add basic reputation tracking and fixed delivery rates based on reputation zones

---

## 📋 Overview

### What's Being Added:
- **Reputation Zones**: Map reputation scores to delivery success rates
- **Delivery Calculator**: Pure function to calculate delivery success based on reputation
- **Weighted Reputation**: Calculate average reputation across multiple destinations
- **Revenue Modifiers**: Apply delivery success rate to actual revenue

### Key Mechanics:
- Excellent (90-100): 95% delivery
- Good (70-89): 85% delivery
- Warning (50-69): 70% delivery
- Poor (30-49): 50% delivery
- Blacklist (0-29): 5% delivery

---

## 🏗️ Architecture Following Calculator Pattern

### New Files to Create:

1. **`src/lib/server/game/calculators/delivery-calculator.ts`**
   - Pure function calculator
   - Takes: reputation (weighted average), techStack (for future), currentRound
   - Returns: baseRate, finalRate, breakdown
   - Iteration 2: Only implements base rate from reputation zone
   - Future iterations will add: auth bonuses, DMARC penalty, filtering penalties

2. **`src/lib/server/game/calculators/delivery-calculator.test.ts`**
   - Test each reputation zone
   - Test edge cases (0, 100, zone boundaries)
   - Test weighted reputation calculation

### Files to Update:

1. **`src/lib/server/game/resolution-types.ts`**
   - Add `DeliveryParams` interface
   - Add `DeliveryResult` interface
   - Update `ESPResolutionResult` to include delivery

2. **`src/lib/server/game/resolution-manager.ts`**
   - Add weighted reputation calculation helper
   - Call delivery calculator before revenue calculator
   - Pass delivery rate to revenue calculator

3. **`src/lib/server/game/calculators/revenue-calculator.ts`**
   - Already accepts deliveryRate parameter ✅
   - No changes needed (was prepared in Iteration 1)

### Existing Config to Use:
- `src/lib/config/metrics-thresholds.ts`:
  - `REPUTATION_DELIVERY_SUCCESS` - Already defined ✅
  - `getDeliverySuccessRate()` - Already implemented ✅
  - `getReputationStatus()` - Already available

---

## 📝 Implementation Steps (ATDD)

### Phase 1: Delivery Calculator (Pure Function)

#### Step 1: Update resolution-types.ts
Add type definitions:
```typescript
export interface DeliveryParams {
  reputation: number;  // weighted average
  techStack: string[]; // for future iterations
  currentRound: number; // for future iterations
}

export interface DeliveryResult {
  baseRate: number;    // from reputation zone
  finalRate: number;   // same as baseRate in Iteration 2
  zone: string;        // reputation zone name
}
```

#### Step 2: Write Delivery Calculator Tests (RED)
Test file: `delivery-calculator.test.ts`

**Test cases:**
1. Excellent zone (reputation 95) → 95% delivery
2. Good zone (reputation 75) → 85% delivery
3. Warning zone (reputation 55) → 70% delivery
4. Poor zone (reputation 40) → 50% delivery
5. Blacklist zone (reputation 15) → 5% delivery
6. Boundary cases:
   - Reputation 90 → Excellent (95%)
   - Reputation 89 → Good (85%)
   - Reputation 70 → Good (85%)
   - Reputation 69 → Warning (70%)
   - Reputation 50 → Warning (70%)
   - Reputation 49 → Poor (50%)
   - Reputation 30 → Poor (50%)
   - Reputation 29 → Blacklist (5%)

Run tests → Should fail (RED) ❌

#### Step 3: Implement Delivery Calculator (GREEN)
```typescript
import { getDeliverySuccessRate, getReputationStatus } from '$lib/config/metrics-thresholds';

export function calculateDeliverySuccess(params: DeliveryParams): DeliveryResult {
  const baseRate = getDeliverySuccessRate(params.reputation);
  const status = getReputationStatus(params.reputation);

  return {
    baseRate,
    finalRate: baseRate, // Iteration 2: no modifiers yet
    zone: status.status
  };
}
```

Run tests → Should pass (GREEN) ✅

---

### Phase 2: Weighted Reputation Helper

#### Step 4: Add Weighted Reputation Calculator
Add to `resolution-manager.ts`:

```typescript
/**
 * Calculate weighted average reputation across destinations
 * Uses market share as weights: Gmail 50%, Outlook 30%, Yahoo 20%
 */
function calculateWeightedReputation(
  reputation: Record<string, number>
): number {
  const weights = {
    gmail: 0.5,
    outlook: 0.3,
    yahoo: 0.2
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [dest, rep] of Object.entries(reputation)) {
    const weight = weights[dest.toLowerCase()] || 0;
    weightedSum += rep * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 70;
}
```

**Add unit tests in resolution-manager.test.ts:**
- Test weighted calculation with all three destinations
- Test with missing destinations
- Test with zero reputation

---

### Phase 3: Integration

#### Step 5: Update Resolution Manager
Modify the resolution flow:

```typescript
// After volume calculation...

// 2. Calculate weighted reputation
const avgReputation = calculateWeightedReputation(team.reputation);

// 3. Calculate delivery success
const deliveryResult = calculateDeliverySuccess({
  reputation: avgReputation,
  techStack: team.owned_tech_upgrades,
  currentRound: session.current_round
});
logger.info('Delivery calculated', {
  teamName: team.name,
  reputation: avgReputation,
  zone: deliveryResult.zone,
  deliveryRate: deliveryResult.finalRate
});

// 4. Calculate revenue (with delivery rate)
const revenueResult = calculateRevenue({
  clients: activeClients,
  clientStates: team.client_states || {},
  deliveryRate: deliveryResult.finalRate // Now uses calculated rate
});
```

#### Step 6: Write Integration Tests (RED)
Add to `resolution-manager.test.ts`:

**Test Scenarios:**
1. **Good reputation delivery**
   - ESP with reputation 75 at all destinations
   - 1 premium_brand client (350 base revenue)
   - Expected: 85% delivery, 297.5 actual revenue

2. **Poor reputation impact**
   - ESP with reputation 40 at all destinations
   - 2 clients (530 total base revenue)
   - Expected: 50% delivery, 265 actual revenue

3. **Weighted reputation calculation**
   - Gmail: 80, Outlook: 70, Yahoo: 60
   - Weighted: (80×0.5 + 70×0.3 + 60×0.2) = 73
   - Expected: Good zone (85% delivery)

4. **Multiple teams with different reputations**
   - SendWave: reputation 85 → 85% delivery
   - MailMonkey: reputation 45 → 50% delivery
   - Verify independent calculations

Run tests → Should fail (RED) ❌

#### Step 7: Verify Integration (GREEN)
Update resolution manager code → All tests pass ✅

---

### Phase 4: Validation

#### Step 8: Run All Tests
```bash
npm test volume-calculator revenue-calculator delivery-calculator resolution-manager
```

Expected: All tests passing (Iteration 1: 16 + Iteration 2: ~12 = ~28 tests)

#### Step 9: Format Code
```bash
npm run format
```

---

## 🧪 Test Coverage Summary

### Unit Tests:
- **Delivery Calculator**: 8 tests
  - 5 zone tests (one per zone)
  - 3 boundary tests

### Integration Tests:
- **Resolution Manager**: 4 new tests
  - Good reputation delivery
  - Poor reputation impact
  - Weighted reputation
  - Multiple teams

**Total New Tests**: ~12 tests
**Total Tests After Iteration 2**: ~28 tests

---

## 📊 Expected Test Results

### Delivery Calculator:
```
✓ excellent zone (95% delivery)
✓ good zone (85% delivery)
✓ warning zone (70% delivery)
✓ poor zone (50% delivery)
✓ blacklist zone (5% delivery)
✓ boundary: reputation 90 → excellent
✓ boundary: reputation 70 → good
✓ boundary: reputation 50 → warning
```

### Resolution Manager Integration:
```
✓ good reputation (75) → 85% delivery → 297.5 revenue
✓ poor reputation (40) → 50% delivery → 265 revenue
✓ weighted reputation (80/70/60) → 73 → 85% delivery
✓ multiple teams with different reputations
```

---

## 🎯 Acceptance Criteria Checklist

From Iteration 2 spec:
- [ ] Fixed reputation zones implemented (Excellent/Good/Warning/Poor/Blacklist)
- [ ] Fixed delivery success by zone (95%/85%/70%/50%/5%)
- [ ] Delivery success applied to revenue
- [ ] Reputation tracked per destination
- [ ] Weighted average reputation calculated correctly
- [ ] All Iteration 1 functionality still works
- [ ] Code formatted and tests passing

---

## 🔄 ATDD Workflow

Each step follows Red-Green-Refactor:
1. **RED**: Write failing test
2. **GREEN**: Implement minimal code to pass
3. **REFACTOR**: Clean up while keeping tests green

---

## 📦 Deliverables

### New Files (2):
1. `src/lib/server/game/calculators/delivery-calculator.ts`
2. `src/lib/server/game/calculators/delivery-calculator.test.ts`

### Updated Files (2):
1. `src/lib/server/game/resolution-types.ts` (add DeliveryParams/Result)
2. `src/lib/server/game/resolution-manager.ts` (integrate delivery calculator)

### Documentation:
- Update `ITERATION-2-PROGRESS.md` throughout implementation

---

## ⏱️ Estimated Time
**2-3 hours** for complete Iteration 2 implementation with tests

---

## 🚀 Ready to Implement

The plan is ready to execute following ATDD methodology. All necessary config functions already exist in the codebase.
