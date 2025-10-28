/**
 * Timer Manager
 * US-1.4: Resources Allocation
 *
 * Manages phase timers
 * - Initialize timer with duration
 * - Track remaining time
 * - Start/stop timer
 * - Get timer state
 */

import { getSession, updateActivity } from './session-manager';
import { validateRoomCode } from './validation/room-validator';
import type { GameTimer } from './types';
import { gameLogger } from '../logger';

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
			clientsCount: session.esp_teams.filter((t) => t.players.length > 0).length +
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
 * @param roomCode The room code
 * @param remaining Remaining time in seconds
 * @returns Success boolean
 */
export function updateTimerRemaining(roomCode: string, remaining: number): boolean {
	const roomValidation = validateRoomCode(roomCode);
	if (!roomValidation.isValidFormat || !roomValidation.exists) {
		return false;
	}

	const session = roomValidation.session!;

	if (!session.timer || !session.timer.isRunning) {
		return false;
	}

	session.timer.remaining = Math.max(0, remaining);

	// Auto-stop timer if remaining reaches 0
	if (session.timer.remaining === 0) {
		session.timer.isRunning = false;
		gameLogger.event('timer_expired', {
			roomCode,
			phase: session.current_phase
		});
	}

	return true;
}
