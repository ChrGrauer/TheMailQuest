# Incident Cards Specification

## Overview

Incident cards inject realism and unpredictability into Mail Quest. One card is triggered per round, either randomly selected from the appropriate pool or manually triggered by the facilitator. These cards simulate real-world email industry events and create educational moments while adding strategic depth to gameplay.

## Card Structure

Each incident card contains:
- **ID**: Unique identifier
- **Name**: Display title
- **Round**: Which round(s) this card can appear in
- **Category**: Type of incident (Regulatory, Market, Security, Industry, Technical)
- **Rarity**: Common, Uncommon, Rare
- **Description**: Narrative text shown to players
- **Educational Note**: Learning objective
- **Duration**: Immediate, This Round, Next Round, or Permanent
- **Effects**: Specific game impacts
- **Visual Theme**: UI styling hints

---

## Round 1 Incidents (Learning Phase)

### INC-001: Regulation Announcement
- **Round**: 1
- **Category**: Regulatory
- **Rarity**: Common
- **Description**: "The email industry association announces that DMARC authentication will become mandatory starting Round 3. Major destinations will require full authentication or face severe delivery penalties."
- **Educational Note**: Teaches the importance of staying ahead of regulatory changes
- **Duration**: Permanent (takes effect Round 3)
- **Effects**:
  ```yaml
  esp:
    - notification: "DMARC will be mandatory from Round 3"
    - suggestion: "Plan your technical investments now"
  destination:
    - no_immediate_effect: true
  game_state:
    - add_rule: "dmarc_mandatory_round_3"
  ```
- **Visual Theme**: Official document, regulatory seal

### INC-002: Industry Conference
- **Round**: 1
- **Category**: Market
- **Rarity**: Common
- **Description**: "At DeliverCon 2025, reputation scores are publicly discussed. The industry now knows who's leading in sender reputation!"
- **Educational Note**: Reputation is public and affects competitive positioning
- **Duration**: Immediate
- **Effects**:
  ```yaml
  esp:
    - reveal_top_2_reputations: true
    - psychological_pressure: "increased"
  destination:
    - can_see_all_esp_reputations: true
  ui:
    - display_reputation_leaderboard: 30_seconds
  ```
- **Visual Theme**: Conference badge, presentation screen

### INC-003: Venture Capital Boost
- **Round**: 1
- **Category**: Market
- **Rarity**: Uncommon
- **Description**: "Breaking: [Random ESP] secures Series A funding! Fresh capital injection of 200 credits to expand operations."
- **Educational Note**: Market dynamics and timing can provide competitive advantages
- **Duration**: Immediate
- **Effects**:
  ```yaml
  esp:
    - random_team_selection: true
    - add_credits: 200
    - announcement: "Series A Funding Secured!"
  destination:
    - no_effect: true
  ```
- **Visual Theme**: Money/investment imagery, celebration

### INC-004: Welcome Bonus Program
- **Round**: 1
- **Category**: Industry
- **Rarity**: Uncommon
- **Description**: "Email destinations announce a 'New Sender Incentive Program' - ESPs with no authentication get a one-time 100 credit grant to implement security."
- **Educational Note**: Industry sometimes provides support for security improvements
- **Duration**: This Round
- **Effects**:
  ```yaml
  esp:
    - condition: "no_authentication"
    - add_credits: 100
    - restriction: "must_purchase_auth_this_round"
  destination:
    - reduce_budget: 50
  ```
- **Visual Theme**: Gift box, incentive badge

---

## Round 2 Incidents (Escalation)

### INC-005: Botnet Breach
- **Round**: 2
- **Category**: Security
- **Rarity**: Uncommon
- **Description**: "CRITICAL: [Random ESP]'s infrastructure has been compromised by a botnet! Spam is being sent from their servers. Immediate remediation required!"
- **Educational Note**: Security incidents are costly and damage reputation instantly
- **Duration**: Immediate
- **Effects**:
  ```yaml
  esp:
    - random_team_selection: true
    - reputation_loss: 15 # all destinations
    - mandatory_payment: 250 # cleanup cost
    - status: "compromised"
  destination:
    - alert: "Spam wave detected from [ESP]"
    - can_emergency_filter: true
  ```
- **Visual Theme**: Red alert, security breach warning

### INC-006: Industry Scandal
- **Round**: 2
- **Category**: Industry
- **Rarity**: Common
- **Description**: "Major ESP caught selling user data! Public trust in email providers plummets. All ESPs suffer reputation damage. Destinations receive emergency funding for enhanced protection."
- **Educational Note**: Industry reputation affects everyone - one bad actor hurts all
- **Duration**: Immediate
- **Effects**:
  ```yaml
  esp:
    - all_teams: true
    - reputation_loss: 5 # all destinations
  destination:
    - add_budget: 100
    - public_trust: "decreased"
  ```
- **Visual Theme**: Newspaper headline, scandal imagery

### INC-007: Destination Alliance
- **Round**: 2
- **Category**: Market
- **Rarity**: Rare
- **Description**: "Yahoo and Outlook announce a strategic partnership! They will share filtering policies this round to combat increasing spam."
- **Educational Note**: Destinations sometimes coordinate to improve efficiency
- **Duration**: This Round
- **Effects**:
  ```yaml
  esp:
    - notification: "Yahoo and Outlook using unified filtering"
  destination:
    - yahoo_outlook_shared_policy: true
    - coordination_cost: 0 # free this round
  ```
- **Visual Theme**: Handshake, partnership announcement

### INC-008: Authentication Emergency
- **Round**: 2
- **Category**: Security
- **Rarity**: Common
- **Description**: "Massive spoofing attack hits the industry! Destinations offer half-price authentication validators. ESPs without DKIM suffer immediate reputation loss."
- **Educational Note**: Authentication protects against spoofing and is critical infrastructure
- **Duration**: This Round
- **Effects**:
  ```yaml
  esp:
    - condition: "no_dkim"
    - reputation_loss: 10
  destination:
    - auth_validator_discount: 50 # percent
  ```
- **Visual Theme**: Shield breaking, security alert

### INC-009: Seasonal Traffic Surge
- **Round**: 2
- **Category**: Market
- **Rarity**: Uncommon
- **Description**: "Valentine's Day approaches! All e-commerce clients increase volume by 50% this round. Revenue opportunities abound, but infrastructure will be tested."
- **Educational Note**: Seasonal events create volume spikes that test infrastructure
- **Duration**: This Round
- **Effects**:
  ```yaml
  esp:
    - client_volume_multiplier: 1.5
    - only_affects: ["e-commerce", "retail", "event"]
  destination:
    - processing_load: "increased"
    - can_throttle_free: true
  ```
- **Visual Theme**: Calendar, holiday imagery

---

## Round 3 Incidents (High Stakes)

### INC-010: DMARC Enforcement
- **Round**: 3
- **Category**: Regulatory
- **Rarity**: Common (Guaranteed if not triggered earlier)
- **Description**: "As announced, DMARC is now MANDATORY. All destinations will reject 80% of emails from non-DMARC senders. This is not a drill."
- **Educational Note**: Regulatory compliance is non-negotiable in email delivery
- **Duration**: Permanent
- **Effects**:
  ```yaml
  esp:
    - condition: "no_dmarc"
    - delivery_penalty: 80 # percent rejection
  destination:
    - free_auth_validation: true
    - must_enforce: true
  ```
- **Visual Theme**: Gavel, enforcement stamp

### INC-011: Viral Campaign
- **Round**: 3
- **Category**: Market
- **Rarity**: Rare
- **Description**: "[Random ESP]'s client goes viral on social media! Email volume increases 10x. Without proper warming, this could be disaster or triumph!"
- **Educational Note**: Viral success requires infrastructure preparation
- **Duration**: This Round
- **Effects**:
  ```yaml
  esp:
    - random_team_selection: true
    - random_client_volume: "x10"
    - if_has_warming:
      - revenue_bonus: 500
      - reputation_gain: 10
    - else:
      - reputation_loss: 20
      - spam_trap_probability: 75
  destination:
    - alert: "Massive volume spike detected"
  ```
- **Visual Theme**: Viral/explosive growth imagery

### INC-012: Cartel Investigation
- **Round**: 3
- **Category**: Security
- **Rarity**: Uncommon
- **Description**: "International authorities expose sophisticated spam cartel! Destinations get discounted investigation tools. ESPs with high-risk clients face immediate scrutiny."
- **Educational Note**: Association with bad actors is dangerous for reputation
- **Duration**: This Round
- **Effects**:
  ```yaml
  esp:
    - condition: "has_high_risk_clients"
    - reputation_loss: 5
    - under_investigation: true
  destination:
    - investigation_cost: 50 # instead of 100
    - can_deep_scan_all: true
  ```
- **Visual Theme**: Magnifying glass, investigation

### INC-013: Best Practices Publication
- **Round**: 3
- **Category**: Industry
- **Rarity**: Common
- **Description**: "The Email Authority publishes new best practices guide. ESPs can now purchase official certification. Certified senders get priority delivery."
- **Educational Note**: Industry certifications provide competitive advantages
- **Duration**: Permanent
- **Effects**:
  ```yaml
  esp:
    - can_purchase: "certification"
    - cost: 300
    - benefit_reputation: 10
    - benefit_delivery: 15 # percent
  destination:
    - prioritize_certified: true
  ```
- **Visual Theme**: Certificate, gold seal

### INC-014: Infrastructure Subsidy
- **Round**: 3
- **Category**: Market
- **Rarity**: Uncommon
- **Description**: "Government announces cybersecurity grants! All technical purchases are 30% off this round to encourage security adoption."
- **Educational Note**: External incentives can accelerate security adoption
- **Duration**: This Round
- **Effects**:
  ```yaml
  esp:
    - tech_discount: 30 # percent off all tech
  destination:
    - tool_discount: 30 # percent off all tools
  ```
- **Visual Theme**: Government building, subsidy announcement

---

## Round 4 Incidents (Endgame)

### INC-015: Black Friday Chaos
- **Round**: 4
- **Category**: Market
- **Rarity**: Common
- **Description**: "BLACK FRIDAY ARRIVES! All clients double their sending volume. Maximum revenue potential, but deliverability will be tested to the limit!"
- **Educational Note**: Peak seasons create extreme pressure on infrastructure
- **Duration**: This Round
- **Effects**:
  ```yaml
  esp:
    - all_client_volume: "x2"
    - revenue_multiplier: 2
    - reputation_risk: "doubled"
  destination:
    - budget_strain: true
    - emergency_filtering_free: true
  ```
- **Visual Theme**: Shopping cart, black friday banners

### INC-016: Legal Reckoning
- **Round**: 4
- **Category**: Regulatory
- **Rarity**: Uncommon
- **Description**: "CLASS ACTION LAWSUIT! The ESP with lowest reputation and highest revenue focus faces legal action for spam violations. 400 credit penalty and operations frozen!"
- **Educational Note**: Legal consequences for poor deliverability are real and severe
- **Duration**: Immediate
- **Effects**:
  ```yaml
  esp:
    - selection: "lowest_reputation_highest_revenue_ratio"
    - credit_loss: 400
    - status: "frozen"
    - skip_next_action: true
  destination:
    - industry_protection_bonus: 10
  ```
- **Visual Theme**: Courthouse, legal documents

### INC-017: Acquisition Offer
- **Round**: 4
- **Category**: Market
- **Rarity**: Rare
- **Description**: "BREAKING: Major tech company offers to acquire the highest-reputation ESP! Cash out now for 800 credits and bonus points, or continue competing?"
- **Educational Note**: High reputation has real monetary value in the market
- **Duration**: Immediate (decision required)
- **Effects**:
  ```yaml
  esp:
    - selection: "highest_reputation"
    - choice:
      - accept:
        - gain_credits: 800
        - bonus_points: 20
        - exit_game: true
      - decline:
        - continue_playing: true
        - reputation_bonus: 5 # for confidence
  ```
- **Visual Theme**: Money bags, acquisition deal

### INC-018: Zero-Day Crisis
- **Round**: 4
- **Category**: Technical
- **Rarity**: Common
- **Description**: "CRITICAL VULNERABILITY in email authentication discovered! All teams must patch immediately or face severe reputation damage. Patch cost: 150 credits."
- **Educational Note**: Security maintenance is an ongoing operational cost
- **Duration**: Immediate
- **Effects**:
  ```yaml
  esp:
    - mandatory_choice:
      - patch:
        - cost: 150
        - maintain_reputation: true
      - ignore:
        - reputation_loss: 15
        - vulnerability_flag: true
  destination:
    - free_monitoring: true
  ```
- **Visual Theme**: Bug icon, critical alert

### INC-019: Industry Consolidation
- **Round**: 4
- **Category**: Market
- **Rarity**: Uncommon
- **Description**: "Major market shift! The two lowest-reputation ESPs must merge or exit. Combined team shares resources but also problems."
- **Educational Note**: Market consolidation happens when businesses struggle
- **Duration**: Immediate
- **Effects**:
  ```yaml
  esp:
    - selection: "two_lowest_reputation"
    - forced_merge:
      - combine_credits: true
      - combine_clients: true
      - average_reputation: true
      - shared_control: true
  ```
- **Visual Theme**: Merger arrows, consolidation

### INC-020: Reputation Reset Opportunity
- **Round**: 4
- **Category**: Industry
- **Rarity**: Rare
- **Description**: "Industry amnesty program announced! One ESP can pay 500 credits to reset their reputation to 70 across all destinations. Fresh start for the final push!"
- **Educational Note**: Sometimes paying for reputation recovery is a valid strategy
- **Duration**: Immediate
- **Effects**:
  ```yaml
  esp:
    - optional_purchase: "reputation_reset"
    - cost: 500
    - effect: "set_all_reputation_70"
  destination:
    - must_honor_reset: true
  ```
- **Visual Theme**: Reset button, fresh start

---

## Implementation Notes

### Selection Rules
- **Random Selection**: Use cryptographically secure random selection
- **Conditional Selection**: Check conditions before adding to available pool
- **Guaranteed Cards**: Some cards (like DMARC Enforcement) must appear if not triggered earlier
- **Rarity Weighting**: 
  - Common: 60% chance
  - Uncommon: 30% chance
  - Rare: 10% chance

### Timing
- Cards trigger at the start of each round's Planning Phase
- Effects apply immediately unless duration specifies otherwise
- Players have 30 seconds to read and understand the card
- Facilitator can pause timer during card reveal if needed

### UI Requirements
- Full-screen card reveal with animation
- Sound effect for dramatic impact
- Card remains accessible in UI for reference
- Active effects shown in status panel
- Historical incident log available

### Facilitator Controls
- Can manually select specific card instead of random
- Can skip card for a round if needed
- Can re-roll if random selection is inappropriate
- Can modify card effects for difficulty adjustment

### Educational Integration
- Each card links to real-world equivalent
- Debrief should reference triggered incidents
- Cards create teachable moments during gameplay
- Effects demonstrate industry cause-and-effect

---

## Future Expansions

### Additional Card Ideas (Post-MVP)
- **Data Breach**: ESP must notify all clients, reputation impact
- **New Destination**: Startup email provider enters market
- **AI Filter Evolution**: Machine learning gets 50% better
- **Cryptocurrency Spam Wave**: Specific filtering challenge
- **GDPR Violation**: European privacy law impacts
- **Cloud Outage**: Technical infrastructure temporarily unavailable
- **Influencer Partnership**: Marketing opportunity for highest reputation
- **Spam Trap Amnesty**: One-time clearing of spam trap hits
- **Competitive Sabotage**: ESPs can pay to damage competitors
- **Innovation Grant**: Technical upgrade discounts for lowest budget team

### Difficulty Modes
- **Easy**: Only Common cards, reduced penalties
- **Normal**: Standard mix as specified
- **Hard**: More Rare cards, increased penalties
- **Chaos**: Two cards per round, all effects amplified

### Card Customization
- Facilitator can create custom cards for specific training
- Industry-specific card packs (e.g., B2B focus, B2C focus)
- Regional variations (GDPR for Europe, CAN-SPAM for US)
- Company-specific scenarios relevant to Brevo operations