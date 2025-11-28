/**
 * US-1.4: Resources Allocation - Business Logic Tests
 *
 * Tests resource allocation functionality including:
 * - ESP teams receive starting resources (1000 credits, 70 reputation)
 * - Destinations receive specific budgets (Gmail: 500, Outlook: 350, Yahoo: 200)
 * - Shared pool creation (150 credits)
 * - Team state initialization
 * - Destination state initialization
 * - Custom configuration support
 * - Configuration validation
 * - Allocation rollback on failure
 * - Logging
 *
 * Uses ATDD approach following Gherkin scenarios from feature file
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { createGameSession, getSession, getAllSessions, deleteSession } from './session-manager';
import { joinGame, clearPlayers } from './player-manager';
import { startGame } from './game-start-manager';

// Resource allocation functions (to be implemented)
import {
	allocateResources,
	validateConfiguration,
	rollbackAllocation,
	type ResourceAllocationResult,
	type GameConfiguration
} from './resource-allocation-manager';

describe('Feature: Resources Allocation - Business Logic', () => {
	beforeEach(() => {
		// Clean up all sessions and players before each test
		const sessions = getAllSessions();
		sessions.forEach((session) => deleteSession(session.roomCode));
		clearPlayers();
	});

	// ============================================================================
	// STARTING RESOURCES DISTRIBUTION - ESP TEAMS
	// ============================================================================

	describe('Scenario: ESP teams receive starting resources', () => {
		test('Given 3 ESP teams have joined, When resource allocation starts, Then each ESP team receives 1000 credits and 70 reputation', () => {
			// Given - Create session with 3 ESP teams
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
				displayName: 'Charlie',
				role: 'ESP',
				teamName: 'BluePost'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Grace',
				role: 'Destination',
				teamName: 'Gmail'
			});

			// Start game to transition to resource_allocation phase
			startGame({ roomCode: session.roomCode, facilitatorId });

			// When - Resource allocation process starts
			const result = allocateResources({ roomCode: session.roomCode });

			// Then - Each ESP team should receive starting resources
			expect(result.success).toBe(true);

			const updatedSession = getSession(session.roomCode);
			expect(updatedSession).toBeDefined();

			const sendWave = updatedSession!.esp_teams.find((t) => t.name === 'SendWave');
			const mailMonkey = updatedSession!.esp_teams.find((t) => t.name === 'MailMonkey');
			const bluePost = updatedSession!.esp_teams.find((t) => t.name === 'BluePost');

			// Each team should have 1000 credits
			expect(sendWave?.credits).toBe(1000);
			expect(mailMonkey?.credits).toBe(1000);
			expect(bluePost?.credits).toBe(1000);

			// Each team should have 70 reputation for ALL destinations (not just active ones)
			expect(sendWave?.reputation).toEqual({ Gmail: 70, Outlook: 70, Yahoo: 70 });
			expect(mailMonkey?.reputation).toEqual({ Gmail: 70, Outlook: 70, Yahoo: 70 });
			expect(bluePost?.reputation).toEqual({ Gmail: 70, Outlook: 70, Yahoo: 70 });
		});

		test('When resource allocation starts, Then ESP team state should be initialized with empty arrays', () => {
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

			// When
			allocateResources({ roomCode: session.roomCode });

			// Then
			const updatedSession = getSession(session.roomCode);
			const sendWave = updatedSession!.esp_teams.find((t) => t.name === 'SendWave');

			expect(sendWave?.active_clients).toEqual([]);
			expect(sendWave?.owned_tech_upgrades).toEqual([]); // US-2.3
			expect(sendWave?.round_history).toEqual([]);
		});
	});

	// ============================================================================
	// STARTING RESOURCES DISTRIBUTION - DESTINATIONS
	// ============================================================================

	describe('Scenario: Destinations receive starting resources', () => {
		test('Given 3 Destination players joined, When resource allocation starts, Then each receives their specific budget', () => {
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

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Henry',
				role: 'Destination',
				teamName: 'Outlook'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Iris',
				role: 'Destination',
				teamName: 'Yahoo'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });

			// When
			allocateResources({ roomCode: session.roomCode });

			// Then
			const updatedSession = getSession(session.roomCode);
			const gmail = updatedSession!.destinations.find((d) => d.name === 'Gmail');
			const outlook = updatedSession!.destinations.find((d) => d.name === 'Outlook');
			const yahoo = updatedSession!.destinations.find((d) => d.name === 'Yahoo');

			expect(gmail?.budget).toBe(500);
			expect(outlook?.budget).toBe(350);
			expect(yahoo?.budget).toBe(200);
		});

		test('When resource allocation starts, Then destination state should be initialized correctly', () => {
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

			// When
			allocateResources({ roomCode: session.roomCode });

			// Then
			const updatedSession = getSession(session.roomCode);
			const gmail = updatedSession!.destinations.find((d) => d.name === 'Gmail');

			// US-2.6.1: Filtering policies should be initialized for all ESPs
			expect(gmail?.filtering_policies).toEqual({
				SendWave: {
					espName: 'SendWave',
					level: 'permissive',
					spamReduction: 0,
					falsePositives: 0
				}
			});
			expect(gmail?.esp_reputation).toEqual({});
			expect(gmail?.user_satisfaction).toBe(100);
		});
	});

	// ============================================================================
	// CONFIGURATION VALIDATION
	// ============================================================================

	describe('Scenario: Configuration validation', () => {
		test('When validating default configuration, Then it should pass validation', () => {
			// When
			const validation = validateConfiguration();

			// Then
			expect(validation.isValid).toBe(true);
			expect(validation.config).toBeDefined();
			expect(validation.config?.esp_starting_credits).toBe(1000);
			expect(validation.config?.esp_starting_reputation).toBe(70);
			expect(validation.config?.destination_budgets.Gmail).toBe(500);
			expect(validation.config?.destination_budgets.Outlook).toBe(350);
			expect(validation.config?.destination_budgets.Yahoo).toBe(200);
			expect(validation.config?.planning_phase_duration).toBe(300);
		});

		test('When validating custom configuration, Then it should accept valid custom values', () => {
			// When
			const customConfig: GameConfiguration = {
				esp_starting_credits: 1200,
				esp_starting_reputation: 80,
				destination_budgets: {
					Gmail: 600,
					Outlook: 400,
					Yahoo: 250
				},
				planning_phase_duration: 300
			};

			const validation = validateConfiguration(customConfig);

			// Then
			expect(validation.isValid).toBe(true);
			expect(validation.config?.esp_starting_credits).toBe(1200);
		});

		test('When configuration is missing required values, Then validation should fail', () => {
			// When
			const invalidConfig = {
				esp_starting_credits: undefined,
				esp_starting_reputation: 70
			} as any;

			const validation = validateConfiguration(invalidConfig);

			// Then
			expect(validation.isValid).toBe(false);
			expect(validation.error).toContain('missing');
		});
	});

	// ============================================================================
	// CUSTOM CONFIGURATION
	// ============================================================================

	describe('Scenario: Allocation succeeds with custom configuration', () => {
		test('Given facilitator has customized starting values, When allocation starts, Then ESP teams receive custom amounts', () => {
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

			const customConfig: GameConfiguration = {
				esp_starting_credits: 1200,
				esp_starting_reputation: 80,
				destination_budgets: {
					Gmail: 600,
					Outlook: 350,
					Yahoo: 200
				},
				planning_phase_duration: 300
			};

			// When
			allocateResources({ roomCode: session.roomCode, config: customConfig });

			// Then
			const updatedSession = getSession(session.roomCode);
			const sendWave = updatedSession!.esp_teams.find((t) => t.name === 'SendWave');
			const gmail = updatedSession!.destinations.find((d) => d.name === 'Gmail');

			expect(sendWave?.credits).toBe(1200);
			expect(sendWave?.reputation.Gmail).toBe(80);
			expect(gmail?.budget).toBe(600);
		});
	});

	// ============================================================================
	// ERROR HANDLING
	// ============================================================================

	describe('Scenario: Allocation fails due to missing configuration', () => {
		test('Given game session is missing configuration, When allocation starts, Then it should fail with error', () => {
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

			const invalidConfig = {
				esp_starting_credits: undefined
			} as any;

			// When
			const result = allocateResources({
				roomCode: session.roomCode,
				config: invalidConfig
			});

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toContain('Missing game configuration');

			// Game should remain in resource_allocation phase
			const updatedSession = getSession(session.roomCode);
			expect(updatedSession?.current_phase).toBe('resource_allocation');
		});
	});

	// ============================================================================
	// ROLLBACK MECHANISM
	// ============================================================================

	describe('Scenario: Allocation process interrupted - rollback', () => {
		test('Given allocation was partially completed, When rollback is triggered, Then resources should be reset', () => {
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

			// Manually set some resources (simulating partial allocation)
			const currentSession = getSession(session.roomCode);
			const sendWave = currentSession!.esp_teams.find((t) => t.name === 'SendWave');
			if (sendWave) {
				sendWave.credits = 500; // Partial allocation
			}

			// When - Rollback is triggered
			const rollbackResult = rollbackAllocation({ roomCode: session.roomCode });

			// Then
			expect(rollbackResult.success).toBe(true);

			const updatedSession = getSession(session.roomCode);
			const rolledBackTeam = updatedSession!.esp_teams.find((t) => t.name === 'SendWave');

			// Resources should be reset to 0
			expect(rolledBackTeam?.credits).toBe(0);
		});
	});

	// ============================================================================
	// ALLOCATION WITH MULTIPLE DESTINATIONS
	// ============================================================================

	describe('Scenario: ESP reputation is set for each destination', () => {
		test('Given multiple destinations joined, When allocation starts, Then ESP teams have reputation for each destination', () => {
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

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Henry',
				role: 'Destination',
				teamName: 'Outlook'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Iris',
				role: 'Destination',
				teamName: 'Yahoo'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });

			// When
			allocateResources({ roomCode: session.roomCode });

			// Then
			const updatedSession = getSession(session.roomCode);
			const sendWave = updatedSession!.esp_teams.find((t) => t.name === 'SendWave');

			expect(sendWave?.reputation).toEqual({
				Gmail: 70,
				Outlook: 70,
				Yahoo: 70
			});
		});
	});
});
