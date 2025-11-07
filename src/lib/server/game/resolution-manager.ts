/**
 * Resolution Manager
 * US 3.3: Resolution Phase Automation - Iteration 1
 *
 * Orchestrates resolution phase calculations
 * Iteration 1: Basic volume and revenue calculation
 * Future iterations will add: reputation, delivery modifiers, complaints, incidents
 */

import type { GameSession } from './types';
import type { ResolutionResults } from './resolution-types';
import { calculateVolume } from './calculators/volume-calculator';
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
 * Execute resolution phase for all ESP teams
 * Iteration 1: Volume and revenue calculation only
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

		// 2. Calculate revenue
		// Iteration 1: deliveryRate = 1.0 (no modifiers yet)
		const revenueResult = calculateRevenue({
			clients: activeClients,
			clientStates: team.client_states || {},
			deliveryRate: 1.0
		});
		logger.info('Revenue calculated', {
			teamName: team.name,
			baseRevenue: revenueResult.baseRevenue,
			actualRevenue: revenueResult.actualRevenue
		});

		// Store results for this team
		results.espResults[team.name] = {
			volume: volumeResult,
			revenue: revenueResult
		};
	}

	logger.info('Resolution phase completed');
	return results;
}
