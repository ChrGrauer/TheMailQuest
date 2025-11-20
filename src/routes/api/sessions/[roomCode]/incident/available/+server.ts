/**
 * GET /api/sessions/[roomCode]/incident/available
 *
 * Returns incident cards available for the current round
 * No auth required - all players need to see incident cards
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSession } from '$lib/server/game/session-manager';
import { getAvailableIncidents } from '$lib/server/game/incident-manager';

export const GET: RequestHandler = async ({ params }) => {
	const { roomCode } = params;

	try {
		// Get session
		const session = getSession(roomCode);
		if (!session) {
			return json({ success: false, error: 'Session not found' }, { status: 404 });
		}

		// Get available incidents for current round
		const incidents = getAvailableIncidents(session.current_round);

		return json({
			success: true,
			incidents,
			currentRound: session.current_round
		});
	} catch (error) {
		console.error('Error getting available incidents:', error);
		return json(
			{
				success: false,
				error: 'Failed to get available incidents'
			},
			{ status: 500 }
		);
	}
};
