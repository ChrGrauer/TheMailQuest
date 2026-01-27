# US 3.3 Resolution Phase - Required Updates & Fixes

## 📋 Overview
This document lists all updates needed before implementing US 3.3 Resolution Phase Automation.

---

## ❌ Calculation Errors to Fix in US 3.3

### 1. Iteration 1, Line 102-103: Mix of active and paused clients
**Location:** Scenario "Mix of active and paused clients"

**Current:**
```gherkin
Then total volume should be 145,000 (excludes paused)
And base revenue should be 880 (excludes paused)
```

**Should be:**
```gherkin
Then total volume should be 65,000 (excludes paused)
And base revenue should be 530 (excludes paused)
```

**Calculation:**
- premium_brand (Active): 30K volume, 350 revenue
- aggressive_marketer (Paused): 80K volume, 350 revenue ← EXCLUDED
- growing_startup (Active): 35K volume, 180 revenue
- **Total volume:** 30K + 35K = **65,000**
- **Total revenue:** 350 + 180 = **530**

---

### 2. Iteration 2, Line 135: Poor reputation scenario revenue value
**Location:** Scenario "Poor reputation impact"

**Current:**
```gherkin
Given ESP "SendWave" has reputation 55 at zmail (Poor zone)
And ESP has 2 active clients (300 total base revenue)
When resolution phase calculates
Then delivery success should be 50%
And actual revenue should be 150 (300 × 0.50)
```

**Issue:** Reputation 55 is in **Warning zone** (50-69), not Poor zone (30-49)

**Should be EITHER:**

Option A - Keep reputation 55, fix zone:
```gherkin
Given ESP "SendWave" has reputation 55 at zmail (Warning zone)
And ESP has 2 active clients (300 total base revenue)
When resolution phase calculates
Then delivery success should be 70%
And actual revenue should be 210 (300 × 0.70)
```

Option B - Keep Poor zone, fix reputation:
```gherkin
Given ESP "SendWave" has reputation 40 at zmail (Poor zone)
And ESP has 2 active clients (300 total base revenue)
When resolution phase calculates
Then delivery success should be 50%
And actual revenue should be 150 (300 × 0.50)
```

**Recommendation:** Use Option B (reputation 40) to test the Poor zone properly.

---

### 3. Iteration 5, Line 244: List Hygiene complaint reduction percentage
**Location:** Additional Mechanics description

**Current:**
```
- List Hygiene: Reduces complaint rate by 40% for that client
```

**Should be:**
```
- List Hygiene: Reduces complaint rate by 50% for that client
```

**Reason:** Config file [client-onboarding.ts:59](../src/lib/config/client-onboarding.ts#L59) specifies 50% reduction.

---

### 4. Iteration 5, Line 269: List Hygiene scenario complaint rate
**Location:** Scenario "List Hygiene reduces complaints"

**Current:**
```gherkin
Then complaint rate should be 1.8% (40% reduction)
```

**Should be:**
```gherkin
Then complaint rate should be 1.5% (50% reduction)
```

**Calculation:** 3.0% × 0.5 = 1.5% (not 1.8%)

---

### 5. Iteration 5, Line 274: Warmup description in Combined mitigation
**Location:** Scenario "Combined mitigation"

**Current:**
```gherkin
Given ESP has event_seasonal client with:
  - warmup (50% rep reduction)
  - List Hygiene (40% complaint reduction)
```

**Should be:**
```gherkin
Given ESP has event_seasonal client with:
  - warmup (+2 reputation bonus)
  - List Hygiene (50% complaint reduction)
```

**Reason:** Warmup provides +2 flat bonus, not "50% rep reduction". Also fix List Hygiene to 50%.

---

### 6. Iteration 5, Line 278-279: Combined mitigation complaint rate and volume
**Location:** Scenario "Combined mitigation"

**Current:**
```gherkin
Then reputation impact should be +1 (instead of -1)
And complaint rate should be 0.9% (instead of 1.5%)
And volume sent should be 16000 (10% reduction for High risk client + 50% volume reduction)
```

**Issues:**
1. Complaint rate calculation wrong (should use 50% not 40%)
2. Volume calculation wrong
3. event_seasonal is **Medium risk**, not High risk

**Should be:**
```gherkin
Then reputation impact should be +1 (instead of -1)
And complaint rate should be 0.75% (instead of 1.5%)
And volume sent should be 18,000 (10% reduction for Medium risk + 50% warmup reduction)
```

**Calculations:**
- event_seasonal base: 40,000 volume, 1.5% complaint rate, Medium risk (-1 rep impact)
- List Hygiene (Medium risk): 40K × 0.90 = 36,000 volume
- Warmup: 36K × 0.50 = **18,000 volume**
- List Hygiene complaint: 1.5% × 0.50 = **0.75% complaint rate**
- Reputation: -1 (base) + 2 (warmup) = **+1 reputation impact**

---

### 7. Iteration 10, Line 468: Complex ESP resolution base volume
**Location:** Scenario "Complex ESP resolution", step 1

**Current:**
```gherkin
1. Base volume: 700K (premium_brand 30K + aggressive_marketer 80K*50% for warmup)
```

**Should be:**
```gherkin
1. Base volume: 70K (premium_brand 30K + aggressive_marketer 40K with warmup)
```

**Calculation:** 30K + (80K × 0.5) = 30K + 40K = **70K** (not 700K - typo!)

---

### 8. Iteration 10, Line 478: Complex ESP resolution revenue
**Location:** Scenario "Complex ESP resolution", step 11

**Current:**
```gherkin
11. Revenue: 700 (350 + 350) × 1.0
```

**Should be:**
```gherkin
11. Revenue: 670 (350 + 320) × 1.0
```

**Wait, let me recalculate based on config:**
- premium_brand revenue: **350** ✓
- aggressive_marketer revenue: **350** (per config, not 320) ✓
- **Sum: 350 + 350 = 700** ✓

**Actually, the current value (700) is CORRECT if both clients have 350 revenue.**

**BUT:** Need to verify if aggressive_marketer actually has 350 revenue in the config.

Let me check: Config shows aggressive_marketer `baseRevenue: 350`, so **700 is correct**.

**No fix needed for this one!**

---

## 🔧 Config File Updates Required

### 1. Add to `src/lib/config/client-profiles.ts`

Add reputation impact per risk level:

```typescript
/**
 * Reputation impact per risk level (per round)
 * US-3.3: Resolution Phase Automation - Iteration 4
 */
export const RISK_REPUTATION_IMPACT: Record<'Low' | 'Medium' | 'High', number> = {
	Low: +2,     // Low risk clients improve reputation
	Medium: -1,  // Medium risk clients slightly hurt reputation
	High: -4     // High risk clients significantly hurt reputation
};

/**
 * Get reputation impact for a client's risk level
 */
export function getReputationImpact(risk: 'Low' | 'Medium' | 'High'): number {
	return RISK_REPUTATION_IMPACT[risk];
}
```

---

### 2. Add to `src/lib/config/client-onboarding.ts`

Update List Hygiene description and add volume reduction:

```typescript
/**
 * List Hygiene volume reduction by risk level
 * US-3.3: Resolution Phase Automation - Iteration 5
 */
export const LIST_HYGIENE_VOLUME_REDUCTION: Record<'Low' | 'Medium' | 'High', number> = {
	Low: 0.05,    // 5% volume reduction for low risk clients
	Medium: 0.10, // 10% volume reduction for medium risk clients
	High: 0.15    // 15% volume reduction for high risk clients
};

/**
 * List Hygiene spam trap risk reduction
 * US-3.3: Resolution Phase Automation - Iteration 7
 */
export const LIST_HYGIENE_SPAM_TRAP_REDUCTION = 0.40; // 40% reduction

/**
 * Get volume reduction percentage for List Hygiene based on client risk
 */
export function getListHygieneVolumeReduction(risk: 'Low' | 'Medium' | 'High'): number {
	return LIST_HYGIENE_VOLUME_REDUCTION[risk];
}
```

**Also update the ONBOARDING_OPTIONS array:**

```typescript
{
	id: 'list_hygiene',
	name: 'Activate List Hygiene',
	description: 'Clean and validate subscriber list',
	cost: LIST_HYGIENE_COST,
	effect_description: 'Permanent risk reduction 50%, volume reduction 5-15%',
	benefits: [
		'Removes bounced and inactive email addresses',
		'Reduces spam complaint rate by 50%',
		'Reduces spam trap risk by 40%',
		'Reduces volume by 5-15% depending on client risk level',
		'Permanent improvement to client quality',
		'Better engagement metrics'
	]
}
```

---

### 3. Add to `src/lib/config/technical-upgrades.ts`

Add authentication delivery bonuses:

```typescript
/**
 * Authentication delivery success bonuses
 * US-3.3: Resolution Phase Automation - Iteration 3
 */
export const AUTHENTICATION_DELIVERY_BONUSES: Record<string, number> = {
	spf: 0.05,    // +5% delivery success
	dkim: 0.08,   // +8% delivery success
	dmarc: 0.12   // +12% delivery success
};

/**
 * Get cumulative authentication delivery bonus for owned tech stack
 */
export function getAuthenticationDeliveryBonus(ownedTechIds: string[]): number {
	let bonus = 0;
	if (ownedTechIds.includes('spf')) bonus += AUTHENTICATION_DELIVERY_BONUSES.spf;
	if (ownedTechIds.includes('dkim')) bonus += AUTHENTICATION_DELIVERY_BONUSES.dkim;
	if (ownedTechIds.includes('dmarc')) bonus += AUTHENTICATION_DELIVERY_BONUSES.dmarc;
	return bonus;
}

/**
 * Get cumulative authentication reputation bonus for owned tech stack
 */
export function getAuthenticationReputationBonus(ownedTechIds: string[]): number {
	let bonus = 0;
	if (ownedTechIds.includes('spf')) bonus += 2;
	if (ownedTechIds.includes('dkim')) bonus += 3;
	if (ownedTechIds.includes('dmarc')) bonus += 5;
	return bonus;
}

/**
 * DMARC enforcement penalty (Round 3+)
 * US-3.3: Resolution Phase Automation - Iteration 3
 */
export const DMARC_MISSING_PENALTY = 0.20; // 80% rejection = only 20% gets through
```

---

### 4. Add to `src/lib/config/metrics-thresholds.ts`

Add reputation zone delivery success rates:

```typescript
/**
 * Delivery success rates by reputation zone
 * US-3.3: Resolution Phase Automation - Iteration 2
 */
export const REPUTATION_DELIVERY_SUCCESS: Record<MetricStatus, number> = {
	excellent: 0.95,  // 95% delivery success
	good: 0.85,       // 85% delivery success
	warning: 0.70,    // 70% delivery success
	poor: 0.50,       // 50% delivery success
	blacklist: 0.05   // 5% delivery success (near-total block)
};

/**
 * Get delivery success rate for a reputation score
 */
export function getDeliverySuccessRate(reputation: number): number {
	const status = getReputationStatus(reputation);
	return REPUTATION_DELIVERY_SUCCESS[status.status];
}
```

---

### 5. Update `src/lib/config/technical-upgrades.ts` - Content Filtering

Update the Content Filtering benefits to clarify it does NOT affect spam traps:

```typescript
{
	id: 'content-filtering',
	name: 'Content Filtering',
	description: 'Advanced content analysis and spam detection',
	cost: 120,
	category: 'security',
	dependencies: [],
	benefits: [
		'Reduces spam complaint rate by 30%',
		'Automatic content quality checks',
		'Protects sender reputation',
		'Does NOT affect spam trap risk (use List Hygiene for that)'
	]
}
```

---

## ✅ Add re_engagement Client Scenarios

### Add to Iteration 1 (after line 104)

```gherkin
Scenario: Re-engagement campaign
  Given ESP "SendWave" has 1 active re_engagement client (50K volume, 150 revenue)
  When resolution phase calculates
  Then total volume should be 50,000
  And base revenue should be 150
```

---

### Add to Iteration 4 (after line 232)

```gherkin
Scenario: Re-engagement high-risk impact
  Given ESP "SendWave" has:
    | Client Type      | Volume | Risk Level | Rep Impact |
    | premium_brand    | 30K    | Low        | +2         |
    | re_engagement    | 50K    | High       | -4         |
  When resolution phase calculates reputation change
  Then volume-weighted impact should be -1.75
  And complaint rate should be 1.88% weighted

# Calculation verification:
# Rep impact: (30K × +2 + 50K × -4) / 80K = (60 - 200) / 80 = -1.75
# Complaint rate: (30K × 0.5% + 50K × 2.5%) / 80K = (150 + 1250) / 80K = 1.875%
```

---

### Add to Iteration 5 (after line 286)

```gherkin
Scenario: Re-engagement with mitigation services
  Given ESP has re_engagement client (-4 reputation impact, 50K base volume, 2.5% spam rate)
  And both warmup and List Hygiene are active on this client
  And it's the client's first active round
  When resolution phase calculates
  Then reputation impact should be -2 (-4 base + 2 warmup)
  And volume sent should be 21,250 (50K × 85% hygiene × 50% warmup)
  And complaint rate should be 1.25% (2.5% × 50% reduction)

# Breakdown:
# - re_engagement is High risk → 15% volume reduction from List Hygiene
# - After List Hygiene: 50K × 0.85 = 42,500
# - Warmup: 42,500 × 0.50 = 21,250 volume
# - List Hygiene complaint: 2.5% × 0.50 = 1.25%
# - Reputation: -4 (base High risk) + 2 (warmup bonus) = -2
```

---

### Add to Iteration 8 (after line 412)

```gherkin
Scenario: Black Friday does not affect re-engagement
  Given round 4 incident is "Black Friday Rush"
  And ESP has re_engagement client with 50K base volume
  When resolution phase calculates
  Then re_engagement volume should remain 50K (no bonus)

# Note: Black Friday only boosts event_seasonal clients, not re_engagement
```

---

## ✅ Clarifications Resolved

All clarification questions have been answered and implemented:

### 1. Warmup Duration ✅
**Decision:** Volume reduction applies for **1 round only** (first active round)

**Implementation:**
- Config updated in client-onboarding.ts
- US 3.3 line 261 clarified
- Constant added: `WARMUP_VOLUME_REDUCTION = 0.50`

---

### 2. Warmup Reputation Bonus Scope ✅
**Decision:** +2 reputation bonus is **per destination** (applies to each destination separately)

**Implementation:**
- Config updated in client-onboarding.ts
- US 3.3 line 261 clarified
- Constant added: `WARMUP_REPUTATION_BONUS = 2`
- Example: If ESP sends to zmail, intake, yagle, each gets +2 reputation

---

### 3. Test Scenario Values ✅
**Decision:** Use **base values** for test scenarios (no variance)

**Implementation:**
- US 3.3 scenarios use base values from config
- Tests will generate clients with base values for predictable testing
- ±10% variance only applies to production game sessions

---

## 📝 Summary Checklist

### US 3.3 Document Fixes
- [x] Fix Iteration 1, line 102-103: Volume 65K, Revenue 530
- [x] Fix Iteration 2, line 134: Change reputation to 40 (Poor zone)
- [x] Fix Iteration 5, line 244: List Hygiene 50% (not 40%)
- [x] Fix Iteration 5, line 269: Complaint rate 1.5% (not 1.8%)
- [x] Fix Iteration 5, line 274-275: Warmup "+2 bonus", List Hygiene "50%"
- [x] Fix Iteration 5, line 278-279: Complaint 0.75%, Volume 18K, "Medium risk"
- [x] Fix Iteration 10, line 468: Volume 70K (not 700K)
- [x] Add re_engagement scenarios to Iterations 1, 4, 5, 8

### Config File Updates
- [x] Add `RISK_REPUTATION_IMPACT` to client-profiles.ts
- [x] Add `WARMUP_REPUTATION_BONUS` to client-onboarding.ts
- [x] Add `WARMUP_VOLUME_REDUCTION` to client-onboarding.ts
- [x] Add `LIST_HYGIENE_COMPLAINT_REDUCTION` to client-onboarding.ts
- [x] Add `LIST_HYGIENE_VOLUME_REDUCTION` to client-onboarding.ts
- [x] Add `LIST_HYGIENE_SPAM_TRAP_REDUCTION` to client-onboarding.ts
- [x] Update warmup and List Hygiene descriptions
- [x] Add `AUTHENTICATION_DELIVERY_BONUSES` to technical-upgrades.ts
- [x] Add `getAuthenticationDeliveryBonus()` helper function
- [x] Add `getAuthenticationReputationBonus()` helper function
- [x] Add `DMARC_MISSING_PENALTY` constant
- [x] Add `REPUTATION_DELIVERY_SUCCESS` to metrics-thresholds.ts
- [x] Add `getDeliverySuccessRate()` helper function
- [x] Update Content Filtering benefits description

### Clarifications Resolved
- [x] Warmup duration: **1 round only** (first active round)
- [x] Warmup reputation bonus: **per-destination** (applies to each destination separately)
- [x] Test scenarios: **use base values** (no variance for predictable testing)

---

## 🎯 Next Steps

1. **Review & approve** this document with the team
2. **Fix calculation errors** in US 3.3 markdown file
3. **Add re_engagement scenarios** to US 3.3
4. **Update config files** with new constants and helper functions
5. **Answer clarification questions** and document decisions
6. **Begin Iteration 1 implementation** with updated constants

---

**Document Version:** 1.0
**Last Updated:** 2025-11-07
**Status:** Ready for Review
