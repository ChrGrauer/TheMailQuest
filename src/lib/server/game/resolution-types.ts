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
	// Iteration 7 will add: spamTrapRisk
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
 * Resolution Manager Types
 */
export interface ESPResolutionResult {
	volume: VolumeResult;
	reputation: ReputationResult; // Iteration 3: added
	delivery: DeliveryResult;
	revenue: RevenueResult;
	complaints: ComplaintResult; // Iteration 4: added
}

export interface ResolutionResults {
	espResults: Record<string, ESPResolutionResult>;
	destinationResults?: Record<string, any>; // Future iterations
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
