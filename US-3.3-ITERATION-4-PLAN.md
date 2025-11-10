# US-3.3 Iteration 4 Implementation Plan
## Client Risk Profiles

**Date:** 2025-11-07
**Status:** Ready for Implementation
**Methodology:** ATDD (Acceptance Test-Driven Development)

---

## 📋 Overview

### Current Status (Completed)
- ✅ **Iteration 1:** Basic volume and revenue calculation
- ✅ **Iteration 2:** Reputation-based delivery success with fixed zones
- ✅ **Iteration 3:** Authentication impact (tech stack bonuses)

### Iteration 4 Goal
**Implement client risk profiles and volume-weighted reputation impact**

### Key Mechanics to Add
1. **Client Risk Impact:** Different client types affect reputation differently
   - Low risk (premium_brand): +2 reputation per round
   - Medium risk (growing_startup, event_seasonal): -1 reputation per round
   - High risk (aggressive_marketer, re_engagement): -4 reputation per round
2. **Volume-Weighted Calculation:** Impact weighted by client volume
3. **Per-Destination Impact:** Each destination gets same volume-weighted impact
4. **Complaint Rate Tracking:** Calculate volume-weighted complaint rate (for future iterations)

---

## 🎯 Acceptance Criteria (from Feature File)

```gherkin
Scenario: Mixed risk portfolio
  Given ESP "SendWave" has:
    | Client Type          | Volume | Risk Level | Rep Impact |
    | premium_brand        | 30K    | Low        | +2         |
    | aggressive_marketer  | 80K    | High       | -4         |
  When resolution phase calculates reputation change
  Then volume-weighted impact should be -2.3
  And complaint rate should be 2.3% weighted

Scenario: High-risk client cascade check
  Given ESP "SendWave" has 3 aggressive_marketer clients
  And current reputation at Gmail is 65
  When resolution phase calculates
  Then reputation change should be -12 (3 × -4)
  And new reputation would be 53
  And cascade warning should trigger "Reputation below 60!"

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

## 🏗️ Architecture Components

### 1. Reputation Calculator (ENHANCE)
**File:** `src/lib/server/game/calculators/reputation-calculator.ts`

**Current State:** Calculates tech stack bonuses only (Iteration 3)

**Enhancements for Iteration 4:**
- Accept clients, clientStates, and volumeData parameters
- Calculate volume-weighted client risk impact
- Apply client impact to all destinations (same value)
- Update breakdown to show both tech and client impact
- Update volumeWeightedClientImpact field

**Key Logic:**
```typescript
// Volume-weighted client impact calculation
let totalWeightedImpact = 0;
for (const client of activeClients) {
  const clientVolume = volumeData.clientVolumes.find(cv => cv.clientId === client.id)?.adjustedVolume || 0;
  const impact = getReputationImpact(client.risk);
  totalWeightedImpact += (impact * clientVolume);
}
const clientImpact = totalWeightedImpact / volumeData.totalVolume;

// Apply to all destinations
for (const dest of destinations) {
  perDestination[dest] = {
    techBonus,
    clientImpact,
    warmupBonus: 0, // Iteration 5
    totalChange: techBonus + clientImpact,
    breakdown: [
      { source: 'Authentication Tech', value: techBonus },
      { source: 'Client Risk', value: clientImpact }
    ]
  };
}
```

### 2. Complaint Calculator (NEW - Optional for Iteration 4)
**File:** `src/lib/server/game/calculators/complaint-calculator.ts`

**Purpose:** Calculate volume-weighted complaint rates from client spam rates

**Note:** The feature file mentions complaint rate tracking, but the architecture document shows this as part of Iteration 5 (when List Hygiene is added). We'll create a basic version in Iteration 4 for tracking only, with full functionality in Iteration 5.

**Responsibilities (Iteration 4 - Basic):**
- Calculate volume-weighted complaint rate
- Track per-client complaint rates
- Return results for future use

**Function Signature:**
```typescript
interface ComplaintParams {
  clients: Client[];
  volumeData: VolumeResult;
  // Iteration 5 will add: clientStates, techStack
}

interface ComplaintResult {
  baseComplaintRate: number;     // volume-weighted
  perClient: Array<{
    clientId: string;
    baseRate: number;
    volume: number;
  }>;
  // Iteration 5 will add: adjustedComplaintRate, spamTrapRisk
}

export function calculateComplaints(params: ComplaintParams): ComplaintResult
```

---

## 📝 ATDD Workflow Steps

### Phase 1: Update Types for Reputation Calculator

**File to modify:** `src/lib/server/game/resolution-types.ts`

#### Update ReputationParams:
```typescript
export interface ReputationParams {
  techStack: string[];
  destinations: string[];
  clients: Client[];                    // NEW: Iteration 4
  clientStates: Record<string, ClientState>;  // NEW: Iteration 4
  volumeData: VolumeResult;              // NEW: Iteration 4
  // Future iterations will add:
  // currentRound?: number;
}
```

**Note:** These fields are already commented as "Future iterations will add" from Iteration 3, so we're just uncommenting and making them required.

---

### Phase 2: Write Enhanced Reputation Calculator Tests (Red Phase)

**File to modify:** `src/lib/server/game/calculators/reputation-calculator.test.ts`

#### Add Test Suite for Iteration 4:
```typescript
describe('Reputation Calculator - Iteration 4: Client Risk Impact', () => {
  describe('Single client risk impact', () => {
    test('single Low risk client: +2 reputation', () => {
      const client = buildTestClient('premium_brand');
      const volumeData = {
        activeClients: [client],
        clientVolumes: [{ clientId: client.id, baseVolume: 30000, adjustedVolume: 30000, adjustments: {} }],
        totalVolume: 30000
      };

      const result = calculateReputationChanges({
        techStack: [],
        destinations: ['Gmail'],
        clients: [client],
        clientStates: { [client.id]: { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null } },
        volumeData
      });

      expect(result.volumeWeightedClientImpact).toBe(2);
      expect(result.perDestination['Gmail'].clientImpact).toBe(2);
      expect(result.perDestination['Gmail'].totalChange).toBe(2); // Tech (0) + Client (2)
    });

    test('single Medium risk client: -1 reputation', () => {
      const client = buildTestClient('growing_startup');
      const volumeData = {
        activeClients: [client],
        clientVolumes: [{ clientId: client.id, baseVolume: 35000, adjustedVolume: 35000, adjustments: {} }],
        totalVolume: 35000
      };

      const result = calculateReputationChanges({
        techStack: [],
        destinations: ['Gmail'],
        clients: [client],
        clientStates: { [client.id]: { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null } },
        volumeData
      });

      expect(result.volumeWeightedClientImpact).toBe(-1);
      expect(result.perDestination['Gmail'].clientImpact).toBe(-1);
      expect(result.perDestination['Gmail'].totalChange).toBe(-1);
    });

    test('single High risk client: -4 reputation', () => {
      const client = buildTestClient('aggressive_marketer');
      const volumeData = {
        activeClients: [client],
        clientVolumes: [{ clientId: client.id, baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }],
        totalVolume: 80000
      };

      const result = calculateReputationChanges({
        techStack: [],
        destinations: ['Gmail'],
        clients: [client],
        clientStates: { [client.id]: { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null } },
        volumeData
      });

      expect(result.volumeWeightedClientImpact).toBe(-4);
      expect(result.perDestination['Gmail'].clientImpact).toBe(-4);
      expect(result.perDestination['Gmail'].totalChange).toBe(-4);
    });
  });

  describe('Volume-weighted mixed risk portfolio', () => {
    test('premium_brand (30K Low) + aggressive_marketer (80K High) = -2.27', () => {
      const premium = buildTestClient('premium_brand', { id: 'client-1' });
      const aggressive = buildTestClient('aggressive_marketer', { id: 'client-2' });

      const volumeData = {
        activeClients: [premium, aggressive],
        clientVolumes: [
          { clientId: 'client-1', baseVolume: 30000, adjustedVolume: 30000, adjustments: {} },
          { clientId: 'client-2', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
        ],
        totalVolume: 110000
      };

      const result = calculateReputationChanges({
        techStack: [],
        destinations: ['Gmail'],
        clients: [premium, aggressive],
        clientStates: {
          'client-1': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null },
          'client-2': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null }
        },
        volumeData
      });

      // Calculation: (30K × +2 + 80K × -4) / 110K = (60 - 320) / 110 = -2.27
      expect(result.volumeWeightedClientImpact).toBeCloseTo(-2.27, 2);
      expect(result.perDestination['Gmail'].clientImpact).toBeCloseTo(-2.27, 2);
    });

    test('premium_brand (30K) + re_engagement (50K High) = -1.75', () => {
      const premium = buildTestClient('premium_brand', { id: 'client-1' });
      const reengagement = buildTestClient('re_engagement', { id: 'client-2' });

      const volumeData = {
        activeClients: [premium, reengagement],
        clientVolumes: [
          { clientId: 'client-1', baseVolume: 30000, adjustedVolume: 30000, adjustments: {} },
          { clientId: 'client-2', baseVolume: 50000, adjustedVolume: 50000, adjustments: {} }
        ],
        totalVolume: 80000
      };

      const result = calculateReputationChanges({
        techStack: [],
        destinations: ['Gmail'],
        clients: [premium, reengagement],
        clientStates: {
          'client-1': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null },
          'client-2': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null }
        },
        volumeData
      });

      // Calculation: (30K × +2 + 50K × -4) / 80K = (60 - 200) / 80 = -1.75
      expect(result.volumeWeightedClientImpact).toBe(-1.75);
      expect(result.perDestination['Gmail'].clientImpact).toBe(-1.75);
    });

    test('three Medium risk clients: -1 reputation', () => {
      const client1 = buildTestClient('growing_startup', { id: 'client-1' });
      const client2 = buildTestClient('growing_startup', { id: 'client-2' });
      const client3 = buildTestClient('event_seasonal', { id: 'client-3' });

      const volumeData = {
        activeClients: [client1, client2, client3],
        clientVolumes: [
          { clientId: 'client-1', baseVolume: 35000, adjustedVolume: 35000, adjustments: {} },
          { clientId: 'client-2', baseVolume: 35000, adjustedVolume: 35000, adjustments: {} },
          { clientId: 'client-3', baseVolume: 40000, adjustedVolume: 40000, adjustments: {} }
        ],
        totalVolume: 110000
      };

      const result = calculateReputationChanges({
        techStack: [],
        destinations: ['Gmail'],
        clients: [client1, client2, client3],
        clientStates: {
          'client-1': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null },
          'client-2': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null },
          'client-3': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null }
        },
        volumeData
      });

      // All Medium risk: -1 impact regardless of volume
      expect(result.volumeWeightedClientImpact).toBe(-1);
    });
  });

  describe('Combined tech stack and client risk', () => {
    test('full auth stack (+10) + Low risk client (+2) = +12 total', () => {
      const client = buildTestClient('premium_brand');
      const volumeData = {
        activeClients: [client],
        clientVolumes: [{ clientId: client.id, baseVolume: 30000, adjustedVolume: 30000, adjustments: {} }],
        totalVolume: 30000
      };

      const result = calculateReputationChanges({
        techStack: ['spf', 'dkim', 'dmarc'],
        destinations: ['Gmail'],
        clients: [client],
        clientStates: { [client.id]: { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null } },
        volumeData
      });

      expect(result.perDestination['Gmail'].techBonus).toBe(10);
      expect(result.perDestination['Gmail'].clientImpact).toBe(2);
      expect(result.perDestination['Gmail'].totalChange).toBe(12);
    });

    test('SPF+DKIM (+5) + mixed portfolio (-2.27) = +2.73 total', () => {
      const premium = buildTestClient('premium_brand', { id: 'client-1' });
      const aggressive = buildTestClient('aggressive_marketer', { id: 'client-2' });

      const volumeData = {
        activeClients: [premium, aggressive],
        clientVolumes: [
          { clientId: 'client-1', baseVolume: 30000, adjustedVolume: 30000, adjustments: {} },
          { clientId: 'client-2', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
        ],
        totalVolume: 110000
      };

      const result = calculateReputationChanges({
        techStack: ['spf', 'dkim'],
        destinations: ['Gmail'],
        clients: [premium, aggressive],
        clientStates: {
          'client-1': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null },
          'client-2': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null }
        },
        volumeData
      });

      expect(result.perDestination['Gmail'].techBonus).toBe(5);
      expect(result.perDestination['Gmail'].clientImpact).toBeCloseTo(-2.27, 2);
      expect(result.perDestination['Gmail'].totalChange).toBeCloseTo(2.73, 2);
    });

    test('no auth + 3 High risk clients = -12 reputation disaster', () => {
      const client1 = buildTestClient('aggressive_marketer', { id: 'client-1' });
      const client2 = buildTestClient('aggressive_marketer', { id: 'client-2' });
      const client3 = buildTestClient('re_engagement', { id: 'client-3' });

      const volumeData = {
        activeClients: [client1, client2, client3],
        clientVolumes: [
          { clientId: 'client-1', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} },
          { clientId: 'client-2', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} },
          { clientId: 'client-3', baseVolume: 50000, adjustedVolume: 50000, adjustments: {} }
        ],
        totalVolume: 210000
      };

      const result = calculateReputationChanges({
        techStack: [],
        destinations: ['Gmail'],
        clients: [client1, client2, client3],
        clientStates: {
          'client-1': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null },
          'client-2': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null },
          'client-3': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null }
        },
        volumeData
      });

      // All High risk: -4 impact regardless of volume distribution
      expect(result.volumeWeightedClientImpact).toBe(-4);
      expect(result.perDestination['Gmail'].totalChange).toBe(-4);
    });
  });

  describe('Multiple destinations', () => {
    test('client impact applies equally to all destinations', () => {
      const premium = buildTestClient('premium_brand', { id: 'client-1' });
      const aggressive = buildTestClient('aggressive_marketer', { id: 'client-2' });

      const volumeData = {
        activeClients: [premium, aggressive],
        clientVolumes: [
          { clientId: 'client-1', baseVolume: 30000, adjustedVolume: 30000, adjustments: {} },
          { clientId: 'client-2', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
        ],
        totalVolume: 110000
      };

      const result = calculateReputationChanges({
        techStack: ['spf'],
        destinations: ['Gmail', 'Outlook', 'Yahoo'],
        clients: [premium, aggressive],
        clientStates: {
          'client-1': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null },
          'client-2': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null }
        },
        volumeData
      });

      // All destinations get same client impact
      expect(result.perDestination['Gmail'].clientImpact).toBeCloseTo(-2.27, 2);
      expect(result.perDestination['Outlook'].clientImpact).toBeCloseTo(-2.27, 2);
      expect(result.perDestination['Yahoo'].clientImpact).toBeCloseTo(-2.27, 2);

      // All destinations get same total
      expect(result.perDestination['Gmail'].totalChange).toBeCloseTo(-0.27, 2); // 2 (tech) - 2.27 (client)
      expect(result.perDestination['Outlook'].totalChange).toBeCloseTo(-0.27, 2);
      expect(result.perDestination['Yahoo'].totalChange).toBeCloseTo(-0.27, 2);
    });
  });

  describe('Breakdown tracking', () => {
    test('breakdown includes both tech and client impact', () => {
      const client = buildTestClient('premium_brand');
      const volumeData = {
        activeClients: [client],
        clientVolumes: [{ clientId: client.id, baseVolume: 30000, adjustedVolume: 30000, adjustments: {} }],
        totalVolume: 30000
      };

      const result = calculateReputationChanges({
        techStack: ['spf', 'dkim'],
        destinations: ['Gmail'],
        clients: [client],
        clientStates: { [client.id]: { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null } },
        volumeData
      });

      expect(result.perDestination['Gmail'].breakdown).toEqual([
        { source: 'Authentication Tech', value: 5 },
        { source: 'Client Risk', value: 2 }
      ]);
    });

    test('breakdown shows negative client impact', () => {
      const client = buildTestClient('aggressive_marketer');
      const volumeData = {
        activeClients: [client],
        clientVolumes: [{ clientId: client.id, baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }],
        totalVolume: 80000
      };

      const result = calculateReputationChanges({
        techStack: [],
        destinations: ['Gmail'],
        clients: [client],
        clientStates: { [client.id]: { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null } },
        volumeData
      });

      expect(result.perDestination['Gmail'].breakdown).toEqual([
        { source: 'Authentication Tech', value: 0 },
        { source: 'Client Risk', value: -4 }
      ]);
    });
  });

  describe('Edge cases', () => {
    test('no active clients: 0 client impact', () => {
      const volumeData = {
        activeClients: [],
        clientVolumes: [],
        totalVolume: 0
      };

      const result = calculateReputationChanges({
        techStack: ['spf'],
        destinations: ['Gmail'],
        clients: [],
        clientStates: {},
        volumeData
      });

      expect(result.volumeWeightedClientImpact).toBe(0);
      expect(result.perDestination['Gmail'].clientImpact).toBe(0);
      expect(result.perDestination['Gmail'].totalChange).toBe(2); // Only tech bonus
    });

    test('adjusted volume (with warmup) used for weighting', () => {
      const client = buildTestClient('premium_brand', { id: 'client-1' });

      // Volume adjusted due to warmup (50% reduction)
      const volumeData = {
        activeClients: [client],
        clientVolumes: [
          {
            clientId: 'client-1',
            baseVolume: 30000,
            adjustedVolume: 15000, // 50% reduced by warmup
            adjustments: { warmup: 15000 }
          }
        ],
        totalVolume: 15000
      };

      const result = calculateReputationChanges({
        techStack: [],
        destinations: ['Gmail'],
        clients: [client],
        clientStates: {
          'client-1': { status: 'Active', has_warmup: true, has_list_hygiene: false, first_active_round: 1 }
        },
        volumeData
      });

      // Impact calculated using adjusted volume (15K), not base volume
      expect(result.volumeWeightedClientImpact).toBe(2); // Still +2 for Low risk
      expect(result.perDestination['Gmail'].clientImpact).toBe(2);
    });
  });

  describe('Backward compatibility with Iteration 3', () => {
    test('Iteration 3 tests still work with new parameters', () => {
      // Simulate Iteration 3 call pattern (no clients provided)
      const volumeData = {
        activeClients: [],
        clientVolumes: [],
        totalVolume: 0
      };

      const result = calculateReputationChanges({
        techStack: ['spf', 'dkim', 'dmarc'],
        destinations: ['Gmail'],
        clients: [],
        clientStates: {},
        volumeData
      });

      expect(result.perDestination['Gmail'].techBonus).toBe(10);
      expect(result.perDestination['Gmail'].clientImpact).toBe(0);
      expect(result.perDestination['Gmail'].totalChange).toBe(10);
    });
  });
});
```

**Expected Result:** Tests fail because implementation not updated yet ❌

---

### Phase 3: Enhance Reputation Calculator Implementation (Green Phase)

**File to modify:** `src/lib/server/game/calculators/reputation-calculator.ts`

#### Implementation:
```typescript
/**
 * Reputation Calculator
 * US 3.3: Resolution Phase Automation - Iteration 3, 4
 *
 * Calculates reputation changes based on tech stack and client risk
 * Iteration 3: Tech stack bonuses
 * Iteration 4: Client risk impact (volume-weighted)
 * Future iterations will add: warmup bonus (Iteration 5)
 */

import type {
  ReputationParams,
  ReputationResult,
  DestinationReputationChange
} from '../resolution-types';
import { getAuthenticationReputationBonus } from '$lib/config/technical-upgrades';
import { getReputationImpact } from '$lib/config/client-profiles';

/**
 * Calculate reputation changes for an ESP
 * Iteration 4: Tech stack bonuses + volume-weighted client risk impact
 */
export function calculateReputationChanges(params: ReputationParams): ReputationResult {
  // 1. Get tech bonus (same for all destinations)
  const techBonus = getAuthenticationReputationBonus(params.techStack);

  // 2. Calculate volume-weighted client risk impact (Iteration 4)
  let clientImpact = 0;

  if (params.volumeData.totalVolume > 0 && params.clients.length > 0) {
    let totalWeightedImpact = 0;

    for (const client of params.clients) {
      // Only consider active clients
      const clientState = params.clientStates[client.id];
      if (clientState?.status !== 'Active') {
        continue;
      }

      // Get adjusted volume for this client
      const clientVolumeData = params.volumeData.clientVolumes.find(
        cv => cv.clientId === client.id
      );
      const clientVolume = clientVolumeData?.adjustedVolume || 0;

      // Get risk impact for this client
      const impact = getReputationImpact(client.risk);

      // Accumulate weighted impact
      totalWeightedImpact += (impact * clientVolume);
    }

    // Calculate volume-weighted average
    clientImpact = totalWeightedImpact / params.volumeData.totalVolume;
  }

  // 3. Build per-destination results
  const perDestination: Record<string, DestinationReputationChange> = {};

  for (const dest of params.destinations) {
    const breakdown = [
      { source: 'Authentication Tech', value: techBonus },
      { source: 'Client Risk', value: clientImpact }
    ];

    perDestination[dest] = {
      techBonus,
      clientImpact,
      warmupBonus: 0, // Iteration 5: will be calculated from warmed clients
      totalChange: techBonus + clientImpact,
      breakdown
    };
  }

  // 4. Return result
  return {
    perDestination,
    volumeWeightedClientImpact: clientImpact
  };
}
```

**Expected Result:** All reputation calculator tests pass (Iteration 3 + 4) ✅

---

### Phase 4: Create/Update Test Helpers (if needed)

**File:** `src/lib/server/game/test-helpers/client-test-fixtures.ts`

Check if this file exists and has the `buildTestClient` function. Based on architecture doc, it should already exist. If not, create it:

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

---

### Phase 5: Optional - Create Complaint Calculator (Basic Version)

**File to create:** `src/lib/server/game/calculators/complaint-calculator.ts`

**Note:** This is optional for Iteration 4. The feature file mentions complaint rates, but they're mainly used in Iteration 5. We can create a basic version here.

#### Types to Add:
```typescript
// In resolution-types.ts
export interface ComplaintParams {
  clients: Client[];
  volumeData: VolumeResult;
  // Iteration 5 will add: clientStates, techStack
}

export interface ClientComplaintData {
  clientId: string;
  baseRate: number;
  volume: number;
}

export interface ComplaintResult {
  baseComplaintRate: number; // volume-weighted
  perClient: ClientComplaintData[];
  // Iteration 5 will add: adjustedComplaintRate, spamTrapRisk
}
```

#### Basic Implementation:
```typescript
/**
 * Complaint Calculator
 * US 3.3: Resolution Phase Automation - Iteration 4 (Basic)
 *
 * Calculates complaint rates from client spam rates
 * Iteration 4: Basic volume-weighted complaint rate
 * Future iterations will add: List Hygiene reduction, Content Filtering, spam traps
 */

import type { ComplaintParams, ComplaintResult } from '../resolution-types';

export function calculateComplaints(params: ComplaintParams): ComplaintResult {
  const perClient: ClientComplaintData[] = [];
  let totalWeightedRate = 0;

  for (const client of params.clients) {
    const clientVolumeData = params.volumeData.clientVolumes.find(
      cv => cv.clientId === client.id
    );
    const volume = clientVolumeData?.adjustedVolume || 0;

    perClient.push({
      clientId: client.id,
      baseRate: client.spam_rate,
      volume
    });

    totalWeightedRate += (client.spam_rate * volume);
  }

  const baseComplaintRate = params.volumeData.totalVolume > 0
    ? totalWeightedRate / params.volumeData.totalVolume
    : 0;

  return {
    baseComplaintRate,
    perClient
  };
}
```

**Decision:** I recommend creating the complaint calculator in Iteration 4 since it's mentioned in the test scenarios. It's simple and won't interfere with future iterations.

---

## 🧪 Test Execution Plan

### Step 1: Run Reputation Calculator Tests
```bash
npm test -- reputation-calculator.test.ts
```

**Expected:** All tests pass (Iteration 3 + 4) ✅

### Step 2: Run All Calculator Tests
```bash
npm test -- calculators/
```

**Expected:** All tests pass across all calculators ✅

### Step 3: Run Full Test Suite
```bash
npm test
```

---

## 📊 Expected Outcomes

### Test Results
- ✅ All Iteration 1 tests still pass (backward compatibility)
- ✅ All Iteration 2 tests still pass (backward compatibility)
- ✅ All Iteration 3 tests still pass (backward compatibility)
- ✅ All Iteration 4 reputation calculator tests pass (new)
- ✅ Optional: Complaint calculator tests pass (if created)

### Code Coverage
- `reputation-calculator.ts`: 100% (enhanced)
- `reputation-calculator.test.ts`: Comprehensive coverage of all risk scenarios
- Optional: `complaint-calculator.ts`: 100%

### Business Logic Validation
- Client risk levels properly affect reputation
- Volume weighting correctly calculated
- Tech bonuses and client risk combine correctly
- Mixed portfolios calculated accurately

---

## ⚠️ Important Notes

### What NOT to Implement Yet
- ❌ Warmup reputation bonus (Iteration 5)
- ❌ List Hygiene complaint reduction (Iteration 5)
- ❌ Content Filtering reduction (Iteration 7)
- ❌ Spam trap risk calculation (Iteration 7)

### Backward Compatibility
- All existing tests (Iterations 1, 2, 3) must still pass
- ReputationParams now requires clients, clientStates, volumeData
- Empty arrays/objects should be handled gracefully

### Config Dependencies
- Risk reputation impact already defined in [client-profiles.ts](src/lib/config/client-profiles.ts) ✅
- Helper function `getReputationImpact()` already exists ✅

### Volume Weighting Details
- Use **adjustedVolume** (not baseVolume) for weighting
- This ensures warmup reductions (Iteration 5) affect the calculation correctly
- Formula: `sum(impact × adjustedVolume) / totalVolume`

---

## 🚀 Implementation Checklist

### Pre-Implementation
- [ ] Review feature file (Iteration 4 section)
- [ ] Review architecture design document
- [ ] Confirm risk impact constants exist in [client-profiles.ts](src/lib/config/client-profiles.ts)
- [ ] Check if test fixtures exist in `src/lib/server/game/test-helpers/`

### Phase 1: Type Updates
- [ ] Update `ReputationParams` in [resolution-types.ts](src/lib/server/game/resolution-types.ts)
- [ ] Optional: Add `ComplaintParams` and `ComplaintResult` types
- [ ] Run type check: `npm run check`

### Phase 2: Reputation Calculator Enhancement
- [ ] Write Iteration 4 tests (TDD: Red phase)
- [ ] Run tests, confirm they fail ❌
- [ ] Enhance reputation calculator implementation
- [ ] Run tests, confirm all tests pass (Iterations 3 + 4) ✅
- [ ] Review code for clarity and maintainability

### Phase 3: Optional - Complaint Calculator
- [ ] Write complaint calculator tests (TDD: Red phase)
- [ ] Implement complaint calculator
- [ ] Run tests, confirm they pass ✅

### Phase 4: Integration Check
- [ ] Check if any existing code calls reputation calculator
- [ ] Update calls to provide new required parameters
- [ ] Run integration tests if they exist

### Phase 5: Validation
- [ ] Run full test suite: `npm test`
- [ ] Verify all tests pass (Iterations 1, 2, 3, 4) ✅
- [ ] Check test coverage for enhanced files
- [ ] Review all code changes
- [ ] Format code: `npm run format`

### Phase 6: Documentation
- [ ] Update inline comments for complex logic
- [ ] Document volume-weighting calculation
- [ ] Document any assumptions or design decisions

### Phase 7: Commit
- [ ] Stage changes: `git add .`
- [ ] Commit with message: `feat: Implement US-3.3 Iteration 4 - Client risk profiles and volume-weighted reputation impact`
- [ ] Verify commit includes all files
- [ ] Push to remote (if applicable)

---

## 🎓 Learning Points

### Volume-Weighted Calculations
- Use adjusted volume (after warmup/hygiene reductions)
- Formula: `Σ(value × volume) / totalVolume`
- Handles edge case of 0 total volume gracefully

### Risk Impact Patterns
- Low risk clients improve reputation (+2)
- Medium risk clients slightly hurt reputation (-1)
- High risk clients significantly hurt reputation (-4)
- Mixed portfolios create balance challenges

### Test Data Insights
- Premium brand (30K, Low): +2 per round
- Growing startup (35K, Medium): -1 per round
- Re-engagement (50K, High): -4 per round
- Aggressive marketer (80K, High): -4 per round
- Event seasonal (40K, Medium): -1 per round

---

## 📚 Reference Files

### Implementation Reference
- [US-3.3 Resolution Phase Automation iterative implementation.md](features/US-3.3%20Resolution%20Phase%20Automation%20iterative%20implementation.md) - Iteration 4 section (lines 203-251)
- [US-3.3 Architecture Design.md](features/US-3.3%20Architecture%20Design.md) - Reputation calculator specification
- [client-profiles.ts](src/lib/config/client-profiles.ts) - Risk impact constants

### Existing Code to Study
- [reputation-calculator.ts](src/lib/server/game/calculators/reputation-calculator.ts) - Current implementation (Iteration 3)
- [reputation-calculator.test.ts](src/lib/server/game/calculators/reputation-calculator.test.ts) - Existing tests

### Testing Reference
- [US-3.3-ITERATION-3-PLAN.md](US-3.3-ITERATION-3-PLAN.md) - Previous iteration plan for reference

---

## 📐 Calculation Examples

### Example 1: Mixed Portfolio (Premium + Aggressive)
```
Clients:
- premium_brand: 30K volume, Low risk (+2 impact)
- aggressive_marketer: 80K volume, High risk (-4 impact)

Calculation:
weighted_impact = (30K × +2) + (80K × -4) / 110K
                = (60 - 320) / 110K
                = -260 / 110K
                = -2.36

Tech bonus (SPF): +2
Total change: 2 + (-2.36) = -0.36
```

### Example 2: Three High-Risk Clients
```
Clients:
- aggressive_marketer: 80K, High (-4)
- aggressive_marketer: 80K, High (-4)
- re_engagement: 50K, High (-4)

Calculation:
weighted_impact = (80K × -4) + (80K × -4) + (50K × -4) / 210K
                = (-320 - 320 - 200) / 210K
                = -840 / 210K
                = -4.0

All High risk = -4 impact (same as individual)
```

### Example 3: Balanced Portfolio
```
Clients:
- premium_brand: 30K, Low (+2)
- growing_startup: 35K, Medium (-1)
- event_seasonal: 40K, Medium (-1)

Calculation:
weighted_impact = (30K × +2) + (35K × -1) + (40K × -1) / 105K
                = (60 - 35 - 40) / 105K
                = -15 / 105K
                = -0.14

Nearly balanced with slight negative impact
```

---

## ❓ FAQ

### Q: Why use adjusted volume instead of base volume?
**A:** Adjusted volume accounts for warmup and list hygiene reductions (Iteration 5). Using adjusted volume now ensures correct calculations in future iterations.

### Q: Do all destinations get the same client impact?
**A:** Yes, in Iteration 4, client risk impact is the same for all destinations. Future iterations may add destination-specific modifiers.

### Q: What happens if total volume is 0?
**A:** Client impact is 0 when total volume is 0 (no active clients).

### Q: Should complaint calculator be created in Iteration 4?
**A:** Yes, recommended. The feature file mentions it, and it's simple enough to not complicate Iteration 5.

### Q: How do I test volume-weighted calculations?
**A:** Use specific volumes that make the math easy (e.g., 30K and 80K for 110K total). Use `toBeCloseTo()` for decimal precision.

---

## ✅ Definition of Done

- [ ] All reputation calculator tests pass (Iterations 3 + 4)
- [ ] Optional: All complaint calculator tests pass
- [ ] All volume calculator tests still pass (Iteration 1)
- [ ] All revenue calculator tests still pass (Iteration 1)
- [ ] All delivery calculator tests still pass (Iterations 2 + 3)
- [ ] Code formatted with `npm run format`
- [ ] Types properly updated in resolution-types.ts
- [ ] No console.log statements (use Pino in manager)
- [ ] Inline comments for volume-weighting logic
- [ ] Test coverage for edge cases (0 volume, no clients)
- [ ] Commit message follows convention
- [ ] Ready for Iteration 5

---

**Status:** Ready for Implementation 🚀
**Next Iteration:** Iteration 5 - Risk Mitigation Services (Warmup & List Hygiene)
**Estimated Time:** 2-3 hours for Iteration 4
