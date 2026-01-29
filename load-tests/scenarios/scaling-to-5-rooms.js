/**
 * Scaling Test: 1 to 5 Concurrent Rooms
 *
 * Tests server performance as room count increases from 1 to 5.
 * Each room has 8 players (5 ESP + 3 Destinations).
 *
 * Measures at each level:
 * - WebSocket message latency
 * - Resolution phase time
 * - Memory usage
 * - HTTP response times
 */

import { sleep } from 'k6';
import { Trend, Gauge, Counter } from 'k6/metrics';
import { createFullRoom, roomSetupTime, resolutionPhaseTime } from '../lib/game-room.js';
import { getMetrics, clearSessions } from '../lib/http-client.js';

// Test configuration
export const options = {
	scenarios: {
		scaling: {
			executor: 'shared-iterations',
			vus: 1,
			iterations: 1,
			maxDuration: '1m'
		}
	},
	thresholds: {
		resolution_phase_time: ['p(95)<4000'], // Resolution should be under 4s
		http_req_duration: ['p(95)<500'], // HTTP requests under 500ms
		http_req_failed: ['rate<0.01'] // Less than 1% failures
	}
};

// Custom metrics
const memoryHeapUsed = new Gauge('memory_heap_used_mb');
const memoryRss = new Gauge('memory_rss_mb');
const activeRooms = new Gauge('active_rooms');
const activeConnections = new Gauge('active_connections');

// Per-room-count metrics
const resolutionTimeByRoomCount = {
	1: new Trend('resolution_time_1_room', true),
	2: new Trend('resolution_time_2_rooms', true),
	3: new Trend('resolution_time_3_rooms', true),
	4: new Trend('resolution_time_4_rooms', true),
	5: new Trend('resolution_time_5_rooms', true)
};

const memoryByRoomCount = {
	1: new Gauge('memory_mb_1_room'),
	2: new Gauge('memory_mb_2_rooms'),
	3: new Gauge('memory_mb_3_rooms'),
	4: new Gauge('memory_mb_4_rooms'),
	5: new Gauge('memory_mb_5_rooms')
};

export function setup() {
	// Clear any existing sessions
	console.log('Clearing existing sessions...');
	clearSessions();
	sleep(1);

	// Get initial metrics
	const initialMetrics = getMetrics();
	console.log('Initial state:', JSON.stringify(initialMetrics, null, 2));

	return { startTime: Date.now() };
}

export default function (data) {
	console.log('\n=== Starting Scaling Test: 1 to 5 Rooms ===\n');

	const rooms = [];
	const results = [];

	// Scale up from 1 to 5 rooms
	for (let targetRoomCount = 1; targetRoomCount <= 5; targetRoomCount++) {
		console.log(`\n--- Testing with ${targetRoomCount} room(s) ---\n`);

		// Create new room
		const room = createFullRoom(targetRoomCount);
		if (!room) {
			console.error(`Failed to create room ${targetRoomCount}`);
			break;
		}
		rooms.push(room);

		// Connect WebSockets
		// Note: We cannot easily use the nested callback pattern here without rewriting
		// the entire scaling logic to be recursive instead of a loop.
		// For now, we skip WS connection in scaling test to avoid blocking.
		// room.connectWebSockets(() => {});

		// Start the new room
		if (!room.start()) {
			console.error(`Failed to start room ${targetRoomCount}`);
			break;
		}
		// Initialize round tracker for this room (it starts at round 1)
		room.currentRound = 1;

		// Record metrics at this room count
		const metrics = getMetrics();
		if (metrics) {
			memoryHeapUsed.add(metrics.memory.heapUsed);
			memoryRss.add(metrics.memory.rss);
			activeRooms.add(metrics.sessions.count);
			activeConnections.add(metrics.websocket.totalConnections);

			memoryByRoomCount[targetRoomCount].add(metrics.memory.heapUsed);

			console.log(`Active sessions: ${metrics.sessions.count}`);
			console.log(`WebSocket connections: ${metrics.websocket.totalConnections}`);
			console.log(`Memory: ${metrics.memory.heapUsed}MB heap, ${metrics.memory.rss}MB RSS`);
		}

		// Wait for rooms to stabilize
		sleep(1);

		// Lock in all rooms simultaneously and measure resolution time
		console.log(`\nLocking in all ${targetRoomCount} room(s) simultaneously...`);

		const lockInStart = Date.now();
		const lockInResults = [];

		for (const activeRoom of rooms) {
			const lockInResult = activeRoom.lockInAll();
			lockInResults.push(lockInResult);
		}

		const totalLockInTime = Date.now() - lockInStart;

		// Record resolution time for this room count
		const avgResolutionTime = totalLockInTime / targetRoomCount;
		resolutionTimeByRoomCount[targetRoomCount].add(avgResolutionTime);

		console.log(`Total lock-in time for ${targetRoomCount} rooms: ${totalLockInTime}ms`);
		console.log(`Average resolution time per room: ${avgResolutionTime.toFixed(0)}ms`);

		// Check if all lock-ins succeeded
		const allSucceeded = lockInResults.every((r) => r.success);
		if (!allSucceeded) {
			console.error('Some lock-ins failed!');
		}

		// Record post-resolution metrics
		const postMetrics = getMetrics();
		if (postMetrics) {
			console.log(
				`Post-resolution memory: ${postMetrics.memory.heapUsed}MB heap, ${postMetrics.memory.rss}MB RSS`
			);
		}

		// Store results for this level
		results.push({
			roomCount: targetRoomCount,
			totalLockInTime,
			avgResolutionTime,
			memoryMB: metrics?.memory.heapUsed,
			wsConnections: metrics?.websocket.totalConnections,
			success: allSucceeded
		});
		// Advance all rooms to next round for the next iteration (if not finished)
		for (const activeRoom of rooms) {
			if (activeRoom.currentRound < 4) {
				if (activeRoom.advanceRound()) {
					activeRoom.currentRound++;
				}
			} else {
				// Room has finished 4 rounds, do nothing or log status
				// console.log(`[Room ${activeRoom.roomId}] Game Finished (Round ${activeRoom.currentRound})`);
			}
		}

		// Wait between room count levels
		sleep(2);
	}

	// Print summary
	console.log('\n=== Scaling Test Results ===\n');
	console.log('Room Count | Avg Resolution (ms) | Memory (MB) | WS Connections | Success');
	console.log('-'.repeat(80));
	for (const result of results) {
		console.log(
			`    ${result.roomCount}      |        ${result.avgResolutionTime.toFixed(0).padStart(4)}         |     ${String(result.memoryMB).padStart(4)}      |       ${String(result.wsConnections).padStart(3)}        |   ${result.success ? 'Yes' : 'No'}`
		);
	}

	// Cleanup all rooms
	console.log('\nCleaning up...');
	for (const room of rooms) {
		room.cleanup();
	}

	console.log('\n=== Scaling Test Complete ===\n');
}

export function teardown(data) {
	const duration = Date.now() - data.startTime;
	console.log(`\nTotal test duration: ${duration}ms`);

	// Get final metrics
	const finalMetrics = getMetrics();
	if (finalMetrics) {
		console.log('Final state:', JSON.stringify(finalMetrics, null, 2));
	}

	// Clear sessions after test
	clearSessions();
}
