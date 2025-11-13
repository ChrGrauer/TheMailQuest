/**
 * Delivery Calculator
 * US 3.3: Resolution Phase Automation - Iteration 2, 3, 6
 *
 * Calculates delivery success rate based on reputation and authentication
 * Iteration 2: Base rate from reputation zones
 * Iteration 3: Authentication bonuses and DMARC enforcement
 * Iteration 6: Filtering penalties (false positives)
 */

import type { DeliveryParams, DeliveryResult, DeliveryBreakdownItem } from '../resolution-types';
import { getDeliverySuccessRate, getReputationStatus } from '$lib/config/metrics-thresholds';
import {
	getAuthenticationDeliveryBonus,
	DMARC_MISSING_PENALTY
} from '$lib/config/technical-upgrades';
import { calculateImpactValues } from '$lib/utils/filtering';

/**
 * Calculate delivery success rate for an ESP
 * Iteration 3: Reputation + authentication bonuses + DMARC penalty
 * Iteration 6: Filtering penalties
 */
export function calculateDeliverySuccess(params: DeliveryParams): DeliveryResult {
	// 1. Base rate from reputation zone
	const baseRate = getDeliverySuccessRate(params.reputation);
	const status = getReputationStatus(params.reputation);

	// 2. Authentication bonus (cumulative)
	const authBonus = getAuthenticationDeliveryBonus(params.techStack);

	// 3. Filtering penalty (Iteration 6)
	let filteringPenalty = 0;
	if (params.filteringLevel && params.filteringLevel !== 'permissive') {
		const impacts = calculateImpactValues(params.filteringLevel);
		filteringPenalty = impacts.falsePositives / 100; // Convert to decimal
	}

	// 4. Calculate intermediate rate
	let finalRate = baseRate + authBonus - filteringPenalty;

	// 5. Build breakdown
	const breakdown: DeliveryBreakdownItem[] = [
		{ factor: `Base (${status.status} zone)`, value: baseRate }
	];

	if (authBonus > 0) {
		breakdown.push({ factor: 'Authentication Bonus', value: authBonus });
	}

	if (filteringPenalty > 0) {
		breakdown.push({ factor: 'Filtering Penalty', value: -Math.round(filteringPenalty * 100) });
	}

	// 6. DMARC enforcement (Round 3+)
	let dmarcPenalty: number | undefined;
	if (params.currentRound >= 3 && !params.techStack.includes('dmarc')) {
		dmarcPenalty = 1 - DMARC_MISSING_PENALTY; // 0.8 (80% rejection)
		const beforePenalty = finalRate;
		finalRate = finalRate * DMARC_MISSING_PENALTY; // Multiply by 0.2
		breakdown.push({
			factor: 'DMARC Missing Penalty',
			value: finalRate - beforePenalty // Negative value
		});
	}

	// 7. Cap at 0-100%
	finalRate = Math.max(0, Math.min(finalRate, 1.0));

	breakdown.push({ factor: 'Final Rate', value: finalRate });

	return {
		baseRate,
		authBonus,
		...(filteringPenalty > 0 && { filteringPenalty }), // Only include if > 0
		dmarcPenalty,
		finalRate,
		zone: status.status,
		breakdown
	};
}
