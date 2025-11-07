/**
 * Resolution Manager
 * US 3.3: Resolution Phase Automation - Iterations 1-2
 *
 * Orchestrates resolution phase calculations
 * Iteration 1: Basic volume and revenue calculation
 * Iteration 2: Reputation-based delivery success rates
 * Future iterations will add: auth bonuses, complaints, incidents
 */

import type { GameSession } from './types';
import type { ResolutionResults } from './resolution-types';
import { calculateVolume } from './calculators/volume-calculator';
import { calculateDeliverySuccess } from './calculators/delivery-calculator';
import { calculateRevenue } from './calculators/revenue-calculator';

/**
 * Lazy logger import to avoid $app/environment issues during Vite config
 */
let gameLogger: any = null;
async function getLogger() {
	if (!gameLogger) {
		const module = await import('../logger');
		gameLogger = module.gameLogger;
	}
	return gameLogger;
}

/**
 * Calculate weighted average reputation across destinations
 * Uses market share as weights: Gmail 50%, Outlook 30%, Yahoo 20%
 * US 3.3: Iteration 2
 */
function calculateWeightedReputation(reputation: Record<string, number>): number {
	const weights: Record<string, number> = {
		gmail: 0.5,
		outlook: 0.3,
		yahoo: 0.2
	};

	let weightedSum = 0;
	let totalWeight = 0;

	for (const [dest, rep] of Object.entries(reputation)) {
		const weight = weights[dest.toLowerCase()] || 0;
		weightedSum += rep * weight;
		totalWeight += weight;
	}

	return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 70;
}

/**
 * Execute resolution phase for all ESP teams
 * Iteration 2: Volume, delivery (reputation-based), and revenue calculation
 */
export async function executeResolution(
	session: GameSession,
	roomCode: string
): Promise<ResolutionResults> {
	const logger = await getLogger();
	logger.info('Starting resolution phase', { roomCode, round: session.current_round });

	const results: ResolutionResults = {
		espResults: {}
	};

	// Process each ESP team
	for (const team of session.esp_teams) {
		logger.info('Calculating ESP resolution', { teamName: team.name });

		// Get active clients for this team
		const activeClients = team.available_clients.filter((c) => team.active_clients.includes(c.id));

		// 1. Calculate volume
		const volumeResult = calculateVolume({
			clients: activeClients,
			clientStates: team.client_states || {},
			currentRound: session.current_round
		});
		logger.info('Volume calculated', {
			teamName: team.name,
			totalVolume: volumeResult.totalVolume
		});

		// 2. Calculate weighted reputation
		const avgReputation = calculateWeightedReputation(team.reputation);

		// 3. Calculate delivery success (Iteration 2)
		const deliveryResult = calculateDeliverySuccess({
			reputation: avgReputation,
			techStack: team.owned_tech_upgrades,
			currentRound: session.current_round
		});
		logger.info('Delivery calculated', {
			teamName: team.name,
			reputation: avgReputation,
			zone: deliveryResult.zone,
			deliveryRate: deliveryResult.finalRate
		});

		// 4. Calculate revenue (with delivery rate)
		const revenueResult = calculateRevenue({
			clients: activeClients,
			clientStates: team.client_states || {},
			deliveryRate: deliveryResult.finalRate
		});
		logger.info('Revenue calculated', {
			teamName: team.name,
			baseRevenue: revenueResult.baseRevenue,
			actualRevenue: revenueResult.actualRevenue
		});

		// Store results for this team
		results.espResults[team.name] = {
			volume: volumeResult,
			delivery: deliveryResult,
			revenue: revenueResult
		};
	}

	logger.info('Resolution phase completed');
	return results;
}
