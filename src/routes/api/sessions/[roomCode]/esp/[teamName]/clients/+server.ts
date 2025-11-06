import { json, type RequestHandler } from '@sveltejs/kit';
import { getSession } from '$lib/server/game/session-manager';
import { gameLogger } from '$lib/server/logger';
import type { Client } from '$lib/server/game/types';

/**
 * GET /api/sessions/[roomCode]/esp/[teamName]/clients
 * Get available clients in marketplace for an ESP team
 * US-2.2: Client Marketplace
 *
 * Returns clients filtered by current round availability
 */
export const GET: RequestHandler = async ({ params, url }) => {
	const roomCode = params.roomCode;
	const teamName = params.teamName;

	if (!roomCode || !teamName) {
		return json(
			{
				error: 'Invalid parameters',
				success: false
			},
			{ status: 400 }
		);
	}

	gameLogger.event('client_marketplace_fetch', { roomCode, teamName });

	// Get the session
	const session = getSession(roomCode);

	if (!session) {
		gameLogger.event('client_marketplace_fetch_failed', {
			roomCode,
			teamName,
			reason: 'Session not found'
		});
		return json(
			{
				error: 'Session not found',
				success: false
			},
			{ status: 404 }
		);
	}

	// Find the ESP team (case-insensitive)
	const team = session.esp_teams.find((t) => t.name.toLowerCase() === teamName?.toLowerCase());

	if (!team) {
		gameLogger.event('client_marketplace_fetch_failed', {
			roomCode,
			teamName,
			reason: 'ESP team not found'
		});
		return json(
			{
				error: 'ESP team not found',
				success: false
			},
			{ status: 404 }
		);
	}

	// Get current round (default to 1 if not started)
	const currentRound = session.current_round || 1;

	// Filter clients by round availability AND exclude already-acquired clients
	const availableClients = team.available_clients.filter(
		(client: Client) =>
			client.available_from_round <= currentRound && !team.active_clients.includes(client.id) // Exclude already-acquired clients
	);

	gameLogger.event('client_marketplace_fetch_success', {
		roomCode,
		teamName,
		totalClients: team.available_clients.length,
		availableThisRound: availableClients.length,
		currentRound
	});

	return json({
		success: true,
		clients: availableClients,
		currentRound,
		totalAvailable: availableClients.length
	});
};
