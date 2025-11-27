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
		const teamName = 'SendWave';
		const destinations = ['Gmail', 'Outlook', 'Yahoo'];

		test.each([
			['cost', 'baseCost', true],
			['revenue', 'baseRevenue', true],
			['volume', 'baseVolume', true],
			['spam_rate', 'baseSpamRate', false]
		])('validates %s varies within ±10% of %s', (clientProp, profileProp, useRounding) => {
			// When
			const clients = generateClientStockForTeam(teamName, destinations);

			// Then - Check each client type against its profile
			CLIENT_PROFILES.forEach((profile) => {
				const clientsOfType = clients.filter((c) => c.type === profile.type);
				const baseValue = profile[profileProp as keyof typeof profile] as number;

				clientsOfType.forEach((client) => {
					const minValue = baseValue * 0.9;
					const maxValue = baseValue * 1.1;
					const clientValue = client[clientProp as keyof typeof client] as number;

					if (useRounding) {
						expect(clientValue).toBeGreaterThanOrEqual(Math.floor(minValue));
						expect(clientValue).toBeLessThanOrEqual(Math.ceil(maxValue));
					} else {
						expect(clientValue).toBeGreaterThanOrEqual(minValue);
						expect(clientValue).toBeLessThanOrEqual(maxValue);
					}
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
		const teamName = 'SendWave';
		const destinations = ['Gmail', 'Outlook', 'Yahoo'];

		test.each([
			[1, ['growing_startup', 're_engagement', 'event_seasonal'], 9, 'Round 1 (Growing, Re-engagement, Event)'],
			[2, ['aggressive_marketer'], 2, 'Round 2 (Aggressive)'],
			[3, ['premium_brand'], 2, 'Round 3 (Premium)']
		])(
			'validates %s availability for %s client types (%s)',
			(expectedRound, clientTypes, expectedCount, _desc) => {
				// When
				const clients = generateClientStockForTeam(teamName, destinations);
				const filteredClients = clients.filter((c) => clientTypes.includes(c.type));

				// Then
				expect(filteredClients).toHaveLength(expectedCount);
				filteredClients.forEach((client) => {
					expect(client.available_from_round).toBe(expectedRound);
				});
			}
		);
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
