/**
 * US-2.7: Coordination Panel - Investigation Manager Tests
 *
 * Tests investigation voting functionality including:
 * - Casting investigation votes
 * - Removing votes
 * - Budget validation (requires 50 credits)
 * - Vote change (selecting different ESP)
 * - Phase restrictions (only during planning)
 * - Lock-in restrictions (can't vote if locked in)
 * - Getting all current votes
 *
 * Uses ATDD approach following Gherkin scenarios from US-2.7 feature file
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { createGameSession, getSession, getAllSessions, deleteSession } from './session-manager';
import { joinGame, clearPlayers } from './player-manager';
import { startGame } from './game-start-manager';
import { allocateResources } from './resource-allocation-manager';
import { transitionPhase } from './phase-manager';

// Investigation manager functions (to be implemented)
import {
	castInvestigationVote,
	removeInvestigationVote,
	getInvestigationVotes,
	checkInvestigationTrigger,
	runInvestigation,
	type CastVoteParams,
	type RemoveVoteParams
} from './investigation-manager';

describe('Feature: US-2.7 Coordination Panel - Investigation Voting', () => {
	beforeEach(() => {
		// Clean up all sessions and players before each test
		const sessions = getAllSessions();
		sessions.forEach((session) => deleteSession(session.roomCode));
		clearPlayers();
	});

	// ============================================================================
	// SECTION 1: CASTING INVESTIGATION VOTES
	// ============================================================================

	describe('Scenario: Cast investigation vote', () => {
		test('Given a destination with sufficient budget, When they vote to investigate an ESP, Then the vote is recorded', async () => {
			// Given - Create game with 3 destinations and ESPs
			const { session, zmailDest } = await createGameInPlanningPhase();

			// When - zmail votes to investigate BluePost
			const result = castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'zmail',
				targetEsp: 'BluePost'
			});

			// Then
			expect(result.success).toBe(true);
			expect(result.currentVotes).toBeDefined();
			expect(result.currentVotes!['BluePost']).toContain('zmail');
			expect(result.reservedCredits).toBe(50);

			// Verify destination state updated
			const updatedSession = getSession(session.roomCode);
			const zmail = updatedSession!.destinations.find((d) => d.name === 'zmail');
			expect(zmail?.pending_investigation_vote?.espName).toBe('BluePost');
		});

		test('Given a destination already voted, When they vote for a different ESP, Then the vote is changed', async () => {
			// Given
			const { session } = await createGameInPlanningPhase();
			castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'zmail',
				targetEsp: 'BluePost'
			});

			// When - Change vote to SendWave
			const result = castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'zmail',
				targetEsp: 'SendWave'
			});

			// Then
			expect(result.success).toBe(true);
			expect(result.currentVotes!['SendWave']).toContain('zmail');
			expect(result.currentVotes!['BluePost'] || []).not.toContain('zmail');
		});

		test('Given multiple destinations, When they vote for the same ESP, Then votes accumulate', async () => {
			// Given
			const { session } = await createGameInPlanningPhase();

			// When - Two destinations vote for same ESP
			castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'zmail',
				targetEsp: 'BluePost'
			});
			castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'intake',
				targetEsp: 'BluePost'
			});

			// Then
			const votes = getInvestigationVotes(session.roomCode);
			expect(votes['BluePost']).toHaveLength(2);
			expect(votes['BluePost']).toContain('zmail');
			expect(votes['BluePost']).toContain('intake');
		});
	});

	// ============================================================================
	// SECTION 2: REMOVING INVESTIGATION VOTES
	// ============================================================================

	describe('Scenario: Remove investigation vote', () => {
		test('Given a destination with an active vote, When they remove their vote, Then the vote is cleared', async () => {
			// Given
			const { session } = await createGameInPlanningPhase();
			castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'zmail',
				targetEsp: 'BluePost'
			});

			// When
			const result = removeInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'zmail'
			});

			// Then
			expect(result.success).toBe(true);
			expect(result.currentVotes!['BluePost'] || []).not.toContain('zmail');

			// Verify destination state cleared
			const updatedSession = getSession(session.roomCode);
			const zmail = updatedSession!.destinations.find((d) => d.name === 'zmail');
			expect(zmail?.pending_investigation_vote).toBeUndefined();
		});

		test('Given a destination with no active vote, When they try to remove, Then it succeeds gracefully', async () => {
			// Given
			const { session } = await createGameInPlanningPhase();

			// When - Try to remove a vote that doesn't exist
			const result = removeInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'zmail'
			});

			// Then - Should succeed (idempotent operation)
			expect(result.success).toBe(true);
		});
	});

	// ============================================================================
	// SECTION 3: BUDGET VALIDATION
	// ============================================================================

	describe('Scenario: Budget validation for voting', () => {
		test('Given a destination with less than 50 credits, When they try to vote, Then the vote is rejected', async () => {
			// Given
			const { session } = await createGameInPlanningPhase();

			// Reduce zmail's budget to 30 credits
			const updatedSession = getSession(session.roomCode);
			const zmail = updatedSession!.destinations.find((d) => d.name === 'zmail');
			zmail!.budget = 30;

			// When
			const result = castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'zmail',
				targetEsp: 'BluePost'
			});

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toContain('Insufficient budget');
		});

		test('Given a destination with exactly 50 credits, When they vote, Then the vote is accepted', async () => {
			// Given
			const { session } = await createGameInPlanningPhase();

			// Set zmail's budget to exactly 50 credits
			const updatedSession = getSession(session.roomCode);
			const zmail = updatedSession!.destinations.find((d) => d.name === 'zmail');
			zmail!.budget = 50;

			// When
			const result = castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'zmail',
				targetEsp: 'BluePost'
			});

			// Then
			expect(result.success).toBe(true);
		});
	});

	// ============================================================================
	// SECTION 4: PHASE AND LOCK-IN RESTRICTIONS
	// ============================================================================

	describe('Scenario: Phase restrictions', () => {
		test('Given the game is not in planning phase, When a destination tries to vote, Then the vote is rejected', async () => {
			// Given - Create game in consequences phase
			const { session } = await createGameInPlanningPhase();
			const gameSession = getSession(session.roomCode);
			gameSession!.current_phase = 'consequences';

			// When
			const result = castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'zmail',
				targetEsp: 'BluePost'
			});

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toContain('Voting is only available during planning phase');
		});
	});

	describe('Scenario: Lock-in restrictions', () => {
		test('Given a destination that has locked in, When they try to vote, Then the vote is rejected', async () => {
			// Given
			const { session } = await createGameInPlanningPhase();

			// Lock in zmail
			const updatedSession = getSession(session.roomCode);
			const zmail = updatedSession!.destinations.find((d) => d.name === 'zmail');
			zmail!.locked_in = true;

			// When
			const result = castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'zmail',
				targetEsp: 'BluePost'
			});

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toContain('Cannot vote after locking in');
		});

		test('Given a destination that has locked in, When they try to remove a vote, Then the removal is rejected', async () => {
			// Given
			const { session } = await createGameInPlanningPhase();

			// First cast a vote
			castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'zmail',
				targetEsp: 'BluePost'
			});

			// Then lock in zmail
			const updatedSession = getSession(session.roomCode);
			const zmail = updatedSession!.destinations.find((d) => d.name === 'zmail');
			zmail!.locked_in = true;

			// When - Try to remove vote after lock-in
			const result = removeInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'zmail'
			});

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toContain('Cannot modify vote after locking in');
		});
	});

	// ============================================================================
	// SECTION 5: GET INVESTIGATION VOTES
	// ============================================================================

	describe('Scenario: Get all investigation votes', () => {
		test('Given multiple votes from different destinations, When getting votes, Then all votes are returned grouped by ESP', async () => {
			// Given
			const { session } = await createGameInPlanningPhase();

			castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'zmail',
				targetEsp: 'BluePost'
			});
			castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'intake',
				targetEsp: 'BluePost'
			});
			castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'yagle',
				targetEsp: 'SendWave'
			});

			// When
			const votes = getInvestigationVotes(session.roomCode);

			// Then
			expect(votes['BluePost']).toHaveLength(2);
			expect(votes['BluePost']).toContain('zmail');
			expect(votes['BluePost']).toContain('intake');
			expect(votes['SendWave']).toHaveLength(1);
			expect(votes['SendWave']).toContain('yagle');
		});

		test('Given no votes, When getting votes, Then an empty object is returned', async () => {
			// Given
			const { session } = await createGameInPlanningPhase();

			// When
			const votes = getInvestigationVotes(session.roomCode);

			// Then
			expect(votes).toEqual({});
		});
	});

	// ============================================================================
	// SECTION 6: INVALID TARGET VALIDATION
	// ============================================================================

	describe('Scenario: Invalid target validation', () => {
		test('Given a non-existent ESP name, When voting, Then the vote is rejected', async () => {
			// Given
			const { session } = await createGameInPlanningPhase();

			// When
			const result = castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'zmail',
				targetEsp: 'NonExistentESP'
			});

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toContain('Invalid ESP target');
		});

		test('Given a non-existent destination, When voting, Then the vote is rejected', async () => {
			// Given
			const { session } = await createGameInPlanningPhase();

			// When
			const result = castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'NonExistentDest',
				targetEsp: 'BluePost'
			});

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toContain('Destination not found');
		});

		test('Given a non-existent room code, When voting, Then the vote is rejected', async () => {
			// When
			const result = castInvestigationVote({
				roomCode: 'INVALID',
				destinationName: 'zmail',
				targetEsp: 'BluePost'
			});

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toContain('Session not found');
		});
	});

	// ============================================================================
	// SECTION 7: INVESTIGATION TRIGGER LOGIC (US-2.7 Section 2)
	// ============================================================================

	describe('Scenario: Investigation trigger based on vote distribution', () => {
		test('Given 2/3 destinations vote for same ESP, When checking trigger, Then investigation is triggered', async () => {
			// Given
			const { session } = await createGameInPlanningPhase();

			// zmail and intake vote for BluePost (2/3)
			castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'zmail',
				targetEsp: 'BluePost'
			});
			castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'intake',
				targetEsp: 'BluePost'
			});

			// When
			const trigger = checkInvestigationTrigger(session.roomCode);

			// Then
			expect(trigger.triggered).toBe(true);
			expect(trigger.targetEsp).toBe('BluePost');
			expect(trigger.voters).toHaveLength(2);
			expect(trigger.voters).toContain('zmail');
			expect(trigger.voters).toContain('intake');
		});

		test('Given 3/3 destinations vote for same ESP, When checking trigger, Then investigation is triggered', async () => {
			// Given
			const { session } = await createGameInPlanningPhase();

			// All 3 destinations vote for BluePost
			castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'zmail',
				targetEsp: 'BluePost'
			});
			castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'intake',
				targetEsp: 'BluePost'
			});
			castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'yagle',
				targetEsp: 'BluePost'
			});

			// When
			const trigger = checkInvestigationTrigger(session.roomCode);

			// Then
			expect(trigger.triggered).toBe(true);
			expect(trigger.targetEsp).toBe('BluePost');
			expect(trigger.voters).toHaveLength(3);
		});

		test('Given only 1/3 destinations vote, When checking trigger, Then investigation is NOT triggered', async () => {
			// Given
			const { session } = await createGameInPlanningPhase();

			// Only zmail votes for BluePost (1/3)
			castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'zmail',
				targetEsp: 'BluePost'
			});

			// When
			const trigger = checkInvestigationTrigger(session.roomCode);

			// Then
			expect(trigger.triggered).toBe(false);
			expect(trigger.targetEsp).toBeUndefined();
		});

		test('Given votes are split across ESPs, When checking trigger, Then investigation is NOT triggered', async () => {
			// Given
			const { session } = await createGameInPlanningPhase();

			// Votes split: BluePost(1), SendWave(1), no vote(1)
			castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'zmail',
				targetEsp: 'BluePost'
			});
			castInvestigationVote({
				roomCode: session.roomCode,
				destinationName: 'intake',
				targetEsp: 'SendWave'
			});
			// yagle doesn't vote

			// When
			const trigger = checkInvestigationTrigger(session.roomCode);

			// Then
			expect(trigger.triggered).toBe(false);
		});

		test('Given no votes, When checking trigger, Then investigation is NOT triggered', async () => {
			// Given
			const { session } = await createGameInPlanningPhase();

			// No votes cast

			// When
			const trigger = checkInvestigationTrigger(session.roomCode);

			// Then
			expect(trigger.triggered).toBe(false);
		});
	});
});

// ============================================================================
// SECTION 8: INVESTIGATION RESOLUTION (US-2.7 Section 3)
// ============================================================================

describe('Feature: US-2.7 Investigation Resolution', () => {
	beforeEach(() => {
		// Clean up all sessions and players before each test
		const sessions = getAllSessions();
		sessions.forEach((session) => deleteSession(session.roomCode));
		clearPlayers();
	});

	describe('Scenario: Investigation detects violation based on risk level and protections', () => {
		test('Given HIGH-risk client without warmup, When investigation runs, Then client is suspended', async () => {
			// Given
			const { session, bluePostTeam } = await createGameWithESPClient({
				riskLevel: 'high',
				hasWarmup: false,
				hasListHygiene: true,
				spamRate: 2.0
			});

			// When
			const result = runInvestigation({
				roomCode: session.roomCode,
				targetEsp: 'BluePost',
				voters: ['zmail', 'intake']
			});

			// Then
			expect(result.violationFound).toBe(true);
			expect(result.suspendedClient).toBeDefined();
			expect(result.suspendedClient?.riskLevel).toBe('High');
		});

		test('Given HIGH-risk client without list hygiene, When investigation runs, Then client is suspended', async () => {
			// Given
			const { session } = await createGameWithESPClient({
				riskLevel: 'high',
				hasWarmup: true,
				hasListHygiene: false,
				spamRate: 2.0
			});

			// When
			const result = runInvestigation({
				roomCode: session.roomCode,
				targetEsp: 'BluePost',
				voters: ['zmail', 'intake']
			});

			// Then
			expect(result.violationFound).toBe(true);
			expect(result.suspendedClient).toBeDefined();
		});

		test('Given HIGH-risk client with both protections, When investigation runs, Then no violation found', async () => {
			// Given
			const { session } = await createGameWithESPClient({
				riskLevel: 'high',
				hasWarmup: true,
				hasListHygiene: true,
				spamRate: 2.0
			});

			// When
			const result = runInvestigation({
				roomCode: session.roomCode,
				targetEsp: 'BluePost',
				voters: ['zmail', 'intake']
			});

			// Then
			expect(result.violationFound).toBe(false);
			expect(result.suspendedClient).toBeUndefined();
		});

		test('Given MEDIUM-risk client without protections, When investigation runs, Then no violation found', async () => {
			// Given
			const { session } = await createGameWithESPClient({
				riskLevel: 'medium',
				hasWarmup: false,
				hasListHygiene: false,
				spamRate: 2.0
			});

			// When
			const result = runInvestigation({
				roomCode: session.roomCode,
				targetEsp: 'BluePost',
				voters: ['zmail', 'intake']
			});

			// Then
			expect(result.violationFound).toBe(false);
			expect(result.suspendedClient).toBeUndefined();
		});

		test('Given LOW-risk client without protections, When investigation runs, Then no violation found', async () => {
			// Given
			const { session } = await createGameWithESPClient({
				riskLevel: 'low',
				hasWarmup: false,
				hasListHygiene: false,
				spamRate: 2.0
			});

			// When
			const result = runInvestigation({
				roomCode: session.roomCode,
				targetEsp: 'BluePost',
				voters: ['zmail', 'intake']
			});

			// Then
			expect(result.violationFound).toBe(false);
		});
	});

	describe('Scenario: Multiple violations - highest spam rate client is suspended', () => {
		test('Given multiple violating clients, When investigation runs, Then highest spam_rate is suspended', async () => {
			// Given
			const { session, bluePostTeam } = await createGameInPlanningPhase();

			// Add three HIGH-risk clients with violations and different spam rates
			bluePostTeam.available_clients = [
				{
					id: 'client-bad',
					name: 'Bad Actor',
					risk: 'High',
					spam_rate: 2.0,
					email_volume: 50000,
					industry: 'E-commerce',
					initial_cost: 200
				} as any,
				{
					id: 'client-worse',
					name: 'Worse Actor',
					risk: 'High',
					spam_rate: 3.5,
					email_volume: 50000,
					industry: 'E-commerce',
					initial_cost: 200
				} as any,
				{
					id: 'client-worst',
					name: 'Worst Actor',
					risk: 'High',
					spam_rate: 5.0,
					email_volume: 50000,
					industry: 'E-commerce',
					initial_cost: 200
				} as any
			];
			bluePostTeam.active_clients = ['client-bad', 'client-worse', 'client-worst'];
			// All clients missing at least one protection (violation)
			// client-bad: has listHygiene but no warmup
			// client-worse: has warmup but no listHygiene
			// client-worst: has neither (highest spam_rate = should be suspended)
			bluePostTeam.client_states = {
				'client-bad': {
					status: 'Active',
					first_active_round: 1,
					volumeModifiers: [
						{ id: 'lh-1', source: 'list_hygiene', multiplier: 0.9, applicableRounds: 'all' }
					],
					spamTrapModifiers: []
				},
				'client-worse': {
					status: 'Active',
					first_active_round: 1,
					volumeModifiers: [
						{ id: 'wu-1', source: 'warmup', multiplier: 0.5, applicableRounds: 'all' }
					],
					spamTrapModifiers: []
				},
				'client-worst': {
					status: 'Active',
					first_active_round: 1,
					volumeModifiers: [],
					spamTrapModifiers: []
				}
			};

			// When
			const result = runInvestigation({
				roomCode: session.roomCode,
				targetEsp: 'BluePost',
				voters: ['zmail', 'intake']
			});

			// Then
			expect(result.violationFound).toBe(true);
			expect(result.suspendedClient?.name).toBe('Worst Actor');
			expect(result.suspendedClient?.spamRate).toBe(5.0);
		});
	});

	describe('Scenario: Paused and already-suspended clients are not investigated', () => {
		test('Given only paused/suspended clients have violations, When investigation runs, Then no violations found', async () => {
			// Given
			const { session, bluePostTeam } = await createGameInPlanningPhase();

			// Add clients with different statuses
			bluePostTeam.available_clients = [
				{
					id: 'client-paused',
					name: 'Paused Risky',
					risk_level: 'high',
					spam_rate: 5.0,
					email_volume: 50000,
					industry: 'E-commerce',
					initial_cost: 200,
					onboarding_options: { warmup: false, listHygiene: false }
				} as any,
				{
					id: 'client-suspended',
					name: 'Already Suspended',
					risk_level: 'high',
					spam_rate: 4.0,
					email_volume: 50000,
					industry: 'E-commerce',
					initial_cost: 200,
					onboarding_options: { warmup: false, listHygiene: false }
				} as any,
				{
					id: 'client-safe',
					name: 'Active Safe',
					risk_level: 'high',
					spam_rate: 1.0,
					email_volume: 50000,
					industry: 'E-commerce',
					initial_cost: 200,
					onboarding_options: { warmup: true, listHygiene: true }
				} as any
			];
			bluePostTeam.active_clients = ['client-paused', 'client-suspended', 'client-safe'];
			bluePostTeam.client_states = {
				'client-paused': {
					status: 'Paused',
					first_active_round: 1,
					volumeModifiers: [],
					spamTrapModifiers: []
				},
				'client-suspended': {
					status: 'Suspended',
					first_active_round: 1,
					volumeModifiers: [],
					spamTrapModifiers: []
				},
				'client-safe': {
					status: 'Active',
					first_active_round: 1,
					volumeModifiers: [],
					spamTrapModifiers: []
				}
			};

			// When
			const result = runInvestigation({
				roomCode: session.roomCode,
				targetEsp: 'BluePost',
				voters: ['zmail', 'intake']
			});

			// Then
			expect(result.violationFound).toBe(false);
			expect(result.message).toContain('No violations detected');
		});
	});

	describe('Scenario: Investigation against ESP with empty portfolio', () => {
		test('Given ESP has no active clients, When investigation runs, Then no violations found', async () => {
			// Given
			const { session, bluePostTeam } = await createGameInPlanningPhase();
			bluePostTeam.available_clients = [];
			bluePostTeam.active_clients = [];
			bluePostTeam.client_states = {};

			// When
			const result = runInvestigation({
				roomCode: session.roomCode,
				targetEsp: 'BluePost',
				voters: ['zmail', 'intake']
			});

			// Then
			expect(result.violationFound).toBe(false);
			expect(result.message).toContain('No violations detected');
		});
	});

	describe('Scenario: Investigation updates client status to suspended', () => {
		test('Given client is suspended, When checking client state, Then status is suspended', async () => {
			// Given
			const { session, bluePostTeam } = await createGameWithESPClient({
				riskLevel: 'high',
				hasWarmup: false,
				hasListHygiene: true,
				spamRate: 2.0
			});

			// When
			const result = runInvestigation({
				roomCode: session.roomCode,
				targetEsp: 'BluePost',
				voters: ['zmail', 'intake']
			});

			// Then - Check the client is now suspended
			const updatedSession = getSession(session.roomCode);
			const bluePost = updatedSession?.esp_teams.find((t) => t.name === 'BluePost');
			const clientState = bluePost?.client_states?.[result.suspendedClient!.id];
			expect(clientState?.status).toBe('Suspended');
		});
	});
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a game session in planning phase with 3 ESP teams and 3 destinations
 */
async function createGameInPlanningPhase() {
	const facilitatorId = 'facilitator_test';
	const session = createGameSession(facilitatorId);

	// Add ESP teams
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
		displayName: 'Charlie',
		role: 'ESP',
		teamName: 'BluePost'
	});

	// Add Destinations
	joinGame({
		roomCode: session.roomCode,
		displayName: 'Grace',
		role: 'Destination',
		teamName: 'zmail'
	});
	joinGame({
		roomCode: session.roomCode,
		displayName: 'Henry',
		role: 'Destination',
		teamName: 'intake'
	});
	joinGame({
		roomCode: session.roomCode,
		displayName: 'Iris',
		role: 'Destination',
		teamName: 'yagle'
	});

	// Start game and allocate resources
	startGame({ roomCode: session.roomCode, facilitatorId });
	allocateResources({ roomCode: session.roomCode });
	await transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

	const updatedSession = getSession(session.roomCode);
	const zmailDest = updatedSession!.destinations.find((d) => d.name === 'zmail');
	const bluePostTeam = updatedSession!.esp_teams.find((t) => t.name === 'BluePost');

	return { session: updatedSession!, zmailDest, bluePostTeam: bluePostTeam! };
}

/**
 * Creates a game in planning phase with a specific client configuration for BluePost
 */
interface ClientConfig {
	riskLevel: 'low' | 'medium' | 'high';
	hasWarmup: boolean;
	hasListHygiene: boolean;
	spamRate: number;
}

async function createGameWithESPClient(config: ClientConfig) {
	const { session, zmailDest, bluePostTeam } = await createGameInPlanningPhase();

	// Map lowercase risk to capitalized risk expected by Client type
	const riskMap: Record<string, 'Low' | 'Medium' | 'High'> = {
		low: 'Low',
		medium: 'Medium',
		high: 'High'
	};

	// Configure BluePost with a specific test client
	const testClient = {
		id: 'test-client-1',
		name: 'Test Client',
		risk: riskMap[config.riskLevel], // Use 'risk' not 'risk_level', and capitalize
		spam_rate: config.spamRate,
		email_volume: 50000,
		industry: 'E-commerce',
		initial_cost: 200
	};

	// Build volumeModifiers based on config
	// hasWarmup() checks for { source: 'warmup' }
	// hasListHygiene() checks for { source: 'list_hygiene' }
	const volumeModifiers: any[] = [];
	const spamTrapModifiers: any[] = [];

	if (config.hasWarmup) {
		volumeModifiers.push({
			id: 'warmup-test',
			source: 'warmup',
			multiplier: 0.5,
			applicableRounds: 'all'
		});
	}
	if (config.hasListHygiene) {
		volumeModifiers.push({
			id: 'list-hygiene-test',
			source: 'list_hygiene',
			multiplier: 0.9,
			applicableRounds: 'all'
		});
		spamTrapModifiers.push({
			id: 'list-hygiene-spam-test',
			source: 'list_hygiene',
			multiplier: 0.5,
			applicableRounds: 'all'
		});
	}

	bluePostTeam.available_clients = [testClient as any];
	bluePostTeam.active_clients = ['test-client-1'];
	bluePostTeam.client_states = {
		'test-client-1': {
			status: 'Active',
			first_active_round: 1,
			volumeModifiers,
			spamTrapModifiers
		}
	};

	return { session, zmailDest, bluePostTeam };
}
