/**
 * US-1.4: Resources Allocation - Timer Manager Tests
 *
 * Tests timer functionality including:
 * - Timer initialization with 300 seconds (5 minutes) for planning phase
 * - Timer countdown logic
 * - Timer state persistence
 * - Getting remaining time
 * - Timer logging
 *
 * Uses ATDD approach following Gherkin scenarios from feature file
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createGameSession, getSession, getAllSessions, deleteSession } from './session-manager';
import { joinGame, clearPlayers } from './player-manager';
import { startGame } from './game-start-manager';
import { allocateResources } from './resource-allocation-manager';
import { transitionPhase } from './phase-manager';

// Timer manager functions (to be implemented)
import {
	initializeTimer,
	getTimerState,
	stopTimer,
	calculateRemainingTime,
	type TimerState,
	type TimerConfig
} from './timer-manager';

describe('Feature: Timer Management - Business Logic', () => {
	beforeEach(() => {
		// Clean up all sessions and players before each test
		const sessions = getAllSessions();
		sessions.forEach((session) => deleteSession(session.roomCode));
		clearPlayers();

		// Reset timers
		vi.clearAllTimers();
	});

	// ============================================================================
	// TIMER INITIALIZATION
	// ============================================================================

	describe('Scenario: Game timer starts automatically', () => {
		test('Given game transitions to Planning Phase, When timer initializes, Then duration should be 300 seconds', () => {
			// Given
			const facilitatorId = 'facilitator_123';
			const session = createGameSession(facilitatorId);

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'zmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// When - Initialize timer for planning phase
			const result = initializeTimer({
				roomCode: session.roomCode,
				duration: 300
			});

			// Then
			expect(result.success).toBe(true);

			const timerState = getTimerState({ roomCode: session.roomCode });
			expect(timerState).toBeDefined();
			expect(timerState?.duration).toBe(300);
			expect(timerState?.remaining).toBe(300);
		});

		test('When timer is initialized, Then start time should be recorded', () => {
			// Given
			const facilitatorId = 'facilitator_123';
			const session = createGameSession(facilitatorId);

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'zmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			const beforeInit = new Date();

			// When
			initializeTimer({
				roomCode: session.roomCode,
				duration: 300
			});

			const afterInit = new Date();

			// Then
			const timerState = getTimerState({ roomCode: session.roomCode });
			expect(timerState?.startedAt).toBeDefined();
			expect(timerState!.startedAt).toBeInstanceOf(Date);

			// Verify timestamp is within reasonable range
			expect(timerState!.startedAt.getTime()).toBeGreaterThanOrEqual(beforeInit.getTime());
			expect(timerState!.startedAt.getTime()).toBeLessThanOrEqual(afterInit.getTime());
		});
	});

	// ============================================================================
	// TIMER STATE
	// ============================================================================

	describe('Scenario: Timer state is accessible', () => {
		test('When timer is initialized, Then state should be retrievable and include all properties', () => {
			// Given
			const facilitatorId = 'facilitator_123';
			const session = createGameSession(facilitatorId);

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'zmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// When
			initializeTimer({
				roomCode: session.roomCode,
				duration: 300
			});

			// Then
			const timerState = getTimerState({ roomCode: session.roomCode });
			expect(timerState).toBeDefined();
			expect(timerState?.duration).toBe(300);
			expect(timerState?.remaining).toBe(300);
			expect(timerState?.startedAt).toBeInstanceOf(Date);
			expect(timerState?.isRunning).toBe(true);
		});

		test('When requesting timer for non-existent room, Then it should return null', () => {
			// When
			const timerState = getTimerState({ roomCode: 'NOROOM' });

			// Then
			expect(timerState).toBeNull();
		});
	});

	// ============================================================================
	// TIMER MANAGEMENT
	// ============================================================================

	describe('Scenario: Timer can be stopped', () => {
		test('Given timer is running, When stop is called, Then timer should stop and isRunning should be false', () => {
			// Given
			const facilitatorId = 'facilitator_123';
			const session = createGameSession(facilitatorId);

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'zmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			initializeTimer({
				roomCode: session.roomCode,
				duration: 300
			});

			// Verify timer is running
			let timerState = getTimerState({ roomCode: session.roomCode });
			expect(timerState?.isRunning).toBe(true);

			// When
			const result = stopTimer({ roomCode: session.roomCode });

			// Then
			expect(result.success).toBe(true);

			timerState = getTimerState({ roomCode: session.roomCode });
			expect(timerState?.isRunning).toBe(false);
		});
	});

	// ============================================================================
	// TIMER CONFIGURATION
	// ============================================================================

	describe('Scenario: Timer supports different durations', () => {
		test('When initializing timer with custom duration, Then it should use that duration', () => {
			// Given
			const facilitatorId = 'facilitator_123';
			const session = createGameSession(facilitatorId);

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'zmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// When - Initialize with custom duration (e.g., 180 seconds = 3 minutes)
			initializeTimer({
				roomCode: session.roomCode,
				duration: 180
			});

			// Then
			const timerState = getTimerState({ roomCode: session.roomCode });
			expect(timerState?.duration).toBe(180);
			expect(timerState?.remaining).toBe(180);
		});
	});

	// ============================================================================
	// ERROR HANDLING
	// ============================================================================

	describe('Scenario: Timer initialization error handling', () => {
		test('When trying to initialize timer for non-existent room, Then it should fail gracefully', () => {
			// When
			const result = initializeTimer({
				roomCode: 'NOROOM',
				duration: 300
			});

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toBe('Room not found. Please check the code.');
		});

		test('When trying to initialize timer with invalid duration, Then it should fail', () => {
			// Given
			const facilitatorId = 'facilitator_123';
			const session = createGameSession(facilitatorId);

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'zmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// When - Try with negative duration
			const result = initializeTimer({
				roomCode: session.roomCode,
				duration: -10
			});

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toContain('Invalid duration');
		});
	});

	// ============================================================================
	// TIMER PERSISTENCE
	// ============================================================================

	describe('Scenario: Timer state persists in session', () => {
		test('When timer is initialized, Then session should contain timer data', () => {
			// Given
			const facilitatorId = 'facilitator_123';
			const session = createGameSession(facilitatorId);

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'zmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// When
			initializeTimer({
				roomCode: session.roomCode,
				duration: 300
			});

			// Then
			const updatedSession = getSession(session.roomCode);
			expect(updatedSession?.timer).toBeDefined();
			expect(updatedSession?.timer?.duration).toBe(300);
			expect(updatedSession?.timer?.remaining).toBe(300);
		});
	});

	// ============================================================================
	// TIMER CALCULATION - SERVER AUTHORITY
	// ============================================================================

	describe('Scenario: Server timer calculation is authoritative', () => {
		test('Given timer is initialized, When remaining field is corrupted, Then calculateRemainingTime uses startedAt as source of truth', () => {
			// Given
			const facilitatorId = 'facilitator_123';
			const session = createGameSession(facilitatorId);

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'zmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// Initialize timer with 300 seconds
			initializeTimer({
				roomCode: session.roomCode,
				duration: 300
			});

			// When - Manually corrupt the remaining field (simulate client manipulation)
			const updatedSession = getSession(session.roomCode);
			updatedSession!.timer!.remaining = 999; // Wrong value

			// Then - Calculate remaining time should ignore corrupted value
			const remaining = calculateRemainingTime(session.roomCode);

			// Should be ~300 (or slightly less due to test execution time), NOT 999
			expect(remaining).not.toBe(999);
			expect(remaining).toBeGreaterThan(290);
			expect(remaining).toBeLessThanOrEqual(300);
		});

		test('Given timer has been running, When remaining field is set to 0, Then calculateRemainingTime still calculates from startedAt', () => {
			// Given
			const facilitatorId = 'facilitator_123';
			const session = createGameSession(facilitatorId);

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'zmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });
			transitionPhase({ roomCode: session.roomCode, toPhase: 'planning' });

			// Initialize timer with 300 seconds
			initializeTimer({
				roomCode: session.roomCode,
				duration: 300
			});

			// When - Corrupt remaining to 0 (simulate malicious client trying to force timer expiry)
			const updatedSession = getSession(session.roomCode);
			updatedSession!.timer!.remaining = 0;

			// Then - Calculate remaining time should still be ~300
			const remaining = calculateRemainingTime(session.roomCode);

			// Should be ~300, NOT 0
			expect(remaining).not.toBe(0);
			expect(remaining).toBeGreaterThan(290);
			expect(remaining).toBeLessThanOrEqual(300);
		});
	});
});
