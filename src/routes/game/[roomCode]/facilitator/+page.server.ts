/**
 * Facilitator Dashboard Server Load
 * US-8.2-0.2: Facilitator Metrics Dashboard
 *
 * Loads initial session data for metrics display
 */

import type { PageServerLoad } from './$types';
import { getSession } from '$lib/server/game/session-manager';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const { roomCode } = params;

	// Try to get facilitator ID - don't error if not present, let client handle auth
	const facilitatorId = cookies.get('facilitatorId');

	// Get session - return empty data if not found
	const session = getSession(roomCode);

	// If no session or not authorized, return empty data
	// The client-side page can still render with room code from URL
	if (!session || !facilitatorId || session.facilitatorId !== facilitatorId) {
		return {
			initialData: null
		};
	}

	// Return session data for metrics
	return {
		initialData: {
			roomCode: session.roomCode,
			currentRound: session.current_round,
			totalRounds: 4,
			currentPhase: session.current_phase,
			espTeams: session.esp_teams.map((esp) => ({
				name: esp.name,
				budget: esp.credits,
				reputation: esp.reputation,
				ownedTechUpgrades: esp.owned_tech_upgrades,
				activeClients: esp.active_clients,
				availableClients: esp.available_clients,
				clientStates: esp.client_states || {},
				lockedIn: esp.locked_in || false
			})),
			destinations: session.destinations.map((dest) => ({
				name: dest.name,
				kingdom: dest.kingdom || dest.name,
				budget: dest.budget,
				ownedTools: dest.owned_tools || [],
				espMetrics: dest.esp_metrics || {},
				lockedIn: dest.locked_in || false
			})),
			// Include resolution history for spam rate data
			resolutionHistory: session.resolution_history || []
		}
	};
};
