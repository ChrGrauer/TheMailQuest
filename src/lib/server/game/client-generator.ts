/**
 * US-2.2: Client Marketplace - Client Generator
 *
 * Generates 13 unique clients per ESP team with ±10% variance.
 * Each ESP team gets independent stock with the same client names.
 */

import type { Client } from './types';
import { CLIENT_PROFILES, CLIENT_NAMES } from '$lib/config/client-profiles';

/**
 * Apply ±10% variance to a value
 * Returns integer for whole numbers, float for decimals
 */
function applyVariance(baseValue: number): number {
	const variance = 0.1; // 10%
	const minMultiplier = 1 - variance; // 0.9
	const maxMultiplier = 1 + variance; // 1.1

	// Random multiplier between 0.9 and 1.1
	const randomMultiplier = minMultiplier + Math.random() * (maxMultiplier - minMultiplier);
	const result = baseValue * randomMultiplier;

	// If base value is an integer >= 10, return integer; otherwise return float
	if (Number.isInteger(baseValue) && baseValue >= 10) {
		return Math.round(result);
	}

	// For small decimals (like spam_rate), return with 2 decimal places
	return Math.round(result * 100) / 100;
}

/**
 * Generate 13 unique clients for an ESP team
 *
 * @param teamName - ESP team name (e.g., "SendWave")
 * @param destinations - Array of destination names (unused but kept for future use)
 * @returns Array of 13 Client objects
 */
export function generateClientStockForTeam(teamName: string, destinations: string[]): Client[] {
	const clients: Client[] = [];
	let nameIndex = 0;

	// Generate clients based on profiles
	CLIENT_PROFILES.forEach((profile, profileIndex) => {
		// Generate 'count' number of clients for this profile
		for (let i = 0; i < profile.count; i++) {
			const clientIndex = clients.length;
			const clientId = `client-${teamName}-${String(clientIndex).padStart(3, '0')}`;
			const clientName = CLIENT_NAMES[nameIndex % CLIENT_NAMES.length];

			// Apply variance to numeric values
			const cost = applyVariance(profile.baseCost);
			const revenue = applyVariance(profile.baseRevenue);
			const volume = applyVariance(profile.baseVolume);
			const spamRate = applyVariance(profile.baseSpamRate);

			const client: Client = {
				id: clientId,
				name: clientName,
				type: profile.type,
				cost,
				revenue,
				volume,
				risk: profile.risk,
				spam_rate: spamRate,
				available_from_round: profile.availableFromRound,
				requirements: profile.requirements
					? {
							tech: [...profile.requirements.tech], // Copy array
							reputation: profile.requirements.reputation
						}
					: undefined,
				destination_distribution: { ...profile.destination_distribution } // US-3.3 Iteration 6
			};

			clients.push(client);
			nameIndex++;
		}
	});

	return clients;
}

/**
 * Generate client stock for all ESP teams in a game
 *
 * @param teamNames - Array of ESP team names
 * @param destinations - Array of destination names
 * @returns Map of team name to their client stock
 */
export function generateClientStockForAllTeams(
	teamNames: string[],
	destinations: string[]
): Map<string, Client[]> {
	const stockMap = new Map<string, Client[]>();

	teamNames.forEach((teamName) => {
		const clients = generateClientStockForTeam(teamName, destinations);
		stockMap.set(teamName, clients);
	});

	return stockMap;
}
