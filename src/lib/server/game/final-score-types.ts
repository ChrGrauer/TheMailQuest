/**
 * Final Score Calculation Type Definitions
 * US-5.1: Final Score Calculation
 * US-5.2: Victory Screen
 *
 * Defines all types for the final scoring system including:
 * - ESP score breakdowns
 * - Winner determination
 * - Destination collaborative scoring
 * - Per-round metrics history
 */

/**
 * US-5.1: ESP Score Breakdown
 * Individual components that make up an ESP's total score
 */
export interface ESPScoreBreakdown {
	reputationScore: number; // max 50 points (50% weight)
	revenueScore: number; // max 35 points (35% weight)
	technicalScore: number; // max 15 points (15% weight)
	weightedReputation: number; // 0-100 weighted average across kingdoms
}

/**
 * US-5.1: Per-Round Metrics
 * Historical data for each round, used for charts and analysis
 */
export interface RoundMetrics {
	round: number;
	revenue: number;
	reputationByKingdom: Record<string, number>;
}

/**
 * US-5.1: Qualification Result
 * Result of checking if an ESP meets minimum reputation requirements
 */
export interface QualificationResult {
	qualified: boolean;
	failingKingdoms: string[];
	reason: string | null;
}

/**
 * US-5.1: ESP Final Result
 * Complete scoring result for a single ESP team
 */
export interface ESPFinalResult {
	espName: string;
	rank: number;
	totalScore: number;
	qualified: boolean;
	disqualificationReason: string | null;
	failingKingdoms: string[];
	scoreBreakdown: ESPScoreBreakdown;
	reputationByKingdom: Record<string, number>;
	totalRevenue: number;
	totalTechInvestments: number;
	roundHistory: RoundMetrics[];
}

/**
 * US-5.1: Winner Information
 * Information about the winning ESP(s)
 * null if all ESPs are disqualified
 */
export interface WinnerInfo {
	espNames: string[]; // Array for joint winners
	totalScore: number;
	tieBreaker: boolean; // true if weighted reputation was used to break tie
}

/**
 * US-5.1: Destination Stats
 * Per-destination metrics for collaborative scoring
 */
export interface DestinationStats {
	destinationName: string;
	spamBlocked: number;
	totalSpamSent: number;
	blockingRate: number; // Percentage (0-100)
	falsePositives: number;
	legitimateEmails: number;
	falsePositiveRate: number; // Percentage (0-100)
}

/**
 * US-5.1: Destination Collaborative Score Breakdown
 * Components of the destination collaborative score
 */
export interface DestinationScoreBreakdown {
	industryProtection: number; // max 40 points
	coordinationBonus: number; // 0 for now (feature postponed)
	userSatisfaction: number; // max 20 points
}

/**
 * US-5.1: Destination Collaborative Result
 * Complete collaborative scoring result for all destinations
 */
export interface DestinationCollaborativeResult {
	collaborativeScore: number;
	success: boolean; // true if score > threshold (80)
	scoreBreakdown: DestinationScoreBreakdown;
	perDestination: DestinationStats[];
}

/**
 * US-5.1: Final Score Output Metadata
 * Additional context about the calculation
 */
export interface FinalScoreMetadata {
	calculationTimestamp: string; // ISO format
	roomCode: string;
	allDisqualified: boolean;
}

/**
 * US-5.1: Complete Final Score Output
 * Main output type for the final score calculation
 * This is the data contract between US-5.1 (calculation) and US-5.2 (display)
 */
export interface FinalScoreOutput {
	espResults: ESPFinalResult[];
	winner: WinnerInfo | null; // null if all disqualified
	destinationResults: DestinationCollaborativeResult;
	metadata: FinalScoreMetadata;
}

/**
 * US-5.1: Aggregated Destination Stats
 * Intermediate type for aggregating stats from resolution history
 */
export interface AggregatedDestinationStats {
	totalSpamBlocked: number;
	totalSpamSent: number;
	totalFalsePositives: number;
	totalLegitimateEmails: number;
	coordinatedActions: number; // Always 0 for now (feature postponed)
}

/**
 * US-5.1: Reputation Score Result
 * Result of calculating reputation score component
 */
export interface ReputationScoreResult {
	weightedReputation: number;
	score: number;
}
