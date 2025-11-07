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
}

export interface VolumeResult {
	activeClients: Client[];
	clientVolumes: ClientVolumeData[];
	totalVolume: number;
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
 * Delivery Calculator Types
 * US 3.3: Iteration 2
 */
export interface DeliveryParams {
	reputation: number; // weighted average across destinations
	techStack: string[]; // for future iterations (auth bonuses)
	currentRound: number; // for future iterations (DMARC penalty)
}

export interface DeliveryResult {
	baseRate: number; // from reputation zone
	finalRate: number; // after all modifiers (same as baseRate in Iteration 2)
	zone: string; // reputation zone name (excellent/good/warning/poor/blacklist)
}

/**
 * Resolution Manager Types
 */
export interface ESPResolutionResult {
	volume: VolumeResult;
	delivery: DeliveryResult; // Iteration 2: added
	revenue: RevenueResult;
	// Future iterations will add:
	// reputation?: ReputationResult;
	// complaints?: ComplaintResult;
}

export interface ResolutionResults {
	espResults: Record<string, ESPResolutionResult>;
	destinationResults?: Record<string, any>; // Future iterations
}
