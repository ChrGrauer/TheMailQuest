import { json, type RequestHandler } from '@sveltejs/kit';
import { autoLockAllPlayers } from '$lib/server/game/lock-in-manager';
import { getSession } from '$lib/server/game/session-manager';
import { transitionPhase } from '$lib/server/game/phase-manager';
import { handleResolutionPhase } from '$lib/server/game/resolution-phase-handler';
import { gameLogger } from '$lib/server/logger';
import { gameWss } from '$lib/server/websocket';

/**
 * POST /api/sessions/[roomCode]/auto-lock
 * Manually trigger auto-lock (for testing or admin purposes)
 * US-3.2: Decision Lock-In
 *
 * This endpoint simulates timer expiry and auto-locks all unlocked players.
 * Used primarily for E2E testing but can also be triggered manually.
 *
 * Process:
 * 1. Auto-lock all unlocked players
 * 2. Transition to resolution phase
 * 3. Broadcast phase transition to all players
 */
export const POST: RequestHandler = async ({ params }) => {
	const roomCode = params.roomCode;

	if (!roomCode) {
		return json(
			{
				error: 'Invalid parameters',
				success: false
			},
			{ status: 400 }
		);
	}

	gameLogger.event('auto_lock_triggered', { roomCode, source: 'manual' });

	// Get session
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

	// Check if in planning phase
	if (session.current_phase !== 'planning') {
		return json(
			{
				error: 'Auto-lock only available during planning phase',
				success: false,
				currentPhase: session.current_phase
			},
			{ status: 400 }
		);
	}

	try {
		// Auto-lock all unlocked players and get corrections
		const correctionsMap = autoLockAllPlayers(roomCode);

		// Broadcast corrections to affected teams
		for (const [teamName, corrections] of correctionsMap.entries()) {
			if (corrections.length > 0) {
				gameLogger.info(`Broadcasting ${corrections.length} corrections to team ${teamName}`, {
					roomCode,
					teamName
				});

				gameWss.broadcastToRoom(roomCode, {
					type: 'auto_lock_corrections',
					data: {
						teamName,
						corrections: corrections.map((c) => ({
							clientName: c.clientName,
							optionType: c.optionType,
							costSaved: c.costSaved
						}))
					}
				});
			}
		}

		// Broadcast auto-lock completion to ALL players (for those without corrections)
		gameWss.broadcastToRoom(roomCode, {
			type: 'auto_lock_complete',
			data: {
				message: "Time's up! Decisions locked automatically"
			}
		});

		gameLogger.info('Auto-lock completed - transitioning to resolution', { roomCode });

		// Transition to resolution phase
		const transitionResult = await transitionPhase({
			roomCode,
			toPhase: 'resolution'
		});

		if (!transitionResult.success) {
			gameLogger.error(new Error('Phase transition failed after auto-lock'), {
				roomCode,
				error: transitionResult.error
			});

			return json(
				{
					error: 'Auto-lock succeeded but phase transition failed',
					success: false,
					details: transitionResult.error
				},
				{ status: 500 }
			);
		}

		// Broadcast phase transition to all players
		gameWss.broadcastToRoom(roomCode, {
			type: 'phase_transition',
			phase: 'resolution',
			round: transitionResult.round,
			message: "Time's up! All decisions locked - Starting Resolution"
		});

		// US-3.5: Trigger resolution calculation and consequences transition
		handleResolutionPhase(session, roomCode, (roomCode, message) => {
			gameWss.broadcastToRoom(roomCode, message);
		});

		gameLogger.event('auto_lock_success', {
			roomCode,
			newPhase: 'resolution',
			round: transitionResult.round
		});

		return json({
			success: true,
			message: 'All players auto-locked and phase transitioned to resolution',
			phase: 'resolution',
			round: transitionResult.round
		});
	} catch (error) {
		gameLogger.error(error as Error, {
			context: 'auto_lock_endpoint',
			roomCode
		});

		return json(
			{
				error: 'Auto-lock failed',
				success: false,
				details: (error as Error).message
			},
			{ status: 500 }
		);
	}
};
