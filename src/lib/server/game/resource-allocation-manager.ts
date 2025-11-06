/**
 * Resource Allocation Manager
 * US-1.4: Resources Allocation
 * US-2.2: Client Marketplace (added client generation)
 *
 * Handles allocation of starting resources to ESP teams and destinations
 * - ESP Teams: credits, reputation per destination, client marketplace stock
 * - Destinations: budgets
 * - Shared pool creation
 * - Configuration validation
 * - Rollback mechanism
 */

import { getSession, updateActivity } from './session-manager';
import { validateRoomCode } from './validation/room-validator';
import type { GameConfiguration } from './types';
import { gameLogger } from '../logger';
import { generateClientStockForTeam } from './client-generator';
import { initializeFilteringPolicies } from './filtering-policy-manager';

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIGURATION: GameConfiguration = {
	esp_starting_credits: 1000,
	esp_starting_reputation: 70,
	destination_budgets: {
		Gmail: 500,
		Outlook: 350,
		Yahoo: 200
	},
	shared_pool_credits: 150,
	planning_phase_duration: 300 // 5 minutes
};

// ============================================================================
// TYPES
// ============================================================================

export interface ResourceAllocationRequest {
	roomCode: string;
	config?: GameConfiguration;
}

export interface ResourceAllocationResult {
	success: boolean;
	error?: string;
}

export interface ConfigurationValidation {
	isValid: boolean;
	config?: GameConfiguration;
	error?: string;
}

export interface RollbackRequest {
	roomCode: string;
}

export interface RollbackResult {
	success: boolean;
	error?: string;
}

// Export types
export type { GameConfiguration };

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

/**
 * Validate game configuration
 * Uses default configuration if none provided
 * @param config Optional custom configuration
 * @returns Validation result with config or error
 */
export function validateConfiguration(config?: GameConfiguration): ConfigurationValidation {
	// If no config provided, use defaults
	if (!config) {
		return {
			isValid: true,
			config: DEFAULT_CONFIGURATION
		};
	}

	// Validate required fields
	if (
		config.esp_starting_credits === undefined ||
		config.esp_starting_reputation === undefined ||
		config.shared_pool_credits === undefined ||
		config.planning_phase_duration === undefined
	) {
		return {
			isValid: false,
			error: 'Missing game configuration: missing required fields'
		};
	}

	// Validate destination budgets
	if (!config.destination_budgets || typeof config.destination_budgets !== 'object') {
		return {
			isValid: false,
			error: 'Missing game configuration: destination_budgets is required'
		};
	}

	// Validate numeric values
	if (
		config.esp_starting_credits < 0 ||
		config.esp_starting_reputation < 0 ||
		config.shared_pool_credits < 0 ||
		config.planning_phase_duration < 0
	) {
		return {
			isValid: false,
			error: 'Invalid configuration: values must be non-negative'
		};
	}

	return {
		isValid: true,
		config
	};
}

// ============================================================================
// RESOURCE ALLOCATION
// ============================================================================

/**
 * Allocate resources to all players
 * This is the main orchestration function
 * @param request Allocation request with roomCode and optional config
 * @returns Result indicating success or error
 */
export function allocateResources(request: ResourceAllocationRequest): ResourceAllocationResult {
	const { roomCode, config } = request;

	// Validate room code
	const roomValidation = validateRoomCode(roomCode);
	if (!roomValidation.isValidFormat || !roomValidation.exists) {
		gameLogger.event('resource_allocation_failed', {
			roomCode,
			reason: roomValidation.error
		});

		return {
			success: false,
			error: roomValidation.error
		};
	}

	const session = roomValidation.session!;

	// Validate configuration
	const configValidation = validateConfiguration(config);
	if (!configValidation.isValid) {
		gameLogger.event('resource_allocation_failed', {
			roomCode,
			reason: configValidation.error,
			type: 'missing_configuration'
		});

		return {
			success: false,
			error: 'Cannot start game: Missing game configuration'
		};
	}

	const gameConfig = configValidation.config!;

	// Log allocation start
	gameLogger.event('resource_allocation_started', {
		roomCode,
		espTeamCount: session.esp_teams.filter((t) => t.players.length > 0).length,
		destinationCount: session.destinations.filter((d) => d.players.length > 0).length
	});

	try {
		// Get list of active destinations (for ESP reputation initialization)
		const activeDestinations = session.destinations.filter((d) => d.players.length > 0);
		const destinationNames = activeDestinations.map((d) => d.name);

		// Allocate resources to ESP teams
		for (const team of session.esp_teams) {
			if (team.players.length > 0) {
				// Allocate credits
				team.credits = gameConfig.esp_starting_credits;

				// Initialize reputation for each active destination
				team.reputation = {};
				for (const destName of destinationNames) {
					team.reputation[destName] = gameConfig.esp_starting_reputation;
				}

				// Ensure state arrays are initialized
				team.active_clients = team.active_clients || [];
				team.owned_tech_upgrades = team.owned_tech_upgrades || []; // US-2.3
				team.round_history = team.round_history || [];

				// US-2.2: Generate 13 clients for marketplace
				team.available_clients = generateClientStockForTeam(team.name, destinationNames);

				gameLogger.event('esp_resources_allocated', {
					roomCode,
					teamName: team.name,
					credits: team.credits,
					reputation: team.reputation,
					clientsGenerated: team.available_clients.length
				});
			}
		}

		// Allocate resources to destinations
		const activeESPTeams = session.esp_teams.filter((t) => t.players.length > 0);

		for (const destination of session.destinations) {
			if (destination.players.length > 0) {
				// Allocate budget based on configuration
				destination.budget = gameConfig.destination_budgets[destination.name] || 0;

				// Initialize state
				destination.filtering_policies = destination.filtering_policies || {};
				destination.esp_reputation = destination.esp_reputation || {};
				destination.user_satisfaction =
					destination.user_satisfaction !== undefined ? destination.user_satisfaction : 100;

				// US-2.6.1: Initialize filtering policies for all ESPs (set to permissive)
				initializeFilteringPolicies(destination, activeESPTeams);

				gameLogger.event('destination_resources_allocated', {
					roomCode,
					destinationName: destination.name,
					budget: destination.budget
				});
			}
		}

		// Create shared pool if 2+ destinations
		const activeDestinationCount = session.destinations.filter((d) => d.players.length > 0).length;
		if (activeDestinationCount >= 2) {
			session.shared_pool = gameConfig.shared_pool_credits;

			gameLogger.event('shared_pool_created', {
				roomCode,
				credits: session.shared_pool,
				destinationCount: activeDestinationCount
			});
		}

		// Update activity
		updateActivity(roomCode);

		// Log success
		gameLogger.event('resource_allocation_completed', {
			roomCode,
			espTeamsAllocated: session.esp_teams.filter((t) => t.players.length > 0).length,
			destinationsAllocated: session.destinations.filter((d) => d.players.length > 0).length,
			sharedPool: session.shared_pool || 0
		});

		return {
			success: true
		};
	} catch (error) {
		// Rollback on failure
		gameLogger.error(error as Error, {
			context: 'allocateResources',
			roomCode,
			action: 'Rolling back allocation'
		});

		rollbackAllocation({ roomCode });

		return {
			success: false,
			error: 'Resource allocation failed. Please try again.'
		};
	}
}

// ============================================================================
// ROLLBACK
// ============================================================================

/**
 * Rollback resource allocation
 * Resets all resources to 0/empty
 * @param request Rollback request with roomCode
 * @returns Result indicating success or error
 */
export function rollbackAllocation(request: RollbackRequest): RollbackResult {
	const { roomCode } = request;

	// Validate room code
	const roomValidation = validateRoomCode(roomCode);
	if (!roomValidation.isValidFormat || !roomValidation.exists) {
		return {
			success: false,
			error: roomValidation.error
		};
	}

	const session = roomValidation.session!;

	try {
		// Reset ESP team resources
		for (const team of session.esp_teams) {
			team.credits = 0;
			team.reputation = {};
			team.active_clients = [];
			team.owned_tech_upgrades = []; // US-2.3
			team.round_history = [];
		}

		// Reset destination resources
		for (const destination of session.destinations) {
			destination.budget = 0;
			destination.filtering_policies = {};
			destination.esp_reputation = {};
			destination.user_satisfaction = 100;
		}

		// Remove shared pool
		session.shared_pool = undefined;

		gameLogger.event('resource_allocation_rolled_back', {
			roomCode,
			reason: 'Allocation failure or interruption'
		});

		return {
			success: true
		};
	} catch (error) {
		gameLogger.error(error as Error, {
			context: 'rollbackAllocation',
			roomCode
		});

		return {
			success: false,
			error: 'Rollback failed'
		};
	}
}
