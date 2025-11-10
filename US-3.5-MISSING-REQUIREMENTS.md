# US-3.5 Missing Requirements and Implementation Gaps

**Document Purpose:** Comprehensive analysis of missing requirements, data structure gaps, and implementation blockers for US-3.5 (Consequences Phase Display)

**Last Updated:** 2025-11-08

---

## 📋 Executive Summary

**Current Status:**
- ✅ **Iteration 1 (Basic Structure):** Can be implemented NOW with minor enhancements
- ⚠️ **Iteration 2 (ESP Details):** Partially blocked - needs US-3.3 integration completion
- ❌ **Iteration 3 (Destination Details):** FULLY BLOCKED - requires US-3.3 Iteration 6
- ⚠️ **Iteration 4 (Polish):** Can be implemented incrementally after Iteration 2

**Critical Blocker:** US-3.3 Iterations 3-5 calculators exist but are NOT integrated into resolution-manager.ts

---

## 🔴 CRITICAL BLOCKERS

### 1. Resolution Manager Integration Incomplete

**File:** `/src/lib/server/game/resolution-manager.ts`

**Current State:**
```typescript
// ✅ CALLED in executeResolution():
calculateVolume()          // Lines work
calculateDeliverySuccess() // Lines work
calculateRevenue()         // Lines work

// ❌ NOT CALLED (but calculators exist and are tested):
calculateReputationChanges()  // Exists in calculators/reputation-calculator.ts
calculateComplaints()          // Exists in calculators/complaint-calculator.ts
```

**Impact:**
- Cannot display reputation changes (Scenario 2.4)
- Cannot display spam/complaint rates (Scenario 2.1)
- Cannot calculate per-client impacts accurately

**Fix Required:**
1. Call `calculateReputationChanges()` in resolution loop
2. Call `calculateComplaints()` in resolution loop
3. Add results to `ESPResolutionResult` type
4. Update resolution result storage

**Estimated Effort:** 2-3 hours (straightforward integration)

---

### 2. Destination Filtering System Not Implemented (US-3.3 Iteration 6)

**Blocks:** Entire Iteration 3 of US-3.5 (Scenarios 3.1-3.7)

**Missing Components:**
- ❌ Destination filtering calculation logic
- ❌ User satisfaction calculation (formula exists in US-3.3-user_satisfaction)
- ❌ False positive tracking
- ❌ Spam blocking effectiveness calculation
- ❌ Per-ESP filtering breakdown

**Dependencies:**
- US-3.3 Iteration 6.1: User Satisfaction & False Positives
- Filtering effectiveness formulas
- Destination revenue calculation based on satisfaction

**Status:** Not started

**Estimated Effort:** 10-15 hours (complex calculation system)

---

### 3. Consequences Phase Transition Not Implemented

**File:** `/src/lib/server/game/phase-manager.ts`

**Current State:**
- ✅ Phase type `'consequences'` exists in GamePhase enum
- ❌ No automatic transition after resolution completes
- ❌ No phase handler for consequences phase
- ❌ No WebSocket broadcast for consequences data

**Scenario:** 1.1 - "When the resolution calculation completes, then the phase should change to 'Consequences'"

**Fix Required:**
1. Add `transitionToConsequences()` method in phase-manager
2. Call after `executeResolution()` completes
3. Broadcast `phase_update` to all players
4. Broadcast `consequences_data` with resolution results

**Estimated Effort:** 2-4 hours

---

## 🟡 DATA STRUCTURE GAPS

### 4. ESPTeam Budget/Credits Duplication

**File:** `/src/lib/server/game/types.ts` (lines 17, 21)

**Current State:**
```typescript
export interface ESPTeam {
  budget: number;   // Line 17 - Legacy field?
  credits: number;  // Line 21 - US-1.4 field
  // ...
}
```

**Issue:** Two fields for the same concept

**Clarification Needed:**
- Which field is actively used?
- Should one be deprecated?
- Do they serve different purposes?

**Recommendation:**
- Use `credits` consistently (matches US-1.4 and game terminology)
- Deprecate or remove `budget` field
- Update all references

**Estimated Effort:** 1-2 hours (find/replace + testing)

---

### 5. Historical Data Storage Missing

**Scenarios:** 2.4, 3.4, 4.12, X.5

**Required:** Store "previous values" for before/after comparisons

**Missing Fields:**
```typescript
// Need to track per round:
- previous_reputation: Record<string, number>
- previous_budget: number
- previous_satisfaction: number (for destinations)
- round_results_history: ResolutionResults[] // For historical review
```

**Use Cases:**
- Display "Old Score → New Score → Change" (Scenario 2.4)
- Show trend arrows (Scenario 4.12)
- Allow review of previous rounds (Scenario X.5)

**Implementation Options:**

**Option A: Snapshot Before Resolution**
```typescript
// In resolution-manager.ts before calculating:
const previousState = {
  reputation: { ...team.reputation },
  credits: team.credits
};
// Include in results for comparison
```

**Option B: Add to ESPTeam/Destination**
```typescript
export interface ESPTeam {
  // ... existing fields
  previous_round_snapshot?: {
    reputation: Record<string, number>;
    credits: number;
    round: number;
  };
}
```

**Option C: Dedicated History Storage**
```typescript
export interface GameSession {
  // ... existing fields
  round_results_archive: Record<number, ResolutionResults>; // key = round number
}
```

**Recommendation:** Use Option C (dedicated archive) for clean separation and easy historical review

**Estimated Effort:** 3-4 hours

---

### 6. Per-Client-Per-Destination Reputation Breakdown Missing

**Scenario:** 2.3 - "Display how each client affected reputation at each destination"

**Expected Display:**
```
| Client              | Gmail Impact | Outlook Impact | Yahoo Impact |
| Premium Brand Co.   | +2           | +2             | +1           |
| Growing Startup     | +1           | 0              | +1           |
```

**Current Implementation:**
- `ReputationResult` returns aggregate volume-weighted impact per destination
- No per-client breakdown available

**File:** `/src/lib/server/game/calculators/reputation-calculator.ts`

**Current Type:**
```typescript
export interface ReputationResult {
  perDestinationImpact: Record<string, number>; // { Gmail: +5, Outlook: -2 }
  techStackBonus: number;
  authStackBonus: Record<string, number>;
}
```

**Required Enhancement:**
```typescript
export interface ReputationResult {
  perDestinationImpact: Record<string, number>; // Aggregate
  perClientPerDestinationImpact: Record<string, Record<string, number>>;
  // Example: { "client-001": { Gmail: +2, Outlook: +1 }, "client-002": { Gmail: -1 } }
  techStackBonus: number;
  authStackBonus: Record<string, number>;
}
```

**Fix Required:**
- Modify `calculateReputationChanges()` to track per-client impact
- Loop through each client's risk level and volume
- Calculate individual contribution to each destination
- Return enhanced result structure

**Estimated Effort:** 3-4 hours (calculator enhancement + tests)

---

### 7. Filtered Emails Count Not Calculated

**Scenario:** 2.1 - "Display individual client delivery success rates"

**Expected Display:**
```
| Client Name       | Emails Sent | Delivered | Filtered |
| Growing Startup   | 35,000      | 31,500    | 3,500    |
```

**Definition (Clarified):**
- **For ESP:** `Filtered = Total Sent - Delivered` (includes spam blocked + false positives)

**Current Implementation:**
- `VolumeResult` returns total volume per client
- `DeliveryResult` returns delivery success rate percentage
- NO explicit "filtered count" calculation

**File:** `/src/lib/server/game/calculators/delivery-calculator.ts`

**Required Enhancement:**
```typescript
export interface DeliveryResult {
  weightedRate: number;
  perDestinationRates: Record<string, number>;
  overallZone: ReputationZone;
  // ADD:
  perClientDelivery?: Record<string, {
    sent: number;
    delivered: number;
    filtered: number;
  }>;
}
```

**Calculation:**
```typescript
for each client:
  sent = volume_result[client.id]
  delivered = sent * delivery_rate
  filtered = sent - delivered
```

**Estimated Effort:** 2-3 hours

---

## 🟢 ITERATION 1 REQUIREMENTS (Ready to Implement)

### ✅ Can Implement NOW

**Scenario 1.1: Transition to Consequences Phase**
- **Status:** Needs phase transition implementation (see #3)
- **Blockers:** None (straightforward)
- **Files:** phase-manager.ts, server.js (WebSocket broadcast)

**Scenario 1.2: Consequences screen displays for ESP player**
- **Status:** Ready - just UI structure
- **Blockers:** None
- **Required Sections:**
  1. Client Performance
  2. Revenue Summary
  3. Reputation Changes
  4. Budget Update
  5. Alerts & Notifications (stub for now)
- **Files:** New component `/src/routes/esp-dashboard/ConsequencesPhase.svelte`

**Scenario 1.3: Consequences screen displays for Destination player**
- **Status:** Can create structure (no data yet)
- **Blockers:** Data requires US-3.3 Iteration 6
- **Action:** Create placeholder sections for future implementation
- **Files:** New component `/src/routes/destination-dashboard/ConsequencesPhase.svelte`

---

## 🟡 ITERATION 2 REQUIREMENTS (Partially Ready)

### Can Implement After Fixing #1 (Resolution Integration)

**Scenario 2.2: Client revenue contribution display** ✅
- **Status:** READY - revenue calculator already working
- **Data Available:** `RevenueResult.perClientRevenue`
- **Blockers:** None

**Scenario 2.4: Reputation changes per destination for ESP** ✅
- **Status:** READY after #1 fixed
- **Data Available:** `ReputationResult.perDestinationImpact` (after integration)
- **Blockers:** #1 (calculator not called)

**Scenario 2.5: Budget update for ESP** ✅
- **Status:** READY
- **Data Available:** Previous credits (needs #5 snapshot) + revenue earned
- **Blockers:** #5 (historical data)

### Needs Enhancement

**Scenario 2.1: Client performance display** ⚠️
- **Status:** Partially ready
- **Missing:** Filtered count calculation (see #7)
- **Missing:** Spam/complaint rate per client
- **Blockers:** #1 (complaint calculator not called), #7 (filtered count)

**Scenario 2.3: Client reputation impact display** ⚠️
- **Status:** Blocked
- **Missing:** Per-client-per-destination breakdown (see #6)
- **Blockers:** #6 (data structure enhancement)

### Not Planned for Basic Version

**Scenarios 2.6, 2.7, 2.8:** Alert system (defer to future iteration)

---

## 🔴 ITERATION 3 REQUIREMENTS (Blocked)

**ALL Destination scenarios (3.1-3.7) BLOCKED by US-3.3 Iteration 6**

Required from US-3.3 Iteration 6:
1. Filtering effectiveness calculation
2. User satisfaction formula implementation
3. False positive tracking
4. Spam blocking vs. spam delivered breakdown
5. Per-ESP filtering metrics
6. Destination revenue based on satisfaction

**Status:** Cannot proceed until US-3.3 Iteration 6 complete

**Estimated Prerequisite Effort:** 10-15 hours for US-3.3 Iteration 6

---

## 🟢 ITERATION 4 REQUIREMENTS (Incremental)

**Status:** Can implement incrementally as polish layer

**Low Effort (2-3 hours each):**
- Scenario 4.1: Change indicators with animations
- Scenario 4.2: Color-coded severity indicators
- Scenario 4.3: Tooltips for complex metrics
- Scenario 4.4: Reputation threshold visual indicators
- Scenario 4.5: Client card visual hierarchy
- Scenario 4.6: Revenue summary with visual emphasis

**Medium Effort (4-6 hours each):**
- Scenario 4.8: Responsive layout for different screen sizes
- Scenario 4.9: Loading states during calculation
- Scenario 4.10: Accessibility features

**High Effort (6-8 hours each):**
- Scenario 4.7: Alert priority and grouping (needs alert system)
- Scenario 4.11: Interactive elements for exploration (expandable cards)
- Scenario 4.12: Comparison with previous round (needs #5 historical data)

---

## 📊 CLARIFICATIONS RESOLVED

### Terminology Clarifications (from discussion)

✅ **"Spam Rate" = "Complaint Rate"**
- Same metric throughout
- Use `complaint_rate` in code
- Display as "Spam Rate" in UI
- Source: `client.spam_rate` field (percentage, e.g., 1.2 for 1.2%)

✅ **"Filtered" Definition**
- **ESP View:** Filtered = Total Sent - Delivered
  - Includes: Spam blocked by destination + False positives
  - Calculation: `filtered = sent - delivered`
- **Destination View:**
  - Spam Blocked = Correctly identified and blocked spam
  - False Positives = Legitimate emails incorrectly blocked
  - Total Blocked = Spam Blocked + False Positives

✅ **"Budget" vs "Credits"**
- Both ESPTeam and Destination have `budget: number` field
- "Credits" is the currency name
- Display as "X credits" in UI
- **Note:** ESPTeam has redundant `budget` AND `credits` fields (see #4)

---

## 🎯 RECOMMENDED IMPLEMENTATION PHASES

### Phase 1: Fix Core Blockers (6-10 hours)
**Priority:** CRITICAL

1. **Integrate reputation & complaint calculators** (#1)
   - Call in resolution-manager.ts
   - Add to ESPResolutionResult
   - Test integration

2. **Implement consequences phase transition** (#3)
   - Add phase handler
   - Broadcast via WebSocket
   - Test phase flow

3. **Resolve budget/credits duplication** (#4)
   - Standardize on `credits` field
   - Update all references
   - Remove deprecated field

### Phase 2: Implement Iteration 1 (8-12 hours)
**Priority:** HIGH - Required for basic playability

1. **Create basic consequences UI structure** (Scenarios 1.1-1.3)
   - ESP consequences page with 5 sections
   - Destination consequences page (placeholder sections)
   - WebSocket data reception
   - Basic styling

2. **Add historical data storage** (#5)
   - Implement round results archive
   - Snapshot previous values
   - Test persistence

### Phase 3: Enhance Data for Iteration 2 (8-12 hours)
**Priority:** MEDIUM - Needed for meaningful display

1. **Add filtered count calculation** (#7)
   - Enhance DeliveryResult type
   - Calculate per-client breakdown
   - Test calculation

2. **Implement per-client reputation breakdown** (#6)
   - Enhance ReputationResult type
   - Modify calculator logic
   - Test per-client impacts

3. **Display enhanced ESP results** (Scenarios 2.1, 2.2, 2.4, 2.5)
   - Client performance cards
   - Revenue breakdown
   - Reputation changes with comparison
   - Budget update with calculation

### Phase 4: Polish Iteration 4 (10-15 hours)
**Priority:** LOW - Nice-to-have enhancements

1. Implement visual enhancements (animations, colors, icons)
2. Add tooltips and accessibility features
3. Responsive layout
4. Loading states

### Phase 5: Block for US-3.3 Iteration 6 (Future)
**Priority:** BLOCKED - Cannot proceed

1. Implement US-3.3 Iteration 6 (destination filtering)
2. Then return to implement US-3.5 Iteration 3 (destination consequences)

---

## 🧪 TESTING GAPS

### Unit Tests Needed

**Resolution Manager Integration:**
- [ ] Test reputation calculator is called in executeResolution()
- [ ] Test complaint calculator is called in executeResolution()
- [ ] Test ESPResolutionResult includes all data
- [ ] Test previous values are captured before calculation

**Delivery Calculator Enhancement:**
- [ ] Test filtered count calculation
- [ ] Test per-client delivery breakdown
- [ ] Test filtered = sent - delivered formula

**Reputation Calculator Enhancement:**
- [ ] Test per-client-per-destination breakdown
- [ ] Test individual client contributions sum to total

### Integration Tests Needed

**Phase Transitions:**
- [ ] Test Resolution → Consequences transition
- [ ] Test WebSocket broadcast of consequences data
- [ ] Test all players receive consequences simultaneously

**Historical Data:**
- [ ] Test round results are archived
- [ ] Test historical review retrieves correct round
- [ ] Test before/after comparisons display correctly

### E2E Tests Needed (Iteration 1)

**Scenario 1.1: Transition to Consequences Phase**
- [ ] Given Resolution phase completes
- [ ] When calculations finish
- [ ] Then phase changes to Consequences
- [ ] And all players see consequences screen

**Scenario 1.2: ESP consequences screen structure**
- [ ] Given ESP player in Consequences phase
- [ ] When viewing consequences screen
- [ ] Then see 5 sections with correct titles
- [ ] And each section has visual container

**Scenario 1.3: Destination consequences screen structure**
- [ ] Given Destination player in Consequences phase
- [ ] When viewing consequences screen
- [ ] Then see 5 sections with correct titles
- [ ] And each section has visual container (placeholders OK)

---

## 📋 DEFINITION OF DONE: ITERATION 1

**Iteration 1 is complete when:**

- [x] ~~Spam rate terminology clarified~~ (confirmed: same as complaint rate)
- [x] ~~Budget/credits terminology clarified~~ (confirmed: credits is currency, both have budget field)
- [x] ~~Filtered definition clarified~~ (confirmed: sent - delivered for ESP)
- [ ] Resolution manager calls reputation calculator (#1)
- [ ] Resolution manager calls complaint calculator (#1)
- [ ] ESPResolutionResult includes reputation and complaints (#1)
- [ ] Consequences phase transition implemented (#3)
- [ ] WebSocket broadcasts consequences data (#3)
- [ ] Previous values captured before resolution (#5)
- [ ] Round results stored in archive (#5)
- [ ] Budget/credits fields standardized (#4)
- [ ] ESP consequences page created (Scenario 1.2)
- [ ] Destination consequences page created with placeholder sections (Scenario 1.3)
- [ ] All Iteration 1 E2E tests pass
- [ ] No visual polish required (defer to Iteration 4)

**Estimated Total Effort for Iteration 1:** 14-22 hours

---

## 🔮 FUTURE WORK (Beyond Basic Version)

### Medium Term (US-3.5 Iteration 2 Complete)
- Alert system design and implementation
- Achievement/unlock system
- Per-client detailed breakdowns
- All Scenarios 2.1-2.5 fully functional

### Long Term (After US-3.3 Iteration 6)
- Destination filtering system
- User satisfaction calculation
- False positive tracking
- All Scenarios 3.1-3.7 functional

### Polish Phase
- Full Iteration 4 implementation
- Animations and transitions
- Accessibility enhancements
- Mobile responsiveness

---

## 📞 QUESTIONS FOR CLARIFICATION

### Resolved ✅
1. ~~Is "spam rate" the same as "complaint rate"?~~ **YES**
2. ~~Where is ESP budget/credits stored?~~ **Both budget and credits fields exist (needs cleanup)**
3. ~~What is "filtered" for ESP vs Destination?~~ **ESP: sent-delivered; Dest: spam blocked separately from FP**

### Still Open ❓
1. Should we deprecate ESPTeam.budget in favor of ESPTeam.credits?
2. Which historical data storage option is preferred (A, B, or C in #5)?
3. Should Scenario 2.3 per-client reputation be implemented in Iteration 2 or deferred?
4. Should alert system (Scenarios 2.6-2.8) be included in basic version or deferred?

---

**Document Status:** ✅ Complete - Ready for implementation planning
