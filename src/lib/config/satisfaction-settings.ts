/**
 * User Satisfaction & Destination Revenue Configuration
 * US-3.3 Iteration 6.1
 *
 * Defines constants for calculating user satisfaction and destination revenue
 */

/**
 * Base satisfaction score (starting point before modifiers)
 */
export const BASE_SATISFACTION = 75;

/**
 * Satisfaction impact weights (applied to percentages of volume)
 * Higher values = stronger impact on satisfaction score
 */
export const SATISFACTION_WEIGHTS = {
	spam_blocked: 300, // Reward for successfully blocking spam
	spam_through: 400, // Penalty for spam getting through (heaviest penalty)
	false_positives: 100 // Penalty for blocking legitimate emails (moderate)
};

/**
 * Destination base revenues by kingdom
 * Reflects market position and scale
 */
export const DESTINATION_BASE_REVENUE: Record<string, number> = {
	zmail: 300, // Largest player, highest revenue
	intake: 200, // Medium player, moderate revenue
	yagle: 150 // Smaller player, lower revenue
};

/**
 * Volume bonus rate
 * Credits earned per 100K emails processed
 */
export const VOLUME_BONUS_RATE = 20; // 20 credits per 100K emails

/**
 * Volume unit for bonus calculation (100,000 emails)
 */
export const VOLUME_BONUS_UNIT = 100000;

/**
 * Satisfaction multiplier tiers
 * Applied to (base_revenue + volume_bonus)
 */
export interface SatisfactionTier {
	min: number;
	max: number;
	multiplier: number;
	label: string;
}

export const SATISFACTION_MULTIPLIER_TIERS: SatisfactionTier[] = [
	{ min: 90, max: 100, multiplier: 1.5, label: 'Excellent' }, // +50% bonus
	{ min: 80, max: 89, multiplier: 1.3, label: 'Very Good' }, // +30% bonus
	{ min: 75, max: 79, multiplier: 1.1, label: 'Good' }, // +10% bonus
	{ min: 70, max: 74, multiplier: 0.95, label: 'Acceptable' }, // -5% penalty
	{ min: 60, max: 69, multiplier: 0.8, label: 'Warning' }, // -20% penalty
	{ min: 50, max: 59, multiplier: 0.6, label: 'Poor' }, // -40% penalty
	{ min: 0, max: 49, multiplier: 0.3, label: 'Crisis' } // -70% penalty
];

/**
 * Get satisfaction multiplier for a given satisfaction score
 * @param satisfaction - User satisfaction score (0-100)
 * @returns Multiplier value
 */
export function getSatisfactionMultiplier(satisfaction: number): number {
	const tier = SATISFACTION_MULTIPLIER_TIERS.find(
		(t) => satisfaction >= t.min && satisfaction <= t.max
	);
	return tier?.multiplier ?? 1.0;
}

/**
 * Get satisfaction tier label for a given satisfaction score
 * @param satisfaction - User satisfaction score (0-100)
 * @returns Tier label (e.g., "Excellent", "Warning", "Crisis")
 */
export function getSatisfactionTierLabel(satisfaction: number): string {
	const tier = SATISFACTION_MULTIPLIER_TIERS.find(
		(t) => satisfaction >= t.min && satisfaction <= t.max
	);
	return tier?.label ?? 'Unknown';
}
