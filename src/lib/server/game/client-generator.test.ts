/**
 * US-2.2: Client Marketplace - Client Generator Tests
 *
 * Tests client generation functionality including:
 * - Generate 13 unique clients per ESP team
 * - Apply ±10% variance to revenue, volume, spam_rate
 * - Assign unique IDs and names
 * - Set correct client types and properties
 * - Premium clients have correct requirements
 * - Client availability by round
 *
 * Uses ATDD approach following Gherkin scenarios from feature file
 */

import { describe, test, expect } from 'vitest';
import { generateClientStockForTeam } from './client-generator';
import type { Client } from './types';
import { CLIENT_PROFILES, CLIENT_NAMES } from '$lib/config/client-profiles';

describe('Feature: Client Marketplace - Client Generator', () => {
	describe('Scenario: Generate 13 clients for ESP team', () => {
		test('Given an ESP team name, When generating client stock, Then 13 unique clients are created', () => {
			// Given
			const teamName = 'SendWave';
			const destinations = ['Gmail', 'Outlook', 'Yahoo'];

			// When
			const clients = generateClientStockForTeam(teamName, destinations);

			// Then
			expect(clients).toHaveLength(13);

			// All clients should have unique IDs
			const ids = clients.map((c) => c.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(13);

			// All clients should have unique names
			const names = clients.map((c) => c.name);
			const uniqueNames = new Set(names);
			expect(uniqueNames.size).toBe(13);
		});

		test('Given an ESP team, When generating clients, Then IDs follow pattern "client-{teamName}-{index}"', () => {
			// Given
			const teamName = 'SendWave';
			const destinations = ['Gmail', 'Outlook', 'Yahoo'];

			// When
			const clients = generateClientStockForTeam(teamName, destinations);

			// Then
			clients.forEach((client, index) => {
				expect(client.id).toMatch(/^client-SendWave-\d+$/);
			});
		});

		test('Given client profiles, When generating clients, Then correct distribution is maintained (2 Premium, 3 Growing, 3 Re-engagement, 2 Aggressive, 3 Event)', () => {
			// Given
			const teamName = 'SendWave';
			const destinations = ['Gmail', 'Outlook', 'Yahoo'];

			// When
			const clients = generateClientStockForTeam(teamName, destinations);

			// Then
			const typeCount = clients.reduce(
				(acc, client) => {
					acc[client.type] = (acc[client.type] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>
			);

			expect(typeCount['premium_brand']).toBe(2);
			expect(typeCount['growing_startup']).toBe(3);
			expect(typeCount['re_engagement']).toBe(3);
			expect(typeCount['aggressive_marketer']).toBe(2);
			expect(typeCount['event_seasonal']).toBe(3);
		});
	});

	describe('Scenario: Apply ±10% variance to client values', () => {
		test('Given baseline values, When generating clients, Then cost varies within ±10%', () => {
			// Given
			const teamName = 'SendWave';
			const destinations = ['Gmail', 'Outlook', 'Yahoo'];

			// When
			const clients = generateClientStockForTeam(teamName, destinations);

			// Then - Check each client type against its profile
			CLIENT_PROFILES.forEach((profile) => {
				const clientsOfType = clients.filter((c) => c.type === profile.type);

				clientsOfType.forEach((client) => {
					const minCost = profile.baseCost * 0.9;
					const maxCost = profile.baseCost * 1.1;
					expect(client.cost).toBeGreaterThanOrEqual(Math.floor(minCost));
					expect(client.cost).toBeLessThanOrEqual(Math.ceil(maxCost));
				});
			});
		});

		test('Given baseline values, When generating clients, Then revenue varies within ±10%', () => {
			// Given
			const teamName = 'SendWave';
			const destinations = ['Gmail', 'Outlook', 'Yahoo'];

			// When
			const clients = generateClientStockForTeam(teamName, destinations);

			// Then
			CLIENT_PROFILES.forEach((profile) => {
				const clientsOfType = clients.filter((c) => c.type === profile.type);

				clientsOfType.forEach((client) => {
					const minRevenue = profile.baseRevenue * 0.9;
					const maxRevenue = profile.baseRevenue * 1.1;
					expect(client.revenue).toBeGreaterThanOrEqual(Math.floor(minRevenue));
					expect(client.revenue).toBeLessThanOrEqual(Math.ceil(maxRevenue));
				});
			});
		});

		test('Given baseline values, When generating clients, Then volume varies within ±10%', () => {
			// Given
			const teamName = 'SendWave';
			const destinations = ['Gmail', 'Outlook', 'Yahoo'];

			// When
			const clients = generateClientStockForTeam(teamName, destinations);

			// Then
			CLIENT_PROFILES.forEach((profile) => {
				const clientsOfType = clients.filter((c) => c.type === profile.type);

				clientsOfType.forEach((client) => {
					const minVolume = profile.baseVolume * 0.9;
					const maxVolume = profile.baseVolume * 1.1;
					expect(client.volume).toBeGreaterThanOrEqual(Math.floor(minVolume));
					expect(client.volume).toBeLessThanOrEqual(Math.ceil(maxVolume));
				});
			});
		});

		test('Given baseline values, When generating clients, Then spam_rate varies within ±10%', () => {
			// Given
			const teamName = 'SendWave';
			const destinations = ['Gmail', 'Outlook', 'Yahoo'];

			// When
			const clients = generateClientStockForTeam(teamName, destinations);

			// Then
			CLIENT_PROFILES.forEach((profile) => {
				const clientsOfType = clients.filter((c) => c.type === profile.type);

				clientsOfType.forEach((client) => {
					const minSpamRate = profile.baseSpamRate * 0.9;
					const maxSpamRate = profile.baseSpamRate * 1.1;
					expect(client.spam_rate).toBeGreaterThanOrEqual(minSpamRate);
					expect(client.spam_rate).toBeLessThanOrEqual(maxSpamRate);
				});
			});
		});
	});

	describe('Scenario: Premium clients have correct requirements', () => {
		test('Given Premium Brand clients, When generating, Then they require SPF+DKIM+DMARC and reputation >= 85', () => {
			// Given
			const teamName = 'SendWave';
			const destinations = ['Gmail', 'Outlook', 'Yahoo'];

			// When
			const clients = generateClientStockForTeam(teamName, destinations);
			const premiumClients = clients.filter((c) => c.type === 'premium_brand');

			// Then
			expect(premiumClients).toHaveLength(2);

			premiumClients.forEach((client) => {
				expect(client.requirements).toBeDefined();
				expect(client.requirements?.tech).toEqual(['spf', 'dkim', 'dmarc']);
				expect(client.requirements?.reputation).toBe(85);
				expect(client.available_from_round).toBe(3);
				expect(client.risk).toBe('Low');
			});
		});

		test('Given non-Premium clients, When generating, Then they have no requirements', () => {
			// Given
			const teamName = 'SendWave';
			const destinations = ['Gmail', 'Outlook', 'Yahoo'];

			// When
			const clients = generateClientStockForTeam(teamName, destinations);
			const nonPremiumClients = clients.filter((c) => c.type !== 'premium_brand');

			// Then
			nonPremiumClients.forEach((client) => {
				expect(client.requirements).toBeUndefined();
			});
		});
	});

	describe('Scenario: Client availability by round', () => {
		test('Given client types, When generating, Then Round 1 clients (Growing, Re-engagement, Event) have available_from_round = 1', () => {
			// Given
			const teamName = 'SendWave';
			const destinations = ['Gmail', 'Outlook', 'Yahoo'];

			// When
			const clients = generateClientStockForTeam(teamName, destinations);

			// Then
			const round1Types = ['growing_startup', 're_engagement', 'event_seasonal'];
			const round1Clients = clients.filter((c) => round1Types.includes(c.type));

			expect(round1Clients).toHaveLength(9); // 3 + 3 + 3

			round1Clients.forEach((client) => {
				expect(client.available_from_round).toBe(1);
			});
		});

		test('Given client types, When generating, Then Round 2 clients (Aggressive) have available_from_round = 2', () => {
			// Given
			const teamName = 'SendWave';
			const destinations = ['Gmail', 'Outlook', 'Yahoo'];

			// When
			const clients = generateClientStockForTeam(teamName, destinations);

			// Then
			const aggressiveClients = clients.filter((c) => c.type === 'aggressive_marketer');

			expect(aggressiveClients).toHaveLength(2);

			aggressiveClients.forEach((client) => {
				expect(client.available_from_round).toBe(2);
			});
		});

		test('Given client types, When generating, Then Round 3 clients (Premium) have available_from_round = 3', () => {
			// Given
			const teamName = 'SendWave';
			const destinations = ['Gmail', 'Outlook', 'Yahoo'];

			// When
			const clients = generateClientStockForTeam(teamName, destinations);

			// Then
			const premiumClients = clients.filter((c) => c.type === 'premium_brand');

			expect(premiumClients).toHaveLength(2);

			premiumClients.forEach((client) => {
				expect(client.available_from_round).toBe(3);
			});
		});
	});

	describe('Scenario: Client names from predefined list', () => {
		test('Given CLIENT_NAMES list, When generating clients, Then all names come from the predefined list', () => {
			// Given
			const teamName = 'SendWave';
			const destinations = ['Gmail', 'Outlook', 'Yahoo'];

			// When
			const clients = generateClientStockForTeam(teamName, destinations);

			// Then
			clients.forEach((client) => {
				expect(CLIENT_NAMES).toContain(client.name as any);
			});
		});

		test('Given 13 client names, When generating for two different teams, Then names are reused but IDs are unique', () => {
			// Given
			const team1 = 'SendWave';
			const team2 = 'MailMonkey';
			const destinations = ['Gmail', 'Outlook', 'Yahoo'];

			// When
			const clients1 = generateClientStockForTeam(team1, destinations);
			const clients2 = generateClientStockForTeam(team2, destinations);

			// Then - Names can be same (stock is independent)
			const names1 = clients1.map((c) => c.name).sort();
			const names2 = clients2.map((c) => c.name).sort();
			expect(names1).toEqual(names2); // Same names used

			// But IDs must be different (each team has unique clients)
			const ids1 = clients1.map((c) => c.id);
			const ids2 = clients2.map((c) => c.id);
			const allIds = [...ids1, ...ids2];
			const uniqueIds = new Set(allIds);
			expect(uniqueIds.size).toBe(26); // 13 from each team
		});
	});

	describe('Scenario: Client properties are correctly set', () => {
		test('Given client profiles, When generating, Then risk levels match profile', () => {
			// Given
			const teamName = 'SendWave';
			const destinations = ['Gmail', 'Outlook', 'Yahoo'];

			// When
			const clients = generateClientStockForTeam(teamName, destinations);

			// Then
			CLIENT_PROFILES.forEach((profile) => {
				const clientsOfType = clients.filter((c) => c.type === profile.type);

				clientsOfType.forEach((client) => {
					expect(client.risk).toBe(profile.risk);
				});
			});
		});

		test('Given generated clients, When checking status, Then status is undefined (not yet acquired)', () => {
			// Given
			const teamName = 'SendWave';
			const destinations = ['Gmail', 'Outlook', 'Yahoo'];

			// When
			const clients = generateClientStockForTeam(teamName, destinations);

			// Then
			clients.forEach((client) => {
				expect(client.status).toBeUndefined();
			});
		});
	});
});
