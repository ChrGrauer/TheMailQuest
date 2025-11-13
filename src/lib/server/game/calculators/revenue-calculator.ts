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
 */
export function calculateRevenue(params: RevenueParams): RevenueResult {
	// Filter to only active clients
	const activeClients = params.clients.filter(
		(client) => params.clientStates[client.id]?.status === 'Active'
	);

	// Calculate revenue for each active client
	const perClient: ClientRevenueData[] = activeClients.map((client) => {
		const baseRevenue = client.revenue;
		const actualRevenue = Math.round(baseRevenue * params.deliveryRate);

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
