import { json } from '@sveltejs/kit';
import { createGameSession } from '$lib/server/game/session-manager';
import type { RequestHandler } from './$types';

/**
 * POST /api/sessions
 * Create a new game session
 */
export const POST: RequestHandler = async () => {
	try {
		const session = createGameSession();

		return json({
			roomCode: session.roomCode,
			success: true
		});
	} catch (error) {
		return json(
			{
				error: 'Unable to create game session. Please try again.',
				success: false
			},
			{ status: 500 }
		);
	}
};
