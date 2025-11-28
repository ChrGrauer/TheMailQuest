/**
 * Client Portfolio Validator
 * US-2.4: Client Basic Management
 *
 * Validation logic for client portfolio operations:
 * - Status toggle validation
 * - Onboarding configuration validation
 * - Lock-in validation
 */

import type { ESPTeam } from '../types';
import { calculateOnboardingCost } from '$lib/config/client-onboarding';
import type { OnboardingOptions } from '../client-portfolio-manager';

/**
 * Validation result for status toggle
 */
export interface StatusToggleValidation {
	canToggle: boolean;
	reason?: string;
}

/**
 * Validation result for onboarding config
 */
export interface OnboardingConfigValidation {
	canConfigure: boolean;
	reason?: string;
	requiredCredits?: number;
	availableCredits?: number;
}

/**
 * Validation result for lock-in
 */
export interface LockInValidation {
	canLockIn: boolean;
	reason?: string;
}

/**
 * Validate client status toggle
 *
 * Rules:
 * - Client must exist in client_states
 * - Cannot toggle suspended clients
 * - Cannot toggle TO suspended status (only game engine can do that)
 *
 * @param team - ESP team
 * @param clientId - Client ID
 * @param newStatus - New status
 * @returns Validation result
 */
export function validateStatusToggle(
	team: ESPTeam,
	clientId: string,
	newStatus: 'Active' | 'Paused' | 'Suspended'
): StatusToggleValidation {
	// Check client exists
	if (!team.client_states || !team.client_states[clientId]) {
		return {
			canToggle: false,
			reason: `Client ${clientId} not found in team portfolio`
		};
	}

	const currentState = team.client_states[clientId];

	// US-2.7: Cannot toggle suspended clients - suspension is permanent
	if (currentState.status === 'Suspended') {
		return {
			canToggle: false,
			reason: 'Suspended clients cannot be reactivated'
		};
	}

	// Cannot toggle TO suspended status
	if (newStatus === 'Suspended') {
		return {
			canToggle: false,
			reason: 'Cannot manually set Suspended status. Only the game engine can suspend clients.'
		};
	}

	return {
		canToggle: true
	};
}

/**
 * Validate onboarding configuration
 *
 * Rules:
 * - Client must exist in client_states
 * - Client must be new (first_active_round = null)
 * - Team must have sufficient credits for selected options
 *
 * @param team - ESP team
 * @param clientId - Client ID
 * @param options - Onboarding options
 * @returns Validation result
 */
export function validateOnboardingConfig(
	team: ESPTeam,
	clientId: string,
	options: OnboardingOptions
): OnboardingConfigValidation {
	// Check client exists
	if (!team.client_states || !team.client_states[clientId]) {
		return {
			canConfigure: false,
			reason: `Client ${clientId} not found in team portfolio`
		};
	}

	const currentState = team.client_states[clientId];

	// Only new clients can configure onboarding
	if (currentState.first_active_round !== null) {
		return {
			canConfigure: false,
			reason:
				'Onboarding options are only available for clients that have not been activated yet. This client has already been activated in a previous round.'
		};
	}

	// Calculate required credits
	const requiredCredits = calculateOnboardingCost(options.warmup, options.listHygiene);

	// Check budget
	if (team.credits < requiredCredits) {
		return {
			canConfigure: false,
			reason: `Insufficient credits for onboarding options. Required: ${requiredCredits}, Available: ${team.credits}`,
			requiredCredits,
			availableCredits: team.credits
		};
	}

	return {
		canConfigure: true
	};
}

/**
 * Validate decision lock-in
 *
 * Rules:
 * - Must be in planning phase
 * - Budget must not be negative
 *
 * @param team - ESP team
 * @param phase - Current game phase
 * @returns Validation result
 */
export function validateLockIn(team: ESPTeam, phase: string): LockInValidation {
	// Must be in planning phase
	if (phase !== 'planning') {
		return {
			canLockIn: false,
			reason: 'Lock-in is only available during the planning phase'
		};
	}

	// Budget must not be negative
	if (team.credits < 0) {
		return {
			canLockIn: false,
			reason: `Cannot lock in with negative budget. Current credits: ${team.credits}`
		};
	}

	return {
		canLockIn: true
	};
}
