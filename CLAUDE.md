# Claude Context - The Mail Quest

## Project Overview

**The Mail Quest** is a multiplayer game built with SvelteKit where ESP teams compete to deliver emails to destinations. The project follows ATDD (Acceptance Test-Driven Development) methodology with a Red-Green-Refactor cycle.

## Development Workflow

### ATDD Process
1. Read `.feature` files containing Gherkin-style acceptance criteria
2. Implement test steps first (Red phase - tests fail)
3. Implement code to make tests pass (Green phase)
4. Refactor while keeping tests green

### Testing Strategy
- **Vitest**: Unit tests and integration tests (business logic)
- **Playwright**: E2E tests and UI interactions (user flows)
- All tests must pass before committing

## Tech Stack

- **Framework**: SvelteKit 2.x with Svelte 5
- **Language**: TypeScript (strongly preferred over JavaScript)
- **Styling**: Tailwind CSS v4.1.15 (important: uses v4 syntax!)
- **Testing**: Vitest + Playwright
- **Logger**: Pino (server-side only)
- **WebSocket**: ws library

## Critical Rules

### Logging
- ❌ **NEVER** use `console.log()` or `console.error()` in production code
- ✅ Use Pino logger for all server-side logging
- ✅ Client-side errors should be handled gracefully (TODO: implement proper client error reporting)

### Code Quality
- No console logging in production code
- No mocking in Vitest tests (test real implementations)
- Follow hexagonal architecture for storage layers (port/adapter pattern)
- Prefer editing existing files over creating new ones
- Do not forget logging of all important events
- Only create documentation files when explicitly requested

## Tailwind CSS v4 Configuration

**CRITICAL**: This project uses Tailwind CSS v4.1.15, which has different configuration:

### ❌ Don't Use (Tailwind v3 syntax):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### ✅ Use Instead (Tailwind v4 syntax):
```css
@import "tailwindcss";

@theme {
  --font-sans: 'Roboto', system-ui, sans-serif;
}
```

### Key Differences:
- No `tailwind.config.js` file (delete it if exists)
- Configuration done in CSS using `@theme` directive
- Use `@import "tailwindcss"` instead of `@tailwind` directives

## Architecture Patterns

### Hexagonal Architecture (Ports & Adapters)
Used for storage layers to allow easy swapping of implementations:
Benefits:
- Easy to replace in-memory storage with Redis/PostgreSQL later
- Testable without mocks
- Clear separation of concerns

## Key Implementation Details

### UI Components
- **Font**: Roboto (400, 500, 600, 700 weights)
- **Animations**: Svelte transitions (fly, scale, fade) with staggered delays (50ms)
- **Responsive**: Grid collapses to single column on mobile (lg:grid-cols-2)
- **Max width**: 1400px for main container
- **Colors**:
  - Primary dark: #0B5540
  - Primary: #10B981
  - Primary light: #D1FAE5
  - Backgrounds: #f8faf9 to #e8f5f0 gradient

### Test Setup
```typescript
// vite.config.ts
test: {
  include: ['src/**/*.{test,spec}.{js,ts}'],
  environment: 'node',
  globals: true,
  setupFiles: ['./src/lib/test-utils/setup.ts']
}
```

## WebSocket Architecture

### Critical Setup Requirements

**IMPORTANT**: SvelteKit does not expose the HTTP server directly, so WebSocket requires a custom server setup.

### Production/Testing Server
- Uses **@sveltejs/adapter-node** (not adapter-auto) to generate standalone Node.js build
- Custom `server.js` wraps SvelteKit handler and initializes WebSocket on the same HTTP server
- Playwright E2E tests use this custom server to test WebSocket functionality

```javascript
// server.js - Custom server with WebSocket
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { handler } from './build/handler.js';

const server = createServer(handler);
const wss = new WebSocketServer({ server, path: '/ws' });
// ... WebSocket logic
server.listen(PORT);
```

### Lazy Logger Pattern
**CRITICAL**: The WebSocket server (`src/lib/server/websocket/index.ts`) uses **lazy imports** for the logger to avoid `$app/environment` dependency issues during Vite config loading:

```typescript
// ❌ DON'T: Direct import causes Vite config errors
import { gameLogger } from '../logger';

// ✅ DO: Lazy import
let gameLogger: any = null;
async function getLogger() {
  if (!gameLogger) {
    const module = await import('../logger');
    gameLogger = module.gameLogger;
  }
  return gameLogger;
}

// Usage: getLogger().then(logger => logger.websocket('event', data));
```

**Why**: The logger imports `$app/environment` which is not available during Vite config evaluation. Lazy imports defer loading until runtime when SvelteKit is fully initialized.

### Testing with WebSocket
- **Playwright config**: Uses `npm run build && node server.js` command
- **Port**: 4173 (production preview port)
- **Vitest tests**: No special setup needed (uses in-memory implementations)

### File Structure
```
server.js                              # Custom production server with WebSocket
src/lib/server/websocket/index.ts      # WebSocket server with lazy logger
src/lib/stores/websocket.ts            # Client-side WebSocket store
playwright.config.ts                   # Configured to use custom server
svelte.config.js                       # Uses adapter-node
```

### Known Limitations
- **Development mode**: WebSocket is not available in `npm run dev` - this is a known limitation
- **Playwright only**: E2E tests run against production build (`npm run build` + `node server.js`)
- **Manual testing**: To test WebSocket features manually, use `npm run build && node server.js`

### Troubleshooting
If you see `[404] GET /ws` errors:
1. Verify you're using adapter-node (not adapter-auto)
2. Check that Playwright uses `npm run build && node server.js` command
3. Ensure port 4173 is not already in use

### WebSocket Real-time Updates
The WebSocket store supports multiple message types for different features:
- **lobby_update**: Player joins/leaves, team assignments
- **game_state_update**: Round transitions, phase changes, timer updates
- **esp_dashboard_update**: Real-time budget, reputation, clients, tech updates (US-2.1)

Example usage in components:
```typescript
websocketStore.connect(
  roomCode,
  onLobbyUpdate,          // Required
  onGameStateUpdate,      // Optional
  onESPDashboardUpdate    // Optional (US-2.1+)
);
```

## E2E Testing Patterns

### Test API Pattern for Svelte Components
For E2E tests that need to modify component state without triggering full backend flows, expose a test API via `window.__testName`:

```typescript
// In Svelte component (onMount)
if (typeof window !== 'undefined') {
  (window as any).__espDashboardTest = {
    get ready() { return !loading && !error; }, // Reactive getter
    setCredits: (value: number) => (credits = value),
    setReputation: (value: Record<string, number>) => (reputation = { ...reputation, ...value }),
    // ... other setters
  };
}

// In E2E test
await page.evaluate(() => {
  (window as any).__espDashboardTest.setCredits(800);
});
```

**Key principles:**
- Use **reactive getters** for computed properties (`get ready()`)
- Use **local state variables** for WebSocket testing (avoid mutating stores directly)
- Wait for `ready` flag before making assertions
- Keep test API minimal and focused on state manipulation

### Local State for Testing WebSocket
When testing WebSocket states, use local variables that override derived values:

```typescript
// Test state variables (null means use real store value)
let testWsConnected = $state<boolean | null>(null);
let testWsError = $state<string | null>(null);

// Derived values use test override if set
let wsConnected = $derived(testWsConnected !== null ? testWsConnected : $websocketStore.connected);

// Test API mutates local variables
setWsStatus: (connected: boolean, errorMsg?: string) => {
  testWsConnected = connected;
  testWsError = connected ? null : (errorMsg || 'Connection lost');
}
```

## Configuration Patterns

### Externalizing Game Configuration
Game rules and mechanics should be externalized to configuration files for easy balancing:

**Example**: `src/lib/config/technical-upgrades.ts`
```typescript
export interface TechnicalUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: 'authentication' | 'infrastructure' | 'monitoring' | 'security';
  mandatory?: boolean;        // Is this required?
  mandatoryFrom?: number;      // From which round?
}

export const TECHNICAL_UPGRADES: TechnicalUpgrade[] = [
  { id: 'dmarc', name: 'DMARC', cost: 200, mandatory: true, mandatoryFrom: 3, category: 'authentication' },
  // ... more upgrades
];
```

**Benefits:**
- Easy to add/remove/modify game mechanics
- Centralized configuration for balancing
- Type-safe with TypeScript interfaces
- Can be unit tested independently

## Accessibility Patterns

### Keyboard Navigation with Focus Indicators
All interactive elements must have visible focus indicators using Tailwind's ring utilities:

```svelte
<button
  class="... focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
>
  Action Button
</button>
```

**Testing focus indicators:**
```typescript
const focusStyles = await element.evaluate((el) => {
  const styles = window.getComputedStyle(el);
  return {
    outlineWidth: styles.outlineWidth,
    boxShadow: styles.boxShadow  // Tailwind ring uses box-shadow
  };
});

// Check for either outline OR ring (box-shadow)
const hasOutline = focusStyles.outlineWidth !== '0px';
const hasRing = focusStyles.boxShadow !== 'none' && focusStyles.boxShadow.length > 0;
expect(hasOutline || hasRing).toBeTruthy();
```

### Color-Blind Friendly Design
Don't rely solely on color to convey information. Use:
- **Icons** alongside colors (✓ for success, ⚠ for warning, ✗ for error)
- **Text labels** with status information
- **ARIA attributes** for screen readers

Example from reputation gauges:
```svelte
<div data-status="excellent" aria-label="Gmail reputation: 95 - Excellent">
  <span class="text-green-700">✓</span> {/* Icon for color-blind users */}
  <span>95</span>
  <div class="bg-green-500 h-2" /> {/* Color bar */}
</div>
```

## Error Handling Patterns

### Error Banners vs. Error Pages
**Error Banner** (non-blocking): Show at top of page, dashboard remains functional
```svelte
{#if error && !loading}
  <div class="fixed top-0 left-0 right-0 z-50">
    <div data-testid="error-banner">
      {error}
      <button onclick={() => (error = null)}>×</button>
    </div>
  </div>
{/if}
```

**Error Page** (blocking): Replace entire page content when critical failure
```svelte
{#if loading}
  <!-- Loading state -->
{:else if criticalError}
  <!-- Error page with retry button -->
{:else}
  <!-- Normal content -->
{/if}
```

**Rule of thumb:**
- Use **banner** for: Network issues, data sync errors, recoverable errors
- Use **page** for: Authentication failures, fatal errors, initial load failures
