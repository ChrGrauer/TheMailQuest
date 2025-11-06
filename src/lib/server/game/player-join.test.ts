/**
 * US-1.2: Join Game Session - Business Logic Tests
 *
 * Tests player joining functionality including:
 * - Room code validation
 * - Role selection and slot occupation
 * - Display name validation
 * - Duplicate role prevention
 * - Session state validation (expired, full, started)
 * - Error handling and logging
 *
 * Uses ATDD approach following Gherkin scenarios from feature file
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
	createGameSession,
	getSession,
	getAllSessions,
	deleteSession,
	setSessionActivity
} from './session-manager';
import type { GameSession } from './types';

// Player join functions
import {
	validateRoomCode,
	joinGame,
	isSlotAvailable,
	getAvailableSlots,
	canJoinSession,
	clearPlayers,
	type JoinGameRequest,
	type JoinGameResult,
	type SlotInfo
} from './player-manager';

describe('Feature: Join Game Session - Business Logic', () => {
	beforeEach(() => {
		// Clean up all sessions before each test
		const sessions = getAllSessions();
		sessions.forEach((session) => deleteSession(session.roomCode));

		// Clean up all players
		clearPlayers();
	});

	// ============================================================================
	// ROOM CODE VALIDATION
	// ============================================================================

	describe('Scenario: Room code format validation', () => {
		test('Given a room code with correct format (6 uppercase alphanumeric), when validated, then it passes format check', () => {
			// Given
			const validCodes = ['ABC123', 'XYZ999', 'TEST42', '123456', 'ABCDEF'];

			// When & Then
			for (const code of validCodes) {
				expect(validateRoomCode(code).isValidFormat).toBe(true);
			}
		});

		test('Given a room code with incorrect format, when validated, then it fails format check', () => {
			// Given
			const invalidCodes = [
				'AB12', // Too short
				'ABCDEFG', // Too long
				'abc123', // Lowercase
				'AB-123', // Special character
				'AB 123', // Space
				'' // Empty
			];

			// When & Then
			for (const code of invalidCodes) {
				const result = validateRoomCode(code);
				expect(result.isValidFormat).toBe(false);
				expect(result.error).toBe('Room code must be 6 characters');
			}
		});

		test('Given a valid format room code that exists, when validated, then it passes existence check', () => {
			// Given
			const session = createGameSession();

			// When
			const result = validateRoomCode(session.roomCode);

			// Then
			expect(result.isValidFormat).toBe(true);
			expect(result.exists).toBe(true);
			expect(result.session).toBeDefined();
			expect(result.session?.roomCode).toBe(session.roomCode);
		});

		test('Given a valid format room code that does not exist, when validated, then it fails existence check', () => {
			// Given
			const nonExistentCode = 'XYZ999';

			// When
			const result = validateRoomCode(nonExistentCode);

			// Then
			expect(result.isValidFormat).toBe(true);
			expect(result.exists).toBe(false);
			expect(result.error).toBe('Room not found. Please check the code.');
		});
	});

	// ============================================================================
	// PLAYER JOINS GAME - BASIC SCENARIOS
	// ============================================================================

	describe('Scenario: Player selects ESP team role and joins', () => {
		test('Given a player is on the lobby page, when player selects SendWave team with display name Alice, then player is added to the game session', () => {
			// Given - Create a session
			const session = createGameSession();
			const request: JoinGameRequest = {
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			};

			// When - Player joins
			const result = joinGame(request);

			// Then
			expect(result.success).toBe(true);
			expect(result.playerId).toBeDefined();
			expect(result.player).toBeDefined();
			expect(result.player?.displayName).toBe('Alice');
			expect(result.player?.role).toBe('ESP');
			expect(result.player?.teamName).toBe('SendWave');

			// Verify session is updated
			const updatedSession = getSession(session.roomCode);
			const sendWaveTeam = updatedSession?.esp_teams.find((t) => t.name === 'SendWave');
			expect(sendWaveTeam?.players).toHaveLength(1);
			expect(sendWaveTeam?.players[0]).toBe(result.playerId);
		});
	});

	describe('Scenario: Player selects Destination role and joins', () => {
		test('Given a player is on the lobby page, when player selects Gmail destination with display name Bob, then player is added to the game session', () => {
			// Given
			const session = createGameSession();
			const request: JoinGameRequest = {
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'Gmail'
			};

			// When
			const result = joinGame(request);

			// Then
			expect(result.success).toBe(true);
			expect(result.playerId).toBeDefined();
			expect(result.player?.displayName).toBe('Bob');
			expect(result.player?.role).toBe('Destination');
			expect(result.player?.teamName).toBe('Gmail');

			// Verify session is updated
			const updatedSession = getSession(session.roomCode);
			const gmailDestination = updatedSession?.destinations.find((d) => d.name === 'Gmail');
			expect(gmailDestination?.players).toHaveLength(1);
			expect(gmailDestination?.players[0]).toBe(result.playerId);
		});
	});

	describe('Scenario: Player cannot join with empty display name', () => {
		test('Given a player selects a role, when display name is empty, then validation error is shown', () => {
			// Given
			const session = createGameSession();
			const request: JoinGameRequest = {
				roomCode: session.roomCode,
				displayName: '',
				role: 'ESP',
				teamName: 'SendWave'
			};

			// When
			const result = joinGame(request);

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toBe('Name is required');

			// Verify player was not added to session
			const updatedSession = getSession(session.roomCode);
			const sendWaveTeam = updatedSession?.esp_teams.find((t) => t.name === 'SendWave');
			expect(sendWaveTeam?.players).toHaveLength(0);
		});

		test('Given a player selects a role, when display name is only whitespace, then validation error is shown', () => {
			// Given
			const session = createGameSession();
			const request: JoinGameRequest = {
				roomCode: session.roomCode,
				displayName: '   ',
				role: 'ESP',
				teamName: 'SendWave'
			};

			// When
			const result = joinGame(request);

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toBe('Name is required');
		});
	});

	// ============================================================================
	// PREVENT DUPLICATE ROLE SELECTION
	// ============================================================================

	describe('Scenario: Player cannot select already occupied ESP team slot', () => {
		test('Given Alice has joined as SendWave team, when Bob tries to select SendWave team, then the system prevents the selection', () => {
			// Given - Alice joins first
			const session = createGameSession();
			const aliceRequest: JoinGameRequest = {
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			};
			const aliceResult = joinGame(aliceRequest);
			expect(aliceResult.success).toBe(true);

			// When - Bob tries to join the same team
			const bobRequest: JoinGameRequest = {
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'ESP',
				teamName: 'SendWave'
			};
			const bobResult = joinGame(bobRequest);

			// Then
			expect(bobResult.success).toBe(false);
			expect(bobResult.error).toBe('This role is already taken');

			// Verify only Alice is in the team
			const updatedSession = getSession(session.roomCode);
			const sendWaveTeam = updatedSession?.esp_teams.find((t) => t.name === 'SendWave');
			expect(sendWaveTeam?.players).toHaveLength(1);
			expect(sendWaveTeam?.players[0]).toBe(aliceResult.playerId);
		});
	});

	describe('Scenario: Player cannot select already occupied Destination slot', () => {
		test('Given Alice has joined as Gmail destination, when Bob tries to select Gmail destination, then the system prevents the selection', () => {
			// Given - Alice joins first
			const session = createGameSession();
			const aliceRequest: JoinGameRequest = {
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'Destination',
				teamName: 'Gmail'
			};
			const aliceResult = joinGame(aliceRequest);
			expect(aliceResult.success).toBe(true);

			// When - Bob tries to join the same destination
			const bobRequest: JoinGameRequest = {
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'Gmail'
			};
			const bobResult = joinGame(bobRequest);

			// Then
			expect(bobResult.success).toBe(false);
			expect(bobResult.error).toBe('This role is already taken');

			// Verify only Alice is in the destination
			const updatedSession = getSession(session.roomCode);
			const gmailDestination = updatedSession?.destinations.find((d) => d.name === 'Gmail');
			expect(gmailDestination?.players).toHaveLength(1);
			expect(gmailDestination?.players[0]).toBe(aliceResult.playerId);
		});
	});

	// ============================================================================
	// SLOT AVAILABILITY CHECKS
	// ============================================================================

	describe('Scenario: Check slot availability', () => {
		test('Given an empty session, when checking slot availability, then all slots are available', () => {
			// Given
			const session = createGameSession();

			// When
			const espTeamAvailability = isSlotAvailable(session.roomCode, 'ESP', 'SendWave');
			const destinationAvailability = isSlotAvailable(session.roomCode, 'Destination', 'Gmail');

			// Then
			expect(espTeamAvailability).toBe(true);
			expect(destinationAvailability).toBe(true);
		});

		test('Given a session with occupied slots, when checking those slots, then they are marked as unavailable', () => {
			// Given - Alice joins SendWave, Bob joins Gmail
			const session = createGameSession();

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

			// When
			const sendWaveAvailable = isSlotAvailable(session.roomCode, 'ESP', 'SendWave');
			const gmailAvailable = isSlotAvailable(session.roomCode, 'Destination', 'Gmail');
			const mailMonkeyAvailable = isSlotAvailable(session.roomCode, 'ESP', 'MailMonkey');
			const outlookAvailable = isSlotAvailable(session.roomCode, 'Destination', 'Outlook');

			// Then
			expect(sendWaveAvailable).toBe(false);
			expect(gmailAvailable).toBe(false);
			expect(mailMonkeyAvailable).toBe(true);
			expect(outlookAvailable).toBe(true);
		});

		test('Given a session, when getting all available slots, then correct slot info is returned', () => {
			// Given
			const session = createGameSession();

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			});

			// When
			const slots = getAvailableSlots(session.roomCode);

			// Then
			expect(slots).toBeDefined();
			expect(slots?.espTeams).toHaveLength(5);
			expect(slots?.destinations).toHaveLength(3);

			// Check SendWave is occupied
			const sendWave = slots?.espTeams.find((t) => t.name === 'SendWave');
			expect(sendWave?.available).toBe(false);
			expect(sendWave?.playerCount).toBe(1);

			// Check other ESP teams are available
			const mailMonkey = slots?.espTeams.find((t) => t.name === 'MailMonkey');
			expect(mailMonkey?.available).toBe(true);
			expect(mailMonkey?.playerCount).toBe(0);

			// Check destinations are available
			const gmail = slots?.destinations.find((d) => d.name === 'Gmail');
			expect(gmail?.available).toBe(true);
			expect(gmail?.playerCount).toBe(0);
		});
	});

	// ============================================================================
	// SESSION VALIDATION
	// ============================================================================

	describe('Scenario: Player cannot join expired session', () => {
		test('Given a session expired 1 hour ago, when player tries to join, then the join is rejected', () => {
			// Given - Create session and set it to expired
			const session = createGameSession();
			const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
			setSessionActivity(session.roomCode, threeHoursAgo);

			const request: JoinGameRequest = {
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			};

			// When
			const result = joinGame(request);

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toBe('This session has expired');
		});
	});

	describe('Scenario: Player cannot join full session', () => {
		test('Given a session with all 8 slots occupied, when a new player tries to join, then the join is rejected', () => {
			// Given - Fill all 5 ESP teams and 3 destinations
			const session = createGameSession();
			const espTeamNames = ['SendWave', 'MailMonkey', 'BluePost', 'SendBolt', 'RocketMail'];
			const destinationNames = ['Gmail', 'Outlook', 'Yahoo'];

			// Fill all ESP teams
			espTeamNames.forEach((teamName, index) => {
				const result = joinGame({
					roomCode: session.roomCode,
					displayName: `Player${index + 1}`,
					role: 'ESP',
					teamName
				});
				expect(result.success).toBe(true);
			});

			// Fill all destinations
			destinationNames.forEach((teamName, index) => {
				const result = joinGame({
					roomCode: session.roomCode,
					displayName: `Player${index + 6}`,
					role: 'Destination',
					teamName
				});
				expect(result.success).toBe(true);
			});

			// When - 9th player tries to join
			const request: JoinGameRequest = {
				roomCode: session.roomCode,
				displayName: 'Player9',
				role: 'ESP',
				teamName: 'SendWave'
			};
			const result = joinGame(request);

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toBe('This session is full');
		});
	});

	describe('Scenario: Player cannot join session that already started', () => {
		test('Given a session in round 1, when a new player tries to join, then the join is rejected', () => {
			// Given - Create session and manually set it to round 1
			const session = createGameSession();
			const updatedSession = getSession(session.roomCode);
			if (updatedSession) {
				updatedSession.current_round = 1;
				updatedSession.current_phase = 'round';
				// Note: We'll need to add an update method to storage adapter
			}

			const request: JoinGameRequest = {
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			};

			// When
			const result = joinGame(request);

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toBe('This game has already started');
		});
	});

	describe('Scenario: Validate session state before joining', () => {
		test('Given a valid session in lobby phase, when canJoinSession is called, then it returns true', () => {
			// Given
			const session = createGameSession();

			// When
			const result = canJoinSession(session.roomCode);

			// Then
			expect(result.canJoin).toBe(true);
			expect(result.reason).toBeUndefined();
		});

		test('Given an expired session, when canJoinSession is called, then it returns false with reason', () => {
			// Given
			const session = createGameSession();
			const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
			setSessionActivity(session.roomCode, threeHoursAgo);

			// When
			const result = canJoinSession(session.roomCode);

			// Then
			expect(result.canJoin).toBe(false);
			expect(result.reason).toBe('This session has expired');
		});

		test('Given a started session, when canJoinSession is called, then it returns false with reason', () => {
			// Given
			const session = createGameSession();
			const updatedSession = getSession(session.roomCode);
			if (updatedSession) {
				updatedSession.current_round = 1;
			}

			// When
			const result = canJoinSession(session.roomCode);

			// Then
			expect(result.canJoin).toBe(false);
			expect(result.reason).toBe('This game has already started');
		});

		test('Given a full session, when canJoinSession is called, then it returns false with reason', () => {
			// Given - Fill all slots
			const session = createGameSession();
			const espTeamNames = ['SendWave', 'MailMonkey', 'BluePost', 'SendBolt', 'RocketMail'];
			const destinationNames = ['Gmail', 'Outlook', 'Yahoo'];

			espTeamNames.forEach((teamName, index) => {
				joinGame({
					roomCode: session.roomCode,
					displayName: `Player${index + 1}`,
					role: 'ESP',
					teamName
				});
			});

			destinationNames.forEach((teamName, index) => {
				joinGame({
					roomCode: session.roomCode,
					displayName: `Player${index + 6}`,
					role: 'Destination',
					teamName
				});
			});

			// When
			const result = canJoinSession(session.roomCode);

			// Then
			expect(result.canJoin).toBe(false);
			expect(result.reason).toBe('This session is full');
		});
	});

	// ============================================================================
	// PLAYER COUNT TRACKING
	// ============================================================================

	describe('Scenario: Track player counts by role', () => {
		test('Given an empty session, when no players have joined, then counts are 0', () => {
			// Given
			const session = createGameSession();

			// When
			const slots = getAvailableSlots(session.roomCode);

			// Then
			expect(slots?.espTeamCount).toBe(0);
			expect(slots?.destinationCount).toBe(0);
			expect(slots?.totalPlayers).toBe(0);
		});

		test('Given players have joined, when getting slot info, then counts are accurate', () => {
			// Given
			const session = createGameSession();

			// Add 2 ESP teams
			joinGame({
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			});

			joinGame({
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'ESP',
				teamName: 'MailMonkey'
			});

			// Add 1 destination
			joinGame({
				roomCode: session.roomCode,
				displayName: 'Charlie',
				role: 'Destination',
				teamName: 'Gmail'
			});

			// When
			const slots = getAvailableSlots(session.roomCode);

			// Then
			expect(slots?.espTeamCount).toBe(2);
			expect(slots?.destinationCount).toBe(1);
			expect(slots?.totalPlayers).toBe(3);
		});
	});

	// ============================================================================
	// INVALID TEAM NAME HANDLING
	// ============================================================================

	describe('Scenario: Player tries to join with invalid team name', () => {
		test('Given a player provides a non-existent ESP team name, when joining, then validation fails', () => {
			// Given
			const session = createGameSession();
			const request: JoinGameRequest = {
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'InvalidTeam'
			};

			// When
			const result = joinGame(request);

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toBe('Invalid team name');
		});

		test('Given a player provides a non-existent destination name, when joining, then validation fails', () => {
			// Given
			const session = createGameSession();
			const request: JoinGameRequest = {
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'InvalidDestination'
			};

			// When
			const result = joinGame(request);

			// Then
			expect(result.success).toBe(false);
			expect(result.error).toBe('Invalid team name');
		});
	});
});
