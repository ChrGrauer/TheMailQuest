/**
 * Phase Manager
 * US-1.4: Resources Allocation
 *
 * Handles game phase transitions
 * - Validates phase transitions
 * - Sets round number when entering planning phase
 * - Records phase start time
 * - Logs phase transitions
 */

import { getSession, updateActivity } from './session-manager';
import { validateRoomCode } from './validation/room-validator';
import type { GamePhase } from './types';
import { gameLogger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface PhaseTransitionRequest {
	roomCode: string;
	toPhase: GamePhase;
}

export interface PhaseTransitionResult {
	success: boolean;
	error?: string;
	phase?: GamePhase;
	round?: number;
	phaseStartTime?: Date;
}

export interface PhaseTransitionValidation {
	canTransition: boolean;
	reason?: string;
}

// Export types
export type { GamePhase };

// ============================================================================
// PHASE TRANSITION RULES
// ============================================================================

const VALID_TRANSITIONS: Record<string, GamePhase[]> = {
	lobby: ['resource_allocation'],
	resource_allocation: ['planning'],
	planning: ['resolution'], // Direct transition after all players lock in or timer expires (US-3.2)
	resolution: ['consequences'], // US-3.5: Auto-transition to consequences after resolution
	consequences: ['planning', 'finished'], // US-3.5: Can go to next round or end game
	finished: []
};

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if a phase transition is valid
 * @param request Transition request
 * @returns Validation result
 */
export function canTransitionPhase(request: PhaseTransitionRequest): PhaseTransitionValidation {
	const { roomCode, toPhase } = request;

	// Validate room code
	const roomValidation = validateRoomCode(roomCode);
	if (!roomValidation.isValidFormat || !roomValidation.exists) {
		return {
			canTransition: false,
			reason: roomValidation.error
		};
	}

	const session = roomValidation.session!;
	const currentPhase = session.current_phase;

	// Check if transition is valid
	const allowedTransitions = VALID_TRANSITIONS[currentPhase] || [];
	if (!allowedTransitions.includes(toPhase)) {
		return {
			canTransition: false,
			reason: `Invalid phase transition from ${currentPhase} to ${toPhase}`
		};
	}

	return {
		canTransition: true
	};
}

// ============================================================================
// PHASE TRANSITION
// ============================================================================

/**
 * Transition game to a new phase
 * @param request Transition request with roomCode and target phase
 * @returns Result indicating success or error
 */
export function transitionPhase(request: PhaseTransitionRequest): PhaseTransitionResult {
	const { roomCode, toPhase } = request;

	// Validate room code
	const roomValidation = validateRoomCode(roomCode);
	if (!roomValidation.isValidFormat || !roomValidation.exists) {
		gameLogger.event('phase_transition_failed', {
			roomCode,
			toPhase,
			reason: roomValidation.error
		});

		return {
			success: false,
			error: roomValidation.error
		};
	}

	const session = roomValidation.session!;
	const fromPhase = session.current_phase;

	// Validate transition
	const validation = canTransitionPhase(request);
	if (!validation.canTransition) {
		gameLogger.event('phase_transition_failed', {
			roomCode,
			fromPhase,
			toPhase,
			reason: validation.reason
		});

		return {
			success: false,
			error: validation.reason
		};
	}

	try {
		// Perform transition
		session.current_phase = toPhase;

		// Set round to 1 when entering planning phase
		if (toPhase === 'planning' && session.current_round === 0) {
			session.current_round = 1;
		}

		// Record phase start time
		session.phase_start_time = new Date();

		// Update activity
		updateActivity(roomCode);

		// Log transition
		gameLogger.event('phase_transition', {
			roomCode,
			fromPhase,
			toPhase,
			round: session.current_round,
			timestamp: session.phase_start_time.toISOString()
		});

		return {
			success: true,
			phase: toPhase,
			round: session.current_round,
			phaseStartTime: session.phase_start_time
		};
	} catch (error) {
		gameLogger.error(error as Error, {
			context: 'transitionPhase',
			roomCode,
			fromPhase,
			toPhase
		});

		return {
			success: false,
			error: 'Phase transition failed'
		};
	}
}

/**
 * Get current phase information
 * @param roomCode The room code
 * @returns Phase info or null if room not found
 */
export function getPhaseInfo(roomCode: string): {
	phase: GamePhase;
	round: number;
	phaseStartTime?: Date;
} | null {
	const roomValidation = validateRoomCode(roomCode);
	if (!roomValidation.isValidFormat || !roomValidation.exists) {
		return null;
	}

	const session = roomValidation.session!;

	return {
		phase: session.current_phase as GamePhase,
		round: session.current_round,
		phaseStartTime: session.phase_start_time
	};
}
