/**
 * US-3.2: Decision Lock-In Manager
 * US-2.7: Coordination Panel - Investigation Vote Budget Handling
 *
 * Business logic for locking in player decisions during Planning Phase:
 * - Lock-in for ESP teams and Destinations
 * - Budget validation (pending onboarding options only)
 * - Auto-correction algorithm (Priority 1: warm-up, Priority 2: list hygiene)
 * - Player lock state tracking
 * - Auto-lock when timer expires
 * - US-2.7: Investigation vote budget charging and auto-removal
 */

import { getSession, updateActivity } from './session-manager';
import { gameWss } from '$lib/server/websocket';
import { applyPendingChoiceEffects } from './incident-choice-manager';
import { INVESTIGATION_COST } from './investigation-manager';
import {
	WARMUP_COST,
	LIST_HYGIENE_COST,
	calculateOnboardingCost,
	WARMUP_VOLUME_REDUCTION,
	getListHygieneVolumeReduction,
	LIST_HYGIENE_SPAM_TRAP_REDUCTION
} from '$lib/config/client-onboarding';
import type {
	ESPTeam,
	Destination,
	GameSession,
	LockInResult,
	LockInValidation,
	AutoCorrectionLog,
	OnboardingOptions
} from './types';

// Lazy logger import to avoid $app/environment issues
let gameLogger: any = null;
async function getLogger() {
	if (!gameLogger) {
		const module = await import('../logger');
		gameLogger = module.gameLogger;
	}
	return gameLogger;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Local hardcoded constants removed - using imports from $lib/config/client-onboarding

// ============================================================================
// LOCK-IN OPERATIONS
// ============================================================================

/**
 * Lock in an ESP team's decisions
 */
export function lockInESPTeam(roomCode: string, teamName: string): LockInResult {
	// 1. Get session
	const session = getSession(roomCode);
	if (!session) {
		return { success: false, error: 'Session not found. Please check the code.' };
	}

	// 2. Check phase
	if (session.current_phase !== 'planning') {
		return { success: false, error: 'Can only lock in during planning phase.' };
	}

	// 3. Find team
	const team = session.esp_teams.find((t) => t.name === teamName);
	if (!team) {
		return { success: false, error: `Team "${teamName}" not found.` };
	}

	// 4. Check if already locked
	if (team.locked_in) {
		return { success: false, error: 'Team is already locked in.' };
	}

	// 5. Validate budget
	const validation = validateLockIn(team);
	if (!validation.isValid) {
		return { success: false, error: validation.error };
	}

	// 6. Commit pending onboarding decisions
	commitPendingOnboardingDecisions(team, session.current_round);

	// 6b. Mark ALL active new clients as activated
	// This must happen even if there were no pending onboarding decisions
	// (e.g., client acquired but onboarding options not changed)
	for (const clientId of team.active_clients) {
		const clientState = team.client_states?.[clientId];
		if (clientState && clientState.first_active_round === null) {
			clientState.first_active_round = session.current_round;
		}
	}

	// 6c. Apply pending incident choice effects (Phase 5)
	// Note: Effects are now applied immediately at confirmation, but we still need
	// to clean up the pending_incident_choices state at lock-in
	if (team.pending_incident_choices && team.pending_incident_choices.length > 0) {
		const choiceResult = applyPendingChoiceEffects(session, team);
		getLogger().then((logger) => {
			logger.info(`Processed incident choices at lock-in for ${teamName}`, {
				roomCode,
				teamName,
				processedCount: choiceResult.processedCount,
				choiceId: choiceResult.choiceId,
				effectsAppliedAtConfirmation: !choiceResult.applied,
				effects: choiceResult.effectsApplied
			});
		});
	}

	// 7. Lock in
	team.locked_in = true;
	team.locked_in_at = new Date();

	// 8. Update activity
	updateActivity(roomCode);

	// 8. Check if all players locked
	const remainingCount = getRemainingPlayersCount(session);
	const allLocked = checkAllPlayersLockedIn(session);

	// 9. Log event
	getLogger().then((logger) => {
		logger.info(`Player ${teamName} locked in decisions`, {
			roomCode,
			teamName,
			remainingPlayers: remainingCount
		});
		logger.info(`Dashboard set to read-only for ${teamName}`, { roomCode, teamName });
	});

	// 10. Return success
	return {
		success: true,
		locked_in: true,
		locked_in_at: team.locked_in_at,
		remaining_players: remainingCount,
		all_locked: allLocked
	};
}

/**
 * Lock in a Destination's decisions
 * US-2.7: Charges investigation vote cost if destination has voted
 */
export function lockInDestination(roomCode: string, destinationName: string): LockInResult {
	// 1. Get session
	const session = getSession(roomCode);
	if (!session) {
		return { success: false, error: 'Session not found. Please check the code.' };
	}

	// 2. Check phase
	if (session.current_phase !== 'planning') {
		return { success: false, error: 'Can only lock in during planning phase.' };
	}

	// 3. Find destination
	const destination = session.destinations.find((d) => d.name === destinationName);
	if (!destination) {
		return { success: false, error: `Destination "${destinationName}" not found.` };
	}

	// 4. Check if already locked
	if (destination.locked_in) {
		return { success: false, error: 'Destination is already locked in.' };
	}

	// 5. US-2.7: Validate budget if destination has investigation vote
	// Note: Budget is only reserved at lock-in, actual charge happens at resolution
	// if investigation triggers (2/3 consensus reached)
	let voteAutoRemoved = false;
	let removedVoteTarget: string | undefined;
	const validation = validateDestinationLockIn(destination);
	if (!validation.isValid) {
		// Auto-remove the vote if budget insufficient, then proceed with lock-in
		if (destination.pending_investigation_vote) {
			removedVoteTarget = destination.pending_investigation_vote.espName;
			destination.pending_investigation_vote = undefined;
			voteAutoRemoved = true;
			getLogger().then((logger) => {
				logger.info(
					`Auto-removed investigation vote for ${destination.name} - insufficient budget`,
					{
						roomCode,
						destinationName: destination.name,
						removedVote: removedVoteTarget,
						budget: destination.budget,
						requiredBudget: INVESTIGATION_COST
					}
				);
			});
		} else {
			// Some other validation error - return error
			return { success: false, error: validation.error };
		}
	}

	// 6. Lock in (investigation vote cost charged at resolution if triggered)
	destination.locked_in = true;
	destination.locked_in_at = new Date();

	// 8. Update activity
	updateActivity(roomCode);

	// 9. Check if all players locked
	const remainingCount = getRemainingPlayersCount(session);
	const allLocked = checkAllPlayersLockedIn(session);

	// 10. Log event
	getLogger().then((logger) => {
		logger.info(`Player ${destinationName} locked in decisions`, {
			roomCode,
			destinationName,
			remainingPlayers: remainingCount
		});
		logger.info(`Dashboard set to read-only for ${destinationName}`, { roomCode, destinationName });
	});

	// 11. Return success
	return {
		success: true,
		locked_in: true,
		locked_in_at: destination.locked_in_at,
		remaining_players: remainingCount,
		all_locked: allLocked,
		vote_auto_removed: voteAutoRemoved,
		removed_vote_target: removedVoteTarget
	};
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate if an ESP team can lock in their decisions
 * Checks if pending onboarding costs would exceed budget
 */
export function validateLockIn(team: ESPTeam): LockInValidation {
	// Calculate pending onboarding costs
	const pendingCosts = calculatePendingOnboardingCosts(team);

	// Calculate total costs (committed + pending)
	const committedCosts = team.budget || 0;
	const totalCosts = committedCosts + pendingCosts;

	// Check if budget exceeded
	if (totalCosts > team.credits) {
		const excessAmount = totalCosts - team.credits;
		return {
			isValid: false,
			error: `Budget exceeded by ${excessAmount} credits. Remove some onboarding options.`,
			pendingCosts,
			budgetExceeded: true,
			excessAmount
		};
	}

	return {
		isValid: true,
		pendingCosts,
		budgetExceeded: false
	};
}

/**
 * US-2.7: Validate if a Destination can lock in their decisions
 * Checks if investigation vote cost would exceed budget
 */
export function validateDestinationLockIn(destination: Destination): LockInValidation {
	// Calculate investigation vote cost
	const voteCost = destination.pending_investigation_vote ? INVESTIGATION_COST : 0;

	// Check if budget is sufficient for vote
	if (voteCost > 0 && destination.budget < voteCost) {
		return {
			isValid: false,
			error: `Insufficient budget for investigation vote. Requires ${INVESTIGATION_COST} credits.`,
			pendingCosts: voteCost,
			budgetExceeded: true,
			excessAmount: voteCost - destination.budget
		};
	}

	return {
		isValid: true,
		pendingCosts: voteCost,
		budgetExceeded: false
	};
}

/**
 * Calculate total cost of pending onboarding options
 * Warm-up: 150 credits, List Hygiene: 80 credits
 */
export function calculatePendingOnboardingCosts(team: ESPTeam): number {
	if (!team.pending_onboarding_decisions) {
		return 0;
	}

	let totalCost = 0;

	for (const clientId in team.pending_onboarding_decisions) {
		const options = team.pending_onboarding_decisions[clientId];
		if (options.warmup) {
			totalCost += WARMUP_COST;
		}
		if (options.listHygiene) {
			totalCost += LIST_HYGIENE_COST;
		}
	}

	return totalCost;
}

/**
 * Commit pending onboarding decisions to client_states
 * Deducts credits and applies onboarding options
 * Clears pending_onboarding_decisions
 * Sets first_active_round for newly activated clients
 * Phase 2: Creates VolumeModifier and SpamTrapModifier objects
 */
export function commitPendingOnboardingDecisions(team: ESPTeam, currentRound: number): void {
	if (!team.pending_onboarding_decisions || !team.client_states) {
		return;
	}

	let totalCost = 0;

	// Apply each pending decision to client_states
	for (const clientId in team.pending_onboarding_decisions) {
		const options = team.pending_onboarding_decisions[clientId];
		const clientState = team.client_states[clientId];

		if (!clientState) {
			continue; // Skip if client not found
		}

		// Only apply to new clients (not yet activated)
		if (clientState.first_active_round !== null) {
			continue;
		}

		// Phase 2: Create modifiers instead of setting deprecated properties
		// Match the logic from configureOnboarding in client-portfolio-manager.ts

		// Get client's risk level for list hygiene calculation
		const client = team.available_clients.find((c) => c.id === clientId);
		const riskLevel = client?.risk || 'Medium'; // Default to Medium if not found

		// Warmup: 50% volume reduction in first active round only
		// Use -1 as sentinel value for "first active round only"
		if (options.warmup) {
			clientState.volumeModifiers.push({
				id: `warmup-${clientId}`,
				source: 'warmup',
				multiplier: 1.0 - WARMUP_VOLUME_REDUCTION, // 0.5
				applicableRounds: [-1], // -1 = first active round only
				description: 'Warm-up active, initial volume reduced'
			});
			totalCost += WARMUP_COST;
		}

		// List Hygiene: Permanent volume reduction + spam trap reduction
		if (options.listHygiene) {
			// Volume reduction based on risk level
			const volumeReduction = getListHygieneVolumeReduction(riskLevel);
			clientState.volumeModifiers.push({
				id: `list_hygiene-${clientId}`,
				source: 'list_hygiene',
				multiplier: 1.0 - volumeReduction, // 0.95, 0.90, or 0.85
				applicableRounds: [1, 2, 3, 4], // All rounds (permanent)
				description: 'List Hygiene active (permanent)'
			});

			// Spam trap reduction: 40% reduction = 0.6 multiplier
			clientState.spamTrapModifiers.push({
				id: `list_hygiene-spam-${clientId}`,
				source: 'list_hygiene',
				multiplier: 1.0 - LIST_HYGIENE_SPAM_TRAP_REDUCTION, // 0.6
				applicableRounds: [1, 2, 3, 4], // All rounds (permanent)
				description: 'List Hygiene spam trap reduction'
			});
			totalCost += LIST_HYGIENE_COST;
		}

		// Mark client as activated in this round
		clientState.first_active_round = currentRound;
	}

	// Deduct credits
	team.credits -= totalCost;

	// Clear pending decisions
	team.pending_onboarding_decisions = {};

	// Log commitment
	getLogger().then((logger) => {
		logger.info(`Committed pending onboarding decisions for ${team.name}`, {
			totalCost,
			remainingCredits: team.credits,
			round: currentRound
		});
	});
}

// ============================================================================
// AUTO-CORRECTION
// ============================================================================

/**
 * Auto-correct onboarding options to fit budget
 * Algorithm:
 *   Priority 1: Remove warm-up options (150cr each) one by one until valid
 *   Priority 2: Remove list hygiene options (80cr each) one by one until valid
 *
 * Returns log of corrections made
 */
export function autoCorrectOnboardingOptions(team: ESPTeam): AutoCorrectionLog[] {
	const corrections: AutoCorrectionLog[] = [];

	if (!team.pending_onboarding_decisions) {
		return corrections;
	}

	// Keep removing options until budget is valid
	while (!validateLockIn(team).isValid) {
		let correctionMade = false;

		// Priority 1: Remove warm-up options
		for (const clientId in team.pending_onboarding_decisions) {
			const options = team.pending_onboarding_decisions[clientId];
			if (options.warmup) {
				// Remove warm-up
				options.warmup = false;
				correctionMade = true;

				// Log correction
				const client = team.available_clients.find((c) => c.id === clientId);
				corrections.push({
					clientId,
					clientName: client?.name || clientId,
					optionType: 'warmup',
					costSaved: WARMUP_COST
				});

				// Check if now valid
				if (validateLockIn(team).isValid) {
					return corrections;
				}
			}
		}

		// Priority 2: Remove list hygiene options (if still not valid)
		if (!correctionMade) {
			for (const clientId in team.pending_onboarding_decisions) {
				const options = team.pending_onboarding_decisions[clientId];
				if (options.listHygiene) {
					// Remove list hygiene
					options.listHygiene = false;
					correctionMade = true;

					// Log correction
					const client = team.available_clients.find((c) => c.id === clientId);
					corrections.push({
						clientId,
						clientName: client?.name || clientId,
						optionType: 'listHygiene',
						costSaved: LIST_HYGIENE_COST
					});

					// Check if now valid
					if (validateLockIn(team).isValid) {
						return corrections;
					}
				}
			}
		}

		// Safety: If no correction made, break to avoid infinite loop
		if (!correctionMade) {
			break;
		}
	}

	return corrections;
}

// ============================================================================
// AUTO-LOCK
// ============================================================================

/**
 * Auto-lock all players who haven't locked in yet
 * Called when timer expires
 * Auto-corrects invalid decisions (budget exceeded by onboarding options)
 *
 * @returns Map of team names to their auto-correction logs
 */
export function autoLockAllPlayers(roomCode: string): Map<string, AutoCorrectionLog[]> {
	const session = getSession(roomCode);
	const allCorrections = new Map<string, AutoCorrectionLog[]>();

	if (!session) {
		return allCorrections;
	}

	getLogger().then((logger) => {
		logger.info('Timer expired - auto-locking all players', { roomCode });
	});

	// Auto-lock ESP teams
	for (const team of session.esp_teams) {
		if (!team.locked_in) {
			// Auto-correct if needed
			const validation = validateLockIn(team);
			let corrections: AutoCorrectionLog[] = [];

			if (!validation.isValid) {
				corrections = autoCorrectOnboardingOptions(team);
				// Store corrections for this team
				if (corrections.length > 0) {
					allCorrections.set(team.name, corrections);
				}
			}

			// Commit pending onboarding decisions
			commitPendingOnboardingDecisions(team, session.current_round);

			// Mark ALL active new clients as activated
			// This must happen even if there were no pending onboarding decisions
			for (const clientId of team.active_clients) {
				const clientState = team.client_states?.[clientId];
				if (clientState && clientState.first_active_round === null) {
					clientState.first_active_round = session.current_round;
				}
			}

			// Apply pending incident choice effects (Phase 5)
			// Note: Effects are now applied immediately at confirmation
			if (team.pending_incident_choices && team.pending_incident_choices.length > 0) {
				const choiceResult = applyPendingChoiceEffects(session, team);
				getLogger().then((logger) => {
					logger.info(`Auto-lock processed incident choices for ${team.name}`, {
						roomCode,
						teamName: team.name,
						processedCount: choiceResult.processedCount,
						choiceId: choiceResult.choiceId,
						effectsAppliedAtConfirmation: !choiceResult.applied,
						effects: choiceResult.effectsApplied
					});
				});
			}

			// Lock in
			team.locked_in = true;
			team.locked_in_at = new Date();

			// Broadcast lock-in confirmation to client
			const remainingPlayers = getRemainingPlayersCount(session);
			gameWss.broadcastToRoom(roomCode, {
				type: 'lock_in_confirmed',
				data: {
					teamName: team.name,
					role: 'ESP',
					locked_in: true,
					locked_in_at: team.locked_in_at.toISOString(),
					remaining_players: remainingPlayers
				}
			});

			// Broadcast remaining players count to all
			gameWss.broadcastToRoom(roomCode, {
				type: 'player_locked_in',
				data: {
					teamName: team.name,
					role: 'ESP',
					remaining_players: remainingPlayers
				}
			});

			// Log
			getLogger().then((logger) => {
				if (corrections.length > 0) {
					logger.info(`Auto-locked player: ${team.name} (corrected)`, {
						roomCode,
						teamName: team.name
					});

					// Log each correction
					for (const correction of corrections) {
						const optionName = correction.optionType === 'warmup' ? 'warm-up' : 'list hygiene';
						logger.info(
							`Removed ${optionName} option (${correction.costSaved}cr) for client: ${correction.clientName}`,
							{ roomCode, teamName: team.name, clientName: correction.clientName }
						);
					}

					// Log final budget
					const finalBudget = team.budget + calculatePendingOnboardingCosts(team);
					logger.info(
						`${team.name} final budget after auto-correction: ${finalBudget}/${team.credits} credits`,
						{ roomCode, teamName: team.name }
					);
				} else {
					logger.info(`Auto-locked player: ${team.name} (valid)`, {
						roomCode,
						teamName: team.name
					});
				}
			});
		}
	}

	// Auto-lock Destinations
	for (const destination of session.destinations) {
		if (!destination.locked_in) {
			// US-2.7: Check if destination has investigation vote and sufficient budget
			// Note: Budget is only reserved at lock-in, actual charge happens at resolution
			// if investigation triggers (2/3 consensus reached)
			let voteRemoved = false;
			if (destination.pending_investigation_vote) {
				const validation = validateDestinationLockIn(destination);
				if (!validation.isValid) {
					// Auto-remove vote if budget insufficient
					const removedVote = destination.pending_investigation_vote.espName;
					destination.pending_investigation_vote = undefined;
					voteRemoved = true;

					getLogger().then((logger) => {
						logger.info(
							`Auto-removed investigation vote for ${destination.name} - insufficient budget`,
							{
								roomCode,
								destinationName: destination.name,
								removedVote,
								budget: destination.budget,
								requiredBudget: INVESTIGATION_COST
							}
						);
					});
				}
				// Note: Cost NOT charged here - will be charged at resolution if investigation triggers
			}

			destination.locked_in = true;
			destination.locked_in_at = new Date();

			// Broadcast lock-in confirmation to client
			const remainingPlayers = getRemainingPlayersCount(session);
			gameWss.broadcastToRoom(roomCode, {
				type: 'lock_in_confirmed',
				data: {
					destinationName: destination.name,
					role: 'Destination',
					locked_in: true,
					locked_in_at: destination.locked_in_at.toISOString(),
					remaining_players: remainingPlayers
				}
			});

			// Broadcast remaining players count to all
			gameWss.broadcastToRoom(roomCode, {
				type: 'player_locked_in',
				data: {
					destinationName: destination.name,
					role: 'Destination',
					remaining_players: remainingPlayers
				}
			});

			getLogger().then((logger) => {
				if (voteRemoved) {
					logger.info(
						`Auto-locked player: ${destination.name} (vote removed - insufficient budget)`,
						{
							roomCode,
							destinationName: destination.name
						}
					);
				} else {
					logger.info(`Auto-locked player: ${destination.name} (valid)`, {
						roomCode,
						destinationName: destination.name
					});
				}
			});
		}
	}

	updateActivity(roomCode);

	// Return all corrections that were made
	return allCorrections;
}

// ============================================================================
// STATE TRACKING
// ============================================================================

/**
 * Check if all players in the session have locked in
 * Only checks teams/destinations that have players
 */
export function checkAllPlayersLockedIn(session: GameSession): boolean {
	// Check all ESP teams that have players
	for (const team of session.esp_teams) {
		if (team.players.length > 0 && !team.locked_in) {
			return false;
		}
	}

	// Check all destinations that have players
	for (const destination of session.destinations) {
		if (destination.players.length > 0 && !destination.locked_in) {
			return false;
		}
	}

	return true;
}

/**
 * Get count of players who haven't locked in yet
 * Only counts teams/destinations that have players
 */
export function getRemainingPlayersCount(session: GameSession): number {
	let remaining = 0;

	// Count unlocked ESP teams that have players
	for (const team of session.esp_teams) {
		if (team.players.length > 0 && !team.locked_in) {
			remaining++;
		}
	}

	// Count unlocked destinations that have players
	for (const destination of session.destinations) {
		if (destination.players.length > 0 && !destination.locked_in) {
			remaining++;
		}
	}

	return remaining;
}
