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

});
