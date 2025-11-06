/**
 * US-2.2: Client Marketplace - GET Clients API Tests
 *
 * Tests the marketplace API endpoint that returns available clients
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { GET } from './+server';
import {
	createGameSession,
	getSession,
	deleteSession,
	getAllSessions
} from '$lib/server/game/session-manager';
import { joinGame, clearPlayers } from '$lib/server/game/player-manager';
import { startGame } from '$lib/server/game/game-start-manager';
import { allocateResources } from '$lib/server/game/resource-allocation-manager';

describe('GET /api/sessions/[roomCode]/esp/[teamName]/clients', () => {
	beforeEach(() => {
		// Clean up all sessions and players before each test
		const sessions = getAllSessions();
		sessions.forEach((session) => deleteSession(session.roomCode));
		clearPlayers();
	});

	// Helper to create request context
	function createRequestContext(roomCode: string, teamName: string) {
		return {
			params: { roomCode, teamName },
			url: new URL(`http://localhost/api/sessions/${roomCode}/esp/${teamName}/clients`)
		} as any;
	}

	describe('Scenario: Successfully fetch available clients', () => {
		test('Given game in round 1, When fetching clients, Then only round 1 clients are returned', async () => {
			// Given - Create game in round 1
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

			// Set to round 1
			const updatedSession = getSession(session.roomCode);
			updatedSession!.current_round = 1;

			// When
			const request = createRequestContext(session.roomCode, 'SendWave');
			const response = await GET(request);
			const data = await response.json();

			// Then
			expect(data.success).toBe(true);
			expect(data.clients).toBeDefined();
			expect(data.currentRound).toBe(1);

			// Round 1 should have 9 clients (3 Growing + 3 Re-engagement + 3 Event)
			expect(data.totalAvailable).toBe(9);

			// All returned clients should be available from round 1
			data.clients.forEach((client: any) => {
				expect(client.available_from_round).toBe(1);
			});
		});

		test('Given game in round 2, When fetching clients, Then round 1 and 2 clients are returned', async () => {
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

			// Set to round 2
			const updatedSession = getSession(session.roomCode);
			updatedSession!.current_round = 2;

			// When
			const request = createRequestContext(session.roomCode, 'SendWave');
			const response = await GET(request);
			const data = await response.json();

			// Then
			expect(data.success).toBe(true);
			expect(data.currentRound).toBe(2);

			// Round 2 should have 11 clients (9 from round 1 + 2 Aggressive Marketer)
			expect(data.totalAvailable).toBe(11);

			// All returned clients should be available from round 1 or 2
			data.clients.forEach((client: any) => {
				expect(client.available_from_round).toBeLessThanOrEqual(2);
			});
		});

		test('Given game in round 3, When fetching clients, Then all 13 clients are returned', async () => {
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

			// Set to round 3
			const updatedSession = getSession(session.roomCode);
			updatedSession!.current_round = 3;

			// When
			const request = createRequestContext(session.roomCode, 'SendWave');
			const response = await GET(request);
			const data = await response.json();

			// Then
			expect(data.success).toBe(true);
			expect(data.currentRound).toBe(3);
			expect(data.totalAvailable).toBe(13); // All clients
		});
	});

	describe('Scenario: Error handling', () => {
		test('Given invalid roomCode, When fetching clients, Then 404 is returned', async () => {
			// Given
			const invalidRoomCode = 'INVALID';

			// When
			const request = createRequestContext(invalidRoomCode, 'SendWave');
			const response = await GET(request);
			const data = await response.json();

			// Then
			expect(response.status).toBe(404);
			expect(data.success).toBe(false);
			expect(data.error).toContain('Session not found');
		});

		test('Given invalid teamName, When fetching clients, Then 404 is returned', async () => {
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

			// When - Request with non-existent team
			const request = createRequestContext(session.roomCode, 'InvalidTeam');
			const response = await GET(request);
			const data = await response.json();

			// Then
			expect(response.status).toBe(404);
			expect(data.success).toBe(false);
			expect(data.error).toContain('ESP team not found');
		});

		test('Given missing parameters, When fetching clients, Then 400 is returned', async () => {
			// Given
			const request = {
				params: { roomCode: '', teamName: '' },
				url: new URL('http://localhost/api/sessions//esp//clients')
			} as any;

			// When
			const response = await GET(request);
			const data = await response.json();

			// Then
			expect(response.status).toBe(400);
			expect(data.success).toBe(false);
			expect(data.error).toContain('Invalid parameters');
		});
	});

	describe('Scenario: Client filtering', () => {
		test('Given team with some clients acquired, When fetching, Then only unacquired clients are returned', async () => {
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

			// Simulate acquiring a round 1 client by moving it
			const updatedSession = getSession(session.roomCode);
			const team = updatedSession!.esp_teams.find((t) => t.name === 'SendWave');

			// Find a round 1 client to acquire
			const clientToAcquireIndex = team!.available_clients.findIndex(
				(c) => c.available_from_round === 1
			);
			const clientToAcquire = team!.available_clients[clientToAcquireIndex];

			// Remove it from available_clients
			team!.available_clients.splice(clientToAcquireIndex, 1);
			team!.active_clients.push(clientToAcquire.id);

			updatedSession!.current_round = 1;

			// When
			const request = createRequestContext(session.roomCode, 'SendWave');
			const response = await GET(request);
			const data = await response.json();

			// Then
			expect(data.success).toBe(true);
			// Should have 8 clients (9 - 1 acquired)
			expect(data.totalAvailable).toBe(8);

			// Acquired client should not be in the list
			const clientIds = data.clients.map((c: any) => c.id);
			expect(clientIds).not.toContain(clientToAcquire.id);
		});
	});
});
