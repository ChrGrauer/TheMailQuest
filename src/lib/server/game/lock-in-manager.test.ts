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
	// SUCCESSFUL LOCK-IN
	// ============================================================================

	describe('Scenario: ESP team successfully locks in valid decisions', () => {
		test('Given valid decisions, When lock-in called, Then team is locked and state updated', () => {
			// Given - Create session and transition to planning phase
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

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// Set up valid decisions (budget 1450, pending costs 500 = valid)
			const currentSession = getSession(session.roomCode);
			const team = currentSession?.esp_teams.find((t) => t.name === 'SendWave');
			if (team) {
				team.credits = 1450;
				team.pending_onboarding_decisions = {
					'client-1': { warmUp: true, listHygiene: true } // 230cr
				};
			}

			// When - Lock in decisions
			const result = lockInESPTeam(session.roomCode, 'SendWave');

			// Then - Success and team is locked
			expect(result.success).toBe(true);
			expect(result.locked_in).toBe(true);
			expect(result.locked_in_at).toBeInstanceOf(Date);

			const updatedSession = getSession(session.roomCode);
			const lockedTeam = updatedSession?.esp_teams.find((t) => t.name === 'SendWave');
			expect(lockedTeam?.locked_in).toBe(true);
			expect(lockedTeam?.locked_in_at).toBeInstanceOf(Date);
		});
	});

	describe('Scenario: Destination successfully locks in filtering decisions', () => {
		test('Given destination exists, When lock-in called, Then destination is locked', () => {
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

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// When - Lock in destination
			const result = lockInDestination(session.roomCode, 'Gmail');

			// Then
			expect(result.success).toBe(true);
			expect(result.locked_in).toBe(true);

			const updatedSession = getSession(session.roomCode);
			const destination = updatedSession?.destinations.find((d) => d.name === 'Gmail');
			expect(destination?.locked_in).toBe(true);
			expect(destination?.locked_in_at).toBeInstanceOf(Date);
		});
	});

	// ============================================================================
	// BUDGET VALIDATION
	// ============================================================================

	describe('Scenario: Lock-in validation checks pending onboarding costs', () => {
		test('When pending onboarding exceeds budget, Then validation fails', () => {
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

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// Set up invalid decisions (budget 1450, committed 1300, pending 310 = over by 160)
			const currentSession = getSession(session.roomCode);
			const team = currentSession?.esp_teams.find((t) => t.name === 'SendWave');
			if (team) {
				team.credits = 1450;
				team.budget = 1300; // Already spent (committed costs)
				team.pending_onboarding_decisions = {
					'client-1': { warmUp: true, listHygiene: true }, // 230cr
					'client-2': { warmUp: false, listHygiene: true } // 80cr
				}; // Total pending: 310cr
			}

			// When - Validate lock-in
			const validation = validateLockIn(team!);

			// Then - Validation fails
			expect(validation.isValid).toBe(false);
			expect(validation.budgetExceeded).toBe(true);
			expect(validation.pendingCosts).toBe(310);
			expect(validation.excessAmount).toBe(160); // 1300 + 310 - 1450 = 160
			expect(validation.error).toContain('Budget exceeded');
		});

		test('When budget is within limits, Then validation succeeds', () => {
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

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// Set up valid decisions (budget 1450, pending 500 = valid)
			const currentSession = getSession(session.roomCode);
			const team = currentSession?.esp_teams.find((t) => t.name === 'SendWave');
			if (team) {
				team.credits = 1450;
				team.budget = 1000; // Already spent
				team.pending_onboarding_decisions = {
					'client-1': { warmUp: true, listHygiene: true } // 230cr
				};
			}

			// When
			const validation = validateLockIn(team!);

			// Then
			expect(validation.isValid).toBe(true);
			expect(validation.budgetExceeded).toBe(false);
		});
	});

	// ============================================================================
	// PENDING COSTS CALCULATION
	// ============================================================================

	describe('Scenario: Calculate pending onboarding costs', () => {
		test('When team has pending onboarding options, Then costs are calculated correctly', () => {
			// Given - Team with pending onboarding decisions
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

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			const currentSession = getSession(session.roomCode);
			const team = currentSession?.esp_teams.find((t) => t.name === 'SendWave');
			if (team) {
				team.pending_onboarding_decisions = {
					'client-1': { warmUp: true, listHygiene: true }, // 150 + 80 = 230
					'client-2': { warmUp: true, listHygiene: false }, // 150
					'client-3': { warmUp: false, listHygiene: true } // 80
				};
			}

			// When
			const totalCost = calculatePendingOnboardingCosts(team!);

			// Then - Total is 230 + 150 + 80 = 460
			expect(totalCost).toBe(460);
		});

		test('When team has no pending options, Then cost is zero', () => {
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

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			const currentSession = getSession(session.roomCode);
			const team = currentSession?.esp_teams.find((t) => t.name === 'SendWave');
			if (team) {
				team.pending_onboarding_decisions = {};
			}

			// When
			const totalCost = calculatePendingOnboardingCosts(team!);

			// Then
			expect(totalCost).toBe(0);
		});
	});

	// ============================================================================
	// AUTO-CORRECTION ALGORITHM
	// ============================================================================

	describe('Scenario: Auto-correction removes warm-up options first', () => {
		test('Given budget exceeded by pending options, When auto-correct called, Then warm-ups removed first', () => {
			// Given - Team with budget exceeded by 300cr
			const facilitatorId = 'facilitator_123';
			const session = createGameSession(facilitatorId);

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'BluePost'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'Gmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			const currentSession = getSession(session.roomCode);
			const team = currentSession?.esp_teams.find((t) => t.name === 'BluePost');
			if (team) {
				team.credits = 1000;
				team.budget = 690; // Committed costs
				team.pending_onboarding_decisions = {
					'client-1': { warmUp: true, listHygiene: true }, // 230
					'client-2': { warmUp: true, listHygiene: true }, // 230
					'client-3': { warmUp: true, listHygiene: false } // 150
				}; // Total: 610, exceeds budget by 300
				team.available_clients = [
					{ id: 'client-1', name: 'Premium Brand Co.' } as any,
					{ id: 'client-2', name: 'Growing Startup' } as any,
					{ id: 'client-3', name: 'Client C' } as any
				];
			}

			// When - Auto-correct
			const corrections = autoCorrectOnboardingOptions(team!);

			// Then - 2 warm-ups removed (300/150 = 2)
			expect(corrections.length).toBe(2);
			expect(corrections[0].optionType).toBe('warmUp');
			expect(corrections[0].costSaved).toBe(150);
			expect(corrections[1].optionType).toBe('warmUp');
			expect(corrections[1].costSaved).toBe(150);

			// And - Final budget is valid (690 + 310 = 1000, where 310 = 1 warm-up + 2 list hygiene)
			const finalPendingCosts = calculatePendingOnboardingCosts(team!);
			expect(team!.budget + finalPendingCosts).toBeLessThanOrEqual(team!.credits);
		});

		test('Given budget exceeded after removing all warm-ups, When auto-correct continues, Then list hygiene removed', () => {
			// Given - Team where removing all warm-ups is not enough
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

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			const currentSession = getSession(session.roomCode);
			const team = currentSession?.esp_teams.find((t) => t.name === 'SendWave');
			if (team) {
				team.credits = 1000;
				team.budget = 850; // Committed costs
				team.pending_onboarding_decisions = {
					'client-1': { warmUp: true, listHygiene: true }, // 230
					'client-2': { warmUp: false, listHygiene: true } // 80
				}; // Total: 310, exceeds by 160
				team.available_clients = [
					{ id: 'client-1', name: 'Client A' } as any,
					{ id: 'client-2', name: 'Client B' } as any
				];
			}

			// When - Auto-correct
			const corrections = autoCorrectOnboardingOptions(team!);

			// Then - 1 warm-up + 1 list hygiene removed (total 230cr saved, 850+80=930 < 1000)
			expect(corrections.length).toBe(2);
			expect(corrections[0].optionType).toBe('warmUp');
			expect(corrections[1].optionType).toBe('listHygiene');
		});
	});

	// ============================================================================
	// AUTO-LOCK ALL PLAYERS
	// ============================================================================

	describe('Scenario: Auto-lock all players when timer expires', () => {
		test('When timer expires, Then all unlocked players are auto-locked', () => {
			// Given - Session with multiple players, some locked, some not
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
				teamName: 'Gmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// Lock SendWave manually
			lockInESPTeam(session.roomCode, 'SendWave');

			// When - Auto-lock all
			autoLockAllPlayers(session.roomCode);

			// Then - All players are now locked
			const updatedSession = getSession(session.roomCode);
			const sendWave = updatedSession?.esp_teams.find((t) => t.name === 'SendWave');
			const mailMonkey = updatedSession?.esp_teams.find((t) => t.name === 'MailMonkey');
			const gmail = updatedSession?.destinations.find((d) => d.name === 'Gmail');

			expect(sendWave?.locked_in).toBe(true);
			expect(mailMonkey?.locked_in).toBe(true);
			expect(gmail?.locked_in).toBe(true);
		});
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
				teamName: 'Gmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// Lock both players
			lockInESPTeam(session.roomCode, 'SendWave');
			lockInDestination(session.roomCode, 'Gmail');

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
				teamName: 'Gmail'
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
				teamName: 'Gmail'
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
				teamName: 'Gmail'
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

			const result3 = lockInDestination(session.roomCode, 'Gmail');
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
			const gmail = currentSession?.destinations.find((d) => d.name === 'Gmail');

			expect(sendWave?.locked_in).toBe(true);
			expect(mailMonkey?.locked_in).toBe(true);
			expect(gmail?.locked_in).toBe(true);
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
				teamName: 'Gmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// Lock first player
			const result1 = lockInESPTeam(session.roomCode, 'SendWave');
			expect(result1.all_locked).toBe(false);
			expect(result1.remaining_players).toBe(1);

			// When - Lock last player
			const result2 = lockInDestination(session.roomCode, 'Gmail');

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
				teamName: 'Gmail'
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
				teamName: 'Gmail'
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
