/**
 * Final Score Calculator
 * US-5.1: Final Score Calculation
 *
 * Calculates final scores for ESP teams and destination collaborative score
 * after Round 4 completion. Determines winner(s) and rankings.
 */

import {
	SCORE_WEIGHTS,
	KINGDOM_WEIGHTS,
	MIN_REPUTATION_THRESHOLD,
	MAX_TECH_INVESTMENT,
	DESTINATION_SUCCESS_THRESHOLD,
	DESTINATION_WEIGHTS,
	getKingdomNames
} from '$lib/config/final-scoring';
import { TECHNICAL_UPGRADES } from '$lib/config/technical-upgrades';
import type { GameSession, InvestigationHistoryEntry } from './types';
import type {
	ESPScoreBreakdown,
	ESPFinalResult,
	WinnerInfo,
	QualificationResult,
	ReputationScoreResult,
	DestinationStats,
	DestinationCollaborativeResult,
	RoundMetrics,
	FinalScoreOutput
} from './final-score-types';

// ============================================================================
// Reputation Score Calculation
// ============================================================================

/**
 * Calculate the reputation score component for an ESP
 * Applies kingdom weights and converts to a 0-50 point score
 *
 * @param reputation - Per-kingdom reputation values (Gmail, Outlook, Yahoo)
 * @returns Weighted reputation (0-100) and score (0-50 points)
 */
export function calculateReputationScore(
	reputation: Record<string, number>
): ReputationScoreResult {
	const kingdoms = getKingdomNames();
	let weightedReputation = 0;

	for (const kingdom of kingdoms) {
		const weight = KINGDOM_WEIGHTS[kingdom] ?? 0;
		// Clamp reputation value to 0-100 range
		const clampedRep = Math.max(0, Math.min(100, reputation[kingdom] ?? 0));
		weightedReputation += clampedRep * weight;
	}

	// Round to 2 decimal places
	weightedReputation = Math.round(weightedReputation * 100) / 100;

	// Convert to score: (weightedReputation / 100) × SCORE_WEIGHTS.REPUTATION
	const score = Math.round((weightedReputation / 100) * SCORE_WEIGHTS.REPUTATION * 100) / 100;

	return {
		weightedReputation,
		score
	};
}

// ============================================================================
// Revenue Score Calculation
// ============================================================================

/**
 * Calculate revenue scores for all ESPs relative to highest earner
 *
 * @param revenues - Total revenue per ESP (key = espName)
 * @returns Revenue score per ESP (0-35 points)
 */
export function calculateRevenueScores(revenues: Record<string, number>): Record<string, number> {
	const maxRevenue = Math.max(...Object.values(revenues), 0);
	const scores: Record<string, number> = {};

	for (const [espName, revenue] of Object.entries(revenues)) {
		if (maxRevenue === 0) {
			scores[espName] = 0;
		} else {
			const score = (revenue / maxRevenue) * SCORE_WEIGHTS.REVENUE;
			scores[espName] = Math.round(score * 100) / 100;
		}
	}

	return scores;
}

// ============================================================================
// Technical Score Calculation
// ============================================================================

/**
 * Calculate technical score based on total investments
 * Score is capped when investments reach MAX_TECH_INVESTMENT threshold
 *
 * @param totalInvestments - Total credits spent on technical upgrades
 * @returns Technical score (0-15 points)
 */
export function calculateTechnicalScore(totalInvestments: number): number {
	const ratio = Math.min(totalInvestments / MAX_TECH_INVESTMENT, 1.0);
	const score = ratio * SCORE_WEIGHTS.TECHNICAL;
	return Math.round(score * 100) / 100;
}

/**
 * Calculate total tech investment from owned upgrade IDs
 *
 * @param ownedTechIds - Array of tech upgrade IDs owned by the ESP
 * @returns Total credits invested in tech
 */
export function calculateTotalTechInvestment(ownedTechIds: string[]): number {
	let total = 0;
	for (const techId of ownedTechIds) {
		const tech = TECHNICAL_UPGRADES.find((t) => t.id === techId);
		if (tech) {
			total += tech.cost;
		}
	}
	return total;
}

// ============================================================================
// Qualification Check
// ============================================================================

/**
 * Check if an ESP qualifies for winning (reputation >= 60 in all kingdoms)
 *
 * @param reputation - Per-kingdom reputation values
 * @returns Qualification result with failing kingdoms if disqualified
 */
export function checkQualification(reputation: Record<string, number>): QualificationResult {
	const kingdoms = getKingdomNames();
	const failingKingdoms: string[] = [];

	for (const kingdom of kingdoms) {
		const rep = reputation[kingdom] ?? 0;
		if (rep < MIN_REPUTATION_THRESHOLD) {
			failingKingdoms.push(kingdom);
		}
	}

	if (failingKingdoms.length === 0) {
		return {
			qualified: true,
			failingKingdoms: [],
			reason: null
		};
	}

	return {
		qualified: false,
		failingKingdoms,
		reason: `Reputation below ${MIN_REPUTATION_THRESHOLD} in: ${failingKingdoms.join(', ')}`
	};
}

// ============================================================================
// Winner Determination
// ============================================================================

/**
 * Determine the winner(s) from ESP results
 * Uses weighted reputation as tie-breaker
 *
 * @param espResults - Array of ESP final results
 * @returns Winner info or null if all disqualified
 */
export function determineWinner(espResults: ESPFinalResult[]): WinnerInfo | null {
	// Filter to only qualified ESPs
	const qualifiedESPs = espResults.filter((esp) => esp.qualified);

	if (qualifiedESPs.length === 0) {
		return null;
	}

	// Sort by total score (descending), then by weighted reputation (descending)
	const sorted = [...qualifiedESPs].sort((a, b) => {
		if (b.totalScore !== a.totalScore) {
			return b.totalScore - a.totalScore;
		}
		return b.scoreBreakdown.weightedReputation - a.scoreBreakdown.weightedReputation;
	});

	const topScore = sorted[0].totalScore;
	const topWeightedRep = sorted[0].scoreBreakdown.weightedReputation;

	// Find all ESPs with same top score and weighted reputation (true tie)
	const winners = sorted.filter(
		(esp) => esp.totalScore === topScore && esp.scoreBreakdown.weightedReputation === topWeightedRep
	);

	// Check if tie-breaker was used (multiple ESPs had same score but different weighted rep)
	const sameScoreCount = sorted.filter((esp) => esp.totalScore === topScore).length;
	const tieBreaker = sameScoreCount > 1 && winners.length === 1;

	return {
		espNames: winners.map((esp) => esp.espName),
		totalScore: topScore,
		tieBreaker
	};
}

// ============================================================================
// Destination Collaborative Score
// ============================================================================

interface DestinationInputStats {
	spamBlocked: number;
	totalSpamSent: number;
	falsePositives: number;
	legitimateEmails: number;
}

/**
 * Calculate coordination bonus based on investigation history
 * Each triggered investigation awards 10 points
 *
 * @param investigationHistory - Array of completed investigations
 * @returns Coordination bonus points (10 per investigation)
 */
export function calculateCoordinationBonus(
	investigationHistory: InvestigationHistoryEntry[] | undefined
): number {
	if (!investigationHistory || investigationHistory.length === 0) {
		return 0;
	}
	return investigationHistory.length * DESTINATION_WEIGHTS.COORDINATION_BONUS;
}

/**
 * Calculate destination collaborative score
 *
 * @param stats - Per-destination stats (Gmail, Outlook, Yahoo)
 * @param investigationHistory - Optional investigation history for coordination bonus
 * @returns Collaborative score result with breakdown
 */
export function calculateDestinationCollaborativeScore(
	stats: Record<string, DestinationInputStats>,
	investigationHistory?: InvestigationHistoryEntry[]
): DestinationCollaborativeResult {
	// Aggregate across all destinations
	let totalSpamBlocked = 0;
	let totalSpamSent = 0;
	let totalFalsePositives = 0;
	let totalLegitimateEmails = 0;

	const perDestination: DestinationStats[] = [];

	for (const [destName, destStats] of Object.entries(stats)) {
		totalSpamBlocked += destStats.spamBlocked;
		totalSpamSent += destStats.totalSpamSent;
		totalFalsePositives += destStats.falsePositives;
		totalLegitimateEmails += destStats.legitimateEmails;

		const blockingRate =
			destStats.totalSpamSent > 0 ? (destStats.spamBlocked / destStats.totalSpamSent) * 100 : 0;
		const falsePositiveRate =
			destStats.legitimateEmails > 0
				? (destStats.falsePositives / destStats.legitimateEmails) * 100
				: 0;

		perDestination.push({
			destinationName: destName,
			spamBlocked: destStats.spamBlocked,
			totalSpamSent: destStats.totalSpamSent,
			blockingRate: Math.round(blockingRate * 100) / 100,
			falsePositives: destStats.falsePositives,
			legitimateEmails: destStats.legitimateEmails,
			falsePositiveRate: Math.round(falsePositiveRate * 100) / 100
		});
	}

	// Industry Protection: (totalSpamBlocked / totalSpamSent) × 40
	const spamBlockingRate = totalSpamSent > 0 ? totalSpamBlocked / totalSpamSent : 0;
	const industryProtection =
		Math.round(spamBlockingRate * DESTINATION_WEIGHTS.INDUSTRY_PROTECTION * 100) / 100;

	// Coordination Bonus: Based on triggered investigations
	const coordinationBonus = calculateCoordinationBonus(investigationHistory);

	// User Satisfaction: (1 - falsePositiveRate) × 40
	const falsePositiveRate =
		totalLegitimateEmails > 0 ? totalFalsePositives / totalLegitimateEmails : 0;
	const userSatisfaction =
		Math.round((1 - falsePositiveRate) * DESTINATION_WEIGHTS.USER_SATISFACTION * 100) / 100;

	// Calculate raw score and clamp at 100
	const rawScore = industryProtection + coordinationBonus + userSatisfaction;
	const collaborativeScore = Math.min(100, Math.round(rawScore * 100) / 100);
	const success = collaborativeScore > DESTINATION_SUCCESS_THRESHOLD;

	return {
		collaborativeScore,
		success,
		scoreBreakdown: {
			industryProtection,
			coordinationBonus,
			userSatisfaction
		},
		perDestination
	};
}

// ============================================================================
// Resolution History Aggregation
// ============================================================================

interface AggregatedHistoryResult {
	espRevenues: Record<string, number>;
	espRoundHistory: Record<string, RoundMetrics[]>;
	destinationStats: Record<string, DestinationInputStats>;
}

/**
 * Aggregate data from resolution history across all rounds
 *
 * @param history - Array of resolution history entries
 * @returns Aggregated revenues, round history, and destination stats
 */
export function aggregateResolutionHistory(
	history: Array<{ round: number; results: any; timestamp: Date }>
): AggregatedHistoryResult {
	const espRevenues: Record<string, number> = {};
	const espRoundHistory: Record<string, RoundMetrics[]> = {};
	const destinationStats: Record<string, DestinationInputStats> = {
		Gmail: { spamBlocked: 0, totalSpamSent: 0, falsePositives: 0, legitimateEmails: 0 },
		Outlook: { spamBlocked: 0, totalSpamSent: 0, falsePositives: 0, legitimateEmails: 0 },
		Yahoo: { spamBlocked: 0, totalSpamSent: 0, falsePositives: 0, legitimateEmails: 0 }
	};

	for (const entry of history) {
		const { round, results } = entry;

		if (!results?.espResults) continue;

		for (const [espName, espResult] of Object.entries(results.espResults as Record<string, any>)) {
			// Aggregate revenue
			const revenue = espResult.revenue?.actualRevenue ?? 0;
			espRevenues[espName] = (espRevenues[espName] ?? 0) + revenue;

			// Build round history
			if (!espRoundHistory[espName]) {
				espRoundHistory[espName] = [];
			}

			const reputationByKingdom: Record<string, number> = {};
			if (espResult.reputation?.perDestination) {
				for (const [dest, destData] of Object.entries(
					espResult.reputation.perDestination as Record<string, any>
				)) {
					reputationByKingdom[dest] = destData.newReputation ?? 70;
				}
			}

			espRoundHistory[espName].push({
				round,
				revenue,
				reputationByKingdom
			});

			// Aggregate destination stats from satisfaction data (if available)
			if (espResult.satisfaction?.breakdown) {
				for (const breakdown of espResult.satisfaction.breakdown) {
					const destName = breakdown.destination;
					if (destinationStats[destName]) {
						// Accumulate volumes
						destinationStats[destName].totalSpamSent += breakdown.spam_through_volume ?? 0;
						destinationStats[destName].spamBlocked += breakdown.spam_blocked_volume ?? 0;
						destinationStats[destName].falsePositives += breakdown.false_positive_volume ?? 0;
						destinationStats[destName].legitimateEmails += breakdown.total_volume ?? 0;
					}
				}
			}
		}
	}

	return {
		espRevenues,
		espRoundHistory,
		destinationStats
	};
}

// ============================================================================
// Main Calculation Function
// ============================================================================

/**
 * Calculate final scores for all ESPs and destinations
 * Main entry point for US-5.1
 *
 * @param session - Complete game session with resolution history
 * @returns Complete final score output for display in victory screen
 */
export function calculateFinalScores(session: GameSession): FinalScoreOutput {
	const { esp_teams, resolution_history, roomCode } = session;

	// Aggregate data from resolution history
	const aggregated = aggregateResolutionHistory(resolution_history ?? []);

	// Calculate revenue scores (need all revenues first to find max)
	const revenueScores = calculateRevenueScores(aggregated.espRevenues);

	// Calculate each ESP's final result
	const espResults: ESPFinalResult[] = [];

	for (const team of esp_teams) {
		const { name, reputation, owned_tech_upgrades } = team;

		// Reputation score
		const repResult = calculateReputationScore(reputation);

		// Revenue score
		const totalRevenue = aggregated.espRevenues[name] ?? 0;
		const revenueScore = revenueScores[name] ?? 0;

		// Technical score
		const totalTechInvestments = calculateTotalTechInvestment(owned_tech_upgrades ?? []);
		const technicalScore = calculateTechnicalScore(totalTechInvestments);

		// Total score
		const totalScore = Math.round((repResult.score + revenueScore + technicalScore) * 100) / 100;

		// Qualification check
		const qualification = checkQualification(reputation);

		// Round history
		const roundHistory = aggregated.espRoundHistory[name] ?? [];

		espResults.push({
			espName: name,
			rank: 0, // Will be set after sorting
			totalScore,
			qualified: qualification.qualified,
			disqualificationReason: qualification.reason,
			failingKingdoms: qualification.failingKingdoms,
			scoreBreakdown: {
				reputationScore: repResult.score,
				revenueScore,
				technicalScore,
				weightedReputation: repResult.weightedReputation
			},
			reputationByKingdom: { ...reputation },
			totalRevenue,
			totalTechInvestments,
			roundHistory
		});
	}

	// Sort by total score (descending) and assign ranks
	espResults.sort((a, b) => b.totalScore - a.totalScore);
	espResults.forEach((esp, index) => {
		esp.rank = index + 1;
	});

	// Determine winner
	const winner = determineWinner(espResults);

	// Calculate destination collaborative score (with coordination bonus from investigations)
	const destinationResults = calculateDestinationCollaborativeScore(
		aggregated.destinationStats,
		session.investigation_history
	);

	// Check if all ESPs are disqualified
	const allDisqualified = espResults.every((esp) => !esp.qualified);

	return {
		espResults,
		winner,
		destinationResults,
		metadata: {
			calculationTimestamp: new Date().toISOString(),
			roomCode,
			allDisqualified
		}
	};
}
