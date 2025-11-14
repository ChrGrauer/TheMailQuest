/**
 * User Satisfaction Calculator
 * US 3.3: Resolution Phase Automation - Iteration 6.1
 *
 * Calculates user satisfaction for destinations based on:
 * - Spam filtering effectiveness
 * - False positive rate
 * - Destination technical upgrades
 */

import type {
	SatisfactionParams,
	SatisfactionResult,
	SatisfactionBreakdownItem
} from '../resolution-types';
import { calculateImpactValues } from '$lib/utils/filtering';
import { DESTINATION_TOOLS } from '$lib/config/destination-technical-upgrades';
import { BASE_SATISFACTION, SATISFACTION_WEIGHTS } from '$lib/config/satisfaction-settings';

/**
 * Calculate effective spam blocking and false positive rates
 * after applying destination tech modifiers (additive)
 */
function calculateEffectiveRates(
	filteringLevel: 'permissive' | 'moderate' | 'strict' | 'maximum',
	ownedTools: string[]
): {
	spamBlocked: number;
	falsePositives: number;
} {
	// Get base effectiveness from filtering level
	const baseImpact = calculateImpactValues(filteringLevel);
	let spamBlocked = baseImpact.spamReduction / 100; // Convert to decimal
	let falsePositives = baseImpact.falsePositives / 100; // Convert to decimal

	// Apply destination tech boosts (additive)
	for (const toolId of ownedTools) {
		const tool = DESTINATION_TOOLS[toolId];
		if (!tool || !tool.effects) continue;

		// Add spam detection boost
		if (tool.effects.spam_detection_boost) {
			spamBlocked += tool.effects.spam_detection_boost / 100;
		}

		// Reduce false positives (negative impact means reduction)
		if (tool.effects.false_positive_impact) {
			falsePositives += tool.effects.false_positive_impact / 100; // Already negative in config
		}
	}

	// Cap spam blocking at 95%, false positives at minimum 0.5%
	spamBlocked = Math.min(0.95, spamBlocked);
	falsePositives = Math.max(0.005, falsePositives);

	return { spamBlocked, falsePositives };
}

/**
 * Calculate satisfaction for a single destination
 */
function calculateDestinationSatisfaction(
	destination: string,
	volumeAtDestination: number,
	totalVolume: number,
	spamRate: number,
	filteringLevel: 'permissive' | 'moderate' | 'strict' | 'maximum',
	ownedTools: string[]
): SatisfactionBreakdownItem {
	// Calculate effective filtering rates with tech modifiers
	const { spamBlocked, falsePositives } = calculateEffectiveRates(filteringLevel, ownedTools);

	// Calculate email flow
	const legitimateRate = 1 - spamRate;

	// Spam handling
	const spamBlockedPercentage = spamRate * spamBlocked * 100; // As percentage of total volume
	const spamThroughPercentage = spamRate * (1 - spamBlocked) * 100; // As percentage of total volume

	// False positives (applied to legitimate emails)
	const falsePositivePercentage = legitimateRate * falsePositives * 100; // As percentage of total volume

	// Apply satisfaction formula
	const satisfactionGain = (spamBlockedPercentage * SATISFACTION_WEIGHTS.spam_blocked) / 100;
	const spamPenalty = (spamThroughPercentage * SATISFACTION_WEIGHTS.spam_through) / 100;
	const falsePositivePenalty =
		(falsePositivePercentage * SATISFACTION_WEIGHTS.false_positives) / 100;

	// Calculate satisfaction
	let satisfaction = BASE_SATISFACTION + satisfactionGain - spamPenalty - falsePositivePenalty;

	// Cap between 0 and 100
	satisfaction = Math.max(0, Math.min(100, satisfaction));

	// Phase 4.3.1: Calculate actual volumes from percentages
	const spamBlockedVolume = Math.round((spamBlockedPercentage / 100) * volumeAtDestination);
	const spamThroughVolume = Math.round((spamThroughPercentage / 100) * volumeAtDestination);
	const falsePositiveVolume = Math.round((falsePositivePercentage / 100) * volumeAtDestination);

	return {
		destination,
		spam_rate: spamRate,
		spam_blocked_percentage: spamBlockedPercentage,
		spam_through_percentage: spamThroughPercentage,
		false_positive_percentage: falsePositivePercentage,
		satisfaction_gain: satisfactionGain,
		spam_penalty: spamPenalty,
		false_positive_penalty: falsePositivePenalty,
		satisfaction,
		// Phase 4.3.1: Include volume data
		total_volume: volumeAtDestination,
		spam_blocked_volume: spamBlockedVolume,
		spam_through_volume: spamThroughVolume,
		false_positive_volume: falsePositiveVolume
	};
}

/**
 * Calculate user satisfaction across all destinations
 *
 * Formula per destination:
 * - spam_blocked_percentage = spam_rate * effective_spam_blocked
 * - spam_through_percentage = spam_rate * (1 - effective_spam_blocked)
 * - false_positive_percentage = legitimate_rate * effective_false_positives
 *
 * Satisfaction = BASE (75)
 *   + spam_blocked_percentage * 300
 *   - spam_through_percentage * 400
 *   - false_positive_percentage * 100
 *
 * Aggregated satisfaction = volume-weighted average across destinations
 */
export function calculateSatisfaction(params: SatisfactionParams): SatisfactionResult {
	const { volumeData, filteringPolicies, ownedTools, complaintRate } = params;

	const destinations = ['Gmail', 'Outlook', 'Yahoo'] as const;
	const breakdown: SatisfactionBreakdownItem[] = [];
	const perDestination: Record<string, number> = {};

	// Calculate satisfaction for each destination
	for (const destination of destinations) {
		const volumeAtDestination = volumeData.perDestination[destination];
		const filteringLevel = filteringPolicies[destination] || 'permissive';
		const destinationTools = ownedTools[destination] || [];

		const destSatisfaction = calculateDestinationSatisfaction(
			destination,
			volumeAtDestination,
			volumeData.totalVolume,
			complaintRate, // Use adjusted complaint rate from complaint calculator
			filteringLevel,
			destinationTools
		);

		breakdown.push(destSatisfaction);
		perDestination[destination] = destSatisfaction.satisfaction;
	}

	// Calculate volume-weighted aggregated satisfaction
	let aggregatedSatisfaction = 0;
	for (const destination of destinations) {
		const volumeWeight = volumeData.perDestination[destination] / volumeData.totalVolume;
		aggregatedSatisfaction += perDestination[destination] * volumeWeight;
	}

	// Cap aggregated satisfaction
	aggregatedSatisfaction = Math.max(0, Math.min(100, aggregatedSatisfaction));

	return {
		aggregatedSatisfaction,
		perDestination,
		breakdown
	};
}
