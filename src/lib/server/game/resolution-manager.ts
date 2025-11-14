/**
 * Resolution Manager
 * US 3.3: Resolution Phase Automation - Iterations 1-7
 *
 * Orchestrates resolution phase calculations
 * Iteration 1: Basic volume and revenue calculation
 * Iteration 2: Reputation-based delivery success rates
 * Iteration 3-5: Reputation changes and complaint calculations
 * Iteration 6: Per-destination delivery with filtering penalties
 * Iteration 7: Spam trap detection and complaint threshold penalties
 */

import type { GameSession } from './types';
import type {
	ResolutionResults,
	PerDestinationDelivery,
	DeliveryResult,
	SatisfactionResult
} from './resolution-types';
import { calculateVolume } from './calculators/volume-calculator';
import { calculateDeliverySuccess } from './calculators/delivery-calculator';
import { calculateRevenue } from './calculators/revenue-calculator';
import { calculateReputationChanges } from './calculators/reputation-calculator';
import { calculateComplaints } from './calculators/complaint-calculator';
import { calculateSatisfaction } from './calculators/satisfaction-calculator';
import { calculateDestinationRevenue } from './calculators/destination-revenue-calculator';
import { calculateSpamTraps } from './calculators/spam-trap-calculator';

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

		// 6. Calculate complaints (Iteration 4-5, 7)
		const complaintsResult = calculateComplaints({
			clients: activeClients,
			volumeData: volumeResult,
			clientStates: team.client_states || {},
			techStack: team.owned_tech_upgrades
		});
		logger.info('Complaints calculated', {
			teamName: team.name,
			baseComplaintRate: complaintsResult.baseComplaintRate,
			adjustedComplaintRate: complaintsResult.adjustedComplaintRate,
			thresholdPenalty: complaintsResult.thresholdPenalty
		});

		// 7. Calculate spam traps (Iteration 7)
		// Build spam trap network active status per destination
		// Phase 1.2: Spam trap activation timing logic
		// - Secret traps (announced=false): Active immediately in same round as purchase
		// - Announced traps (announced=true): Active starting next round after purchase
		const spamTrapNetworkActive: Record<string, boolean> = {};
		for (const destination of session.destinations) {
			const trapInfo = destination.spam_trap_active;
			if (!trapInfo) {
				// No trap purchased
				spamTrapNetworkActive[destination.name] = false;
			} else if (trapInfo.announced) {
				// Announced trap: Active only if current round > purchase round
				spamTrapNetworkActive[destination.name] = session.current_round > trapInfo.round;
			} else {
				// Secret trap: Active immediately (current round >= purchase round)
				spamTrapNetworkActive[destination.name] = session.current_round >= trapInfo.round;
			}
		}

		const spamTrapsResult = calculateSpamTraps({
			clients: activeClients,
			volumeData: volumeResult,
			clientStates: team.client_states || {},
			roomCode,
			round: session.current_round,
			espName: team.name,
			spamTrapNetworkActive
		});
		logger.info('Spam traps calculated', {
			teamName: team.name,
			totalBaseRisk: spamTrapsResult.totalBaseRisk,
			totalAdjustedRisk: spamTrapsResult.totalAdjustedRisk,
			trapHit: spamTrapsResult.trapHit,
			reputationPenalty: spamTrapsResult.reputationPenalty
		});

		// Apply spam trap penalty to all destinations (if trap hit)
		if (spamTrapsResult.trapHit) {
			for (const destination of destinations) {
				const destChange = reputationResult.perDestination[destination];
				if (destChange) {
					destChange.totalChange += spamTrapsResult.reputationPenalty; // Add penalty (negative)
					const currentRep = team.reputation[destination] || 70;
					destChange.newReputation = Math.max(
						0,
						Math.min(100, Math.round(currentRep + destChange.totalChange))
					);
				}
			}
			logger.info('Spam trap hit!', {
				teamName: team.name,
				hitClientIds: spamTrapsResult.hitClientIds,
				hitDestinations: spamTrapsResult.hitDestinations,
				penalty: spamTrapsResult.reputationPenalty,
				cappedAtMax: spamTrapsResult.cappedAtMax
			});
		}

		// Apply complaint threshold penalty (if exceeded)
		if (complaintsResult.thresholdPenalty) {
			for (const destination of destinations) {
				const destChange = reputationResult.perDestination[destination];
				if (destChange) {
					destChange.totalChange += complaintsResult.thresholdPenalty.penalty; // Add penalty (negative)
					const currentRep = team.reputation[destination] || 70;
					destChange.newReputation = Math.max(
						0,
						Math.min(100, Math.round(currentRep + destChange.totalChange))
					);
				}
			}
			logger.info('Complaint threshold exceeded', {
				teamName: team.name,
				complaintRate: complaintsResult.thresholdPenalty.complaintRate,
				threshold: complaintsResult.thresholdPenalty.threshold,
				penalty: complaintsResult.thresholdPenalty.penalty,
				label: complaintsResult.thresholdPenalty.label
			});
		}

		// 8. Calculate user satisfaction (Iteration 6.1)
		// Build filtering policies and owned tools per destination
		const filteringPolicies: Record<string, 'permissive' | 'moderate' | 'strict' | 'maximum'> = {};
		const ownedTools: Record<string, string[]> = {};

		for (const destination of session.destinations) {
			const destName = destination.name as 'Gmail' | 'Outlook' | 'Yahoo';
			const policy = destination.filtering_policies[team.name];
			filteringPolicies[destName] = policy?.level || 'permissive';
			ownedTools[destName] = destination.owned_tools || [];
		}

		const satisfactionResult = calculateSatisfaction({
			espName: team.name,
			clients: activeClients,
			clientStates: team.client_states || {},
			volumeData: volumeResult,
			filteringPolicies,
			ownedTools,
			complaintRate: complaintsResult.adjustedComplaintRate / 100 // Convert percentage to decimal
		});
		logger.info('User satisfaction calculated', {
			teamName: team.name,
			aggregatedSatisfaction: satisfactionResult.aggregatedSatisfaction
		});

		// Store results for this team (Iteration 6: per-destination delivery, Iteration 6.1: satisfaction, Iteration 7: spam traps)
		results.espResults[team.name] = {
			volume: volumeResult,
			delivery: perDestinationDelivery,
			aggregateDeliveryRate,
			revenue: revenueResult,
			reputation: reputationResult,
			complaints: complaintsResult,
			satisfaction: satisfactionResult, // Iteration 6.1
			spamTraps: spamTrapsResult // Iteration 7
		};
	}

	// 9. Calculate destination revenue (Iteration 6.1)
	// After all ESPs processed, aggregate satisfaction and calculate revenue per destination
	results.destinationResults = {};

	for (const destination of session.destinations) {
		const destName = destination.name as 'Gmail' | 'Outlook' | 'Yahoo';

		// Aggregate satisfaction across all ESPs (volume-weighted)
		let totalVolume = 0;
		let weightedSatisfaction = 0;

		for (const team of session.esp_teams) {
			const espResult = results.espResults[team.name];
			// Include ESP if it has satisfaction data (allow 0 as valid value)
			if (espResult?.satisfaction?.perDestination) {
				const destVolume = espResult.volume.perDestination[destName] || 0;
				// Use nullish coalescing to preserve 0 values (0 is valid, only null/undefined use fallback)
				const destSatisfaction = espResult.satisfaction.perDestination[destName] ?? 75;
				totalVolume += destVolume;
				weightedSatisfaction += destSatisfaction * destVolume;
			}
		}

		const aggregatedSatisfaction =
			totalVolume > 0 ? Math.round(weightedSatisfaction / totalVolume) : 75;

		// Calculate destination revenue
		const revenueResult = calculateDestinationRevenue({
			kingdom: destination.kingdom || destName,
			totalVolume,
			userSatisfaction: aggregatedSatisfaction
		});

		logger.info('Destination revenue calculated', {
			destination: destName,
			totalVolume,
			aggregatedSatisfaction,
			revenue: revenueResult.totalRevenue
		});

		results.destinationResults[destName] = {
			destinationName: destName,
			kingdom: destination.kingdom || destName,
			aggregatedSatisfaction,
			totalVolume,
			revenue: revenueResult
		};
	}

	logger.info('Resolution phase completed');
	return results;
}
