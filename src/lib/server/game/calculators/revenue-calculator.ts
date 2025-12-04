/**
 * Revenue Calculator
 * US 3.3: Resolution Phase Automation - Iteration 1
 *
 * Calculates revenue for ESP teams
 * Iteration 1: Basic revenue calculation (sum base revenue from active clients)
 * Bug Fix: Volume multipliers (warmup, INC-011, INC-015) now affect revenue
 */

import type { RevenueParams, RevenueResult, ClientRevenueData } from '../resolution-types';

/**
 * Calculate revenue for a team
 * Revenue scales with volume multipliers (warmup 0.5x, INC-011 10x, INC-015 2x, etc.)
 * Formula: actualRevenue = baseRevenue × volumeMultiplier × deliveryRate
 */
export function calculateRevenue(params: RevenueParams): RevenueResult {
	// Filter to only active clients
	const activeClients = params.clients.filter(
		(client) => params.clientStates[client.id]?.status === 'Active'
	);

	// Calculate revenue for each active client
	const perClient: ClientRevenueData[] = activeClients.map((client) => {
		const baseRevenue = client.revenue;

		// Get cumulative volume multiplier (includes warmup, incidents, etc.)
		// Default to 1.0 if not provided
		const volumeMultiplier = params.perClientVolumeMultipliers?.[client.id] ?? 1.0;

		// Apply volume multiplier and delivery rate
		// Revenue scales proportionally with volume changes
		const actualRevenue = Math.round(baseRevenue * volumeMultiplier * params.deliveryRate);

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
