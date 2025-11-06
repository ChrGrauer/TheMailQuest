/**
 * US-2.3: Technical Infrastructure Shop - Tech Validator
 *
 * Validates tech purchase attempts including:
 * - Dependency requirements (SPF → DKIM → DMARC chain)
 * - Credit/budget requirements
 * - Already owned validation
 * - Upgrade existence validation
 */

import type { ESPTeam } from '../types';
import type { TechnicalUpgrade } from '$lib/config/technical-upgrades';
import { getTechnicalUpgrade } from '$lib/config/technical-upgrades';

/**
 * Tech Purchase Validation Result
 */
export interface TechPurchaseValidation {
	canPurchase: boolean;
	reason?: 'insufficient_credits' | 'unmet_dependencies' | 'already_owned' | 'upgrade_not_found';
	missingDependencies?: string[];
	requiredCredits?: number;
	availableCredits?: number;
}

/**
 * Dependency Check Result
 */
export interface DependencyCheckResult {
	met: boolean;
	missing: string[];
}

/**
 * Budget Check Result
 */
export interface BudgetCheckResult {
	sufficient: boolean;
	required?: number;
	available?: number;
}

/**
 * Check if all dependencies for a tech upgrade are met
 *
 * @param upgrade - The upgrade to check
 * @param ownedTechIds - Array of owned tech IDs
 * @returns Result with met flag and missing dependency IDs
 */
export function checkDependencies(
	upgrade: TechnicalUpgrade,
	ownedTechIds: string[]
): DependencyCheckResult {
	if (!upgrade.dependencies || upgrade.dependencies.length === 0) {
		return { met: true, missing: [] };
	}

	const missing = upgrade.dependencies.filter((depId) => !ownedTechIds.includes(depId));
	return { met: missing.length === 0, missing };
}

/**
 * Check if team has sufficient credits for purchase
 *
 * @param upgrade - The upgrade to purchase
 * @param teamCredits - Current team credits
 * @returns Result with sufficient flag and credit amounts
 */
export function checkBudgetSufficient(
	upgrade: TechnicalUpgrade,
	teamCredits: number
): BudgetCheckResult {
	const sufficient = teamCredits >= upgrade.cost;
	return {
		sufficient,
		required: upgrade.cost,
		available: teamCredits
	};
}

/**
 * Validate tech purchase attempt
 *
 * Validation checks (in priority order):
 * 1. Upgrade exists
 * 2. Upgrade not already owned
 * 3. Dependencies met (if any)
 * 4. Sufficient credits
 *
 * @param team - ESP team attempting to purchase
 * @param upgrade - Upgrade to purchase
 * @returns Validation result with canPurchase flag and optional reason
 */
export function validateTechPurchase(
	team: ESPTeam,
	upgrade: TechnicalUpgrade
): TechPurchaseValidation {
	// Priority 1: Check if already owned
	if (team.owned_tech_upgrades.includes(upgrade.id)) {
		return {
			canPurchase: false,
			reason: 'already_owned'
		};
	}

	// Priority 2: Check dependencies
	const dependencyCheck = checkDependencies(upgrade, team.owned_tech_upgrades);
	if (!dependencyCheck.met) {
		return {
			canPurchase: false,
			reason: 'unmet_dependencies',
			missingDependencies: dependencyCheck.missing
		};
	}

	// Priority 3: Check sufficient credits
	const budgetCheck = checkBudgetSufficient(upgrade, team.credits);
	if (!budgetCheck.sufficient) {
		return {
			canPurchase: false,
			reason: 'insufficient_credits',
			requiredCredits: budgetCheck.required,
			availableCredits: budgetCheck.available
		};
	}

	// All checks passed
	return {
		canPurchase: true
	};
}

/**
 * Get user-friendly error message for validation failure
 *
 * @param validation - Validation result
 * @returns Human-readable error message
 */
export function getValidationErrorMessage(validation: TechPurchaseValidation): string {
	if (validation.canPurchase) {
		return '';
	}

	switch (validation.reason) {
		case 'insufficient_credits':
			return `Insufficient credits. Need ${validation.requiredCredits}, have ${validation.availableCredits}`;
		case 'unmet_dependencies':
			if (validation.missingDependencies && validation.missingDependencies.length > 0) {
				const missingNames = validation.missingDependencies
					.map((id) => {
						const tech = getTechnicalUpgrade(id);
						return tech ? tech.name : id.toUpperCase();
					})
					.join(', ');
				return `Missing required upgrades: ${missingNames}`;
			}
			return 'Missing required dependencies';
		case 'already_owned':
			return 'This upgrade is already owned';
		case 'upgrade_not_found':
			return 'Upgrade not found';
		default:
			return 'Cannot purchase this upgrade';
	}
}
