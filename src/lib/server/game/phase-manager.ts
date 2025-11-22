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
export async function transitionPhase(
	request: PhaseTransitionRequest
): Promise<PhaseTransitionResult> {
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

		// Phase 2: Apply pending auto-locks when entering planning phase
		if (toPhase === 'planning') {
			// Import gameWss dynamically to avoid circular dependencies
			const { gameWss } = await import('../websocket');

			for (const team of session.esp_teams) {
				if (team.pendingAutoLock) {
					team.locked_in = true;
					team.locked_in_at = new Date();
					team.pendingAutoLock = false;

					// Broadcast lock-in confirmation (same format as manual lock-in)
					gameWss.broadcastToRoom(roomCode, {
						type: 'lock_in_confirmed',
						data: {
							teamName: team.name,
							role: 'ESP',
							locked_in: true,
							locked_in_at: team.locked_in_at
						}
					});

					gameLogger.event('pending_auto_lock_applied', {
						roomCode,
						teamName: team.name,
						round: session.current_round
					});
				}
			}
		}

		// Phase 1: Automatic DMARC Enforcement at Round 3
		// Trigger INC-010 automatically when entering Round 3 planning phase
		if (toPhase === 'planning' && session.current_round === 3) {
			// Check if DMARC incident not already triggered
			const dmarcAlreadyTriggered =
				session.incident_history?.some((entry) => entry.incidentId === 'INC-010') || false;

			if (!dmarcAlreadyTriggered) {
				try {
					// Import incident management functions dynamically to avoid circular dependencies
					const { triggerIncident } = await import('./incident-manager');
					const { applyIncidentEffects } = await import('./incident-effects-manager');
					const { getIncidentById } = await import('$lib/config/incident-cards');
					const { gameWss } = await import('../websocket');

					// Trigger DMARC incident
					const incident = getIncidentById('INC-010');
					if (incident) {
						const triggerResult = triggerIncident(session, 'INC-010');

						if (triggerResult.success) {
							// Apply effects
							const effectResult = applyIncidentEffects(session, incident);

							// Broadcast incident to all players
							gameWss.broadcastToRoom(roomCode, {
								type: 'incident_triggered',
								incident: {
									id: incident.id,
									name: incident.name,
									description: incident.description,
									educationalNote: incident.educationalNote,
									category: incident.category,
									rarity: incident.rarity,
									duration: incident.duration,
									displayDurationMs: 10000
								}
							});

							// Broadcast effects
							gameWss.broadcastToRoom(roomCode, {
								type: 'incident_effects_applied',
								incidentId: incident.id,
								changes: effectResult.changes
							});

							gameLogger.event('automatic_incident_triggered', {
								roomCode,
								incidentId: 'INC-010',
								incidentName: 'DMARC Enforcement',
								round: 3
							});
						}
					}
				} catch (error) {
					// Log error but don't fail phase transition
					gameLogger.error(error as Error, {
						context: 'automatic_dmarc_trigger',
						roomCode
					});
				}
			}
		}

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
