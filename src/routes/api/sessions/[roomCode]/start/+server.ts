import { json } from '@sveltejs/kit';
import { startGame } from '$lib/server/game/game-start-manager';
import {
	allocateResources,
	rollbackAllocation
} from '$lib/server/game/resource-allocation-manager';
import { transitionPhase } from '$lib/server/game/phase-manager';
import { initializeTimer, calculateRemainingTime } from '$lib/server/game/timer-manager';
import { getSession } from '$lib/server/game/session-manager';
import { gameWss } from '$lib/server/websocket';
import { gameLogger } from '$lib/server/logger';
import type { RequestHandler } from './$types';

/**
 * POST /api/sessions/[roomCode]/start
 * Start a game session
 * US-1.3: Only the facilitator can start the game
 * US-1.4: Allocate resources and transition to planning phase
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

		// Step 1: Start the game (transitions to resource_allocation phase, round = 0)
		const startResult = startGame({
			roomCode,
			facilitatorId
		});

		if (!startResult.success) {
			return json(
				{
					error: startResult.error,
					success: false
				},
				{ status: 400 }
			);
		}

		// Step 2: Allocate resources to ESP teams and destinations
		const allocationResult = allocateResources({ roomCode });

		if (!allocationResult.success) {
			// Rollback if allocation fails
			gameLogger.error(new Error('Resource allocation failed'), {
				roomCode,
				error: allocationResult.error
			});

			return json(
				{
					error: allocationResult.error,
					success: false
				},
				{ status: 500 }
			);
		}

		// Step 3: Transition to planning phase (sets round = 1)
		const transitionResult = await transitionPhase({
			roomCode,
			toPhase: 'planning'
		});

		if (!transitionResult.success) {
			// Rollback allocation if transition fails
			rollbackAllocation({ roomCode });

			gameLogger.error(new Error('Phase transition failed'), {
				roomCode,
				error: transitionResult.error
			});

			return json(
				{
					error: transitionResult.error,
					success: false
				},
				{ status: 500 }
			);
		}

		// Step 4: Initialize timer (300 seconds = 5 minutes)
		const timerResult = initializeTimer({
			roomCode,
			duration: 300
		});

		if (!timerResult.success) {
			gameLogger.error(new Error('Timer initialization failed'), {
				roomCode,
				error: timerResult.error
			});
			// Don't fail the whole operation if timer fails, just log it
		}

		// Step 5: Get session data for WebSocket broadcast
		const session = getSession(roomCode);
		if (!session) {
			throw new Error('Session not found after allocation');
		}

		// Step 6: Broadcast resources_allocated message
		gameWss.broadcastToRoom(roomCode, {
			type: 'resources_allocated',
			esp_teams: session.esp_teams
				.filter((t) => t.players.length > 0)
				.map((t) => ({
					name: t.name,
					credits: t.credits,
					reputation: t.reputation
				})),
			destinations: session.destinations
				.filter((d) => d.players.length > 0)
				.map((d) => ({
					name: d.name,
					budget: d.budget
				}))
		});

		// Step 7: Broadcast game_state_update message
		const remaining = calculateRemainingTime(roomCode) || 300;
		gameWss.broadcastToRoom(roomCode, {
			type: 'game_state_update',
			phase: 'planning',
			round: 1,
			timer_duration: 300,
			timer_remaining: remaining
		});

		gameLogger.event('game_start_complete', {
			roomCode,
			phase: 'planning',
			round: 1,
			timestamp: new Date().toISOString()
		});

		return json({
			success: true,
			message: 'Game started successfully',
			phase: 'planning',
			round: 1
		});
	} catch (error) {
		gameLogger.error(error as Error, {
			context: 'POST /api/sessions/[roomCode]/start',
			roomCode
		});

		return json(
			{
				error: 'Unable to start game. Please try again.',
				success: false
			},
			{ status: 500 }
		);
	}
};
