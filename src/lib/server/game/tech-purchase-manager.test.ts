/**
 * US-2.3: Technical Infrastructure Shop - Tech Purchase Manager Tests
 *
 * Tests tech purchase business logic including:
 * - Credit deduction on purchase
 * - Add tech to owned_tech_upgrades
 * - Team state updates
 * - Error handling
 * - Immutability (return new team state)
 *
 * Uses ATDD approach following Gherkin scenarios from feature file
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
	purchaseTechUpgrade,
	type TechPurchaseResult
} from './tech-purchase-manager';
import { createGameSession, deleteSession, getSession, getAllSessions } from './session-manager';
import { joinGame, clearPlayers } from './player-manager';
import { startGame } from './game-start-manager';
import { allocateResources } from './resource-allocation-manager';

describe('Feature: Technical Infrastructure Shop - Purchase Manager', () => {
	let testRoomCode: string;

	beforeEach(() => {
		// Clean up all sessions and players before each test
		const sessions = getAllSessions();
		sessions.forEach((session) => deleteSession(session.roomCode));
		clearPlayers();

		// Create a test session
		const facilitatorId = 'facilitator_123';
		const session = createGameSession(facilitatorId);
		testRoomCode = session.roomCode;

		// Add ESP team player
		joinGame({
			roomCode: testRoomCode,
			displayName: 'Alice',
			role: 'ESP',
			teamName: 'SendWave'
		});

		// Add destination player
		joinGame({
			roomCode: testRoomCode,
			displayName: 'Bob',
			role: 'Destination',
			teamName: 'Gmail'
		});

		// Start game and allocate resources
		startGame({ roomCode: testRoomCode, facilitatorId });
		allocateResources({ roomCode: testRoomCode });
	});

	// ============================================================================
	// SUCCESSFUL PURCHASE
	// ============================================================================

	describe('Scenario: Successfully purchase a tech upgrade', () => {
		test('Given sufficient credits, When purchasing SPF, Then credits deducted and tech added', () => {
			// Given
			const session = getSession(testRoomCode)!;
			const team = session.esp_teams.find((t) => t.name === 'SendWave')!;
			const initialCredits = team.credits;

			// When
			const result = purchaseTechUpgrade(testRoomCode, 'SendWave', 'spf');

			// Then
			expect(result.success).toBe(true);
			expect(result.error).toBeUndefined();
			expect(result.updatedTeam).toBeDefined();

			const updatedSession = getSession(testRoomCode)!;
			const updatedTeam = updatedSession.esp_teams.find((t) => t.name === 'SendWave')!;

			// Credits should be deducted (SPF costs 100)
			expect(updatedTeam.credits).toBe(initialCredits - 100);

			// Tech should be added to owned_tech_upgrades
			expect(updatedTeam.owned_tech_upgrades).toContain('spf');
		});

		test('Given SPF owned, When purchasing DKIM, Then DKIM added to upgrades list', () => {
			// Given - Purchase SPF first
			purchaseTechUpgrade(testRoomCode, 'SendWave', 'spf');

			const session = getSession(testRoomCode)!;
			const team = session.esp_teams.find((t) => t.name === 'SendWave')!;
			const initialCredits = team.credits;

			// When - Purchase DKIM
			const result = purchaseTechUpgrade(testRoomCode, 'SendWave', 'dkim');

			// Then
			expect(result.success).toBe(true);

			const updatedSession = getSession(testRoomCode)!;
			const updatedTeam = updatedSession.esp_teams.find((t) => t.name === 'SendWave')!;

			// Both upgrades should be owned
			expect(updatedTeam.owned_tech_upgrades).toContain('spf');
			expect(updatedTeam.owned_tech_upgrades).toContain('dkim');

			// Credits should be deducted (DKIM costs 150)
			expect(updatedTeam.credits).toBe(initialCredits - 150);
		});

		test('Given independent upgrade, When purchasing Content Filtering, Then succeeds without dependencies', () => {
			// When
			const result = purchaseTechUpgrade(testRoomCode, 'SendWave', 'content-filtering');

			// Then
			expect(result.success).toBe(true);

			const session = getSession(testRoomCode)!;
			const team = session.esp_teams.find((t) => t.name === 'SendWave')!;

			expect(team.owned_tech_upgrades).toContain('content-filtering');
		});
	});

	// ============================================================================
	// PURCHASE FAILURES
	// ============================================================================

	describe('Scenario: Purchase fails due to insufficient credits', () => {
		test('Given 50 credits, When purchasing SPF (costs 100), Then purchase fails', () => {
			// Given
			const session = getSession(testRoomCode)!;
			const team = session.esp_teams.find((t) => t.name === 'SendWave')!;
			team.credits = 50; // Set insufficient credits

			// When
			const result = purchaseTechUpgrade(testRoomCode, 'SendWave', 'spf');

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toContain('Insufficient credits');

			// Team state should not change
			const unchangedSession = getSession(testRoomCode)!;
			const unchangedTeam = unchangedSession.esp_teams.find((t) => t.name === 'SendWave')!;

			expect(unchangedTeam.credits).toBe(50);
			expect(unchangedTeam.owned_tech_upgrades).not.toContain('spf');
		});
	});

	describe('Scenario: Purchase fails due to unmet dependencies', () => {
		test('Given no upgrades, When purchasing DKIM, Then purchase fails', () => {
			// When
			const result = purchaseTechUpgrade(testRoomCode, 'SendWave', 'dkim');

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toMatch(/Missing required|dependencies/i);

			// Tech should not be added
			const session = getSession(testRoomCode)!;
			const team = session.esp_teams.find((t) => t.name === 'SendWave')!;

			expect(team.owned_tech_upgrades).not.toContain('dkim');
		});

		test('Given only SPF, When purchasing DMARC, Then purchase fails (missing DKIM)', () => {
			// Given
			purchaseTechUpgrade(testRoomCode, 'SendWave', 'spf');

			// When
			const result = purchaseTechUpgrade(testRoomCode, 'SendWave', 'dmarc');

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toMatch(/Missing required|dependencies/i);

			// DMARC should not be added
			const session = getSession(testRoomCode)!;
			const team = session.esp_teams.find((t) => t.name === 'SendWave')!;

			expect(team.owned_tech_upgrades).toContain('spf');
			expect(team.owned_tech_upgrades).not.toContain('dmarc');
		});
	});

	describe('Scenario: Purchase fails when already owned', () => {
		test('Given SPF owned, When purchasing SPF again, Then purchase fails', () => {
			// Given
			purchaseTechUpgrade(testRoomCode, 'SendWave', 'spf');

			const session = getSession(testRoomCode)!;
			const team = session.esp_teams.find((t) => t.name === 'SendWave')!;
			const creditsBefore = team.credits;

			// When
			const result = purchaseTechUpgrade(testRoomCode, 'SendWave', 'spf');

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toContain('already');

			// Credits should not be deducted again
			const unchangedSession = getSession(testRoomCode)!;
			const unchangedTeam = unchangedSession.esp_teams.find((t) => t.name === 'SendWave')!;

			expect(unchangedTeam.credits).toBe(creditsBefore);
		});
	});

	// ============================================================================
	// COMPLETE AUTHENTICATION STACK PURCHASE
	// ============================================================================

	describe('Scenario: Purchase complete authentication stack (SPF → DKIM → DMARC)', () => {
		test('Given sufficient credits, When purchasing all three in order, Then all succeed', () => {
			// When - Purchase in dependency order
			const spfResult = purchaseTechUpgrade(testRoomCode, 'SendWave', 'spf');
			const dkimResult = purchaseTechUpgrade(testRoomCode, 'SendWave', 'dkim');
			const dmarcResult = purchaseTechUpgrade(testRoomCode, 'SendWave', 'dmarc');

			// Then
			expect(spfResult.success).toBe(true);
			expect(dkimResult.success).toBe(true);
			expect(dmarcResult.success).toBe(true);

			const session = getSession(testRoomCode)!;
			const team = session.esp_teams.find((t) => t.name === 'SendWave')!;

			// All three should be owned
			expect(team.owned_tech_upgrades).toContain('spf');
			expect(team.owned_tech_upgrades).toContain('dkim');
			expect(team.owned_tech_upgrades).toContain('dmarc');

			// Total cost: 100 + 150 + 200 = 450 credits
			expect(team.credits).toBe(1000 - 450);
		});
	});

	// ============================================================================
	// ERROR HANDLING
	// ============================================================================

	describe('Scenario: Handle invalid inputs gracefully', () => {
		test('Given invalid room code, When purchasing tech, Then returns error', () => {
			// When
			const result = purchaseTechUpgrade('INVALID', 'SendWave', 'spf');

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});

		test('Given invalid team name, When purchasing tech, Then returns error', () => {
			// When
			const result = purchaseTechUpgrade(testRoomCode, 'InvalidTeam', 'spf');

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toContain('not found');
		});

		test('Given invalid upgrade ID, When purchasing tech, Then returns error', () => {
			// When
			const result = purchaseTechUpgrade(testRoomCode, 'SendWave', 'invalid-upgrade-id');

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toContain('not found');
		});
	});

	// ============================================================================
	// RESULT STRUCTURE
	// ============================================================================

	describe('Scenario: Purchase result includes updated team state', () => {
		test('Given successful purchase, When purchasing SPF, Then result includes updated team', () => {
			// When
			const result = purchaseTechUpgrade(testRoomCode, 'SendWave', 'spf');

			// Then
			expect(result.success).toBe(true);
			expect(result.updatedTeam).toBeDefined();
			expect(result.updatedTeam?.name).toBe('SendWave');
			expect(result.updatedTeam?.owned_tech_upgrades).toContain('spf');
		});

		test('Given failed purchase, When attempting invalid purchase, Then no updated team', () => {
			// When
			const result = purchaseTechUpgrade(testRoomCode, 'SendWave', 'dkim'); // Missing SPF dependency

			// Then
			expect(result.success).toBe(false);
			expect(result.updatedTeam).toBeUndefined();
		});
	});
});
