/**
 * Volume Calculator
 * US 3.3: Resolution Phase Automation - Iteration 1, 5, 6
 * Phase 2: Refactored to use generic modifier system
 *
 * Calculates email volume for ESP teams
 * Iteration 1: Basic volume calculation (filter active clients, sum volumes)
 * Iteration 5: List hygiene and warmup volume reductions
 * Iteration 6: Per-destination volume distribution
 * Phase 2: Generic volume modifiers (warmup, list hygiene, incident effects)
 */

import type { VolumeParams, VolumeResult, ClientVolumeData } from '../resolution-types';

/**
 * Check if a volume modifier applies to the current round
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
 * Calculate total email volume for a team
 * Iteration 1: Filters active clients
 * Iteration 5: Applies list hygiene and warmup reductions
 * Iteration 6: Distributes volume per destination
 * Phase 2: Applies all volume modifiers (multiplies them together)
 */
export function calculateVolume(params: VolumeParams): VolumeResult {
	// Filter to only active clients
	const activeClients = params.clients.filter(
		(client) => params.clientStates[client.id]?.status === 'Active'
	);

	// Calculate volume for each active client
	const clientVolumes: ClientVolumeData[] = activeClients.map((client) => {
		const state = params.clientStates[client.id];
		let adjustedVolume = client.volume;
		const adjustments: Record<string, { amount: number; description: string }> = {};

		// Phase 2: Apply all volume modifiers
		// Start with base volume, multiply by all applicable modifiers
		let cumulativeMultiplier = 1.0;
		const appliedModifiers: string[] = []; // Track which modifiers were applied

		for (const modifier of state.volumeModifiers) {
			if (
				isModifierApplicable(
					modifier.applicableRounds,
					params.currentRound,
					state.first_active_round
				)
			) {
				cumulativeMultiplier *= modifier.multiplier;
				appliedModifiers.push(modifier.source);
				// Track individual modifier effects with description for UI display
				adjustments[modifier.source] = {
					amount: client.volume * (1 - modifier.multiplier),
					description: modifier.description || `${modifier.source} volume modifier`
				};
			}
		}

		// Apply cumulative multiplier
		adjustedVolume = client.volume * cumulativeMultiplier;

		// 3. Distribute volume per destination (Iteration 6)
		// Fallback to default distribution for clients without the field (backward compatibility)
		const distribution = client.destination_distribution || {
			zmail: 50,
			intake: 30,
			yagle: 20
		};
		const perDestination = {
			zmail: Math.round(adjustedVolume * (distribution.zmail / 100)),
			intake: Math.round(adjustedVolume * (distribution.intake / 100)),
			yagle: Math.round(adjustedVolume * (distribution.yagle / 100))
		};

		return {
			clientId: client.id,
			baseVolume: client.volume,
			adjustedVolume: Math.round(adjustedVolume),
			adjustments,
			perDestination
		};
	});

	// Sum total volume
	const totalVolume = clientVolumes.reduce((sum, cv) => sum + cv.adjustedVolume, 0);

	// Aggregate per-destination totals (Iteration 6)
	const perDestination = {
		zmail: clientVolumes.reduce((sum, cv) => sum + cv.perDestination.zmail, 0),
		intake: clientVolumes.reduce((sum, cv) => sum + cv.perDestination.intake, 0),
		yagle: clientVolumes.reduce((sum, cv) => sum + cv.perDestination.yagle, 0)
	};

	return {
		activeClients,
		clientVolumes,
		totalVolume,
		perDestination
	};
}
