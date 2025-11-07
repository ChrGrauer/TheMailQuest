/**
 * Reputation Calculator
 * US 3.3: Resolution Phase Automation - Iteration 3
 *
 * Calculates reputation changes based on tech stack and client risk
 * Iteration 3: Tech stack bonuses only
 * Future iterations will add: client risk impact (Iteration 4), warmup bonus (Iteration 5)
 */

import type {
	ReputationParams,
	ReputationResult,
	DestinationReputationChange
} from '../resolution-types';
import { getAuthenticationReputationBonus } from '$lib/config/technical-upgrades';

/**
 * Calculate reputation changes for an ESP
 * Iteration 3: Only tech stack bonuses
 */
export function calculateReputationChanges(params: ReputationParams): ReputationResult {
	// 1. Get tech bonus (same for all destinations in Iteration 3)
	const techBonus = getAuthenticationReputationBonus(params.techStack);

	// 2. Build per-destination results
	const perDestination: Record<string, DestinationReputationChange> = {};

	for (const dest of params.destinations) {
		perDestination[dest] = {
			techBonus,
			clientImpact: 0, // Iteration 4: will be calculated from client risk
			warmupBonus: 0, // Iteration 5: will be calculated from warmed clients
			totalChange: techBonus, // Iteration 3: only tech bonus
			breakdown: [{ source: 'Authentication Tech', value: techBonus }]
		};
	}

	// 3. Return result
	return {
		perDestination,
		volumeWeightedClientImpact: 0 // Iteration 4: will be calculated from client volumes
	};
}
