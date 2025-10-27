/**
 * Room Validator Tests
 *
 * Tests room code format validation and team name validation edge cases.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { validateRoomCode, isValidTeamName } from './room-validator';
import { createGameSession, deleteSession, getAllSessions } from '../session-manager';

describe('Room Validator', () => {
	beforeEach(() => {
		// Clean up sessions before each test
		const sessions = getAllSessions();
		sessions.forEach((session) => deleteSession(session.roomCode));
	});

	afterEach(() => {
		// Clean up after each test
		const sessions = getAllSessions();
		sessions.forEach((session) => deleteSession(session.roomCode));
	});

	// ============================================================================
	// ROOM CODE FORMAT VALIDATION - EDGE CASES
	// ============================================================================

	describe('validateRoomCode() - Format Validation', () => {
		test('should accept valid 6-character uppercase alphanumeric codes', () => {
			const validCodes = [
				'ABC123',
				'XYZ789',
				'AAAAAA',
				'111111',
				'A1B2C3',
				'ZZZZ99',
				'000000'
			];

			validCodes.forEach((code) => {
				const result = validateRoomCode(code);
				expect(result.isValidFormat).toBe(true);
			});
		});

		test('should reject codes with lowercase letters', () => {
			const invalidCodes = ['abc123', 'aBc123', 'ABC12c', 'abcdef'];

			invalidCodes.forEach((code) => {
				const result = validateRoomCode(code);
				expect(result.isValidFormat).toBe(false);
				expect(result.error).toBe('Room code must be 6 characters');
			});
		});

		test('should reject codes that are too short', () => {
			const shortCodes = ['A', 'AB', 'ABC', 'ABCD', 'ABCDE'];

			shortCodes.forEach((code) => {
				const result = validateRoomCode(code);
				expect(result.isValidFormat).toBe(false);
				expect(result.error).toBe('Room code must be 6 characters');
			});
		});

		test('should reject codes that are too long', () => {
			const longCodes = ['ABCDEFG', 'ABC1234', 'ABCDEFGHIJK'];

			longCodes.forEach((code) => {
				const result = validateRoomCode(code);
				expect(result.isValidFormat).toBe(false);
				expect(result.error).toBe('Room code must be 6 characters');
			});
		});

		test('should reject codes with special characters', () => {
			const specialCodes = ['ABC-12', 'AB C12', 'ABC@12', 'ABC.12', 'ABC_12', 'ABC!12'];

			specialCodes.forEach((code) => {
				const result = validateRoomCode(code);
				expect(result.isValidFormat).toBe(false);
				expect(result.error).toBe('Room code must be 6 characters');
			});
		});

		test('should reject empty string', () => {
			const result = validateRoomCode('');
			expect(result.isValidFormat).toBe(false);
			expect(result.error).toBe('Room code must be 6 characters');
		});

		test('should reject codes with whitespace', () => {
			const whitespaceCodes = ['ABC 12', ' ABC12', 'ABC12 ', '  A B C  '];

			whitespaceCodes.forEach((code) => {
				const result = validateRoomCode(code);
				expect(result.isValidFormat).toBe(false);
				expect(result.error).toBe('Room code must be 6 characters');
			});
		});

		test('should reject codes with unicode characters', () => {
			const unicodeCodes = ['ABC😀12', 'АБВГДЕ', 'ABC€12'];

			unicodeCodes.forEach((code) => {
				const result = validateRoomCode(code);
				expect(result.isValidFormat).toBe(false);
				expect(result.error).toBe('Room code must be 6 characters');
			});
		});
	});

	// ============================================================================
	// ROOM CODE EXISTENCE VALIDATION
	// ============================================================================

	describe('validateRoomCode() - Existence Check', () => {
		test('should find existing session', () => {
			const session = createGameSession();

			const result = validateRoomCode(session.roomCode);

			expect(result.isValidFormat).toBe(true);
			expect(result.exists).toBe(true);
			expect(result.session).toBeDefined();
			expect(result.session?.roomCode).toBe(session.roomCode);
			expect(result.error).toBeUndefined();
		});

		test('should not find non-existent session with valid format', () => {
			const result = validateRoomCode('XYZ999');

			expect(result.isValidFormat).toBe(true);
			expect(result.exists).toBe(false);
			expect(result.session).toBeUndefined();
			expect(result.error).toBe('Room not found. Please check the code.');
		});

		test('should fail both format and existence for invalid code', () => {
			const result = validateRoomCode('bad');

			expect(result.isValidFormat).toBe(false);
			expect(result.exists).toBe(false);
			expect(result.session).toBeUndefined();
			expect(result.error).toBe('Room code must be 6 characters');
		});
	});

	// ============================================================================
	// TEAM NAME VALIDATION
	// ============================================================================

	describe('isValidTeamName()', () => {
		test('should validate ESP team names', () => {
			const session = createGameSession();
			const espTeamNames = ['SendWave', 'MailMonkey', 'BluePost', 'SendBolt', 'RocketMail'];

			espTeamNames.forEach((teamName) => {
				const isValid = isValidTeamName(session, 'ESP', teamName);
				expect(isValid).toBe(true);
			});
		});

		test('should validate Destination names', () => {
			const session = createGameSession();
			const destNames = ['Gmail', 'Outlook', 'Yahoo'];

			destNames.forEach((destName) => {
				const isValid = isValidTeamName(session, 'Destination', destName);
				expect(isValid).toBe(true);
			});
		});

		test('should reject invalid ESP team name', () => {
			const session = createGameSession();
			const invalidNames = ['InvalidTeam', 'Gmail', 'RandomName', ''];

			invalidNames.forEach((teamName) => {
				const isValid = isValidTeamName(session, 'ESP', teamName);
				expect(isValid).toBe(false);
			});
		});

		test('should reject invalid Destination name', () => {
			const session = createGameSession();
			const invalidNames = ['InvalidDest', 'SendWave', 'RandomName', ''];

			invalidNames.forEach((destName) => {
				const isValid = isValidTeamName(session, 'Destination', destName);
				expect(isValid).toBe(false);
			});
		});

		test('should be case-sensitive for team names', () => {
			const session = createGameSession();

			// Correct case
			expect(isValidTeamName(session, 'ESP', 'SendWave')).toBe(true);

			// Wrong case
			expect(isValidTeamName(session, 'ESP', 'sendwave')).toBe(false);
			expect(isValidTeamName(session, 'ESP', 'SENDWAVE')).toBe(false);
			expect(isValidTeamName(session, 'ESP', 'sendWave')).toBe(false);
		});

		test('should be case-sensitive for destination names', () => {
			const session = createGameSession();

			// Correct case
			expect(isValidTeamName(session, 'Destination', 'Gmail')).toBe(true);

			// Wrong case
			expect(isValidTeamName(session, 'Destination', 'gmail')).toBe(false);
			expect(isValidTeamName(session, 'Destination', 'GMAIL')).toBe(false);
			expect(isValidTeamName(session, 'Destination', 'gMail')).toBe(false);
		});

		test('should not accept ESP name as Destination', () => {
			const session = createGameSession();

			expect(isValidTeamName(session, 'Destination', 'SendWave')).toBe(false);
			expect(isValidTeamName(session, 'Destination', 'MailMonkey')).toBe(false);
		});

		test('should not accept Destination name as ESP', () => {
			const session = createGameSession();

			expect(isValidTeamName(session, 'ESP', 'Gmail')).toBe(false);
			expect(isValidTeamName(session, 'ESP', 'Outlook')).toBe(false);
		});
	});
});
