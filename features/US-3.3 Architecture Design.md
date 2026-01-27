# US 3.3 Resolution Phase - Architecture Design

## 🏗️ Architecture Overview

**Pattern:** Calculator Pattern with Pure Functions
**Philosophy:** Separation of Concerns + Incremental Development
**Testing:** ATDD with Multi-Level Tests (Unit + Integration)

---

## 🎯 Core Principles

### 1. **Pure Functions (Calculators)**
- Each calculator handles one specific calculation
- Clear input/output contracts (TypeScript interfaces)
- No side effects (logging happens in orchestrator)
- Independently testable
- Easy to enhance incrementally

### 2. **No Mocking in Tests**
- Test real implementations (per project guidelines)
- Use test fixtures with base values from config
- Predictable, repeatable test data
- No variance in tests (production only)

### 3. **Incremental Development**
- Start simple, enhance gradually
- Each iteration adds to specific calculators
- Maintain backward compatibility
- Tests accumulate (don't rewrite)

### 4. **Configuration-Driven**
- All game balance constants in config files
- Easy to tune without code changes
- Clear separation: logic vs. data

---

## 📦 Module Structure

```
src/lib/server/game/
├── resolution-manager.ts                    # Main orchestrator
├── resolution-manager.test.ts               # Integration tests
│
├── calculators/                             # Pure calculation functions
│   ├── volume-calculator.ts                 # Iteration 1, 5
│   ├── volume-calculator.test.ts
│   ├── reputation-calculator.ts             # Iteration 2, 3, 4, 5
│   ├── reputation-calculator.test.ts
│   ├── delivery-calculator.ts               # Iteration 2, 3, 6
│   ├── delivery-calculator.test.ts
│   ├── revenue-calculator.ts                # Iteration 1, 2
│   ├── revenue-calculator.test.ts
│   ├── complaint-calculator.ts              # Iteration 4, 5, 7
│   └── complaint-calculator.test.ts
│
├── resolution-types.ts                      # Result type definitions
│
tests/helpers/
├── game-session-builder.ts                  # Build test sessions
├── client-test-fixtures.ts                  # Clients with base values
└── resolution-assertions.ts                 # Custom test matchers
```

---

## 🧮 Calculator Specifications

### 1. Volume Calculator

**File:** `src/lib/server/game/calculators/volume-calculator.ts`

**Responsibilities:**
- Filter active clients (exclude paused/suspended)
- Apply list hygiene volume reduction (permanent, by risk level)
- Apply warmup volume reduction (50%, first round only)
- Calculate total volume and per-client breakdown

**Function Signature:**
```typescript
interface VolumeParams {
  clients: Client[];
  clientStates: Record<string, ClientState>;
  currentRound: number;
}

interface VolumeResult {
  activeClients: Client[];
  clientVolumes: Array<{
    clientId: string;
    baseVolume: number;
    adjustedVolume: number;
    adjustments: {
      listHygiene?: number;  // reduction applied
      warmup?: number;       // reduction applied
    };
  }>;
  totalVolume: number;
}

export function calculateVolume(params: VolumeParams): VolumeResult
```

**Iteration Evolution:**
- **Iteration 1:** Basic filtering (active only), simple sum
- **Iteration 5:** Add list hygiene and warmup reductions

**Test Coverage:**
- Single active client
- Multiple active clients
- Mix of active/paused/suspended
- List hygiene reduction by risk level
- Warmup reduction (first round only)
- Combined list hygiene + warmup
- Edge cases: no clients, all paused

---

### 2. Reputation Calculator

**File:** `src/lib/server/game/calculators/reputation-calculator.ts`

**Responsibilities:**
- Calculate tech stack reputation bonuses (SPF +2, DKIM +3, DMARC +5) per destination
- Calculate client risk reputation impact (volume-weighted)
- Apply warmup reputation bonus (+2 per destination for warmed clients)
- Calculate per-destination reputation changes

**Function Signature:**
```typescript
interface ReputationParams {
  clients: Client[];
  clientStates: Record<string, ClientState>;
  techStack: string[];
  volumeData: VolumeResult;
  destinations: string[];
  currentRound: number;
}

interface ReputationResult {
  perDestination: Record<string, {
    techBonus: number;
    clientImpact: number;
    warmupBonus: number;
    totalChange: number;
    breakdown: Array<{
      source: string;
      value: number;
    }>;
  }>;
  volumeWeightedClientImpact: number;
}

export function calculateReputationChanges(params: ReputationParams): ReputationResult
```

**Iteration Evolution:**
- **Iteration 2:** No changes (reputation zones used for delivery only)
- **Iteration 3:** Add tech stack bonuses
- **Iteration 4:** Add client risk impact (volume-weighted)
- **Iteration 5:** Add warmup bonus (+2 per destination)

**Key Logic:**
```typescript
// Tech bonus (per destination)
const techBonus = getAuthenticationReputationBonus(techStack);

// Client impact (volume-weighted)
const totalVolume = volumeData.totalVolume;
const clientImpact = clients.reduce((sum, client) => {
  const clientVolume = volumeData.clientVolumes.find(cv => cv.clientId === client.id)?.adjustedVolume || 0;
  const impact = getReputationImpact(client.risk);
  return sum + (impact * clientVolume);
}, 0) / totalVolume;

// Warmup bonus (only for warmed clients)
const warmupBonus = clients.filter(c =>
  clientStates[c.id]?.has_warmup
).length * WARMUP_REPUTATION_BONUS;

// Per destination
for (const dest of destinations) {
  changes[dest] = techBonus + clientImpact + warmupBonus;
}
```

**Test Coverage:**
- Tech bonuses (SPF, DKIM, DMARC combinations)
- Client risk impacts (Low, Medium, High)
- Volume-weighted calculations
- Warmup bonuses
- Multiple destinations

---

### 3. Delivery Calculator

**File:** `src/lib/server/game/calculators/delivery-calculator.ts`

**Responsibilities:**
- Calculate base delivery rate from reputation zone
- Apply authentication delivery bonuses (SPF +5%, DKIM +8%, DMARC +12%)
- Apply DMARC penalty (Round 3+: 80% rejection if missing)
- Apply filtering penalties (by level)
- Cap final rate at 100%

**Function Signature:**
```typescript
interface DeliveryParams {
  reputation: number;  // weighted average across destinations
  techStack: string[];
  filteringLevel?: FilteringLevel;
  currentRound: number;
}

interface DeliveryResult {
  baseRate: number;           // from reputation zone
  authBonus: number;          // from tech stack
  dmarcPenalty?: number;      // if Round 3+ without DMARC
  filteringPenalty?: number;  // from destination filtering
  finalRate: number;          // capped at 1.0
  breakdown: Array<{
    factor: string;
    value: number;
  }>;
}

export function calculateDeliverySuccess(params: DeliveryParams): DeliveryResult
```

**Iteration Evolution:**
- **Iteration 2:** Base rate from reputation zone only
- **Iteration 3:** Add auth bonuses and DMARC penalty
- **Iteration 6:** Add filtering penalties

**Key Logic:**
```typescript
// Base from reputation
const baseRate = getDeliverySuccessRate(reputation);

// Auth bonus
const authBonus = getAuthenticationDeliveryBonus(techStack);

// DMARC penalty (Round 3+)
let dmarcPenalty = 0;
if (currentRound >= 3 && !techStack.includes('dmarc')) {
  dmarcPenalty = 1 - DMARC_MISSING_PENALTY; // 0.80 (80% rejection)
}

// Filtering penalty (Iteration 6)
let filteringPenalty = 0;
if (filteringLevel) {
  const impacts = calculateImpactValues(filteringLevel);
  filteringPenalty = impacts.falsePositives / 100;
}

// Final calculation
let finalRate = baseRate + authBonus - filteringPenalty;
if (dmarcPenalty > 0) {
  finalRate = finalRate * DMARC_MISSING_PENALTY;
}
finalRate = Math.min(finalRate, 1.0); // Cap at 100%
```

**Test Coverage:**
- Each reputation zone
- Auth bonus combinations
- DMARC penalty (Round 3+)
- Filtering penalties
- Capping at 100%

---

### 4. Revenue Calculator

**File:** `src/lib/server/game/calculators/revenue-calculator.ts`

**Responsibilities:**
- Sum base revenue from active clients
- Apply delivery success rate
- Calculate final revenue
- Track per-client breakdown

**Function Signature:**
```typescript
interface RevenueParams {
  clients: Client[];
  clientStates: Record<string, ClientState>;
  deliveryRate: number;  // 0-1
}

interface RevenueResult {
  baseRevenue: number;
  actualRevenue: number;
  perClient: Array<{
    clientId: string;
    baseRevenue: number;
    actualRevenue: number;
  }>;
}

export function calculateRevenue(params: RevenueParams): RevenueResult
```

**Iteration Evolution:**
- **Iteration 1:** Base revenue only (deliveryRate = 1.0)
- **Iteration 2:** Apply delivery rate

**Key Logic:**
```typescript
const activeClients = clients.filter(c =>
  clientStates[c.id]?.status === 'Active'
);

const baseRevenue = activeClients.reduce((sum, c) => sum + c.revenue, 0);
const actualRevenue = baseRevenue * deliveryRate;
```

**Test Coverage:**
- Single client
- Multiple clients
- Exclude paused clients
- Various delivery rates
- Rounding behavior

---

### 5. Complaint Calculator

**File:** `src/lib/server/game/calculators/complaint-calculator.ts`

**Responsibilities:**
- Calculate volume-weighted complaint rate
- Apply list hygiene reduction (50%)
- Apply content filtering reduction (30%, if tech owned)
- Calculate spam trap risk
- Apply list hygiene spam trap reduction (40%)

**Function Signature:**
```typescript
interface ComplaintParams {
  clients: Client[];
  clientStates: Record<string, ClientState>;
  techStack: string[];
  volumeData: VolumeResult;
}

interface ComplaintResult {
  baseComplaintRate: number;     // volume-weighted
  adjustedComplaintRate: number; // after reductions
  spamTrapRisk: number;          // probability 0-1
  perClient: Array<{
    clientId: string;
    baseRate: number;
    adjustedRate: number;
    volume: number;
  }>;
}

export function calculateComplaints(params: ComplaintParams): ComplaintResult
```

**Iteration Evolution:**
- **Iteration 4:** Basic volume-weighted complaint rate
- **Iteration 5:** Add list hygiene reduction
- **Iteration 7:** Add spam traps and content filtering

**Key Logic:**
```typescript
const totalVolume = volumeData.totalVolume;

let weightedRate = 0;
for (const client of clients) {
  const cv = volumeData.clientVolumes.find(v => v.clientId === client.id);
  if (!cv) continue;

  let rate = client.spam_rate;

  // List hygiene reduction
  if (clientStates[client.id]?.has_list_hygiene) {
    rate = rate * (1 - LIST_HYGIENE_COMPLAINT_REDUCTION);
  }

  weightedRate += (rate * cv.adjustedVolume) / totalVolume;
}

// Content filtering (global)
if (techStack.includes('content-filtering')) {
  weightedRate = weightedRate * 0.70; // 30% reduction
}

// Spam trap risk calculation
// Based on client risk levels and volume
```

**Test Coverage:**
- Volume-weighted calculations
- List hygiene reduction
- Content filtering reduction
- Spam trap risk by client type
- Combined reductions

---

## 🎭 Resolution Manager (Orchestrator)

**File:** `src/lib/server/game/resolution-manager.ts`

**Responsibilities:**
- Orchestrate calculator execution in correct order
- Handle WebSocket broadcasting
- Log all calculations (Pino)
- Store results for Consequences Phase
- Handle errors gracefully

**Function Signature:**
```typescript
export async function executeResolution(
  session: GameSession,
  roomCode: string
): Promise<ResolutionResults>
```

**Execution Flow:**
```typescript
export async function executeResolution(
  session: GameSession,
  roomCode: string
): Promise<ResolutionResults> {
  const logger = await getLogger();
  logger.info({ roomCode, round: session.current_round }, 'Starting resolution phase');

  const results: ResolutionResults = {
    espResults: {},
    destinationResults: {}
  };

  // For each ESP team
  for (const team of session.esp_teams) {
    logger.info({ teamName: team.name }, 'Calculating ESP resolution');

    // 1. Volume calculation
    const volumeResult = calculateVolume({
      clients: team.available_clients.filter(c => team.active_clients.includes(c.id)),
      clientStates: team.client_states,
      currentRound: session.current_round
    });
    logger.debug({ volume: volumeResult }, 'Volume calculated');

    // 2. Reputation changes
    const reputationResult = calculateReputationChanges({
      clients: volumeResult.activeClients,
      clientStates: team.client_states,
      techStack: team.owned_tech_upgrades,
      volumeData: volumeResult,
      destinations: session.destinations.map(d => d.name),
      currentRound: session.current_round
    });
    logger.debug({ reputation: reputationResult }, 'Reputation changes calculated');

    // 3. Delivery success (weighted average reputation)
    const avgReputation = calculateWeightedReputation(team.reputation);
    const deliveryResult = calculateDeliverySuccess({
      reputation: avgReputation,
      techStack: team.owned_tech_upgrades,
      currentRound: session.current_round
    });
    logger.debug({ delivery: deliveryResult }, 'Delivery success calculated');

    // 4. Revenue
    const revenueResult = calculateRevenue({
      clients: volumeResult.activeClients,
      clientStates: team.client_states,
      deliveryRate: deliveryResult.finalRate
    });
    logger.debug({ revenue: revenueResult }, 'Revenue calculated');

    // 5. Complaints (Iteration 4+)
    const complaintResult = calculateComplaints({
      clients: volumeResult.activeClients,
      clientStates: team.client_states,
      techStack: team.owned_tech_upgrades,
      volumeData: volumeResult
    });
    logger.debug({ complaints: complaintResult }, 'Complaints calculated');

    // Store results
    results.espResults[team.name] = {
      volume: volumeResult,
      reputation: reputationResult,
      delivery: deliveryResult,
      revenue: revenueResult,
      complaints: complaintResult
    };

    // Apply reputation changes to session
    for (const [dest, change] of Object.entries(reputationResult.perDestination)) {
      team.reputation[dest] = (team.reputation[dest] || 70) + change.totalChange;
      team.reputation[dest] = Math.max(0, Math.min(100, team.reputation[dest]));
    }

    // Broadcast update via WebSocket
    gameWss.broadcastToRoom(roomCode, {
      type: 'esp_dashboard_update',
      teamName: team.name,
      resolution: results.espResults[team.name]
    });
  }

  logger.info({ results }, 'Resolution phase completed');
  return results;
}
```

**Key Points:**
- Calculators called in dependency order
- Logging at info (start/end) and debug (each calculator) levels
- WebSocket broadcasts after each team
- Reputation applied back to session
- Errors logged and handled gracefully

---

## 🧪 Testing Strategy

### Level 1: Unit Tests (Per Calculator)

**Location:** Co-located with calculators (e.g., `volume-calculator.test.ts`)

**Characteristics:**
- Test one calculator in isolation
- Fast execution (milliseconds)
- Clear input/output
- No dependencies on other calculators
- No WebSocket, no database

**Example:**
```typescript
// volume-calculator.test.ts
import { describe, test, expect } from 'vitest';
import { calculateVolume } from './volume-calculator';
import { buildTestClient } from '../../../tests/helpers/client-test-fixtures';

describe('Volume Calculator', () => {
  describe('Iteration 1: Basic volume', () => {
    test('single active client', () => {
      const client = buildTestClient('premium_brand');
      const result = calculateVolume({
        clients: [client],
        clientStates: {
          [client.id]: { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null }
        },
        currentRound: 1
      });

      expect(result.totalVolume).toBe(30000);
      expect(result.activeClients).toHaveLength(1);
      expect(result.clientVolumes[0].adjustedVolume).toBe(30000);
    });

    test('excludes paused clients', () => {
      const active = buildTestClient('premium_brand', { id: 'client-1' });
      const paused = buildTestClient('growing_startup', { id: 'client-2' });

      const result = calculateVolume({
        clients: [active, paused],
        clientStates: {
          [active.id]: { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null },
          [paused.id]: { status: 'Paused', has_warmup: false, has_list_hygiene: false, first_active_round: null }
        },
        currentRound: 1
      });

      expect(result.totalVolume).toBe(30000);
      expect(result.activeClients).toHaveLength(1);
    });
  });

  describe('Iteration 5: Warmup reduction', () => {
    test('50% reduction first round only', () => {
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
      expect(result.clientVolumes[0].adjustments.warmup).toBe(15000);
    });

    test('no warmup reduction after first round', () => {
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
  });
});
```

---

### Level 2: Integration Tests (Resolution Manager)

**Location:** `resolution-manager.test.ts`

**Characteristics:**
- Test full resolution flow
- Multiple calculators interact
- Uses test session builder
- Validates calculator coordination
- Still no WebSocket/database

**Example:**
```typescript
// resolution-manager.test.ts
import { describe, test, expect } from 'vitest';
import { executeResolution } from './resolution-manager';
import { buildTestSession, buildTestTeam } from '../../tests/helpers/game-session-builder';
import { buildTestClient } from '../../tests/helpers/client-test-fixtures';

describe('Resolution Manager Integration', () => {
  describe('Iteration 1: Basic Volume & Revenue', () => {
    test('complete resolution for single ESP with one client', async () => {
      const client = buildTestClient('premium_brand');
      const session = buildTestSession({
        currentRound: 1,
        teams: [
          buildTestTeam('SendWave', {
            clients: [client],
            clientStates: {
              [client.id]: { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null }
            }
          })
        ]
      });

      const results = await executeResolution(session, 'TEST-123');

      expect(results.espResults.SendWave.volume.totalVolume).toBe(30000);
      expect(results.espResults.SendWave.revenue.baseRevenue).toBe(350);
      expect(results.espResults.SendWave.revenue.actualRevenue).toBe(350); // No delivery modifier in Iteration 1
    });

    test('excludes paused clients from calculation', async () => {
      const active = buildTestClient('premium_brand', { id: 'client-1' });
      const paused = buildTestClient('aggressive_marketer', { id: 'client-2' });

      const session = buildTestSession({
        currentRound: 1,
        teams: [
          buildTestTeam('SendWave', {
            clients: [active, paused],
            clientStates: {
              [active.id]: { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null },
              [paused.id]: { status: 'Paused', has_warmup: false, has_list_hygiene: false, first_active_round: null }
            }
          })
        ]
      });

      const results = await executeResolution(session, 'TEST-123');

      expect(results.espResults.SendWave.volume.totalVolume).toBe(30000);
      expect(results.espResults.SendWave.revenue.baseRevenue).toBe(350);
    });
  });

  describe('Iteration 2: Reputation-Based Delivery', () => {
    test('applies delivery success rate to revenue', async () => {
      const client = buildTestClient('premium_brand');
      const session = buildTestSession({
        currentRound: 1,
        teams: [
          buildTestTeam('SendWave', {
            reputation: { zmail: 75, intake: 75, yagle: 75 }, // Good zone
            clients: [client],
            clientStates: {
              [client.id]: { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: null }
            }
          })
        ]
      });

      const results = await executeResolution(session, 'TEST-123');

      expect(results.espResults.SendWave.delivery.finalRate).toBe(0.85); // Good zone
      expect(results.espResults.SendWave.revenue.actualRevenue).toBe(297.5); // 350 * 0.85
    });
  });
});
```

---

## 🛠️ Test Fixtures & Helpers

### Client Test Fixtures

**File:** `tests/helpers/client-test-fixtures.ts`

**Purpose:** Generate clients with base values (no variance) for predictable tests

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
    volume: overrides?.volume ?? profile.baseVolume,       // Use base value
    revenue: overrides?.revenue ?? profile.baseRevenue,     // Use base value
    risk: overrides?.risk ?? profile.risk,
    spam_rate: overrides?.spam_rate ?? profile.baseSpamRate, // Use base value
    requirements: profile.requirements,
    description: profile.description
  };
}

/**
 * Build multiple test clients at once
 */
export function buildTestClients(configs: Array<{ type: ClientType; overrides?: Partial<Client> }>): Client[] {
  return configs.map((config, index) =>
    buildTestClient(config.type, {
      id: `test-client-${index}`,
      ...config.overrides
    })
  );
}
```

**Usage:**
```typescript
// Simple
const client = buildTestClient('premium_brand');

// With overrides
const client = buildTestClient('aggressive_marketer', {
  id: 'my-client-1',
  volume: 100000 // Override for specific test
});

// Multiple clients
const clients = buildTestClients([
  { type: 'premium_brand' },
  { type: 'growing_startup', overrides: { volume: 40000 } }
]);
```

---

### Game Session Builder

**File:** `tests/helpers/game-session-builder.ts`

**Purpose:** Build test game sessions with sensible defaults

```typescript
import type { GameSession, ESPTeam, Destination, Client, ClientState } from '$lib/server/game/types';

interface TestTeamConfig {
  name: string;
  reputation?: Record<string, number>;
  clients?: Client[];
  clientStates?: Record<string, ClientState>;
  techStack?: string[];
  credits?: number;
}

interface TestSessionConfig {
  currentRound?: number;
  currentPhase?: 'planning' | 'resolution';
  teams?: TestTeamConfig[];
  destinations?: string[];
}

export function buildTestTeam(config: TestTeamConfig): ESPTeam {
  return {
    name: config.name,
    credits: config.credits ?? 1000,
    reputation: config.reputation ?? { zmail: 70, intake: 70, yagle: 70 },
    active_clients: config.clients?.map(c => c.id) ?? [],
    available_clients: config.clients ?? [],
    client_states: config.clientStates ?? {},
    owned_tech_upgrades: config.techStack ?? [],
    locked_in: true,
    pending_onboarding_decisions: {}
  };
}

export function buildTestSession(config: TestSessionConfig): GameSession {
  const destinations: Destination[] = (config.destinations ?? ['zmail', 'intake', 'yagle']).map(name => ({
    name,
    kingdom: name as 'zmail' | 'intake' | 'yagle',
    esp_reputation: {},
    filtering_policies: {},
    owned_tools: [],
    authentication_level: 0
  }));

  return {
    room_code: 'TEST-123',
    current_round: config.currentRound ?? 1,
    current_phase: config.currentPhase ?? 'planning',
    phase_start_time: new Date(),
    esp_teams: config.teams?.map(buildTestTeam) ?? [],
    destinations
  };
}
```

**Usage:**
```typescript
const session = buildTestSession({
  currentRound: 2,
  teams: [
    {
      name: 'SendWave',
      reputation: { zmail: 75, intake: 70, yagle: 68 },
      clients: [
        buildTestClient('premium_brand'),
        buildTestClient('growing_startup')
      ],
      clientStates: {
        'client-1': { status: 'Active', has_warmup: false, has_list_hygiene: false, first_active_round: 1 },
        'client-2': { status: 'Active', has_warmup: true, has_list_hygiene: true, first_active_round: 2 }
      },
      techStack: ['spf', 'dkim']
    }
  ]
});
```

---

## 🔄 Iteration Evolution Example

### Iteration 1: Volume Calculator (Simple)

```typescript
// calculators/volume-calculator.ts - Iteration 1
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

**Tests pass:** ✅ Basic volume, excludes paused

---

### Iteration 5: Enhanced Volume Calculator

```typescript
// calculators/volume-calculator.ts - Iteration 5
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
    const adjustments: any = {};

    // List hygiene reduction (permanent)
    if (state.has_list_hygiene) {
      const reduction = getListHygieneVolumeReduction(client.risk);
      const reductionAmount = client.volume * reduction;
      adjustedVolume -= reductionAmount;
      adjustments.listHygiene = reductionAmount;
    }

    // Warmup reduction (first round only)
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

**Tests pass:** ✅ All Iteration 1 tests + new Iteration 5 tests

**Key Points:**
- Same function signature
- Backward compatible
- Existing tests still pass
- New functionality added cleanly

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────┐
│         GameSession (from planning phase)       │
│  - current_round                                │
│  - esp_teams (with locked decisions)            │
│  - destinations                                 │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│         Resolution Manager (Orchestrator)       │
│  - Loads logger (lazy)                          │
│  - Iterates through ESP teams                   │
│  - Calls calculators in order                   │
│  - Logs inputs/outputs                          │
│  - Broadcasts WebSocket updates                 │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌──────────────┐      ┌──────────────┐
│   Volume     │      │  Reputation  │
│  Calculator  │      │  Calculator  │
└──────┬───────┘      └──────┬───────┘
       │                     │
       │   VolumeResult      │   ReputationResult
       │                     │
       └──────────┬──────────┘
                  │
                  ▼
       ┌──────────────────┐
       │    Delivery      │
       │   Calculator     │
       └────────┬─────────┘
                │
                │   DeliveryResult
                │
                ▼
       ┌──────────────────┐
       │    Revenue       │
       │   Calculator     │
       └────────┬─────────┘
                │
                │   RevenueResult
                │
                ▼
       ┌──────────────────┐
       │   Complaint      │
       │   Calculator     │
       └────────┬─────────┘
                │
                │   ComplaintResult
                │
                ▼
┌─────────────────────────────────────────────────┐
│           ResolutionResults                     │
│  - espResults (per team)                        │
│  - destinationResults (later iterations)        │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
┌──────────────┐      ┌──────────────┐
│  WebSocket   │      │    Store     │
│  Broadcast   │      │   Results    │
│              │      │  (for UI)    │
└──────────────┘      └──────────────┘
```

---

## 🎯 Key Architecture Decisions

### 1. **Why Calculator Pattern?**
- **Testability:** Each calculator independently testable
- **Maintainability:** Clear separation of concerns
- **Debuggability:** Easy to log inputs/outputs per calculator
- **Iterability:** Add features to specific calculators incrementally

### 2. **Why Pure Functions?**
- **Predictability:** Same input always produces same output
- **No Side Effects:** Easier to reason about
- **Parallel Testing:** Can run tests concurrently
- **Easy Mocking Avoidance:** No need for mocks (follows project guidelines)

### 3. **Why Test Fixtures?**
- **Predictability:** Base values ensure consistent tests
- **Speed:** No database, no external dependencies
- **Clarity:** Test data visible in test code
- **Repeatability:** Same test always behaves the same

### 4. **Why Multi-Level Testing?**
- **Unit Tests:** Fast feedback, pinpoint failures
- **Integration Tests:** Validate calculator interactions
- **No E2E for Calculators:** Logic doesn't require UI

### 5. **Why Lazy Logger?**
- **Avoid Import Issues:** Prevents $app/environment errors during Vite config
- **Consistent with Codebase:** Follows existing pattern in managers

---

## ✅ Benefits of This Architecture

1. **ATDD-Friendly:** Write test → implement → refactor cycle works perfectly
2. **Incremental:** Each iteration adds to specific calculators without breaking previous work
3. **Fast Testing:** Unit tests run in milliseconds
4. **Clear Debugging:** Log each step of calculation
5. **Game Balance:** All constants in config files, easy to tune
6. **Team Collaboration:** Clear module boundaries, multiple devs can work in parallel
7. **No Mocking:** Real implementations, following project guidelines
8. **Maintainable:** Small, focused functions are easier to understand and modify

---

## 🚀 Next Steps

1. **Create directory structure**
2. **Implement test fixtures** (client-test-fixtures.ts, game-session-builder.ts)
3. **Start Iteration 1:**
   - Write volume calculator tests
   - Implement volume calculator
   - Write revenue calculator tests
   - Implement revenue calculator
   - Write resolution manager integration test
   - Implement resolution manager (basic version)
4. **Run tests, ensure all pass**
5. **Commit Iteration 1**
6. **Move to Iteration 2**

---

**Architecture Version:** 1.0
**Last Updated:** 2025-11-07
**Status:** Ready for Implementation 🚀
