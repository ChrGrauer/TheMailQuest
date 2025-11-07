/**
 * Reputation Calculator
 * US 3.3: Resolution Phase Automation - Iteration 3, 4
 *
 * Calculates reputation changes based on tech stack and client risk
 * Iteration 3: Tech stack bonuses
 * Iteration 4: Client risk impact (volume-weighted)
 * Future iterations will add: warmup bonus (Iteration 5)
 */

import type {
	ReputationParams,
	ReputationResult,
	DestinationReputationChange
} from '../resolution-types';
import { getAuthenticationReputationBonus } from '$lib/config/technical-upgrades';
import { getReputationImpact } from '$lib/config/client-profiles';

/**
 * Calculate reputation changes for an ESP
 * Iteration 4: Tech stack bonuses + volume-weighted client risk impact
 */
export function calculateReputationChanges(params: ReputationParams): ReputationResult {
	// 1. Get tech bonus (same for all destinations)
	const techBonus = getAuthenticationReputationBonus(params.techStack);

	// 2. Calculate volume-weighted client risk impact (Iteration 4)
	let clientImpact = 0;

	if (params.volumeData.totalVolume > 0 && params.clients.length > 0) {
		let totalWeightedImpact = 0;

		for (const client of params.clients) {
			// Only consider active clients
			const clientState = params.clientStates[client.id];
			if (clientState?.status !== 'Active') {
				continue;
			}

			// Get adjusted volume for this client
			const clientVolumeData = params.volumeData.clientVolumes.find(
				(cv) => cv.clientId === client.id
			);
			const clientVolume = clientVolumeData?.adjustedVolume || 0;

			// Get risk impact for this client
			const impact = getReputationImpact(client.risk);

			// Accumulate weighted impact
			totalWeightedImpact += impact * clientVolume;
		}

		// Calculate volume-weighted average
		clientImpact = totalWeightedImpact / params.volumeData.totalVolume;
	}

	// 3. Build per-destination results
	const perDestination: Record<string, DestinationReputationChange> = {};

	for (const dest of params.destinations) {
		const breakdown = [
			{ source: 'Authentication Tech', value: techBonus },
			{ source: 'Client Risk', value: clientImpact }
		];

		perDestination[dest] = {
			techBonus,
			clientImpact,
			warmupBonus: 0, // Iteration 5: will be calculated from warmed clients
			totalChange: techBonus + clientImpact,
			breakdown
		};
	}

	// 4. Return result
	return {
		perDestination,
		volumeWeightedClientImpact: clientImpact
	};
}
