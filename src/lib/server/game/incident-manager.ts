/**
 * Incident Manager
 * Phase 1: MVP Foundation
 *
 * Handles core incident management logic:
 * - Retrieving available incidents for current round
 * - Triggering incidents
 * - Validating incident eligibility
 * - Managing incident history
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
 * Trigger an incident card
 * This adds the incident to history but does NOT apply effects.
 * Effects are applied separately by incident-effects-manager.
 *
 * @param session - Game session
 * @param incidentId - ID of incident to trigger
 * @returns Result indicating success or failure
 */
export function triggerIncident(session: GameSession, incidentId: string): IncidentTriggerResult {
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
			automatic: incident.automatic || false
		});
	});

	// Return success
	return {
		success: true,
		incidentId: incident.id,
		affectedTeams: session.esp_teams.map((team) => team.name)
	};
}
