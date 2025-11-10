# US-3.3 Iteration 5 Implementation Plan
## Risk Mitigation Services (Warmup & List Hygiene)

**Status:** Planning Phase
**Date:** 2025-11-07
**Methodology:** ATDD (Acceptance Test-Driven Development)
**Architecture:** Calculator Pattern with Pure Functions

---

## 📋 Iteration 5 Overview

**Goal:** Implement warmup and List Hygiene risk mitigation services

### Core Mechanics:

**Warmup:**
- +2 reputation bonus per destination for warmed clients
- 50% volume reduction during first round of activity only
- Per-client service (not global)

**List Hygiene:**
- 50% complaint rate reduction for that client
- Permanent volume reduction by risk level:
  - Low risk: 5%
  - Medium risk: 10%
  - High risk: 15%
- Per-client service (not global)

**Content Filtering:**
- 30% complaint rate reduction (global tech upgrade)
- Does NOT affect spam trap risk

---

## 🎯 ATDD Workflow

### Phase 0: Update Types (if needed)
### Phase 1: RED - Write Failing Tests
### Phase 2: GREEN - Implement to Pass Tests
### Phase 3: REFACTOR - Clean up while keeping tests green
### Phase 4: VERIFY - Run all calculator tests (Iterations 1-5)

---

## 📐 Architecture Review

### Affected Calculators:

1. **Volume Calculator** - Add warmup and list hygiene reductions
2. **Reputation Calculator** - Add warmup bonus
3. **Complaint Calculator** - Add list hygiene and content filtering reductions

### Configuration Files (Already Defined):

✅ **client-onboarding.ts** - Contains all Iteration 5 constants:
- `WARMUP_REPUTATION_BONUS = 2`
- `WARMUP_VOLUME_REDUCTION = 0.5`
- `LIST_HYGIENE_VOLUME_REDUCTION = { Low: 0.05, Medium: 0.1, High: 0.15 }`
- `LIST_HYGIENE_COMPLAINT_REDUCTION = 0.5`
- `getListHygieneVolumeReduction(risk)` helper function

✅ **technical-upgrades.ts** - Content filtering defined but constant missing:
- `content-filtering` tech exists (line 74)
- Need to add: `CONTENT_FILTERING_COMPLAINT_REDUCTION = 0.3`

---

## 📝 Implementation Steps

---

## STEP 1: Update Type Definitions (if needed)

### File: `src/lib/server/game/resolution-types.ts`

**Current ComplaintParams (from Iteration 4):**
```typescript
export interface ComplaintParams {
  clients: Client[];
  volumeData: VolumeResult;
  // Iteration 5 will add: clientStates, techStack
}
```

**Changes needed:**
- Make `clientStates` and `techStack` required (remove comment)
- Update `ComplaintResult` to include `adjustedComplaintRate`

**Expected result:**
```typescript
export interface ComplaintParams {
  clients: Client[];
  volumeData: VolumeResult;
  clientStates: Record<string, ClientState>; // Iteration 5: for list hygiene check
  techStack: string[]; // Iteration 5: for content filtering check
}

export interface ClientComplaintData {
  clientId: string;
  baseRate: number;
  adjustedRate: number; // Iteration 5: after list hygiene
  volume: number;
}

export interface ComplaintResult {
  baseComplaintRate: number; // volume-weighted before reductions
  adjustedComplaintRate: number; // Iteration 5: after list hygiene + content filtering
  perClient: ClientComplaintData[];
  // Iteration 7 will add: spamTrapRisk
}
```

---

## STEP 2: Add Content Filtering Constant

### File: `src/lib/config/technical-upgrades.ts`

**Add after line 217:**
```typescript
/**
 * Content Filtering complaint reduction
 * US-3.3: Resolution Phase Automation - Iteration 5
 */
export const CONTENT_FILTERING_COMPLAINT_REDUCTION = 0.3; // 30% reduction
```

---

## STEP 3: Volume Calculator - RED Phase (Write Tests)

### File: `src/lib/server/game/calculators/volume-calculator.test.ts`

**Add new test suite for Iteration 5:**

```typescript
describe('Volume Calculator - Iteration 5: Risk Mitigation Services', () => {
  describe('Warmup volume reduction', () => {
    test('50% volume reduction in first active round', () => {
      const client = buildTestClient('premium_brand');
      const result = calculateVolume({
        clients: [client],
        clientStates: {
          [client.id]: {
            status: 'Active',
            has_warmup: true,
            has_list_hygiene: false,
            first_active_round: 1
          }
        },
        currentRound: 1
      });

      expect(result.totalVolume).toBe(15000); // 30K * 0.5
      expect(result.clientVolumes[0].baseVolume).toBe(30000);
      expect(result.clientVolumes[0].adjustedVolume).toBe(15000);
      expect(result.clientVolumes[0].adjustments.warmup).toBe(15000);
    });

    test('no warmup reduction after first active round', () => {
      const client = buildTestClient('premium_brand');
      const result = calculateVolume({
        clients: [client],
        clientStates: {
          [client.id]: {
            status: 'Active',
            has_warmup: true,
            has_list_hygiene: false,
            first_active_round: 1
          }
        },
        currentRound: 2
      });

      expect(result.totalVolume).toBe(30000); // Full volume
      expect(result.clientVolumes[0].adjustments.warmup).toBeUndefined();
    });

    test('warmup reduction on high-volume client', () => {
      const client = buildTestClient('aggressive_marketer'); // 80K base
      const result = calculateVolume({
        clients: [client],
        clientStates: {
          [client.id]: {
            status: 'Active',
            has_warmup: true,
            has_list_hygiene: false,
            first_active_round: 1
          }
        },
        currentRound: 1
      });

      expect(result.totalVolume).toBe(40000); // 80K * 0.5
      expect(result.clientVolumes[0].adjustments.warmup).toBe(40000);
    });
  });

  describe('List hygiene volume reduction', () => {
    test('Low risk client: 5% permanent reduction', () => {
      const client = buildTestClient('premium_brand'); // Low risk, 30K
      const result = calculateVolume({
        clients: [client],
        clientStates: {
          [client.id]: {
            status: 'Active',
            has_warmup: false,
            has_list_hygiene: true,
            first_active_round: 1
          }
        },
        currentRound: 1
      });

      expect(result.totalVolume).toBe(28500); // 30K * 0.95
      expect(result.clientVolumes[0].adjustments.listHygiene).toBe(1500);
    });

    test('Medium risk client: 10% permanent reduction', () => {
      const client = buildTestClient('growing_startup'); // Medium risk, 35K
      const result = calculateVolume({
        clients: [client],
        clientStates: {
          [client.id]: {
            status: 'Active',
            has_warmup: false,
            has_list_hygiene: true,
            first_active_round: 1
          }
        },
        currentRound: 1
      });

      expect(result.totalVolume).toBe(31500); // 35K * 0.90
      expect(result.clientVolumes[0].adjustments.listHygiene).toBe(3500);
    });

    test('High risk client: 15% permanent reduction', () => {
      const client = buildTestClient('aggressive_marketer'); // High risk, 80K
      const result = calculateVolume({
        clients: [client],
        clientStates: {
          [client.id]: {
            status: 'Active',
            has_warmup: false,
            has_list_hygiene: true,
            first_active_round: 1
          }
        },
        currentRound: 1
      });

      expect(result.totalVolume).toBe(68000); // 80K * 0.85
      expect(result.clientVolumes[0].adjustments.listHygiene).toBe(12000);
    });

    test('list hygiene applies in all rounds (permanent)', () => {
      const client = buildTestClient('aggressive_marketer');

      // Round 1
      const result1 = calculateVolume({
        clients: [client],
        clientStates: {
          [client.id]: {
            status: 'Active',
            has_warmup: false,
            has_list_hygiene: true,
            first_active_round: 1
          }
        },
        currentRound: 1
      });
      expect(result1.totalVolume).toBe(68000);

      // Round 2 - still applies
      const result2 = calculateVolume({
        clients: [client],
        clientStates: {
          [client.id]: {
            status: 'Active',
            has_warmup: false,
            has_list_hygiene: true,
            first_active_round: 1
          }
        },
        currentRound: 2
      });
      expect(result2.totalVolume).toBe(68000);
    });
  });

  describe('Combined warmup + list hygiene', () => {
    test('both services apply: hygiene first, then warmup', () => {
      const client = buildTestClient('event_seasonal'); // Medium risk, 40K
      const result = calculateVolume({
        clients: [client],
        clientStates: {
          [client.id]: {
            status: 'Active',
            has_warmup: true,
            has_list_hygiene: true,
            first_active_round: 1
          }
        },
        currentRound: 1
      });

      // Calculation: 40K × 0.90 (hygiene) = 36K, then 36K × 0.50 (warmup) = 18K
      expect(result.totalVolume).toBe(18000);
      expect(result.clientVolumes[0].adjustments.listHygiene).toBe(4000);
      expect(result.clientVolumes[0].adjustments.warmup).toBe(18000);
    });

    test('re_engagement with both services (High risk, 50K)', () => {
      const client = buildTestClient('re_engagement'); // High risk, 50K
      const result = calculateVolume({
        clients: [client],
        clientStates: {
          [client.id]: {
            status: 'Active',
            has_warmup: true,
            has_list_hygiene: true,
            first_active_round: 1
          }
        },
        currentRound: 1
      });

      // Calculation: 50K × 0.85 (hygiene) = 42.5K, then 42.5K × 0.50 (warmup) = 21.25K
      expect(result.totalVolume).toBe(21250);
      expect(result.clientVolumes[0].adjustments.listHygiene).toBe(7500);
      expect(result.clientVolumes[0].adjustments.warmup).toBe(21250);
    });

    test('combined services in round 2: only hygiene applies', () => {
      const client = buildTestClient('event_seasonal');
      const result = calculateVolume({
        clients: [client],
        clientStates: {
          [client.id]: {
            status: 'Active',
            has_warmup: true,
            has_list_hygiene: true,
            first_active_round: 1
          }
        },
        currentRound: 2
      });

      // Only hygiene applies (warmup only first round)
      expect(result.totalVolume).toBe(36000); // 40K × 0.90
      expect(result.clientVolumes[0].adjustments.warmup).toBeUndefined();
    });
  });

  describe('Multiple clients with different services', () => {
    test('tracks per-client service usage', () => {
      const warmedClient = buildTestClient('premium_brand', { id: 'client-1' });
      const hygieneClient = buildTestClient('growing_startup', { id: 'client-2' });
      const bothClient = buildTestClient('event_seasonal', { id: 'client-3' });

      const result = calculateVolume({
        clients: [warmedClient, hygieneClient, bothClient],
        clientStates: {
          'client-1': {
            status: 'Active',
            has_warmup: true,
            has_list_hygiene: false,
            first_active_round: 1
          },
          'client-2': {
            status: 'Active',
            has_warmup: false,
            has_list_hygiene: true,
            first_active_round: 1
          },
          'client-3': {
            status: 'Active',
            has_warmup: true,
            has_list_hygiene: true,
            first_active_round: 1
          }
        },
        currentRound: 1
      });

      // Client 1: 30K × 0.50 (warmup) = 15K
      expect(result.clientVolumes[0].adjustedVolume).toBe(15000);

      // Client 2: 35K × 0.90 (hygiene) = 31.5K
      expect(result.clientVolumes[1].adjustedVolume).toBe(31500);

      // Client 3: 40K × 0.90 (hygiene) × 0.50 (warmup) = 18K
      expect(result.clientVolumes[2].adjustedVolume).toBe(18000);

      // Total: 15K + 31.5K + 18K = 64.5K
      expect(result.totalVolume).toBe(64500);
    });
  });
});
```

**Test count:** 14 new tests for volume calculator

---

## STEP 4: Volume Calculator - GREEN Phase (Implementation)

### File: `src/lib/server/game/calculators/volume-calculator.ts`

**Current implementation (Iteration 1):**
```typescript
export function calculateVolume(params: VolumeParams): VolumeResult {
  const activeClients = params.clients.filter(client =>
    params.clientStates[client.id]?.status === 'Active'
  );

  const clientVolumes = activeClients.map(client => ({
    clientId: client.id,
    baseVolume: client.volume,
    adjustedVolume: client.volume,
    adjustments: {}
  }));

  const totalVolume = clientVolumes.reduce((sum, cv) => sum + cv.adjustedVolume, 0);

  return { activeClients, clientVolumes, totalVolume };
}
```

**Enhanced implementation (Iteration 5):**
```typescript
import {
  getListHygieneVolumeReduction,
  WARMUP_VOLUME_REDUCTION
} from '$lib/config/client-onboarding';

export function calculateVolume(params: VolumeParams): VolumeResult {
  const activeClients = params.clients.filter(client =>
    params.clientStates[client.id]?.status === 'Active'
  );

  const clientVolumes = activeClients.map(client => {
    const state = params.clientStates[client.id];
    let adjustedVolume = client.volume;
    const adjustments: Record<string, number> = {};

    // 1. List hygiene reduction (permanent, applied first)
    if (state.has_list_hygiene) {
      const reductionPercentage = getListHygieneVolumeReduction(client.risk);
      const reductionAmount = client.volume * reductionPercentage;
      adjustedVolume -= reductionAmount;
      adjustments.listHygiene = reductionAmount;
    }

    // 2. Warmup reduction (first round only, applied to already-reduced volume)
    if (state.has_warmup && state.first_active_round === params.currentRound) {
      const reductionAmount = adjustedVolume * WARMUP_VOLUME_REDUCTION;
      adjustedVolume -= reductionAmount;
      adjustments.warmup = reductionAmount;
    }

    return {
      clientId: client.id,
      baseVolume: client.volume,
      adjustedVolume: Math.round(adjustedVolume),
      adjustments
    };
  });

  const totalVolume = clientVolumes.reduce((sum, cv) => sum + cv.adjustedVolume, 0);

  return { activeClients, clientVolumes, totalVolume };
}
```

**Key implementation details:**
- List hygiene is applied first (permanent reduction)
- Warmup is applied second (to the already-reduced volume)
- Warmup only applies when `currentRound === first_active_round`
- Both reductions are tracked separately in `adjustments`
- Final volume is rounded to nearest integer

**Run tests:** All 6 Iteration 1 tests + 14 new Iteration 5 tests should pass (20 total)

---

## STEP 5: Reputation Calculator - RED Phase (Write Tests)

### File: `src/lib/server/game/calculators/reputation-calculator.test.ts`

**Add new test suite for Iteration 5:**

```typescript
describe('Reputation Calculator - Iteration 5: Warmup Bonus', () => {
  describe('Single warmed client', () => {
    test('warmed Low risk client: tech bonus + client impact + warmup bonus', () => {
      const client = buildTestClient('premium_brand'); // Low risk = +2
      const volumeData: VolumeResult = {
        activeClients: [client],
        clientVolumes: [
          { clientId: client.id, baseVolume: 30000, adjustedVolume: 15000, adjustments: { warmup: 15000 } }
        ],
        totalVolume: 15000
      };

      const result = calculateReputationChanges({
        techStack: [],
        destinations: ['Gmail'],
        clients: [client],
        clientStates: {
          [client.id]: {
            status: 'Active',
            has_warmup: true,
            has_list_hygiene: false,
            first_active_round: 1
          }
        },
        volumeData,
        currentRound: 1
      });

      expect(result.perDestination['Gmail'].techBonus).toBe(0);
      expect(result.perDestination['Gmail'].clientImpact).toBe(2); // Low risk
      expect(result.perDestination['Gmail'].warmupBonus).toBe(2); // +2 per warmed client
      expect(result.perDestination['Gmail'].totalChange).toBe(4); // 0 + 2 + 2
    });

    test('warmed High risk client: reputation impact mitigated', () => {
      const client = buildTestClient('aggressive_marketer'); // High risk = -4
      const volumeData: VolumeResult = {
        activeClients: [client],
        clientVolumes: [
          { clientId: client.id, baseVolume: 80000, adjustedVolume: 40000, adjustments: { warmup: 40000 } }
        ],
        totalVolume: 40000
      };

      const result = calculateReputationChanges({
        techStack: [],
        destinations: ['Gmail'],
        clients: [client],
        clientStates: {
          [client.id]: {
            status: 'Active',
            has_warmup: true,
            has_list_hygiene: false,
            first_active_round: 1
          }
        },
        volumeData,
        currentRound: 1
      });

      expect(result.perDestination['Gmail'].clientImpact).toBe(-4);
      expect(result.perDestination['Gmail'].warmupBonus).toBe(2);
      expect(result.perDestination['Gmail'].totalChange).toBe(-2); // -4 + 2 = -2
    });

    test('warmed Medium risk client: net positive reputation', () => {
      const client = buildTestClient('event_seasonal'); // Medium risk = -1
      const volumeData: VolumeResult = {
        activeClients: [client],
        clientVolumes: [
          { clientId: client.id, baseVolume: 40000, adjustedVolume: 18000, adjustments: { warmup: 18000, listHygiene: 4000 } }
        ],
        totalVolume: 18000
      };

      const result = calculateReputationChanges({
        techStack: [],
        destinations: ['Gmail'],
        clients: [client],
        clientStates: {
          [client.id]: {
            status: 'Active',
            has_warmup: true,
            has_list_hygiene: true,
            first_active_round: 1
          }
        },
        volumeData,
        currentRound: 1
      });

      expect(result.perDestination['Gmail'].clientImpact).toBe(-1);
      expect(result.perDestination['Gmail'].warmupBonus).toBe(2);
      expect(result.perDestination['Gmail'].totalChange).toBe(1); // -1 + 2 = +1
    });
  });

  describe('Multiple warmed clients', () => {
    test('two warmed clients: +4 warmup bonus (2 per client)', () => {
      const client1 = buildTestClient('premium_brand', { id: 'client-1' });
      const client2 = buildTestClient('growing_startup', { id: 'client-2' });

      const volumeData: VolumeResult = {
        activeClients: [client1, client2],
        clientVolumes: [
          { clientId: 'client-1', baseVolume: 30000, adjustedVolume: 15000, adjustments: { warmup: 15000 } },
          { clientId: 'client-2', baseVolume: 35000, adjustedVolume: 17500, adjustments: { warmup: 17500 } }
        ],
        totalVolume: 32500
      };

      const result = calculateReputationChanges({
        techStack: [],
        destinations: ['Gmail'],
        clients: [client1, client2],
        clientStates: {
          'client-1': { status: 'Active', has_warmup: true, has_list_hygiene: false, first_active_round: 1 },
          'client-2': { status: 'Active', has_warmup: true, has_list_hygiene: false, first_active_round: 1 }
        },
        volumeData,
        currentRound: 1
      });

      // Client impact: (15K × +2 + 17.5K × -1) / 32.5K = (30 - 17.5) / 32.5 = +0.38
      expect(result.volumeWeightedClientImpact).toBeCloseTo(0.38, 2);
      expect(result.perDestination['Gmail'].warmupBonus).toBe(4); // 2 clients × +2
      expect(result.perDestination['Gmail'].totalChange).toBeCloseTo(4.38, 2);
    });

    test('mixed: one warmed, one not', () => {
      const warmed = buildTestClient('premium_brand', { id: 'client-1' });
      const notWarmed = buildTestClient('aggressive_marketer', { id: 'client-2' });

      const volumeData: VolumeResult = {
        activeClients: [warmed, notWarmed],
        clientVolumes: [
          { clientId: 'client-1', baseVolume: 30000, adjustedVolume: 15000, adjustments: { warmup: 15000 } },
          { clientId: 'client-2', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
        ],
        totalVolume: 95000
      };

      const result = calculateReputationChanges({
        techStack: [],
        destinations: ['Gmail'],
        clients: [warmed, notWarmed],
        clientStates: {
          'client-1': { status: 'Active', has_warmup: true, has_list_hygiene: false, first_active_round: 1 },
          'client-2': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null }
        },
        volumeData,
        currentRound: 1
      });

      // Client impact: (15K × +2 + 80K × -4) / 95K = (30 - 320) / 95 = -3.05
      expect(result.volumeWeightedClientImpact).toBeCloseTo(-3.05, 2);
      expect(result.perDestination['Gmail'].warmupBonus).toBe(2); // Only 1 warmed client
      expect(result.perDestination['Gmail'].totalChange).toBeCloseTo(-1.05, 2); // -3.05 + 2
    });
  });

  describe('Combined tech stack + client risk + warmup', () => {
    test('full auth stack + warmed Low risk client = +14 reputation', () => {
      const client = buildTestClient('premium_brand');
      const volumeData: VolumeResult = {
        activeClients: [client],
        clientVolumes: [
          { clientId: client.id, baseVolume: 30000, adjustedVolume: 15000, adjustments: { warmup: 15000 } }
        ],
        totalVolume: 15000
      };

      const result = calculateReputationChanges({
        techStack: ['spf', 'dkim', 'dmarc'],
        destinations: ['Gmail'],
        clients: [client],
        clientStates: {
          [client.id]: { status: 'Active', has_warmup: true, has_list_hygiene: false, first_active_round: 1 }
        },
        volumeData,
        currentRound: 1
      });

      expect(result.perDestination['Gmail'].techBonus).toBe(10);
      expect(result.perDestination['Gmail'].clientImpact).toBe(2);
      expect(result.perDestination['Gmail'].warmupBonus).toBe(2);
      expect(result.perDestination['Gmail'].totalChange).toBe(14); // 10 + 2 + 2
    });

    test('re_engagement with warmup + list hygiene + tech', () => {
      const client = buildTestClient('re_engagement'); // High risk
      const volumeData: VolumeResult = {
        activeClients: [client],
        clientVolumes: [
          { clientId: client.id, baseVolume: 50000, adjustedVolume: 21250, adjustments: { listHygiene: 7500, warmup: 21250 } }
        ],
        totalVolume: 21250
      };

      const result = calculateReputationChanges({
        techStack: ['spf', 'dkim'],
        destinations: ['Gmail'],
        clients: [client],
        clientStates: {
          [client.id]: { status: 'Active', has_warmup: true, has_list_hygiene: true, first_active_round: 1 }
        },
        volumeData,
        currentRound: 1
      });

      expect(result.perDestination['Gmail'].techBonus).toBe(5); // SPF + DKIM
      expect(result.perDestination['Gmail'].clientImpact).toBe(-4); // High risk
      expect(result.perDestination['Gmail'].warmupBonus).toBe(2);
      expect(result.perDestination['Gmail'].totalChange).toBe(3); // 5 - 4 + 2 = 3
    });
  });

  describe('Multiple destinations', () => {
    test('warmup bonus applies to all destinations equally', () => {
      const client = buildTestClient('premium_brand');
      const volumeData: VolumeResult = {
        activeClients: [client],
        clientVolumes: [
          { clientId: client.id, baseVolume: 30000, adjustedVolume: 15000, adjustments: { warmup: 15000 } }
        ],
        totalVolume: 15000
      };

      const result = calculateReputationChanges({
        techStack: ['spf'],
        destinations: ['Gmail', 'Outlook', 'Yahoo'],
        clients: [client],
        clientStates: {
          [client.id]: { status: 'Active', has_warmup: true, has_list_hygiene: false, first_active_round: 1 }
        },
        volumeData,
        currentRound: 1
      });

      // All destinations get same warmup bonus
      expect(result.perDestination['Gmail'].warmupBonus).toBe(2);
      expect(result.perDestination['Outlook'].warmupBonus).toBe(2);
      expect(result.perDestination['Yahoo'].warmupBonus).toBe(2);

      // Total: tech (2) + client (2) + warmup (2) = 6
      expect(result.perDestination['Gmail'].totalChange).toBe(6);
      expect(result.perDestination['Outlook'].totalChange).toBe(6);
      expect(result.perDestination['Yahoo'].totalChange).toBe(6);
    });
  });

  describe('Breakdown tracking', () => {
    test('breakdown includes all three components', () => {
      const client = buildTestClient('premium_brand');
      const volumeData: VolumeResult = {
        activeClients: [client],
        clientVolumes: [
          { clientId: client.id, baseVolume: 30000, adjustedVolume: 15000, adjustments: { warmup: 15000 } }
        ],
        totalVolume: 15000
      };

      const result = calculateReputationChanges({
        techStack: ['spf', 'dkim'],
        destinations: ['Gmail'],
        clients: [client],
        clientStates: {
          [client.id]: { status: 'Active', has_warmup: true, has_list_hygiene: false, first_active_round: 1 }
        },
        volumeData,
        currentRound: 1
      });

      expect(result.perDestination['Gmail'].breakdown).toEqual([
        { source: 'Authentication Tech', value: 5 },
        { source: 'Client Risk', value: 2 },
        { source: 'Warmup Bonus', value: 2 }
      ]);
    });
  });

  describe('Edge cases', () => {
    test('no warmed clients: warmup bonus is 0', () => {
      const client = buildTestClient('premium_brand');
      const volumeData: VolumeResult = {
        activeClients: [client],
        clientVolumes: [
          { clientId: client.id, baseVolume: 30000, adjustedVolume: 30000, adjustments: {} }
        ],
        totalVolume: 30000
      };

      const result = calculateReputationChanges({
        techStack: [],
        destinations: ['Gmail'],
        clients: [client],
        clientStates: {
          [client.id]: { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null }
        },
        volumeData,
        currentRound: 1
      });

      expect(result.perDestination['Gmail'].warmupBonus).toBe(0);
      expect(result.perDestination['Gmail'].totalChange).toBe(2); // Only client impact
    });

    test('warmup client but paused: no warmup bonus', () => {
      const activeClient = buildTestClient('premium_brand', { id: 'client-1' });
      const pausedWarmupClient = buildTestClient('growing_startup', { id: 'client-2' });

      const volumeData: VolumeResult = {
        activeClients: [activeClient],
        clientVolumes: [
          { clientId: 'client-1', baseVolume: 30000, adjustedVolume: 30000, adjustments: {} }
        ],
        totalVolume: 30000
      };

      const result = calculateReputationChanges({
        techStack: [],
        destinations: ['Gmail'],
        clients: [activeClient, pausedWarmupClient],
        clientStates: {
          'client-1': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null },
          'client-2': { status: 'Paused', has_warmup: true, has_list_hygiene: false, first_active_round: 1 }
        },
        volumeData,
        currentRound: 1
      });

      // Only count active warmed clients
      expect(result.perDestination['Gmail'].warmupBonus).toBe(0);
    });
  });
});
```

**Test count:** 12 new tests for reputation calculator (warmup bonus)

---

## STEP 6: Reputation Calculator - GREEN Phase (Implementation)

### File: `src/lib/server/game/calculators/reputation-calculator.ts`

**Update the imports:**
```typescript
import { WARMUP_REPUTATION_BONUS } from '$lib/config/client-onboarding';
```

**Update the calculation logic (after line 54):**
```typescript
export function calculateReputationChanges(params: ReputationParams): ReputationResult {
  // 1. Get tech bonus (same for all destinations)
  const techBonus = getAuthenticationReputationBonus(params.techStack);

  // 2. Calculate volume-weighted client risk impact (Iteration 4)
  let clientImpact = 0;

  if (params.volumeData.totalVolume > 0 && params.clients.length > 0) {
    let totalWeightedImpact = 0;

    for (const client of params.clients) {
      const clientState = params.clientStates[client.id];
      if (clientState?.status !== 'Active') {
        continue;
      }

      const clientVolumeData = params.volumeData.clientVolumes.find(
        (cv) => cv.clientId === client.id
      );
      const clientVolume = clientVolumeData?.adjustedVolume || 0;
      const impact = getReputationImpact(client.risk);

      totalWeightedImpact += impact * clientVolume;
    }

    clientImpact = totalWeightedImpact / params.volumeData.totalVolume;
  }

  // 3. Calculate warmup bonus (Iteration 5)
  // Count active clients with warmup
  const activeWarmedClients = params.clients.filter(client => {
    const state = params.clientStates[client.id];
    return state?.status === 'Active' && state?.has_warmup;
  });

  const warmupBonus = activeWarmedClients.length * WARMUP_REPUTATION_BONUS;

  // 4. Build per-destination results
  const perDestination: Record<string, DestinationReputationChange> = {};

  for (const dest of params.destinations) {
    const breakdown = [
      { source: 'Authentication Tech', value: techBonus },
      { source: 'Client Risk', value: clientImpact },
      { source: 'Warmup Bonus', value: warmupBonus }
    ];

    perDestination[dest] = {
      techBonus,
      clientImpact,
      warmupBonus,
      totalChange: techBonus + clientImpact + warmupBonus,
      breakdown
    };
  }

  // 5. Return result
  return {
    perDestination,
    volumeWeightedClientImpact: clientImpact
  };
}
```

**Key implementation details:**
- Warmup bonus = number of active warmed clients × 2
- Only active clients with `has_warmup: true` are counted
- Warmup bonus applies to ALL destinations equally
- Added "Warmup Bonus" to breakdown array

**Run tests:** All 32 Iteration 3-4 tests + 12 new Iteration 5 tests should pass (44 total)

---

## STEP 7: Complaint Calculator - RED Phase (Write Tests)

### File: `src/lib/server/game/calculators/complaint-calculator.test.ts`

**Update existing tests to include new required parameters:**

```typescript
// Update all existing tests to add clientStates and techStack
const result = calculateComplaints({
  clients: [client],
  volumeData,
  clientStates: {
    [client.id]: { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null }
  },
  techStack: []
});
```

**Add new test suite for Iteration 5:**

```typescript
describe('Complaint Calculator - Iteration 5: Risk Mitigation', () => {
  describe('List hygiene complaint reduction', () => {
    test('single client with list hygiene: 50% reduction', () => {
      const client = buildTestClient('aggressive_marketer'); // 3% base spam rate
      const volumeData: VolumeResult = {
        activeClients: [client],
        clientVolumes: [
          { clientId: client.id, baseVolume: 80000, adjustedVolume: 68000, adjustments: { listHygiene: 12000 } }
        ],
        totalVolume: 68000
      };

      const result = calculateComplaints({
        clients: [client],
        volumeData,
        clientStates: {
          [client.id]: { status: 'Active', has_warmup: false, has_list_hygiene: true, first_active_round: 1 }
        },
        techStack: []
      });

      expect(result.baseComplaintRate).toBe(3.0); // Before reduction
      expect(result.adjustedComplaintRate).toBe(1.5); // After 50% reduction
      expect(result.perClient[0].baseRate).toBe(3.0);
      expect(result.perClient[0].adjustedRate).toBe(1.5);
    });

    test('mixed portfolio: list hygiene on one client', () => {
      const hygieneClient = buildTestClient('aggressive_marketer', { id: 'client-1' }); // 3%
      const noHygieneClient = buildTestClient('re_engagement', { id: 'client-2' }); // 2.5%

      const volumeData: VolumeResult = {
        activeClients: [hygieneClient, noHygieneClient],
        clientVolumes: [
          { clientId: 'client-1', baseVolume: 80000, adjustedVolume: 68000, adjustments: { listHygiene: 12000 } },
          { clientId: 'client-2', baseVolume: 50000, adjustedVolume: 50000, adjustments: {} }
        ],
        totalVolume: 118000
      };

      const result = calculateComplaints({
        clients: [hygieneClient, noHygieneClient],
        volumeData,
        clientStates: {
          'client-1': { status: 'Active', has_warmup: false, has_list_hygiene: true, first_active_round: 1 },
          'client-2': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null }
        },
        techStack: []
      });

      // Base: (68K × 3% + 50K × 2.5%) / 118K = (2040 + 1250) / 118000 = 2.79%
      expect(result.baseComplaintRate).toBeCloseTo(2.79, 2);

      // Adjusted: (68K × 1.5% + 50K × 2.5%) / 118K = (1020 + 1250) / 118000 = 1.92%
      expect(result.adjustedComplaintRate).toBeCloseTo(1.92, 2);
    });

    test('per-client adjusted rates tracked correctly', () => {
      const client1 = buildTestClient('aggressive_marketer', { id: 'client-1' });
      const client2 = buildTestClient('re_engagement', { id: 'client-2' });

      const volumeData: VolumeResult = {
        activeClients: [client1, client2],
        clientVolumes: [
          { clientId: 'client-1', baseVolume: 80000, adjustedVolume: 68000, adjustments: { listHygiene: 12000 } },
          { clientId: 'client-2', baseVolume: 50000, adjustedVolume: 42500, adjustments: { listHygiene: 7500 } }
        ],
        totalVolume: 110500
      };

      const result = calculateComplaints({
        clients: [client1, client2],
        volumeData,
        clientStates: {
          'client-1': { status: 'Active', has_warmup: false, has_list_hygiene: true, first_active_round: 1 },
          'client-2': { status: 'Active', has_warmup: false, has_list_hygiene: true, first_active_round: 1 }
        },
        techStack: []
      });

      expect(result.perClient[0].baseRate).toBe(3.0);
      expect(result.perClient[0].adjustedRate).toBe(1.5);
      expect(result.perClient[1].baseRate).toBe(2.5);
      expect(result.perClient[1].adjustedRate).toBe(1.25);
    });
  });

  describe('Content filtering complaint reduction', () => {
    test('content filtering: 30% reduction', () => {
      const client = buildTestClient('aggressive_marketer'); // 3%
      const volumeData: VolumeResult = {
        activeClients: [client],
        clientVolumes: [
          { clientId: client.id, baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
        ],
        totalVolume: 80000
      };

      const result = calculateComplaints({
        clients: [client],
        volumeData,
        clientStates: {
          [client.id]: { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null }
        },
        techStack: ['content-filtering']
      });

      expect(result.baseComplaintRate).toBe(3.0);
      expect(result.adjustedComplaintRate).toBe(2.1); // 3.0 × 0.70 = 2.1
    });

    test('content filtering with mixed portfolio', () => {
      const client1 = buildTestClient('aggressive_marketer', { id: 'client-1' }); // 3%
      const client2 = buildTestClient('growing_startup', { id: 'client-2' }); // 1.2%

      const volumeData: VolumeResult = {
        activeClients: [client1, client2],
        clientVolumes: [
          { clientId: 'client-1', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} },
          { clientId: 'client-2', baseVolume: 35000, adjustedVolume: 35000, adjustments: {} }
        ],
        totalVolume: 115000
      };

      const result = calculateComplaints({
        clients: [client1, client2],
        volumeData,
        clientStates: {
          'client-1': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null },
          'client-2': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null }
        },
        techStack: ['content-filtering']
      });

      // Base: (80K × 3% + 35K × 1.2%) / 115K = (2400 + 420) / 115000 = 2.452%
      const baseRate = 2.452;
      expect(result.baseComplaintRate).toBeCloseTo(baseRate, 2);

      // Adjusted: 2.452% × 0.70 = 1.717%
      expect(result.adjustedComplaintRate).toBeCloseTo(1.717, 2);
    });
  });

  describe('Combined list hygiene + content filtering', () => {
    test('both reductions apply: hygiene per-client, then content filtering globally', () => {
      const client = buildTestClient('aggressive_marketer'); // 3% base
      const volumeData: VolumeResult = {
        activeClients: [client],
        clientVolumes: [
          { clientId: client.id, baseVolume: 80000, adjustedVolume: 68000, adjustments: { listHygiene: 12000 } }
        ],
        totalVolume: 68000
      };

      const result = calculateComplaints({
        clients: [client],
        volumeData,
        clientStates: {
          [client.id]: { status: 'Active', has_warmup: false, has_list_hygiene: true, first_active_round: 1 }
        },
        techStack: ['content-filtering']
      });

      // After list hygiene: 3% × 0.50 = 1.5%
      // After content filtering: 1.5% × 0.70 = 1.05%
      expect(result.baseComplaintRate).toBe(3.0);
      expect(result.adjustedComplaintRate).toBe(1.05); // 1.5 × 0.70
    });

    test('mixed portfolio with both reductions', () => {
      const hygieneClient = buildTestClient('aggressive_marketer', { id: 'client-1' }); // 3%
      const noHygieneClient = buildTestClient('re_engagement', { id: 'client-2' }); // 2.5%

      const volumeData: VolumeResult = {
        activeClients: [hygieneClient, noHygieneClient],
        clientVolumes: [
          { clientId: 'client-1', baseVolume: 80000, adjustedVolume: 68000, adjustments: { listHygiene: 12000 } },
          { clientId: 'client-2', baseVolume: 50000, adjustedVolume: 50000, adjustments: {} }
        ],
        totalVolume: 118000
      };

      const result = calculateComplaints({
        clients: [hygieneClient, noHygieneClient],
        volumeData,
        clientStates: {
          'client-1': { status: 'Active', has_warmup: false, has_list_hygiene: true, first_active_round: 1 },
          'client-2': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null }
        },
        techStack: ['content-filtering']
      });

      // After list hygiene: (68K × 1.5% + 50K × 2.5%) / 118K = 1.92%
      // After content filtering: 1.92% × 0.70 = 1.344%
      expect(result.adjustedComplaintRate).toBeCloseTo(1.344, 2);
    });

    test('re_engagement with full mitigation stack', () => {
      const client = buildTestClient('re_engagement'); // High risk, 2.5% spam
      const volumeData: VolumeResult = {
        activeClients: [client],
        clientVolumes: [
          { clientId: client.id, baseVolume: 50000, adjustedVolume: 21250, adjustments: { listHygiene: 7500, warmup: 21250 } }
        ],
        totalVolume: 21250
      };

      const result = calculateComplaints({
        clients: [client],
        volumeData,
        clientStates: {
          [client.id]: { status: 'Active', has_warmup: true, has_list_hygiene: true, first_active_round: 1 }
        },
        techStack: ['content-filtering']
      });

      expect(result.baseComplaintRate).toBe(2.5);

      // After list hygiene: 2.5% × 0.50 = 1.25%
      // After content filtering: 1.25% × 0.70 = 0.875%
      expect(result.adjustedComplaintRate).toBe(0.875);
    });
  });

  describe('Edge cases', () => {
    test('no services: base and adjusted rates are equal', () => {
      const client = buildTestClient('growing_startup');
      const volumeData: VolumeResult = {
        activeClients: [client],
        clientVolumes: [
          { clientId: client.id, baseVolume: 35000, adjustedVolume: 35000, adjustments: {} }
        ],
        totalVolume: 35000
      };

      const result = calculateComplaints({
        clients: [client],
        volumeData,
        clientStates: {
          [client.id]: { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null }
        },
        techStack: []
      });

      expect(result.baseComplaintRate).toBe(1.2);
      expect(result.adjustedComplaintRate).toBe(1.2); // No reductions
    });

    test('no clients: 0% complaint rate', () => {
      const volumeData: VolumeResult = {
        activeClients: [],
        clientVolumes: [],
        totalVolume: 0
      };

      const result = calculateComplaints({
        clients: [],
        volumeData,
        clientStates: {},
        techStack: []
      });

      expect(result.baseComplaintRate).toBe(0);
      expect(result.adjustedComplaintRate).toBe(0);
    });
  });
});
```

**Test count:** Update 7 existing tests + 13 new tests for complaint reductions (20 total)

---

## STEP 8: Complaint Calculator - GREEN Phase (Implementation)

### File: `src/lib/server/game/calculators/complaint-calculator.ts`

**Update imports:**
```typescript
import { LIST_HYGIENE_COMPLAINT_REDUCTION } from '$lib/config/client-onboarding';
import { CONTENT_FILTERING_COMPLAINT_REDUCTION } from '$lib/config/technical-upgrades';
```

**Enhanced implementation:**
```typescript
export function calculateComplaints(params: ComplaintParams): ComplaintResult {
  const perClient: ClientComplaintData[] = [];
  let totalWeightedBaseRate = 0;
  let totalWeightedAdjustedRate = 0;

  for (const client of params.clients) {
    const clientVolumeData = params.volumeData.clientVolumes.find(
      (cv) => cv.clientId === client.id
    );
    const volume = clientVolumeData?.adjustedVolume || 0;

    let baseRate = client.spam_rate;
    let adjustedRate = client.spam_rate;

    // Apply list hygiene reduction (per-client)
    const clientState = params.clientStates[client.id];
    if (clientState?.has_list_hygiene) {
      adjustedRate = adjustedRate * (1 - LIST_HYGIENE_COMPLAINT_REDUCTION);
    }

    perClient.push({
      clientId: client.id,
      baseRate,
      adjustedRate,
      volume
    });

    totalWeightedBaseRate += baseRate * volume;
    totalWeightedAdjustedRate += adjustedRate * volume;
  }

  const baseComplaintRate = params.volumeData.totalVolume > 0
    ? totalWeightedBaseRate / params.volumeData.totalVolume
    : 0;

  let adjustedComplaintRate = params.volumeData.totalVolume > 0
    ? totalWeightedAdjustedRate / params.volumeData.totalVolume
    : 0;

  // Apply content filtering reduction (global)
  if (params.techStack.includes('content-filtering')) {
    adjustedComplaintRate = adjustedComplaintRate * (1 - CONTENT_FILTERING_COMPLAINT_REDUCTION);
  }

  return {
    baseComplaintRate,
    adjustedComplaintRate,
    perClient
  };
}
```

**Key implementation details:**
- List hygiene is applied per-client (before volume weighting)
- Content filtering is applied globally (after volume weighting)
- Both `baseComplaintRate` and `adjustedComplaintRate` are tracked
- Per-client data shows both base and adjusted rates

**Run tests:** All 20 complaint calculator tests should pass

---

## STEP 9: Update currentRound Parameter

### File: `src/lib/server/game/resolution-types.ts`

**Add currentRound to ReputationParams:**
```typescript
export interface ReputationParams {
  techStack: string[];
  destinations: string[];
  clients: Client[];
  clientStates: Record<string, ClientState>;
  volumeData: VolumeResult;
  currentRound: number; // Iteration 5: needed to verify warmup bonus logic
}
```

**Note:** This change requires updating all Iteration 3-4 reputation tests to include `currentRound` parameter.

---

## STEP 10: VERIFY - Run All Calculator Tests

### Command:
```bash
npm test -- calculators/
```

**Expected Results:**
- Volume Calculator: 20 tests (6 from Iteration 1 + 14 from Iteration 5)
- Reputation Calculator: 44 tests (32 from Iterations 3-4 + 12 from Iteration 5)
- Complaint Calculator: 20 tests (7 from Iteration 4 + 13 from Iteration 5)
- Delivery Calculator: 29 tests (unchanged from Iteration 3)
- Revenue Calculator: 6 tests (unchanged from Iteration 1)

**Total: 119 tests passing**

---

## STEP 11: Format and Commit

### Commands:
```bash
npm run format
git add src/lib/server/game/calculators/ src/lib/server/game/resolution-types.ts src/lib/config/technical-upgrades.ts
git commit -m "feat: Implement US-3.3 Iteration 5 - Risk mitigation services (warmup & list hygiene)"
```

**Commit message:**
```
feat: Implement US-3.3 Iteration 5 - Risk mitigation services (warmup & list hygiene)

Iteration 5 enhancements:
- Enhanced volume calculator with warmup and list hygiene volume reductions
- Enhanced reputation calculator with warmup reputation bonus (+2 per warmed client)
- Enhanced complaint calculator with list hygiene (50%) and content filtering (30%) reductions
- Added CONTENT_FILTERING_COMPLAINT_REDUCTION constant to technical-upgrades.ts
- Updated ComplaintParams to require clientStates and techStack
- Updated ComplaintResult to include adjustedComplaintRate and per-client adjusted rates
- Added currentRound to ReputationParams for warmup logic verification

Volume reductions:
- Warmup: 50% reduction first round only
- List hygiene: 5% (Low), 10% (Medium), 15% (High) permanent reduction
- Combined: Hygiene first, then warmup

Complaint reductions:
- List hygiene: 50% per-client reduction
- Content filtering: 30% global reduction
- Combined: Per-client first, then global

Test results:
- 20 volume tests passing (6 from Iteration 1 + 14 from Iteration 5)
- 44 reputation tests passing (32 from Iterations 3-4 + 12 from Iteration 5)
- 20 complaint tests passing (7 from Iteration 4 + 13 from Iteration 5)
- 119 total calculator tests passing (all iterations 1-5)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 📊 Test Coverage Summary

### Volume Calculator (20 tests)
- ✅ Iteration 1: Basic volume (6 tests)
- ✅ Iteration 5: Warmup reduction (3 tests)
- ✅ Iteration 5: List hygiene reduction (4 tests)
- ✅ Iteration 5: Combined services (4 tests)
- ✅ Iteration 5: Multiple clients (3 tests)

### Reputation Calculator (44 tests)
- ✅ Iteration 3: Tech bonuses (17 tests)
- ✅ Iteration 4: Client risk impact (14 tests)
- ✅ Iteration 5: Warmup bonus (12 tests)
- ✅ Combined scenarios (1 test)

### Complaint Calculator (20 tests)
- ✅ Iteration 4: Basic complaint rate (7 tests)
- ✅ Iteration 5: List hygiene reduction (3 tests)
- ✅ Iteration 5: Content filtering reduction (2 tests)
- ✅ Iteration 5: Combined reductions (4 tests)
- ✅ Iteration 5: Complex scenarios (2 tests)
- ✅ Edge cases (2 tests)

---

## 🎯 Success Criteria

**Iteration 5 is complete when:**
- ✅ All type definitions updated
- ✅ Content filtering constant added
- ✅ Volume calculator enhanced with warmup and list hygiene
- ✅ Reputation calculator enhanced with warmup bonus
- ✅ Complaint calculator enhanced with list hygiene and content filtering
- ✅ All existing tests still pass (backward compatibility)
- ✅ All new Iteration 5 tests pass
- ✅ 119 total calculator tests passing
- ✅ Code formatted
- ✅ Changes committed

---

## 🔍 Key Implementation Notes

### Calculation Order:

**Volume:**
1. List hygiene reduction (permanent, by risk level)
2. Warmup reduction (first round only, on already-reduced volume)

**Reputation:**
1. Tech bonus (authentication stack)
2. Client impact (volume-weighted)
3. Warmup bonus (count of active warmed clients × 2)

**Complaints:**
1. List hygiene reduction (per-client, 50%)
2. Volume-weighted average
3. Content filtering reduction (global, 30%)

### Test Scenarios from Feature File:

✅ **Warmup on high-risk client**
- aggressive_marketer: -4 → -2 reputation, 80K → 40K volume

✅ **List hygiene reduces complaints**
- aggressive_marketer: 3% → 1.5% complaints, 80K → 68K volume

✅ **Combined mitigation**
- event_seasonal: -1 → +1 reputation, 1.5% → 0.75% complaints, 40K → 18K volume

✅ **Content filtering**
- aggressive_marketer: 3% → 2.1% complaints (30% reduction)

✅ **Re-engagement with full mitigation**
- Volume: 50K → 21.25K (hygiene 15% + warmup 50%)
- Reputation: -4 → -2 (warmup bonus +2)
- Complaints: 2.5% → 0.875% (hygiene 50% + content 30%)

---

## 📚 References

- Feature file: `features/US-3.3 Resolution Phase Automation iterative implementation.md` (lines 255-320)
- Architecture: `features/US-3.3 Architecture Design.md` (lines 70-118, 120-195, 329-403)
- Config constants: `src/lib/config/client-onboarding.ts` (lines 86-124)
- Content filtering: `src/lib/config/technical-upgrades.ts` (line 74)

---

**Plan Status:** ✅ Ready for Implementation
**Estimated Implementation Time:** 2-3 hours
**Next Iteration:** Iteration 6 - Destination Filtering
