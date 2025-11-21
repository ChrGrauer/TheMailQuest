/**
 * Spam Trap Calculator
 * US 3.3: Resolution Phase Automation - Iteration 7
 * Phase 2: Refactored to use generic modifier system
 *
 * Calculates spam trap risk and detection for ESP clients
 * - Base risk from client profiles
 * - Generic spam trap modifiers (list hygiene, incident effects)
 * - Spam trap network multiplies risk by 3x at active destinations
 * - Per-client seeded random rolls
 * - Reputation penalty capped at -5 per round
 */

import type { SpamTrapParams, SpamTrapResult, ClientSpamTrapData } from '../resolution-types';
import { getSpamTrapRisk } from '$lib/config/client-profiles';
import { SPAM_TRAP_NETWORK_MULTIPLIER } from '$lib/config/metrics-thresholds';

/**
 * Check if a spam trap modifier applies to the current round
 * Handles special case: -1 means "first active round only"
 *
 * @param applicableRounds - Array of rounds where modifier applies
 * @param currentRound - Current game round
 * @param firstActiveRound - Round when client first became active
 * @returns True if modifier should be applied
 */
function isModifierApplicable(
	applicableRounds: number[],
	currentRound: number,
	firstActiveRound: number | null
): boolean {
	// Handle special case: -1 = first active round only
	if (applicableRounds.includes(-1)) {
		return firstActiveRound !== null && firstActiveRound === currentRound;
	}
	// Standard case: check if current round is in the list
	return applicableRounds.includes(currentRound);
}

/**
 * Seeded random number generator
 * Uses simple hash-based PRNG for reproducibility
 * @param seed - String seed for deterministic randomness
 * @returns Number between 0 and 1
 */
function seededRandom(seed: string): number {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash << 5) - hash + seed.charCodeAt(i);
		hash = hash & hash; // Convert to 32bit integer
	}
	// Ensure positive and normalize to 0-1
	return Math.abs(hash % 10000) / 10000;
}

/**
 * Calculate spam trap detection for all active clients
 * Iteration 7: Per-client spam trap rolls with network effects
 */
export function calculateSpamTraps(params: SpamTrapParams): SpamTrapResult {
	const perClient: ClientSpamTrapData[] = [];
	let totalBaseRisk = 0;
	let totalAdjustedRisk = 0;
	const hitClientIds: string[] = [];
	const hitDestinations = new Set<string>();

	for (const client of params.clients) {
		const clientVolumeData = params.volumeData.clientVolumes.find(
			(cv) => cv.clientId === client.id
		);
		const volume = clientVolumeData?.adjustedVolume || 0;

		// 1. Get base spam trap risk from client profile
		const baseRisk = getSpamTrapRisk(client.type);
		totalBaseRisk += baseRisk;

		// 2. Phase 2: Apply all spam trap modifiers
		// Start with base risk, multiply by all applicable modifiers
		const clientState = params.clientStates[client.id];
		let cumulativeMultiplier = 1.0;

		for (const modifier of clientState.spamTrapModifiers) {
			if (
				isModifierApplicable(modifier.applicableRounds, params.round, clientState.first_active_round)
			) {
				cumulativeMultiplier *= modifier.multiplier;
			}
		}

		// Apply cumulative multiplier to base risk
		const adjustedRisk = baseRisk * cumulativeMultiplier;
		totalAdjustedRisk += adjustedRisk;

		// 3. Apply spam trap network multiplier per destination
		const networkMultipliedRisk: Record<string, number> = {};
		const destinations = ['Gmail', 'Outlook', 'Yahoo'];

		for (const dest of destinations) {
			const networkActive = params.spamTrapNetworkActive[dest] || false;
			const multiplier = networkActive ? SPAM_TRAP_NETWORK_MULTIPLIER : 1;
			networkMultipliedRisk[dest] = adjustedRisk * multiplier;
		}

		// 4. Generate seeded random roll
		// Seed: roomCode-round-espName-clientId for reproducibility
		const seed = `${params.roomCode}-${params.round}-${params.espName}-${client.id}`;
		const randomRoll = seededRandom(seed);

		// 5. Check for trap hits at each destination
		const clientHitDestinations: string[] = [];
		let trapHit = false;

		for (const dest of destinations) {
			const destRisk = networkMultipliedRisk[dest];
			// Separate roll per destination
			const destSeed = `${seed}-${dest}`;
			const destRoll = seededRandom(destSeed);

			if (destRoll < destRisk) {
				trapHit = true;
				clientHitDestinations.push(dest);
				hitDestinations.add(dest);
			}
		}

		if (trapHit) {
			hitClientIds.push(client.id);
		}

		// Record client data
		perClient.push({
			clientId: client.id,
			clientType: client.type,
			baseRisk,
			adjustedRisk,
			networkMultipliedRisk,
			volume,
			trapHit,
			randomRoll, // Store primary roll for transparency
			hitDestinations: clientHitDestinations
		});
	}

	// 6. Calculate reputation penalty (capped at -5)
	const trapHitOverall = hitClientIds.length > 0;
	const uncappedPenalty = hitClientIds.length * -5; // Each hit = -5
	const reputationPenalty = Math.max(uncappedPenalty, -5); // Cap at -5
	const cappedAtMax = uncappedPenalty < -5;

	return {
		totalBaseRisk,
		totalAdjustedRisk,
		perClient,
		trapHit: trapHitOverall,
		hitClientIds,
		hitDestinations: Array.from(hitDestinations),
		reputationPenalty,
		cappedAtMax
	};
}
