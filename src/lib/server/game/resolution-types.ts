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
 * Resolution Manager Types
 */
export interface ESPResolutionResult {
	volume: VolumeResult;
	revenue: RevenueResult;
	// Future iterations will add:
	// reputation?: ReputationResult;
	// delivery?: DeliveryResult;
	// complaints?: ComplaintResult;
}

export interface ResolutionResults {
	espResults: Record<string, ESPResolutionResult>;
	destinationResults?: Record<string, any>; // Future iterations
}
