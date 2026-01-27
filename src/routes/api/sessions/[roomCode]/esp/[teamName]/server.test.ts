/**
 * US-2.1: ESP Team Dashboard API - Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from './+server';
import { createGameSession, deleteSession } from '$lib/server/game/session-manager';
import { allocateResources } from '$lib/server/game/resource-allocation-manager';
import { transitionPhase } from '$lib/server/game/phase-manager';
import { initializeTimer } from '$lib/server/game/timer-manager';
import { DEFAULT_CONFIGURATION } from '$lib/server/game/resource-allocation-manager';

describe('GET /api/sessions/[roomCode]/esp/[teamName]', () => {
	let testRoomCode: string;

	beforeEach(async () => {
		// Create a test session
		const session = createGameSession('test-facilitator');
		testRoomCode = session.roomCode;

		// Add ESP teams
		session.esp_teams = [
			{
				name: 'SendWave',
				players: ['Alice'],
				budget: 0,
				clients: [],
				technical_stack: [],
				credits: 0,
				reputation: {},
				active_clients: [],
				owned_tech_upgrades: [],
				round_history: []
			},
			{
				name: 'MailMonkey',
				players: ['Bob'],
				budget: 0,
				clients: [],
				technical_stack: [],
				credits: 0,
				reputation: {},
				active_clients: [],
				owned_tech_upgrades: [],
				round_history: []
			}
		];

		// Add destinations
		session.destinations = [
			{
				name: 'zmail',
				players: ['Charlie'],
				budget: 0,
				filtering_policies: {},
				esp_reputation: {},
				user_satisfaction: 0
			},
			{
				name: 'intake',
				players: ['David'],
				budget: 0,
				filtering_policies: {},
				esp_reputation: {},
				user_satisfaction: 0
			},
			{
				name: 'yagle',
				players: ['Eve'],
				budget: 0,
				filtering_policies: {},
				esp_reputation: {},
				user_satisfaction: 0
			}
		];

		// Transition to resource_allocation phase first (from lobby)
		transitionPhase({ roomCode: testRoomCode, toPhase: 'resource_allocation' });

		// Allocate resources to initialize team data
		allocateResources({ roomCode: testRoomCode });

		// Transition to planning phase (sets round = 1)
		transitionPhase({ roomCode: testRoomCode, toPhase: 'planning' });

		// Initialize timer
		initializeTimer({ roomCode: testRoomCode, duration: 300 });
	});

	afterEach(() => {
		// Clean up test sessions
		if (testRoomCode) {
			deleteSession(testRoomCode);
		}
	});

	it('should return ESP team dashboard data', async () => {
		// Given: valid roomCode and teamName
		const request = new Request('http://localhost');
		const params = { roomCode: testRoomCode, teamName: 'SendWave' };

		// When: GET request is made
		const response = await GET({ request, params, locals: {}, url: new URL(request.url) });
		const data = await response.json();

		// Then: should return success with team data
		expect(data.success).toBe(true);
		expect(data.team).toBeDefined();
		expect(data.team.name).toBe('SendWave');
		expect(data.team.credits).toBe(700); // From resource allocation
		expect(data.team.reputation).toEqual({
			zmail: 70,
			intake: 70,
			yagle: 70
		});
		expect(data.team.active_clients).toEqual([]);
		expect(data.team.owned_tech_upgrades).toEqual([]);
	});

	it('should return game state information', async () => {
		// Given: valid roomCode and teamName
		const request = new Request('http://localhost');
		const params = { roomCode: testRoomCode, teamName: 'SendWave' };

		// When: GET request is made
		const response = await GET({ request, params, locals: {}, url: new URL(request.url) });
		const data = await response.json();

		// Then: should return game state
		expect(data.game).toBeDefined();
		expect(data.game.roomCode).toBe(testRoomCode);
		expect(data.game.current_round).toBe(1);
		expect(data.game.current_phase).toBe('planning');
		expect(data.game.timer).toBeDefined();
		expect(data.game.timer.duration).toBe(300); // 5 minutes in seconds
		expect(data.game.timer.isRunning).toBe(true);
	});

	it('should return destination weights', async () => {
		// Given: valid roomCode and teamName
		const request = new Request('http://localhost');
		const params = { roomCode: testRoomCode, teamName: 'SendWave' };

		// When: GET request is made
		const response = await GET({ request, params, locals: {}, url: new URL(request.url) });
		const data = await response.json();

		// Then: should return destination weights
		expect(data.destinations).toBeDefined();
		expect(data.destinations).toHaveLength(3);

		const zmail = data.destinations.find((d: any) => d.name === 'zmail');
		const intake = data.destinations.find((d: any) => d.name === 'intake');
		const yagle = data.destinations.find((d: any) => d.name === 'yagle');

		expect(zmail.weight).toBe(50);
		expect(intake.weight).toBe(30);
		expect(yagle.weight).toBe(20);
	});

	it('should calculate timer remaining time correctly', async () => {
		// Given: valid roomCode and teamName
		const request = new Request('http://localhost');
		const params = { roomCode: testRoomCode, teamName: 'SendWave' };

		// When: GET request is made
		const response = await GET({ request, params, locals: {}, url: new URL(request.url) });
		const data = await response.json();

		// Then: timer remaining should be close to duration (just started)
		expect(data.game.timer.remaining).toBeGreaterThan(295); // Allow 5 seconds for test execution
		expect(data.game.timer.remaining).toBeLessThanOrEqual(300);
	});

	it('should handle case-insensitive team name', async () => {
		// Given: teamName with different case
		const request = new Request('http://localhost');
		const params = { roomCode: testRoomCode, teamName: 'sendwave' }; // lowercase

		// When: GET request is made
		const response = await GET({ request, params, locals: {}, url: new URL(request.url) });
		const data = await response.json();

		// Then: should still find the team
		expect(data.success).toBe(true);
		expect(data.team.name).toBe('SendWave'); // Original case preserved
	});

	it('should return 404 when session does not exist', async () => {
		// Given: invalid roomCode
		const request = new Request('http://localhost');
		const params = { roomCode: 'INVALID', teamName: 'SendWave' };

		// When: GET request is made
		const response = await GET({ request, params, locals: {}, url: new URL(request.url) });
		const data = await response.json();

		// Then: should return 404 error
		expect(response.status).toBe(404);
		expect(data.success).toBe(false);
		expect(data.error).toBe('Session not found');
	});

	it('should return 404 when ESP team does not exist', async () => {
		// Given: valid roomCode but invalid teamName
		const request = new Request('http://localhost');
		const params = { roomCode: testRoomCode, teamName: 'NonExistent' };

		// When: GET request is made
		const response = await GET({ request, params, locals: {}, url: new URL(request.url) });
		const data = await response.json();

		// Then: should return 404 error
		expect(response.status).toBe(404);
		expect(data.success).toBe(false);
		expect(data.error).toBe('ESP team not found');
	});

	it('should handle multiple ESP teams correctly', async () => {
		// Given: multiple ESP teams in session
		const request1 = new Request('http://localhost');
		const params1 = { roomCode: testRoomCode, teamName: 'SendWave' };

		const request2 = new Request('http://localhost');
		const params2 = { roomCode: testRoomCode, teamName: 'MailMonkey' };

		// When: GET requests are made for different teams
		const response1 = await GET({
			request: request1,
			params: params1,
			locals: {},
			url: new URL(request1.url)
		});
		const response2 = await GET({
			request: request2,
			params: params2,
			locals: {},
			url: new URL(request2.url)
		});

		const data1 = await response1.json();
		const data2 = await response2.json();

		// Then: should return correct data for each team
		const initialCredits = DEFAULT_CONFIGURATION.esp_starting_credits;
		expect(data1.team.name).toBe('SendWave');
		expect(data2.team.name).toBe('MailMonkey');
		expect(data1.team.credits).toBe(initialCredits);
		expect(data2.team.credits).toBe(initialCredits);
	});

	it('should return empty arrays for teams without clients or tech', async () => {
		// Given: team with no clients or technical auth
		const request = new Request('http://localhost');
		const params = { roomCode: testRoomCode, teamName: 'SendWave' };

		// When: GET request is made
		const response = await GET({ request, params, locals: {}, url: new URL(request.url) });
		const data = await response.json();

		// Then: should return empty arrays
		expect(data.team.active_clients).toEqual([]);
		expect(data.team.owned_tech_upgrades).toEqual([]);
		expect(data.team.round_history).toEqual([]);
	});
});
