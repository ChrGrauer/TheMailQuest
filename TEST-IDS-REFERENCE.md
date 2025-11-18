# Test IDs Reference

This document catalogs all `data-testid` attributes used across the frontend for E2E and integration testing.

## Table of Contents
- [Shared Components](#shared-components)
- [ESP Dashboard](#esp-dashboard)
- [Destination Dashboard](#destination-dashboard)
- [Lobby](#lobby)
- [Facilitator Dashboard](#facilitator-dashboard)
- [Naming Conventions](#naming-conventions)

---

## Shared Components

### DashboardHeader
**Location**: `src/lib/components/shared/DashboardHeader.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `game-header` | `<header>` | Main header container |
| `destination-icon` / `team-icon` | Icon | Theme-based icon (blue=destination, emerald=ESP) |
| `destination-name` / `team-name` | Text | Entity name display |
| `budget-current` | Text | Current budget/credits value |
| `budget-forecast` | Text | Projected budget after round |
| `round-indicator` | `<div>` | Round number display |
| `timer-display` / `game-timer` | Text | Timer countdown (theme-dependent name) |
| `timer-warning` | `<div>` | Timer warning overlay (< 1 minute remaining) |

### FilteringSliderItem
**Location**: `src/lib/components/shared/FilteringSliderItem.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `filtering-item-{espName}` | `<div>` | Container (espName lowercase, no spaces) |
| `filtering-esp-name` | `<div>` | ESP name display |
| `filtering-esp-volume` | `<span>` | Email volume per round |
| `filtering-esp-reputation` | `<span>` | Current reputation value |
| `filtering-esp-satisfaction` | `<span>` | Satisfaction percentage |
| `filtering-esp-spam-rate` | `<span>` | Spam rate percentage |
| `filtering-current-level` | `<div>` | Current filtering level badge |
| `filtering-slider` | `<input type="range">` | Filtering level slider control |
| `filtering-impact-title` | `<div>` | Impact section header |
| `filtering-spam-reduction` | `<div>` | Spam reduction percentage |
| `filtering-false-positives` | `<div>` | False positive percentage |

### StatusBadge
**Location**: `src/lib/components/shared/StatusBadge.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `{testId}` (prop) | `<div>` | Accepts custom test ID via props |

**Common usage**:
- `client-status-badge-{index}` - Client status in portfolio
- `tech-icon-checkmark` / `tech-icon-cross` - Technical upgrade status

---

## ESP Dashboard

### Main Page
**Location**: `src/routes/game/[roomCode]/esp/[teamName]/+page.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `esp-dashboard` | `<div>` | Main dashboard container |
| `error-banner` | `<div>` | Top error notification banner |
| `loading-reputation` | `<div>` | Loading state for reputation data |
| `error-message` | `<p>` | Error message text |
| `ws-status` | `<div>` | WebSocket connection status indicator |
| `phase-transition-message` | `<div>` | Phase change notification |

### ClientPortfolio
**Location**: `src/lib/components/esp-dashboard/ClientPortfolio.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `portfolio-header` | `<div>` | Portfolio section header |
| `pending-decisions-badge` | `<div>` | Badge showing count of pending onboarding decisions |
| `client-portfolio` | `<div>` | Portfolio container |
| `portfolio-empty-state` | `<div>` | Message when no clients acquired |
| `cta-marketplace` | `<button>` | "Browse Marketplace" CTA button |
| `client-card-{index}` | `<div>` | Individual client card wrapper |
| `client-status-badge-{index}` | StatusBadge | Client status (active/paused/suspended) |

### ClientCard
**Location**: `src/lib/components/esp-dashboard/ClientCard.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `client-card` | `<div>` | Card container |
| `client-name` | `<h3>` | Client company name |
| `client-risk` | StatusBadge | Risk level badge (low/medium/high) |
| `client-revenue` | `<span>` | Revenue per round value |
| `client-volume` | `<span>` | Email volume per round |
| `client-cost` | `<span>` | Acquisition/onboarding cost |
| `acquire-button` | `<button>` | Acquire client button |

### PortfolioClientCard
**Location**: `src/lib/components/esp-dashboard/PortfolioClientCard.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `client-card-{index}` | `<div>` | Portfolio card container |
| `locked-indicator` | `<div>` | Lock icon when decisions are locked |
| `toggle-active-btn` | `<button>` | Set client to Active status |
| `toggle-paused-btn` | `<button>` | Set client to Paused status |
| `suspension-message` | `<div>` | Suspension warning/message |
| `onboarding-section` | `<div>` | Onboarding practices section |
| `warm-up-checkbox` | `<input>` | IP/Domain Warm-up checkbox |
| `list-hygiene-checkbox` | `<input>` | List Hygiene checkbox |
| `risk-warning` | `<div>` | Risk warning for no onboarding practices |
| `permanent-attributes` | `<div>` | Client stats section (revenue, volume, etc.) |

### ClientManagementModal
**Location**: `src/lib/components/esp-dashboard/ClientManagementModal.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `modal-overlay` | `<div>` | Modal backdrop |
| `client-management-modal` | `<div>` | Modal container |
| `modal-close-btn` | `<button>` | Close button |
| `view-only-banner` | `<div>` | View-only mode notification |
| `budget-banner` | `<div>` | Budget preview section |
| `budget-preview` | `<div>` | Current budget value |
| `onboarding-costs` | `<div>` | Pending onboarding costs |
| `budget-forecast` | `<div>` | Projected budget after costs |
| `revenue-preview` | `<div>` | Expected revenue from active clients |
| `error-banner` | `<div>` | Error message display |

### ClientMarketplaceModal
**Location**: `src/lib/components/esp-dashboard/ClientMarketplaceModal.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `marketplace-modal` | `<div>` | Modal container |
| `close-modal` | `<button>` | Close button |
| `view-only-banner` | `<div>` | View-only mode notification |
| `success-message` | `<div>` | Success notification after acquisition |
| `error-banner` | `<div>` | Error message display |
| `loading-spinner` | `<div>` | Loading state indicator |

### ReputationGauges
**Location**: `src/lib/components/esp-dashboard/ReputationGauges.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `reputation-{destName}` | `<div>` | Reputation gauge for destination (lowercase name) |
| `destination-weight-{destName}` | `<div>` | Weight percentage for destination |
| `status-icon-{status}` | Icon | Status icon (excellent/good/warning/critical) |
| `reputation-{destName}-warning` | `<div>` | Warning message for low reputation |
| `reputation-{destName}-alert` | `<div>` | Critical alert for very low reputation |

### TechnicalInfrastructure
**Location**: `src/lib/components/esp-dashboard/TechnicalInfrastructure.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `technical-infrastructure` | `<div>` | Container for technical upgrades section |
| `tech-upgrade-available` | `<div>` | Badge showing available upgrades count |
| `tech-item-{id}` | `<div>` | Individual tech upgrade item (e.g., `tech-item-dmarc`) |
| `tech-icon-checkmark` | Icon | Checkmark for owned upgrades |
| `tech-icon-cross` | Icon | X for not-owned upgrades |
| `tech-mandatory-warning` | `<div>` | Warning for mandatory upgrade deadlines |

### UpgradeCard
**Location**: `src/lib/components/esp-dashboard/UpgradeCard.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `upgrade-card-{id}` | `<div>` | Card container (e.g., `upgrade-card-dmarc`) |
| `owned-checkmark` | Icon | Checkmark for owned upgrades |
| `lock-icon` | Icon | Lock icon for unavailable upgrades |
| `upgrade-name` | `<h3>` | Upgrade name/title |
| `upgrade-category` | Badge | Upgrade category (technical/capacity) |
| `upgrade-status` | `<div>` | Status text (available/owned/locked) |
| `mandatory-warning` | `<div>` | Mandatory deadline warning |
| `upgrade-description` | `<p>` | Upgrade description text |
| `upgrade-cost` | `<div>` | Purchase cost |
| `purchase-button` | `<button>` | Buy upgrade button |

### BudgetDisplay
**Location**: `src/lib/components/esp-dashboard/BudgetDisplay.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `budget-current` | `<div>` | Current budget value (large display) |
| `budget-forecast` | `<div>` | Projected budget (smaller, grayed) |

### QuickActions
**Location**: `src/lib/components/esp-dashboard/QuickActions.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `open-client-marketplace` | `<button>` | Open client marketplace modal |
| `open-tech-shop` | `<button>` | Open technical shop modal |
| `open-portfolio` | `<button>` | Open client portfolio management modal |
| `button-icon` | `<div>` | Icon container for action buttons |

### LockInButton
**Location**: `src/lib/components/esp-dashboard/LockInButton.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `lock-in-confirmation` | `<div>` | Confirmation message after locking in decisions |
| `waiting-message` | `<div>` | Message while waiting for other players |
| `remaining-players-count` | `<p>` | Count of players who haven't locked in |
| `auto-lock-message` | `<div>` | Auto-lock countdown message |
| `budget-warning` | `<div>` | Warning when budget will go negative |
| `lock-in-button` | `<button>` | Main lock-in decisions button |

### TechnicalShopModal
**Location**: `src/lib/components/esp-dashboard/TechnicalShopModal.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `tech-shop-modal` | `<div>` | Modal container |
| `close-modal` | `<button>` | Close button |
| `view-only-banner` | `<div>` | View-only mode notification |
| `success-message` | `<div>` | Success notification after purchase |
| `error-banner` | `<div>` | Error message display |
| `loading-spinner` | `<div>` | Loading state indicator |

### ClientFilters
**Location**: `src/lib/components/esp-dashboard/ClientFilters.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `filter-risk-{risk}` | `<button>` | Risk filter button (e.g., `filter-risk-low`) |
| `filter-revenue` | `<input>` | Revenue range slider |
| `client-count` | `<span>` | Count of filtered clients |

---

## Destination Dashboard

### Main Page
**Location**: `src/routes/game/[roomCode]/destination/[destName]/+page.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `error-banner` | `<div>` | Top error notification banner |
| `ws-status` | `<div>` | WebSocket connection status indicator |
| `dashboard-layout` | `<div>` | Main grid layout container |
| `phase-transition-message` | `<div>` | Phase change notification |

### DestinationQuickActions
**Location**: `src/lib/components/destination-dashboard/DestinationQuickActions.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `coordination-panel-button` | `<button>` | Open coordination panel |
| `tech-shop-button` | `<button>` | Open technical shop/upgrades |
| `filtering-controls-button` | `<button>` | Open filtering controls modal |

### FilteringControlsModal
**Location**: `src/lib/components/destination-dashboard/FilteringControlsModal.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `modal-backdrop` | `<div>` | Modal backdrop overlay |
| `filtering-controls-modal` | `<div>` | Modal container |
| `filtering-modal-title` | `<h2>` | Modal title |
| `filtering-modal-close` | `<button>` | Close button |
| `view-only-banner` | `<div>` | View-only mode notification |
| `filtering-error-banner` | `<div>` | Error message banner |
| `filtering-error-retry` | `<button>` | Retry button for errors |

### ESPStatisticsOverview
**Location**: `src/lib/components/destination-dashboard/ESPStatisticsOverview.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `esp-statistics-overview` | `<div>` | Container for ESP statistics section |
| `esp-card-{espName}` | `<div>` | Individual ESP card (espName lowercase) |
| `esp-icon` | `<div>` | ESP icon container |
| `esp-team-code` | `<span>` | ESP team code display |
| `esp-team-name` | `<div>` | ESP team name |
| `esp-clients-count` | `<div>` | Count of active clients |
| `esp-volume` | `<div>` | Total email volume |
| `status-icon-{status}` | Icon | Status icon for reputation/satisfaction/spam (excellent/good/warning/critical) |
| `esp-reputation` | `<div>` | Reputation value |
| `esp-satisfaction` | `<div>` | Satisfaction percentage |
| `esp-spam-rate` | `<div>` | Spam rate percentage |

**Note**: The `status-icon-{status}` pattern is used with dynamic status values from `repStatus.status`, `satStatus.status`, and `spamStatus.status` in the implementation.

### CoordinationStatus
**Location**: `src/lib/components/destination-dashboard/CoordinationStatus.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `coordination-status` | `<div>` | Container for coordination status section |
| `collaborations-count` | `<div>` | Count of active collaborations |

### DestinationToolCard
**Location**: `src/lib/components/destination-dashboard/DestinationToolCard.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `tool-name` | `<h3>` | Tool name/title |
| `tool-category` | Badge | Tool category (technical/monitoring/etc.) |
| `tool-scope` | Badge | Tool scope (global/esp-specific) |
| `tool-status` | `<div>` | Status display |
| `unavailable-reason` | `<div>` | Reason why tool is unavailable |
| `tool-description` | `<p>` | Tool description text |
| `tool-effect` | `<div>` | Tool effect description |
| `requirement-message` | `<div>` | Requirements to unlock tool |
| `tool-cost` | `<div>` | Purchase cost |
| `purchase-button` | `<button>` | Buy tool button |

### TechnicalShopModal (Destination)
**Location**: `src/lib/components/destination-dashboard/TechnicalShopModal.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `tech-shop-modal` | `<div>` | Modal container |
| `budget-display` | `<div>` | Current budget display in header |
| `close-tech-shop` | `<button>` | Close button |
| `view-only-banner` | `<div>` | View-only mode notification |
| `success-message` | `<div>` | Success notification after purchase |
| `error-message` | `<div>` | Error message display |
| `loading-spinner` | `<div>` | Loading state indicator |
| `announcement-dialog` | `<div>` | Dialog to choose announcement preference |
| `option-announce` | `<button>` | Option to announce purchase to ESPs |
| `option-secret` | `<button>` | Option to keep purchase secret |
| `confirm-announcement-button` | `<button>` | Confirm announcement choice |
| `confirmation-dialog` | `<div>` | Final purchase confirmation dialog |
| `confirmation-message` | `<p>` | Confirmation message text |
| `confirm-purchase-button` | `<button>` | Final confirm purchase button |

### TechnicalInfrastructure (Destination)
**Location**: `src/lib/components/destination-dashboard/TechnicalInfrastructure.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `technical-infrastructure` | `<div>` | Container for technical tools section |
| `tech-item-{id}` | `<div>` | Individual tech tool item (e.g., `tech-item-dmarc-validator`) |
| `tech-icon-{id}` | Icon | Icon for specific tool |
| `tech-status-{id}` | `<div>` | Status for specific tool |

---

## Lobby

### Main Lobby Page
**Location**: `src/routes/lobby/[roomCode]/+page.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `room-code` | Text | Room code display |

### TeamSlotSelector
**Location**: `src/lib/components/lobby/TeamSlotSelector.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `esp-team-slot` | `<button>` | ESP team slot button |
| `destination-slot` | `<button>` | Destination slot button |

### TeamSlotList
**Location**: `src/lib/components/lobby/TeamSlotList.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `{testId}` (prop) | Varies | Accepts custom test ID via props |

---

## Facilitator Dashboard

### Main Page
**Location**: `src/routes/game/[roomCode]/facilitator/+page.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `game-timer` | `<div>` | Round timer display |
| `current-phase` | Text | Current game phase display |
| `start-next-round-button` | `<button>` | Button to start next round (consequences phase only, rounds 1-3) |
| `error-message` | `<div>` | Error message display |

---

## Naming Conventions

### Patterns
1. **Entity-specific IDs with dynamic names**:
   - `filtering-item-{espName}` - ESP name lowercase, spaces removed
   - `reputation-{destName}` - Destination name lowercase
   - `tech-item-{id}` - Technical upgrade/tool ID
   - `tech-icon-{id}` - Tool-specific icons
   - `tech-status-{id}` - Tool-specific status
   - `upgrade-card-{id}` - Upgrade card ID
   - `esp-card-{espName}` - ESP card (espName lowercase)
   - `filter-risk-{risk}` - Risk filter button (risk lowercase)

2. **Indexed items in lists**:
   - `client-card-{index}` - Sequential client cards
   - `client-status-badge-{index}` - Corresponding status badges

3. **Scoped component prefixes**:
   - `filtering-*` - Filtering slider items and controls
   - `tech-*` - Technical infrastructure
   - `upgrade-*` - Upgrade cards
   - `client-*` - Client-related elements
   - `budget-*` - Budget displays
   - `reputation-*` - Reputation gauges
   - `esp-*` - ESP-related statistics
   - `tool-*` - Destination tools

4. **State indicators**:
   - `error-banner` - Error notifications
   - `error-message` - Specific error text
   - `loading-*` - Loading states
   - `ws-status` - WebSocket connection status
   - `phase-transition-message` - Phase change notifications

5. **Common actions**:
   - `*-button` - Interactive buttons (`lock-in-button`, `purchase-button`, `open-*`)
   - `*-checkbox` - Form checkboxes (`warm-up-checkbox`, `list-hygiene-checkbox`)
   - `*-slider` - Range sliders (`filtering-slider`, `filter-revenue`)
   - `*-modal` - Modal containers (`marketplace-modal`, `tech-shop-modal`)
   - `open-*` - Action buttons that open modals (`open-client-marketplace`, `open-tech-shop`) (old: 'quick-action-client-marketplace', 'quick-action-tech-shop')
   - `close-*` - Close buttons (`close-modal`, `close-tech-shop`)

### Guidelines
- Use **kebab-case** for all test IDs
- Include entity identifiers when dealing with **dynamic lists** or **multiple instances**
- Prefix with **component/feature scope** for clarity
- Use **semantic suffixes** like `-button`, `-banner`, `-message`, `-icon`
- Keep names **descriptive** but **concise**

---

## Usage in Tests

### Playwright E2E Tests
```typescript
// Simple selector
await page.locator('[data-testid="esp-dashboard"]').waitFor();

// Dynamic selector with entity name
const espName = 'mailchimp';
await page.locator(`[data-testid="filtering-item-${espName}"]`).click();

// Indexed items
await page.locator('[data-testid="client-card-0"]').isVisible();
```

### Vitest Component Tests
```typescript
// Using @testing-library/svelte
import { render, screen } from '@testing-library/svelte';

const { getByTestId } = render(Component);
expect(getByTestId('budget-current')).toBeTruthy();
```

---

## Consequences Phase (US-3.5)

### ESPConsequences Component
**Location**: `src/lib/components/consequences/ESPConsequences.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `esp-consequences` | `<div>` | Main ESP consequences container |
| `consequences-header` | `<h1>` | Round results header (e.g., "Round 2 Results") |
| `consequences-team-name` | `<h2>` | Team name display |
| `section-client-performance` | `<section>` | Client performance section container |
| `warmup-adjustment-message` | `<p>` | Warmup adjustment message for clients |
| `section-revenue-summary` | `<section>` | Revenue summary section container |
| `section-spam-complaints` | `<section>` | Spam complaints section container |
| `client-complaint-card` | `<div>` | Individual client complaint card |
| `section-reputation-changes` | `<section>` | Reputation changes section container |
| `section-budget-update` | `<section>` | Budget update section container |
| `section-alerts-notifications` | `<section>` | Alerts and notifications section container |

### DestinationConsequences Component
**Location**: `src/lib/components/consequences/DestinationConsequences.svelte`

| Test ID | Element | Description |
|---------|---------|-------------|
| `destination-consequences` | `<div>` | Main destination consequences container |
| `consequences-header` | `<h1>` | Round results header (e.g., "Round 2 Results") |
| `consequences-team-name` | `<h2>` | Destination name display |
| `section-spam-blocking` | `<section>` | Spam blocking summary section container |
| `spam-blocked-volume` | `<span>` | Spam blocked volume metric |
| `spam-delivered-volume` | `<span>` | Spam delivered volume metric |
| `false-positive-volume` | `<span>` | False positive volume metric |
| `section-user-satisfaction` | `<section>` | User satisfaction section container |
| `section-revenue-summary` | `<section>` | Revenue summary section container |
| `section-budget-update` | `<section>` | Budget update section container |
| `section-esp-behavior` | `<section>` | ESP behavior alerts section container |

### Phase-Specific Screens
**Location**: ESP and Destination dashboard pages

| Test ID | Element | Description |
|---------|---------|-------------|
| `resolution-loading` | `<div>` | Loading screen during resolution calculation |
| `current-phase` | Text | Current game phase display (for testing phase transitions) |
| `phase-timer` | `<div>` | Phase timer display (should NOT show in consequences) |

---

## Maintenance Notes

- **Last Updated**: 2025-11-17
- **Total Test IDs**: 196+
- When adding new test IDs, follow the [Naming Conventions](#naming-conventions)
- Update this document when adding/removing/renaming test IDs
- Consider adding `data-*` attributes for additional test metadata (colors, states, etc.)

## Summary by Section

- **Shared Components**: 28 test IDs (DashboardHeader, FilteringSliderItem, StatusBadge)
- **ESP Dashboard**: 70+ test IDs (10 components)
- **Destination Dashboard**: 60+ test IDs (8 components)
- **Consequences Phase**: 26 test IDs (US-3.5) - Updated with missing container and volume metrics
- **Lobby**: 5 test IDs
- **Facilitator**: 4 test IDs
