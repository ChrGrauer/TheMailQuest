import { json, type RequestHandler } from '@sveltejs/kit';
import { lockInESPTeam, checkAllPlayersLockedIn } from '$lib/server/game/lock-in-manager';
import { getSession } from '$lib/server/game/session-manager';
import { transitionPhase } from '$lib/server/game/phase-manager';
import { handleResolutionPhase } from '$lib/server/game/resolution-phase-handler';
import { gameLogger } from '$lib/server/logger';
import { gameWss } from '$lib/server/websocket';

/**
 * POST /api/sessions/[roomCode]/esp/[teamName]/lock-in
 * Lock in an ESP team's decisions for the planning phase
 * US-3.2: Decision Lock-In
 *
 * Request body: {} (no body needed)
 *
 * Process:
 * 1. Validate the lock-in (budget, phase)
 * 2. Lock in the team (update state)
 * 3. Broadcast lock-in confirmation to team
 * 4. Broadcast player_locked_in to room (with remaining count)
 * 5. If all players locked, transition to resolution phase
 */
export const POST: RequestHandler = async ({ params }) => {
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

	gameLogger.event('lock_in_attempt', { roomCode, teamName, role: 'ESP' });

	// Get session to find the actual team name (case-insensitive)
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

	// Find team with case-insensitive match
	const team = session.esp_teams.find((t) => t.name.toLowerCase() === teamName.toLowerCase());
	if (!team) {
		return json(
			{
				error: `Team "${teamName}" not found`,
				success: false
			},
			{ status: 404 }
		);
	}

	// Lock in the team using the actual team name (with proper case)
	const result = lockInESPTeam(roomCode, team.name);

	if (!result.success) {
		gameLogger.event('lock_in_failed', {
			roomCode,
			teamName,
			role: 'ESP',
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
		teamName,
		role: 'ESP',
		locked_in_at: result.locked_in_at,
		remaining_players: result.remaining_players,
		all_locked: result.all_locked
	});

	// Broadcast lock-in confirmation to the team
	gameWss.broadcastToRoom(roomCode, {
		type: 'lock_in_confirmed',
		data: {
			teamName,
			role: 'ESP',
			locked_in: true,
			locked_in_at: result.locked_in_at
		}
	});

	// Broadcast updated credits and cleared pending decisions
	gameWss.broadcastToRoom(roomCode, {
		type: 'esp_dashboard_update',
		teamName,
		credits: team.credits,
		pending_onboarding_decisions: {}
	});

	// Broadcast player_locked_in to all players in room
	gameWss.broadcastToRoom(roomCode, {
		type: 'player_locked_in',
		data: {
			playerName: teamName,
			role: 'ESP',
			remaining_players: result.remaining_players,
			all_locked: result.all_locked
		}
	});

	// If all players locked, transition to resolution phase
	if (result.all_locked) {
		gameLogger.info('All players locked in - transitioning to resolution', { roomCode });

		// Transition to resolution phase
		const transitionResult = await transitionPhase({
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

			// US-3.5: Trigger resolution calculation and consequences transition
			handleResolutionPhase(session, roomCode, (roomCode, message) => {
				gameWss.broadcastToRoom(roomCode, message);
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
