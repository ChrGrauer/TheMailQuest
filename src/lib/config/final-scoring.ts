/**
 * Final Scoring Configuration
 * US-5.1: Final Score Calculation
 *
 * Defines all configurable parameters for the final scoring system
 * All values can be adjusted for game balancing without code changes
 */

/**
 * Score Component Weights
 * These weights determine how much each component contributes to the total score
 * Must sum to 100 (representing 100% of total score)
 */
export const SCORE_WEIGHTS = {
	REPUTATION: 50, // 50% of total score (max 50 points)
	REVENUE: 35, // 35% of total score (max 35 points)
	TECHNICAL: 15 // 15% of total score (max 15 points)
} as const;

/**
 * Kingdom Weights for Reputation Calculation
 * These weights determine how much each destination contributes to weighted reputation
 * Must sum to 1.0 (representing 100%)
 *
 * Rationale: Gmail has highest market share, followed by Outlook, then Yahoo
 */
export const KINGDOM_WEIGHTS: Record<string, number> = {
	Gmail: 0.5, // 50% weight - largest email provider
	Outlook: 0.3, // 30% weight - second largest
	Yahoo: 0.2 // 20% weight - third largest
};

/**
 * Minimum Reputation Threshold for Qualification
 * An ESP with reputation below this value in ANY kingdom is disqualified
 * This represents the minimum acceptable standing with email providers
 */
export const MIN_REPUTATION_THRESHOLD = 60;

/**
 * Maximum Technical Investment for Score Normalization
 * Technical score is calculated as: min(total_invested / MAX_TECH_INVESTMENT, 1.0) × 15
 * Investments beyond this cap don't provide additional score benefit
 *
 * Based on approximate total cost of all available tech upgrades:
 * SPF (100) + DKIM (150) + DMARC (200) + Content Filtering (120) + Advanced Monitoring (150)
 * + multiple uses of consumables like IP Warming and List Hygiene
 */
export const MAX_TECH_INVESTMENT = 1200;

/**
 * Destination Success Threshold
 * Destinations succeed if their collaborative score exceeds this value
 * Represents the minimum acceptable balance between spam blocking and user satisfaction
 */
export const DESTINATION_SUCCESS_THRESHOLD = 80;

/**
 * Destination Score Component Weights
 * These determine the maximum points for each collaborative score component
 * Total possible (without coordination): 40 + 40 = 80 points
 * Destinations need to score above threshold (80) to succeed
 */
export const DESTINATION_WEIGHTS = {
	INDUSTRY_PROTECTION: 40, // Max 40 points - spam blocking effectiveness
	COORDINATION_BONUS: 10, // Points per coordinated action (postponed - always 0)
	USER_SATISFACTION: 40 // Max 40 points - avoiding false positives
} as const;

/**
 * Helper: Get kingdom weight with fallback
 * Returns the weight for a kingdom, defaulting to 0 if not found
 */
export function getKingdomWeight(kingdom: string): number {
	return KINGDOM_WEIGHTS[kingdom] ?? 0;
}

/**
 * Helper: Get all configured kingdom names
 * Returns the list of kingdom names in order of weight (highest first)
 */
export function getKingdomNames(): string[] {
	return Object.entries(KINGDOM_WEIGHTS)
		.sort(([, a], [, b]) => b - a)
		.map(([name]) => name);
}

/**
 * Helper: Validate kingdom weights sum to 1.0
 * Used for debugging/testing configuration
 */
export function validateKingdomWeights(): boolean {
	const sum = Object.values(KINGDOM_WEIGHTS).reduce((acc, weight) => acc + weight, 0);
	return Math.abs(sum - 1.0) < 0.001; // Allow small floating point error
}

/**
 * Helper: Validate score weights sum to 100
 * Used for debugging/testing configuration
 */
export function validateScoreWeights(): boolean {
	const sum = SCORE_WEIGHTS.REPUTATION + SCORE_WEIGHTS.REVENUE + SCORE_WEIGHTS.TECHNICAL;
	return sum === 100;
}
