/**
 * Complaint Calculator
 * US 3.3: Resolution Phase Automation - Iteration 4, 5, 7
 *
 * Calculates complaint rates from client spam rates
 * Iteration 4: Basic volume-weighted complaint rate
 * Iteration 5: List Hygiene and Content Filtering reductions
 * Iteration 7: Complaint threshold penalties
 */

import type {
	ComplaintParams,
	ComplaintResult,
	ClientComplaintData,
	ComplaintThresholdPenalty
} from '../resolution-types';
import { LIST_HYGIENE_COMPLAINT_REDUCTION } from '$lib/config/client-onboarding';
import { CONTENT_FILTERING_COMPLAINT_REDUCTION } from '$lib/config/technical-upgrades';
import { getComplaintPenalty } from '$lib/config/metrics-thresholds';

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
		if (clientState?.volumeModifiers.some((m) => m.source === 'list_hygiene')) {
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

	// Iteration 7: Check for complaint threshold penalties
	// Convert complaint rate to decimal (0.03 = 3%) for comparison
	const complaintRateDecimal = adjustedComplaintRate / 100;
	const thresholdPenalty = getComplaintPenalty(complaintRateDecimal);

	// Build result with optional threshold penalty
	const result: ComplaintResult = {
		baseComplaintRate,
		adjustedComplaintRate,
		perClient
	};

	if (thresholdPenalty) {
		result.thresholdPenalty = {
			threshold: thresholdPenalty.threshold,
			penalty: thresholdPenalty.penalty,
			label: thresholdPenalty.label,
			complaintRate: complaintRateDecimal
		};
	}

	return result;
}
