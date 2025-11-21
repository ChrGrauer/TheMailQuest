/**
 * US-2.2: Client Marketplace - Client Acquisition Manager
 *
 * Handles the business logic of acquiring clients:
 * - Deduct credits
 * - Move client from available_clients to active_clients
 * - Return immutable updated team state
 *
 * NOTE: This manager does NOT perform validation.
 * Validation must be done before calling acquireClient().
 */

import type { ESPTeam, Client } from './types';

/**
 * Client Acquisition Result
 */
export interface ClientAcquisitionResult {
	success: boolean;
	team?: ESPTeam;
	acquiredClient?: Client;
	error?: string;
}

/**
 * Acquire a client for an ESP team
 *
 * This function performs the state transition for client acquisition:
 * 1. Find client in available_clients
 * 2. Deduct cost from credits
 * 3. Remove client from available_clients
 * 4. Add client ID to active_clients
 *
 * IMPORTANT: This function does NOT validate the acquisition.
 * Call validateClientAcquisition() BEFORE calling this function.
 *
 * @param team - ESP team acquiring the client
 * @param clientId - ID of client to acquire
 * @returns Result with success flag and updated team (or error)
 */
export function acquireClient(team: ESPTeam, clientId: string): ClientAcquisitionResult {
	// Find client in available_clients
	const clientIndex = team.available_clients.findIndex((c) => c.id === clientId);

	if (clientIndex === -1) {
		// Check if already owned
		if (team.active_clients.includes(clientId)) {
			return {
				success: false,
				error: 'Client already acquired by this team'
			};
		}

		return {
			success: false,
			error: 'Client not found in available clients'
		};
	}

	const client = team.available_clients[clientIndex];

	// Create new team state (immutable update)
	// NOTE: We keep all clients in available_clients (don't remove when acquired)
	// This allows the portfolio endpoint to get full client data for active clients
	const newActiveClients = [...team.active_clients, client.id];
	const newCredits = team.credits - client.cost;

	// Initialize client state (US-2.4: Client Basic Management)
	// Phase 2: Initialize with empty modifier arrays
	const newClientStates = {
		...team.client_states,
		[client.id]: {
			status: 'Active' as const,
			first_active_round: null, // New client - not yet activated in a round
			volumeModifiers: [], // Empty array, populated during onboarding or incidents
			spamTrapModifiers: [] // Empty array, populated during onboarding or incidents
		}
	};

	const updatedTeam: ESPTeam = {
		...team,
		credits: newCredits,
		// Keep available_clients unchanged - they serve as the source of client definitions
		active_clients: newActiveClients,
		client_states: newClientStates
	};

	return {
		success: true,
		team: updatedTeam,
		acquiredClient: client
	};
}
