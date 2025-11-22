/**
 * Incident Manager
 * Phase 1: MVP Foundation
 * Phase 2: Team/client selection and conditional effects
 *
 * Handles core incident management logic:
 * - Retrieving available incidents for current round
 * - Triggering incidents
 * - Validating incident eligibility
 * - Managing incident history
 * - Team selection validation (Phase 2)
 * - Random client selection (Phase 2)
 */

import type { GameSession } from './types';
import type { IncidentCard, IncidentTriggerResult } from '$lib/types/incident';
import { INCIDENT_CARDS, getIncidentById, getIncidentsByRound } from '$lib/config/incident-cards';

// Lazy logger import to avoid $app/environment issues during Vite config
let gameLogger: any = null;
async function getLogger() {
	if (!gameLogger) {
		const module = await import('../logger');
		gameLogger = module.gameLogger;
	}
	return gameLogger;
}

/**
 * Get all incident cards available for a specific round
 * @param round - Round number (1-4)
 * @returns Array of incident cards that can be triggered in this round
 */
export function getAvailableIncidents(round: number): IncidentCard[] {
	return getIncidentsByRound(round);
}

/**
 * Check if an incident can be triggered in the current game state
 * @param session - Current game session
 * @param incidentId - Incident card ID to check
 * @returns True if incident can be triggered, false otherwise
 */
export function canTriggerIncident(session: GameSession, incidentId: string): boolean {
	// Check if incident exists
	const incident = getIncidentById(incidentId);
	if (!incident) {
		return false;
	}

	// Check if incident is available for current round
	if (!incident.round.includes(session.current_round)) {
		return false;
	}

	// Check if incident was already triggered in this game
	// (Prevent duplicate triggering)
	if (session.incident_history) {
		const alreadyTriggered = session.incident_history.some(
			(entry) => entry.incidentId === incidentId
		);
		if (alreadyTriggered) {
			return false;
		}
	}

	return true;
}

/**
 * Add incident to game history
 * @param session - Game session to update
 * @param incident - Incident card that was triggered
 */
export function addToHistory(session: GameSession, incident: IncidentCard): void {
	// Initialize incident_history if undefined
	if (!session.incident_history) {
		session.incident_history = [];
	}

	// Add to history
	session.incident_history.push({
		incidentId: incident.id,
		name: incident.name,
		category: incident.category,
		roundTriggered: session.current_round,
		timestamp: new Date()
	});
}

/**
 * Phase 2: Check if incident requires team selection
 * @param incident - Incident card to check
 * @returns True if incident requires facilitator to select a team
 */
export function requiresTeamSelection(incident: IncidentCard): boolean {
	return incident.effects.some(
		(effect) => effect.target === 'selected_esp' || effect.target === 'selected_client'
	);
}

/**
 * Phase 2: Validate team selection
 * @param session - Game session
 * @param incident - Incident card being triggered
 * @param selectedTeam - Team name selected by facilitator (optional)
 * @returns Object with { valid: boolean, error?: string }
 */
export function validateTeamSelection(
	session: GameSession,
	incident: IncidentCard,
	selectedTeam?: string
): { valid: boolean; error?: string } {
	// Check if incident requires team selection
	if (requiresTeamSelection(incident)) {
		if (!selectedTeam) {
			return {
				valid: false,
				error: 'This incident requires a team selection'
			};
		}

		// Check if selected team exists
		const team = session.esp_teams.find((t) => t.name === selectedTeam);
		if (!team) {
			return {
				valid: false,
				error: `Team "${selectedTeam}" not found`
			};
		}

		// For selected_client effects, check if team has active clients
		const hasClientEffect = incident.effects.some((effect) => effect.target === 'selected_client');
		if (hasClientEffect) {
			if (!team.active_clients || team.active_clients.length === 0) {
				return {
					valid: false,
					error: `Team "${selectedTeam}" has no active clients`
				};
			}

			// Check if any active clients exist in client_states
			const activeClients = team.active_clients.filter(
				(clientId) => team.client_states?.[clientId]?.status === 'Active'
			);
			if (activeClients.length === 0) {
				return {
					valid: false,
					error: `Team "${selectedTeam}" has no active clients`
				};
			}
		}
	}

	return { valid: true };
}

/**
 * Phase 2: Select a random active client from a team
 * @param session - Game session
 * @param teamName - Name of the ESP team
 * @returns Object with { success: boolean, clientId?: string, error?: string }
 */
export function selectRandomClientForTeam(
	session: GameSession,
	teamName: string
): { success: boolean; clientId?: string; error?: string } {
	// Find team
	const team = session.esp_teams.find((t) => t.name === teamName);
	if (!team) {
		return {
			success: false,
			error: `Team "${teamName}" not found`
		};
	}

	// Get active clients
	if (!team.active_clients || team.active_clients.length === 0) {
		return {
			success: false,
			error: `Team "${teamName}" has no active clients`
		};
	}

	// Filter to only actually active clients (status === 'Active')
	const activeClients = team.active_clients.filter(
		(clientId) => team.client_states?.[clientId]?.status === 'Active'
	);

	if (activeClients.length === 0) {
		return {
			success: false,
			error: `Team "${teamName}" has no active clients`
		};
	}

	// Select random client using uniform probability
	const randomIndex = Math.floor(Math.random() * activeClients.length);
	const selectedClientId = activeClients[randomIndex];

	return {
		success: true,
		clientId: selectedClientId
	};
}

/**
 * Trigger an incident card
 * This adds the incident to history but does NOT apply effects.
 * Effects are applied separately by incident-effects-manager.
 *
 * Phase 2: Added selectedTeam parameter for team selection
 *
 * @param session - Game session
 * @param incidentId - ID of incident to trigger
 * @param selectedTeam - Optional team name for selected_esp/selected_client effects
 * @returns Result indicating success or failure
 */
export function triggerIncident(
	session: GameSession,
	incidentId: string,
	selectedTeam?: string
): IncidentTriggerResult {
	const logger = getLogger();

	// Validate incident can be triggered
	if (!canTriggerIncident(session, incidentId)) {
		// Get specific error reason
		const incident = getIncidentById(incidentId);

		if (!incident) {
			return {
				success: false,
				error: `Incident ${incidentId} not found`
			};
		}

		if (!incident.round.includes(session.current_round)) {
			return {
				success: false,
				error: `Incident ${incidentId} is not available for round ${session.current_round}`
			};
		}

		if (
			session.incident_history &&
			session.incident_history.some((entry) => entry.incidentId === incidentId)
		) {
			return {
				success: false,
				error: `Incident ${incidentId} was already triggered in this game`
			};
		}

		// Generic fallback error
		return {
			success: false,
			error: `Cannot trigger incident ${incidentId}`
		};
	}

	// Get incident card
	const incident = getIncidentById(incidentId);
	if (!incident) {
		return {
			success: false,
			error: `Incident ${incidentId} not found`
		};
	}

	// Phase 2: Validate team selection if required
	const teamValidation = validateTeamSelection(session, incident, selectedTeam);
	if (!teamValidation.valid) {
		return {
			success: false,
			error: teamValidation.error
		};
	}

	// Phase 2: Select random client if needed
	let selectedClientId: string | undefined;
	if (selectedTeam && incident.effects.some((effect) => effect.target === 'selected_client')) {
		const clientSelection = selectRandomClientForTeam(session, selectedTeam);
		if (!clientSelection.success) {
			return {
				success: false,
				error: clientSelection.error
			};
		}
		selectedClientId = clientSelection.clientId;
	}

	// Add to history
	addToHistory(session, incident);

	// Log successful trigger
	logger.then((log: any) => {
		log.info({
			action: 'incident_triggered',
			roomCode: session.roomCode,
			incidentId: incident.id,
			incidentName: incident.name,
			round: session.current_round,
			phase: session.current_phase,
			automatic: incident.automatic || false,
			selectedTeam: selectedTeam || null,
			selectedClient: selectedClientId || null
		});
	});

	// Return success
	return {
		success: true,
		incidentId: incident.id,
		affectedTeams: selectedTeam ? [selectedTeam] : session.esp_teams.map((team) => team.name),
		affectedClient: selectedClientId
	};
}
