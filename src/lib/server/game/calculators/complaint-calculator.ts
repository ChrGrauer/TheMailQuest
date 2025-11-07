/**
 * Complaint Calculator
 * US 3.3: Resolution Phase Automation - Iteration 4 (Basic)
 *
 * Calculates complaint rates from client spam rates
 * Iteration 4: Basic volume-weighted complaint rate
 * Future iterations will add: List Hygiene reduction, Content Filtering, spam traps (Iteration 5+)
 */

import type { ComplaintParams, ComplaintResult, ClientComplaintData } from '../resolution-types';

/**
 * Calculate volume-weighted complaint rate
 * Iteration 4: Basic calculation only
 */
export function calculateComplaints(params: ComplaintParams): ComplaintResult {
	const perClient: ClientComplaintData[] = [];
	let totalWeightedRate = 0;

	for (const client of params.clients) {
		const clientVolumeData = params.volumeData.clientVolumes.find(
			(cv) => cv.clientId === client.id
		);
		const volume = clientVolumeData?.adjustedVolume || 0;

		perClient.push({
			clientId: client.id,
			baseRate: client.spam_rate,
			volume
		});

		totalWeightedRate += client.spam_rate * volume;
	}

	const baseComplaintRate =
		params.volumeData.totalVolume > 0 ? totalWeightedRate / params.volumeData.totalVolume : 0;

	return {
		baseComplaintRate,
		perClient
	};
}
