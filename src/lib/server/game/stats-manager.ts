import type { ESPDestinationStats, ESPTeam, Destination, GameSession } from './types';
import { formatVolume } from '$lib/config/metrics-thresholds';
import { gameLogger } from '$lib/server/logger';

/**
 * Calculate ESP statistics from destination's perspective
 * Phase 4.1.1+: Spam complaint rate calculated from previous round's resolution data
 */
export function calculateESPStatsForDestination(
	esp: ESPTeam,
	destination: Destination,
	session: GameSession,
	espSatisfactionBreakdown: any
): ESPDestinationStats {
	// Get ESP reputation at this destination
	// Robust lookup: handle any casing mismatch (zmail vs Zmail)
	const repKey = Object.keys(esp.reputation).find(
		(key) => key.toLowerCase() === destination.name.toLowerCase()
	);
	const reputation = repKey ? esp.reputation[repKey] : 70;

	// Generate 2-letter team code from ESP name
	const teamCode = generateTeamCode(esp.name);

	// Count active clients
	const activeClientsCount = esp.active_clients?.length || 0;

	// PLACEHOLDER: Calculate email volume (will be tracked in later US)
	// For now: estimate based on active clients (35K-50K per client)
	// Note: We use a deterministic way to calculate this if possible, or accept randomness for now
	// Ideally this should be stored in session to avoid jitter on every refresh
	// But the key update we need is activeClientsCount and reputation
	const volumePerClient = 40000 + Math.random() * 15000;
	// Use 0 if no active clients
	const volumeRaw = activeClientsCount > 0 ? Math.floor(activeClientsCount * volumePerClient) : 0;
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

		if (previousRound?.results?.espSatisfactionData?.[esp.name]) {
			const espSatisfaction = previousRound.results.espSatisfactionData[esp.name];

			// Find breakdown for this specific destination
			const destBreakdown = espSatisfaction.breakdown.find(
				(b: any) => b.destination === destination.name
			);

			if (destBreakdown && destBreakdown.total_volume > 0) {
				// Calculate spam complaint rate: spam delivered / total volume
				const rawRate = destBreakdown.spam_through_volume / destBreakdown.total_volume;
				spamComplaintRate = rawRate;
				spamComplaintVolume = destBreakdown.spam_through_volume;
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
export function generateTeamCode(espName: string): string {
	const words = espName.split(/(?=[A-Z])/); // Split on capital letters
	if (words.length >= 2) {
		// Take first letter of first two words
		return (words[0][0] + words[1][0]).toUpperCase();
	}
	// Fallback: first two letters
	return espName.substring(0, 2).toUpperCase();
}
