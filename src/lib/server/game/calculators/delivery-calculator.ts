/**
 * Delivery Calculator
 * US 3.3: Resolution Phase Automation - Iteration 2
 *
 * Calculates delivery success rate based on reputation
 * Iteration 2: Base rate from reputation zones only
 * Future iterations will add: auth bonuses, DMARC penalty, filtering penalties
 */

import type { DeliveryParams, DeliveryResult } from '../resolution-types';
import { getDeliverySuccessRate, getReputationStatus } from '$lib/config/metrics-thresholds';

/**
 * Calculate delivery success rate for an ESP
 * Iteration 2: Only reputation-based delivery rate
 */
export function calculateDeliverySuccess(params: DeliveryParams): DeliveryResult {
	// Get delivery rate from reputation zone
	const baseRate = getDeliverySuccessRate(params.reputation);

	// Get reputation status for zone name
	const status = getReputationStatus(params.reputation);

	// Iteration 2: finalRate = baseRate (no modifiers yet)
	return {
		baseRate,
		finalRate: baseRate,
		zone: status.status
	};
}
