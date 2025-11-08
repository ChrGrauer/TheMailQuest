/**
 * Volume Calculator
 * US 3.3: Resolution Phase Automation - Iteration 1, 5
 *
 * Calculates email volume for ESP teams
 * Iteration 1: Basic volume calculation (filter active clients, sum volumes)
 * Iteration 5: List hygiene and warmup volume reductions
 */

import type { VolumeParams, VolumeResult, ClientVolumeData } from '../resolution-types';
import {
	getListHygieneVolumeReduction,
	WARMUP_VOLUME_REDUCTION
} from '$lib/config/client-onboarding';

/**
 * Calculate total email volume for a team
 * Iteration 1: Filters active clients
 * Iteration 5: Applies list hygiene and warmup reductions
 */
export function calculateVolume(params: VolumeParams): VolumeResult {
	// Filter to only active clients
	const activeClients = params.clients.filter(
		(client) => params.clientStates[client.id]?.status === 'Active'
	);

	// Calculate volume for each active client
	const clientVolumes: ClientVolumeData[] = activeClients.map((client) => {
		const state = params.clientStates[client.id];
		let adjustedVolume = client.volume;
		const adjustments: Record<string, number> = {};

		// 1. List hygiene reduction (permanent, applied first)
		if (state.has_list_hygiene) {
			const reductionPercentage = getListHygieneVolumeReduction(client.risk);
			const reductionAmount = client.volume * reductionPercentage;
			adjustedVolume -= reductionAmount;
			adjustments.listHygiene = reductionAmount;
		}

		// 2. Warmup reduction (first round only, applied to already-reduced volume)
		if (state.has_warmup && state.first_active_round === params.currentRound) {
			const reductionAmount = adjustedVolume * WARMUP_VOLUME_REDUCTION;
			adjustedVolume -= reductionAmount;
			adjustments.warmup = reductionAmount;
		}

		return {
			clientId: client.id,
			baseVolume: client.volume,
			adjustedVolume: Math.round(adjustedVolume),
			adjustments
		};
	});

	// Sum total volume
	const totalVolume = clientVolumes.reduce((sum, cv) => sum + cv.adjustedVolume, 0);

	return {
		activeClients,
		clientVolumes,
		totalVolume
	};
}
