/**
 * Resolution Phase Handler
 * US-3.5: Iteration 1 - Consequences Phase Display
 *
 * Handles resolution phase execution and transition to consequences.
 * This handler is triggered when the game transitions to the Resolution phase,
 * regardless of how the transition was triggered (timer expiry, all players locked in,
 * facilitator button, etc.)
 *
 * Responsibilities:
 * 1. Execute resolution calculations in background
 * 2. Store results in game session
 * 3. Apply results to game state (update credits, reputation)
 * 4. Auto-transition to consequences phase
 * 5. Broadcast phase transition with resolution results
 */

import { executeResolution } from './resolution-manager';
import { applyResolutionToGameState } from './resolution-application-manager';
import { transitionPhase } from './phase-manager';
import {
	checkInvestigationTrigger,
	runInvestigation,
	clearInvestigationVotes,
	INVESTIGATION_COST
} from './investigation-manager';
import type { GameSession, InvestigationHistoryEntry } from './types';
import { gameLogger } from '../logger';

/**
 * Broadcast function type for WebSocket messages
 * Message fields are at root level per type definitions (no nested 'data' wrapper)
 */
export type BroadcastFunction = (
	roomCode: string,
	message: {
		type: string;
		[key: string]: any;
	}
) => void;

/**
 * Handle resolution phase execution
 *
 * Called immediately after transitioning to Resolution phase.
 * Executes resolution calculations in background, then auto-transitions
 * to Consequences phase with results.
 *
 * @param session The game session
 * @param roomCode The room code
 * @param broadcast WebSocket broadcast function
 */
export function handleResolutionPhase(
	session: GameSession,
	roomCode: string,
	broadcast: BroadcastFunction
): void {
	// Execute resolution calculation in background (async IIFE)
	// This allows the phase transition to complete immediately
	// while resolution runs asynchronously
	(async () => {
		try {
			gameLogger.info('Executing resolution calculation', {
				roomCode,
				round: session.current_round
			});

			const resolutionResults = await executeResolution(session, roomCode);

			// Store results in session history for consequences display
			if (!session.resolution_history) {
				session.resolution_history = [];
			}

			session.resolution_history.push({
				round: session.current_round,
				results: resolutionResults,
				timestamp: new Date()
			});

			gameLogger.info('Resolution calculation completed and stored in history', {
				roomCode,
				round: session.current_round,
				espTeamsProcessed: Object.keys(resolutionResults.espResults).length,
				historyLength: session.resolution_history.length
			});

			// US-2.7: Check and execute investigation if triggered
			// MUST happen before dashboard updates so budget charges are reflected in broadcasts
			const investigationResult = await handleInvestigation(session, roomCode, broadcast);

			// Apply resolution results to game state (update credits, reputation)
			const applicationResult = applyResolutionToGameState(session, resolutionResults);

			if (!applicationResult.success) {
				gameLogger.error(new Error('Failed to apply resolution results'), {
					context: 'handleResolutionPhase',
					roomCode,
					error: applicationResult.error
				});
				// Continue anyway to show consequences, even if application failed
			} else {
				gameLogger.info('Resolution results applied to game state', {
					roomCode,
					teamsUpdated: applicationResult.updatedTeams?.length,
					teams: applicationResult.updatedTeams
				});

				// Broadcast updated credits and reputation to each ESP team dashboard
				// This ensures dashboards update in real-time without requiring a page refresh
				for (const team of session.esp_teams) {
					broadcast(roomCode, {
						type: 'esp_dashboard_update',
						teamName: team.name,
						credits: team.credits,
						reputation: team.reputation
					});

					gameLogger.info('Broadcast ESP dashboard update after resolution', {
						roomCode,
						teamName: team.name,
						credits: team.credits,
						reputation: team.reputation
					});
				}

				// US-8.2-0.2: Broadcast updated destination data after resolution
				// This ensures facilitator dashboard shows current satisfaction scores and budget
				for (const destination of session.destinations) {
					broadcast(roomCode, {
						type: 'destination_dashboard_update',
						destinationName: destination.name,
						budget: destination.budget,
						owned_tools: destination.owned_tools || [],
						esp_metrics: destination.esp_metrics || {}
					});

					gameLogger.info('Broadcast destination dashboard update after resolution', {
						roomCode,
						destinationName: destination.name,
						budget: destination.budget
					});
				}
			}

			// Auto-transition to consequences phase after brief delay
			setTimeout(async () => {
				const consequencesResult = await transitionPhase({
					roomCode,
					toPhase: 'consequences'
				});

				if (consequencesResult.success) {
					// Broadcast phase transition with resolution history
					const message = {
						type: 'phase_transition',
						data: {
							phase: 'consequences',
							round: session.current_round,
							message: 'Resolution complete - reviewing results',
							resolution_history: session.resolution_history,
							// Include current round results for easy access
							current_round_results: resolutionResults,
							// Include investigation history for Coordination Panel results
							investigation_history: session.investigation_history || []
						}
					};

					gameLogger.info('Broadcasting phase transition with investigation history', {
						roomCode,
						round: session.current_round,
						historyLength: session.investigation_history?.length || 0,
						lastEntryTarget: session.investigation_history?.[session.investigation_history.length - 1]?.targetEsp
					});

					broadcast(roomCode, message);

					gameLogger.info('Phase transitioned to consequences', {
						roomCode,
						round: session.current_round
					});
				} else {
					gameLogger.error(new Error('Failed to transition to consequences'), {
						context: 'handleResolutionPhase',
						roomCode,
						error: consequencesResult.error
					});
				}
			}, 500); // 500ms delay before consequences transition
		} catch (error) {
			gameLogger.error(error as Error, {
				context: 'handleResolutionPhase',
				roomCode,
				round: session.current_round,
				message: 'Resolution calculation failed'
			});
		}
	})();
}

/**
 * US-2.7: Handle investigation trigger and resolution
 *
 * Called during resolution phase to:
 * 1. Check if investigation should trigger (2/3 destinations voted for same ESP)
 * 2. If triggered, charge credits to voters and run investigation
 * 3. Store investigation results in session history
 * 4. Clear investigation votes for next round
 */
async function handleInvestigation(
	session: GameSession,
	roomCode: string,
	broadcast: BroadcastFunction
): Promise<InvestigationHistoryEntry | null> {
	// Check if investigation should trigger
	const triggerResult = checkInvestigationTrigger(roomCode);

	if (!triggerResult.triggered || !triggerResult.targetEsp || !triggerResult.voters) {
		// No investigation - just clear votes for next round
		clearInvestigationVotes(roomCode);
		broadcast(roomCode, {
			type: 'investigation_update',
			event: 'clear_votes',
			round: session.current_round
		});

		gameLogger.info('No investigation triggered this round', {
			roomCode,
			round: session.current_round
		});

		return null;
	}

	gameLogger.info('Investigation triggered', {
		roomCode,
		round: session.current_round,
		targetEsp: triggerResult.targetEsp,
		voters: triggerResult.voters
	});

	// Charge investigation cost to voters
	for (const voterName of triggerResult.voters) {
		const destination = session.destinations.find(
			(d) => d.name.toLowerCase() === voterName.toLowerCase()
		);
		if (destination) {
			destination.budget -= INVESTIGATION_COST;

			gameLogger.info('Investigation cost charged', {
				roomCode,
				destination: voterName,
				cost: INVESTIGATION_COST,
				remainingBudget: destination.budget
			});
		}
	}

	// Run the investigation
	const investigationResult = runInvestigation({
		roomCode,
		targetEsp: triggerResult.targetEsp,
		voters: triggerResult.voters
	});

	// Create history entry - map to InvestigationResult type
	const historyEntry: InvestigationHistoryEntry = {
		round: session.current_round,
		targetEsp: triggerResult.targetEsp,
		voters: triggerResult.voters,
		result: {
			violationFound: investigationResult.violationFound,
			message: investigationResult.message,
			suspendedClient: investigationResult.suspendedClient
				? {
					clientId: investigationResult.suspendedClient.id,
					clientName: investigationResult.suspendedClient.name,
					riskLevel: investigationResult.suspendedClient.riskLevel as 'Low' | 'Medium' | 'High',
					missingProtection: investigationResult.suspendedClient.missingProtection,
					spamRate: investigationResult.suspendedClient.spamRate
				}
				: undefined
		},
		timestamp: new Date()
	};

	// Store in session history
	if (!session.investigation_history) {
		session.investigation_history = [];
	}
	session.investigation_history.push(historyEntry);

	gameLogger.info('Investigation completed and stored in history', {
		roomCode,
		round: session.current_round,
		targetEsp: triggerResult.targetEsp,
		violationFound: investigationResult.violationFound,
		suspendedClient: investigationResult.suspendedClient?.name
	});

	// Broadcast investigation result to all clients
	broadcast(roomCode, {
		type: 'investigation_update',
		event: 'result',
		round: session.current_round,
		targetEsp: triggerResult.targetEsp,
		voters: triggerResult.voters,
		violationFound: investigationResult.violationFound,
		suspendedClient: investigationResult.suspendedClient,
		message: investigationResult.message
	});

	// Clear votes for next round
	clearInvestigationVotes(roomCode);
	broadcast(roomCode, {
		type: 'investigation_update',
		event: 'clear_votes',
		round: session.current_round
	});

	return historyEntry;
}
