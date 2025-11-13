/**
 * Reputation Calculator
 * US 3.3: Resolution Phase Automation - Iteration 3, 4, 5
 *
 * Calculates reputation changes based on tech stack and client risk
 * Iteration 3: Tech stack bonuses
 * Iteration 4: Client risk impact (volume-weighted)
 * Iteration 5: Warmup bonus
 */

import type {
	ReputationParams,
	ReputationResult,
	DestinationReputationChange
} from '../resolution-types';
import { getAuthenticationReputationBonus } from '$lib/config/technical-upgrades';
import { getReputationImpact } from '$lib/config/client-profiles';
import { WARMUP_REPUTATION_BONUS } from '$lib/config/client-onboarding';

/**
 * Calculate reputation changes for an ESP
 * Iteration 5: Tech stack bonuses + volume-weighted client risk + warmup bonus
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

	// 3. Calculate warmup bonus (Iteration 5)
	// Count active clients with warmup that are in their first active round
	const activeWarmedClients = params.clients.filter((client) => {
		const state = params.clientStates[client.id];
		return (
			state?.status === 'Active' &&
			state?.has_warmup &&
			state?.first_active_round === params.currentRound
		);
	});

	const warmupBonus = activeWarmedClients.length * WARMUP_REPUTATION_BONUS;

	// 4. Build per-destination results
	const perDestination: Record<string, DestinationReputationChange> = {};

	for (const dest of params.destinations) {
		const breakdown = [
			{ source: 'Authentication Tech', value: techBonus },
			{ source: 'Client Risk', value: clientImpact },
			{ source: 'Warmup Bonus', value: warmupBonus }
		];

		perDestination[dest] = {
			techBonus,
			clientImpact,
			warmupBonus,
			totalChange: techBonus + clientImpact + warmupBonus,
			breakdown
		};
	}

	// 5. Return result
	return {
		perDestination,
		volumeWeightedClientImpact: clientImpact
	};
}
