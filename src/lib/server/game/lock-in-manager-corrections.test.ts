/**
 * US-3.2: Decision Lock-In - Unit Tests
 * US-2.7: Coordination Panel - Lock-In Integration
 *
 * Tests lock-in business logic including:
 * - Lock-in for ESP teams and Destinations
 * - Budget validation (pending onboarding options)
 * - Auto-correction algorithm (warm-up priority, then list hygiene)
 * - Player lock state tracking
 * - Transition conditions to Resolution Phase
 * - US-2.7: Investigation vote budget charging and auto-removal
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
	validateDestinationLockIn,
	type LockInResult,
	type LockInValidation,
	type AutoCorrectionLog
} from './lock-in-manager';

// US-2.7: Investigation manager
import {
	castInvestigationVote,
	INVESTIGATION_COST
} from './investigation-manager';

describe('Feature: Decision Lock-In - Business Logic', () => {
	beforeEach(() => {
		// Clean up all sessions and players before each test
		const sessions = getAllSessions();
		sessions.forEach((session) => deleteSession(session.roomCode));
		clearPlayers();
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
	// US-2.7: INVESTIGATION VOTE LOCK-IN INTEGRATION
	// ============================================================================

	describe('US-2.7: Destination lock-in with investigation vote', () => {
		test('Given destination with investigation vote, When lock-in succeeds, Then 50 credits are charged', async () => {
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
				displayName: 'Grace',
				role: 'Destination',
				teamName: 'Gmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			await transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// Gmail votes to investigate SendWave
			castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'Gmail',
				targetEsp: 'SendWave'
			});

			const preLockSession = getSession(session.roomCode);
			const preLockBudget = preLockSession?.destinations.find((d) => d.name === 'Gmail')?.budget;

			// When
			const result = lockInDestination(session.roomCode, 'Gmail');

			// Then
			expect(result.success).toBe(true);
			const postLockSession = getSession(session.roomCode);
			const gmail = postLockSession?.destinations.find((d) => d.name === 'Gmail');
			expect(gmail?.budget).toBe(preLockBudget! - INVESTIGATION_COST);
		});

		test('Given destination with insufficient budget for vote, When validating lock-in, Then validation fails', async () => {
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
				displayName: 'Grace',
				role: 'Destination',
				teamName: 'Gmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			await transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// Gmail votes to investigate SendWave
			castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'Gmail',
				targetEsp: 'SendWave'
			});

			// Set Gmail's budget to 30 (less than 50 investigation cost)
			const currentSession = getSession(session.roomCode);
			const gmail = currentSession?.destinations.find((d) => d.name === 'Gmail');
			gmail!.budget = 30;

			// When
			const validation = validateDestinationLockIn(gmail!);

			// Then
			expect(validation.isValid).toBe(false);
			expect(validation.error).toContain('investigation vote');
		});

		test('Given destination with insufficient budget at auto-lock, When auto-lock runs, Then vote is removed and lock-in proceeds', async () => {
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
				displayName: 'Grace',
				role: 'Destination',
				teamName: 'Gmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			await transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// Gmail votes to investigate SendWave
			castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'Gmail',
				targetEsp: 'SendWave'
			});

			// Set Gmail's budget to 30 (less than 50 investigation cost)
			const currentSession = getSession(session.roomCode);
			const gmail = currentSession?.destinations.find((d) => d.name === 'Gmail');
			gmail!.budget = 30;

			// When - Auto-lock all players
			autoLockAllPlayers(session.roomCode);

			// Then - Gmail is locked in
			const postLockSession = getSession(session.roomCode);
			const lockedGmail = postLockSession?.destinations.find((d) => d.name === 'Gmail');
			expect(lockedGmail?.locked_in).toBe(true);

			// And - Vote was auto-removed
			expect(lockedGmail?.pending_investigation_vote).toBeUndefined();

			// And - Budget unchanged (vote was removed, not charged)
			expect(lockedGmail?.budget).toBe(30);
		});
	});
});
