/**
 * Complaint Calculator
 * US 3.3: Resolution Phase Automation - Iteration 4, 5
 *
 * Calculates complaint rates from client spam rates
 * Iteration 4: Basic volume-weighted complaint rate
 * Iteration 5: List Hygiene and Content Filtering reductions
 */

import type { ComplaintParams, ComplaintResult, ClientComplaintData } from '../resolution-types';
import { LIST_HYGIENE_COMPLAINT_REDUCTION } from '$lib/config/client-onboarding';
import { CONTENT_FILTERING_COMPLAINT_REDUCTION } from '$lib/config/technical-upgrades';

/**
 * Calculate volume-weighted complaint rate
 * Iteration 5: Per-client list hygiene + global content filtering reductions
 */
export function calculateComplaints(params: ComplaintParams): ComplaintResult {
	const perClient: ClientComplaintData[] = [];
	let totalWeightedBaseRate = 0;
	let totalWeightedAdjustedRate = 0;

	for (const client of params.clients) {
		const clientVolumeData = params.volumeData.clientVolumes.find(
			(cv) => cv.clientId === client.id
		);
		const volume = clientVolumeData?.adjustedVolume || 0;

		const baseRate = client.spam_rate;
		let adjustedRate = client.spam_rate;

		// Apply list hygiene reduction (per-client)
		const clientState = params.clientStates[client.id];
		if (clientState?.has_list_hygiene) {
			adjustedRate = adjustedRate * (1 - LIST_HYGIENE_COMPLAINT_REDUCTION);
		}

		perClient.push({
			clientId: client.id,
			baseRate,
			adjustedRate,
			volume
		});

		totalWeightedBaseRate += baseRate * volume;
		totalWeightedAdjustedRate += adjustedRate * volume;
	}

	const baseComplaintRate =
		params.volumeData.totalVolume > 0 ? totalWeightedBaseRate / params.volumeData.totalVolume : 0;

	let adjustedComplaintRate =
		params.volumeData.totalVolume > 0
			? totalWeightedAdjustedRate / params.volumeData.totalVolume
			: 0;

	// Apply content filtering reduction (global)
	if (params.techStack.includes('content-filtering')) {
		adjustedComplaintRate = adjustedComplaintRate * (1 - CONTENT_FILTERING_COMPLAINT_REDUCTION);
	}

	return {
		baseComplaintRate,
		adjustedComplaintRate,
		perClient
	};
}
