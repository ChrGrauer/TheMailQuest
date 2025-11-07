/**
 * Volume Calculator
 * US 3.3: Resolution Phase Automation - Iteration 1
 *
 * Calculates email volume for ESP teams
 * Iteration 1: Basic volume calculation (filter active clients, sum volumes)
 * Future iterations will add: list hygiene reduction, warmup reduction
 */

import type { VolumeParams, VolumeResult, ClientVolumeData } from '../resolution-types';

/**
 * Calculate total email volume for a team
 * Iteration 1: Only includes active clients, no modifiers yet
 */
export function calculateVolume(params: VolumeParams): VolumeResult {
	// Filter to only active clients
	const activeClients = params.clients.filter(
		(client) => params.clientStates[client.id]?.status === 'Active'
	);

	// Calculate volume for each active client
	const clientVolumes: ClientVolumeData[] = activeClients.map((client) => ({
		clientId: client.id,
		baseVolume: client.volume,
		adjustedVolume: client.volume, // Iteration 1: no adjustments yet
		adjustments: {} // Iteration 1: no adjustments yet
	}));

	// Sum total volume
	const totalVolume = clientVolumes.reduce((sum, cv) => sum + cv.adjustedVolume, 0);

	return {
		activeClients,
		clientVolumes,
		totalVolume
	};
}
