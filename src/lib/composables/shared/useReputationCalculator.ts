/**
 * Reputation Calculator Utility
 *
 * Calculates weighted reputation averages based on destination weights.
 * Gmail: 50%, Outlook: 30%, Yahoo: 20%
 */

export interface Destination {
	name: string;
	weight: number;
}

/**
 * Calculate overall reputation as weighted average
 *
 * @param reputation Map of destination names to reputation values
 * @param destinations Array of destinations with weights
 * @returns Weighted average reputation (rounded to nearest integer)
 */
export function calculateOverallReputation(
	reputation: Record<string, number>,
	destinations: Destination[]
): number {
	let weightedSum = 0;
	let totalWeight = 0;

	destinations.forEach((dest) => {
		const repValue = reputation[dest.name] || 0;
		weightedSum += repValue * dest.weight;
		totalWeight += dest.weight;
	});

	return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}
