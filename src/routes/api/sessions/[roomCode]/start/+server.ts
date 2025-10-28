import { json } from '@sveltejs/kit';
import { startGame } from '$lib/server/game/game-start-manager';
import type { RequestHandler } from './$types';

/**
 * POST /api/sessions/[roomCode]/start
 * Start a game session
 * US-1.3: Only the facilitator can start the game
 */
export const POST: RequestHandler = async ({ params, cookies }) => {
	const { roomCode } = params;

	try {
		// Get facilitator ID from cookie
		const facilitatorId = cookies.get('facilitatorId');

		if (!facilitatorId) {
			return json(
				{
					error: 'Unauthorized: Only the facilitator can start the game',
					success: false
				},
				{ status: 403 }
			);
		}

		// Attempt to start the game
		const result = startGame({
			roomCode,
			facilitatorId
		});

		if (!result.success) {
			return json(
				{
					error: result.error,
					success: false
				},
				{ status: 400 }
			);
		}

		return json({
			success: true,
			message: 'Game started successfully'
		});
	} catch (error) {
		return json(
			{
				error: 'Unable to start game. Please try again.',
				success: false
			},
			{ status: 500 }
		);
	}
};
