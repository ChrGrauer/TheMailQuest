import { json } from '@sveltejs/kit';
import { getSession } from '$lib/server/game/session-manager';
import { transitionPhase } from '$lib/server/game/phase-manager';
import { initializeTimer, calculateRemainingTime } from '$lib/server/game/timer-manager';
import { gameWss } from '$lib/server/websocket';
import { gameLogger } from '$lib/server/logger';
import { calculateESPStatsForDestination } from '$lib/server/game/stats-manager';
import type { RequestHandler } from './$types';

/**
 * POST /api/sessions/[roomCode]/next-round
 * Start the next round (transition from consequences to planning)
 * US-8.2-0.0: Facilitator can manually start next round after consequences
 *
 * Requirements:
 * - Only facilitator can call this endpoint
 * - Current phase must be "consequences"
 * - Current round must be 1, 2, or 3 (not 4)
 *
 * Actions:
 * 1. Clear locked_in state for all teams and destinations
 * 2. Increment round number
 * 3. Transition to planning phase
 * 4. Initialize timer (300 seconds)
 * 5. Broadcast phase transition to all players
 */
export const POST: RequestHandler = async ({ params, cookies }) => {
	const { roomCode } = params;

	try {
		// Step 1: Validate facilitator
		const facilitatorId = cookies.get('facilitatorId');

		if (!facilitatorId) {
			return json(
				{
					error: 'Unauthorized: Only the facilitator can start the next round',
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
					error: 'Unauthorized: Only the session facilitator can start the next round',
					success: false
				},
				{ status: 403 }
			);
		}

		// Step 3: Validate current phase
		if (session.current_phase !== 'consequences') {
			return json(
				{
					error: 'Can only start next round from consequences phase',
					success: false
				},
				{ status: 400 }
			);
		}

		// Step 4: Validate round number
		if (session.current_round >= 4) {
			return json(
				{
					error: 'Cannot start round 5. Maximum rounds is 4.',
					success: false
				},
				{ status: 400 }
			);
		}

		if (session.current_round < 1 || session.current_round > 3) {
			return json(
				{
					error: 'Can only start next round from rounds 1, 2, or 3',
					success: false
				},
				{ status: 400 }
			);
		}

		// Step 5: Clear locked_in state for all teams and destinations
		// (pendingAutoLock teams will be re-locked after phase transition broadcast)
		session.esp_teams.forEach((team) => {
			team.locked_in = false;
			team.locked_in_at = undefined;
		});

		session.destinations.forEach((dest) => {
			dest.locked_in = false;
			dest.locked_in_at = undefined;
		});

		gameLogger.info('Cleared locked_in state for all players', {
			roomCode,
			round: session.current_round,
			espTeamsCount: session.esp_teams.length,
			destinationsCount: session.destinations.length
		});

		// Step 6: Increment round number
		const previousRound = session.current_round;
		session.current_round += 1;

		gameLogger.info('Incremented round number', {
			roomCode,
			previousRound,
			newRound: session.current_round
		});

		// Step 6.5: Reset spam traps (Phase 1.2.2)
		// Spam traps must be repurchased each round
		// - Secret traps: Active immediately (round N), reset when advancing to N+1
		// - Announced traps: Active starting round N+1, reset when advancing to N+2
		session.destinations.forEach((dest) => {
			const trapInfo = dest.spam_trap_active;
			if (trapInfo) {
				let shouldReset = false;

				if (trapInfo.announced) {
					// Announced trap: reset if purchased 2+ rounds ago
					// It was active in round N+1, remove when transitioning to N+2
					shouldReset = session.current_round > trapInfo.round + 1;
				} else {
					// Secret trap: reset if purchased 1+ rounds ago
					// It was active in round N, remove when transitioning to N+1
					shouldReset = session.current_round > trapInfo.round;
				}

				if (shouldReset) {
					// Remove spam trap from owned tools
					dest.owned_tools = dest.owned_tools.filter((tool) => tool !== 'spam_trap_network');

					// Reset spam_trap_active
					dest.spam_trap_active = undefined;

					gameLogger.info('Reset spam trap (not repurchased)', {
						roomCode,
						destination: dest.name,
						wasAnnounced: trapInfo.announced,
						purchasedInRound: trapInfo.round,
						resetInRound: session.current_round
					});
				}
			}
		});

		// Step 7: Transition to planning phase
		const transitionResult = await transitionPhase({
			roomCode,
			toPhase: 'planning'
		});

		if (!transitionResult.success) {
			// Rollback round increment if transition fails
			session.current_round = previousRound;

			gameLogger.error(new Error('Phase transition failed during next round'), {
				roomCode,
				error: transitionResult.error
			});

			return json(
				{
					error: transitionResult.error || 'Failed to transition to planning phase',
					success: false
				},
				{ status: 500 }
			);
		}

		// Step 8: Initialize timer (300 seconds = 5 minutes)
		const timerResult = initializeTimer({
			roomCode,
			duration: 300
		});

		if (!timerResult.success) {
			gameLogger.error(new Error('Timer initialization failed during next round'), {
				roomCode,
				error: timerResult.error
			});
			// Don't fail the whole operation if timer fails, just log it
		}

		// Step 9: Broadcast phase transition to all players
		const remaining = calculateRemainingTime(roomCode) || 300;

		gameWss.broadcastToRoom(roomCode, {
			type: 'phase_transition',
			data: {
				phase: 'planning',
				round: session.current_round,
				message: `Round ${session.current_round} - Planning Phase`,
				timer_remaining: remaining,
				locked_in: false, // Explicitly tell all clients they are NOT locked in
				incident_history: session.incident_history // Include history (especially for auto-triggered incidents)
			}
		});

		// Prepare satisfaction data for stats calculation (from latest resolution)
		let espSatisfactionBreakdown = null;
		if (session.resolution_history && session.resolution_history.length > 0) {
			const latestResolution = session.resolution_history[session.resolution_history.length - 1];
			if (
				latestResolution &&
				latestResolution.results &&
				latestResolution.results.espSatisfactionData
			) {
				espSatisfactionBreakdown = latestResolution.results.espSatisfactionData;
			}
		}

		// Broadcast destination dashboard updates to ensure clients have latest data
		// This fixes the bug where ESP stats and spam trap resets weren't reflecting until refresh
		session.destinations.forEach((dest) => {
			// Calculate fresh ESP stats for this destination
			const esp_stats = session.esp_teams
				.filter((esp) => esp.players.length > 0)
				.map((esp) => {
					return calculateESPStatsForDestination(esp, dest, session, espSatisfactionBreakdown);
				});

			gameWss.broadcastToRoom(roomCode, {
				type: 'destination_dashboard_update',
				destinationName: dest.name,
				budget: dest.budget,
				esp_stats: esp_stats, // Critical: Update stats for the new round
				spam_level: (dest as any).spam_level || 0,
				filtering_policies: dest.filtering_policies,
				owned_tools: dest.owned_tools || [], // Critical: Update owned tools (spam traps may have been reset)
				authentication_level: dest.authentication_level,
				esp_metrics: dest.esp_metrics,
				locked_in: false
			});
		});

		// Re-apply auto-locks after phase transition broadcast (for INC-016 pending auto-locks)
		// This must happen AFTER phase_transition so clients receive messages in correct order:
		// 1. phase_transition (resets lock state) -> 2. lock_in_confirmed (sets lock state)
		for (const team of session.esp_teams) {
			if (team.pendingAutoLock === true) {
				// Clear the pending flag (state was already updated in transitionPhase)
				team.pendingAutoLock = false;

				gameWss.broadcastToRoom(roomCode, {
					type: 'lock_in_confirmed',
					teamName: team.name,
					role: 'ESP',
					locked_in: true,
					locked_in_at: team.locked_in_at as any
				});

				gameLogger.info('Applied pending auto-lock from INC-016', {
					roomCode,
					teamName: team.name,
					round: session.current_round
				});
			}
		}

		// Also broadcast game_state_update for backwards compatibility
		gameWss.broadcastToRoom(roomCode, {
			type: 'game_state_update',
			phase: 'planning',
			round: session.current_round,
			timer_duration: 300,
			timer_remaining: remaining,
			locked_in: false, // Explicitly tell all clients they are NOT locked in
			incident_history: session.incident_history // Include history (especially for auto-triggered incidents)
		});

		gameLogger.event('next_round_started', {
			roomCode,
			round: session.current_round,
			phase: 'planning',
			timestamp: new Date().toISOString()
		});

		// Step 10: Return success response
		return json({
			success: true,
			round: session.current_round,
			phase: 'planning',
			timer_remaining: remaining
		});
	} catch (error) {
		gameLogger.error(error as Error, {
			context: 'next-round endpoint',
			roomCode
		});

		return json(
			{
				error: 'Internal server error',
				success: false
			},
			{ status: 500 }
		);
	}
};
