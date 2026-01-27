/**
 * Game Room Simulation for Load Testing
 *
 * Orchestrates a full room with 8 players (5 ESP + 3 Destinations)
 */

import { sleep } from 'k6';
import { Trend } from 'k6/metrics';
import http from 'k6/http';
import ws from 'k6/ws';
import {
	createSession,
	joinAsPlayer,
	startGame,
	lockInESP,
	lockInDestination,
	nextRound,
	getMetrics
} from './http-client.js';
import { wsLatency } from './websocket-client.js';

// Custom metrics
export const roomSetupTime = new Trend('room_setup_time', true);
export const resolutionPhaseTime = new Trend('resolution_phase_time', true);
export const roundTime = new Trend('round_time', true);

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4173';
const WS_URL = __ENV.WS_URL || 'ws://localhost:4173/ws';

// Team configurations
const ESP_TEAMS = ['SendWave', 'MailMonkey', 'BluePost', 'SendBolt', 'RocketMail'];
const DESTINATIONS = ['zmail', 'intake', 'yagle'];

/**
 * GameRoom class - simulates a full game room
 */
export class GameRoom {
	constructor(roomId) {
		this.roomId = roomId;
		this.roomCode = null;
		this.facilitatorCookies = null;
		this.players = [];
		this.wsConnections = [];
	}

	/**
	 * Setup a full room with all players
	 * @returns {boolean} Success status
	 */
	setup() {
		const startTime = Date.now();

		// 1. Create session
		const sessionResult = createSession();
		if (!sessionResult) {
			console.error(`[Room ${this.roomId}] Failed to create session`);
			return false;
		}

		this.roomCode = sessionResult.roomCode;

		// Store facilitator cookies in a jar for later use
		this.facilitatorJar = http.cookieJar();
		// Set the facilitatorId cookie manually
		this.facilitatorJar.set(BASE_URL, 'facilitatorId', sessionResult.facilitatorId, {
			path: '/'
		});

		// 2. Join ESP players
		for (const teamName of ESP_TEAMS) {
			const result = joinAsPlayer(this.roomCode, `Player_${teamName}`, 'ESP', teamName);
			if (!result) {
				console.error(`[Room ${this.roomId}] Failed to join ESP ${teamName}`);
				return false;
			}
			this.players.push({
				role: 'ESP',
				teamName,
				playerId: result.playerId
			});
		}

		// 3. Join Destination players
		for (const destName of DESTINATIONS) {
			const result = joinAsPlayer(this.roomCode, `Player_${destName}`, 'Destination', destName);
			if (!result) {
				console.error(`[Room ${this.roomId}] Failed to join Destination ${destName}`);
				return false;
			}
			this.players.push({
				role: 'Destination',
				teamName: destName,
				playerId: result.playerId
			});
		}

		const setupDuration = Date.now() - startTime;
		roomSetupTime.add(setupDuration);

		console.log(
			`[Room ${this.roomId}] Setup complete: ${this.roomCode} with ${this.players.length} players in ${setupDuration}ms`
		);

		return true;
	}

	/**
	 * Connect WebSocket for all players
	 * Note: k6 WebSocket is synchronous, so we create connections sequentially
	 */
	connectWebSockets(callback) {
		const self = this;

		// Connect all players to WebSocket
		for (const player of this.players) {
			ws.connect(WS_URL, { timeout: 10000 }, function (socket) {
				socket.on('open', () => {
					socket.send(JSON.stringify({ type: 'join_room', roomCode: self.roomCode }));
				});

				socket.on('message', (data) => {
					const message = JSON.parse(data);
					if (callback) {
						callback(player, message, Date.now());
					}
				});

				socket.on('error', (e) => {
					console.error(`[Room ${self.roomId}] WebSocket error for ${player.teamName}: ${e}`);
				});

				self.wsConnections.push({ player, socket });
			});
		}
	}

	/**
	 * Start the game
	 * @returns {boolean} Success status
	 */
	start() {
		const result = startGame(this.roomCode, this.facilitatorJar);
		if (!result) {
			console.error(`[Room ${this.roomId}] Failed to start game`);
			return false;
		}

		console.log(`[Room ${this.roomId}] Game started - Round ${result.round}`);
		return true;
	}

	/**
	 * Lock in all players and measure resolution time
	 * @returns {Object} { success, resolutionTime }
	 */
	lockInAll() {
		const lockInStart = Date.now();

		// Lock in all ESP teams
		for (const teamName of ESP_TEAMS) {
			const result = lockInESP(this.roomCode, teamName);
			if (!result) {
				console.error(`[Room ${this.roomId}] Failed to lock in ESP ${teamName}`);
				return { success: false };
			}
		}

		// Lock in all destinations
		let allLocked = false;
		for (const destName of DESTINATIONS) {
			const result = lockInDestination(this.roomCode, destName);
			if (!result) {
				console.error(`[Room ${this.roomId}] Failed to lock in Destination ${destName}`);
				return { success: false };
			}
			allLocked = result.all_locked;
		}

		// Wait a bit for resolution to complete and broadcasts to arrive
		sleep(0.5);

		const resolutionTime = Date.now() - lockInStart;
		resolutionPhaseTime.add(resolutionTime);

		console.log(`[Room ${this.roomId}] Lock-in complete, resolution time: ${resolutionTime}ms`);

		return { success: true, resolutionTime };
	}

	/**
	 * Advance to next round
	 * @returns {boolean} Success status
	 */
	advanceRound() {
		// Wait for consequences phase to settle
		sleep(1);

		const result = nextRound(this.roomCode, this.facilitatorJar);
		if (!result) {
			console.error(`[Room ${this.roomId}] Failed to advance round`);
			return false;
		}

		console.log(`[Room ${this.roomId}] Advanced to round ${result.round}`);
		return true;
	}

	/**
	 * Play a full round (lock-in + advance)
	 * @param {number} roundNum - Current round number
	 * @returns {Object} { success, duration }
	 */
	playRound(roundNum) {
		const roundStart = Date.now();

		console.log(`[Room ${this.roomId}] Playing round ${roundNum}`);

		// Lock in all players
		const lockInResult = this.lockInAll();
		if (!lockInResult.success) {
			return { success: false };
		}

		// Advance to next round (except after round 4)
		if (roundNum < 4) {
			if (!this.advanceRound()) {
				return { success: false };
			}
		}

		const roundDuration = Date.now() - roundStart;
		roundTime.add(roundDuration);

		return { success: true, duration: roundDuration };
	}

	/**
	 * Play full game (4 rounds)
	 * @returns {Object} { success, totalDuration, rounds }
	 */
	playFullGame() {
		const gameStart = Date.now();
		const rounds = [];

		// Start the game
		if (!this.start()) {
			return { success: false };
		}

		// Play all 4 rounds
		for (let round = 1; round <= 4; round++) {
			const result = this.playRound(round);
			rounds.push({ round, ...result });

			if (!result.success) {
				return { success: false, rounds };
			}

			// Small delay between rounds
			if (round < 4) {
				sleep(0.5);
			}
		}

		const totalDuration = Date.now() - gameStart;

		console.log(`[Room ${this.roomId}] Full game complete in ${totalDuration}ms`);

		return { success: true, totalDuration, rounds };
	}

	/**
	 * Cleanup - close all connections
	 */
	cleanup() {
		for (const conn of this.wsConnections) {
			try {
				conn.socket.close();
			} catch (e) {
				// Ignore close errors
			}
		}
		this.wsConnections = [];
	}
}

/**
 * Create and setup a full game room
 * @param {number} roomId - Unique identifier for the room
 * @returns {GameRoom|null} The setup room or null on failure
 */
export function createFullRoom(roomId) {
	const room = new GameRoom(roomId);
	if (!room.setup()) {
		return null;
	}
	return room;
}
