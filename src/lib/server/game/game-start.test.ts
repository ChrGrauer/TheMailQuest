/**
 * US-1.3: Game Lobby Management - Business Logic Tests
 *
 * Tests game start functionality including:
 * - Facilitator identification
 * - Start game validation (minimum players)
 * - Phase transition (lobby → resource_allocation)
 * - Cannot start game twice
 * - Logging game start events
 *
 * Uses ATDD approach following Gherkin scenarios from feature file
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { createGameSession, getSession, getAllSessions, deleteSession } from './session-manager';
import { joinGame, clearPlayers } from './player-manager';

// Game start functions (to be implemented)
import {
	startGame,
	canStartGame,
	type StartGameRequest,
	type StartGameResult
} from './game-start-manager';

describe('Feature: Game Lobby Management - Business Logic', () => {
	beforeEach(() => {
		// Clean up all sessions and players before each test
		const sessions = getAllSessions();
		sessions.forEach((session) => deleteSession(session.roomCode));
		clearPlayers();
	});

	// ============================================================================
	// FACILITATOR IDENTIFICATION
	// ============================================================================

	describe('Scenario: Facilitator is identified when creating a room', () => {
		test('When a facilitator creates a new game session, Then the facilitator should be marked in the session', () => {
			// When - A facilitator creates a new game session
			const facilitatorId = 'facilitator_12345';
			const session = createGameSession(facilitatorId);

			// Then - The facilitator should be marked and persisted
			expect(session.facilitatorId).toBe(facilitatorId);

			const retrievedSession = getSession(session.roomCode);
			expect(retrievedSession?.facilitatorId).toBe(facilitatorId);
		});
	});

	// ============================================================================
	// START GAME VALIDATION
	// ============================================================================

	describe('Scenario: Start Game button state validation', () => {
		test('Given different player configurations, When checking if game can start, Then return correct validation', () => {
			const facilitatorId = 'facilitator_123';
			const session = createGameSession(facilitatorId);

			// Case 1: Only 1 ESP player - should not be able to start
			joinGame({
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			});

			let validation = canStartGame(session.roomCode);
			expect(validation.canStart).toBe(false);
			expect(validation.reason).toBe('At least 1 Destination is required');
			expect(validation.espTeamCount).toBe(1);
			expect(validation.destinationCount).toBe(0);

			// Case 2: 1 ESP + 1 Destination - should be able to start
			joinGame({
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'Gmail'
			});

			validation = canStartGame(session.roomCode);
			expect(validation.canStart).toBe(true);
			expect(validation.reason).toBeUndefined();
			expect(validation.espTeamCount).toBe(1);
			expect(validation.destinationCount).toBe(1);
			expect(validation.totalPlayers).toBe(2);
		});

		test('Given only Destination players (no ESP teams), When checking if game can start, Then it should return false', () => {
			const facilitatorId = 'facilitator_123';
			const session = createGameSession(facilitatorId);

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'Gmail'
			});

			const validation = canStartGame(session.roomCode);
			expect(validation.canStart).toBe(false);
			expect(validation.reason).toBe('At least 1 ESP team is required');
		});
	});

	// ============================================================================
	// STARTING THE GAME
	// ============================================================================

	describe('Scenario: Clicking Start Game launches resource allocation phase', () => {
		test('Given sufficient players, When facilitator starts the game, Then game transitions to resource_allocation with round still 0', () => {
			// Given - Create session with minimum players
			const facilitatorId = 'facilitator_123';
			const session = createGameSession(facilitatorId);

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'Gmail'
			});

			// Verify initial state
			expect(session.current_phase).toBe('lobby');
			expect(session.current_round).toBe(0);

			// When - Facilitator starts the game
			const result = startGame({
				roomCode: session.roomCode,
				facilitatorId
			});

			// Then - Game should transition to resource_allocation
			// Round stays at 0 (setup phase, not a game round yet)
			// Round will become 1 when transitioning to planning phase (US-1.4)
			expect(result.success).toBe(true);

			const updatedSession = getSession(session.roomCode);
			expect(updatedSession?.current_phase).toBe('resource_allocation');
			expect(updatedSession?.current_round).toBe(0);
		});
	});

	// ============================================================================
	// START GAME ERRORS
	// ============================================================================

	describe('Scenario: Cannot start game - Error cases', () => {
		test('When non-facilitator tries to start the game, Then it should be rejected', () => {
			// Given
			const facilitatorId = 'facilitator_123';
			const session = createGameSession(facilitatorId);

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'Gmail'
			});

			// When - Non-facilitator tries to start game
			const result = startGame({
				roomCode: session.roomCode,
				facilitatorId: 'not_the_facilitator'
			});

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toBe('Only the facilitator can start the game');

			const updatedSession = getSession(session.roomCode);
			expect(updatedSession?.current_phase).toBe('lobby');
		});

		test('When trying to start with insufficient players, Then it should be rejected', () => {
			// Given - Only 1 player
			const facilitatorId = 'facilitator_123';
			const session = createGameSession(facilitatorId);

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			});

			// When - Facilitator tries to start
			const result = startGame({
				roomCode: session.roomCode,
				facilitatorId
			});

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toBe('At least 1 Destination is required');

			const updatedSession = getSession(session.roomCode);
			expect(updatedSession?.current_phase).toBe('lobby');
		});

		test('When trying to start game twice, Then second attempt should be rejected', () => {
			// Given - Game has been started
			const facilitatorId = 'facilitator_123';
			const session = createGameSession(facilitatorId);

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'Gmail'
			});

			startGame({
				roomCode: session.roomCode,
				facilitatorId
			});

			// When - Trying to start again
			const result = startGame({
				roomCode: session.roomCode,
				facilitatorId
			});

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toBe('Game has already started');

			const updatedSession = getSession(session.roomCode);
			expect(updatedSession?.current_phase).toBe('resource_allocation');
			expect(updatedSession?.current_round).toBe(0);
		});

		test('When trying to start with invalid room code, Then it should return error', () => {
			// When - Use a valid format but non-existent room code
			const result = startGame({
				roomCode: 'NOROOM',
				facilitatorId: 'facilitator_123'
			});

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toBe('Room not found. Please check the code.');
		});
	});
});
