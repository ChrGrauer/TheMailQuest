/**
 * Client Portfolio Manager
 * US-2.4: Client Basic Management
 *
 * Business logic for managing ESP client portfolios:
 * - Toggle client status (Active/Paused)
 * - Configure onboarding options (warm-up, list hygiene)
 * - Calculate revenue previews
 * - Calculate budget forecasts
 *
 * Follows immutable state management pattern from client-acquisition-manager.ts
 */

import type { ESPTeam, Client, ClientState } from './types';
import {
	WARMUP_COST,
	LIST_HYGIENE_COST,
	calculateOnboardingCost,
	WARMUP_VOLUME_REDUCTION,
	LIST_HYGIENE_SPAM_TRAP_REDUCTION,
	getListHygieneVolumeReduction
} from '$lib/config/client-onboarding';

/**
 * Phase 2: Helper to check if a volume modifier applies to the current round
 * Handles special case: -1 means "first active round only"
 */
function isModifierApplicable(
	applicableRounds: number[],
	currentRound: number,
	firstActiveRound: number | null
): boolean {
	// Handle special case: -1 = first active round only
	if (applicableRounds.includes(-1)) {
		return firstActiveRound !== null && firstActiveRound === currentRound;
	}
	// Standard case: check if current round is in the list
	return applicableRounds.includes(currentRound);
}

/**
 * Result type for toggle status operation
 */
export interface ToggleStatusResult {
	success: boolean;
	team?: ESPTeam;
	error?: string;
}

/**
 * Result type for configure onboarding operation
 */
export interface ConfigureOnboardingResult {
	success: boolean;
	team?: ESPTeam;
	cost?: number;
	error?: string;
}

/**
 * Onboarding configuration options
 */
export interface OnboardingOptions {
	warmup: boolean;
	listHygiene: boolean;
}

/**
 * Toggle client status between Active and Paused
 *
 * @param team - ESP team with client_states
 * @param clientId - Client ID to toggle
 * @param newStatus - New status ('Active' or 'Paused')
 * @returns Result with updated team or error
 */
export function toggleClientStatus(
	team: ESPTeam,
	clientId: string,
	newStatus: 'Active' | 'Paused' | 'Suspended'
): ToggleStatusResult {
	// Validate client exists
	if (!team.client_states || !team.client_states[clientId]) {
		return {
			success: false,
			error: `Client ${clientId} not found in team portfolio`
		};
	}

	const currentState = team.client_states[clientId];

	// Cannot toggle suspended clients
	if (currentState.status === 'Suspended') {
		return {
			success: false,
			error: 'Cannot toggle suspended client. Client is locked due to reputation damage.'
		};
	}

	// Cannot toggle TO suspended status (only game engine can suspend)
	if (newStatus === 'Suspended') {
		return {
			success: false,
			error: 'Cannot manually set client to Suspended status'
		};
	}

	// Create immutable update
	const updatedClientStates = {
		...team.client_states,
		[clientId]: {
			...currentState,
			status: newStatus
		}
	};

	const updatedTeam: ESPTeam = {
		...team,
		client_states: updatedClientStates
	};

	return {
		success: true,
		team: updatedTeam
	};
}

/**
 * Configure onboarding options for a new client
 *
 * Only available for clients with first_active_round = null
 * Deducts onboarding costs from team credits
 * Phase 2: Creates VolumeModifier and SpamTrapModifier objects
 *
 * @param team - ESP team
 * @param clientId - Client ID to configure
 * @param options - Onboarding options (warmup, listHygiene)
 * @param client - Client object (needed for risk level for list hygiene)
 * @returns Result with updated team or error
 */
export function configureOnboarding(
	team: ESPTeam,
	clientId: string,
	options: OnboardingOptions,
	client?: Client
): ConfigureOnboardingResult {
	// Validate client exists
	if (!team.client_states || !team.client_states[clientId]) {
		return {
			success: false,
			error: `Client ${clientId} not found in team portfolio`
		};
	}

	const currentState = team.client_states[clientId];

	// Only new clients can configure onboarding
	if (currentState.first_active_round !== null) {
		return {
			success: false,
			error:
				'Onboarding options only available for clients that have not been activated yet. This client has already been activated.'
		};
	}

	// Calculate cost
	const cost = calculateOnboardingCost(options.warmup, options.listHygiene);

	// Validate budget
	if (team.credits < cost) {
		return {
			success: false,
			error: `Insufficient credits. Required: ${cost}, Available: ${team.credits}`
		};
	}

	// Phase 2: Build modifiers based on options
	const volumeModifiers = [...currentState.volumeModifiers];
	const spamTrapModifiers = [...currentState.spamTrapModifiers];

	// Warmup: 50% volume reduction in first active round only
	// Use -1 as sentinel value for "first active round only"
	if (options.warmup) {
		volumeModifiers.push({
			id: `warmup-${clientId}`,
			source: 'warmup',
			multiplier: 1.0 - WARMUP_VOLUME_REDUCTION, // 0.5
			applicableRounds: [-1], // -1 = first active round only
			description: 'Warm-up active, initial volume reduced'
		});
	}

	// List Hygiene: Permanent volume reduction + spam trap reduction
	if (options.listHygiene) {
		// Volume reduction based on risk level
		const riskLevel = client?.risk || 'Medium'; // Default to Medium if client not provided
		const volumeReduction = getListHygieneVolumeReduction(riskLevel);
		volumeModifiers.push({
			id: `list_hygiene-${clientId}`,
			source: 'list_hygiene',
			multiplier: 1.0 - volumeReduction, // 0.95, 0.90, or 0.85
			applicableRounds: [1, 2, 3, 4], // All rounds (permanent)
			description: 'List Hygiene active (permanent)'
		});

		// Spam trap reduction: 40% reduction = 0.6 multiplier
		spamTrapModifiers.push({
			id: `list_hygiene-spam-${clientId}`,
			source: 'list_hygiene',
			multiplier: 1.0 - LIST_HYGIENE_SPAM_TRAP_REDUCTION, // 0.6
			applicableRounds: [1, 2, 3, 4], // All rounds (permanent)
			description: 'List Hygiene spam trap reduction'
		});
	}

	// Create immutable update
	const updatedClientStates = {
		...team.client_states,
		[clientId]: {
			...currentState,
			volumeModifiers,
			spamTrapModifiers
		}
	};

	const updatedTeam: ESPTeam = {
		...team,
		client_states: updatedClientStates,
		credits: team.credits - cost
	};

	return {
		success: true,
		team: updatedTeam,
		cost
	};
}

/**
 * Get client merged with its state
 *
 * @param team - ESP team
 * @param clientId - Client ID
 * @returns Client with state merged, or undefined if not found
 */
export function getClientWithState(
	team: ESPTeam,
	client: Client
): (Client & ClientState) | undefined {
	if (!team.client_states || !team.client_states[client.id]) {
		return undefined;
	}

	const state = team.client_states[client.id];

	return {
		...client,
		...state
	};
}

/**
 * Calculate revenue preview from active clients
 *
 * Only includes clients with status = 'Active'
 * Excludes paused and suspended clients
 * Phase 2: Applies all volume modifiers to match actual resolution calculations
 *
 * @param team - ESP team with client_states
 * @param clients - Array of all Client objects (from marketplace or team's available_clients)
 * @param currentRound - Current game round number
 * @returns Total revenue from active clients (adjusted for all volume modifiers)
 */
export function calculateRevenuePreview(
	team: ESPTeam,
	clients: Client[],
	currentRound: number
): number {
	if (!team.client_states || Object.keys(team.client_states).length === 0) {
		return 0;
	}

	let totalRevenue = 0;

	// Create a map of clientId -> client for quick lookup
	const clientMap = new Map<string, Client>();
	for (const client of clients) {
		clientMap.set(client.id, client);
	}

	// Calculate revenue for active clients with all volume modifiers
	for (const clientId of team.active_clients) {
		const clientState = team.client_states[clientId];
		if (clientState && clientState.status === 'Active') {
			const client = clientMap.get(clientId);
			if (client) {
				let baseRevenue = client.revenue;

				// Phase 2: Apply all volume modifiers
				// Since revenue is proportional to volume, use same multiplier logic
				let cumulativeMultiplier = 1.0;

				for (const modifier of clientState.volumeModifiers) {
					if (
						isModifierApplicable(
							modifier.applicableRounds,
							currentRound,
							clientState.first_active_round
						)
					) {
						cumulativeMultiplier *= modifier.multiplier;
					}
				}

				// Combined revenue with all modifiers
				const adjustedRevenue = Math.round(baseRevenue * cumulativeMultiplier);
				totalRevenue += adjustedRevenue;
			}
		}
	}

	return totalRevenue;
}

/**
 * Calculate budget forecast (current credits only, NO revenue)
 *
 * Shows what the budget will be after onboarding costs are deducted
 * Does NOT include revenue because actual revenue depends on delivery success in resolution phase
 * Revenue preview is shown separately as "maximum potential revenue"
 *
 * @param team - ESP team
 * @returns Budget forecast (current credits, can be negative if overspent on onboarding)
 */
export function calculateBudgetForecast(team: ESPTeam): number {
	return team.credits;
}
