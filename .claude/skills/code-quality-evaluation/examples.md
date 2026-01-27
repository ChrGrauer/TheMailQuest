# Code Quality Examples

This document provides concrete examples of good and bad practices for the four evaluation pillars.

## 🏗️ Architecture & Structure Examples

### Example 1: File Size - Before and After

#### ❌ BAD: God File (reputation-manager.js - 650 lines)

```javascript
// reputation-manager.js (650 lines total)

export class ReputationManager {
    // Reputation calculation logic (180 lines)
    calculateReputation(esp, destination) {
        const baseScore = this.getBaseScore(esp);
        const techBonus = this.calculateTechBonus(esp);
        const clientPenalty = this.calculateClientPenalty(esp);
        const historicalFactor = this.getHistoricalFactor(esp);
        // ... 150+ more lines
    }
    
    getBaseScore(esp) { /* 30 lines */ }
    calculateTechBonus(esp) { /* 45 lines */ }
    calculateClientPenalty(esp) { /* 60 lines */ }
    
    // Client impact analysis (120 lines)
    analyzeClientImpact(client, esp) { /* 120 lines */ }
    
    // Technical bonus management (90 lines)
    applyTechnicalBonuses(esp) { /* 90 lines */ }
    
    // Historical tracking (150 lines)
    trackHistory(esp) { /* 150 lines */ }
    getHistoricalFactor(esp) { /* 80 lines */ }
    
    // Scoring formulas (110 lines)
    calculateWeightedScore() { /* 110 lines */ }
}
```

#### ✅ GOOD: Modular Structure

```javascript
// reputation-manager.js (80 lines - orchestration)
import { ReputationCalculator } from './calculator';
import { ClientImpactAnalyzer } from './client-impact';
import { TechBonusManager } from './tech-bonus';
import { ReputationHistory } from './history';

export class ReputationManager {
    constructor() {
        this.calculator = new ReputationCalculator();
        this.clientAnalyzer = new ClientImpactAnalyzer();
        this.techBonus = new TechBonusManager();
        this.history = new ReputationHistory();
    }
    
    calculateReputation(esp, destination) {
        const base = this.calculator.calculate(esp, destination);
        const clientImpact = this.clientAnalyzer.analyze(esp);
        const techBonus = this.techBonus.apply(esp);
        const historical = this.history.getFactor(esp);
        
        return this.calculator.combine(base, clientImpact, techBonus, historical);
    }
}

// calculator.js (120 lines)
export class ReputationCalculator {
    calculate(esp, destination) { /* 50 lines */ }
    combine(...factors) { /* 30 lines */ }
    getWeights(destination) { /* 40 lines */ }
}

// client-impact.js (95 lines)
export class ClientImpactAnalyzer {
    analyze(esp) { /* 95 lines */ }
}

// tech-bonus.js (85 lines)
export class TechBonusManager {
    apply(esp) { /* 85 lines */ }
}

// history.js (110 lines)
export class ReputationHistory {
    trackHistory(esp) { /* 60 lines */ }
    getFactor(esp) { /* 50 lines */ }
}
```

**Benefits of splitting**:
- Each file has single responsibility
- Easy to locate functionality
- Easy to test in isolation
- Can be developed by different team members

---

### Example 2: Directory Depth

#### ❌ BAD: Too Deep (6 levels)

```
src/
└── lib/
    └── features/
        └── game/
            └── core/
                └── engine/
                    └── reputation/
                        └── calculation/
                            └── calculator.js  ❌ Hard to navigate
```

#### ✅ GOOD: Flat and Clear (3 levels)

```
src/
└── lib/
    └── game/
        ├── reputation/
        │   ├── calculator.js
        │   ├── history.js
        │   └── analyzer.js
        ├── clients/
        │   ├── manager.js
        │   └── validator.js
        └── rounds/
            └── resolver.js
```

---

## 🔄 Modularity & Coupling Examples

### Example 3: UI/Logic Coupling

#### ❌ BAD: Business Logic Knows About UI

```javascript
// game-engine.js
import ESPDashboard from './components/ESPDashboard.svelte';
import DestinationDashboard from './components/DestinationDashboard.svelte';

export class GameEngine {
    processRound() {
        // Calculate scores
        const scores = this.calculateScores();
        
        // ❌ Logic directly manipulates UI
        ESPDashboard.updateScores(scores.esp);
        DestinationDashboard.updateScores(scores.destination);
        
        // ❌ Logic knows about UI state
        if (ESPDashboard.isVisible()) {
            ESPDashboard.showNotification('Round complete!');
        }
    }
}
```

#### ✅ GOOD: Decoupled via Stores

```javascript
// game-engine.js
import { espScores, destinationScores, notifications } from './stores';

export class GameEngine {
    processRound() {
        // Calculate scores
        const scores = this.calculateScores();
        
        // ✅ Update stores, UI subscribes
        espScores.set(scores.esp);
        destinationScores.set(scores.destination);
        notifications.add({ message: 'Round complete!', type: 'success' });
    }
}

// ESPDashboard.svelte
<script>
    import { espScores, notifications } from '$lib/stores';
    // Component subscribes to relevant stores
    $: currentScores = $espScores;
</script>

{#if $notifications.length > 0}
    <Notification message={$notifications[0].message} />
{/if}
```

---

### Example 4: Component Reusability

#### ❌ BAD: Overly Specific Component

```svelte
<!-- ESPDashboardForSendWaveInRound2.svelte -->
<script>
    // ❌ Hardcoded for specific case
    const teamName = 'SendWave';
    const round = 2;
    const espSpecificLogic = true;
    
    function handleAction() {
        // ❌ Specific to ESP, specific to SendWave
        if (teamName === 'SendWave' && round === 2) {
            // Special logic
        }
    }
</script>

<div class="esp-dashboard sendwave-theme round-2-layout">
    <!-- ❌ Can't be reused -->
</div>
```

#### ✅ GOOD: Generic, Reusable Component

```svelte
<!-- PlayerDashboard.svelte -->
<script>
    // ✅ Props make it flexible
    export let player;
    export let role = 'esp'; // 'esp' | 'destination'
    export let round;
    export let theme = 'default';
    
    // ✅ Generic logic
    function handleAction() {
        // Works for any player, any round
        player.processAction();
    }
</script>

<div class="player-dashboard" class:esp={role === 'esp'} class:destination={role === 'destination'}>
    <header>
        <h2>{player.name}</h2>
        <span class="round">Round {round}</span>
    </header>
    <!-- ✅ Reusable across different contexts -->
</div>

<!-- Usage -->
<PlayerDashboard player={sendWaveData} role="esp" round={2} />
<PlayerDashboard player={zmailData} role="destination" round={2} />
```

---

## 🎯 DRY Examples

### Example 5: Duplicated Calculation Logic

#### ❌ BAD: Same Formula Repeated

```javascript
// esp-scoring.js
export function calculateESPScore(reputation, clients, tech) {
    const reputationWeight = 0.5;
    const clientsWeight = 0.3;
    const techWeight = 0.2;
    
    return (reputation * reputationWeight) + 
           (clients * clientsWeight) + 
           (tech * techWeight);
}

// destination-scoring.js
export function calculateDestinationScore(satisfaction, filtering, coordination) {
    const satisfactionWeight = 0.5;
    const filteringWeight = 0.3;
    const coordinationWeight = 0.2;
    
    // ❌ Same weighting formula!
    return (satisfaction * satisfactionWeight) + 
           (filtering * filteringWeight) + 
           (coordination * coordinationWeight);
}
```

#### ✅ GOOD: Shared Utility Function

```javascript
// lib/utils/scoring.js
export function calculateWeightedScore(values, weights = [0.5, 0.3, 0.2]) {
    if (values.length !== weights.length) {
        throw new Error('Values and weights must have same length');
    }
    
    return values.reduce((sum, value, index) => 
        sum + (value * weights[index]), 0
    );
}

// esp-scoring.js
import { calculateWeightedScore } from '$utils/scoring';

export function calculateESPScore(reputation, clients, tech) {
    return calculateWeightedScore([reputation, clients, tech]);
}

// destination-scoring.js
import { calculateWeightedScore } from '$utils/scoring';

export function calculateDestinationScore(satisfaction, filtering, coordination) {
    return calculateWeightedScore([satisfaction, filtering, coordination]);
}
```

---

## ✅ Test Quality Examples

### Example 6: Redundant Tests

#### ❌ BAD: Repetitive Test Cases

```javascript
// reputation-calculator.test.js (250 lines)

describe('calculateReputation', () => {
    test('zmail with score 85 returns good', () => {
        const result = calculateReputation('zmail', 85);
        expect(result).toBe('good');
    });
    
    test('zmail with score 90 returns excellent', () => {
        const result = calculateReputation('zmail', 90);
        expect(result).toBe('excellent');
    });
    
    test('zmail with score 95 returns excellent', () => {
        const result = calculateReputation('zmail', 95);
        expect(result).toBe('excellent');
    });
    
    // ... 20 more nearly identical tests
});
```

#### ✅ GOOD: Parameterized Tests

```javascript
// reputation-calculator.test.js (80 lines)

describe('calculateReputation', () => {
    // ✅ Table-driven test with all cases
    test.each([
        // [destination, score, expected]
        ['zmail', 95, 'excellent'],
        ['zmail', 90, 'excellent'],
        ['zmail', 85, 'good'],
        ['zmail', 70, 'good'],
        ['zmail', 50, 'poor'],
        ['intake', 95, 'excellent'],
        ['intake', 85, 'good'],
        ['yagle', 70, 'good']
    ])('%s with score %i returns %s', (destination, score, expected) => {
        const result = calculateReputation(destination, score);
        expect(result).toBe(expected);
    });
});
```

**Benefits**:
- Reduced from 250 to 80 lines
- Easy to add new test cases
- Clear pattern visible at a glance
- Less maintenance burden

---

### Example 7: Testing Implementation vs Behavior

#### ❌ BAD: Testing Implementation Details

```javascript
// player.test.js

describe('Player', () => {
    test('uses internal _budget property', () => {
        const player = new Player({ budget: 1000 });
        expect(player._budget).toBe(1000); // ❌ Testing internal detail
    });
    
    test('calls _validateClient method', () => {
        const player = new Player();
        const spy = jest.spyOn(player, '_validateClient'); // ❌ Spying on private method
        
        player.acquireClient({ id: 1, cost: 100 });
        expect(spy).toHaveBeenCalled();
    });
    
    test('sets className to "btn-primary"', () => {
        const button = render(<ActionButton />);
        expect(button.className).toBe('btn-primary'); // ❌ Testing CSS class
    });
});
```

#### ✅ GOOD: Testing Behavior and Contracts

```javascript
// player.test.js

describe('Player', () => {
    test('decreases budget when acquiring client', () => {
        const player = new Player({ budget: 1000 });
        
        player.acquireClient({ id: 1, cost: 200 });
        
        expect(player.budget).toBe(800); // ✅ Testing behavior
        expect(player.clients).toHaveLength(1); // ✅ Testing outcome
    });
    
    test('throws error for invalid client', () => {
        const player = new Player();
        
        expect(() => {
            player.acquireClient({ cost: -100 }); // Missing id, negative cost
        }).toThrow('Invalid client'); // ✅ Testing contract
    });
    
    test('prevents acquiring client when insufficient budget', () => {
        const player = new Player({ budget: 100 });
        
        expect(() => {
            player.acquireClient({ id: 1, cost: 200 });
        }).toThrow('Insufficient budget'); // ✅ Testing business rule
    });
});
```

---

### Example 8: Test Coverage - Quality vs Quantity

#### ❌ BAD: High Coverage, Low Value

```javascript
// reputation-calculator.test.js

describe('ReputationCalculator', () => {
    test('constructor creates instance', () => {
        const calc = new ReputationCalculator();
        expect(calc).toBeInstanceOf(ReputationCalculator); // ❌ Useless
    });
    
    test('getName returns name', () => {
        const calc = new ReputationCalculator();
        calc.name = 'test';
        expect(calc.name).toBe('test'); // ❌ Trivial getter
    });
    
    test('MAX_SCORE constant is 100', () => {
        expect(ReputationCalculator.MAX_SCORE).toBe(100); // ❌ Testing constant
    });
    
    test('calculate method exists', () => {
        const calc = new ReputationCalculator();
        expect(typeof calc.calculate).toBe('function'); // ❌ Useless
    });
});

// Coverage: 100% ✅ but tests are worthless ❌
```

#### ✅ GOOD: Meaningful Coverage

```javascript
// reputation-calculator.test.js

describe('ReputationCalculator', () => {
    describe('calculate', () => {
        test('returns excellent for score above 85', () => {
            const calc = new ReputationCalculator();
            
            const result = calc.calculate('zmail', 90);
            
            expect(result.rating).toBe('excellent');
            expect(result.score).toBe(90);
        });
        
        test('applies destination weight correctly', () => {
            const calc = new ReputationCalculator();
            
            // zmail has 50% weight, intake 30%, yagle 20%
            const zmail = calc.calculate('zmail', 80);
            const intake = calc.calculate('intake', 80);
            
            expect(zmail.weightedScore).toBeGreaterThan(intake.weightedScore);
        });
        
        test('throws error for unknown destination', () => {
            const calc = new ReputationCalculator();
            
            expect(() => {
                calc.calculate('unknown', 80);
            }).toThrow('Unknown destination: unknown');
        });
        
        test('handles boundary values correctly', () => {
            const calc = new ReputationCalculator();
            
            expect(calc.calculate('zmail', 0).rating).toBe('poor');
            expect(calc.calculate('zmail', 100).rating).toBe('excellent');
        });
    });
});

// Coverage: 95% ✅ and tests are valuable ✅
```

---

## Real-World Mail Quest Example

### Example 9: Complete Refactoring Journey

#### ❌ BEFORE: Problematic Code

```javascript
// game-state.js (850 lines, multiple responsibilities)

export class GameState {
    constructor() {
        this.espPlayers = [];
        this.destinationPlayers = [];
        this.currentRound = 1;
        this.clients = [];
        this.technologies = [];
        this.dramaEvents = [];
        // ... 20+ more properties
    }
    
    // ESP Management (200 lines)
    addESP(esp) {
        // Validation
        if (!esp || !esp.id) throw new Error('Invalid ESP');
        if (this.espPlayers.find(e => e.id === esp.id)) {
            throw new Error('ESP already exists');
        }
        
        // Initialize ESP data
        esp.budget = 1000;
        esp.clients = [];
        esp.reputation = { zmail: 50, intake: 50, yagle: 50 };
        esp.technologies = { spf: false, dkim: false, dmarc: false };
        
        this.espPlayers.push(esp);
        this._calculateESPScores(); // ❌ Side effect
    }
    
    _calculateESPScores() { /* 80 lines */ }
    
    // Client Management (250 lines)
    acquireClient(espId, clientId) {
        const esp = this.espPlayers.find(e => e.id === espId);
        if (!esp) throw new Error('ESP not found');
        
        const client = this.clients.find(c => c.id === clientId);
        if (!client) throw new Error('Client not found');
        
        if (esp.budget < client.cost) {
            throw new Error('Insufficient budget');
        }
        
        // ❌ Same calculation repeated in multiple places
        esp.budget = esp.budget - client.cost;
        esp.clients.push(client);
        
        // ❌ Direct UI manipulation
        this._updateESPDashboard(esp);
    }
    
    pauseClient(espId, clientId) { /* 60 lines */ }
    removeClient(espId, clientId) { /* 55 lines */ }
    
    // Round Management (180 lines)
    startRound() { /* 180 lines of mixed logic */ }
    
    // Scoring (220 lines)
    calculateScores() { /* 220 lines */ }
}
```

#### ✅ AFTER: Well-Structured Code

```javascript
// game-state.js (120 lines - orchestration only)
import { ESPManager } from './managers/esp-manager';
import { DestinationManager } from './managers/destination-manager';
import { ClientManager } from './managers/client-manager';
import { RoundManager } from './managers/round-manager';
import { ScoringEngine } from './scoring/engine';

export class GameState {
    constructor() {
        this.espManager = new ESPManager();
        this.destinationManager = new DestinationManager();
        this.clientManager = new ClientManager();
        this.roundManager = new RoundManager();
        this.scoringEngine = new ScoringEngine();
        
        this.currentRound = 1;
    }
    
    // Delegate to specialized managers
    addESP(esp) {
        return this.espManager.add(esp);
    }
    
    acquireClient(espId, clientId) {
        const esp = this.espManager.get(espId);
        const client = this.clientManager.get(clientId);
        
        return this.clientManager.acquire(esp, client);
    }
    
    startRound() {
        this.roundManager.start(this.currentRound);
        const scores = this.scoringEngine.calculate({
            esps: this.espManager.getAll(),
            destinations: this.destinationManager.getAll()
        });
        this.currentRound++;
        return scores;
    }
}

// managers/esp-manager.js (95 lines)
import { validateESP } from '$lib/validators/esp';
import { espStore } from '$lib/stores/esp';

export class ESPManager {
    constructor() {
        this.esps = new Map();
    }
    
    add(esp) {
        validateESP(esp); // ✅ Shared validation
        
        if (this.esps.has(esp.id)) {
            throw new Error('ESP already exists');
        }
        
        const initializedESP = this._initialize(esp);
        this.esps.set(esp.id, initializedESP);
        
        // ✅ Update store, not direct UI
        espStore.add(initializedESP);
        
        return initializedESP;
    }
    
    _initialize(esp) {
        return {
            ...esp,
            budget: 1000,
            clients: [],
            reputation: { zmail: 50, intake: 50, yagle: 50 },
            technologies: { spf: false, dkim: false, dmarc: false }
        };
    }
    
    get(id) {
        const esp = this.esps.get(id);
        if (!esp) throw new Error(`ESP not found: ${id}`);
        return esp;
    }
    
    getAll() {
        return Array.from(this.esps.values());
    }
}

// managers/client-manager.js (110 lines)
import { validateClient } from '$lib/validators/client';
import { BudgetService } from '$lib/services/budget';

export class ClientManager {
    constructor() {
        this.clients = new Map();
        this.budgetService = new BudgetService();
    }
    
    acquire(esp, client) {
        validateClient(client); // ✅ Shared validation
        
        // ✅ Budget logic in dedicated service
        this.budgetService.deduct(esp, client.cost);
        
        esp.clients.push(client);
        this.clients.set(client.id, { ...client, ownerId: esp.id });
        
        return { esp, client };
    }
    
    get(id) {
        const client = this.clients.get(id);
        if (!client) throw new Error(`Client not found: ${id}`);
        return client;
    }
}

// services/budget.js (45 lines)
export class BudgetService {
    deduct(entity, amount) {
        if (entity.budget < amount) {
            throw new Error('Insufficient budget');
        }
        
        entity.budget -= amount;
        return entity.budget;
    }
    
    add(entity, amount) {
        entity.budget += amount;
        return entity.budget;
    }
}

// validators/esp.js (35 lines)
export function validateESP(esp) {
    if (!esp || typeof esp !== 'object') {
        throw new Error('ESP must be an object');
    }
    
    if (!esp.id) {
        throw new Error('ESP must have an id');
    }
    
    if (!esp.name || esp.name.trim().length === 0) {
        throw new Error('ESP must have a name');
    }
    
    return true;
}
```

**Improvements**:
- **File size**: 850 lines → 5 files @ 45-120 lines each
- **Duplication**: Validation and budget logic centralized
- **Coupling**: No direct UI manipulation, uses stores
- **Testability**: Each manager can be tested independently
- **Clarity**: Each file has single, clear responsibility

---

## Summary: Applying These Patterns

When reviewing generated code, look for these patterns:

### 🚩 Red Flags
- Files > 300 lines
- Repeated logic in 3+ places
- Business logic importing UI components
- Tests with 80%+ duplicate code
- Deep import chains (`../../../`)

### ✅ Green Flags
- Files focused on single responsibility
- Shared utilities for common operations
- Clean separation: UI ↔ Stores ↔ Logic
- Parameterized tests for similar cases
- Flat, intuitive directory structure

### 🔧 Quick Wins
1. Extract repeated validation into shared functions
2. Replace component duplication with variant props
3. Consolidate similar tests with `test.each()`
4. Set up import aliases to reduce coupling
5. Split "god files" into focused modules

Use these examples as reference when the evaluation skill identifies issues in your code!