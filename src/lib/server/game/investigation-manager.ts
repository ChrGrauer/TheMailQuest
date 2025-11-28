/**
 * US-2.7: Coordination Panel - Investigation Manager
 *
 * Manages investigation voting for destination players:
 * - Cast/remove investigation votes
 * - Get current votes
 * - Budget validation (50 credits required)
 * - Phase and lock-in restrictions
 */

import { getSession } from './session-manager';
import { gameLogger } from '../logger';
import type { InvestigationVoteResult } from './types';
import { INVESTIGATION_COST } from '$lib/config/investigation';
import { hasWarmup, hasListHygiene } from '$lib/utils/client-state-helpers';

// Re-export for backward compatibility
export { INVESTIGATION_COST };

// ============================================================================
// TYPES
// ============================================================================

export interface CastVoteParams {
	roomCode: string;
	destinationName: string;
	targetEsp: string;
}

export interface RemoveVoteParams {
	roomCode: string;
	destinationName: string;
}

// ============================================================================
// INVESTIGATION VOTING
// ============================================================================

/**
 * Cast an investigation vote for a destination
 * Cost: 50 credits (reserved, only charged if investigation triggers)
 */
export function castInvestigationVote(params: CastVoteParams): InvestigationVoteResult {
	const { roomCode, destinationName, targetEsp } = params;

	// Get session
	const session = getSession(roomCode);
	if (!session) {
		return {
			success: false,
			error: 'Session not found'
		};
	}

	// Find destination
	const destination = session.destinations.find(
		(d) => d.name.toLowerCase() === destinationName.toLowerCase()
	);
	if (!destination) {
		return {
			success: false,
			error: 'Destination not found'
		};
	}

	// Find target ESP (must have players)
	const targetEspTeam = session.esp_teams.find(
		(e) => e.name.toLowerCase() === targetEsp.toLowerCase() && e.players.length > 0
	);
	if (!targetEspTeam) {
		return {
			success: false,
			error: 'Invalid ESP target'
		};
	}

	// Check phase restriction
	if (session.current_phase !== 'planning') {
		return {
			success: false,
			error: 'Voting is only available during planning phase'
		};
	}

	// Check lock-in restriction
	if (destination.locked_in) {
		return {
			success: false,
			error: 'Cannot vote after locking in'
		};
	}

	// Check budget (must have at least INVESTIGATION_COST credits)
	if (destination.budget < INVESTIGATION_COST) {
		return {
			success: false,
			error: `Insufficient budget. Requires ${INVESTIGATION_COST} credits to vote.`
		};
	}

	// If destination already has a vote for a different ESP, remove it first
	const previousVote = destination.pending_investigation_vote?.espName;

	// Record the vote
	destination.pending_investigation_vote = { espName: targetEspTeam.name };

	// Get updated votes
	const currentVotes = getInvestigationVotes(roomCode);

	gameLogger.event('investigation_vote_cast', {
		roomCode,
		destination: destinationName,
		targetEsp: targetEspTeam.name,
		previousVote: previousVote || 'none',
		currentVoteCount: currentVotes[targetEspTeam.name]?.length || 0
	});

	return {
		success: true,
		currentVotes,
		reservedCredits: INVESTIGATION_COST
	};
}

/**
 * Remove a destination's investigation vote
 */
export function removeInvestigationVote(params: RemoveVoteParams): InvestigationVoteResult {
	const { roomCode, destinationName } = params;

	// Get session
	const session = getSession(roomCode);
	if (!session) {
		return {
			success: false,
			error: 'Session not found'
		};
	}

	// Find destination
	const destination = session.destinations.find(
		(d) => d.name.toLowerCase() === destinationName.toLowerCase()
	);
	if (!destination) {
		return {
			success: false,
			error: 'Destination not found'
		};
	}

	// Check lock-in restriction
	if (destination.locked_in) {
		return {
			success: false,
			error: 'Cannot modify vote after locking in'
		};
	}

	// Get previous vote for logging
	const previousVote = destination.pending_investigation_vote?.espName;

	// Remove the vote
	destination.pending_investigation_vote = undefined;

	// Get updated votes
	const currentVotes = getInvestigationVotes(roomCode);

	if (previousVote) {
		gameLogger.event('investigation_vote_removed', {
			roomCode,
			destination: destinationName,
			previousVote
		});
	}

	return {
		success: true,
		currentVotes
	};
}

/**
 * Get all current investigation votes grouped by ESP
 * Returns: { espName: [destinationName1, destinationName2, ...], ... }
 */
export function getInvestigationVotes(roomCode: string): Record<string, string[]> {
	const session = getSession(roomCode);
	if (!session) {
		return {};
	}

	const votes: Record<string, string[]> = {};

	// Aggregate votes from all destinations
	for (const destination of session.destinations) {
		if (destination.pending_investigation_vote?.espName) {
			const espName = destination.pending_investigation_vote.espName;
			if (!votes[espName]) {
				votes[espName] = [];
			}
			votes[espName].push(destination.name);
		}
	}

	return votes;
}

/**
 * Clear all investigation votes (called at start of new planning phase)
 */
export function clearInvestigationVotes(roomCode: string): void {
	const session = getSession(roomCode);
	if (!session) {
		return;
	}

	for (const destination of session.destinations) {
		destination.pending_investigation_vote = undefined;
	}

	gameLogger.event('investigation_votes_cleared', {
		roomCode,
		round: session.current_round
	});
}

// ============================================================================
// INVESTIGATION TRIGGER
// ============================================================================

/**
 * Investigation trigger result
 */
export interface InvestigationTriggerResult {
	triggered: boolean;
	targetEsp?: string; // ESP being investigated (if triggered)
	voters?: string[]; // Destinations that voted for this ESP
}

/**
 * Check if an investigation should be triggered based on current votes
 * Rule: 2/3 destinations must vote for the same ESP
 */
export function checkInvestigationTrigger(roomCode: string): InvestigationTriggerResult {
	const session = getSession(roomCode);
	if (!session) {
		return { triggered: false };
	}

	// Get all votes grouped by ESP
	const votes = getInvestigationVotes(roomCode);

	// Count total destinations with players
	const totalDestinations = session.destinations.filter((d) => d.players.length > 0).length;

	// Calculate threshold (2/3 of destinations)
	const threshold = Math.ceil((totalDestinations * 2) / 3);

	// Check if any ESP has enough votes
	for (const espName in votes) {
		const voterCount = votes[espName].length;
		if (voterCount >= threshold) {
			gameLogger.event('investigation_trigger_check', {
				roomCode,
				espName,
				voterCount,
				threshold,
				totalDestinations,
				triggered: true
			});

			return {
				triggered: true,
				targetEsp: espName,
				voters: votes[espName]
			};
		}
	}

	gameLogger.event('investigation_trigger_check', {
		roomCode,
		votes,
		threshold,
		totalDestinations,
		triggered: false
	});

	return { triggered: false };
}

// ============================================================================
// INVESTIGATION RESOLUTION
// ============================================================================

/**
 * Parameters for running an investigation
 */
export interface RunInvestigationParams {
	roomCode: string;
	targetEsp: string;
	voters: string[];
}

/**
 * Result of running an investigation
 */
export interface InvestigationResolutionResult {
	violationFound: boolean;
	suspendedClient?: {
		id: string;
		name: string;
		riskLevel: string;
		spamRate: number;
		missingProtection: 'warmUp' | 'listHygiene' | 'both';
	};
	message: string;
}

/**
 * Run an investigation against an ESP team
 * Detects HIGH-risk clients without warmup OR listHygiene
 * Suspends the client with highest spam_rate if violation found
 */
export function runInvestigation(params: RunInvestigationParams): InvestigationResolutionResult {
	const { roomCode, targetEsp, voters } = params;

	const session = getSession(roomCode);
	if (!session) {
		return {
			violationFound: false,
			message: 'Session not found'
		};
	}

	// Find ESP team
	const espTeam = session.esp_teams.find((e) => e.name.toLowerCase() === targetEsp.toLowerCase());
	if (!espTeam) {
		return {
			violationFound: false,
			message: 'ESP team not found'
		};
	}

	// Get active clients only (not paused or suspended)
	const activeClients = espTeam.available_clients.filter((client) => {
		const state = espTeam.client_states?.[client.id];
		return espTeam.active_clients.includes(client.id) && state?.status === 'Active';
	});

	// Find HIGH-risk clients with violations (missing warmup OR listHygiene)
	const violatingClients = activeClients.filter((client) => {
		if (client.risk !== 'High') {
			return false;
		}
		// Check client_states for configured onboarding options via helper functions
		const state = espTeam.client_states?.[client.id];
		if (!state) return false;
		const clientHasWarmup = hasWarmup(state);
		const clientHasListHygiene = hasListHygiene(state);
		// Violation if HIGH risk and missing either protection
		return !clientHasWarmup || !clientHasListHygiene;
	});

	// No violations found
	if (violatingClients.length === 0) {
		gameLogger.event('investigation_resolution', {
			roomCode,
			targetEsp,
			voters,
			result: 'no_violation',
			activeClientsChecked: activeClients.length
		});

		return {
			violationFound: false,
			message: 'No violations detected - appears compliant'
		};
	}

	// Find client with highest spam_rate among violators
	const worstClient = violatingClients.reduce((worst, current) => {
		return current.spam_rate > worst.spam_rate ? current : worst;
	});

	// Determine what protection is missing (check client_states via helpers)
	const worstClientState = espTeam.client_states?.[worstClient.id];
	const worstHasWarmup = worstClientState ? hasWarmup(worstClientState) : false;
	const worstHasListHygiene = worstClientState ? hasListHygiene(worstClientState) : false;
	let missingProtection: 'warmUp' | 'listHygiene' | 'both';
	if (!worstHasWarmup && !worstHasListHygiene) {
		missingProtection = 'both';
	} else if (!worstHasWarmup) {
		missingProtection = 'warmUp';
	} else {
		missingProtection = 'listHygiene';
	}

	// Suspend the client
	if (espTeam.client_states && espTeam.client_states[worstClient.id]) {
		espTeam.client_states[worstClient.id].status = 'Suspended';
	}

	gameLogger.event('investigation_resolution', {
		roomCode,
		targetEsp,
		voters,
		result: 'violation_found',
		suspendedClientId: worstClient.id,
		suspendedClientName: worstClient.name,
		spamRate: worstClient.spam_rate,
		missingProtection
	});

	return {
		violationFound: true,
		suspendedClient: {
			id: worstClient.id,
			name: worstClient.name,
			riskLevel: worstClient.risk,
			spamRate: worstClient.spam_rate,
			missingProtection
		},
		message: `Bad practices found - ${worstClient.name} has been suspended`
	};
}
