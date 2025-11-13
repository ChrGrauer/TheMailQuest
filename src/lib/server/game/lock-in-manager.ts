/**
 * US-3.2: Decision Lock-In Manager
 *
 * Business logic for locking in player decisions during Planning Phase:
 * - Lock-in for ESP teams and Destinations
 * - Budget validation (pending onboarding options only)
 * - Auto-correction algorithm (Priority 1: warm-up, Priority 2: list hygiene)
 * - Player lock state tracking
 * - Auto-lock when timer expires
 */

import { getSession, updateActivity } from './session-manager';
import { gameWss } from '$lib/server/websocket';
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

const WARMUP_COST = 150; // Credits
const LIST_HYGIENE_COST = 80; // Credits

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

	// 5. Lock in (no budget validation needed for destinations)
	destination.locked_in = true;
	destination.locked_in_at = new Date();

	// 6. Update activity
	updateActivity(roomCode);

	// 7. Check if all players locked
	const remainingCount = getRemainingPlayersCount(session);
	const allLocked = checkAllPlayersLockedIn(session);

	// 8. Log event
	getLogger().then((logger) => {
		logger.info(`Player ${destinationName} locked in decisions`, {
			roomCode,
			destinationName,
			remainingPlayers: remainingCount
		});
		logger.info(`Dashboard set to read-only for ${destinationName}`, { roomCode, destinationName });
	});

	// 9. Return success
	return {
		success: true,
		locked_in: true,
		locked_in_at: destination.locked_in_at,
		remaining_players: remainingCount,
		all_locked: allLocked
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
		if (options.warmUp) {
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

		// Apply onboarding options
		clientState.has_warmup = options.warmUp;
		clientState.has_list_hygiene = options.listHygiene;

		// Mark client as activated in this round
		clientState.first_active_round = currentRound;

		// Calculate cost
		if (options.warmUp) {
			totalCost += WARMUP_COST;
		}
		if (options.listHygiene) {
			totalCost += LIST_HYGIENE_COST;
		}
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
			if (options.warmUp) {
				// Remove warm-up
				options.warmUp = false;
				correctionMade = true;

				// Log correction
				const client = team.available_clients.find((c) => c.id === clientId);
				corrections.push({
					clientId,
					clientName: client?.name || clientId,
					optionType: 'warmUp',
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
						const optionName = correction.optionType === 'warmUp' ? 'warm-up' : 'list hygiene';
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
				logger.info(`Auto-locked player: ${destination.name} (valid)`, {
					roomCode,
					destinationName: destination.name
				});
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
