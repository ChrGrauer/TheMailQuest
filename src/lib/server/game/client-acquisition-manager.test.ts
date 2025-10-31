/**
 * US-2.2: Client Marketplace - Client Acquisition Manager Tests
 *
 * Tests client acquisition business logic including:
 * - Credit deduction on acquisition
 * - Move client from available_clients to active_clients
 * - Team state updates
 * - Error handling
 * - Immutability (return new team state)
 *
 * Uses ATDD approach following Gherkin scenarios from feature file
 */

import { describe, test, expect } from 'vitest';
import { acquireClient, type ClientAcquisitionResult } from './client-acquisition-manager';
import type { ESPTeam, Client } from './types';

describe('Feature: Client Marketplace - Acquisition Manager', () => {
	// Helper function to create a test ESP team
	function createTestTeam(overrides?: Partial<ESPTeam>): ESPTeam {
		return {
			name: 'SendWave',
			players: ['Alice'],
			budget: 0,
			clients: [],
			technical_stack: [],
			credits: 1000,
			reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
			active_clients: [],
			owned_tech_upgrades: ['spf', 'dkim', 'dmarc'],
			round_history: [],
			available_clients: [],
			...overrides
		};
	}

	// Helper function to create a test client
	function createTestClient(overrides?: Partial<Client>): Client {
		return {
			id: 'client-test-001',
			name: 'Test Client',
			type: 'growing_startup',
			cost: 150,
			revenue: 180,
			volume: 35000,
			risk: 'Medium',
			spam_rate: 1.2,
			available_from_round: 1,
			...overrides
		};
	}

	describe('Scenario: Successfully acquire a client', () => {
		test('Given team with 500 credits and client costing 150, When acquiring, Then credits reduce to 350', () => {
			// Given
			const client = createTestClient({ cost: 150 });
			const team = createTestTeam({
				credits: 500,
				available_clients: [client]
			});

			// When
			const result = acquireClient(team, client.id);

			// Then
			expect(result.success).toBe(true);
			expect(result.team).toBeDefined();
			expect(result.team!.credits).toBe(350);
		});

		test('Given client in available_clients, When acquiring, Then client is removed from marketplace', () => {
			// Given
			const client1 = createTestClient({ id: 'client-1', name: 'Client 1' });
			const client2 = createTestClient({ id: 'client-2', name: 'Client 2' });
			const team = createTestTeam({
				credits: 500,
				available_clients: [client1, client2]
			});

			// When
			const result = acquireClient(team, client1.id);

			// Then
			expect(result.success).toBe(true);
			expect(result.team!.available_clients).toHaveLength(1);
			expect(result.team!.available_clients[0].id).toBe('client-2');
		});

		test('Given client acquired, When checking active_clients, Then client ID is added', () => {
			// Given
			const client = createTestClient({ id: 'client-test-001' });
			const team = createTestTeam({
				credits: 500,
				available_clients: [client],
				active_clients: []
			});

			// When
			const result = acquireClient(team, client.id);

			// Then
			expect(result.success).toBe(true);
			expect(result.team!.active_clients).toContain('client-test-001');
		});

		test('Given team with existing active clients, When acquiring new client, Then both are in active_clients', () => {
			// Given
			const existingClientId = 'client-existing-001';
			const newClient = createTestClient({ id: 'client-new-002' });
			const team = createTestTeam({
				credits: 500,
				available_clients: [newClient],
				active_clients: [existingClientId]
			});

			// When
			const result = acquireClient(team, newClient.id);

			// Then
			expect(result.success).toBe(true);
			expect(result.team!.active_clients).toHaveLength(2);
			expect(result.team!.active_clients).toContain(existingClientId);
			expect(result.team!.active_clients).toContain('client-new-002');
		});
	});

	describe('Scenario: Failed acquisition returns error', () => {
		test('Given client not in available_clients, When acquiring, Then error is returned', () => {
			// Given
			const team = createTestTeam({
				credits: 500,
				available_clients: []
			});

			// When
			const result = acquireClient(team, 'nonexistent-client');

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error).toContain('not found');
			expect(result.team).toBeUndefined();
		});

		test('Given client already in active_clients, When acquiring, Then error is returned', () => {
			// Given
			const client = createTestClient({ id: 'client-001' });
			const team = createTestTeam({
				credits: 500,
				available_clients: [],
				active_clients: ['client-001'] // Already owned
			});

			// When
			const result = acquireClient(team, client.id);

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.error).toContain('already');
			expect(result.team).toBeUndefined();
		});
	});

	describe('Scenario: Immutability - original team unchanged', () => {
		test('Given team state, When acquiring client, Then original team is not mutated', () => {
			// Given
			const client = createTestClient({ cost: 150 });
			const team = createTestTeam({
				credits: 500,
				available_clients: [client]
			});

			// Capture original state
			const originalCredits = team.credits;
			const originalAvailableCount = team.available_clients.length;
			const originalActiveCount = team.active_clients.length;

			// When
			const result = acquireClient(team, client.id);

			// Then - Original team unchanged
			expect(team.credits).toBe(originalCredits);
			expect(team.available_clients.length).toBe(originalAvailableCount);
			expect(team.active_clients.length).toBe(originalActiveCount);

			// But result has updated values
			expect(result.team!.credits).toBe(350);
			expect(result.team!.available_clients.length).toBe(0);
			expect(result.team!.active_clients.length).toBe(1);
		});
	});

	describe('Scenario: Return acquired client in result', () => {
		test('Given successful acquisition, When result is checked, Then acquired client is included', () => {
			// Given
			const client = createTestClient({
				id: 'client-001',
				name: 'Tech Innovators',
				cost: 150
			});
			const team = createTestTeam({
				credits: 500,
				available_clients: [client]
			});

			// When
			const result = acquireClient(team, client.id);

			// Then
			expect(result.success).toBe(true);
			expect(result.acquiredClient).toBeDefined();
			expect(result.acquiredClient!.id).toBe('client-001');
			expect(result.acquiredClient!.name).toBe('Tech Innovators');
		});
	});

	describe('Scenario: Edge cases', () => {
		test('Given team with exact credits matching cost, When acquiring, Then credits become 0', () => {
			// Given
			const client = createTestClient({ cost: 200 });
			const team = createTestTeam({
				credits: 200,
				available_clients: [client]
			});

			// When
			const result = acquireClient(team, client.id);

			// Then
			expect(result.success).toBe(true);
			expect(result.team!.credits).toBe(0);
		});

		test('Given last available client, When acquiring, Then available_clients becomes empty array', () => {
			// Given
			const client = createTestClient();
			const team = createTestTeam({
				credits: 500,
				available_clients: [client]
			});

			// When
			const result = acquireClient(team, client.id);

			// Then
			expect(result.success).toBe(true);
			expect(result.team!.available_clients).toEqual([]);
		});

		test('Given multiple clients with same name but different IDs, When acquiring by ID, Then correct client is acquired', () => {
			// Given
			const client1 = createTestClient({
				id: 'client-001',
				name: 'Tech Innovators',
				cost: 150
			});
			const client2 = createTestClient({
				id: 'client-002',
				name: 'Tech Innovators',
				cost: 160
			});
			const team = createTestTeam({
				credits: 500,
				available_clients: [client1, client2]
			});

			// When
			const result = acquireClient(team, 'client-001');

			// Then
			expect(result.success).toBe(true);
			expect(result.team!.credits).toBe(350); // 500 - 150
			expect(result.team!.available_clients).toHaveLength(1);
			expect(result.team!.available_clients[0].id).toBe('client-002');
		});
	});

	describe('Scenario: Validation is not performed by acquisition manager', () => {
		test('Given client with insufficient credits, When acquiring, Then acquisition still proceeds', () => {
			// Given - This scenario tests that validation is NOT done here
			// Validation should be done before calling acquireClient
			const client = createTestClient({ cost: 200 });
			const team = createTestTeam({
				credits: 100, // Insufficient
				available_clients: [client]
			});

			// When
			const result = acquireClient(team, client.id);

			// Then - Acquisition proceeds (credits can go negative)
			// In production, validation should prevent this call
			expect(result.success).toBe(true);
			expect(result.team!.credits).toBe(-100); // This is intentional - validation happens elsewhere
		});
	});
});
