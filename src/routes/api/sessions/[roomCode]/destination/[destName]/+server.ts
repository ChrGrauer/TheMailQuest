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

	// Calculate ESP statistics for all ESP teams that have players
	const espStats: ESPDestinationStats[] = session.esp_teams
		.filter((esp) => esp.players.length > 0) // Only include ESPs with players
		.map((esp) => {
			return calculateESPStatsForDestination(esp, destination, session);
		});

	// Count active collaborations (placeholder for now - will be implemented in US-2.7)
	const collaborationsCount = 0;

	// Calculate remaining players count (US-3.2)
	const remainingPlayersCount = getRemainingPlayersCount(session);

	// US-3.5 Iteration 3: Get current round resolution data for consequences phase
	let currentResolution = null;
	let espSatisfactionBreakdown = null;

	if (session.current_phase === 'consequences' && session.resolution_history) {
		// Get the most recent resolution (current round)
		const latestResolution = session.resolution_history[session.resolution_history.length - 1];

		if (latestResolution && latestResolution.results) {
			// Extract resolution data for this specific destination
			if (latestResolution.results.destinationResults) {
				currentResolution = latestResolution.results.destinationResults[destination.name];
			}

			// Extract per-ESP satisfaction breakdown for ESP Behavior Analysis
			if (latestResolution.results.espResults) {
				espSatisfactionBreakdown = {};
				for (const [espName, espResult] of Object.entries(latestResolution.results.espResults)) {
					if (espResult.satisfaction) {
						espSatisfactionBreakdown[espName] = espResult.satisfaction;
					}
				}
			}
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
			kingdom: destination.kingdom || 'Gmail',
			owned_tools: destination.owned_tools || [],
			authentication_level: destination.authentication_level || 0,
			// US-2.6.1: Filtering Controls
			filtering_policies: destination.filtering_policies || {},
			// US-3.2: Lock-in state
			locked_in: destination.locked_in || false,
			locked_in_at: destination.locked_in_at || null
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
		collaborations_count: collaborationsCount,
		// US-3.5 Iteration 3: Current round resolution data for consequences display
		currentResolution,
		espSatisfactionBreakdown
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
 * US-2.5: For now, uses placeholder/mock data for volume, satisfaction, and spam rates
 * These will be calculated from actual game mechanics in later US
 */
function calculateESPStatsForDestination(
	esp: any,
	destination: any,
	session: any
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

	// PLACEHOLDER: User satisfaction mirrors reputation for now
	// In future US, this will be calculated from user feedback
	const userSatisfaction = reputation;

	// PLACEHOLDER: Spam complaint rate based on reputation
	// Better reputation = lower spam rate
	// This is simplified for now, will be tracked properly in later US
	let spamComplaintRate: number;
	if (reputation >= 90) {
		spamComplaintRate = 0.01 + Math.random() * 0.03; // 0.01-0.04%
	} else if (reputation >= 70) {
		spamComplaintRate = 0.04 + Math.random() * 0.06; // 0.04-0.10%
	} else if (reputation >= 50) {
		spamComplaintRate = 0.08 + Math.random() * 0.12; // 0.08-0.20%
	} else {
		spamComplaintRate = 0.15 + Math.random() * 0.15; // 0.15-0.30%
	}

	return {
		espName: esp.name,
		teamCode,
		activeClientsCount,
		volume,
		volumeRaw,
		reputation,
		userSatisfaction,
		spamComplaintRate: Math.round(spamComplaintRate * 100) / 100 // Round to 2 decimals
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
