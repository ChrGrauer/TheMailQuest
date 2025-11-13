/**
 * Resolution Manager
 * US 3.3: Resolution Phase Automation - Iterations 1-6
 *
 * Orchestrates resolution phase calculations
 * Iteration 1: Basic volume and revenue calculation
 * Iteration 2: Reputation-based delivery success rates
 * Iteration 3-5: Reputation changes and complaint calculations
 * Iteration 6: Per-destination delivery with filtering penalties
 */

import type { GameSession } from './types';
import type { ResolutionResults, PerDestinationDelivery, DeliveryResult } from './resolution-types';
import { calculateVolume } from './calculators/volume-calculator';
import { calculateDeliverySuccess } from './calculators/delivery-calculator';
import { calculateRevenue } from './calculators/revenue-calculator';
import { calculateReputationChanges } from './calculators/reputation-calculator';
import { calculateComplaints } from './calculators/complaint-calculator';

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
 * Calculate volume-weighted aggregate delivery rate
 * Iteration 6: Uses per-destination volumes and delivery rates
 */
function calculateAggregateDeliveryRate(
	perDestinationDelivery: Record<string, number>,
	perDestinationVolume: { Gmail: number; Outlook: number; Yahoo: number }
): number {
	const totalDeliveredVolume =
		perDestinationVolume.Gmail * perDestinationDelivery.Gmail +
		perDestinationVolume.Outlook * perDestinationDelivery.Outlook +
		perDestinationVolume.Yahoo * perDestinationDelivery.Yahoo;

	const totalVolume =
		perDestinationVolume.Gmail + perDestinationVolume.Outlook + perDestinationVolume.Yahoo;

	return totalVolume > 0 ? totalDeliveredVolume / totalVolume : 0;
}

/**
 * Execute resolution phase for all ESP teams
 * Iteration 6: Volume, per-destination delivery with filtering, aggregate delivery,
 * revenue, reputation changes, and complaints
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

	// Get destination names for reputation calculations
	const destinations = session.destinations.map((d) => d.name);

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

		// 2. Calculate per-destination delivery (Iteration 6)
		const perDestinationDelivery: PerDestinationDelivery = {
			Gmail: { finalRate: 0, baseRate: 0, authBonus: 0, zone: '', breakdown: [] },
			Outlook: { finalRate: 0, baseRate: 0, authBonus: 0, zone: '', breakdown: [] },
			Yahoo: { finalRate: 0, baseRate: 0, authBonus: 0, zone: '', breakdown: [] }
		};

		const perDestinationDeliveryRates: Record<string, number> = {};

		for (const destination of session.destinations) {
			const destName = destination.name as 'Gmail' | 'Outlook' | 'Yahoo';
			const destReputation = team.reputation[destination.name]; // Use capitalized key to match storage
			// Get filtering level from policy object, fallback to permissive
			const filteringPolicy = destination.filtering_policies[team.name];
			const filteringLevel = filteringPolicy?.level || 'permissive';

			const deliveryResult = calculateDeliverySuccess({
				reputation: destReputation,
				techStack: team.owned_tech_upgrades,
				currentRound: session.current_round,
				filteringLevel
			});

			perDestinationDelivery[destName] = deliveryResult;
			perDestinationDeliveryRates[destName] = deliveryResult.finalRate;

			logger.info('Delivery calculated for destination', {
				teamName: team.name,
				destination: destName,
				reputation: destReputation,
				filteringLevel,
				zone: deliveryResult.zone,
				deliveryRate: deliveryResult.finalRate
			});
		}

		// 3. Calculate aggregate delivery rate (volume-weighted)
		const aggregateDeliveryRate = calculateAggregateDeliveryRate(
			perDestinationDeliveryRates,
			volumeResult.perDestination
		);
		logger.info('Aggregate delivery rate calculated', {
			teamName: team.name,
			aggregateDeliveryRate
		});

		// 4. Calculate revenue (with aggregate delivery rate)
		const revenueResult = calculateRevenue({
			clients: activeClients,
			clientStates: team.client_states || {},
			deliveryRate: aggregateDeliveryRate
		});
		logger.info('Revenue calculated', {
			teamName: team.name,
			baseRevenue: revenueResult.baseRevenue,
			actualRevenue: revenueResult.actualRevenue
		});

		// 5. Calculate reputation changes (Iteration 3-5)
		const reputationResult = calculateReputationChanges({
			techStack: team.owned_tech_upgrades,
			destinations,
			clients: activeClients,
			clientStates: team.client_states || {},
			volumeData: volumeResult,
			currentRound: session.current_round
		});

		// Clamp reputation function (same as in application manager)
		const clampReputation = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

		// Include current and new reputation values in results
		for (const destination of destinations) {
			const currentRep = team.reputation[destination] || 70; // Use capitalized key to match storage
			const change = reputationResult.perDestination[destination];
			if (change) {
				change.currentReputation = currentRep;
				change.newReputation = clampReputation(currentRep + change.totalChange);
			}
		}

		logger.info('Reputation changes calculated', {
			teamName: team.name,
			perDestination: Object.keys(reputationResult.perDestination).length
		});

		// 6. Calculate complaints (Iteration 4-5)
		const complaintsResult = calculateComplaints({
			clients: activeClients,
			volumeData: volumeResult,
			clientStates: team.client_states || {},
			techStack: team.owned_tech_upgrades
		});
		logger.info('Complaints calculated', {
			teamName: team.name,
			baseComplaintRate: complaintsResult.baseComplaintRate,
			adjustedComplaintRate: complaintsResult.adjustedComplaintRate
		});

		// Store results for this team (Iteration 6: per-destination delivery)
		results.espResults[team.name] = {
			volume: volumeResult,
			delivery: perDestinationDelivery,
			aggregateDeliveryRate,
			revenue: revenueResult,
			reputation: reputationResult,
			complaints: complaintsResult
		};
	}

	logger.info('Resolution phase completed');
	return results;
}
