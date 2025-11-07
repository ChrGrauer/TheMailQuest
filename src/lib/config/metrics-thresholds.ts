/**
 * Metrics Thresholds Configuration
 * US-2.5: Destination Kingdom Dashboard
 *
 * Centralizes all color-coding thresholds for reputation, satisfaction, and spam rates
 * Used by both ESP and Destination dashboards for consistent color coding
 */

export type MetricStatus = 'excellent' | 'good' | 'warning' | 'poor' | 'blacklist';
export type SpamRateStatus = 'low' | 'medium' | 'high';

export interface MetricThreshold {
	status: MetricStatus;
	label: string;
	min: number;
	max: number;
	color: string; // Text color class
	bgColor: string; // Background color class
	icon: string; // Icon for accessibility
}

export interface SpamRateThreshold {
	status: SpamRateStatus;
	label: string;
	min: number;
	max: number;
	color: string;
	bgColor: string;
	icon: string;
}

/**
 * Reputation & Satisfaction Thresholds
 * Based on feature files US-2.1 and US-2.5
 *
 * Excellent: ≥90 (Green)
 * Good: 70-89 (Blue)
 * Warning: 50-69 (Orange)
 * Poor: 30-49 (Red)
 * Blacklist: 0-29 (Black/Gray)
 */
export const REPUTATION_THRESHOLDS: MetricThreshold[] = [
	{
		status: 'excellent',
		label: 'Excellent',
		min: 90,
		max: 100,
		color: 'text-green-700',
		bgColor: 'bg-green-500',
		icon: '✓'
	},
	{
		status: 'good',
		label: 'Good',
		min: 70,
		max: 89,
		color: 'text-blue-700',
		bgColor: 'bg-blue-500',
		icon: '👍'
	},
	{
		status: 'warning',
		label: 'Warning',
		min: 50,
		max: 69,
		color: 'text-orange-700',
		bgColor: 'bg-orange-500',
		icon: '⚠'
	},
	{
		status: 'poor',
		label: 'Poor',
		min: 30,
		max: 49,
		color: 'text-red-700',
		bgColor: 'bg-red-500',
		icon: '!'
	},
	{
		status: 'blacklist',
		label: 'Blacklist',
		min: 0,
		max: 29,
		color: 'text-gray-900',
		bgColor: 'bg-gray-900',
		icon: '✕'
	}
];

/**
 * User Satisfaction Thresholds
 * Same as reputation thresholds (per feature spec)
 */
export const SATISFACTION_THRESHOLDS: MetricThreshold[] = REPUTATION_THRESHOLDS;

/**
 * Spam Complaint Rate Thresholds
 * Based on feature file US-2.5
 *
 * Low: <0.05% (Green)
 * Medium: 0.05%-0.15% (Orange)
 * High: ≥0.15% (Red)
 */
export const SPAM_RATE_THRESHOLDS: SpamRateThreshold[] = [
	{
		status: 'low',
		label: 'Low',
		min: 0,
		max: 0.05,
		color: 'text-green-700',
		bgColor: 'bg-green-500',
		icon: '✓'
	},
	{
		status: 'medium',
		label: 'Medium',
		min: 0.05,
		max: 0.15,
		color: 'text-orange-700',
		bgColor: 'bg-orange-500',
		icon: '⚠'
	},
	{
		status: 'high',
		label: 'High',
		min: 0.15,
		max: 100,
		color: 'text-red-700',
		bgColor: 'bg-red-500',
		icon: '!'
	}
];

/**
 * Get reputation status for a given score (0-100)
 */
export function getReputationStatus(score: number): MetricThreshold {
	const threshold = REPUTATION_THRESHOLDS.find((t) => score >= t.min && score <= t.max);
	// Default to blacklist if somehow out of range
	return threshold || REPUTATION_THRESHOLDS[4];
}

/**
 * Get satisfaction status for a given score (0-100)
 */
export function getSatisfactionStatus(score: number): MetricThreshold {
	return getReputationStatus(score); // Same thresholds
}

/**
 * Get spam rate status for a given rate (percentage, e.g., 0.04 for 0.04%)
 */
export function getSpamRateStatus(rate: number): SpamRateThreshold {
	const threshold = SPAM_RATE_THRESHOLDS.find((t) => rate >= t.min && rate < t.max);
	// If exactly at upper bound or above, return high
	if (rate >= 0.15) {
		return SPAM_RATE_THRESHOLDS[2]; // High
	}
	// Default to low if somehow out of range
	return threshold || SPAM_RATE_THRESHOLDS[0];
}

/**
 * Format spam rate for display
 * @param rate - Spam rate as percentage (e.g., 0.04 for 0.04%)
 * @returns Formatted string (e.g., "0.04%")
 */
export function formatSpamRate(rate: number): string {
	return `${rate.toFixed(2)}%`;
}

/**
 * Format volume for display
 * @param volume - Email volume as number
 * @returns Formatted string (e.g., "185K", "1.2M")
 */
export function formatVolume(volume: number): string {
	if (volume >= 1000000) {
		return `${(volume / 1000000).toFixed(1)}M`;
	} else if (volume >= 1000) {
		return `${Math.round(volume / 1000)}K`;
	}
	return volume.toString();
}

/**
 * Delivery success rates by reputation zone
 * US-3.3: Resolution Phase Automation - Iteration 2
 */
export const REPUTATION_DELIVERY_SUCCESS: Record<MetricStatus, number> = {
	excellent: 0.95, // 95% delivery success
	good: 0.85, // 85% delivery success
	warning: 0.70, // 70% delivery success
	poor: 0.50, // 50% delivery success
	blacklist: 0.05 // 5% delivery success (near-total block)
};

/**
 * Get delivery success rate for a reputation score
 */
export function getDeliverySuccessRate(reputation: number): number {
	const status = getReputationStatus(reputation);
	return REPUTATION_DELIVERY_SUCCESS[status.status];
}
