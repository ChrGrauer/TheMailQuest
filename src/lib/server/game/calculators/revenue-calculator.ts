/**
 * Revenue Calculator
 * US 3.3: Resolution Phase Automation - Iteration 1
 *
 * Calculates revenue for ESP teams
 * Iteration 1: Basic revenue calculation (sum base revenue from active clients)
 * Future iterations will add: delivery rate modifiers
 */

import type { RevenueParams, RevenueResult, ClientRevenueData } from '../resolution-types';

/**
 * Calculate revenue for a team
 * Iteration 1: Base revenue only (deliveryRate will be applied but is 1.0 for Iteration 1)
 * Phase 2.1.1: Warmup reduces revenue proportionally to volume reduction
 */
export function calculateRevenue(params: RevenueParams): RevenueResult {
	// Filter to only active clients
	const activeClients = params.clients.filter(
		(client) => params.clientStates[client.id]?.status === 'Active'
	);

	// Calculate revenue for each active client
	const perClient: ClientRevenueData[] = activeClients.map((client) => {
		const baseRevenue = client.revenue;

		// Phase 2.1.1: Apply warmup factor if provided
		// Warmup reduces volume by 50% in first active round, so revenue should also be reduced
		let warmupFactor = 1.0; // Default: no reduction

		// Check for per-client factor first (most specific)
		if (params.perClientWarmupFactors && params.perClientWarmupFactors[client.id] !== undefined) {
			warmupFactor = params.perClientWarmupFactors[client.id];
		}
		// Fallback to global warmup factor if provided
		else if (params.warmupFactor !== undefined) {
			warmupFactor = params.warmupFactor;
		}

		// Apply both warmup and delivery rate
		const actualRevenue = Math.round(baseRevenue * warmupFactor * params.deliveryRate);

		return {
			clientId: client.id,
			baseRevenue,
			actualRevenue
		};
	});

	// Sum total revenue
	const baseRevenue = perClient.reduce((sum, pc) => sum + pc.baseRevenue, 0);
	const actualRevenue = perClient.reduce((sum, pc) => sum + pc.actualRevenue, 0);

	return {
		baseRevenue,
		actualRevenue,
		perClient
	};
}
