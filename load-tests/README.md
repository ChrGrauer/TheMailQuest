# Load Testing for The Mail Quest

Performance testing suite to determine server capacity and measure key metrics.

## Prerequisites

1. **Install k6**:
   ```bash
   brew install k6
   ```

2. **Build the server**:
   ```bash
   npm run build
   ```

## Running Tests

### Quick Start

```bash
# Run all load tests (starts server automatically if needed)
npm run load-test

# Run single room baseline test only
npm run load-test:baseline

# Run scaling test (1 to 5 rooms) only
npm run load-test:scaling
```

### Manual Execution

```bash
# Start server manually
node server.js

# In another terminal, run k6 directly
cd load-tests
k6 run scenarios/single-room-baseline.js
k6 run scenarios/scaling-to-5-rooms.js
```

## Test Scenarios

### 1. Single Room Baseline (`single-room-baseline.js`)

Tests a single full room (8 players) playing 4 complete rounds.

**Measures:**
- Room setup time
- Resolution phase time per round
- Round duration
- Memory usage

### 2. Scaling Test (`scaling-to-5-rooms.js`)

Incrementally adds rooms from 1 to 5, measuring performance at each level.

**Measures:**
- Resolution time at each room count
- Memory growth per room
- WebSocket connection handling
- HTTP response times

## Performance Targets

| Metric | Target |
|--------|--------|
| WebSocket latency | p95 < 500ms |
| Resolution phase time | p95 < 4 seconds |
| HTTP request duration | p95 < 500ms |
| Error rate | < 1% |

## Results

Results are saved to `load-tests/results/` as JSON files with timestamps.

Example output:
```
k6 results (5 concurrent rooms):
  ws_message_latency.........: p95=???ms  (target: <500ms)
  resolution_phase_time......: p95=???s   (target: <4s)
  peak_memory_mb.............: ???
  ws_connection_errors.......: ???%

Per-room breakdown:
  1 room:  resolution=?ms, memory=?MB
  2 rooms: resolution=?ms, memory=?MB
  3 rooms: resolution=?ms, memory=?MB
  4 rooms: resolution=?ms, memory=?MB
  5 rooms: resolution=?ms, memory=?MB
```

## Server Metrics Endpoint

The `/api/debug/metrics` endpoint provides real-time server metrics:

```bash
curl http://localhost:4173/api/debug/metrics
```

Returns:
```json
{
  "timestamp": "2024-...",
  "sessions": {
    "count": 5,
    "byPhase": { "planning": 3, "consequences": 2 },
    "rooms": [...]
  },
  "websocket": {
    "totalConnections": 40,
    "activeRooms": 5,
    "connectionsPerRoom": { "ABC123": 8, ... }
  },
  "memory": {
    "heapUsed": 128,
    "heapTotal": 256,
    "rss": 320
  }
}
```

## Resolution Timing

Resolution timing is logged by the server. Check server logs for entries like:

```
Resolution phase completed {
  roomCode: "ABC123",
  duration_ms: 245,
  round: 1,
  total_clients: 15,
  esp_count: 5,
  destination_count: 3
}
```

## Troubleshooting

### k6 not found
```bash
brew install k6
```

### Server won't start
```bash
# Make sure build exists
npm run build

# Check if port 4173 is in use
lsof -i :4173
```

### WebSocket connection failures
- Ensure server is running with `server.js` (not `npm run dev`)
- Check that port 4173 is accessible
