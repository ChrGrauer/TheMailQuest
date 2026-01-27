/**
 * Destination Revenue Calculator
 * US 3.3: Resolution Phase Automation - Iteration 6.1
 *
 * Calculates revenue for destination players based on:
 * - Base revenue (by kingdom/market position)
 * - Volume bonus (emails processed)
 * - Satisfaction multiplier (user satisfaction tier)
 */

import type { DestinationRevenueParams, DestinationRevenueResult } from '../resolution-types';
import {
	DESTINATION_BASE_REVENUE,
	VOLUME_BONUS_RATE,
	VOLUME_BONUS_UNIT,
	getSatisfactionMultiplier,
	getSatisfactionTierLabel
} from '$lib/config/satisfaction-settings';

/**
 * Calculate revenue for a destination
 *
 * Formula:
 * - base_revenue = kingdom-specific constant (zmail: 300, intake: 200, yagle: 150)
 * - volume_bonus = (total_volume / 100000) * 20
 * - satisfaction_multiplier = tier-based (0.3 to 1.5)
 * - total_revenue = (base_revenue + volume_bonus) * satisfaction_multiplier
 *
 * @param params - Revenue calculation parameters
 * @returns Revenue result with breakdown
 */
export function calculateDestinationRevenue(
	params: DestinationRevenueParams
): DestinationRevenueResult {
	const { kingdom, totalVolume, userSatisfaction } = params;

	// 1. Get base revenue for kingdom
	const baseRevenue = DESTINATION_BASE_REVENUE[kingdom] || 0;

	// 2. Calculate volume bonus (20 credits per 100K emails)
	const volumeBonus = Math.round((totalVolume / VOLUME_BONUS_UNIT) * VOLUME_BONUS_RATE);

	// 3. Get satisfaction multiplier and tier
	const satisfactionMultiplier = getSatisfactionMultiplier(userSatisfaction);
	const satisfactionTier = getSatisfactionTierLabel(userSatisfaction);

	// 4. Calculate total revenue
	const totalRevenue = Math.round((baseRevenue + volumeBonus) * satisfactionMultiplier);

	return {
		baseRevenue,
		volumeBonus,
		satisfactionMultiplier,
		satisfactionTier,
		totalRevenue
	};
}
