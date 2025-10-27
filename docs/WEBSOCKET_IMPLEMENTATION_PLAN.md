# WebSocket Implementation Plan for US-1.2: Join Game Session

## Current Status

### ✅ Already Implemented
- **WebSocket Server Infrastructure** ([src/lib/server/websocket/index.ts](../src/lib/server/websocket/index.ts))
  - Basic WebSocketServer setup with `/ws` endpoint
  - Client connection/disconnection handling
  - Heartbeat mechanism (30s ping/pong)
  - Broadcast and targeted messaging capabilities
  - Comprehensive logging via Pino
  - Test suite with helpers for async testing

### ⏳ Missing for US-1.2
- **Room-based messaging** (send updates only to players in the same lobby)
- **Player join event broadcasting** (notify all lobby members when someone joins)
- **Lobby state synchronization** (update slot occupation across all clients)
- **Client-side WebSocket connection** (connect from lobby page)
- **Race condition handling** (simultaneous join conflict resolution)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Lobby Page (Svelte)                                      │   │
│  │  - WebSocket client connection                           │   │
│  │  - Listen for lobby_update events                        │   │
│  │  - Update UI reactively when events arrive               │   │
│  └───────────────────────┬──────────────────────────────────┘   │
│                          │ WebSocket (/ws)                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────┐
│                Server Layer (SvelteKit + ws library)             │
│  ┌───────────────────────▼──────────────────────────────────┐   │
│  │ GameWebSocketServer                                       │   │
│  │  - Connection management                                  │   │
│  │  - Room subscription (NEW)                                │   │
│  │  - Message routing (NEW)                                  │   │
│  └───────────────┬───────────────────────────────────────────┘   │
│                  │                                                │
│  ┌───────────────▼───────────────────────────────────────────┐   │
│  │ Player Join Handler                                        │   │
│  │  (POST /api/sessions/[roomCode]/join)                     │   │
│  │  1. Validate & add player to session                      │   │
│  │  2. Broadcast lobby_update to room                        │   │
│  └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Extend WebSocket Server (Server-Side)

#### 1.1 Add Room Subscription System

**File**: `src/lib/server/websocket/index.ts`

**Changes needed**:
```typescript
export interface GameClient {
  id: string;
  ws: WebSocket;
  playerId?: string;
  roomCode?: string;  // NEW: Track which room the client is in
  isAlive: boolean;
}

class GameWebSocketServer {
  private rooms: Map<string, Set<string>> = new Map(); // roomCode -> Set of clientIds

  // NEW: Subscribe a client to a room
  subscribeToRoom(clientId: string, roomCode: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.roomCode = roomCode;

    if (!this.rooms.has(roomCode)) {
      this.rooms.set(roomCode, new Set());
    }
    this.rooms.get(roomCode)!.add(clientId);

    gameLogger.websocket('room_subscription', { clientId, roomCode });
  }

  // NEW: Unsubscribe client from room
  unsubscribeFromRoom(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client || !client.roomCode) return;

    const room = this.rooms.get(client.roomCode);
    if (room) {
      room.delete(clientId);
      if (room.size === 0) {
        this.rooms.delete(client.roomCode);
      }
    }

    gameLogger.websocket('room_unsubscription', { clientId, roomCode: client.roomCode });
    client.roomCode = undefined;
  }

  // NEW: Broadcast message to specific room only
  broadcastToRoom(roomCode: string, message: object): void {
    const room = this.rooms.get(roomCode);
    if (!room) {
      gameLogger.websocket('broadcast_to_room_failed', { roomCode, reason: 'room_not_found' });
      return;
    }

    const data = JSON.stringify(message);
    let successCount = 0;

    room.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
        successCount++;
      }
    });

    gameLogger.websocket('broadcast_to_room', {
      roomCode,
      messageType: (message as any).type,
      clientCount: successCount
    });
  }
}
```

**Why**: Allows targeted messaging to only players in the same lobby, avoiding unnecessary updates.

---

#### 1.2 Handle Room Subscription Messages

**File**: `src/lib/server/websocket/index.ts`

**Update `handleMessage` method**:
```typescript
private handleMessage(clientId: string, data: Buffer) {
  try {
    const message = JSON.parse(data.toString());
    gameLogger.websocket('message_received', { clientId, type: message.type });

    switch (message.type) {
      case 'join_room':
        this.subscribeToRoom(clientId, message.roomCode);
        this.sendToClient(clientId, {
          type: 'room_joined',
          roomCode: message.roomCode
        });
        break;

      case 'leave_room':
        this.unsubscribeFromRoom(clientId);
        break;

      case 'client_error':
        gameLogger.error(new Error(message.error), {
          clientId,
          context: message.context
        });
        break;

      default:
        gameLogger.websocket('unknown_message_type', { clientId, type: message.type });
    }
  } catch (error) {
    gameLogger.error(error as Error, { clientId, context: 'message_parsing' });
  }
}
```

**Why**: Processes client subscription requests and confirms successful room joins.

---

#### 1.3 Cleanup on Disconnect

**File**: `src/lib/server/websocket/index.ts`

**Update connection handler**:
```typescript
ws.on('close', () => {
  this.unsubscribeFromRoom(clientId); // NEW: Clean up room subscription
  this.clients.delete(clientId);
  gameLogger.websocket('client_disconnected', {
    clientId,
    totalClients: this.clients.size
  });
});
```

**Why**: Prevents memory leaks and ensures accurate room membership tracking.

---

### Phase 2: Broadcast Lobby Updates (API Integration)

#### 2.1 Update Player Join API Endpoint

**File**: `src/routes/api/sessions/[roomCode]/join/+server.ts`

**Add WebSocket broadcast after successful join**:
```typescript
import { json } from '@sveltejs/kit';
import { joinGame, getSessionPlayers, type JoinGameRequest } from '$lib/server/game/player-manager';
import { getSession } from '$lib/server/game/session-manager';
import { gameWss } from '$lib/server/websocket';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
  const { roomCode } = params;

  try {
    const body = await request.json();
    const { displayName, role, teamName } = body;

    // ... existing validation ...

    const result = joinGame(joinRequest);

    if (!result.success) {
      return json({ error: result.error, success: false }, { status: 400 });
    }

    // NEW: Broadcast lobby update to all clients in the room
    const session = getSession(roomCode);
    if (session) {
      gameWss.broadcastToRoom(roomCode, {
        type: 'lobby_update',
        data: {
          espTeams: session.esp_teams,
          destinations: session.destinations,
          newPlayer: {
            id: result.playerId,
            displayName: result.player.displayName,
            role: result.player.role,
            teamName: result.player.teamName
          }
        }
      });
    }

    return json({
      success: true,
      playerId: result.playerId,
      player: result.player
    });
  } catch (error) {
    return json(
      { error: 'An error occurred while joining the game', success: false },
      { status: 500 }
    );
  }
};
```

**Why**: Notifies all players in the lobby immediately when someone joins, enabling real-time UI updates.

---

### Phase 3: Client-Side WebSocket Connection

#### 3.1 Create WebSocket Store

**New File**: `src/lib/stores/websocket.ts`

```typescript
import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface LobbyUpdate {
  espTeams: Array<{ name: string; players: string[] }>;
  destinations: Array<{ name: string; players: string[] }>;
  newPlayer?: {
    id: string;
    displayName: string;
    role: string;
    teamName: string;
  };
}

export interface WebSocketStore {
  connected: boolean;
  roomCode: string | null;
  error: string | null;
}

function createWebSocketStore() {
  const { subscribe, set, update }: Writable<WebSocketStore> = writable({
    connected: false,
    roomCode: null,
    error: null
  });

  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  return {
    subscribe,

    connect(roomCode: string, onLobbyUpdate: (data: LobbyUpdate) => void): void {
      if (!browser) return;
      if (ws?.readyState === WebSocket.OPEN) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        update(state => ({ ...state, connected: true, roomCode, error: null }));

        // Subscribe to room
        ws?.send(JSON.stringify({
          type: 'join_room',
          roomCode
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'room_joined':
              // Room subscription confirmed
              break;

            case 'lobby_update':
              onLobbyUpdate(message.data);
              break;

            default:
              // Handle other message types
              break;
          }
        } catch (error) {
          // Send client error to server
          ws?.send(JSON.stringify({
            type: 'client_error',
            error: (error as Error).message,
            context: 'message_parsing'
          }));
        }
      };

      ws.onerror = (error) => {
        update(state => ({ ...state, error: 'WebSocket connection error' }));
      };

      ws.onclose = () => {
        update(state => ({ ...state, connected: false }));

        // Auto-reconnect after 3 seconds
        reconnectTimer = setTimeout(() => {
          this.connect(roomCode, onLobbyUpdate);
        }, 3000);
      };
    },

    disconnect(): void {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      if (ws) {
        ws.close();
        ws = null;
      }

      set({ connected: false, roomCode: null, error: null });
    }
  };
}

export const websocketStore = createWebSocketStore();
```

**Why**: Provides a reusable, reactive WebSocket connection that handles reconnection automatically.

---

#### 3.2 Integrate WebSocket in Lobby Page

**File**: `src/routes/lobby/[roomCode]/+page.svelte`

**Update the script section**:
```typescript
import { websocketStore, type LobbyUpdate } from '$lib/stores/websocket';

onMount(() => {
  mounted = true;
  updateSlotCounts();

  // Connect to WebSocket and subscribe to lobby updates
  websocketStore.connect(session.roomCode, handleLobbyUpdate);

  return () => {
    websocketStore.disconnect();
  };
});

function handleLobbyUpdate(data: LobbyUpdate) {
  // Update local state with server data
  espTeams = data.espTeams;
  destinations = data.destinations;

  // Store new player name if provided
  if (data.newPlayer) {
    playerNames[data.newPlayer.id] = data.newPlayer.displayName;
  }

  // Recalculate slot counts
  updateSlotCounts();
}
```

**Why**: Establishes real-time connection and updates UI automatically when other players join.

---

### Phase 4: Race Condition Handling

#### 4.1 Add Optimistic Locking

**File**: `src/lib/server/game/player-manager.ts`

**Update `joinGame` function**:
```typescript
export function joinGame(request: JoinGameRequest): JoinGameResult {
  // ... existing validation ...

  // Check if slot is available (with fresh data check)
  const freshSession = getSession(roomCode);
  if (!freshSession) {
    return { success: false, error: 'Room not found' };
  }

  // Double-check slot availability with latest data
  const slotStillAvailable = (role === 'ESP')
    ? freshSession.esp_teams.find(t => t.name === teamName)?.players.length === 0
    : freshSession.destinations.find(d => d.name === teamName)?.players.length === 0;

  if (!slotStillAvailable) {
    gameLogger.event('player_join_race_condition_detected', {
      roomCode,
      playerName: trimmedName,
      teamName,
      role
    });

    return {
      success: false,
      error: 'This role was just taken by another player'
    };
  }

  // ... rest of join logic ...
}
```

**Why**: Prevents two players from taking the same slot if they click simultaneously.

---

### Phase 5: Testing WebSocket Integration

#### 5.1 Add WebSocket Tests for Lobby

**New File**: `src/lib/server/websocket/lobby.test.ts`

```typescript
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import { gameWss } from './index';
import { createGameSession } from '../game/session-manager';
import { joinGame } from '../game/player-manager';

describe('Feature: Lobby WebSocket Integration', () => {
  let server: Server;
  let wsClient1: WebSocket;
  let wsClient2: WebSocket;

  beforeEach(async () => {
    // Setup test server and clients
  });

  afterEach(async () => {
    // Cleanup
  });

  test('Scenario: Player joins lobby and others are notified', async () => {
    // Given: Two clients connected to same lobby
    const session = createGameSession();

    wsClient1.send(JSON.stringify({ type: 'join_room', roomCode: session.roomCode }));
    wsClient2.send(JSON.stringify({ type: 'join_room', roomCode: session.roomCode }));

    await waitForMessage(wsClient1); // room_joined confirmation
    await waitForMessage(wsClient2); // room_joined confirmation

    // When: Player 1 joins via API
    const result = joinGame({
      roomCode: session.roomCode,
      displayName: 'Alice',
      role: 'ESP',
      teamName: 'SendWave'
    });

    // Then: Both clients receive lobby_update
    const message1 = await waitForMessage(wsClient1);
    const message2 = await waitForMessage(wsClient2);

    expect(message1.type).toBe('lobby_update');
    expect(message2.type).toBe('lobby_update');
    expect(message1.data.newPlayer.displayName).toBe('Alice');
  });

  test('Scenario: Race condition - two players select same slot', async () => {
    // Given: Session and two connected clients
    const session = createGameSession();

    // When: Both try to join SendWave simultaneously
    const [result1, result2] = await Promise.all([
      joinGame({ roomCode: session.roomCode, displayName: 'Alice', role: 'ESP', teamName: 'SendWave' }),
      joinGame({ roomCode: session.roomCode, displayName: 'Bob', role: 'ESP', teamName: 'SendWave' })
    ]);

    // Then: Only one succeeds
    const successCount = [result1.success, result2.success].filter(Boolean).length;
    expect(successCount).toBe(1);

    const failureResult = result1.success ? result2 : result1;
    expect(failureResult.error).toContain('already taken');
  });
});
```

**Why**: Ensures WebSocket functionality works correctly and race conditions are handled.

---

### Phase 6: Update E2E Tests

#### 6.1 Wait for WebSocket Updates in Tests

**File**: `tests/player-join.spec.ts`

**Add WebSocket wait helper**:
```typescript
async function waitForLobbyUpdate(page: Page, timeout = 5000): Promise<void> {
  await page.waitForFunction(
    () => {
      return (window as any).__lobbyUpdateReceived === true;
    },
    { timeout }
  );
}

// In lobby page, set flag when WebSocket update received:
// (window as any).__lobbyUpdateReceived = true;
```

**Update tests to wait for WebSocket**:
```typescript
test('should show occupied slots after player joins', async ({ page, context }) => {
  const roomCode = await createTestSession(page);

  // Alice joins
  await page.goto(`/lobby/${roomCode}`);
  await page.click('text=SendWave');
  await page.locator('input[name="displayName"]').fill('Alice');
  await page.click('button:has-text("Join Game")');

  // Wait for WebSocket to update UI
  await waitForLobbyUpdate(page);

  // Bob's page should see update
  const bobPage = await context.newPage();
  await bobPage.goto(`/lobby/${roomCode}`);

  await expect(bobPage.locator('[data-team="SendWave"][data-occupied="true"]')).toBeVisible();
});
```

**Why**: Ensures tests wait for real-time updates before asserting, preventing flaky tests.

---

## Message Protocol

### Client → Server

```typescript
// Subscribe to room updates
{
  type: 'join_room',
  roomCode: string
}

// Unsubscribe from room
{
  type: 'leave_room'
}

// Report client-side errors
{
  type: 'client_error',
  error: string,
  context: string
}
```

### Server → Client

```typescript
// Room subscription confirmed
{
  type: 'room_joined',
  roomCode: string
}

// Lobby state update (broadcast to all room members)
{
  type: 'lobby_update',
  data: {
    espTeams: Array<{ name: string, players: string[] }>,
    destinations: Array<{ name: string, players: string[] }>,
    newPlayer?: {
      id: string,
      displayName: string,
      role: string,
      teamName: string
    }
  }
}
```

---

## Rollout Plan

### Step 1: Server Infrastructure (1-2 hours)
- [ ] Add room subscription system to WebSocketServer
- [ ] Update `handleMessage` to process join_room/leave_room
- [ ] Add cleanup on disconnect
- [ ] Write unit tests for room subscriptions

### Step 2: API Integration (30 min)
- [ ] Update POST `/api/sessions/[roomCode]/join` to broadcast lobby_update
- [ ] Test with manual WebSocket client

### Step 3: Client Store (1 hour)
- [ ] Create `src/lib/stores/websocket.ts`
- [ ] Add auto-reconnect logic
- [ ] Add error handling

### Step 4: Lobby Page Integration (30 min)
- [ ] Connect WebSocket in onMount
- [ ] Handle lobby_update messages
- [ ] Update UI reactively

### Step 5: Testing (1-2 hours)
- [ ] Add WebSocket integration tests
- [ ] Update E2E tests to wait for WebSocket
- [ ] Verify all 18 Playwright tests pass

### Step 6: Edge Cases (1 hour)
- [ ] Test reconnection after network loss
- [ ] Test race conditions with concurrent joins
- [ ] Test page refresh behavior

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Race conditions on slot selection** | Two players get same slot | Add optimistic locking with fresh data check |
| **WebSocket connection failures** | Players don't see updates | Auto-reconnect with exponential backoff |
| **Memory leaks from stale subscriptions** | Server performance degrades | Clean up subscriptions on disconnect |
| **Message ordering issues** | Out-of-order updates confuse UI | Add sequence numbers to messages |
| **Browser compatibility** | WebSocket not supported | Graceful degradation (show refresh message) |

---

## Success Criteria

- ✅ All 24 Vitest tests pass (already passing)
- ✅ All 18 Playwright E2E tests pass (currently 6/18)
- ✅ Multiple players can join same lobby simultaneously
- ✅ All players see real-time updates within 500ms
- ✅ Race conditions properly handled (only one player per slot)
- ✅ Reconnection works after network disruption
- ✅ No memory leaks after 100+ connections

---

## Estimated Effort

- **Development**: 4-6 hours
- **Testing**: 2-3 hours
- **Total**: 6-9 hours

---

## Next Steps

1. **Review this plan** with the team
2. **Prioritize features** (can defer auto-reconnect to later sprint)
3. **Start with Step 1** (server infrastructure)
4. **Iterate incrementally** (each step is independently testable)

