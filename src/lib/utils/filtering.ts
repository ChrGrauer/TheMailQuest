/**
 * Shared Filtering Utility Functions
 *
 * These functions are used by both client and server code for filtering logic.
 */

import type { FilteringLevel } from '$lib/server/game/types';

/**
 * Calculate impact values for a filtering level
 *
 * Maps filtering levels to their spam reduction and false positive percentages:
 * - Permissive: 0% spam reduction, 0% false positives
 * - Moderate: 35% spam reduction, 3% false positives
 * - Strict: 65% spam reduction, 8% false positives
 * - Maximum: 85% spam reduction, 15% false positives
 *
 * @param level - Filtering level
 * @returns Object with spamReduction and falsePositives percentages
 */
export function calculateImpactValues(level: FilteringLevel): {
	spamReduction: number;
	falsePositives: number;
} {
	const impactMap: Record<FilteringLevel, { spamReduction: number; falsePositives: number }> = {
		permissive: { spamReduction: 0, falsePositives: 0 },
		moderate: { spamReduction: 35, falsePositives: 3 },
		strict: { spamReduction: 65, falsePositives: 8 },
		maximum: { spamReduction: 85, falsePositives: 15 }
	};

	return impactMap[level];
}
