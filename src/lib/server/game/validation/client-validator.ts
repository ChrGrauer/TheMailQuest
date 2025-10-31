/**
 * US-2.2: Client Marketplace - Client Validator
 *
 * Validates client acquisition attempts including:
 * - Credit requirements
 * - Tech requirements (SPF+DKIM+DMARC for Premium)
 * - Reputation requirements (weighted average >= 85 for Premium)
 * - Client existence and ownership
 */

import type { ESPTeam, Client, Destination } from '../types';

/**
 * Client Acquisition Validation Result
 */
export interface ClientAcquisitionValidation {
	canAcquire: boolean;
	reason?:
		| 'insufficient_credits'
		| 'missing_tech'
		| 'insufficient_reputation'
		| 'client_not_found'
		| 'already_owned';
	missingTech?: string[];
	requiredReputation?: number;
	actualReputation?: number;
}

/**
 * Destination market weights for overall reputation calculation
 * Gmail: 50%, Outlook: 30%, Yahoo: 20%
 */
const DESTINATION_WEIGHTS: Record<string, number> = {
	Gmail: 50,
	Outlook: 30,
	Yahoo: 20
};

/**
 * Calculate overall reputation as weighted average
 *
 * @param reputation - Per-destination reputation scores
 * @param destinations - Array of active destinations
 * @returns Weighted average reputation (rounded to nearest integer)
 */
export function calculateOverallReputation(
	reputation: Record<string, number>,
	destinations: Destination[]
): number {
	let weightedSum = 0;
	let totalWeight = 0;

	destinations.forEach((dest) => {
		const weight = DESTINATION_WEIGHTS[dest.name] || 0;
		const score = reputation[dest.name] || 0;

		weightedSum += score * weight;
		totalWeight += weight;
	});

	if (totalWeight === 0) {
		return 0;
	}

	return Math.round(weightedSum / totalWeight);
}

/**
 * Validate client acquisition attempt
 *
 * Validation checks (in priority order):
 * 1. Client exists in available_clients
 * 2. Client not already owned
 * 3. Sufficient credits
 * 4. Tech requirements met (if any)
 * 5. Reputation requirements met (if any)
 *
 * @param team - ESP team attempting to acquire
 * @param client - Client to acquire
 * @param currentRound - Current game round
 * @param destinations - Array of active destinations
 * @returns Validation result with canAcquire flag and optional reason
 */
export function validateClientAcquisition(
	team: ESPTeam,
	client: Client,
	currentRound: number,
	destinations: Destination[]
): ClientAcquisitionValidation {
	// Priority 1: Check if client already owned
	if (team.active_clients.includes(client.id)) {
		return {
			canAcquire: false,
			reason: 'already_owned'
		};
	}

	// Priority 2: Check if client exists in available_clients
	const clientInMarketplace = team.available_clients.some((c) => c.id === client.id);
	if (!clientInMarketplace) {
		return {
			canAcquire: false,
			reason: 'client_not_found'
		};
	}

	// Priority 3: Check sufficient credits
	if (team.credits < client.cost) {
		return {
			canAcquire: false,
			reason: 'insufficient_credits'
		};
	}

	// Priority 4: Check tech requirements (for Premium clients)
	if (client.requirements?.tech) {
		const missingTech = client.requirements.tech.filter(
			(requiredTech) => !team.owned_tech_upgrades.includes(requiredTech) // US-2.3
		);

		if (missingTech.length > 0) {
			return {
				canAcquire: false,
				reason: 'missing_tech',
				missingTech
			};
		}
	}

	// Priority 5: Check reputation requirements (for Premium clients)
	if (client.requirements?.reputation) {
		const overallReputation = calculateOverallReputation(team.reputation, destinations);

		if (overallReputation < client.requirements.reputation) {
			return {
				canAcquire: false,
				reason: 'insufficient_reputation',
				requiredReputation: client.requirements.reputation,
				actualReputation: overallReputation
			};
		}
	}

	// All checks passed
	return {
		canAcquire: true
	};
}

/**
 * Get user-friendly error message for validation failure
 *
 * @param validation - Validation result
 * @returns Human-readable error message
 */
export function getValidationErrorMessage(validation: ClientAcquisitionValidation): string {
	if (validation.canAcquire) {
		return '';
	}

	switch (validation.reason) {
		case 'insufficient_credits':
			return 'Insufficient credits to acquire this client';
		case 'missing_tech':
			if (validation.missingTech && validation.missingTech.length === 1) {
				const techName = validation.missingTech[0].toUpperCase();
				return `Missing ${techName}`;
			}
			return `Missing required technology: ${validation.missingTech?.join(', ')}`;
		case 'insufficient_reputation':
			return `Reputation too low (${validation.actualReputation}/${validation.requiredReputation})`;
		case 'client_not_found':
			return 'Client not available in marketplace';
		case 'already_owned':
			return 'Client already acquired';
		default:
			return 'Cannot acquire this client';
	}
}
