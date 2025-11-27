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
	getPlayer,
	getSessionPlayers,
	removePlayer,
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
		test.each([
			['ABC123', 'standard uppercase alphanumeric'],
			['XYZ999', 'uppercase letters with numbers'],
			['TEST42', 'alphanumeric mix'],
			['123456', 'all numbers'],
			['ABCDEF', 'all uppercase letters']
		])('validates room code %s → valid (%s)', (code, _desc) => {
			expect(validateRoomCode(code).isValidFormat).toBe(true);
		});

		test.each([
			['AB12', 'too short'],
			['ABCDEFG', 'too long'],
			['abc123', 'lowercase'],
			['AB-123', 'special character'],
			['AB 123', 'space'],
			['', 'empty']
		])('validates room code "%s" → invalid (%s)', (code, _desc) => {
			const result = validateRoomCode(code);
			expect(result.isValidFormat).toBe(false);
			expect(result.error).toBe('Room code must be 6 characters');
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
		test.each([
			['ESP', 'InvalidTeam', 'Alice', 'non-existent ESP team'],
			['Destination', 'InvalidDestination', 'Bob', 'non-existent destination']
		])(
			'rejects %s role with invalid team "%s" (%s)',
			(role, teamName, displayName, _desc) => {
				// Given
				const session = createGameSession();
				const request: JoinGameRequest = {
					roomCode: session.roomCode,
					displayName,
					role: role as 'ESP' | 'Destination',
					teamName
				};

				// When
				const result = joinGame(request);

				// Then
				expect(result.success).toBe(false);
				expect(result.error).toBe('Invalid team name');
			}
		);
	});

	// ============================================================================
	// TEST SUITE: Player CRUD Operations
	// ============================================================================

	describe('Scenario: Get player by ID', () => {
		test('Given a player has joined, when getting player by ID, then player is returned', () => {
			// Given
			const session = createGameSession();
			const request: JoinGameRequest = {
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			};
			const joinResult = joinGame(request);
			expect(joinResult.success).toBe(true);

			// When
			const player = getPlayer(joinResult.playerId!);

			// Then
			expect(player).toBeDefined();
			expect(player?.displayName).toBe('Alice');
			expect(player?.role).toBe('ESP');
			expect(player?.teamName).toBe('SendWave');
		});

		test('Given no player exists with ID, when getting player, then undefined is returned', () => {
			// Given
			createGameSession();

			// When
			const player = getPlayer('non-existent-id');

			// Then
			expect(player).toBeUndefined();
		});
	});

	describe('Scenario: Get all players in session', () => {
		test('Given multiple players have joined, when getting session players, then all players are returned', () => {
			// Given
			const session = createGameSession();

			// Add ESP player
			const espResult = joinGame({
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			});
			expect(espResult.success).toBe(true);

			// Add Destination player
			const destResult = joinGame({
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'Gmail'
			});
			expect(destResult.success).toBe(true);

			// When
			const players = getSessionPlayers(session.roomCode);

			// Then
			expect(players).toHaveLength(2);
			expect(players.map((p) => p.displayName).sort()).toEqual(['Alice', 'Bob']);
		});

		test('Given no players have joined, when getting session players, then empty array is returned', () => {
			// Given
			const session = createGameSession();

			// When
			const players = getSessionPlayers(session.roomCode);

			// Then
			expect(players).toEqual([]);
		});

		test('Given non-existent session, when getting session players, then empty array is returned', () => {
			// When
			const players = getSessionPlayers('NONEXISTENT');

			// Then
			expect(players).toEqual([]);
		});
	});

	describe('Scenario: Remove player from session', () => {
		test('Given an ESP player has joined, when removing player, then player is removed from team and storage', () => {
			// Given
			const session = createGameSession();
			const request: JoinGameRequest = {
				roomCode: session.roomCode,
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave'
			};
			const joinResult = joinGame(request);
			expect(joinResult.success).toBe(true);

			// Verify player is in session
			const playersBefore = getSessionPlayers(session.roomCode);
			expect(playersBefore).toHaveLength(1);

			// When
			const removed = removePlayer(session.roomCode, joinResult.playerId!);

			// Then
			expect(removed).toBe(true);

			// Player should be removed from session
			const playersAfter = getSessionPlayers(session.roomCode);
			expect(playersAfter).toHaveLength(0);

			// Player should no longer be retrievable
			const player = getPlayer(joinResult.playerId!);
			expect(player).toBeUndefined();
		});

		test('Given a Destination player has joined, when removing player, then player is removed from destination and storage', () => {
			// Given
			const session = createGameSession();
			const request: JoinGameRequest = {
				roomCode: session.roomCode,
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'Gmail'
			};
			const joinResult = joinGame(request);
			expect(joinResult.success).toBe(true);

			// When
			const removed = removePlayer(session.roomCode, joinResult.playerId!);

			// Then
			expect(removed).toBe(true);
			const playersAfter = getSessionPlayers(session.roomCode);
			expect(playersAfter).toHaveLength(0);
		});

		test('Given non-existent session, when removing player, then false is returned', () => {
			// When
			const removed = removePlayer('NONEXISTENT', 'some-player-id');

			// Then
			expect(removed).toBe(false);
		});

		test('Given non-existent player, when removing player, then false is returned', () => {
			// Given
			const session = createGameSession();

			// When
			const removed = removePlayer(session.roomCode, 'non-existent-player-id');

			// Then
			expect(removed).toBe(false);
		});
	});

	describe('Scenario: Clear all players', () => {
		test('Given players exist, when clearing players, then all players are removed', () => {
			// Given
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
			clearPlayers();

			// Then - players should not be retrievable
			// Note: clearPlayers only clears storage, not session references
			// This is primarily for test cleanup
		});
	});
});
