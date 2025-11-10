/**
 * Timer Manager
 * US-1.4: Resources Allocation
 * US-3.2: Decision Lock-In (auto-lock at timer expiry)
 *
 * Manages phase timers
 * - Initialize timer with duration
 * - Track remaining time
 * - Start/stop timer
 * - Get timer state
 * - Auto-lock players when planning phase timer expires
 * - Broadcast 15-second warning before auto-lock
 */

import { getSession, updateActivity } from './session-manager';
import { validateRoomCode } from './validation/room-validator';
import type { GameTimer } from './types';
import { gameLogger } from '../logger';
import { autoLockAllPlayers } from './lock-in-manager';
import { transitionPhase } from './phase-manager';
import { handleResolutionPhase } from './resolution-phase-handler';

// ============================================================================
// TYPES
// ============================================================================

export interface TimerInitializeRequest {
	roomCode: string;
	duration: number; // in seconds
}

export interface TimerInitializeResult {
	success: boolean;
	error?: string;
}

export interface TimerStateRequest {
	roomCode: string;
}

export type TimerState = GameTimer | null;

export interface TimerStopRequest {
	roomCode: string;
}

export interface TimerStopResult {
	success: boolean;
	error?: string;
}

export interface TimerConfig {
	duration: number;
}

// Export types
export type { GameTimer };

// ============================================================================
// AUTO-LOCK WARNING TRACKING
// ============================================================================

// Track which rooms have received the 15-second warning (to avoid duplicate warnings)
const warningsSent = new Set<string>();

// Track which rooms have been auto-locked (to avoid duplicate auto-locks)
const autoLockedRooms = new Set<string>();

/**
 * Reset warning and auto-lock tracking for a room (when phase changes)
 */
export function resetTimerTracking(roomCode: string): void {
	warningsSent.delete(roomCode);
	autoLockedRooms.delete(roomCode);
}

// ============================================================================
// TIMER INITIALIZATION
// ============================================================================

/**
 * Initialize a timer for a game session
 * @param request Timer initialization request
 * @returns Result indicating success or error
 */
export function initializeTimer(request: TimerInitializeRequest): TimerInitializeResult {
	const { roomCode, duration } = request;

	// Validate room code
	const roomValidation = validateRoomCode(roomCode);
	if (!roomValidation.isValidFormat || !roomValidation.exists) {
		gameLogger.event('timer_initialization_failed', {
			roomCode,
			reason: roomValidation.error
		});

		return {
			success: false,
			error: roomValidation.error || 'Room not found. Please check the code.'
		};
	}

	// Validate duration
	if (duration < 0) {
		gameLogger.event('timer_initialization_failed', {
			roomCode,
			duration,
			reason: 'Invalid duration'
		});

		return {
			success: false,
			error: 'Invalid duration: must be non-negative'
		};
	}

	const session = roomValidation.session!;

	try {
		// Reset auto-lock tracking for new phase
		resetTimerTracking(roomCode);

		// Create timer
		const timer: GameTimer = {
			duration,
			remaining: duration,
			startedAt: new Date(),
			isRunning: true
		};

		// Store timer in session
		session.timer = timer;

		// Update activity
		updateActivity(roomCode);

		// Log timer start
		const expectedEnd = new Date(timer.startedAt.getTime() + duration * 1000);
		gameLogger.event('timer_started', {
			roomCode,
			phase: session.current_phase,
			duration,
			expectedEnd: expectedEnd.toISOString(),
			clientsCount:
				session.esp_teams.filter((t) => t.players.length > 0).length +
				session.destinations.filter((d) => d.players.length > 0).length
		});

		return {
			success: true
		};
	} catch (error) {
		gameLogger.error(error as Error, {
			context: 'initializeTimer',
			roomCode,
			duration
		});

		return {
			success: false,
			error: 'Timer initialization failed'
		};
	}
}

// ============================================================================
// TIMER STATE
// ============================================================================

/**
 * Get the current timer state for a game session
 * @param request Timer state request
 * @returns Timer state or null if not found
 */
export function getTimerState(request: TimerStateRequest): TimerState {
	const { roomCode } = request;

	// Validate room code
	const roomValidation = validateRoomCode(roomCode);
	if (!roomValidation.isValidFormat || !roomValidation.exists) {
		return null;
	}

	const session = roomValidation.session!;

	// Return timer or null if not initialized
	return session.timer || null;
}

/**
 * Calculate remaining time based on elapsed time
 * @param roomCode The room code
 * @returns Remaining time in seconds or null if timer not found
 */
export function calculateRemainingTime(roomCode: string): number | null {
	const timer = getTimerState({ roomCode });

	if (!timer || !timer.isRunning) {
		return null;
	}

	const elapsed = Math.floor((Date.now() - timer.startedAt.getTime()) / 1000);
	const remaining = Math.max(0, timer.duration - elapsed);

	return remaining;
}

// ============================================================================
// TIMER CONTROL
// ============================================================================

/**
 * Stop a timer
 * @param request Timer stop request
 * @returns Result indicating success or error
 */
export function stopTimer(request: TimerStopRequest): TimerStopResult {
	const { roomCode } = request;

	// Validate room code
	const roomValidation = validateRoomCode(roomCode);
	if (!roomValidation.isValidFormat || !roomValidation.exists) {
		return {
			success: false,
			error: roomValidation.error || 'Room not found. Please check the code.'
		};
	}

	const session = roomValidation.session!;

	if (!session.timer) {
		return {
			success: false,
			error: 'No timer found for this session'
		};
	}

	try {
		// Stop timer
		session.timer.isRunning = false;
		session.timer.remaining = calculateRemainingTime(roomCode) || 0;

		// Update activity
		updateActivity(roomCode);

		// Log timer stop
		gameLogger.event('timer_stopped', {
			roomCode,
			phase: session.current_phase,
			remainingTime: session.timer.remaining
		});

		return {
			success: true
		};
	} catch (error) {
		gameLogger.error(error as Error, {
			context: 'stopTimer',
			roomCode
		});

		return {
			success: false,
			error: 'Failed to stop timer'
		};
	}
}

/**
 * Update timer remaining time
 * Used by WebSocket broadcast interval to sync remaining time
 *
 * US-3.2: Handles auto-lock warnings and execution:
 * - At 15 seconds: broadcasts auto_lock_warning message
 * - At 0 seconds: auto-locks all players and transitions to resolution
 *
 * @param roomCode The room code
 * @param remaining Remaining time in seconds
 * @param broadcastWarning Optional callback to broadcast warning (for WebSocket integration)
 * @returns Success boolean
 */
export function updateTimerRemaining(
	roomCode: string,
	remaining: number,
	broadcastWarning?: (roomCode: string, message: any) => void
): boolean {
	const roomValidation = validateRoomCode(roomCode);
	if (!roomValidation.isValidFormat || !roomValidation.exists) {
		return false;
	}

	const session = roomValidation.session!;

	if (!session.timer || !session.timer.isRunning) {
		return false;
	}

	session.timer.remaining = Math.max(0, remaining);

	// US-3.2: Broadcast 15-second warning (only once per phase)
	if (
		session.current_phase === 'planning' &&
		session.timer.remaining <= 15 &&
		session.timer.remaining > 0 &&
		!warningsSent.has(roomCode)
	) {
		warningsSent.add(roomCode);

		gameLogger.event('auto_lock_warning_sent', {
			roomCode,
			remainingTime: session.timer.remaining
		});

		// Broadcast warning if callback provided
		if (broadcastWarning) {
			broadcastWarning(roomCode, {
				type: 'auto_lock_warning',
				data: {
					remainingSeconds: session.timer.remaining,
					message: 'Decisions will be automatically locked in 15 seconds'
				}
			});
		}
	}

	// US-3.2: Auto-lock at timer expiry (only once per phase)
	if (session.timer.remaining === 0 && !autoLockedRooms.has(roomCode)) {
		autoLockedRooms.add(roomCode);
		session.timer.isRunning = false;

		gameLogger.event('timer_expired', {
			roomCode,
			phase: session.current_phase
		});

		// Auto-lock all players if in planning phase
		if (session.current_phase === 'planning') {
			gameLogger.info('Timer expired - triggering auto-lock', { roomCode });

			// Auto-lock all unlocked players
			autoLockAllPlayers(roomCode);

			// Transition to resolution phase
			const transitionResult = transitionPhase({
				roomCode,
				toPhase: 'resolution'
			});

			if (transitionResult.success) {
				gameLogger.info('Phase transitioned to resolution after timer expiry', { roomCode });

				// Broadcast phase transition if callback provided
				if (broadcastWarning) {
					broadcastWarning(roomCode, {
						type: 'phase_transition',
						data: {
							phase: 'resolution',
							round: transitionResult.round,
							message: "Time's up! All decisions locked - Starting Resolution"
						}
					});
				}

				// US-3.5: Trigger resolution calculation and consequences transition
				handleResolutionPhase(session, roomCode, broadcastWarning);
			}

			// Reset tracking for next phase
			resetTimerTracking(roomCode);
		}
	}

	return true;
}
