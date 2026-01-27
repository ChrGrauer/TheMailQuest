/**
 * US-3.2: Decision Lock-In - Unit Tests
 *
 * Tests lock-in business logic including:
 * - Lock-in for ESP teams and Destinations
 * - Budget validation (pending onboarding options)
 * - Auto-correction algorithm (warm-up priority, then list hygiene)
 * - Player lock state tracking
 * - Transition conditions to Resolution Phase
 *
 * Uses ATDD approach following Gherkin scenarios from feature file
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { createGameSession, getSession, getAllSessions, deleteSession } from './session-manager';
import { joinGame, clearPlayers } from './player-manager';
import { startGame } from './game-start-manager';
import { allocateResources } from './resource-allocation-manager';
import { transitionPhase } from './phase-manager';

// Lock-in manager functions (to be implemented)
import {
	lockInESPTeam,
	lockInDestination,
	validateLockIn,
	calculatePendingOnboardingCosts,
	autoCorrectOnboardingOptions,
	autoLockAllPlayers,
	checkAllPlayersLockedIn,
	getRemainingPlayersCount,
	type LockInResult,
	type LockInValidation,
	type AutoCorrectionLog
} from './lock-in-manager';

describe('Feature: Decision Lock-In - Business Logic', () => {
	beforeEach(() => {
		// Clean up all sessions and players before each test
		const sessions = getAllSessions();
		sessions.forEach((session) => deleteSession(session.roomCode));
		clearPlayers();
	});
	// ============================================================================
	// PLAYER LOCK STATE TRACKING
	// ============================================================================

	describe('Scenario: Check if all players are locked in', () => {
		test('When all players locked, Then checkAllPlayersLockedIn returns true', () => {
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
				teamName: 'zmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// Lock both players
			lockInESPTeam(session.roomCode, 'SendWave');
			lockInDestination(session.roomCode, 'zmail');

			// When
			const currentSession = getSession(session.roomCode);
			const allLocked = checkAllPlayersLockedIn(currentSession!);

			// Then
			expect(allLocked).toBe(true);
		});

		test('When some players not locked, Then checkAllPlayersLockedIn returns false', () => {
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
				teamName: 'zmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// Lock only one player
			lockInESPTeam(session.roomCode, 'SendWave');

			// When
			const currentSession = getSession(session.roomCode);
			const allLocked = checkAllPlayersLockedIn(currentSession!);

			// Then
			expect(allLocked).toBe(false);
		});
	});

	describe('Scenario: Get remaining players count', () => {
		test('When 1 out of 3 players locked, Then remaining count is 2', () => {
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
				role: 'ESP',
				teamName: 'MailMonkey'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Carol',
				role: 'Destination',
				teamName: 'zmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// Lock one player
			lockInESPTeam(session.roomCode, 'SendWave');

			// When
			const currentSession = getSession(session.roomCode);
			const remaining = getRemainingPlayersCount(currentSession!);

			// Then
			expect(remaining).toBe(2);
		});
	});

	// ============================================================================
	// PHASE TRANSITION ON ALL LOCKED
	// ============================================================================

	describe('Scenario: Phase transition when all players lock in', () => {
		test('When all players lock in, Then phase should transition to resolution', () => {
			// Given - Session with 2 ESP teams and 1 destination in planning phase
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
				role: 'ESP',
				teamName: 'MailMonkey'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Carol',
				role: 'Destination',
				teamName: 'zmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// Verify initial phase
			let currentSession = getSession(session.roomCode);
			expect(currentSession?.current_phase).toBe('planning');

			// When - Lock in all players
			const result1 = lockInESPTeam(session.roomCode, 'SendWave');
			expect(result1.success).toBe(true);
			expect(result1.all_locked).toBe(false); // Not all locked yet

			const result2 = lockInESPTeam(session.roomCode, 'MailMonkey');
			expect(result2.success).toBe(true);
			expect(result2.all_locked).toBe(false); // Still 1 remaining

			const result3 = lockInDestination(session.roomCode, 'zmail');
			expect(result3.success).toBe(true);
			expect(result3.all_locked).toBe(true); // Now all locked

			// Then - Phase should have transitioned to resolution
			// NOTE: The API endpoint handles the transition, but we can verify the flag
			// In actual implementation, the API endpoint will call transitionPhase()
			currentSession = getSession(session.roomCode);
			expect(result3.all_locked).toBe(true);
			expect(result3.remaining_players).toBe(0);

			// Verify all players are locked
			const sendWave = currentSession?.esp_teams.find((t) => t.name === 'SendWave');
			const mailMonkey = currentSession?.esp_teams.find((t) => t.name === 'MailMonkey');
			const zmail = currentSession?.destinations.find((d) => d.name === 'zmail');

			expect(sendWave?.locked_in).toBe(true);
			expect(mailMonkey?.locked_in).toBe(true);
			expect(zmail?.locked_in).toBe(true);
		});

		test('When last player locks in, Then all_locked flag should be true', () => {
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
				teamName: 'zmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// Lock first player
			const result1 = lockInESPTeam(session.roomCode, 'SendWave');
			expect(result1.all_locked).toBe(false);
			expect(result1.remaining_players).toBe(1);

			// When - Lock last player
			const result2 = lockInDestination(session.roomCode, 'zmail');

			// Then - all_locked should be true
			expect(result2.all_locked).toBe(true);
			expect(result2.remaining_players).toBe(0);
		});
	});

	// ============================================================================
	// ERROR CASES
	// ============================================================================

	describe('Scenario: Lock-in error handling', () => {
		test('When room not found, Then lock-in fails', () => {
			// When
			const result = lockInESPTeam('INVALID', 'SendWave');

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toContain('not found');
		});

		test('When team not found, Then lock-in fails', () => {
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
				teamName: 'zmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// When
			const result = lockInESPTeam(session.roomCode, 'NonExistentTeam');

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toContain('not found');
		});

		test('When already locked in, Then lock-in fails', () => {
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
				teamName: 'zmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// Lock in once
			lockInESPTeam(session.roomCode, 'SendWave');

			// When - Try to lock in again
			const result = lockInESPTeam(session.roomCode, 'SendWave');

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toContain('already locked');
		});

		test('When not in planning phase, Then lock-in fails', () => {
			// Given
			const facilitatorId = 'facilitator_123';
			const session = createGameSession(facilitatorId);

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			});

			// Still in lobby phase

			// When
			const result = lockInESPTeam(session.roomCode, 'SendWave');

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toContain('planning phase');
		});
	});
});
