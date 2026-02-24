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
	getMetrics,
	acquireClient,
	purchaseTechUpgrade,
	purchaseDestinationTool,
	getESPClients
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

		// Store facilitator ID for later requests (Cookie header)
		this.facilitatorId = sessionResult.facilitatorId;

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
				playerId: result.playerId,
				cookies: result.cookies
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
				playerId: result.playerId,
				cookies: result.cookies
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
	 * Connect WebSocket for all players and run the game logic inside the connection context
	 * Note: k6 WebSocket is blocking, so we must nest the game logic inside the connections
	 * @param {Function} gameLogic - Function to run once all sockets are connected
	 */
	connectWebSockets(gameLogic) {
		const self = this;

		// Recursive function to connect players one by one
		function connectPlayer(index) {
			if (index >= self.players.length) {
				// All players connected, run the game logic
				console.log(
					`[Room ${self.roomId}] All ${self.players.length} players connected via WebSocket`
				);
				try {
					gameLogic();
				} finally {
					// Logic finished, cleanup will happen as we unwind or explicitly
				}
				return;
			}

			const player = self.players[index];

			ws.connect(WS_URL, { timeout: 10000 }, function (socket) {
				socket.on('open', () => {
					socket.send(JSON.stringify({ type: 'join_room', roomCode: self.roomCode }));
				});

				socket.on('message', (data) => {
					// message handling
				});

				socket.on('error', (e) => {
					console.error(`[Room ${self.roomId}] WebSocket error for ${player.teamName}: ${e}`);
				});

				self.wsConnections.push({ player, socket });

				// Connect next player inside this socket's closure
				// This keeps this socket open while the next one connects
				connectPlayer(index + 1);
			});
		}

		// Start connecting from the first player
		connectPlayer(0);
	}

	/**
	 * Start the game
	 * @returns {boolean} Success status
	 */
	start() {
		const result = startGame(this.roomCode, this.facilitatorId);
		if (!result || !result.success) {
			console.error(`[Room ${this.roomId}] Failed to start game`);
			return false;
		}

		console.log(`[Room ${this.roomId}] Game started - Round ${result.round}`);
		return true;
	}

	/**
	 * Lock in decision for all players (ESP and Destination)
	 * @returns {Object} { success, duration }
	 */
	lockInAll() {
		const lockInStart = Date.now();

		// Lock in all ESP teams
		for (const player of this.players) {
			if (player.role === 'ESP') {
				try {
					const result = lockInESP(this.roomCode, player.teamName, player.cookies);
					if (!result) {
						console.error(`[Room ${this.roomId}] Failed to lock in ESP ${player.teamName}`);
						return { success: false };
					}
				} catch (e) {
					console.error(`[Room ${this.roomId}] Exception locking in ESP ${player.teamName}: ${e}`);
					return { success: false };
				}
			}
		}

		// Lock in all Destinations
		let allLocked = false;
		for (const player of this.players) {
			if (player.role === 'Destination') {
				try {
					const result = lockInDestination(this.roomCode, player.teamName, player.cookies);
					if (!result) {
						console.error(`[Room ${this.roomId}] Failed to lock in Destination ${player.teamName}`);
						return { success: false };
					}
					allLocked = result.all_locked;
				} catch (e) {
					console.error(`[Room ${this.roomId}] Exception locking in Dest ${player.teamName}: ${e}`);
					return { success: false };
				}
			}
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

		const result = nextRound(this.roomCode, this.facilitatorId);
		if (!result || !result.success) {
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
	 * Play a round with simulated player actions (acquire clients, buy tech, then lock in)
	 * @param {number} roundNum - Current round number
	 * @returns {Object} { success, duration }
	 */
	playRoundWithActions(roundNum) {
		const roundStart = Date.now();

		console.log(`[Room ${this.roomId}] Playing round ${roundNum} with player actions`);

		// Simulate ESP player actions (acquire clients and buy tech)
		for (const player of this.players) {
			if (player.role === 'ESP') {
				// Round 1: Buy SPF for all teams
				if (roundNum === 1) {
					purchaseTechUpgrade(this.roomCode, player.teamName, 'spf', player.cookies);
					sleep(0.1); // Small delay between actions
				}

				// Round 2: Buy DKIM, acquire first client
				if (roundNum === 2) {
					purchaseTechUpgrade(this.roomCode, player.teamName, 'dkim', player.cookies);
					sleep(0.1);

					// Acquire a client
					const clientsData = getESPClients(this.roomCode, player.teamName, player.cookies);
					if (clientsData && clientsData.clients && clientsData.clients.length > 0) {
						const firstClient = clientsData.clients[0];
						acquireClient(this.roomCode, player.teamName, firstClient.id, player.cookies);
						sleep(0.1);
					}
				}

				// Round 3: Buy DMARC (mandatory)
				if (roundNum === 3) {
					purchaseTechUpgrade(this.roomCode, player.teamName, 'dmarc', player.cookies);
					sleep(0.1);
				}
			}
		}

		// Simulate Destination player actions (buy tools)
		for (const player of this.players) {
			if (player.role === 'Destination') {
				// Round 1: Buy auth validator L1
				if (roundNum === 1) {
					purchaseDestinationTool(
						this.roomCode,
						player.teamName,
						'auth_validator_l1',
						player.cookies
					);
					sleep(0.1);
				}

				// Round 2: Buy auth validator L2
				if (roundNum === 2) {
					purchaseDestinationTool(
						this.roomCode,
						player.teamName,
						'auth_validator_l2',
						player.cookies
					);
					sleep(0.1);
				}
			}
		}

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
	 * Play full game with player activity (4 rounds)
	 * @returns {Object} { success, totalDuration, rounds }
	 */
	playFullGameWithActions() {
		const gameStart = Date.now();
		const rounds = [];

		// Start the game
		if (!this.start()) {
			return { success: false };
		}

		// Play all 4 rounds with player actions
		for (let round = 1; round <= 4; round++) {
			const result = this.playRoundWithActions(round);
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

		console.log(`[Room ${this.roomId}] Full game with actions complete in ${totalDuration}ms`);

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
