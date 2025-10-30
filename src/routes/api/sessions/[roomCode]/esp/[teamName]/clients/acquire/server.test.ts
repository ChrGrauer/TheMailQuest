/**
 * US-2.2: Client Marketplace - POST Acquire Client API Tests
 *
 * Tests the client acquisition endpoint
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { POST } from './+server';
import {
	createGameSession,
	getSession,
	deleteSession,
	getAllSessions
} from '$lib/server/game/session-manager';
import { joinGame, clearPlayers } from '$lib/server/game/player-manager';
import { startGame } from '$lib/server/game/game-start-manager';
import { allocateResources } from '$lib/server/game/resource-allocation-manager';

describe('POST /api/sessions/[roomCode]/esp/[teamName]/clients/acquire', () => {
	beforeEach(() => {
		// Clean up all sessions and players before each test
		const sessions = getAllSessions();
		sessions.forEach((session) => deleteSession(session.roomCode));
		clearPlayers();
	});

	// Helper to create request context
	function createRequestContext(roomCode: string, teamName: string, body: any) {
		return {
			params: { roomCode, teamName },
			request: {
				json: async () => body
			}
		} as any;
	}

	describe('Scenario: Successfully acquire a client', () => {
		test('Given sufficient credits, When acquiring client, Then acquisition succeeds', async () => {
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

			const updatedSession = getSession(session.roomCode);
			updatedSession!.current_round = 1;

			const team = updatedSession!.esp_teams.find((t) => t.name === 'SendWave');
			const clientToAcquire = team!.available_clients.find((c) => c.available_from_round === 1);
			const initialCredits = team!.credits;

			// When
			const request = createRequestContext(session.roomCode, 'SendWave', {
				clientId: clientToAcquire!.id
			});
			const response = await POST(request);
			const data = await response.json();

			// Then
			expect(data.success).toBe(true);
			expect(data.client).toBeDefined();
			expect(data.client.id).toBe(clientToAcquire!.id);
			expect(data.team.credits).toBe(initialCredits - clientToAcquire!.cost);
			expect(data.team.active_clients).toContain(clientToAcquire!.id);
		});
	});

	describe('Scenario: Cannot acquire client with insufficient credits', () => {
		test('Given insufficient credits, When acquiring client, Then 403 is returned', async () => {
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

			const updatedSession = getSession(session.roomCode);
			updatedSession!.current_round = 1;

			const team = updatedSession!.esp_teams.find((t) => t.name === 'SendWave');
			const clientToAcquire = team!.available_clients.find((c) => c.available_from_round === 1);

			// Set credits below cost
			team!.credits = clientToAcquire!.cost - 10;

			// When
			const request = createRequestContext(session.roomCode, 'SendWave', {
				clientId: clientToAcquire!.id
			});
			const response = await POST(request);
			const data = await response.json();

			// Then
			expect(response.status).toBe(403);
			expect(data.success).toBe(false);
			expect(data.reason).toBe('insufficient_credits');
		});
	});

	describe('Scenario: Cannot acquire premium client without tech requirements', () => {
		test('Given missing DMARC, When acquiring premium client, Then 403 is returned', async () => {
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

			const updatedSession = getSession(session.roomCode);
			updatedSession!.current_round = 3;

			const team = updatedSession!.esp_teams.find((t) => t.name === 'SendWave');
			const premiumClient = team!.available_clients.find((c) => c.type === 'premium_brand');

			// Set high credits and reputation but missing tech
			team!.credits = 5000;
			team!.reputation = { Gmail: 90, Outlook: 90, Yahoo: 90 };
			team!.technical_auth = ['spf', 'dkim']; // Missing DMARC

			// When
			const request = createRequestContext(session.roomCode, 'SendWave', {
				clientId: premiumClient!.id
			});
			const response = await POST(request);
			const data = await response.json();

			// Then
			expect(response.status).toBe(403);
			expect(data.success).toBe(false);
			expect(data.reason).toBe('missing_tech');
			expect(data.validation.missingTech).toContain('dmarc');
		});
	});

	describe('Scenario: Cannot acquire premium client with insufficient reputation', () => {
		test('Given reputation 80, When acquiring premium client requiring 85, Then 403 is returned', async () => {
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

			const updatedSession = getSession(session.roomCode);
			updatedSession!.current_round = 3;

			const team = updatedSession!.esp_teams.find((t) => t.name === 'SendWave');
			const premiumClient = team!.available_clients.find((c) => c.type === 'premium_brand');

			// Set high credits and all tech but low reputation
			team!.credits = 5000;
			team!.technical_auth = ['spf', 'dkim', 'dmarc'];
			team!.reputation = { Gmail: 82, Outlook: 78, Yahoo: 76 }; // Overall = 80

			// When
			const request = createRequestContext(session.roomCode, 'SendWave', {
				clientId: premiumClient!.id
			});
			const response = await POST(request);
			const data = await response.json();

			// Then
			expect(response.status).toBe(403);
			expect(data.success).toBe(false);
			expect(data.reason).toBe('insufficient_reputation');
			expect(data.validation.actualReputation).toBe(80);
			expect(data.validation.requiredReputation).toBe(85);
		});
	});

	describe('Scenario: Error handling', () => {
		test('Given invalid roomCode, When acquiring, Then 404 is returned', async () => {
			// When
			const request = createRequestContext('INVALID', 'SendWave', {
				clientId: 'client-001'
			});
			const response = await POST(request);
			const data = await response.json();

			// Then
			expect(response.status).toBe(404);
			expect(data.success).toBe(false);
			expect(data.error).toContain('Session not found');
		});

		test('Given invalid clientId, When acquiring, Then 404 is returned', async () => {
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

			// When
			const request = createRequestContext(session.roomCode, 'SendWave', {
				clientId: 'nonexistent-client'
			});
			const response = await POST(request);
			const data = await response.json();

			// Then
			expect(response.status).toBe(404);
			expect(data.success).toBe(false);
			expect(data.error).toContain('not found in marketplace');
		});

		test('Given missing clientId, When acquiring, Then 400 is returned', async () => {
			// Given
			const facilitatorId = 'facilitator_123';
			const session = createGameSession(facilitatorId);

			// When
			const request = createRequestContext(session.roomCode, 'SendWave', {});
			const response = await POST(request);
			const data = await response.json();

			// Then
			expect(response.status).toBe(400);
			expect(data.success).toBe(false);
			expect(data.error).toContain('Missing clientId');
		});
	});
});
