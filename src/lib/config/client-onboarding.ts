/**
 * Client Onboarding Configuration
 * US-2.4: Client Basic Management
 *
 * Defines onboarding options available for new clients (first round of activity).
 * These are one-time configurations that can be purchased when a client
 * has first_active_round = null.
 */

/**
 * Onboarding option costs
 */
export const WARMUP_COST = 150;
export const LIST_HYGIENE_COST = 80;

/**
 * Onboarding Option Type
 */
export type OnboardingOptionId = 'warmup' | 'list_hygiene';

/**
 * Onboarding Option Interface
 * Defines the metadata and effects of an onboarding option
 */
export interface OnboardingOption {
	id: OnboardingOptionId;
	name: string;
	description: string;
	cost: number;
	effect_description: string;
	benefits: string[];
}

/**
 * All available onboarding options
 */
export const ONBOARDING_OPTIONS: OnboardingOption[] = [
	{
		id: 'warmup',
		name: 'Activate Warm-up',
		description: 'IP/Domain warm-up period',
		cost: WARMUP_COST,
		effect_description: 'Reduces volume 50%, +2 reputation, reduce reputation risk',
		benefits: [
			'Gradually increases sending volume over first 2 rounds',
			'Builds positive sender reputation from the start',
			'Reduces risk of immediate spam complaints',
			'+2 reputation bonus per destination'
		]
	},
	{
		id: 'list_hygiene',
		name: 'Activate List Hygiene',
		description: 'Clean and validate subscriber list',
		cost: LIST_HYGIENE_COST,
		effect_description: 'Permanent risk reduction 50%',
		benefits: [
			'Removes bounced and inactive email addresses',
			'Reduces spam complaint rate by 50%',
			'Permanent improvement to client quality',
			'Better engagement metrics'
		]
	}
];

/**
 * Get onboarding option by ID
 */
export function getOnboardingOption(id: OnboardingOptionId): OnboardingOption | undefined {
	return ONBOARDING_OPTIONS.find((option) => option.id === id);
}

/**
 * Calculate total cost for selected onboarding options
 */
export function calculateOnboardingCost(warmup: boolean, listHygiene: boolean): number {
	let total = 0;
	if (warmup) total += WARMUP_COST;
	if (listHygiene) total += LIST_HYGIENE_COST;
	return total;
}
