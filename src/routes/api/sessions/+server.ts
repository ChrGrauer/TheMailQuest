import { json } from '@sveltejs/kit';
import { createGameSession } from '$lib/server/game/session-manager';
import type { RequestHandler } from './$types';

/**
 * Generate a unique facilitator ID
 */
function generateFacilitatorId(): string {
	return `facilitator_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * POST /api/sessions
 * Create a new game session
 * US-1.3: Generates facilitatorId and stores in cookie
 */
export const POST: RequestHandler = async ({ cookies }) => {
	try {
		// Generate unique facilitator ID
		const facilitatorId = generateFacilitatorId();

		// Create session with facilitator ID
		const session = createGameSession(facilitatorId);

		// Store facilitator ID in cookie (expires in 24 hours)
		cookies.set('facilitatorId', facilitatorId, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: false, // Set to true in production with HTTPS
			maxAge: 60 * 60 * 24 // 24 hours
		});

		return json({
			roomCode: session.roomCode,
			facilitatorId, // US-1.3: Return facilitatorId to client
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
