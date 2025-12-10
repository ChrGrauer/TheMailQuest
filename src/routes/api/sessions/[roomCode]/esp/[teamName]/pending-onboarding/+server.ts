/**
 * PATCH /api/sessions/[roomCode]/esp/[teamName]/pending-onboarding
 * Save onboarding selections without committing (deducting credits)
 *
 * This endpoint stores selections in pending_onboarding_decisions.
 * Credits are only deducted when the team locks in their decisions.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSession, updateActivity } from '$lib/server/game/session-manager';
import { gameWss } from '$lib/server/websocket';
import { gameLogger } from '$lib/server/logger';

export const PATCH: RequestHandler = async ({ params, request }) => {
	const { roomCode, teamName } = params;

	if (!roomCode || !teamName) {
		return json({ error: 'Invalid parameters', success: false }, { status: 400 });
	}

	// Parse request body
	let clientId: string;
	let warmup: boolean;
	let listHygiene: boolean;
	try {
		const body = await request.json();
		clientId = body.clientId;
		warmup = body.warmup === true;
		listHygiene = body.list_hygiene === true;

		if (!clientId) {
			throw new Error('clientId is required');
		}
	} catch (err) {
		return json({ error: 'Invalid request body', success: false }, { status: 400 });
	}

	gameLogger.event('pending_onboarding_update', {
		roomCode,
		teamName,
		clientId,
		warmup,
		listHygiene
	});

	const session = getSession(roomCode);

	if (!session) {
		return json({ error: 'Session not found', success: false }, { status: 404 });
	}

	// Find ESP team (case-insensitive)
	const teamIndex = session.esp_teams.findIndex(
		(t) => t.name.toLowerCase() === teamName.toLowerCase()
	);
	if (teamIndex === -1) {
		return json({ error: 'ESP team not found', success: false }, { status: 404 });
	}

	const team = session.esp_teams[teamIndex];

	// Check if client exists in team's portfolio
	const clientExists = team.active_clients.includes(clientId);
	if (!clientExists) {
		return json({ error: 'Client not found in portfolio', success: false }, { status: 404 });
	}

	// Initialize pending_onboarding_decisions if not exists
	if (!team.pending_onboarding_decisions) {
		team.pending_onboarding_decisions = {};
	}

	// Store pending selection (don't deduct credits yet)
	team.pending_onboarding_decisions[clientId] = {
		warmUp: warmup,
		listHygiene: listHygiene
	};

	// Update session activity
	updateActivity(roomCode);

	gameLogger.info('Pending onboarding selection saved', {
		roomCode,
		teamName,
		clientId,
		warmup,
		listHygiene
	});

	// Broadcast WebSocket update (include all fields for facilitator)
	gameWss.broadcastToRoom(roomCode, {
		type: 'esp_dashboard_update',
		teamName: teamName,
		credits: team.credits,
		reputation: team.reputation,
		owned_tech_upgrades: team.owned_tech_upgrades,
		clients: team.active_clients,
		client_states: team.client_states,
		pending_onboarding_decisions: team.pending_onboarding_decisions
	});

	return json({
		success: true,
		client_id: clientId,
		pending_onboarding_decisions: team.pending_onboarding_decisions
	});
};
