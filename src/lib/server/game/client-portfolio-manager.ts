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
	calculateOnboardingCost
} from '$lib/config/client-onboarding';

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
 *
 * @param team - ESP team
 * @param clientId - Client ID to configure
 * @param options - Onboarding options (warmup, listHygiene)
 * @returns Result with updated team or error
 */
export function configureOnboarding(
	team: ESPTeam,
	clientId: string,
	options: OnboardingOptions
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

	// Create immutable update
	const updatedClientStates = {
		...team.client_states,
		[clientId]: {
			...currentState,
			has_warmup: options.warmup,
			has_list_hygiene: options.listHygiene
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
 *
 * @param team - ESP team with client_states
 * @param clients - Array of all Client objects (from marketplace or team's available_clients)
 * @returns Total revenue from active clients
 */
export function calculateRevenuePreview(team: ESPTeam, clients: Client[]): number {
	if (!team.client_states || Object.keys(team.client_states).length === 0) {
		return 0;
	}

	let totalRevenue = 0;

	// Create a map of clientId -> revenue for quick lookup
	const clientRevenueMap = new Map<string, number>();
	for (const client of clients) {
		clientRevenueMap.set(client.id, client.revenue);
	}

	// Sum revenue for active clients only
	for (const clientId of team.active_clients) {
		const clientState = team.client_states[clientId];
		if (clientState && clientState.status === 'Active') {
			const revenue = clientRevenueMap.get(clientId);
			if (revenue !== undefined) {
				totalRevenue += revenue;
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
