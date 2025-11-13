# Coherence Analysis: US-3.3 Iteration 6.1 - User Satisfaction & Revenue

## Executive Summary

This document analyzes the coherence between the **US-3.3 Iteration 6.1** feature specification and the existing implementation. Several **critical mismatches** have been identified that need resolution before implementation.

---

## 1. Filtering Effectiveness - MISMATCH ⚠️

### Feature Specification (lines 14-21)
```javascript
base_effectiveness = {
  "Permissive": { spam_blocked: 0.20, false_positives: 0.01 },  // 20% spam blocked, 1% FP
  "Moderate":   { spam_blocked: 0.50, false_positives: 0.03 },  // 50% spam blocked, 3% FP
  "Strict":     { spam_blocked: 0.75, false_positives: 0.08 },  // 75% spam blocked, 8% FP
  "Maximum":    { spam_blocked: 0.90, false_positives: 0.15 }   // 90% spam blocked, 15% FP
}
```

### Current Implementation
File: [src/lib/utils/filtering.ts](src/lib/utils/filtering.ts:26-30)

```typescript
const impactMap: Record<FilteringLevel, { spamReduction: number; falsePositives: number }> = {
  permissive: { spamReduction: 0,  falsePositives: 0 },   // 0% spam blocked, 0% FP
  moderate:   { spamReduction: 35, falsePositives: 3 },   // 35% spam blocked, 3% FP
  strict:     { spamReduction: 65, falsePositives: 8 },   // 65% spam blocked, 8% FP
  maximum:    { spamReduction: 85, falsePositives: 15 }   // 85% spam blocked, 15% FP
};
```

### Discrepancies
| Level | Feature Spec | Current Impl | Difference |
|-------|--------------|--------------|------------|
| **Permissive** | 20% blocked, 1% FP | 0% blocked, 0% FP | **-20% / -1% FP** |
| **Moderate** | 50% blocked, 3% FP | 35% blocked, 3% FP | **-15%** |
| **Strict** | 75% blocked, 8% FP | 65% blocked, 8% FP | **-10%** |
| **Maximum** | 90% blocked, 15% FP | 85% blocked, 15% FP | **-5%** |

**Decision Needed**: Which values should we use?
- Option A: Update feature spec to match implementation
- Option B: Update implementation to match feature spec
- Option C: Re-balance both to new values

---

## 2. Tech Modifiers - INCOMPLETE MAPPING ⚠️

### Feature Specification (lines 23-41)
```javascript
// Multiplicative modifiers
if (has_content_filtering) {
  spam_blocked *= 1.30      // +30% spam detection
  false_positives *= 0.90   // -10% false positives
}

if (has_ml_filtering) {
  spam_blocked *= 1.40      // +40% spam detection
  false_positives *= 0.80   // -20% false positives
}

if (has_reputation_based_filtering) {
  spam_blocked *= 1.20      // +20% spam detection
  false_positives *= 0.95   // -5% false positives
}

// Cap at maximum 95% spam blocking, minimum 0.5% false positives
spam_blocked = min(0.95, spam_blocked)
false_positives = max(0.005, false_positives)
```

### Current Implementation
File: [src/lib/config/destination-technical-upgrades.ts](src/lib/config/destination-technical-upgrades.ts:43-217)

**Additive (not multiplicative) effects:**

| Tool | Feature Spec | Current Impl | Match? |
|------|--------------|--------------|--------|
| Content Analysis Filter | +30% spam, -10% FP (×1.30, ×0.90) | +15% spam, -2% FP | ❌ **DIFFERENT** |
| ML System | +40% spam, -20% FP (×1.40, ×0.80) | +25% spam, -3% FP | ❌ **DIFFERENT** |
| Reputation-based | +20% spam, -5% FP (×1.20, ×0.95) | N/A (doesn't exist) | ❌ **MISSING** |
| Auth Validators | Not in spec | SPF: +5%, DKIM: +8%, DMARC: +12% | ✅ **EXTRA** |
| Volume Throttling | Not in spec | +5% spam, -1% FP | ✅ **EXTRA** |

### Critical Issues

**1. Multiplicative vs. Additive Model**
- **Feature spec**: Uses **multiplicative** approach (1.30× means 30% boost)
- **Current impl**: Uses **additive** approach (+15 means add 15 percentage points)
- **Impact**: Completely different calculation methods!

**Example with Moderate (50% spam blocked):**
- **Feature spec**: `50% × 1.30 = 65%` (with content filter)
- **Current impl**: `50% + 15% = 65%` (with content filter)

**2. Missing Tool: "Reputation-based Filtering"**
- Feature spec mentions `has_reputation_based_filtering` (×1.20 spam, ×0.95 FP)
- No corresponding tool exists in [destination-technical-upgrades.ts](src/lib/config/destination-technical-upgrades.ts)
- Possibly meant to be a **separate new tool** or confusion with auth validators?

**3. Auth Validators in Wrong System**
- Auth validators (SPF/DKIM/DMARC) are **ESP technologies**, not destination tools
- Feature spec doesn't mention them for **destination filtering**
- Current impl has them as destination tools (lines 68-140)

**Decision Needed**:
1. Should we keep **additive** or switch to **multiplicative** model?
2. What is "reputation-based filtering"? New tool or rename existing?
3. Should auth validators be destination tools or only ESP tools?

---

## 3. User Satisfaction Calculation - NOT IMPLEMENTED ⚠️

### Feature Specification (lines 43-77)

**Formula**:
```javascript
base_satisfaction = 75

// Calculate percentages of total volume
spam_blocked_percentage = (total_spam_blocked / total_volume)
spam_through_percentage = (total_spam_through / total_volume)
false_positive_percentage = (total_false_positives / total_volume)

// Linear impacts (REBALANCED)
satisfaction_gain = spam_blocked_percentage * 300    // ~30 points max
spam_penalty = spam_through_percentage * 400         // ~40 points max
false_positive_penalty = false_positive_percentage * 100  // ~10 points max

// Final calculation
user_satisfaction = base_satisfaction
    + satisfaction_gain
    - spam_penalty
    - false_positive_penalty

// Cap between 0 and 100
user_satisfaction = max(0, min(100, user_satisfaction))
```

### Current Implementation
File: [src/routes/api/sessions/[roomCode]/destination/[destName]/+server.ts](src/routes/api/sessions/[roomCode]/destination/[destName]/+server.ts:160-162)

```typescript
// PLACEHOLDER: User satisfaction mirrors reputation for now
// In future US, this will be calculated from user feedback
const userSatisfaction = reputation;
```

**Status**: ❌ **NOT IMPLEMENTED** - just uses ESP reputation as placeholder

**Missing Components**:
1. Spam blocked percentage calculation
2. Spam through percentage calculation
3. False positive percentage calculation
4. Satisfaction formula (base 75 + gains - penalties)

---

## 4. Destination Revenue - NOT IMPLEMENTED ⚠️

### Feature Specification (lines 186-234)

**Formula**:
```javascript
// Different base revenues reflecting market position
base_revenue = {
  Gmail:   300,  // Largest player
  Outlook: 200,  // Medium player
  Yahoo:   150   // Smaller player
}

// Volume bonus (additive to base)
volume_bonus = (total_emails_processed / 100000) * 20  // 20 credits per 100K

// Satisfaction multiplier tiers
satisfaction_multiplier = {
  90-100: 1.5,   // +50% bonus
  80-89:  1.3,   // +30% bonus
  75-79:  1.1,   // +10% bonus
  70-74:  0.95,  // -5% penalty
  60-69:  0.8,   // -20% penalty
  50-59:  0.6,   // -40% penalty
  0-49:   0.3    // -70% penalty
}

// Final formula
destination_revenue = (base_revenue + volume_bonus) * satisfaction_multiplier
```

### Current Implementation
File: [src/lib/server/game/calculators/revenue-calculator.ts](src/lib/server/game/calculators/revenue-calculator.ts)

**Current scope**: ESP revenue only
```typescript
// Calculate revenue for a team (ESP)
export function calculateRevenue(params: RevenueParams): RevenueResult {
  // Sum revenue from active clients
  const actualRevenue = Math.round(baseRevenue * params.deliveryRate);
  return { baseRevenue, actualRevenue, perClient };
}
```

**Status**: ❌ **NOT IMPLEMENTED** - only ESP revenue exists

**Missing Components**:
1. Destination base revenue constants (300/200/150)
2. Volume bonus calculation (per 100K emails)
3. Satisfaction multiplier tiers
4. Destination revenue formula

---

## 5. Data Structure - MISSING FIELDS ⚠️

### Required Fields for Iteration 6.1

**Destination state needs:**
1. ✅ `budget` - exists
2. ✅ `filtering_policies` - exists
3. ✅ `esp_reputation` - exists
4. ❌ `revenue` - **MISSING** (to track earned credits per round)
5. ❌ `total_volume_processed` - **MISSING** (for volume bonus)
6. ❌ `satisfaction_details` - **MISSING** (for transparency/debugging)

### Current Destination Interface
File: [src/lib/server/game/types.ts](src/lib/server/game/types.ts:36-55)

```typescript
export interface Destination {
  name: string;
  kingdom?: 'Gmail' | 'Outlook' | 'Yahoo';
  players: string[];
  budget: number;
  filtering_policies: Record<string, FilteringPolicy>;
  esp_reputation: Record<string, number>;
  esp_metrics?: Record<string, {
    user_satisfaction: number; // 0-100 (currently placeholder)
    spam_level: number; // 0-100 (currently placeholder)
  }>;
  owned_tools?: string[];
  // ... other fields
}
```

**Observations**:
- `esp_metrics.user_satisfaction` exists but is **placeholder** (copied from reputation)
- No fields for tracking **destination revenue**
- No fields for tracking **volume processed**

---

## 6. ESP-Level vs Destination-Level Calculations - SCOPE MISMATCH ⚠️

### Feature Specification Approach

**Per-ESP calculations** (lines 43-55):
```javascript
For each ESP sending to Destination:
  spam_rate = weighted_average_of_client_complaint_rates
  legitimate_rate = 1 - spam_rate
  total_volume = sum_of_active_client_volumes

  // Apply filtering with tech modifiers
  effective_spam_blocked = base_spam_blocked * tech_multipliers
  effective_false_positives = base_false_positives * tech_multipliers

  spam_through = spam_rate * (1 - effective_spam_blocked)
  legitimate_through = legitimate_rate * (1 - effective_false_positives)
```

**Then aggregate** (lines 56-76):
```javascript
// Aggregate for Destination
base_satisfaction = 75

// Calculate percentages across ALL ESPs
spam_blocked_percentage = (total_spam_blocked / total_volume)
spam_through_percentage = (total_spam_through / total_volume)
false_positive_percentage = (total_false_positives / total_volume)

// Single satisfaction score for entire destination
user_satisfaction = base_satisfaction
    + satisfaction_gain
    - spam_penalty
    - false_positive_penalty
```

### Current Implementation Approach

**Currently**: Per-ESP satisfaction stored separately
```typescript
esp_metrics?: Record<string, {
  user_satisfaction: number; // Separate score per ESP
  spam_level: number;
}>;
```

### Mismatch

**Feature spec**:
- Calculate **per-ESP** intermediate values
- Aggregate into **single destination-wide** satisfaction

**Current impl**:
- Stores **per-ESP** satisfaction scores
- No aggregation logic

**Question**: Should we:
- A) Keep per-ESP satisfaction + add aggregated destination satisfaction?
- B) Replace per-ESP with single destination satisfaction?
- C) Calculate both for different purposes?

---

## 7. Test Scenarios - CALCULATION VERIFICATION NEEDED 📊

The feature spec includes 7 detailed test scenarios (lines 82-147) with specific expected values:

1. **Good filtering rewarded** (Gmail, Moderate, 100K volume) → Expected: 69.65%
2. **Strict filtering less punishing** (Gmail + Content Filter, Strict, 100K) → Expected: 90.976%
3. **Maximum filtering viable** (Yahoo + ALL tech, Maximum, 200K) → Expected: 92.266%
4. **Poor filtering penalized** (Outlook, Permissive, avg 6% spam) → Expected: 58.46%
5. **Balanced portfolio** (Gmail + ML, mixed levels) → Expected: 76.54%
6. **Revenue scenarios** (lines 238-301) → 7 revenue test cases

**Action Required**:
- Once implementation approach is decided, verify ALL test scenarios
- Ensure calculations match expected values
- Add unit tests for each scenario

---

## 8. Configuration File Comments - UNCERTAINTY FLAGGED 🤔

### Feature Spec Self-Doubts

**Lines 14, 23, 190**: Feature spec includes notes questioning its own values:

```javascript
// Base filtering effectiveness by level
// (to be checked against values in config)
base_effectiveness = { ... }

// Tech modifiers (cumulative)
// (to be checked against values in config)
if (has_content_filtering) { ... }

// Different base revenues reflecting their market position
// perhaps too high, we shall perhaps divide it by 2
base_revenue = {
  Gmail:   300,  // Maybe too high?
  Outlook: 200,
  Yahoo:   150
}
```

**Implication**: Feature author was **uncertain** about values, requesting validation against actual config.

**Decision Needed**:
- Review these values with game designers
- Playtest to verify balance
- Adjust before implementation

---

## 9. Destination Diversity Mechanic - NOT SPECIFIED 🎮

### Feature Specification (line 12)
```javascript
// To create diversity in gameplay for destinations, we will perhaps use different
// formula per destination (for instance, having Yahoo users more tolerant to spam)
```

**Status**: ❌ **NOT SPECIFIED** - just mentioned as "perhaps"

**Question**: Should we implement destination-specific modifiers?

**Examples from spec**:
- Yahoo users more spam-tolerant → lower spam_penalty multiplier?
- Gmail users expect perfection → higher false_positive_penalty?
- Outlook users prioritize legitimate delivery → different weights?

**Decision Needed**:
- Implement now or defer to later iteration?
- If now, define specific modifiers per destination

---

## Summary of Required Actions

### 🔴 Critical (Blocking Implementation)

1. **Resolve filtering effectiveness mismatch**
   - Decide: Feature spec (20/50/75/90) vs Current (0/35/65/85)
   - Update either spec or code to match

2. **Clarify tech modifier model**
   - Decide: Multiplicative (×1.30) vs Additive (+15)
   - Resolve "reputation-based filtering" ambiguity
   - Decide if auth validators belong in destination tools

3. **Define destination revenue structure**
   - Add `revenue` field to Destination type
   - Add `total_volume_processed` field (or calculate on-the-fly)
   - Implement base revenue constants (300/200/150)

4. **Clarify satisfaction scope**
   - Per-ESP only, destination-wide only, or both?
   - Update Destination interface accordingly

### 🟡 High Priority (Design Decisions)

5. **Review game balance values**
   - Validate base revenues (300/200/150)
   - Validate satisfaction multipliers
   - Validate penalty weights (300/400/100)

6. **Decide on destination diversity**
   - Implement per-destination formulas now or later?
   - Define specific modifiers if implementing

### 🟢 Medium Priority (Implementation Details)

7. **Implement user satisfaction calculator**
   - Create new calculator in `calculators/satisfaction-calculator.ts`
   - Replace placeholder in destination API

8. **Implement destination revenue calculator**
   - Create new calculator in `calculators/destination-revenue-calculator.ts`
   - Add to resolution phase

9. **Write comprehensive tests**
   - Unit tests for all 12+ scenarios in feature spec
   - Verify exact expected values

---

## Recommended Next Steps

1. **Review this document** with team/stakeholders
2. **Make design decisions** on all flagged issues
3. **Update feature spec** to match decisions
4. **Update config files** to align with spec
5. **Implement satisfaction calculator** with tests
6. **Implement destination revenue calculator** with tests
7. **Integrate into resolution phase**
8. **Playtest and balance**

---

## Files to Modify

### Configuration
- [ ] [src/lib/utils/filtering.ts](src/lib/utils/filtering.ts) - Update filtering effectiveness values
- [ ] [src/lib/config/destination-technical-upgrades.ts](src/lib/config/destination-technical-upgrades.ts) - Align tech effects
- [ ] [src/lib/config/metrics-thresholds.ts](src/lib/config/metrics-thresholds.ts) - Add satisfaction tiers if needed

### Types
- [ ] [src/lib/server/game/types.ts](src/lib/server/game/types.ts) - Add destination revenue fields
- [ ] [src/lib/server/game/resolution-types.ts](src/lib/server/game/resolution-types.ts) - Add satisfaction params/results

### New Files
- [ ] `src/lib/server/game/calculators/satisfaction-calculator.ts` - User satisfaction logic
- [ ] `src/lib/server/game/calculators/satisfaction-calculator.test.ts` - Unit tests
- [ ] `src/lib/server/game/calculators/destination-revenue-calculator.ts` - Revenue logic
- [ ] `src/lib/server/game/calculators/destination-revenue-calculator.test.ts` - Unit tests

### Modifications
- [ ] [src/lib/server/game/resolution-manager.ts](src/lib/server/game/resolution-manager.ts) - Integrate new calculators
- [ ] [src/routes/api/sessions/[roomCode]/destination/[destName]/+server.ts](src/routes/api/sessions/[roomCode]/destination/[destName]/+server.ts) - Remove placeholder, use real calculation

### Tests
- [ ] Add E2E tests for US-3.3 Iteration 6.1 scenarios
