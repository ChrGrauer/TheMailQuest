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
 * 3. Auto-transition to consequences phase
 * 4. Broadcast phase transition with resolution results
 */

import { executeResolution } from './resolution-manager';
import { transitionPhase } from './phase-manager';
import type { GameSession } from './types';
import { gameLogger } from '../logger';

/**
 * Broadcast function type for WebSocket messages
 */
export type BroadcastFunction = (
	roomCode: string,
	message: {
		type: string;
		data?: any;
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

			// Store results in session for consequences display
			session.resolution_results = resolutionResults;

			gameLogger.info('Resolution calculation completed', {
				roomCode,
				round: session.current_round,
				espTeamsProcessed: Object.keys(resolutionResults.espResults).length
			});

			// Auto-transition to consequences phase after brief delay
			setTimeout(() => {
				const consequencesResult = transitionPhase({
					roomCode,
					toPhase: 'consequences'
				});

				if (consequencesResult.success) {
					// Broadcast phase transition with resolution results
					const message = {
						type: 'phase_transition',
						data: {
							phase: 'consequences',
							round: session.current_round,
							message: 'Resolution complete - reviewing results',
							resolution_results: resolutionResults
						}
					};

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
