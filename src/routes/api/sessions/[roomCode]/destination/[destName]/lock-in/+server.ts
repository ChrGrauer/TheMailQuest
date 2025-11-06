import { json, type RequestHandler } from '@sveltejs/kit';
import { lockInDestination, checkAllPlayersLockedIn } from '$lib/server/game/lock-in-manager';
import { getSession } from '$lib/server/game/session-manager';
import { transitionPhase } from '$lib/server/game/phase-manager';
import { gameLogger } from '$lib/server/logger';
import { gameWss } from '$lib/server/websocket';

/**
 * POST /api/sessions/[roomCode]/destination/[destName]/lock-in
 * Lock in a Destination's decisions for the planning phase
 * US-3.2: Decision Lock-In
 *
 * Request body: {} (no body needed)
 *
 * Process:
 * 1. Lock in the destination (update state)
 * 2. Broadcast lock-in confirmation to destination
 * 3. Broadcast player_locked_in to room (with remaining count)
 * 4. If all players locked, transition to resolution phase
 */
export const POST: RequestHandler = async ({ params }) => {
	const roomCode = params.roomCode;
	const destName = params.destName;

	if (!roomCode || !destName) {
		return json(
			{
				error: 'Invalid parameters',
				success: false
			},
			{ status: 400 }
		);
	}

	gameLogger.event('lock_in_attempt', { roomCode, destinationName: destName, role: 'Destination' });

	// Get session to find the actual destination name (case-insensitive)
	const session = getSession(roomCode);
	if (!session) {
		return json(
			{
				error: 'Session not found',
				success: false
			},
			{ status: 404 }
		);
	}

	// Find destination with case-insensitive match
	const destination = session.destinations.find(
		(d) => d.name.toLowerCase() === destName.toLowerCase()
	);
	if (!destination) {
		return json(
			{
				error: `Destination "${destName}" not found`,
				success: false
			},
			{ status: 404 }
		);
	}

	// Lock in the destination using the actual name (with proper case)
	const result = lockInDestination(roomCode, destination.name);

	if (!result.success) {
		gameLogger.event('lock_in_failed', {
			roomCode,
			destinationName: destName,
			role: 'Destination',
			reason: result.error
		});

		return json(
			{
				error: result.error,
				success: false
			},
			{ status: 400 }
		);
	}

	// Log successful lock-in
	gameLogger.event('lock_in_confirmed', {
		roomCode,
		destinationName: destName,
		role: 'Destination',
		locked_in_at: result.locked_in_at,
		remaining_players: result.remaining_players,
		all_locked: result.all_locked
	});

	// Broadcast lock-in confirmation to the destination
	gameWss.broadcastToRoom(roomCode, {
		type: 'lock_in_confirmed',
		data: {
			destinationName: destName,
			role: 'Destination',
			locked_in: true,
			locked_in_at: result.locked_in_at
		}
	});

	// Broadcast player_locked_in to all players in room
	gameWss.broadcastToRoom(roomCode, {
		type: 'player_locked_in',
		data: {
			playerName: destName,
			role: 'Destination',
			remaining_players: result.remaining_players,
			all_locked: result.all_locked
		}
	});

	// If all players locked, transition to resolution phase
	if (result.all_locked) {
		gameLogger.info('All players locked in - transitioning to resolution', { roomCode });

		// Transition to resolution phase
		const transitionResult = transitionPhase({
			roomCode,
			toPhase: 'resolution'
		});

		if (transitionResult.success) {
			// Broadcast phase transition
			gameWss.broadcastToRoom(roomCode, {
				type: 'phase_transition',
				data: {
					phase: 'resolution',
					round: transitionResult.round,
					message: 'All players locked in - Starting Resolution'
				}
			});
		}
	}

	return json({
		success: true,
		locked_in: true,
		locked_in_at: result.locked_in_at,
		remaining_players: result.remaining_players,
		all_locked: result.all_locked
	});
};
