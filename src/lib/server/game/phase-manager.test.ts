/**
 * US-1.4: Resources Allocation - Phase Manager Tests
 *
 * Tests game phase transition functionality including:
 * - Transition from resource_allocation to planning phase
 * - Setting round to 1 when entering planning phase
 * - Recording phase start time
 * - WebSocket game_state_update message broadcasting
 *
 * Uses ATDD approach following Gherkin scenarios from feature file
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { createGameSession, getSession, getAllSessions, deleteSession } from './session-manager';
import { joinGame, clearPlayers } from './player-manager';
import { startGame } from './game-start-manager';
import { allocateResources } from './resource-allocation-manager';

// Phase manager functions (to be implemented)
import {
	transitionPhase,
	canTransitionPhase,
	type PhaseTransitionResult,
	type GamePhase
} from './phase-manager';

describe('Feature: Game Phase Management - Business Logic', () => {
	beforeEach(() => {
		// Clean up all sessions and players before each test
		const sessions = getAllSessions();
		sessions.forEach((session) => deleteSession(session.roomCode));
		clearPlayers();
	});

	// ============================================================================
	// PHASE TRANSITION TO PLANNING
	// ============================================================================

	describe('Scenario: Game transitions to Planning Phase', () => {
		test('Given resources allocated, When transition to planning completes, Then phase is planning and round is 1', async () => {
			// Given - Create session and allocate resources
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
				teamName: 'Gmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });

			// Verify current state
			let currentSession = getSession(session.roomCode);
			expect(currentSession?.current_phase).toBe('resource_allocation');
			expect(currentSession?.current_round).toBe(0);

			// When - Transition to planning phase
			const result = await transitionPhase({
				roomCode: session.roomCode,
				toPhase: 'planning'
			});

			// Then
			expect(result.success).toBe(true);

			const updatedSession = getSession(session.roomCode);
			expect(updatedSession?.current_phase).toBe('planning');
			expect(updatedSession?.current_round).toBe(1);
		});

		test('When transitioning to planning, Then phase start time should be recorded', () => {
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
				teamName: 'Gmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });

			const beforeTransition = new Date();

			// When
			transitionPhase({
				roomCode: session.roomCode,
				toPhase: 'planning'
			});

			const afterTransition = new Date();

			// Then
			const updatedSession = getSession(session.roomCode);
			expect(updatedSession?.phase_start_time).toBeDefined();
			expect(updatedSession!.phase_start_time).toBeInstanceOf(Date);

			// Verify timestamp is within reasonable range
			const phaseStartTime = updatedSession!.phase_start_time!;
			expect(phaseStartTime.getTime()).toBeGreaterThanOrEqual(beforeTransition.getTime());
			expect(phaseStartTime.getTime()).toBeLessThanOrEqual(afterTransition.getTime());
		});
	});

	// ============================================================================
	// PHASE TRANSITION VALIDATION
	// ============================================================================

	describe('Scenario: Phase transition validation', () => {
		test('When checking if can transition from resource_allocation to planning, Then it should return true', () => {
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
				teamName: 'Gmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });

			// When
			const validation = canTransitionPhase({
				roomCode: session.roomCode,
				toPhase: 'planning'
			});

			// Then
			expect(validation.canTransition).toBe(true);
		});

		test('When trying to transition from lobby to planning (skipping resource_allocation), Then it should fail', () => {
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
				teamName: 'Gmail'
			});

			// Don't start game - still in lobby

			// When
			const validation = canTransitionPhase({
				roomCode: session.roomCode,
				toPhase: 'planning'
			});

			// Then
			expect(validation.canTransition).toBe(false);
			expect(validation.reason).toContain('Invalid phase transition');
		});

		test('When trying to transition with invalid room code, Then it should fail', () => {
			// When
			const validation = canTransitionPhase({
				roomCode: 'NOROOM',
				toPhase: 'planning'
			});

			// Then
			expect(validation.canTransition).toBe(false);
			expect(validation.reason).toBe('Room not found. Please check the code.');
		});
	});

	// ============================================================================
	// PHASE TRANSITION ERRORS
	// ============================================================================

	describe('Scenario: Phase transition error handling', () => {
		test('When transition fails, Then game should remain in current phase', async () => {
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
				teamName: 'Gmail'
			});

			// Session is in lobby - try to transition to planning (should fail)
			// When
			const result = await transitionPhase({
				roomCode: session.roomCode,
				toPhase: 'planning'
			});

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();

			const updatedSession = getSession(session.roomCode);
			expect(updatedSession?.current_phase).toBe('lobby'); // Should remain in lobby
			expect(updatedSession?.current_round).toBe(0);
		});
	});

	// ============================================================================
	// PHASE FLOW
	// ============================================================================

	describe('Scenario: Complete phase flow from lobby to planning', () => {
		test('Given lobby phase, When transitioning through proper flow, Then all phases transition correctly', () => {
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
				teamName: 'Gmail'
			});

			// Initial state
			expect(getSession(session.roomCode)?.current_phase).toBe('lobby');
			expect(getSession(session.roomCode)?.current_round).toBe(0);

			// When - Transition to resource_allocation
			startGame({ roomCode: session.roomCode, facilitatorId });
			expect(getSession(session.roomCode)?.current_phase).toBe('resource_allocation');
			expect(getSession(session.roomCode)?.current_round).toBe(0);

			// And - Allocate resources
			allocateResources({ roomCode: session.roomCode });

			// And - Transition to planning
			transitionPhase({
				roomCode: session.roomCode,
				toPhase: 'planning'
			});

			// Then - Should be in planning with round 1
			const finalSession = getSession(session.roomCode);
			expect(finalSession?.current_phase).toBe('planning');
			expect(finalSession?.current_round).toBe(1);
			expect(finalSession?.phase_start_time).toBeDefined();
		});
	});

	// ============================================================================
	// TRANSITION MESSAGE STRUCTURE
	// ============================================================================

	describe('Scenario: Phase transition returns correct data structure', () => {
		test('When transition succeeds, Then result should contain phase, round, and timestamp info', async () => {
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
				teamName: 'Gmail'
			});

			startGame({ roomCode: session.roomCode, facilitatorId });
			allocateResources({ roomCode: session.roomCode });

			// When
			const result = await transitionPhase({
				roomCode: session.roomCode,
				toPhase: 'planning'
			});

			// Then
			expect(result.success).toBe(true);
			expect(result.phase).toBe('planning');
			expect(result.round).toBe(1);
			expect(result.phaseStartTime).toBeDefined();
			expect(result.phaseStartTime).toBeInstanceOf(Date);
		});
	});
});
