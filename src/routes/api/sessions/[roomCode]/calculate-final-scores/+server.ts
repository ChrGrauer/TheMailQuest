import { json } from '@sveltejs/kit';
import { getSession } from '$lib/server/game/session-manager';
import { transitionPhase } from '$lib/server/game/phase-manager';
import { calculateFinalScores } from '$lib/server/game/final-score-calculator';
import { gameWss } from '$lib/server/websocket';
import { gameLogger } from '$lib/server/logger';
import type { RequestHandler } from './$types';

/**
 * POST /api/sessions/[roomCode]/calculate-final-scores
 * Calculate final scores after Round 4 and transition to finished phase
 * US-5.1: Final Score Calculation
 * US-8.2-0.1: End Game Early (forceEarly=true)
 *
 * Requirements:
 * - Only facilitator can call this endpoint
 * - Current phase must be "consequences"
 * - Current round must be 4 (OR forceEarly=true for US-8.2-0.1 End Game Early)
 *
 * Actions:
 * 1. Calculate final scores for all ESPs
 * 2. Calculate destination collaborative score
 * 3. Determine winner(s)
 * 4. Store results in session
 * 5. Transition to finished phase
 * 6. Broadcast results to all players
 */
export const POST: RequestHandler = async ({ params, cookies, request }) => {
	const { roomCode } = params;

	// US-8.2-0.1: Parse optional forceEarly flag for End Game Early
	let forceEarly = false;
	try {
		const body = await request.json();
		forceEarly = body.forceEarly === true;
	} catch {
		// No body or invalid JSON - forceEarly defaults to false
	}

	try {
		// Step 1: Validate facilitator
		const facilitatorId = cookies.get('facilitatorId');

		if (!facilitatorId) {
			return json(
				{
					error: 'Unauthorized: Only the facilitator can calculate final scores',
					success: false
				},
				{ status: 403 }
			);
		}

		// Step 2: Get session and validate
		const session = getSession(roomCode);

		if (!session) {
			return json(
				{
					error: 'Game session not found',
					success: false
				},
				{ status: 404 }
			);
		}

		// Verify facilitator matches
		if (session.facilitatorId !== facilitatorId) {
			return json(
				{
					error: 'Unauthorized: Only the session facilitator can calculate final scores',
					success: false
				},
				{ status: 403 }
			);
		}

		// Step 3: Validate current phase
		if (session.current_phase !== 'consequences') {
			return json(
				{
					error: 'Can only calculate final scores from consequences phase',
					success: false
				},
				{ status: 400 }
			);
		}

		// Step 4: Validate round number (must be Round 4, OR forceEarly for End Game Early)
		if (session.current_round !== 4 && !forceEarly) {
			return json(
				{
					error: 'Can only calculate final scores after Round 4',
					success: false
				},
				{ status: 400 }
			);
		}

		// US-8.2-0.1: End Game Early is only allowed in R1-R3 consequences
		if (forceEarly && session.current_round === 4) {
			// If R4, just use the normal flow without the forceEarly flag
			forceEarly = false;
		}

		// Step 5: Calculate final scores
		gameLogger.info('Starting final score calculation', {
			roomCode,
			round: session.current_round,
			espCount: session.esp_teams.length,
			destinationCount: session.destinations.length
		});

		const startTime = Date.now();
		const finalScores = calculateFinalScores(session);
		const calculationTime = Date.now() - startTime;

		gameLogger.info('Final score calculation completed', {
			roomCode,
			calculationTimeMs: calculationTime,
			winner: finalScores.winner?.espNames ?? 'No qualified winner',
			allDisqualified: finalScores.metadata.allDisqualified
		});

		// Step 6: Store results in session
		session.final_scores = finalScores;

		// Step 7: Transition to finished phase
		const transitionResult = await transitionPhase({
			roomCode,
			toPhase: 'finished'
		});

		if (!transitionResult.success) {
			gameLogger.error(new Error('Phase transition to finished failed'), {
				roomCode,
				error: transitionResult.error
			});

			return json(
				{
					error: transitionResult.error || 'Failed to transition to finished phase',
					success: false
				},
				{ status: 500 }
			);
		}

		// Step 8: Broadcast final scores to all players
		gameWss.broadcastToRoom(roomCode, {
			type: 'final_scores_calculated',
			...finalScores
		});

		// Also broadcast phase transition WITH final scores included
		// This ensures scores are available immediately when phase changes
		gameWss.broadcastToRoom(roomCode, {
			type: 'phase_transition',
			data: {
				phase: 'finished',
				round: 4,
				message: 'Game Complete - Final Scores Calculated',
				final_scores: finalScores
			}
		});

		// Step 9: Log complete results for analytics
		gameLogger.event('final_scores_calculated', {
			roomCode,
			timestamp: finalScores.metadata.calculationTimestamp,
			espResults: finalScores.espResults.map((esp) => ({
				espName: esp.espName,
				rank: esp.rank,
				totalScore: esp.totalScore,
				qualified: esp.qualified,
				disqualificationReason: esp.disqualificationReason
			})),
			winner: finalScores.winner,
			destinationSuccess: finalScores.destinationResults.success,
			destinationScore: finalScores.destinationResults.collaborativeScore,
			calculationTimeMs: calculationTime
		});

		// Step 10: Return success response with complete results
		return json({
			success: true,
			...finalScores
		});
	} catch (error) {
		gameLogger.error(error as Error, {
			context: 'calculate-final-scores endpoint',
			roomCode
		});

		return json(
			{
				error: 'Internal server error during score calculation',
				success: false
			},
			{ status: 500 }
		);
	}
};
