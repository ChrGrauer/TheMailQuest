/**
 * Phase Manager
 * Centralized logic for managing game phases and transitions.
 */

import type { GamePhase } from './types';
import { updateActivity } from './session-manager';
import { validateRoomCode } from './validation/room-validator';
import { gameLogger } from '../logger';

/**
 * Result of a phase transition attempt
 */
export interface PhaseTransitionResult {
	success: boolean;
	phase?: GamePhase;
	round?: number;
	phaseStartTime?: Date;
	error?: string;
}

/**
 * Validate if a phase transition is allowed
 * @param from Current phase
 * @param to Target phase
 * @returns boolean
 */
export function isValidTransition(from: GamePhase, to: GamePhase): boolean {
	const allowedTransitions: Record<GamePhase, GamePhase[]> = {
		lobby: ['resource_allocation'],
		resource_allocation: ['planning'],
		planning: ['resolution'],
		resolution: ['consequences'],
		consequences: ['planning', 'finished'],
		finished: []
	};

	return allowedTransitions[from]?.includes(to) || false;
}

/**
 * Check if a phase transition is possible (for UI/API validation)
 */
export function canTransitionPhase({
	roomCode,
	toPhase
}: {
	roomCode: string;
	toPhase: GamePhase;
}): { canTransition: boolean; reason?: string } {
	const roomValidation = validateRoomCode(roomCode);
	if (!roomValidation.isValidFormat || !roomValidation.exists) {
		return {
			canTransition: false,
			reason: 'Room not found. Please check the code.'
		};
	}

	const session = roomValidation.session!;
	const fromPhase = session.current_phase as GamePhase;

	if (!isValidTransition(fromPhase, toPhase)) {
		return {
			canTransition: false,
			reason: `Invalid phase transition from ${fromPhase} to ${toPhase}`
		};
	}

	return { canTransition: true };
}

/**
 * Transition the game to a new phase
 * @param params Transition parameters
 * @returns Result object
 */
export async function transitionPhase({
	roomCode,
	toPhase
}: {
	roomCode: string;
	toPhase: GamePhase;
}): Promise<PhaseTransitionResult> {
	const roomValidation = validateRoomCode(roomCode);
	if (!roomValidation.isValidFormat || !roomValidation.exists) {
		return {
			success: false,
			error: 'Invalid room'
		};
	}

	const session = roomValidation.session!;
	const fromPhase = session.current_phase as GamePhase;

	// Validate transition
	const validation = canTransitionPhase({ roomCode, toPhase });
	if (!validation.canTransition) {
		gameLogger.warn('Invalid phase transition attempted', {
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

		// Reset lock-in status for all teams when entering planning phase
		if (toPhase === 'planning') {
			for (const team of session.esp_teams) {
				team.locked_in = false;
				team.locked_in_at = undefined;
			}
			for (const dest of session.destinations) {
				dest.locked_in = false;
				dest.locked_in_at = undefined;
			}
			gameLogger.info('Centralized lock-in reset applied for planning phase', { roomCode });
		}

		// Record phase start time
		session.phase_start_time = new Date();

		// Apply pending auto-locks when entering planning phase
		if (toPhase === 'planning') {
			for (const team of session.esp_teams) {
				if (team.pendingAutoLock) {
					team.locked_in = true;
					team.locked_in_at = new Date();

					gameLogger.event('pending_auto_lock_applied', {
						roomCode,
						teamName: team.name,
						round: session.current_round
					});
				}
			}
		}

		// Automatic DMARC Enforcement at Round 3
		if (toPhase === 'planning' && session.current_round === 3) {
			const dmarcAlreadyTriggered =
				session.incident_history?.some((entry) => entry.incidentId === 'INC-010') || false;

			if (!dmarcAlreadyTriggered) {
				try {
					const { triggerIncident } = await import('./incident-manager');
					const { applyIncidentEffects } = await import('./incident-effects-manager');
					const { getIncidentById } = await import('$lib/config/incident-cards');
					const { gameWss } = await import('../websocket');

					const incident = getIncidentById('INC-010');
					if (incident) {
						const triggerResult = triggerIncident(session, 'INC-010');

						if (triggerResult.success) {
							const effectResult = applyIncidentEffects(session, incident);

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
									round: incident.round,
									effects: incident.effects,
									displayDurationMs: 10000
								}
							});

							gameWss.broadcastToRoom(roomCode, {
								type: 'incident_effects_applied',
								incidentId: incident.id,
								changes: effectResult.changes
							});

							gameWss.broadcastToRoom(roomCode, {
								type: 'game_state_update',
								incident_history: session.incident_history
							});

							gameLogger.event('automatic_incident_triggered', {
								roomCode,
								incidentId: 'INC-010',
								incidentName: 'DMARC Enforcement',
								round: 3
							});
						}
					}
				} catch (err) {
					gameLogger.error(err as Error, {
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
