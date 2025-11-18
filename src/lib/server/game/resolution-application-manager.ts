/**
 * Resolution Application Manager
 * Applies resolution calculation results to game state
 *
 * Responsibilities:
 * - Update ESP team credits with earned revenue
 * - Update ESP team reputation per destination
 * - Validate all updates (reputation bounds, non-negative credits)
 * - Log all state changes
 */

import type { GameSession } from './types';
import type { ResolutionResults } from './resolution-types';
import { gameLogger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ResolutionApplicationResult {
	success: boolean;
	error?: string;
	updatedTeams?: string[];
}

export interface TeamStateChanges {
	teamName: string;
	creditsChange: number;
	oldCredits: number;
	newCredits: number;
	reputationChanges: Record<string, { old: number; new: number; change: number }>;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Clamp reputation value between 0 and 100
 */
function clampReputation(value: number): number {
	return Math.max(0, Math.min(100, Math.round(value)));
}

// ============================================================================
// APPLICATION
// ============================================================================

/**
 * Apply resolution results to game state
 * Updates ESP team credits and reputation based on resolution calculations
 *
 * @param session The game session to update
 * @param results The resolution calculation results
 * @returns Result indicating success or error
 */
export function applyResolutionToGameState(
	session: GameSession,
	results: ResolutionResults
): ResolutionApplicationResult {
	const updatedTeams: string[] = [];
	const stateChanges: TeamStateChanges[] = [];

	try {
		// Process each ESP team
		for (const team of session.esp_teams) {
			const teamResults = results.espResults[team.name];

			if (!teamResults) {
				gameLogger.info('No resolution results found for team', { teamName: team.name });
				continue;
			}

			// Track changes for logging
			const changes: TeamStateChanges = {
				teamName: team.name,
				creditsChange: teamResults.revenue.actualRevenue,
				oldCredits: team.credits,
				newCredits: team.credits + teamResults.revenue.actualRevenue,
				reputationChanges: {}
			};

			// 1. Apply revenue to credits
			team.credits += teamResults.revenue.actualRevenue;

			// 2. Apply reputation changes per destination
			for (const [destination, reputationChange] of Object.entries(
				teamResults.reputation.perDestination
			)) {
				const oldReputation = team.reputation[destination] || 70; // Default to 70 if missing
				const newReputation = clampReputation(oldReputation + reputationChange.totalChange);

				changes.reputationChanges[destination] = {
					old: oldReputation,
					new: newReputation,
					change: reputationChange.totalChange
				};

				team.reputation[destination] = newReputation;
			}

			stateChanges.push(changes);
			updatedTeams.push(team.name);
		}

		// 3. Apply destination revenue (update destination budgets)
		const updatedDestinations: string[] = [];
		for (const destination of session.destinations) {
			const destResults = results.destinationResults?.[destination.name];

			if (destResults && destResults.revenue) {
				const oldBudget = destination.budget;
				const revenueEarned = destResults.revenue.totalRevenue;
				destination.budget += revenueEarned;

				gameLogger.event('destination_revenue_applied', {
					destinationName: destination.name,
					oldBudget,
					revenueEarned,
					newBudget: destination.budget
				});

				updatedDestinations.push(destination.name);
			}
		}

		// Log all state changes
		for (const change of stateChanges) {
			gameLogger.event('resolution_applied', {
				teamName: change.teamName,
				creditsChange: change.creditsChange,
				oldCredits: change.oldCredits,
				newCredits: change.newCredits,
				reputationChanges: change.reputationChanges
			});
		}

		gameLogger.info('Resolution results applied to game state', {
			teamsUpdated: updatedTeams.length,
			teams: updatedTeams,
			destinationsUpdated: updatedDestinations.length,
			destinations: updatedDestinations
		});

		return {
			success: true,
			updatedTeams
		};
	} catch (error) {
		gameLogger.error(error as Error, {
			context: 'applyResolutionToGameState',
			message: 'Failed to apply resolution results'
		});

		return {
			success: false,
			error: 'Failed to apply resolution results to game state'
		};
	}
}
