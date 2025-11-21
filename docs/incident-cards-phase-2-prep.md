# Incident Cards Phase 2: Implementation Prep

**Status**: Prepared, awaiting Phase A refactor completion
**Date**: 2025-01-21

---

## Cards to Implement (5 Total)

### 1. INC-003: Venture Capital Boost
- **Round**: 1
- **Rarity**: Uncommon
- **Effect**: Facilitator picks ESP → +200 credits
- **Trigger**: Facilitator selects team in UI
- **Implementation**: Simple credit addition, no conditions

### 2. INC-008: Authentication Emergency
- **Round**: 2
- **Rarity**: Common
- **Effect**: ESPs without DKIM → -10 reputation
- **Condition**: `lacks_tech: 'dkim'`
- **Implementation**: Conditional effect, check tech stack
- **Note**: Removed destination auth validator discount (deferred to later phase)

### 3. INC-009: Seasonal Traffic Surge
- **Round**: 2
- **Rarity**: Uncommon
- **Effect**: 1.5x volume multiplier for e-commerce/retail/event clients
- **Spam Trap**: 1.2x spam trap multiplier for affected clients
- **Target**: Auto-applies to ALL ESPs, system finds matching clients
- **Client Types**: `['re_engagement', 'aggressive_marketer', 'event_seasonal']`
- **Duration**: This Round only
- **Implementation**: Create volume + spam trap modifiers for matching clients

### 4. INC-011: Viral Campaign
- **Round**: 3
- **Rarity**: Rare
- **Effect**: 10x volume multiplier for one client (facilitator picks ESP, system picks random client)
- **Conditional Branching**:
  - IF has list hygiene: +10 reputation, +500 credits bonus
  - ELSE: -10 reputation, 3x spam trap multiplier
- **Implementation**:
  - Facilitator selects ESP team
  - System randomly picks one active client from that team
  - Check for list_hygiene modifier in client state
  - Apply appropriate effects based on condition

### 5. INC-016: Legal Reckoning
- **Round**: 4
- **Rarity**: Uncommon
- **Effect**: Facilitator picks ESP → -400 credits + auto-lock
- **Auto-Lock Logic**:
  - If already in planning phase: Lock immediately when card triggers
  - If not in planning phase: Lock at start of next planning phase
  - Locked team cannot make decisions for current/next round
- **Implementation**: Force lock-in on selected team

**Skipped**: INC-014 (Infrastructure Subsidy) - deferred to later phase

---

## Key Implementation Decisions

### Condition System Structure
```typescript
interface EffectCondition {
  type: 'has_tech' | 'lacks_tech' | 'client_type';
  tech?: string; // 'dkim', 'dmarc', 'list_hygiene'
  clientTypes?: ClientType[]; // For client filtering
}

interface IncidentEffect {
  // Existing fields...
  condition?: EffectCondition; // Each effect can have a condition
  clientTypes?: ClientType[]; // For filtering clients
  multiplier?: number; // For volume/spam modifiers
  duration?: 'this_round' | 'next_round' | 'permanent';
}
```

**Decision**: Use Option B (individual conditions per effect) instead of dedicated if/else structure
- **Pros**: Simpler, reuses existing structure, flexible, easy to test
- **Cons**: If/else not explicit, need to coordinate "inverse" conditions
- Only 1 card (INC-011) needs if/else in Phase 2

### New Target Types
```typescript
type IncidentEffectTarget =
  | 'all_esps'
  | 'all_destinations'
  | 'notification'
  | 'selected_esp'        // NEW: Facilitator picks ESP team
  | 'selected_client'     // NEW: System picks random client
  | 'conditional_esp';    // NEW: ESPs matching a condition
```

### New Effect Types
```typescript
type IncidentEffectType =
  | 'reputation'
  | 'credits'
  | 'budget'
  | 'notification'
  | 'client_volume_multiplier'   // NEW: Add volume modifier to clients
  | 'client_spam_trap_multiplier' // NEW: Add spam trap modifier
  | 'auto_lock';                  // NEW: Force team lock-in
```

---

## Modifier Details

### Volume Modifiers (Already Implemented in Phase A)
```typescript
interface VolumeModifier {
  id: string;
  source: string; // "warmup" | "list_hygiene" | "INC-009" | "INC-011" | "INC-015"
  multiplier: number; // 1.5 (seasonal), 10 (viral), 2 (black friday)
  applicableRounds: number[]; // [2] for INC-009, [3] for INC-011
  description?: string;
}
```

### Spam Trap Modifiers (Already Implemented in Phase A)
```typescript
interface SpamTrapModifier {
  id: string;
  source: string; // "list_hygiene" | "INC-009" | "INC-011"
  multiplier: number; // 1.2 (INC-009 = 20% increase), 3 (INC-011 = 200% increase)
  applicableRounds: number[];
  description?: string;
}
```

### Modifier Stacking Rules
- **Volume**: All modifiers multiply together
  - Example: warmup (0.5) × list hygiene (0.85) × seasonal (1.5) = 0.6375
- **Spam Trap**: All modifiers multiply base risk
  - Example: baseRisk × list_hygiene (0.6) × INC-009 (1.2) = baseRisk × 0.72

---

## UI Flow: Team Selection

### Two-Step Process (Option A - Chosen)
1. Facilitator clicks "Trigger Incident"
2. Selection modal shows:
   - List of available incidents (filtered by round)
   - For incidents requiring team selection: Dropdown with ESP teams
3. Facilitator selects incident + team (if required) → Trigger

### Team Selection Details
- **INC-003, INC-011, INC-016**: Require team selection
- **INC-008, INC-009**: No team selection (auto-applies)
- **Client Selection (INC-011)**: Auto-selected randomly by system (uniform probability among active clients)

### Updated Modal Structure
```typescript
// IncidentSelectionModal.svelte
interface ModalState {
  selectedIncidentId: string | null;
  selectedTeamName: string | null; // NEW: For team selection
}

// API endpoint
interface TriggerRequest {
  incidentId: string;
  selectedTeam?: string; // NEW: Optional team selection
}
```

---

## Card Display Updates

### Animation Change
- **Current**: `fade` transition
- **New**: `fly` transition with `y: -100`
- **Duration**: Keep 10 seconds auto-dismiss

### Affected Team Display
When an incident affects a specific team:
```svelte
{#if incident.affectedTeam}
  <div class="affected-team-banner">
    Affects: <strong>{incident.affectedTeam}</strong>
  </div>
{/if}
```

---

## Consequences Dashboard Integration

### Display Incident Effects
Add section to [ESPConsequences.svelte](src/lib/components/consequences/ESPConsequences.svelte):

```svelte
{#if incidentEffects.length > 0}
  <div class="incident-effects-summary">
    <h3>Incident Effects This Round</h3>
    {#each incidentEffects as effect}
      <!-- Volume multiplier effect -->
      {#if effect.type === 'volume'}
        <p>
          {effect.clientName}: Volume increased by {effect.multiplier}x
          due to {effect.incidentName}
        </p>
      {/if}

      <!-- Reputation change -->
      {#if effect.reputationChange}
        <p>
          Reputation {effect.reputationChange > 0 ? 'gained' : 'lost'}
          {Math.abs(effect.reputationChange)} points due to {effect.incidentName}
        </p>
      {/if}
    {/each}
  </div>
{/if}
```

### Data Structure
```typescript
interface IncidentEffect {
  incidentId: string;
  incidentName: string;
  type: 'volume' | 'reputation' | 'credits';
  clientName?: string; // For client-specific effects
  multiplier?: number; // For volume effects
  reputationChange?: number;
  creditsChange?: number;
}
```

---

## WebSocket Events

### New Events to Add
```typescript
// When volume/spam modifiers are applied to clients
{
  type: 'incident_modifier_applied',
  incidentId: string,
  espName: string,
  clientId: string,
  modifierType: 'volume' | 'spam_trap',
  modifier: VolumeModifier | SpamTrapModifier
}

// Enhanced dashboard updates to include incident effects
{
  type: 'esp_dashboard_update',
  data: {
    teamName: string,
    credits: number,
    reputation: Record<string, number>,
    incidentEffects?: IncidentEffect[] // NEW: Track active incident effects
  }
}
```

---

## Client Type Mapping

Client types in the game ([src/lib/server/game/types.ts](src/lib/server/game/types.ts:74-79)):
```typescript
type ClientType =
  | 'premium_brand'
  | 'growing_startup'
  | 're_engagement'
  | 'aggressive_marketer'
  | 'event_seasonal';
```

### INC-009 Targeting
Affects clients with types: `['re_engagement', 'aggressive_marketer', 'event_seasonal']`

**Spec mapping**:
- "e-commerce" → `'aggressive_marketer'`
- "retail" → `'event_seasonal'`
- "event" → `'re_engagement'`

---

## Auto-Lock Implementation (INC-016)

### Lock-In Logic
```typescript
// In incident-effects-manager.ts
function applyAutoLock(session: GameSession, teamName: string) {
  const team = session.esp_teams.find(t => t.name === teamName);
  if (!team) return;

  // If already in planning phase, lock immediately
  if (session.current_phase === 'planning') {
    team.locked_in = true;
    team.locked_in_at = new Date();
  } else {
    // Set flag to auto-lock at next planning phase start
    team.pendingAutoLock = true; // NEW field
  }
}

// In phase-manager.ts (transitionPhase)
if (newPhase === 'planning') {
  // Check for pending auto-locks
  for (const team of session.esp_teams) {
    if (team.pendingAutoLock) {
      team.locked_in = true;
      team.locked_in_at = new Date();
      team.pendingAutoLock = false;
    }
  }
}
```

---

## Test Structure (ATDD)

### File: `tests/us-incident-phase-2.spec.ts`

```gherkin
Feature: Phase 2 Incident Cards

Scenario: INC-003 - Venture Capital Boost
  Given facilitator triggers INC-003
  When facilitator selects ESP "SendWave"
  Then SendWave gains 200 credits
  And incident appears in history

Scenario: INC-008 - Authentication Emergency
  Given "SendWave" has no DKIM
  And "MailMonkey" has DKIM
  When facilitator triggers INC-008
  Then SendWave loses 10 reputation at all destinations
  And MailMonkey reputation unchanged

Scenario: INC-009 - Seasonal Traffic Surge
  Given "SendWave" has e-commerce client "ShopCo"
  And "ShopCo" base volume is 50,000
  When facilitator triggers INC-009 in round 2
  Then "ShopCo" volume becomes 75,000 (1.5x)
  And consequences dashboard shows volume increase message

Scenario: INC-011 - Viral Campaign (with list hygiene)
  Given "SendWave" has client "ViralCo" with list hygiene
  When facilitator triggers INC-011 and selects "SendWave"
  And system picks "ViralCo" randomly
  Then "ViralCo" volume becomes 10x
  And "SendWave" gains 10 reputation
  And "SendWave" gains 500 credits bonus

Scenario: INC-011 - Viral Campaign (without list hygiene)
  Given "SendWave" has client "ViralCo" without list hygiene
  When facilitator triggers INC-011 and selects "SendWave"
  And system picks "ViralCo" randomly
  Then "ViralCo" volume becomes 10x
  And "SendWave" loses 10 reputation
  And "ViralCo" spam trap risk multiplied by 3

Scenario: INC-016 - Legal Reckoning with Auto-Lock
  Given game is in planning phase
  When facilitator triggers INC-016 and selects "SendWave"
  Then "SendWave" loses 400 credits
  And "SendWave" is immediately locked in
  And "SendWave" cannot make further decisions

Scenario: Modifier Stacking
  Given client has warmup (0.5x) and list hygiene (0.85x)
  When INC-009 triggers (1.5x)
  Then final volume = base × 0.5 × 0.85 × 1.5
  And all modifiers tracked separately in state
```

---

## Implementation Order (Phase B)

### B1: Update Types
- Add new target types
- Add new effect types
- Add condition interface
- Update IncidentEffect interface
- Add helper types for consequences display

### B2: Write Tests (RED Phase)
- Create `tests/us-incident-phase-2.spec.ts`
- Implement all test scenarios above
- Run tests → All FAIL (expected)

### B3: Add Card Definitions
- Update [src/lib/config/incident-cards.ts](src/lib/config/incident-cards.ts)
- Add 5 new cards with proper effects structure

### B4-B5: Backend Implementation
- Enhance [incident-manager.ts](src/lib/server/game/incident-manager.ts)
  - `validateTeamSelection()`
  - `selectRandomClientForTeam()`
- Update [incident-effects-manager.ts](src/lib/server/game/incident-effects-manager.ts)
  - `evaluateCondition()`
  - `filterTeamsByCondition()`
  - `filterClientsByType()`
  - `applyVolumeModifier()`
  - `applySpamTrapModifier()`
  - `applyAutoLock()`

### B6: API Updates
- Update [/api/sessions/[roomCode]/incident/trigger/+server.ts](src/routes/api/sessions/[roomCode]/incident/trigger/+server.ts)
- Add `selectedTeam` parameter
- Validate team selection when required

### B7-B8: UI Updates
- Update [IncidentSelectionModal.svelte](src/lib/components/incident/IncidentSelectionModal.svelte)
  - Add team dropdown
  - Show only when incident requires team selection
  - Validate before trigger
- Update [IncidentCardDisplay.svelte](src/lib/components/incident/IncidentCardDisplay.svelte)
  - Change fade → fly animation
  - Show affected team name

### B9: Consequences Display
- Update [ESPConsequences.svelte](src/lib/components/consequences/ESPConsequences.svelte)
- Add incident effects section
- Show volume multiplier messages
- Show reputation change messages

### B10-B11: Testing
- Run Phase 2 tests
- Fix any failures
- Manual testing

---

## Edge Cases to Handle

1. **INC-009**: What if ESP has no matching clients?
   - Skip that ESP, apply to others with matching clients

2. **INC-011**: What if selected ESP has no active clients?
   - Return error to facilitator, don't trigger card

3. **INC-016**: What if team already locked?
   - Allow trigger anyway (still deduct credits)

4. **Modifier conflicts**: Multiple incidents same round?
   - All modifiers stack multiplicatively (already implemented in Phase A)

---

## Test IDs to Add

```typescript
// Selection Modal
'drama-team-selector'
'drama-team-option-{teamName}'

// Card Display
'drama-affected-team'

// Consequences
'incident-effects-summary'
'incident-effect-{index}'
```

---

## Notes and Reminders

- configureOnboarding() now requires `client` parameter (added in Phase A refactor)
- All volume/spam trap logic now uses modifier arrays (Phase A refactor)
- `-1` in applicableRounds means "first active round only"
- isModifierApplicable() helper exists in 3 files (volume-calculator, spam-trap-calculator, client-portfolio-manager)
- WebSocket broadcasts must include modifier details for real-time UI updates
- Remember to update incident-cards-specification.md with actual multiplier values (1.2 for INC-009, 3 for INC-011)

---

## Questions Resolved

All Q&A from planning session:

- **Q7**: Option B (individual conditions per effect) ✅
- **Q15**: Option A (two-step UI with team selection in modal) ✅
- **Q16**: System auto-selects random client for INC-011 ✅
- **Q17**: Yes, add to ClientState interface ✅ (Done in Phase A)
- **Q18**: System automatically finds matching clients ✅
- **Q19**: Spam trap already implemented, use multiplier system ✅
- **Q20**: Skip INC-014 for now ✅
- **Q21**: Auto-lock logic defined above ✅
- **Q22**: Option C (skip auth validator discount) ✅
- **Q23**: Client types mapped above ✅
- **Q24**: Option A (multiplier, not fixed increase) ✅
- **Q25**: Option A (facilitator picks any team) ✅
- **Q26**: Yes, all modifiers multiply ✅
- **Q27**: Option B (multiply) - baseRisk × 1.2 ✅
