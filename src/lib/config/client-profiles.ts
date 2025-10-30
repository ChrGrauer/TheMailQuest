/**
 * Client Profiles Configuration
 * US-2.2: Client Marketplace
 *
 * Defines all client types and their profiles for the marketplace.
 * Each ESP team gets 13 clients total with ±10% variance applied during generation.
 */

import type { ClientType, ClientRequirements } from '$lib/server/game/types';

/**
 * Client Profile
 * Baseline values for each client type (variance applied during generation)
 */
export interface ClientProfile {
	type: ClientType;
	baseCost: number; // Baseline acquisition cost
	baseRevenue: number; // Baseline revenue per round
	baseVolume: number; // Baseline email volume (numeric)
	risk: 'Low' | 'Medium' | 'High';
	baseSpamRate: number; // Baseline spam complaint rate (e.g., 1.2 for 1.2%)
	availableFromRound: number; // Round when this type becomes available
	count: number; // How many of this type per team
	requirements?: ClientRequirements; // Optional requirements (for Premium Brand)
	description: string; // Description for display
}

/**
 * All client type profiles
 * Distribution: 13 total = 2 Premium + 3 Growing + 3 Re-engagement + 2 Aggressive + 3 Event
 */
export const CLIENT_PROFILES: ClientProfile[] = [
	{
		type: 'premium_brand',
		baseCost: 300,
		baseRevenue: 350,
		baseVolume: 30000,
		risk: 'Low',
		baseSpamRate: 0.5,
		availableFromRound: 3,
		count: 2,
		requirements: {
			tech: ['spf', 'dkim', 'dmarc'],
			reputation: 85
		},
		description:
			'Established brand with engaged subscriber base. Excellent reputation, low complaint rates. Requires full authentication stack.'
	},
	{
		type: 'growing_startup',
		baseCost: 150,
		baseRevenue: 180,
		baseVolume: 35000,
		risk: 'Medium',
		baseSpamRate: 1.2,
		availableFromRound: 1,
		count: 3,
		description:
			'Fast-growing SaaS company with expanding list. Good engagement but occasional complaints.'
	},
	{
		type: 're_engagement',
		baseCost: 100,
		baseRevenue: 120,
		baseVolume: 50000,
		risk: 'High',
		baseSpamRate: 2.5,
		availableFromRound: 1,
		count: 3,
		description:
			'Re-activation campaign targeting inactive subscribers. High volume, significant reputation risk.'
	},
	{
		type: 'aggressive_marketer',
		baseCost: 200,
		baseRevenue: 250,
		baseVolume: 60000,
		risk: 'High',
		baseSpamRate: 3.0,
		availableFromRound: 2,
		count: 2,
		description:
			'High-volume email marketer with purchased lists. High revenue but significant reputation risk.'
	},
	{
		type: 'event_seasonal',
		baseCost: 120,
		baseRevenue: 150,
		baseVolume: 40000,
		risk: 'Medium',
		baseSpamRate: 1.5,
		availableFromRound: 1,
		count: 3,
		description:
			'Seasonal campaign with time-sensitive promotions. Moderate risk with concentrated traffic.'
	}
];

/**
 * Unique client names
 * These names are assigned to clients during generation.
 * The same names are used across all ESP teams, but each team has independent stock.
 */
export const CLIENT_NAMES = [
	'Tech Innovators',
	'Luxury Corp',
	'Green Energy Co',
	'Fashion Forward',
	'Travel Adventures',
	'Food Delights',
	'Fitness First',
	'Auto Express',
	'Home & Garden',
	'Education Hub',
	'Finance Pro',
	'Health Plus',
	'Entertainment Now'
] as const;

/**
 * Get client profile by type
 */
export function getClientProfile(type: ClientType): ClientProfile | undefined {
	return CLIENT_PROFILES.find((profile) => profile.type === type);
}

/**
 * Get all client profiles available in a given round
 */
export function getAvailableProfilesForRound(round: number): ClientProfile[] {
	return CLIENT_PROFILES.filter((profile) => profile.availableFromRound <= round);
}

/**
 * Get total number of clients per team
 */
export function getTotalClientCount(): number {
	return CLIENT_PROFILES.reduce((sum, profile) => sum + profile.count, 0);
}

/**
 * Validate that we have exactly 13 clients total
 */
export function validateClientDistribution(): boolean {
	const total = getTotalClientCount();
	const expected = 13;
	if (total !== expected) {
		throw new Error(
			`Invalid client distribution: expected ${expected} clients total, got ${total}`
		);
	}
	return true;
}

/**
 * Validate that we have exactly 13 unique client names
 */
export function validateClientNames(): boolean {
	const expected = 13;
	if (CLIENT_NAMES.length !== expected) {
		throw new Error(
			`Invalid client names: expected ${expected} names, got ${CLIENT_NAMES.length}`
		);
	}
	return true;
}
