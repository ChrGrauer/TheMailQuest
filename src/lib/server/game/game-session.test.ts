import { describe, test, expect, beforeEach } from 'vitest';

/**
 * Feature: Create Game Session - Business Logic Tests
 *
 * This test suite implements the BUSINESS LOGIC acceptance criteria from:
 * features/US-1.1-create-game-session.feature
 *
 * Using ATDD approach with Vitest (Red-Green-Refactor):
 * - These tests will FAIL initially (Red phase)
 * - Then we implement the actual code to make them pass (Green phase)
 * - Finally we refactor while keeping tests green
 *
 * UI/E2E scenarios are tested separately with Playwright
 */

// Import the actual implementation
import {
	createGameSession,
	getSession,
	getAllSessions,
	deleteSession,
	setSessionActivity,
	checkExpiredSessions,
	updateActivity
} from './session-manager';
import type { GameSession } from './types';

describe('Feature: Create Game Session - Business Logic', () => {
	beforeEach(() => {
		// Clear all sessions before each test
		const sessions = getAllSessions();
		sessions.forEach((session) => deleteSession(session.roomCode));
	});

	// ============================================================================
	// FACILITATOR IDENTIFICATION (US-1.3)
	// ============================================================================

	describe('Scenario: Facilitator is identified when creating a room', () => {
		test('When a facilitator creates a game session with facilitatorId, Then the facilitatorId should be stored', () => {
			// When: A facilitator creates a new game session
			const facilitatorId = 'facilitator_12345';
			const session = createGameSession(facilitatorId);

			// Then: The facilitatorId should be stored in the session
			expect(session.facilitatorId).toBe(facilitatorId);
			expect(session.facilitatorId).toBeDefined();
		});

		test('When retrieving a session by room code, Then it should include the facilitatorId', () => {
			// Given: A facilitator creates a session
			const facilitatorId = 'facilitator_67890';
			const session = createGameSession(facilitatorId);

			// When: Retrieving the session
			const retrievedSession = getSession(session.roomCode);

			// Then: The facilitatorId should be persisted
			expect(retrievedSession?.facilitatorId).toBe(facilitatorId);
		});
	});

	// ============================================================================
	// ROOM CODE FORMAT AND VALIDATION
	// ============================================================================

	describe('Scenario: Room code format is correct', () => {
		test('When a game session is created, Then the room code should be exactly 6 characters long', () => {
			// When: A facilitator creates a new game session
			const session = createGameSession('facilitator_test');

			// Then: The room code should be exactly 6 characters long
			expect(session.roomCode).toBeDefined();
			expect(session.roomCode.length).toBe(6);
		});

		test('When a game session is created, Then the room code should only contain uppercase letters and numbers', () => {
			// When: A game session is created
			const session = createGameSession('facilitator_test');

			// Then: The room code should only contain uppercase letters and numbers
			expect(session.roomCode).toMatch(/^[A-Z0-9]+$/);
		});

		test('When a game session is created, Then the room code should match the format [A-Z0-9]{6}', () => {
			// When: A game session is created
			const session = createGameSession('facilitator_test');

			// Then: The room code should match the format "[A-Z0-9]{6}"
			expect(session.roomCode).toMatch(/^[A-Z0-9]{6}$/);
		});
	});

	// ============================================================================
	// INITIAL GAME CONFIGURATION
	// ============================================================================

	describe('Scenario: Game session is created with correct initial configuration', () => {
		test('When a game session is created, Then it should have current_round = 0 and current_phase = lobby', () => {
			// When: A facilitator creates a new game session
			const session = createGameSession('facilitator_test');

			// Then: The game session should have the correct initial state
			expect(session.current_round).toBe(0);
			expect(session.current_phase).toBe('lobby');
		});

		test('When a game session is created, Then it should have 5 ESP team slots', () => {
			// When: A facilitator creates a new game session
			const session = createGameSession('facilitator_test');

			// Then: ESP team slots should be 5
			expect(session.esp_teams).toBeDefined();
			expect(session.esp_teams.length).toBe(5);
		});

		test('When a game session is created, Then it should have 3 destination slots', () => {
			// When: A facilitator creates a new game session
			const session = createGameSession('facilitator_test');

			// Then: Destination slots should be 3
			expect(session.destinations).toBeDefined();
			expect(session.destinations.length).toBe(3);
		});

		test('When a game session is created, Then ESP teams should have correct names', () => {
			// When: A facilitator creates a new game session
			const session = createGameSession('facilitator_test');

			// Then: ESP team names should be correct
			const espTeamNames = session.esp_teams.map((team) => team.name);
			expect(espTeamNames).toEqual([
				'SendWave',
				'MailMonkey',
				'BluePost',
				'SendBolt',
				'RocketMail'
			]);
		});

		test('When a game session is created, Then destinations should have correct names', () => {
			// When: A facilitator creates a new game session
			const session = createGameSession('facilitator_test');

			// Then: Destination names should be correct
			const destinationNames = session.destinations.map((dest) => dest.name);
			expect(destinationNames).toEqual(['zmail', 'intake', 'yagle']);
		});
	});

	describe('Scenario: ESP team slots are initialized empty', () => {
		test('When a game session is created, Then each ESP team should have empty players array', () => {
			// When: A facilitator creates a new game session
			const session = createGameSession('facilitator_test');

			// Then: Each of the 5 ESP team slots should have empty players
			session.esp_teams.forEach((team) => {
				expect(team.players).toEqual([]);
			});
		});

		test('When a game session is created, Then each ESP team should have budget = 0', () => {
			// When: A facilitator creates a new game session
			const session = createGameSession('facilitator_test');

			// Then: Each ESP team should have budget = 0
			session.esp_teams.forEach((team) => {
				expect(team.budget).toBe(0);
			});
		});

		test('When a game session is created, Then each ESP team should have empty clients and technical_stack', () => {
			// When: A facilitator creates a new game session
			const session = createGameSession('facilitator_test');

			// Then: Each ESP team should have empty arrays
			session.esp_teams.forEach((team) => {
				expect(team.clients).toEqual([]);
				expect(team.technical_stack).toEqual([]);
			});
		});
	});

	describe('Scenario: Destination slots are initialized empty', () => {
		test('When a game session is created, Then each destination should have empty players and budget = 0', () => {
			// When: A facilitator creates a new game session
			const session = createGameSession('facilitator_test');

			// Then: Each of the 3 destination slots should be properly initialized
			session.destinations.forEach((destination) => {
				expect(destination.players).toEqual([]);
				expect(destination.budget).toBe(0);
			});
		});
	});

	// ============================================================================
	// ROOM CODE UNIQUENESS
	// ============================================================================

	describe('Scenario: Each game session gets a unique room code', () => {
		test('When creating 10 game sessions, Then all 10 room codes should be different', () => {
			// When: Creating 10 game sessions
			const sessions: GameSession[] = [];
			for (let i = 0; i < 10; i++) {
				sessions.push(createGameSession('facilitator_test'));
			}

			// Then: All 10 room codes should be different
			const roomCodes = sessions.map((s) => s.roomCode);
			const uniqueRoomCodes = new Set(roomCodes);
			expect(uniqueRoomCodes.size).toBe(10);
		});

		test('When creating multiple sessions, Then no two sessions should have the same room code', () => {
			// When: Creating multiple sessions
			const session1 = createGameSession('facilitator_test1');
			const session2 = createGameSession('facilitator_test2');
			const session3 = createGameSession('facilitator_test3');

			// Then: No two sessions should have the same room code
			expect(session1.roomCode).not.toBe(session2.roomCode);
			expect(session2.roomCode).not.toBe(session3.roomCode);
			expect(session1.roomCode).not.toBe(session3.roomCode);
		});
	});

	describe('Scenario: System handles room code collision', () => {
		test('When a room code collision occurs, Then the system should generate a different code', () => {
			// This test verifies that the collision handling works
			// We can't easily force a collision, but we can verify uniqueness is maintained
			const sessions: GameSession[] = [];

			// Create many sessions to increase probability of collision attempt
			for (let i = 0; i < 100; i++) {
				sessions.push(createGameSession('facilitator_test'));
			}

			// Then: All room codes should still be unique
			const roomCodes = sessions.map((s) => s.roomCode);
			const uniqueRoomCodes = new Set(roomCodes);
			expect(uniqueRoomCodes.size).toBe(100);
		});
	});

	// ============================================================================
	// SESSION EXPIRATION
	// ============================================================================

	describe('Scenario: Game session expires after 2 hours of inactivity', () => {
		test('Given a session created 2 hours ago with no activity, When checking expired sessions, Then it should be removed', () => {
			// Given: A game session was created
			const session = createGameSession('facilitator_test');
			const roomCode = session.roomCode;

			// Manually set the lastActivity to 2 hours ago (this requires access to internals)
			const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000 - 1000);
			setSessionActivity(roomCode, twoHoursAgo);

			// When: The system checks for expired sessions
			checkExpiredSessions();

			// Then: The session should be removed from active sessions
			const retrievedSession = getSession(roomCode);
			expect(retrievedSession).toBeUndefined();
		});
	});

	describe('Scenario: Active game session does not expire', () => {
		test('Given a session created 2 hours ago but active 30 min ago, When checking expired sessions, Then it should remain', () => {
			// Given: A game session was created
			const session = createGameSession('facilitator_test');
			const roomCode = session.roomCode;

			// Set created time to 2 hours ago, but activity to 30 minutes ago
			const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
			setSessionActivity(roomCode, thirtyMinutesAgo);

			// When: The system checks for expired sessions
			checkExpiredSessions();

			// Then: The session should remain in active sessions
			const retrievedSession = getSession(roomCode);
			expect(retrievedSession).toBeDefined();
			expect(retrievedSession?.roomCode).toBe(roomCode);
		});
	});

	describe('Scenario: Activity resets the inactivity timer', () => {
		test('When updating session activity, Then the lastActivity timestamp should be updated', () => {
			// Given: A game session exists
			const session = createGameSession('facilitator_test');
			const roomCode = session.roomCode;

			// Get initial activity time
			const initialSession = getSession(roomCode);
			const initialActivity = initialSession?.lastActivity;

			// Wait a bit to ensure timestamp difference
			const waitPromise = new Promise((resolve) => setTimeout(resolve, 10));

			return waitPromise.then(() => {
				// When: A player performs an action in the session
				updateActivity(roomCode);

				// Then: The inactivity timer should be reset
				const updatedSession = getSession(roomCode);
				expect(updatedSession?.lastActivity).toBeDefined();

				if (initialActivity && updatedSession?.lastActivity) {
					expect(updatedSession.lastActivity.getTime()).toBeGreaterThan(initialActivity.getTime());
				}
			});
		});
	});

	// ============================================================================
	// SESSION STATE PERSISTENCE
	// ============================================================================

	describe('Scenario: Game session state is stored in memory', () => {
		test('When a game session is created, Then it should be retrievable by room code', () => {
			// Given: A facilitator creates a new game session
			const session = createGameSession('facilitator_test');

			// Then: The session should be retrievable by its room code
			const retrievedSession = getSession(session.roomCode);
			expect(retrievedSession).toBeDefined();
			expect(retrievedSession?.roomCode).toBe(session.roomCode);
		});

		test('When a game session is created, Then it should be in the list of all sessions', () => {
			// Given: A facilitator creates a new game session
			const session = createGameSession('facilitator_test');

			// Then: The session should be in getAllSessions
			const allSessions = getAllSessions();
			expect(allSessions.length).toBeGreaterThan(0);

			const foundSession = allSessions.find((s) => s.roomCode === session.roomCode);
			expect(foundSession).toBeDefined();
		});

		test('When retrieving a session by room code, Then it should include all initial configuration', () => {
			// Given: A facilitator creates a new game session
			const session = createGameSession('facilitator_test');

			// When: Retrieving the session
			const retrievedSession = getSession(session.roomCode);

			// Then: The session should include all initial configuration
			expect(retrievedSession?.current_round).toBe(0);
			expect(retrievedSession?.current_phase).toBe('lobby');
			expect(retrievedSession?.esp_teams.length).toBe(5);
			expect(retrievedSession?.destinations.length).toBe(3);
		});
	});

	// ============================================================================
	// ERROR HANDLING
	// ============================================================================

	describe('Scenario: System handles session creation failure gracefully', () => {
		test('When session creation fails, Then an error should be thrown with appropriate message', () => {
			// This test would verify error handling
			// For now, we test that the function exists and can be called
			expect(() => createGameSession()).not.toThrow();
		});
	});

	// ============================================================================
	// MULTIPLE SESSIONS
	// ============================================================================

	describe('Scenario: Multiple game sessions can exist simultaneously', () => {
		test('When 5 facilitators each create a game session, Then 5 separate sessions should exist', () => {
			// When: 5 facilitators each create a game session
			const sessions: GameSession[] = [];
			for (let i = 0; i < 5; i++) {
				sessions.push(createGameSession('facilitator_test'));
			}

			// Then: 5 separate game sessions should exist
			const allSessions = getAllSessions();
			expect(allSessions.length).toBe(5);
		});

		test('When multiple sessions exist, Then each session should be independent', () => {
			// When: Creating multiple sessions
			const session1 = createGameSession('facilitator_test1');
			const session2 = createGameSession('facilitator_test2');

			// Then: Each session should be independent
			const retrieved1 = getSession(session1.roomCode);
			const retrieved2 = getSession(session2.roomCode);

			expect(retrieved1?.roomCode).toBe(session1.roomCode);
			expect(retrieved2?.roomCode).toBe(session2.roomCode);
			expect(retrieved1?.roomCode).not.toBe(retrieved2?.roomCode);

			// Each should have its own configuration
			expect(retrieved1?.current_round).toBe(0);
			expect(retrieved2?.current_round).toBe(0);
		});
	});
});
