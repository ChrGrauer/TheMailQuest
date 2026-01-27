import { json, type RequestHandler } from '@sveltejs/kit';
import { getSession } from '$lib/server/game/session-manager';
import { getRemainingPlayersCount } from '$lib/server/game/lock-in-manager';
import { gameLogger } from '$lib/server/logger';
import type { ESPDestinationStats } from '$lib/server/game/types';
import { formatVolume } from '$lib/config/metrics-thresholds';

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

/**
 * Calculate ESP statistics from destination's perspective
 * Phase 4.1.1+: Spam complaint rate calculated from previous round's resolution data
 */
function calculateESPStatsForDestination(
	esp: any,
	destination: any,
	session: any,
	espSatisfactionBreakdown: any
): ESPDestinationStats {
	// Get ESP reputation at this destination
	const reputation = esp.reputation[destination.name] || 70;

	// Generate 2-letter team code from ESP name
	const teamCode = generateTeamCode(esp.name);

	// Count active clients
	const activeClientsCount = esp.active_clients?.length || 0;

	// PLACEHOLDER: Calculate email volume (will be tracked in later US)
	// For now: estimate based on active clients (35K-50K per client)
	const volumePerClient = 40000 + Math.random() * 15000;
	const volumeRaw = Math.floor(activeClientsCount * volumePerClient);
	const volume = formatVolume(volumeRaw);

	// Get user satisfaction from resolution history
	// If no history exists, return null to display '-' in the UI
	let userSatisfaction: number | null = null;
	if (espSatisfactionBreakdown && espSatisfactionBreakdown[esp.name]) {
		const satisfactionData = espSatisfactionBreakdown[esp.name];
		if (
			satisfactionData.perDestination &&
			satisfactionData.perDestination[destination.name] !== undefined
		) {
			userSatisfaction = satisfactionData.perDestination[destination.name];
		}
	}

	// Calculate spam complaint rate and volume from previous round's resolution history
	// Formula: spam_through_volume / total_volume from previous round
	let spamComplaintRate: number = 0;
	let spamComplaintVolume: number = 0;

	if (session.current_round > 1 && session.resolution_history) {
		// Get previous round's resolution (current_round - 1)
		const previousRoundIndex = session.current_round - 2; // Array is 0-indexed
		const previousRound = session.resolution_history[previousRoundIndex];

		gameLogger.event('spam_rate_debug', {
			roomCode: session.roomCode,
			espName: esp.name,
			destinationName: destination.name,
			currentRound: session.current_round,
			previousRoundIndex,
			historyLength: session.resolution_history.length,
			hasPreviousRound: !!previousRound,
			hasResults: !!previousRound?.results,
			hasEspSatisfactionData: !!previousRound?.results?.espSatisfactionData,
			espNamesInSatisfactionData: previousRound?.results?.espSatisfactionData
				? Object.keys(previousRound.results.espSatisfactionData)
				: [],
			lookingForESP: esp.name
		});

		if (previousRound?.results?.espSatisfactionData?.[esp.name]) {
			const espSatisfaction = previousRound.results.espSatisfactionData[esp.name];

			// Find breakdown for this specific destination
			const destBreakdown = espSatisfaction.breakdown.find(
				(b: any) => b.destination === destination.name
			);

			gameLogger.event('spam_rate_breakdown', {
				roomCode: session.roomCode,
				espName: esp.name,
				destinationName: destination.name,
				foundBreakdown: !!destBreakdown,
				allDestinationsInBreakdown: espSatisfaction.breakdown.map((b: any) => b.destination),
				totalVolume: destBreakdown?.total_volume,
				spamThroughVolume: destBreakdown?.spam_through_volume,
				spamBlockedVolume: destBreakdown?.spam_blocked_volume,
				spamRate: destBreakdown?.spam_rate
			});

			if (destBreakdown && destBreakdown.total_volume > 0) {
				// Calculate spam complaint rate: spam delivered / total volume
				const rawRate = destBreakdown.spam_through_volume / destBreakdown.total_volume;
				spamComplaintRate = rawRate;
				spamComplaintVolume = destBreakdown.spam_through_volume;

				gameLogger.event('spam_rate_calculated', {
					roomCode: session.roomCode,
					espName: esp.name,
					destinationName: destination.name,
					spamThroughVolume: destBreakdown.spam_through_volume,
					totalVolume: destBreakdown.total_volume,
					rawRate,
					afterConversion: Math.round(rawRate * 10000) / 100
				});
			}
		}
	}

	return {
		espName: esp.name,
		teamCode,
		activeClientsCount,
		volume,
		volumeRaw,
		reputation,
		userSatisfaction,
		spamComplaintRate: Math.round(spamComplaintRate * 10000) / 100, // Convert to percentage and round to 2 decimals
		spamComplaintVolume // Number of spam emails delivered
	};
}

/**
 * Generate 2-letter team code from ESP name
 * Examples: SendWave -> SW, MailMonkey -> MM
 */
function generateTeamCode(espName: string): string {
	const words = espName.split(/(?=[A-Z])/); // Split on capital letters
	if (words.length >= 2) {
		// Take first letter of first two words
		return (words[0][0] + words[1][0]).toUpperCase();
	}
	// Fallback: first two letters
	return espName.substring(0, 2).toUpperCase();
}
