/**
 * US-2.6.2: Destination Tool Validator
 *
 * Validates tool purchase attempts for destinations
 */

import type { Destination } from '../types';
import type { DestinationTool } from '$lib/config/destination-technical-upgrades';

export interface DestinationToolValidation {
	canPurchase: boolean;
	reason?: string;
	missingDependencies?: string[];
	requiredCredits?: number;
	availableCredits?: number;
}

/**
 * Validate tool purchase attempt
 *
 * Checks:
 * 1. Kingdom availability (e.g., ML System unavailable for Yahoo)
 * 2. Already owned (unless single-round tool like Spam Trap)
 * 3. Prerequisites met (Auth Validator L1 → L2 → L3)
 * 4. Sufficient budget
 */
export function validateToolPurchase(
	destination: Destination,
	tool: DestinationTool
): DestinationToolValidation {
	// Check kingdom availability
	const kingdom = destination.kingdom || 'Gmail';
	if (!tool.availability[kingdom]) {
		return {
			canPurchase: false,
			reason: 'tool_unavailable_for_kingdom'
		};
	}

	// Check if already owned (permanent tools only)
	const ownedTools = destination.owned_tools || [];
	if (tool.permanent && ownedTools.includes(tool.id)) {
		return {
			canPurchase: false,
			reason: 'already_owned'
		};
	}

	// Check dependencies (Auth Validator progression)
	if (tool.requires) {
		const requirements = Array.isArray(tool.requires) ? tool.requires : [tool.requires];
		const missing = requirements.filter((reqId) => !ownedTools.includes(reqId));
		if (missing.length > 0) {
			return {
				canPurchase: false,
				reason: 'missing_dependencies',
				missingDependencies: missing
			};
		}
	}

	// Check budget
	const cost = tool.pricing[kingdom];
	if (cost !== null && destination.budget < cost) {
		return {
			canPurchase: false,
			reason: 'insufficient_budget',
			requiredCredits: cost,
			availableCredits: destination.budget
		};
	}

	// All validations passed
	return { canPurchase: true };
}

/**
 * Get human-readable validation error message
 */
export function getValidationErrorMessage(validation: DestinationToolValidation): string {
	switch (validation.reason) {
		case 'tool_unavailable_for_kingdom':
			return 'This tool is not available for your kingdom';
		case 'already_owned':
			return 'You already own this tool';
		case 'missing_dependencies':
			return `Missing required tools: ${validation.missingDependencies?.join(', ')}`;
		case 'insufficient_budget':
			return 'Insufficient budget';
		default:
			return 'Purchase failed';
	}
}
