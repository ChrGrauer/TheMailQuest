# Claude Context - The Mail Quest

## Project Overview
**The Mail Quest** is a multiplayer game built with SvelteKit where ESP teams compete to deliver emails.

**Development Methodology**: ATDD (Acceptance Test-Driven Development)
0. Read `.feature` or spec files (with Gherkin acceptance criteria)
1. Write/update types
2. Write failing tests (Red phase); IMPORTANT : use your e2e skill .claude/skills/e2e-test-assistant.md
3. Implement code to pass tests (Green phase)
4. Refactor while keeping tests green

## Tech Stack
- **Framework**: SvelteKit 2.x with Svelte 5
- **Language**: TypeScript (strongly preferred)
- **Styling**: Tailwind CSS v4.1.15 (uses v4 syntax - see below)
- **Testing**: Vitest (unit/integration) + Playwright (E2E)
- **Logger**: Pino (server-side only)
- **WebSocket**: ws library
- cat -A doesn't work on macOS

## Critical Rules
- ❌ use `console.log()` only for debugging - use Pino logger for prod (server-side)
- ❌ No mocking in Vitest tests (test real implementations)
- ✅ Follow hexagonal architecture for storage (port/adapter pattern)
- ✅ Prefer editing existing files over creating new ones
- ✅ Log all important events with Pino
- ✅ Only create documentation when explicitly requested

## Format
### Configuration Used
- Indentation: Tabs (2 spaces wide)
- Line width: 100 characters
- Quotes: Single quotes
- Trailing commas: None

### How to Use
- Format all files: npm run format
- Check if files need formatting (CI/pre-commit): npm run format:check

## Tailwind CSS v4
**CRITICAL**: Uses v4.1.15 syntax (different from v3):
- ✅ `@import "tailwindcss";` (not `@tailwind base/components/utilities;`)
- ✅ `@theme { --font-sans: 'Roboto'; }` (not `tailwind.config.js`)

## UI Design System
- **Font**: Roboto (400, 500, 600, 700)
- **Colors**: Primary #10B981, Dark #0B5540, Light #D1FAE5
- **Animations**: Svelte transitions (fly, scale, fade) with 50ms stagger
- **Responsive**: Grid collapses to single column on mobile (lg:grid-cols-2)
- **Max width**: 1400px main container

## WebSocket Architecture
**Setup**: Custom `server.js` wraps SvelteKit with WebSocket (uses `@sveltejs/adapter-node`)
- **Production/Testing**: `npm run build && node server.js` (port 4173)
- **Dev limitation**: WebSocket not available in `npm run dev`

**Lazy Logger Pattern** (CRITICAL):
```typescript
// ✅ Lazy import to avoid $app/environment issues during Vite config
let gameLogger: any = null;
async function getLogger() {
  if (!gameLogger) {
    const module = await import('../logger');
    gameLogger = module.gameLogger;
  }
  return gameLogger;
}
```

**Message Types**: `lobby_update`, `game_state_update`, `esp_dashboard_update`, `destination_dashboard_update`

**Broadcasting Patterns**:
- Include computed/derived values in broadcasts to avoid client-side recomputation
- Filter updates by recipient: check `destinationName` field before applying destination updates
- Broadcast immediately after state changes for real-time sync
```typescript
// Filter destination-specific updates
if (update.destinationName && update.destinationName !== destName) {
  return; // Ignore updates for other destinations
}
```

## Testing Patterns

### E2E Testing Philosophy (Refactored 2025-01)

**Core Principle**: Trust your helpers, test what matters

E2E tests should focus on:
- ✅ **Business logic**: Calculations, thresholds, rules
- ✅ **Error states**: Validation failures, edge cases
- ✅ **Feature-specific behavior**: Unique interactions
- ❌ **NOT setup validation**: Already tested by helpers
- ❌ **NOT generic UI**: Visibility, navigation, loading states
- ❌ **NOT happy paths**: Covered implicitly by feature tests

### Reusable Test Helpers

Helpers in `tests/helpers/game-setup.ts` are the foundation:
- **createTestSession()**: Used 17+ times - validates session creation
- **addPlayer()**: Used 50+ times - validates player joining
- **createGameInPlanningPhase()**: Used 9+ times - validates game start
- **closePages()**: Use for cleanup - prevents resource leaks

**Trust your helpers**: If a helper is used successfully elsewhere, don't test it again.

```typescript
// ❌ BAD: Testing that createTestSession works
test('should create session', async ({ page }) => {
  await page.goto('/create');
  await page.click('text=Create a Session');
  await expect(page).toHaveURL(/\/lobby\/.+/);
});

// ✅ GOOD: Use helper, test feature logic
test('should calculate budget forecast correctly', async ({ page, context }) => {
  const { alicePage } = await createGameInPlanningPhase(page, context);
  // Test feature-specific calculation, not setup
  const forecast = await alicePage.getByTestId('budget-forecast');
  await expect(forecast).toContainText('690'); // 1000 - 310 cost
  await closePages(page, alicePage); // Always cleanup!
});
```

### Resource Cleanup (CRITICAL)

Always use `closePages()` helper to prevent resource leaks:

```typescript
import { closePages } from './helpers/game-setup';

test.afterEach(async () => {
  // Include ALL pages, especially facilitator page
  await closePages(page, alicePage, bobPage, gmailPage);
});
```

**Common mistake**: Forgetting to close `page` (facilitator page)

### WebSocket Synchronization

Generic WebSocket sync is tested in `tests/websocket-sync.spec.ts`:
- Real-time updates between clients
- Connection/reconnection handling
- Message routing and filtering

**Feature tests should NOT re-test generic sync**. Test feature-specific data updates only.

```typescript
// ❌ BAD: Generic WebSocket sync test in feature file
test('should see real-time updates when player joins', async ({ page, context }) => {
  const roomCode = await createTestSession(page);
  const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
  await expect(page.locator('text=Alice')).toBeVisible(); // Generic sync
});

// ✅ GOOD: Feature-specific data update
test('should update reputation after resolution with correct calculation', async ({ page, context }) => {
  const { alicePage } = await createGameAfterResolution(page, context);
  const reputation = await alicePage.getByTestId('reputation-gmail');
  await expect(reputation).toContainText('85'); // Specific business value
});
```

### Test Best Practices

```typescript
// ✅ Simple and reliable timeouts
await playerPage.click('button:has-text("Join Game")');
await playerPage.waitForTimeout(500);

// ❌ Fragile - can match multiple elements
await expect(playerPage.locator(`text=${displayName}`)).toBeVisible();
```

### Test API Pattern
Expose test API via `window.__testName` for E2E state manipulation:
```typescript
// In component
(window as any).__espDashboardTest = {
  get ready() { return !loading && !error; },  // Reactive getter
  setCredits: (value: number) => (credits = value)
};
```
**Principles**: Use reactive getters, local state for WebSocket testing, wait for `ready` flag

### Data Attributes for Testing
Add `data-*` attributes for test-specific needs beyond testid:
```svelte
<!-- For visual/behavioral testing -->
<div data-testid="level-display" data-level-color={getLevelColor(level)}>
  {levelName}
</div>
```
**Use Cases**: Color assertions, state verification, dynamic test conditions

### Game Configuration
Externalize game rules to config files (`src/lib/config/`) for easy balancing:
```typescript
export const TECHNICAL_UPGRADES: TechnicalUpgrade[] = [
  { id: 'dmarc', cost: 200, mandatory: true, mandatoryFrom: 3 },
];
```

## Accessibility
- **Focus indicators**: All interactive elements need `focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2`
- **Color-blind friendly**: Use icons + text labels alongside colors (✓/⚠/✗)
- **ARIA attributes**: Add `aria-label`, `role`, `aria-live` for screen readers
- **Modals**: Include `role="dialog"`, `aria-modal="true"`, `tabindex="-1"` on backdrop, Escape key support, click-outside to close

## Error Handling
- **Error Banner** (non-blocking): Fixed top banner for recoverable errors (network, sync)
- **Error Page** (blocking): Full page replacement for critical errors (auth, fatal)
- Use `role="alert"` and `aria-live="assertive"` for error messages

### Modal Error Pattern
Modals that display server data should handle two error types:
```typescript
interface ModalProps {
  dashboardError?: string | null;  // Parent's data loading error
  onRetry?: () => void;             // Callback to retry parent data fetch
}

// Internal error for modal operations
let error = $state<string | null>(null);
```
**Benefits**: Separate concerns, clear error ownership, proper retry mechanism

## API Endpoint Patterns

### RESTful Structure
Organize endpoints by resource hierarchy:
```
/api/sessions/[roomCode]/destination/[destName]/filtering   # Filtering operations
/api/sessions/[roomCode]/destination/[destName]             # Destination data
```

### Endpoint Response Pattern
```typescript
// Success response
return json({
  success: true,
  filtering_policies: updatedPolicies,  // Updated state
  // Include related data that changed
});

// Error response
return json(
  { success: false, error: 'User-friendly message' },
  { status: 400 }
);
```

### WebSocket After Mutations
Always broadcast after successful mutations:
```typescript
const result = updateFilteringPolicy(session, destName, espName, level);
if (result.success) {
  gameWss.broadcastToRoom(roomCode, {
    type: 'destination_dashboard_update',
    destinationName: destName,
    filtering_policies: result.policies
  });
}
```

## TypeScript Safety
- **Optional chaining**: Always use `?.` for optional fields (`client.status?.toLowerCase() || 'default'`)
- **Server-side filtering**: Filter round-based data on server, send filtered results to reduce payload

## Git Commits
Organize commits by concern:
1. **Feature**: `Implement US-X.X: Feature Name`
2. **Refactor**: `refactor: Extract shared components`
3. **Fix**: `fix: Connect feature to existing system`

## State Management

### Resource Tracking Pattern
Separate arrays for definitions vs. ownership:
```typescript
interface Team {
  available_clients: Client[];    // ALL definitions (immutable source)
  active_clients: string[];       // IDs of owned items
  client_states: Record<string, ClientState>;  // Runtime state
}
// Acquisition: Add to active_clients, keep available_clients unchanged
// Portfolio: available_clients.filter(c => active_clients.includes(c.id))
// Marketplace: available_clients.filter(c => !active_clients.includes(c.id))
```
**Why**: Immutable source prevents data inconsistencies, easy filtering for different views

### Svelte 5 Two-way Binding
Use `$bindable()` and `bind:` prefix:
```svelte
// Child: let { show = $bindable() }: Props = $props();
// Parent: <Modal bind:show={showModal} />  <!-- bind: prefix required -->
```

## Component Organization

### Shared Components Pattern
Extract reusable UI patterns into `src/lib/components/shared/`:
- **When**: Component used in 2+ places with identical/similar styling
- **Benefits**: DRY principle, consistent appearance, easy updates
- **Example**: StatusBadge with `role="status"` and `aria-label`, FilteringSliderItem for reusable controls

### Utility Functions
Create utility functions in `src/lib/utils/` for business logic calculations:
```typescript
// src/lib/utils/filtering.ts
export function calculateImpactValues(level: FilteringLevel) {
  const impacts = {
    permissive: { spamReduction: 0, falsePositives: 0 },
    moderate: { spamReduction: 50, falsePositives: 5 },
    // ...
  };
  return impacts[level];
}
```
**Benefits**: Testable, reusable, separates logic from UI, easy to adjust game balance

### Manager Pattern
Organize server-side business logic in `src/lib/server/game/`:
- **Managers**: Handle single responsibility (e.g., `filtering-policy-manager.ts`)
- **Include**: CRUD operations, validation, state transitions
- **Test file**: Co-locate tests as `<manager-name>.test.ts`
- **Export**: Clear interfaces and result types
