/**
 * PATCH /api/sessions/[roomCode]/esp/[teamName]/clients/[clientId]/onboarding
 * US-2.4: Client Basic Management
 *
 * Configure onboarding options for a new client
 * Validates, deducts costs, updates client state, broadcasts WebSocket update
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSession, updateActivity } from '$lib/server/game/session-manager';
import { validateOnboardingConfig } from '$lib/server/game/validation/client-portfolio-validator';
import {
	configureOnboarding,
	type OnboardingOptions
} from '$lib/server/game/client-portfolio-manager';
import { gameWss } from '$lib/server/websocket';
import { gameLogger } from '$lib/server/logger';

export const PATCH: RequestHandler = async ({ params, request }) => {
	const { roomCode, teamName, clientId } = params;

	if (!roomCode || !teamName || !clientId) {
		return json({ error: 'Invalid parameters', success: false }, { status: 400 });
	}

	// Parse request body
	let warmup: boolean;
	let listHygiene: boolean;
	try {
		const body = await request.json();
		warmup = body.warmup === true;
		listHygiene = body.list_hygiene === true;
	} catch (err) {
		return json({ error: 'Invalid request body', success: false }, { status: 400 });
	}

	gameLogger.event('client_onboarding_config_attempt', {
		roomCode,
		teamName,
		clientId,
		warmup,
		listHygiene
	});

	const session = getSession(roomCode);

	if (!session) {
		gameLogger.event('client_onboarding_config_failed', {
			roomCode,
			teamName,
			clientId,
			reason: 'session_not_found'
		});
		return json({ error: 'Session not found', success: false }, { status: 404 });
	}

	// Find ESP team (case-insensitive)
	const teamIndex = session.esp_teams.findIndex(
		(t) => t.name.toLowerCase() === teamName.toLowerCase()
	);
	if (teamIndex === -1) {
		gameLogger.event('client_onboarding_config_failed', {
			roomCode,
			teamName,
			clientId,
			reason: 'team_not_found'
		});
		return json({ error: 'ESP team not found', success: false }, { status: 404 });
	}

	const team = session.esp_teams[teamIndex];
	const options: OnboardingOptions = { warmup, listHygiene };

	// Validate onboarding configuration
	const validation = validateOnboardingConfig(team, clientId, options);
	if (!validation.canConfigure) {
		gameLogger.event('client_onboarding_config_failed', {
			roomCode,
			teamName,
			clientId,
			reason: validation.reason
		});
		return json(
			{ error: validation.reason || 'Cannot configure onboarding', success: false },
			{ status: 400 }
		);
	}

	// Configure onboarding
	const result = configureOnboarding(team, clientId, options);
	if (!result.success || !result.team) {
		gameLogger.event('client_onboarding_config_failed', {
			roomCode,
			teamName,
			clientId,
			error: result.error
		});
		return json(
			{ error: result.error || 'Failed to configure onboarding', success: false },
			{ status: 500 }
		);
	}

	// Update session
	session.esp_teams[teamIndex] = result.team;
	updateActivity(roomCode);

	gameLogger.event('client_onboarding_configured', {
		roomCode,
		teamName,
		clientId,
		warmup,
		listHygiene,
		cost: result.cost,
		remainingCredits: result.team.credits
	});

	// Broadcast WebSocket update
	gameWss.broadcastToRoom(roomCode, {
		type: 'esp_dashboard_update',
		data: {
			teamName: teamName, // Include team name to filter updates on client side
			credits: result.team.credits,
			client_states: result.team.client_states
		}
	});

	return json({
		success: true,
		client_id: clientId,
		cost: result.cost,
		remaining_credits: result.team.credits
	});
};
