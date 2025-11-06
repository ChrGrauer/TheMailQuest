/**
 * Session Validator Tests
 *
 * Tests session validation logic: game started, full session checks.
 * Note: Session expiration is already tested in game-session.test.ts
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
	canJoinSession,
	isSessionFull,
	hasGameStarted,
	isSessionExpired
} from './session-validator';
import { createGameSession, deleteSession, getAllSessions, getSession } from '../session-manager';
import { joinGame, clearPlayers } from '../player-manager';

describe('Session Validator', () => {
	beforeEach(() => {
		// Clean up before each test
		const sessions = getAllSessions();
		sessions.forEach((session) => deleteSession(session.roomCode));
		clearPlayers();
	});

	afterEach(() => {
		// Clean up after each test
		const sessions = getAllSessions();
		sessions.forEach((session) => deleteSession(session.roomCode));
		clearPlayers();
	});

	// ============================================================================
	// CAN JOIN SESSION - COMPREHENSIVE CHECKS
	// ============================================================================

	describe('canJoinSession()', () => {
		test('should allow joining valid empty session', () => {
			const session = createGameSession();

			const result = canJoinSession(session.roomCode);

			expect(result.canJoin).toBe(true);
			expect(result.reason).toBeUndefined();
		});

		test('should reject non-existent session', () => {
			const result = canJoinSession('XYZ999');

			expect(result.canJoin).toBe(false);
			expect(result.reason).toBe('Room not found. Please check the code.');
		});

		test('should allow joining session with some players', () => {
			const session = createGameSession();

			// Add 3 players
			joinGame({
				roomCode: session.roomCode,
				displayName: 'Player1',
				role: 'ESP',
				teamName: 'SendWave'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Player2',
				role: 'ESP',
				teamName: 'MailMonkey'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Player3',
				role: 'Destination',
				teamName: 'Gmail'
			});

			const result = canJoinSession(session.roomCode);

			expect(result.canJoin).toBe(true);
			expect(result.reason).toBeUndefined();
		});

		test('should reject joining full session (8 players)', () => {
			const session = createGameSession();

			// Fill all 5 ESP teams
			const espTeams = ['SendWave', 'MailMonkey', 'BluePost', 'SendBolt', 'RocketMail'];
			espTeams.forEach((team, index) => {
				joinGame({
					roomCode: session.roomCode,
					displayName: `ESPPlayer${index + 1}`,
					role: 'ESP',
					teamName: team
				});
			});

			// Fill all 3 destinations
			const destinations = ['Gmail', 'Outlook', 'Yahoo'];
			destinations.forEach((dest, index) => {
				joinGame({
					roomCode: session.roomCode,
					displayName: `DestPlayer${index + 1}`,
					role: 'Destination',
					teamName: dest
				});
			});

			const result = canJoinSession(session.roomCode);

			expect(result.canJoin).toBe(false);
			expect(result.reason).toBe('This session is full');
		});

		test('should reject joining session where game has started', () => {
			const session = createGameSession();

			// Manually set game as started
			const freshSession = getSession(session.roomCode);
			if (freshSession) {
				freshSession.current_round = 1;
			}

			const result = canJoinSession(session.roomCode);

			expect(result.canJoin).toBe(false);
			expect(result.reason).toBe('This game has already started');
		});

		test('should allow joining at exactly 7 players (not full yet)', () => {
			const session = createGameSession();

			// Add 7 players (4 ESP + 3 Destinations)
			joinGame({
				roomCode: session.roomCode,
				displayName: 'P1',
				role: 'ESP',
				teamName: 'SendWave'
			});
			joinGame({
				roomCode: session.roomCode,
				displayName: 'P2',
				role: 'ESP',
				teamName: 'MailMonkey'
			});
			joinGame({
				roomCode: session.roomCode,
				displayName: 'P3',
				role: 'ESP',
				teamName: 'BluePost'
			});
			joinGame({
				roomCode: session.roomCode,
				displayName: 'P4',
				role: 'ESP',
				teamName: 'SendBolt'
			});
			joinGame({
				roomCode: session.roomCode,
				displayName: 'P5',
				role: 'Destination',
				teamName: 'Gmail'
			});
			joinGame({
				roomCode: session.roomCode,
				displayName: 'P6',
				role: 'Destination',
				teamName: 'Outlook'
			});
			joinGame({
				roomCode: session.roomCode,
				displayName: 'P7',
				role: 'Destination',
				teamName: 'Yahoo'
			});

			const result = canJoinSession(session.roomCode);

			expect(result.canJoin).toBe(true);
		});
	});

	// ============================================================================
	// SESSION FULL CHECK
	// ============================================================================

	describe('isSessionFull()', () => {
		test('should return false for empty session', () => {
			const session = createGameSession();
			const freshSession = getSession(session.roomCode)!;

			expect(isSessionFull(freshSession)).toBe(false);
		});

		test('should return false for partially filled session', () => {
			const session = createGameSession();

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Player1',
				role: 'ESP',
				teamName: 'SendWave'
			});

			const freshSession = getSession(session.roomCode)!;
			expect(isSessionFull(freshSession)).toBe(false);
		});

		test('should return true when all 8 slots are occupied', () => {
			const session = createGameSession();

			// Fill all slots
			const espTeams = ['SendWave', 'MailMonkey', 'BluePost', 'SendBolt', 'RocketMail'];
			espTeams.forEach((team, index) => {
				joinGame({
					roomCode: session.roomCode,
					displayName: `ESP${index}`,
					role: 'ESP',
					teamName: team
				});
			});

			const destinations = ['Gmail', 'Outlook', 'Yahoo'];
			destinations.forEach((dest, index) => {
				joinGame({
					roomCode: session.roomCode,
					displayName: `Dest${index}`,
					role: 'Destination',
					teamName: dest
				});
			});

			const freshSession = getSession(session.roomCode)!;
			expect(isSessionFull(freshSession)).toBe(true);
		});

		test('should return false at exactly 7 players', () => {
			const session = createGameSession();

			// Add 7 players
			joinGame({
				roomCode: session.roomCode,
				displayName: 'P1',
				role: 'ESP',
				teamName: 'SendWave'
			});
			joinGame({
				roomCode: session.roomCode,
				displayName: 'P2',
				role: 'ESP',
				teamName: 'MailMonkey'
			});
			joinGame({
				roomCode: session.roomCode,
				displayName: 'P3',
				role: 'ESP',
				teamName: 'BluePost'
			});
			joinGame({
				roomCode: session.roomCode,
				displayName: 'P4',
				role: 'ESP',
				teamName: 'SendBolt'
			});
			joinGame({
				roomCode: session.roomCode,
				displayName: 'P5',
				role: 'Destination',
				teamName: 'Gmail'
			});
			joinGame({
				roomCode: session.roomCode,
				displayName: 'P6',
				role: 'Destination',
				teamName: 'Outlook'
			});
			joinGame({
				roomCode: session.roomCode,
				displayName: 'P7',
				role: 'Destination',
				teamName: 'Yahoo'
			});

			const freshSession = getSession(session.roomCode)!;
			expect(isSessionFull(freshSession)).toBe(false);
		});
	});

	// ============================================================================
	// GAME STARTED CHECK
	// ============================================================================

	describe('hasGameStarted()', () => {
		test('should return false for new session', () => {
			const session = createGameSession();
			const freshSession = getSession(session.roomCode)!;

			expect(hasGameStarted(freshSession)).toBe(false);
		});

		test('should return true when current_round > 0', () => {
			const session = createGameSession();
			const freshSession = getSession(session.roomCode)!;

			// Manually start the game
			freshSession.current_round = 1;

			expect(hasGameStarted(freshSession)).toBe(true);
		});

		test('should return true for any round > 0', () => {
			const session = createGameSession();
			const freshSession = getSession(session.roomCode)!;

			const rounds = [1, 2, 5, 10, 100];
			rounds.forEach((round) => {
				freshSession.current_round = round;
				expect(hasGameStarted(freshSession)).toBe(true);
			});
		});

		test('should return false when current_round is exactly 0', () => {
			const session = createGameSession();
			const freshSession = getSession(session.roomCode)!;

			// Explicitly set to 0
			freshSession.current_round = 0;

			expect(hasGameStarted(freshSession)).toBe(false);
		});
	});

	// ============================================================================
	// SESSION EXPIRED CHECK - BASIC TESTS
	// ============================================================================

	describe('isSessionExpired()', () => {
		test('should return false for freshly created session', () => {
			const session = createGameSession();
			const freshSession = getSession(session.roomCode)!;

			expect(isSessionExpired(freshSession)).toBe(false);
		});

		test('should return false for recently active session', () => {
			const session = createGameSession();
			const freshSession = getSession(session.roomCode)!;

			// Set activity to 1 hour ago
			freshSession.lastActivity = new Date(Date.now() - 60 * 60 * 1000);

			expect(isSessionExpired(freshSession)).toBe(false);
		});

		// Note: More comprehensive expiration tests are in game-session.test.ts
		// which tests the 2-hour timeout behavior with time mocking
	});
});
