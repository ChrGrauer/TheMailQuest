import { json } from '@sveltejs/kit';
import { getSession } from '$lib/server/game/session-manager';
import {
	validateRoomCode,
	canJoinSession,
	getAvailableSlots
} from '$lib/server/game/player-manager';
import type { RequestHandler } from './$types';

/**
 * GET /api/sessions/[roomCode]
 * Get session information including validation and slot availability
 */
export const GET: RequestHandler = async ({ params }) => {
	const { roomCode } = params;

	// Validate room code format and existence
	const validation = validateRoomCode(roomCode);

	if (!validation.isValidFormat || !validation.exists) {
		return json(
			{
				error: validation.error,
				success: false
			},
			{ status: 404 }
		);
	}

	const session = validation.session!;

	// Check if session can accept new players
	const joinValidation = canJoinSession(roomCode);

	// Get slot information
	const slots = getAvailableSlots(roomCode);

	return json({
		success: true,
		session: {
			roomCode: session.roomCode,
			currentPhase: session.current_phase,
			currentRound: session.current_round,
			canJoin: joinValidation.canJoin,
			joinError: joinValidation.reason,
			slots
		}
	});
};
