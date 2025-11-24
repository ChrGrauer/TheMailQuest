/**
 * POST /api/sessions/[roomCode]/incident/trigger
 *
 * Triggers an incident card (facilitator only)
 * - Validates facilitator access
 * - Triggers incident and adds to history
 * - Applies incident effects to game state
 * - Broadcasts WebSocket messages to all players
 * Phase 2: Supports team selection for targeted incidents
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSession } from '$lib/server/game/session-manager';
import { triggerIncident } from '$lib/server/game/incident-manager';
import { applyIncidentEffects } from '$lib/server/game/incident-effects-manager';
import { getIncidentById } from '$lib/config/incident-cards';
import { gameWss } from '$lib/server/websocket';

// Lazy logger import
let gameLogger: any = null;
async function getLogger() {
	if (!gameLogger) {
		const module = await import('$lib/server/logger');
		gameLogger = module.gameLogger;
	}
	return gameLogger;
}

export const POST: RequestHandler = async ({ params, cookies, request }) => {
	const { roomCode } = params;
	const logger = await getLogger();

	try {
		// 1. Validate facilitator access
		const facilitatorId = cookies.get('facilitatorId');
		if (!facilitatorId) {
			logger.warn({
				action: 'incident_trigger_unauthorized',
				roomCode,
				reason: 'no_facilitator_cookie'
			});
			return json(
				{ success: false, error: 'Unauthorized: Only the facilitator can trigger incidents' },
				{ status: 403 }
			);
		}

		// 2. Get session
		const session = getSession(roomCode);
		if (!session) {
			logger.warn({
				action: 'incident_trigger_session_not_found',
				roomCode
			});
			return json({ success: false, error: 'Session not found' }, { status: 404 });
		}

		// 3. Verify facilitator matches session
		if (session.facilitatorId !== facilitatorId) {
			logger.warn({
				action: 'incident_trigger_unauthorized',
				roomCode,
				reason: 'facilitator_mismatch'
			});
			return json({ success: false, error: 'Unauthorized' }, { status: 403 });
		}

		// 4. Parse request body
		const body = await request.json();
		const { incidentId, selectedTeam } = body;

		if (!incidentId || typeof incidentId !== 'string') {
			return json(
				{ success: false, error: 'Invalid request: incidentId is required' },
				{ status: 400 }
			);
		}

		// 5. Get incident card details
		const incident = getIncidentById(incidentId);
		if (!incident) {
			return json({ success: false, error: `Incident ${incidentId} not found` }, { status: 404 });
		}

		// 6. Trigger incident (adds to history)
		const triggerResult = triggerIncident(session, incidentId, selectedTeam);
		if (!triggerResult.success) {
			logger.warn({
				action: 'incident_trigger_failed',
				roomCode,
				incidentId,
				selectedTeam: selectedTeam || null,
				error: triggerResult.error
			});
			return json({ success: false, error: triggerResult.error }, { status: 400 });
		}

		// 7. Apply incident effects
		const effectResult = applyIncidentEffects(
			session,
			incident,
			selectedTeam,
			triggerResult.affectedClient
		);
		if (!effectResult.success) {
			logger.error({
				action: 'incident_effects_application_failed',
				roomCode,
				incidentId,
				selectedTeam: selectedTeam || null,
				error: effectResult.error
			});
			return json({ success: false, error: 'Failed to apply incident effects' }, { status: 500 });
		}

		// 8. Broadcast incident card to all players
		gameWss.broadcastToRoom(roomCode, {
			type: 'incident_triggered',
			incident: {
				id: incident.id,
				name: incident.name,
				description: incident.description,
				educationalNote: incident.educationalNote,
				category: incident.category,
				rarity: incident.rarity,
				duration: incident.duration,
				displayDurationMs: 10000, // 10 seconds
				affectedTeam: selectedTeam || null // Phase 2: Show which team is affected
			}
		});

		// 9. Broadcast effects applied
		gameWss.broadcastToRoom(roomCode, {
			type: 'incident_effects_applied',
			incidentId: incident.id,
			changes: effectResult.changes
		});

		// 9.5. Broadcast updated incident history
		gameWss.broadcastToRoom(roomCode, {
			type: 'game_state_update',
			incident_history: session.incident_history
		});

		// 10. Broadcast updated game state
		// ESP dashboard updates (Phase 2: Include client_states for modifiers)
		for (const team of session.esp_teams) {
			gameWss.broadcastToRoom(roomCode, {
				type: 'esp_dashboard_update',
				data: {
					teamName: team.name,
					credits: team.credits,
					reputation: team.reputation,
					client_states: team.client_states, // Phase 2: Include modifiers
					locked_in: team.locked_in // Phase 2: Include lock-in status for auto-lock
				}
			});
		}

		// Destination dashboard updates
		for (const destination of session.destinations) {
			gameWss.broadcastToRoom(roomCode, {
				type: 'destination_dashboard_update',
				data: {
					destinationName: destination.name,
					budget: destination.budget
				}
			});
		}

		// 11. Log successful trigger
		logger.info({
			action: 'incident_triggered_success',
			roomCode,
			incidentId: incident.id,
			incidentName: incident.name,
			round: session.current_round,
			facilitatorId,
			espChanges: Object.keys(effectResult.changes.espChanges).length,
			destinationChanges: Object.keys(effectResult.changes.destinationChanges).length
		});

		// 12. Return success
		return json({
			success: true,
			incidentId: incident.id,
			changes: effectResult.changes
		});
	} catch (error) {
		logger.error({
			action: 'incident_trigger_error',
			roomCode,
			error: error instanceof Error ? error.message : 'Unknown error'
		});

		return json(
			{
				success: false,
				error: 'Internal server error'
			},
			{ status: 500 }
		);
	}
};
