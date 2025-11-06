/**
 * Debug endpoint to inspect session data
 * Temporary endpoint for debugging - remove in production
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { getSession } from '$lib/server/game/session-manager';

export const GET: RequestHandler = async ({ params }) => {
	const roomCode = params.roomCode;

	if (!roomCode) {
		return json({ error: 'No room code provided' }, { status: 400 });
	}

	const session = getSession(roomCode);

	if (!session) {
		return json({ error: 'Session not found' }, { status: 404 });
	}

	// Return basic session info for debugging
	return json({
		roomCode: session.roomCode,
		current_round: session.current_round,
		current_phase: session.current_phase,
		esp_teams: session.esp_teams.map((t) => ({ name: t.name, players: t.players })),
		destinations: session.destinations.map((d) => ({
			name: d.name,
			players: d.players,
			locked_in: d.locked_in
		})),
		timer: session.timer
	});
};
