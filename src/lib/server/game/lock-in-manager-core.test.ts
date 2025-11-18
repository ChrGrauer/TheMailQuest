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

});
