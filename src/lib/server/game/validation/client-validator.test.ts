/**
 * US-2.2: Client Marketplace - Client Validator Tests
 *
 * Tests client acquisition validation including:
 * - Credit requirement validation
 * - Tech requirement validation (SPF+DKIM+DMARC for Premium)
 * - Reputation requirement validation (>= 85 for Premium)
 * - Overall reputation calculation (weighted average)
 * - Client existence validation
 * - Already owned validation
 *
 * Uses ATDD approach following Gherkin scenarios from feature file
 */

import { describe, test, expect } from 'vitest';
import {
	validateClientAcquisition,
	calculateOverallReputation,
	type ClientAcquisitionValidation
} from './client-validator';
import type { ESPTeam, Client, Destination } from '../types';

describe('Feature: Client Marketplace - Validation', () => {
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
			owned_tech_upgrades: ['spf', 'dkim'],
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

	// Helper function to create test destinations
	function createTestDestinations(): Destination[] {
		return [
			{
				name: 'Gmail',
				players: [],
				budget: 500,
				filtering_policies: {},
				esp_reputation: {},
				user_satisfaction: 100
			},
			{
				name: 'Outlook',
				players: [],
				budget: 350,
				filtering_policies: {},
				esp_reputation: {},
				user_satisfaction: 100
			},
			{
				name: 'Yahoo',
				players: [],
				budget: 200,
				filtering_policies: {},
				esp_reputation: {},
				user_satisfaction: 100
			}
		];
	}

	describe('Scenario: Calculate overall reputation (weighted average)', () => {
		test('Given reputation scores and destination weights, When calculating, Then weighted average is correct', () => {
			// Given - Gmail 50%, Outlook 30%, Yahoo 20%
			const destinations = createTestDestinations();
			const reputation = { Gmail: 90, Outlook: 80, Yahoo: 70 };

			// When
			const overall = calculateOverallReputation(reputation, destinations);

			// Then - (90*50 + 80*30 + 70*20) / 100 = (4500 + 2400 + 1400) / 100 = 83
			expect(overall).toBe(83);
		});

		test('Given equal reputation scores, When calculating, Then result equals that score', () => {
			// Given
			const destinations = createTestDestinations();
			const reputation = { Gmail: 75, Outlook: 75, Yahoo: 75 };

			// When
			const overall = calculateOverallReputation(reputation, destinations);

			// Then
			expect(overall).toBe(75);
		});

		test('Given reputation scores, When calculating, Then result is rounded to nearest integer', () => {
			// Given
			const destinations = createTestDestinations();
			const reputation = { Gmail: 85, Outlook: 72, Yahoo: 58 };

			// When
			const overall = calculateOverallReputation(reputation, destinations);

			// Then - (85*50 + 72*30 + 58*20) / 100 = (4250 + 2160 + 1160) / 100 = 75.7 → 76
			expect(overall).toBe(76);
		});
	});

	describe('Scenario: Successfully validate client acquisition with sufficient credits', () => {
		test('Given team with 500 credits and client costing 150, When validating, Then acquisition is allowed', () => {
			// Given
			const team = createTestTeam({ credits: 500 });
			const client = createTestClient({ cost: 150 });
			team.available_clients = [client];
			const destinations = createTestDestinations();

			// When
			const validation = validateClientAcquisition(team, client, 1, destinations);

			// Then
			expect(validation.canAcquire).toBe(true);
			expect(validation.reason).toBeUndefined();
		});
	});

	describe('Scenario: Cannot acquire client with insufficient credits', () => {
		test('Given team with 100 credits and client costing 200, When validating, Then acquisition is denied', () => {
			// Given
			const team = createTestTeam({ credits: 100 });
			const client = createTestClient({ cost: 200 });
			team.available_clients = [client];
			const destinations = createTestDestinations();

			// When
			const validation = validateClientAcquisition(team, client, 1, destinations);

			// Then
			expect(validation.canAcquire).toBe(false);
			expect(validation.reason).toBe('insufficient_credits');
		});
	});

	describe('Scenario: Premium client with all requirements met', () => {
		test('Given team with SPF+DKIM+DMARC and reputation 88, When validating premium client, Then acquisition is allowed', () => {
			// Given
			const team = createTestTeam({
				credits: 500,
				owned_tech_upgrades: ['spf', 'dkim', 'dmarc'],
				reputation: { Gmail: 90, Outlook: 85, Yahoo: 85 } // Overall = 87.5 → 88
			});
			const premiumClient = createTestClient({
				type: 'premium_brand',
				cost: 300,
				requirements: {
					tech: ['spf', 'dkim', 'dmarc'],
					reputation: 85
				},
				available_from_round: 3
			});
			team.available_clients = [premiumClient];
			const destinations = createTestDestinations();

			// When
			const validation = validateClientAcquisition(team, premiumClient, 3, destinations);

			// Then
			expect(validation.canAcquire).toBe(true);
			expect(validation.reason).toBeUndefined();
		});
	});

	describe('Scenario: Cannot acquire premium client without tech requirements', () => {
		test('Given team with only SPF and DKIM, When validating premium client requiring all three, Then acquisition is denied', () => {
			// Given
			const team = createTestTeam({
				credits: 500,
				owned_tech_upgrades: ['spf', 'dkim'], // Missing DMARC
				reputation: { Gmail: 90, Outlook: 85, Yahoo: 85 }
			});
			const premiumClient = createTestClient({
				type: 'premium_brand',
				cost: 300,
				requirements: {
					tech: ['spf', 'dkim', 'dmarc'],
					reputation: 85
				}
			});
			team.available_clients = [premiumClient];
			const destinations = createTestDestinations();

			// When
			const validation = validateClientAcquisition(team, premiumClient, 3, destinations);

			// Then
			expect(validation.canAcquire).toBe(false);
			expect(validation.reason).toBe('missing_tech');
			expect(validation.missingTech).toContain('dmarc');
			expect(validation.missingTech).not.toContain('spf');
			expect(validation.missingTech).not.toContain('dkim');
		});

		test('Given team with no tech, When validating premium client, Then all required tech is listed as missing', () => {
			// Given
			const team = createTestTeam({
				credits: 500,
				owned_tech_upgrades: [], // No tech
				reputation: { Gmail: 90, Outlook: 85, Yahoo: 85 }
			});
			const premiumClient = createTestClient({
				type: 'premium_brand',
				cost: 300,
				requirements: {
					tech: ['spf', 'dkim', 'dmarc'],
					reputation: 85
				}
			});
			team.available_clients = [premiumClient];
			const destinations = createTestDestinations();

			// When
			const validation = validateClientAcquisition(team, premiumClient, 3, destinations);

			// Then
			expect(validation.canAcquire).toBe(false);
			expect(validation.reason).toBe('missing_tech');
			expect(validation.missingTech).toEqual(['spf', 'dkim', 'dmarc']);
		});
	});

	describe('Scenario: Cannot acquire premium client with insufficient reputation', () => {
		test('Given team with reputation 80 and premium client requiring 85, When validating, Then acquisition is denied', () => {
			// Given
			const team = createTestTeam({
				credits: 500,
				owned_tech_upgrades: ['spf', 'dkim', 'dmarc'],
				reputation: { Gmail: 82, Outlook: 78, Yahoo: 76 } // Overall = 80
			});
			const premiumClient = createTestClient({
				type: 'premium_brand',
				cost: 300,
				requirements: {
					tech: ['spf', 'dkim', 'dmarc'],
					reputation: 85
				}
			});
			team.available_clients = [premiumClient];
			const destinations = createTestDestinations();

			// When
			const validation = validateClientAcquisition(team, premiumClient, 3, destinations);

			// Then
			expect(validation.canAcquire).toBe(false);
			expect(validation.reason).toBe('insufficient_reputation');
			expect(validation.requiredReputation).toBe(85);
			expect(validation.actualReputation).toBe(80);
		});

		test('Given team with reputation exactly 85, When validating premium client requiring 85, Then acquisition is allowed', () => {
			// Given - Calculate exact 85: Gmail=85, Outlook=85, Yahoo=85
			const team = createTestTeam({
				credits: 500,
				owned_tech_upgrades: ['spf', 'dkim', 'dmarc'],
				reputation: { Gmail: 85, Outlook: 85, Yahoo: 85 } // Overall = 85
			});
			const premiumClient = createTestClient({
				type: 'premium_brand',
				cost: 300,
				requirements: {
					tech: ['spf', 'dkim', 'dmarc'],
					reputation: 85
				}
			});
			team.available_clients = [premiumClient];
			const destinations = createTestDestinations();

			// When
			const validation = validateClientAcquisition(team, premiumClient, 3, destinations);

			// Then
			expect(validation.canAcquire).toBe(true);
		});
	});

	describe('Scenario: Cannot acquire client not in available_clients', () => {
		test('Given client not in team available_clients, When validating, Then acquisition is denied', () => {
			// Given
			const team = createTestTeam({ credits: 500 });
			const client = createTestClient();
			team.available_clients = []; // Empty marketplace
			const destinations = createTestDestinations();

			// When
			const validation = validateClientAcquisition(team, client, 1, destinations);

			// Then
			expect(validation.canAcquire).toBe(false);
			expect(validation.reason).toBe('client_not_found');
		});
	});

	describe('Scenario: Cannot acquire client already owned', () => {
		test('Given client already in active_clients, When validating, Then acquisition is denied', () => {
			// Given
			const client = createTestClient();
			const team = createTestTeam({ credits: 500 });
			team.available_clients = []; // Not in marketplace
			team.active_clients = [client.id]; // Already owned
			const destinations = createTestDestinations();

			// When
			const validation = validateClientAcquisition(team, client, 1, destinations);

			// Then
			expect(validation.canAcquire).toBe(false);
			expect(validation.reason).toBe('already_owned');
		});
	});

	describe('Scenario: Multiple validation failures prioritized correctly', () => {
		test('Given client not found AND insufficient credits, When validating, Then client_not_found is reported first', () => {
			// Given
			const team = createTestTeam({ credits: 50 });
			const client = createTestClient({ cost: 200 });
			team.available_clients = []; // Not in marketplace
			const destinations = createTestDestinations();

			// When
			const validation = validateClientAcquisition(team, client, 1, destinations);

			// Then - client_not_found takes priority
			expect(validation.canAcquire).toBe(false);
			expect(validation.reason).toBe('client_not_found');
		});

		test('Given premium client with missing tech AND insufficient reputation, When validating, Then missing_tech is reported first', () => {
			// Given
			const team = createTestTeam({
				credits: 500,
				owned_tech_upgrades: ['spf'], // Missing DKIM and DMARC
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 } // Overall = 70 (insufficient)
			});
			const premiumClient = createTestClient({
				type: 'premium_brand',
				cost: 300,
				requirements: {
					tech: ['spf', 'dkim', 'dmarc'],
					reputation: 85
				}
			});
			team.available_clients = [premiumClient];
			const destinations = createTestDestinations();

			// When
			const validation = validateClientAcquisition(team, premiumClient, 3, destinations);

			// Then - missing_tech takes priority
			expect(validation.canAcquire).toBe(false);
			expect(validation.reason).toBe('missing_tech');
		});
	});

	describe('Scenario: Non-premium clients have no tech/reputation requirements', () => {
		test('Given non-premium client, When team has no tech or low reputation, Then acquisition is still allowed if credits sufficient', () => {
			// Given
			const team = createTestTeam({
				credits: 500,
				owned_tech_upgrades: [], // No tech
				reputation: { Gmail: 50, Outlook: 50, Yahoo: 50 } // Low reputation
			});
			const growingStartupClient = createTestClient({
				type: 'growing_startup',
				cost: 150
			});
			team.available_clients = [growingStartupClient];
			const destinations = createTestDestinations();

			// When
			const validation = validateClientAcquisition(
				team,
				growingStartupClient,
				1,
				destinations
			);

			// Then
			expect(validation.canAcquire).toBe(true);
		});
	});
});
