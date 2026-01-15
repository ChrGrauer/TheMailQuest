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
		effect_description: '+2 reputation per destination, 50% volume reduction first round',
		benefits: [
			'Reduces volume by 50% during first round of activity only',
			'+2 reputation bonus per destination (applies to each destination separately)',
			'Builds positive sender reputation from the start',
			'Reduces risk of immediate spam complaints'
		]
	},
	{
		id: 'list_hygiene',
		name: 'Activate List Hygiene',
		description: 'Clean and validate subscriber list',
		cost: LIST_HYGIENE_COST,
		effect_description: 'Permanent risk reduction 50%, volume reduction 5-15%',
		benefits: [
			'Removes bounced and inactive email addresses',
			'Reduces spam complaint rate by 50%',
			'Reduces spam trap risk by 40%',
			'Reduces volume by 5-15% depending on client list collection practices',
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

/**
 * Warmup reputation bonus per destination
 * US-3.3: Resolution Phase Automation - Iteration 5
 */
export const WARMUP_REPUTATION_BONUS = 2; // +2 reputation per destination

/**
 * Warmup volume reduction (first round only)
 * US-3.3: Resolution Phase Automation - Iteration 5
 */
export const WARMUP_VOLUME_REDUCTION = 0.5; // 50% volume reduction

/**
 * List Hygiene volume reduction by risk level
 * US-3.3: Resolution Phase Automation - Iteration 5
 */
export const LIST_HYGIENE_VOLUME_REDUCTION: Record<'Low' | 'Medium' | 'High', number> = {
	Low: 0.05, // 5% volume reduction for low risk clients
	Medium: 0.1, // 10% volume reduction for medium risk clients
	High: 0.15 // 15% volume reduction for high risk clients
};

/**
 * List Hygiene complaint rate reduction
 * US-3.3: Resolution Phase Automation - Iteration 5
 */
export const LIST_HYGIENE_COMPLAINT_REDUCTION = 0.5; // 50% reduction

/**
 * List Hygiene spam trap risk reduction
 * US-3.3: Resolution Phase Automation - Iteration 7
 */
export const LIST_HYGIENE_SPAM_TRAP_REDUCTION = 0.4; // 40% reduction

/**
 * Get volume reduction percentage for List Hygiene based on client risk
 */
export function getListHygieneVolumeReduction(risk: 'Low' | 'Medium' | 'High'): number {
	return LIST_HYGIENE_VOLUME_REDUCTION[risk];
}
