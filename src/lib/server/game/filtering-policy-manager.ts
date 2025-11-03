/**
 * US-2.6.1: Destination Filtering Controls - Policy Manager
 *
 * Handles filtering policy management for destinations including:
 * - Calculating impact values for filtering levels
 * - Validating filtering levels
 * - Initializing default filtering policies
 * - Updating filtering policies
 * - Comprehensive logging
 */

import { getSession, updateActivity } from './session-manager';
import type {
	FilteringLevel,
	FilteringPolicy,
	FilteringPolicyUpdateResult,
	Destination,
	ESPTeam
} from './types';
import { gameLogger } from '../logger';
import { calculateImpactValues } from '$lib/utils/filtering';

// Re-export for backward compatibility
export { calculateImpactValues } from '$lib/utils/filtering';

/**
 * Validate if a string is a valid filtering level
 *
 * @param level - String to validate
 * @returns True if level is valid, false otherwise
 */
export function validateFilteringLevel(level: string): level is FilteringLevel {
	const validLevels: FilteringLevel[] = ['permissive', 'moderate', 'strict', 'maximum'];
	return validLevels.includes(level as FilteringLevel);
}

/**
 * Initialize filtering policies for a destination
 *
 * Sets all ESP teams to permissive level (0% spam reduction, 0% false positives).
 * This function is called ONCE during resource allocation before Round 1.
 *
 * @param destination - Destination to initialize
 * @param espTeams - List of ESP teams in the game
 */
export function initializeFilteringPolicies(
	destination: Destination,
	espTeams: ESPTeam[]
): void {
	// Initialize filtering_policies object if not exists
	if (!destination.filtering_policies) {
		destination.filtering_policies = {};
	}

	// Set all ESPs to permissive level by default
	for (const team of espTeams) {
		destination.filtering_policies[team.name] = {
			espName: team.name,
			level: 'permissive',
			spamReduction: 0,
			falsePositives: 0
		};
	}

	gameLogger.event('filtering_policies_initialized', {
		destinationName: destination.name,
		espCount: espTeams.length
	});
}

/**
 * Update filtering policy for a specific ESP at a destination
 *
 * Process:
 * 1. Validate session exists
 * 2. Validate destination exists
 * 3. Validate ESP exists in the game
 * 4. Validate filtering level is valid
 * 5. Calculate impact values
 * 6. Update filtering policy
 * 7. Log update
 * 8. Return updated policies
 *
 * @param roomCode - Game session room code
 * @param destName - Destination name (case-insensitive)
 * @param espName - ESP team name (case-insensitive)
 * @param level - Filtering level to apply
 * @returns Update result with success flag and filtering policies or error
 */
export async function updateFilteringPolicy(
	roomCode: string,
	destName: string,
	espName: string,
	level: FilteringLevel
): Promise<FilteringPolicyUpdateResult> {
	// Validate session exists
	const session = getSession(roomCode);
	if (!session) {
		gameLogger.event('filtering_policy_update_failed', {
			roomCode,
			destName,
			espName,
			level,
			reason: 'session_not_found'
		});
		return {
			success: false,
			error: 'Session not found'
		};
	}

	// Find destination (case-insensitive)
	const destIndex = session.destinations.findIndex(
		(d) => d.name.toLowerCase() === destName.toLowerCase()
	);

	if (destIndex === -1) {
		gameLogger.event('filtering_policy_update_failed', {
			roomCode,
			destName,
			espName,
			level,
			reason: 'destination_not_found'
		});
		return {
			success: false,
			error: 'Destination not found'
		};
	}

	const destination = session.destinations[destIndex];

	// Validate ESP exists in game (case-insensitive)
	const espExists = session.esp_teams.some(
		(team) => team.name.toLowerCase() === espName.toLowerCase()
	);

	if (!espExists) {
		gameLogger.event('filtering_policy_update_failed', {
			roomCode,
			destName,
			espName,
			level,
			reason: 'esp_not_found'
		});
		return {
			success: false,
			error: `ESP team "${espName}" not found in game`
		};
	}

	// Validate filtering level
	if (!validateFilteringLevel(level)) {
		gameLogger.event('filtering_policy_update_failed', {
			roomCode,
			destName,
			espName,
			level,
			reason: 'invalid_filtering_level'
		});
		return {
			success: false,
			error: 'Invalid filtering level'
		};
	}

	// Initialize filtering_policies if undefined
	if (!destination.filtering_policies) {
		destination.filtering_policies = {};
	}

	// Calculate impact values
	const impact = calculateImpactValues(level);

	// Get the correct ESP name (with original casing from session)
	const actualESPName =
		session.esp_teams.find((team) => team.name.toLowerCase() === espName.toLowerCase())
			?.name || espName;

	// Update filtering policy
	destination.filtering_policies[actualESPName] = {
		espName: actualESPName,
		level,
		spamReduction: impact.spamReduction,
		falsePositives: impact.falsePositives
	};

	// Update activity timestamp
	updateActivity(roomCode);

	// Log successful update
	gameLogger.event('filtering_policy_updated', {
		roomCode,
		destName: destination.name,
		espName: actualESPName,
		level,
		spamReduction: impact.spamReduction,
		falsePositives: impact.falsePositives
	});

	// Return success with updated policies
	return {
		success: true,
		filtering_policies: destination.filtering_policies
	};
}
