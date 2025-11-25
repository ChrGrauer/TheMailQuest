/**
 * POST /api/sessions/[roomCode]/incident/choice
 *
 * Submits and confirms a player's incident choice selection
 * Phase 5: Player-facing incident choices
 *
 * - Validates player has a pending choice
 * - Confirms the choice and applies effects IMMEDIATELY
 * - Broadcasts updates to all players
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSession } from '$lib/server/game/session-manager';
import { confirmAndApplyChoice } from '$lib/server/game/incident-choice-manager';
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

export const POST: RequestHandler = async ({ params, request }) => {
	const { roomCode } = params;
	const logger = await getLogger();

	try {
		// 1. Parse request body and validate required fields
		const body = await request.json();
		const { choiceId, teamName } = body;

		if (!teamName || typeof teamName !== 'string') {
			logger.warn({
				action: 'incident_choice_invalid_request',
				roomCode,
				reason: 'missing_team_name'
			});
			return json(
				{ success: false, error: 'Invalid request: teamName is required' },
				{ status: 400 }
			);
		}

		// 2. Get session
		const session = getSession(roomCode);
		if (!session) {
			logger.warn({
				action: 'incident_choice_session_not_found',
				roomCode
			});
			return json({ success: false, error: 'Session not found' }, { status: 404 });
		}

		// 3. Validate choiceId
		if (!choiceId || typeof choiceId !== 'string') {
			return json(
				{ success: false, error: 'Invalid request: choiceId is required' },
				{ status: 400 }
			);
		}

		// 4. Find the team (case-insensitive comparison)
		const team = session.esp_teams.find(
			(t) => t.name.toLowerCase() === teamName.toLowerCase()
		);
		if (!team) {
			logger.warn({
				action: 'incident_choice_team_not_found',
				roomCode,
				teamName
			});
			return json({ success: false, error: 'Team not found' }, { status: 404 });
		}

		// 5. Check for pending choice
		if (!team.pending_incident_choice) {
			logger.warn({
				action: 'incident_choice_no_pending',
				roomCode,
				teamName
			});
			return json(
				{ success: false, error: 'No pending incident choice for this team' },
				{ status: 400 }
			);
		}

		const incidentId = team.pending_incident_choice.incidentId;

		// 6. Confirm and apply choice effects immediately
		const result = confirmAndApplyChoice(session, teamName, incidentId, choiceId);

		if (!result.success) {
			logger.warn({
				action: 'incident_choice_invalid',
				roomCode,
				teamName,
				choiceId,
				error: result.error
			});
			return json({ success: false, error: result.error }, { status: 400 });
		}

		// 7. Broadcast choice confirmation and effects to all players
		gameWss.broadcastToRoom(roomCode, {
			type: 'incident_choice_confirmed',
			incidentId,
			teamName,
			choiceId,
			appliedEffects: result.appliedEffects
		});

		// Also broadcast updated team state (credits, reputation may have changed)
		gameWss.broadcastToRoom(roomCode, {
			type: 'esp_dashboard_update',
			data: {
				teamName: team.name, // Use proper casing from session
				credits: team.credits,
				reputation: team.reputation,
				locked_in: team.locked_in
			}
		});

		logger.info({
			action: 'incident_choice_confirmed',
			roomCode,
			teamName,
			incidentId,
			choiceId,
			appliedEffects: result.appliedEffects
		});

		// 8. Return success with applied effects
		return json({
			success: true,
			choiceId,
			confirmed: true,
			appliedEffects: result.appliedEffects
		});
	} catch (error) {
		const logger = await getLogger();
		logger.error({
			action: 'incident_choice_error',
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
