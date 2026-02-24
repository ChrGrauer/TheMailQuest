import { json, type RequestHandler } from '@sveltejs/kit';
import { getSession } from '$lib/server/game/session-manager';
import { getRemainingPlayersCount } from '$lib/server/game/lock-in-manager';
import { gameLogger } from '$lib/server/logger';
import type { ESPDestinationStats } from '$lib/server/game/types';

/**
 * GET /api/sessions/[roomCode]/destination/[destName]
 * Get Destination dashboard data
 * US-2.5: Destination Kingdom Dashboard
 */
export const GET: RequestHandler = async ({ params }) => {
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

	gameLogger.event('destination_dashboard_fetch', { roomCode, destName });

	// Get the session
	const session = getSession(roomCode);

	if (!session) {
		gameLogger.event('destination_dashboard_fetch_failed', {
			roomCode,
			destName,
			reason: 'Session not found'
		});
		return json(
			{
				error: 'Session not found',
				success: false
			},
			{ status: 404 }
		);
	}

	// Find the destination (case-insensitive)
	const destination = session.destinations.find(
		(d) => d.name.toLowerCase() === destName.toLowerCase()
	);

	if (!destination) {
		gameLogger.event('destination_dashboard_fetch_failed', {
			roomCode,
			destName,
			reason: 'Destination not found'
		});
		return json(
			{
				error: 'Destination not found',
				success: false
			},
			{ status: 404 }
		);
	}

	// Calculate timer remaining time if timer exists
	let timerRemaining = 0;
	if (session.timer && session.timer.isRunning) {
		const elapsed = Math.floor((Date.now() - session.timer.startedAt.getTime()) / 1000);
		timerRemaining = Math.max(0, session.timer.duration - elapsed);
	}

	// Extract ESP satisfaction data from resolution history (if available)
	// This is used for user satisfaction display in ESP stats
	let espSatisfactionBreakdown = null;
	let currentResolution = null;

	if (session.resolution_history && session.resolution_history.length > 0) {
		// Get the most recent resolution (latest round with resolution data)
		const latestResolution = session.resolution_history[session.resolution_history.length - 1];

		if (latestResolution && latestResolution.results) {
			// Extract per-ESP satisfaction breakdown
			// Phase 4.4.1: Use espSatisfactionData instead of espResults (data privacy)
			if (latestResolution.results.espSatisfactionData) {
				espSatisfactionBreakdown = latestResolution.results.espSatisfactionData;
			}

			// Extract resolution data for this specific destination (consequences phase only)
			if (session.current_phase === 'consequences' && latestResolution.results.destinationResults) {
				currentResolution = latestResolution.results.destinationResults[destination.name];
			}
		}
	}

	// Calculate ESP statistics for all ESP teams that have players
	const espStats: ESPDestinationStats[] = session.esp_teams
		.filter((esp) => esp.players.length > 0) // Only include ESPs with players
		.map((esp) => {
			return calculateESPStatsForDestination(esp, destination, session, espSatisfactionBreakdown);
		});

	// Calculate remaining players count (US-3.2)
	const remainingPlayersCount = getRemainingPlayersCount(session);

	// US-2.7: Compile investigation votes from all destinations
	const investigationVotes: Record<string, string[]> = {};
	for (const dest of session.destinations) {
		if (dest.pending_investigation_vote?.espName) {
			const espName = dest.pending_investigation_vote.espName;
			if (!investigationVotes[espName]) {
				investigationVotes[espName] = [];
			}
			investigationVotes[espName].push(dest.name);
		}
	}

	// Prepare dashboard data
	const dashboardData = {
		success: true,
		destination: {
			name: destination.name,
			budget: destination.budget,
			technical_stack: destination.technical_stack || [],
			spam_level: destination.spam_level || 0,
			user_satisfaction: destination.user_satisfaction,
			// US-2.6.2: Tech Shop fields
			kingdom: destination.kingdom || 'zmail',
			owned_tools: destination.owned_tools || [],
			authentication_level: destination.authentication_level || 0,
			// US-2.6.1: Filtering Controls
			filtering_policies: destination.filtering_policies || {},
			// US-3.2: Lock-in state
			locked_in: destination.locked_in || false,
			locked_in_at: destination.locked_in_at || null,
			// US-2.7: Investigation vote
			pending_investigation_vote: destination.pending_investigation_vote || null
		},
		game: {
			roomCode: session.roomCode,
			current_round: session.current_round,
			current_phase: session.current_phase,
			remaining_players: remainingPlayersCount, // US-3.2
			timer: session.timer
				? {
						duration: session.timer.duration,
						remaining: timerRemaining,
						isRunning: session.timer.isRunning
					}
				: null,
			resolution_history: session.resolution_history || [] // US-3.5: Resolution history for all rounds
		},
		espStats,
		// US-3.5 Iteration 3: Current round resolution data for consequences display
		currentResolution,
		espSatisfactionBreakdown,
		// US-2.7: Investigation voting data
		investigationVotes,
		investigationHistory: session.investigation_history || []
	};

	gameLogger.event('destination_dashboard_fetch_success', {
		roomCode,
		destName,
		budget: destination.budget,
		currentRound: session.current_round,
		espCount: espStats.length
	});

	return json(dashboardData);
};

import { calculateESPStatsForDestination } from '$lib/server/game/stats-manager';
