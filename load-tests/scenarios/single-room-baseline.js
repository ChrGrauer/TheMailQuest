/**
 * Single Room Baseline Test
 *
 * Tests performance of a single full room playing 4 rounds.
 * Establishes baseline metrics for:
 * - Room setup time
 * - Resolution phase time
 * - Round duration
 * - WebSocket latency
 */

import { sleep } from 'k6';
import { Trend, Counter, Gauge } from 'k6/metrics';
import { createFullRoom, roomSetupTime, resolutionPhaseTime, roundTime } from '../lib/game-room.js';
import { getMetrics, clearSessions } from '../lib/http-client.js';

// Test configuration
export const options = {
	scenarios: {
		baseline: {
			executor: 'shared-iterations',
			vus: 1,
			iterations: 1,
			maxDuration: '15s'
		}
	},
	thresholds: {
		room_setup_time: ['p(95)<5000'], // Room setup should be under 5s
		resolution_phase_time: ['p(95)<4000'], // Resolution should be under 4s
		round_time: ['p(95)<10000'], // Full round should be under 10s
		http_req_duration: ['p(95)<500'], // HTTP requests under 500ms
		http_req_failed: ['rate<0.01'] // Less than 1% failures
	}
};

// Custom metrics for memory tracking
const memoryHeapUsed = new Gauge('memory_heap_used_mb');
const memoryRss = new Gauge('memory_rss_mb');

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
	console.log('\n=== Starting Single Room Baseline Test ===\n');

	// Create and setup the room
	const room = createFullRoom(1);
	if (!room) {
		console.error('Failed to create room');
		return;
	}

	// Connect WebSockets and run game
	console.log('Connecting WebSockets and starting game...');

	room.connectWebSockets(() => {
		// Record memory before game
		const preGameMetrics = getMetrics();
		if (preGameMetrics) {
			memoryHeapUsed.add(preGameMetrics.memory.heapUsed);
			memoryRss.add(preGameMetrics.memory.rss);
			console.log(
				`Pre-game memory: ${preGameMetrics.memory.heapUsed}MB heap, ${preGameMetrics.memory.rss}MB RSS`
			);
		}

		// Play full game with player actions
		const gameResult = room.playFullGameWithActions();

		if (gameResult.success) {
			console.log('\n=== Game Complete ===');
			console.log(`Total duration: ${gameResult.totalDuration}ms`);
			console.log('Round breakdown:');
			for (const round of gameResult.rounds) {
				console.log(`  Round ${round.round}: ${round.duration}ms`);
			}
		} else {
			console.error('Game failed to complete');
		}
	});

	// Record memory after game
	const postGameMetrics = getMetrics();
	if (postGameMetrics) {
		memoryHeapUsed.add(postGameMetrics.memory.heapUsed);
		memoryRss.add(postGameMetrics.memory.rss);
		console.log(
			`Post-game memory: ${postGameMetrics.memory.heapUsed}MB heap, ${postGameMetrics.memory.rss}MB RSS`
		);
	}

	// Cleanup
	room.cleanup();

	console.log('\n=== Baseline Test Complete ===\n');
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
