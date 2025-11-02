/**
 * PATCH /api/sessions/[roomCode]/esp/[teamName]/clients/[clientId]/status
 * US-2.4: Client Basic Management
 *
 * Toggle client status between Active and Paused
 * Validates and updates client state, broadcasts WebSocket update
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSession, updateActivity } from '$lib/server/game/session-manager';
import { validateStatusToggle } from '$lib/server/game/validation/client-portfolio-validator';
import { toggleClientStatus } from '$lib/server/game/client-portfolio-manager';
import { gameWss } from '$lib/server/websocket';
import { gameLogger } from '$lib/server/logger';

export const PATCH: RequestHandler = async ({ params, request }) => {
	const { roomCode, teamName, clientId } = params;

	if (!roomCode || !teamName || !clientId) {
		return json({ error: 'Invalid parameters', success: false }, { status: 400 });
	}

	// Parse request body
	let newStatus: string;
	try {
		const body = await request.json();
		newStatus = body.status;

		if (!newStatus || !['Active', 'Paused'].includes(newStatus)) {
			return json({ error: 'Invalid status. Must be "Active" or "Paused"', success: false }, { status: 400 });
		}
	} catch (err) {
		return json({ error: 'Invalid request body', success: false }, { status: 400 });
	}

	gameLogger.event('client_status_toggle_attempt', { roomCode, teamName, clientId, newStatus });

	const session = getSession(roomCode);

	if (!session) {
		gameLogger.event('client_status_toggle_failed', { roomCode, teamName, clientId, reason: 'session_not_found' });
		return json({ error: 'Session not found', success: false }, { status: 404 });
	}

	// Find ESP team (case-insensitive)
	const teamIndex = session.esp_teams.findIndex((t) => t.name.toLowerCase() === teamName.toLowerCase());
	if (teamIndex === -1) {
		gameLogger.event('client_status_toggle_failed', { roomCode, teamName, clientId, reason: 'team_not_found' });
		return json({ error: 'ESP team not found', success: false }, { status: 404 });
	}

	const team = session.esp_teams[teamIndex];

	// Validate status toggle
	const validation = validateStatusToggle(team, clientId, newStatus);
	if (!validation.canToggle) {
		gameLogger.event('client_status_toggle_failed', { roomCode, teamName, clientId, reason: validation.reason });
		return json({ error: validation.reason || 'Cannot toggle client status', success: false }, { status: 400 });
	}

	// Toggle status
	const result = toggleClientStatus(team, clientId, newStatus);
	if (!result.success || !result.team) {
		gameLogger.event('client_status_toggle_failed', { roomCode, teamName, clientId, error: result.error });
		return json({ error: result.error || 'Failed to toggle client status', success: false }, { status: 500 });
	}

	// Update session
	session.esp_teams[teamIndex] = result.team;
	updateActivity(roomCode);

	gameLogger.event('client_status_toggled', {
		roomCode,
		teamName,
		clientId,
		newStatus,
		oldStatus: team.client_states?.[clientId]?.status
	});

	// Broadcast WebSocket update
	gameWss.broadcastToRoom(roomCode, {
		type: 'esp_dashboard_update',
		data: {
			teamName: teamName, // Include team name to filter updates on client side
			client_states: result.team.client_states
		}
	});

	return json({
		success: true,
		client_id: clientId,
		status: newStatus
	});
};
