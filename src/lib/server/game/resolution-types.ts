/**
 * Type definitions for Resolution Phase calculators
 * US 3.3: Resolution Phase Automation
 */

import type { Client, ClientState } from './types';

/**
 * Volume Calculator Types
 */
export interface VolumeParams {
	clients: Client[];
	clientStates: Record<string, ClientState>;
	currentRound: number;
}

export interface VolumeAdjustments {
	listHygiene?: number;
	warmup?: number;
}

export interface ClientVolumeData {
	clientId: string;
	baseVolume: number;
	adjustedVolume: number;
	adjustments: VolumeAdjustments;
	perDestination: {
		// Iteration 6: per-destination volume split
		Gmail: number;
		Outlook: number;
		Yahoo: number;
	};
}

export interface VolumeResult {
	activeClients: Client[];
	clientVolumes: ClientVolumeData[];
	totalVolume: number;
	perDestination: {
		// Iteration 6: aggregated per-destination volumes
		Gmail: number;
		Outlook: number;
		Yahoo: number;
	};
}

/**
 * Revenue Calculator Types
 */
export interface RevenueParams {
	clients: Client[];
	clientStates: Record<string, ClientState>;
	deliveryRate: number;
	currentRound?: number; // Phase 2.1.1: Needed to determine warmup applicability
	// Phase 2.1.1: Warmup factor applied to all clients (0.5 if warmup in first round, 1.0 otherwise)
	warmupFactor?: number;
	// Phase 2.1.1: Per-client warmup factors (overrides warmupFactor if provided)
	perClientWarmupFactors?: Record<string, number>;
}

export interface ClientRevenueData {
	clientId: string;
	baseRevenue: number;
	actualRevenue: number;
}

export interface RevenueResult {
	baseRevenue: number;
	actualRevenue: number;
	perClient: ClientRevenueData[];
}

/**
 * Reputation Calculator Types
 * US 3.3: Iteration 3, 4, 5
 */
export interface ReputationParams {
	techStack: string[];
	destinations: string[];
	clients: Client[]; // Iteration 4: for client risk impact
	clientStates: Record<string, ClientState>; // Iteration 4: for active client filtering
	volumeData: VolumeResult; // Iteration 4: for volume-weighted calculations
	currentRound: number; // Iteration 5: for warmup bonus logic
}

export interface ReputationBreakdownItem {
	source: string;
	value: number;
}

export interface DestinationReputationChange {
	techBonus: number;
	clientImpact: number; // Iteration 4
	warmupBonus: number; // Iteration 5
	totalChange: number;
	breakdown: ReputationBreakdownItem[];
	currentReputation?: number; // Current reputation before change
	newReputation?: number; // New reputation after change (clamped)
}

export interface ReputationResult {
	perDestination: Record<string, DestinationReputationChange>;
	volumeWeightedClientImpact: number; // Iteration 4
}

/**
 * Complaint Calculator Types
 * US 3.3: Iteration 4, 5
 */
export interface ComplaintParams {
	clients: Client[];
	volumeData: VolumeResult;
	clientStates: Record<string, ClientState>; // Iteration 5: for list hygiene check
	techStack: string[]; // Iteration 5: for content filtering check
}

export interface ClientComplaintData {
	clientId: string;
	baseRate: number;
	adjustedRate: number; // Iteration 5: after list hygiene
	volume: number;
}

export interface ComplaintResult {
	baseComplaintRate: number; // volume-weighted before reductions
	adjustedComplaintRate: number; // Iteration 5: after list hygiene + content filtering
	perClient: ClientComplaintData[];
	thresholdPenalty?: ComplaintThresholdPenalty; // Iteration 7: threshold penalty if exceeded
}

/**
 * Spam Trap Calculator Types
 * US 3.3: Iteration 7
 */
export interface SpamTrapParams {
	clients: Client[];
	clientStates: Record<string, ClientState>;
	volumeData: VolumeResult;
	roomCode: string;
	round: number;
	espName: string;
	spamTrapNetworkActive: Record<string, boolean>; // Per destination: is spam trap network active?
}

export interface ClientSpamTrapData {
	clientId: string;
	clientType: string;
	baseRisk: number; // Base spam trap risk from profile
	adjustedRisk: number; // After List Hygiene reduction
	networkMultipliedRisk: Record<string, number>; // Per destination, after network multiplier
	volume: number;
	trapHit: boolean; // Did this client hit a trap?
	randomRoll: number; // Random value rolled (for transparency)
	hitDestinations: string[]; // Which destinations had traps hit (if any)
}

export interface SpamTrapResult {
	totalBaseRisk: number; // Sum of base risks across all clients
	totalAdjustedRisk: number; // After List Hygiene reductions
	perClient: ClientSpamTrapData[];
	trapHit: boolean; // Did any trap get hit at any destination?
	hitClientIds: string[]; // Which clients hit traps
	hitDestinations: string[]; // Which destinations had traps hit
	reputationPenalty: number; // -5 if trap hit (capped), 0 otherwise
	cappedAtMax: boolean; // Whether penalty was capped at -5
}

/**
 * Complaint Threshold Penalty
 * US 3.3: Iteration 7
 */
export interface ComplaintThresholdPenalty {
	threshold: number; // Threshold that was exceeded
	penalty: number; // Reputation penalty applied
	label: string; // Warning message
	complaintRate: number; // Actual complaint rate
}

/**
 * Delivery Calculator Types
 * US 3.3: Iteration 2, 3, 6
 */
export interface DeliveryParams {
	reputation: number; // weighted average across destinations (or per-destination in Iter 6)
	techStack: string[];
	currentRound: number;
	filteringLevel?: 'permissive' | 'moderate' | 'strict' | 'maximum'; // Iteration 6
}

export interface DeliveryBreakdownItem {
	factor: string;
	value: number;
}

export interface DeliveryResult {
	baseRate: number; // from reputation zone
	authBonus: number; // Iteration 3: authentication delivery bonus
	filteringPenalty?: number; // Iteration 6: filtering false positives (as decimal)
	dmarcPenalty?: number; // Iteration 3: DMARC missing penalty (Round 3+)
	finalRate: number; // after all modifiers
	zone: string; // reputation zone name (excellent/good/warning/poor/blacklist)
	breakdown: DeliveryBreakdownItem[]; // Iteration 3: calculation breakdown
}

/**
 * User Satisfaction Calculator Types
 * US 3.3: Iteration 6.1
 */
export interface SatisfactionParams {
	espName: string; // ESP team name
	clients: Client[];
	clientStates: Record<string, ClientState>;
	volumeData: VolumeResult;
	filteringPolicies: Record<string, 'permissive' | 'moderate' | 'strict' | 'maximum'>; // per destination
	ownedTools: Record<string, string[]>; // per destination: owned tool IDs
	complaintRate: number; // adjusted complaint rate from complaint calculator
}

export interface SatisfactionBreakdownItem {
	destination: string;
	spam_rate: number;
	spam_blocked_percentage: number;
	spam_through_percentage: number;
	false_positive_percentage: number;
	satisfaction_gain: number;
	spam_penalty: number;
	false_positive_penalty: number;
	satisfaction: number;
}

export interface SatisfactionResult {
	aggregatedSatisfaction: number; // Destination-wide satisfaction (0-100)
	perDestination: Record<string, number>; // Per-destination satisfaction scores
	breakdown: SatisfactionBreakdownItem[]; // Detailed calculations per destination
}

/**
 * Destination Revenue Calculator Types
 * US 3.3: Iteration 6.1
 */
export interface DestinationRevenueParams {
	kingdom: string; // Gmail, Outlook, or Yahoo
	totalVolume: number; // Total emails processed by this destination
	userSatisfaction: number; // Aggregated user satisfaction (0-100)
}

export interface DestinationRevenueResult {
	baseRevenue: number; // Base revenue by kingdom
	volumeBonus: number; // Bonus from email volume processed
	satisfactionMultiplier: number; // Multiplier based on satisfaction tier
	satisfactionTier: string; // Tier label (e.g., "Excellent", "Warning")
	totalRevenue: number; // Final revenue: (base + bonus) * multiplier
}

/**
 * Resolution Manager Types
 * Iteration 6: Per-destination delivery calculations
 */

/**
 * Per-destination delivery results for an ESP team
 * Iteration 6: Each destination has its own delivery calculation
 */
export interface PerDestinationDelivery {
	Gmail: DeliveryResult;
	Outlook: DeliveryResult;
	Yahoo: DeliveryResult;
}

export interface ESPResolutionResult {
	volume: VolumeResult;
	reputation: ReputationResult; // Iteration 3: added
	delivery: PerDestinationDelivery; // Iteration 6: BREAKING CHANGE - was DeliveryResult
	aggregateDeliveryRate: number; // Iteration 6: volume-weighted average for revenue
	revenue: RevenueResult;
	complaints: ComplaintResult; // Iteration 4: added
	satisfaction?: SatisfactionResult; // Iteration 6.1: user satisfaction
	spamTraps?: SpamTrapResult; // Iteration 7: spam trap detection
}

/**
 * Destination resolution result
 * Iteration 6.1: Destination revenue and aggregated satisfaction
 */
export interface DestinationResolutionResult {
	destinationName: string;
	kingdom: string;
	aggregatedSatisfaction: number; // Aggregated across all ESPs
	totalVolume: number; // Total volume processed by this destination
	revenue: DestinationRevenueResult;
}

export interface ResolutionResults {
	espResults: Record<string, ESPResolutionResult>;
	destinationResults?: Record<string, DestinationResolutionResult>; // Iteration 6.1
}

/**
 * Resolution History Entry
 * US-3.5: Stores resolution results for a specific round
 */
export interface RoundResolution {
	round: number;
	results: ResolutionResults;
	timestamp: Date;
}
