# Claude Context - The Mail Quest

## Project Overview
**The Mail Quest** is a multiplayer game built with SvelteKit where ESP teams compete to deliver emails.

**Development Methodology**: ATDD (Acceptance Test-Driven Development)
1. Read `.feature` files (Gherkin acceptance criteria)
2. Write failing tests (Red phase)
3. Implement code to pass tests (Green phase)
4. Refactor while keeping tests green

## Tech Stack
- **Framework**: SvelteKit 2.x with Svelte 5
- **Language**: TypeScript (strongly preferred)
- **Styling**: Tailwind CSS v4.1.15 (uses v4 syntax - see below)
- **Testing**: Vitest (unit/integration) + Playwright (E2E)
- **Logger**: Pino (server-side only)
- **WebSocket**: ws library

## Critical Rules
- ❌ **NEVER** use `console.log()` - use Pino logger (server-side)
- ❌ No mocking in Vitest tests (test real implementations)
- ✅ Follow hexagonal architecture for storage (port/adapter pattern)
- ✅ Prefer editing existing files over creating new ones
- ✅ Log all important events with Pino
- ✅ Only create documentation when explicitly requested

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

**Message Types**: `lobby_update`, `game_state_update`, `esp_dashboard_update`

**Broadcasting Tip**: Include computed/derived values in broadcasts to avoid client-side recomputation

## Testing Patterns

### Reusable Test Helpers
Create helpers in `tests/helpers/` (game-setup.ts, assertions.ts, fixtures.ts) to avoid duplication:
- **Benefits**: DRY principle, easy updates, clearer test intent

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
- **Modals**: Include `role="dialog"`, `aria-modal="true"`, focus management, Escape key support

## Error Handling
- **Error Banner** (non-blocking): Fixed top banner for recoverable errors (network, sync)
- **Error Page** (blocking): Full page replacement for critical errors (auth, fatal)
- Use `role="alert"` and `aria-live="assertive"` for error messages

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

## Shared Components Pattern
Extract reusable UI patterns into `src/lib/components/shared/`:
- **When**: Component used in 2+ places with identical/similar styling
- **Benefits**: DRY principle, consistent appearance, easy updates
- **Example**: StatusBadge with `role="status"` and `aria-label`
