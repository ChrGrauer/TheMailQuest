# US-3.3: Resolution Phase Automation

## User Story
**As the** system  
**I want to** calculate game outcomes automatically  
**So that** players see results of their decisions

## Acceptance Criteria
- [ ] When planning phase ends or all players lock in, system collects all player decisions
- [ ] For each ESP campaign:
  - [ ] Calculate per sender the volume to send and the volume of unsolicited emails
  - [ ] Calculate base success rate from destination filtering
  - [ ] Apply reputation modifiers
  - [ ] Apply technical bonuses (SPF/DKIM/DMARC, etc.)
  - [ ] Apply client risk penalties
  - [ ] Add random factor (±20%)
  - [ ] Determine final success percentage
  - [ ] Calculate revenue earned
  - [ ] Calculate reputation changes
  - [ ] Check for special events (spam traps, complaints, etc.)
- [ ] For each Destination:
  - [ ] Calculate spam blocked vs. spam that got through
  - [ ] Calculate false positives
  - [ ] Update user satisfaction
- [ ] Results stored for display in Consequences Phase

## Technical Notes
- Implementation approach: Implement game engine with all formulas from design doc
- Risks/concerns: Performance - must calculate in <2 seconds even with 5 ESPs

## Logging
- All calculation inputs (reputation, tech stack, client risk, filtering settings)
- Calculation results (success rate, revenue, reputation changes)
- Random factor applied (for reproducibility)
- Special events triggered (spam traps, complaints)
- Performance metrics (calculation duration)
## Definition of Done
- [ ] Code implemented and reviewed
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Deployed to test environment
- [ ] Acceptance criteria validated
- [ ] logging
## Game Balance Risks:

1. **Values need tuning**
    - Mitigation: Parameterize all constants
    - Create easy adjustment interface
## Links
- Related US: US-3.2, US-3.5
- Design: Game Mechanics Documentation
- Technical specs: Application Development Specifications.md

## Notes
- Deterministic randomness (seeded RNG) for fairness
- Log all calculations for debugging


# Iterations

## 🔄 ITERATION 1: Basic Volume & Revenue

**Goal:** Calculate email volume and base revenue without any modifiers

### Core Mechanics:

- Sum active client volumes
- Calculate base revenue from active clients
- No reputation impact yet
- No delivery success modifiers

### Test Cases (ATDD):

gherkin

```gherkin
Feature: Basic Volume and Revenue Calculation

Scenario: Single active client
  Given ESP "SendWave" has 1 active premium_brand client (30K volume, 350 revenue)
  When resolution phase calculates
  Then total volume should be 30,000
  And base revenue should be 350

Scenario: Multiple active clients
  Given ESP "SendWave" has:
    | Client Type         | Status | Volume | Revenue |
    | premium_brand       | Active | 30K    | 350     |
    | growing_startup     | Active | 35K    | 180     |
  When resolution phase calculates
  Then total volume should be 65,000
  And base revenue should be 530

Scenario: Mix of active and paused clients
  Given ESP "SendWave" has:
    | Client Type         | Status | Volume | Revenue |
    | premium_brand       | Active | 30K    | 350     |
    | aggressive_marketer | Paused | 80K    | 350     |
    | growing_startup     | Active | 35K    | 180     |
  When resolution phase calculates
  Then total volume should be 65,000 (excludes paused)
  And base revenue should be 530 (excludes paused)

Scenario: Re-engagement campaign
  Given ESP "SendWave" has 1 active re_engagement client (50K volume, 150 revenue)
  When resolution phase calculates
  Then total volume should be 50,000
  And base revenue should be 150
```

---

## 🔄 ITERATION 2: Simple Reputation System

**Goal:** Add basic reputation tracking and fixed delivery rates

### Additional Mechanics:

- Fixed reputation zones (Excellent: 90-100, Good: 70-89, Warning: 50-69, Poor: 30-49, Blacklist: 0-29)
- Fixed delivery success by zone (Excellent: 95%, Good: 85%, Warning: 70%, Poor: 50%, Blacklist: 5%)
- Apply delivery success to revenue
- Track reputation per destination

### Test Cases (ATDD):

gherkin

```gherkin
Feature: Reputation-Based Delivery Success

Scenario: Good reputation delivery
  Given ESP "SendWave" has reputation 75 at Gmail (Good zone)
  And ESP has 1 active premium_brand client (350 base revenue)
  When resolution phase calculates
  Then delivery success should be 85%
  And actual revenue should be 297.5 (350 × 0.85)

Scenario: Poor reputation impact
  Given ESP "SendWave" has reputation 40 at Gmail (Poor zone)
  And ESP has 2 active clients (300 total base revenue)
  When resolution phase calculates
  Then delivery success should be 50%
  And actual revenue should be 150 (300 × 0.50)

Scenario: Multiple destination weighted average
  Given ESP "SendWave" has:
    | Destination | Reputation | Weight |
    | Gmail       | 80        | 50%    |
    | Outlook     | 70        | 30%    |
    | Yahoo       | 60        | 20%    |
  When resolution phase calculates weighted reputation
  Then weighted reputation should be 73
  And delivery zone should be "Good"
```

---

## 🔄 ITERATION 3: Authentication Impact

**Goal:** Implement SPF, DKIM, DMARC authentication effects

### Additional Mechanics:

- SPF: +5% delivery, +2 reputation/round
- DKIM: +8% delivery, +3 reputation/round
- DMARC: +12% delivery, +5 reputation/round (R3+ mandatory)
- Cumulative authentication bonuses
- DMARC enforcement in Round 3+

### Test Cases (ATDD):

gherkin

```gherkin
Feature: Authentication Technology Impact

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

## 🔄 ITERATION 4: Client Risk Profiles

**Goal:** Implement different client types with risk factors

### Additional Mechanics:

- Client risk levels affect reputation change. spam complaints rates are defined in config file (src/lib/config/client-profiles.ts)
- Low: +2 rep
- Medium: -1 rep
- High: -4 rep
- Volume-weighted reputation impact

### Test Cases (ATDD):

gherkin

```gherkin
Feature: Client Risk Impact

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

## 🔄 ITERATION 5: Risk Mitigation Services

**Goal:** Implement warmup and List Hygiene

### Additional Mechanics:

- warmup: +2 reputation bonus per destination for that client (applies to each destination separately), reduce volume by 50% during first round of activity only
- List Hygiene: Reduces complaint rate by 50% for that client, reduce permanently volume by
  - High risk client : 15%
  - Medium risk client : 10%
  - Low risk client : 5%
- Services apply per-client, not globally
- Track service usage per client

### Test Cases (ATDD):

gherkin

```gherkin
Feature: Risk Mitigation Services

Scenario: warmup on high-risk client
  Given ESP has aggressive_marketer client (normally -4 reputation, 80000 base volume)
  And warmup is active on this client
  When resolution phase calculates
  Then reputation impact should be -2
  And volume sent should be 40000

Scenario: List Hygiene reduces complaints
  Given ESP has aggressive_marketer client (normally 3% complaints, 80000 base volume)
  And List Hygiene is active on this client
  When resolution phase calculates
  Then complaint rate should be 1.5% (50% reduction)
  And volume sent should be 68000 (15% reduction for High risk client)

Scenario: Combined mitigation
  Given ESP has event_seasonal client with:
    - warmup (+2 reputation bonus)
    - List Hygiene (50% complaint reduction)
  When resolution phase calculates
  Then reputation impact should be +1 (instead of -1)
  And complaint rate should be 0.75% (instead of 1.5%)
  And volume sent should be 18,000 (10% reduction for Medium risk + 50% warmup reduction)

Scenario: Content Filtering reduces complaint rate
  Given ESP owns Content Filtering tech
  And ESP has aggressive_marketer client (3% base complaint rate)
  When resolution phase calculates
  Then complaint rate should be 2.1% (30% reduction)

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

## 🔄 ITERATION 6: Destination Filtering

**Goal:** Implement destination-specific filtering levels

### Additional Mechanics:

- Filtering levels: Permissive/Moderate/Strict/Maximum
- Per-ESP filtering reduces spam but blocks legitimate email
- Reputation thresholds vary by filtering level
- Filtering decisions affect delivery success

### Test Cases (ATDD):

gherkin

```gherkin
Feature: Destination Filtering System

Scenario: Strict filtering on poor reputation ESP
  Given Gmail has "Strict" filtering on "BluePost"
  And BluePost has reputation 55 at Gmail
  When resolution phase calculates for BluePost
  Then spam reduction should be 65%
  And legitimate email blocked should be 8%
  And effective delivery should be 42% (50% base - 8%)

Scenario: Permissive filtering allows more through
  Given Yahoo has "Permissive" filtering on all ESPs
  And SendWave has reputation 75 at Yahoo
  When resolution phase calculates
  Then no filtering penalties apply
  And delivery success remains at base 85%

Scenario: Maximum filtering near-total block
  Given Outlook sets "Maximum" filtering on "SpamKing"
  When resolution phase calculates
  Then spam reduction should be 85%
  And legitimate blocked should be 15%
  And delivery success caps at 35%
```

---

## 🔄 ITERATION 7: Spam Traps & Complaints

**Goal:** Implement spam trap detection and complaint handling

### Additional Mechanics:

- Spam trap probability based on risk and volume
- Spam trap hit: -5 reputation all destinations
- Complaint accumulation affects reputation

### Test Cases (ATDD):

gherkin

```gherkin
Feature: Spam Trap Detection

Scenario: High-risk client triggers spam trap
  Given ESP has aggressive_marketer client (80K volume, 5% trap risk)
  And random roll is 3% (below 5% threshold)
  When resolution phase calculates
  Then spam trap should trigger
  And reputation penalty should be -5 all destinations
  And incident log should show "Spam trap hit!"

Scenario: Complaint threshold penalty
  Given ESP accumulated 4.5% complaints this round
  When resolution phase calculates
  Then additional reputation penalty should be -3
  And warning should show "High complaint rate!"

Scenario: List Hygiene reduces spam trap risk
  Given ESP has aggressive_marketer client (5% base trap risk)
  And List Hygiene is active on this client
  When resolution phase calculates
  Then spam trap risk should be reduced by 40%
```

---

## 🔄 ITERATION 8: Incident Cards

**Goal:** Implement round-specific incident effects

### Additional Mechanics:

- Botnet Attack (R3): -5 reputation all ESPs
- Black Friday (R4): +50% volume for event_seasonal
- DMARC Mandate (R2): Announcement only
- Industry Recognition: +10 reputation to leader
- Apply incident effects before resolution

### Test Cases (ATDD):

gherkin

```gherkin
Feature: Incident Card Effects

Scenario: Botnet attack affects all ESPs
  Given round 3 incident is "Botnet Attack"
  And SendWave has reputation 75 at Gmail
  When resolution phase applies incident
  Then SendWave reputation at Gmail should be 70
  And all other ESPs should also lose 5 reputation

Scenario: Black Friday volume boost
  Given round 4 incident is "Black Friday Rush"
  And ESP has event_seasonal client with 40K base volume
  When resolution phase calculates
  Then event_seasonal client volume should be 60K
  And revenue should scale proportionally

Scenario: Industry recognition to leader
  Given incident is "Industry Recognition"
  And SendWave has highest weighted reputation (85)
  When resolution phase applies incident
  Then SendWave gains +10 reputation bonus
  And other ESPs gain nothing

Scenario: Black Friday does not affect re-engagement
  Given round 4 incident is "Black Friday Rush"
  And ESP has re_engagement client with 50K base volume
  When resolution phase calculates
  Then re_engagement volume should remain 50K (no bonus)

# Note: Black Friday only boosts event_seasonal clients, not re_engagement
```

---

## 🔄 ITERATION 9: Inter-Destination Coordination

**Goal:** Implement destination collaboration mechanics

### Additional Mechanics:

- Shared intelligence improves filtering effectiveness
- Coordinated responses to problem ESPs
- Budget sharing between coordinating destinations
- Effectiveness bonuses when coordinating

### Test Cases (ATDD):

gherkin

```gherkin
Feature: Destination Coordination

Scenario: Gmail-Outlook coordination
  Given Gmail and Outlook have active coordination
  And they both filter "SpamKing" ESP
  When resolution phase calculates
  Then filtering effectiveness increases 15%
  And both share intelligence about SpamKing
  And shared budget pool is accessible

Scenario: Three-way coordination cascade
  Given all three destinations coordinate
  And one identifies spam pattern from "BadESP"
  When resolution phase shares intelligence
  Then all three immediately adjust filtering
  And BadESP faces coordinated response
```

---

## 🔄 ITERATION 10: Complete Integration

**Goal:** Full system with all mechanics interacting

### Additional Mechanics:

- All previous systems working together
- Cascade effects between systems
- Complex decision outcomes
- Full scoring calculation

### Test Cases (ATDD):

gherkin

```gherkin
Feature: Complete Resolution System

Scenario: Complex ESP resolution
  Given ESP "SendWave" in Round 3 with:
    - Reputations: Gmail 72, Outlook 68, Yahoo 70
    - Clients: 1 premium_brand (active), 1 aggressive_marketer (active), 1 growing_startup (paused)
    - Tech: SPF, DKIM, DMARC, Content Filtering
    - Services: warmup on aggressive_marketer
    - Incidents: Botnet Attack (-5 reputation)
  And Gmail has Moderate filtering on SendWave
  When complete resolution phase runs
  Then calculate:
    1. Base volume: 70K (premium_brand 30K + aggressive_marketer 40K with warmup)
    2. Incident impact: Rep becomes Gmail 67, Outlook 63, Yahoo 65
    3. Client reputation: +2 (premium_brand) -2 (aggressive_marketer warmed) = 0
    4. Tech reputation: +10 (SPF+DKIM+DMARC)
    5. Final reputation: Gmail 77, Outlook 73, Yahoo 75
    6. Weighted average: 75.2 (Good zone)
    7. Delivery base: 85%
    8. Auth bonus: +25%
    9. Filtering penalty: -3% (Moderate on Good)
    10. Final delivery: 100% (capped)
    11. Revenue: 700 (350 + 350) × 1.0
    12. Complaints: 1.9% weighted
    13. Spam trap check: Pass 

Scenario: Cascade failure scenario
  Given ESP "RiskyBiz" has:
    - All aggressive_marketer clients
    - No authentication
    - Reputation 62 at Gmail
    - Round 3 (DMARC required)
  When resolution runs
  Then DMARC penalty: 80% rejection
  Then Reputation drops to 50 (cascade zone)
  Then Triggers maximum filtering
  Then Revenue collapses to near zero
  Then Potential disqualification warning
```



## 🧪 Test Data Sets for Each Iteration

### Minimal Test Set (Iterations 1-3):

yaml

```yaml
ESP_minimal:
  - name: "TestESP"
    reputation: { gmail: 75, outlook: 75, yahoo: 75 }
    clients: 
      - { type: "premium_brand", status: "active", volume: 30000, revenue: 350 }
    tech: ["SPF"]

Expected_Output:
  volume: 30000
  delivery_success: 0.90  # Good zone (85%) + SPF (5%)
  revenue: 315  # 350 × 0.90
```

### Standard Test Set (Iterations 4-7):

yaml

```yaml
ESP_standard:
  - name: "TestESP"
    reputation: { gmail: 70, outlook: 70, yahoo: 70 }
    clients:
      - { type: "premium_brand", status: "active", volume: 30000, revenue: 350 }
      - { type: "aggressive_marketer", status: "active", volume: 80000, revenue: 320, 
          services: ["list_hygiene"] }
    tech: ["SPF", "DKIM", "Content_Filtering"]
    
Destination_Settings:
  gmail: { filtering_level: "Moderate", filtering_target: "TestESP" }

Expected_Output:
  volume: 110000
  reputation_change: +6  # Tech(+5) + premium_brand(+2) + Aggressive_warmed(-1)
  complaint_rate: 0.023  # Weighted average
  spam_trap_risk: 0.015  # Reduced by List Hygiene
```

### Complex Test Set (Iterations 8-10):

yaml

```yaml
Round: 3
Incident: "Botnet_Attack"

ESP_complex:
  - name: "TestESP"
    # ... all previous data plus ...
    
Full_State:
  all_esps: ["TestESP", "Competitor1", "Competitor2", "Competitor3", "Competitor4"]
  all_destinations: ["Gmail", "Outlook", "Yahoo"]
  coordination: 
    - { destinations: ["Gmail", "Outlook"], active: true }
    
Expected_Full_Resolution:
  # Complete calculation chain with all mechanics
```

---

