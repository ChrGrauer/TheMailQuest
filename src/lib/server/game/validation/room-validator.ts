/**
 * Room Code Validator
 *
 * Handles room code format validation and existence checks.
 * Extracted from player-manager.ts for better separation of concerns.
 */

import { getSession } from '../session-manager';
import type { GameSession } from '../types';

export interface RoomCodeValidation {
	isValidFormat: boolean;
	exists: boolean;
	session?: GameSession;
	error?: string;
}

/**
 * Validate room code format and existence
 * @param roomCode The room code to validate
 * @returns Validation result with format check, existence check, and session if found
 */
export function validateRoomCode(roomCode: string): RoomCodeValidation {
	// Check format: must be exactly 6 uppercase alphanumeric characters
	const formatRegex = /^[A-Z0-9]{6}$/;

	if (!formatRegex.test(roomCode)) {
		return {
			isValidFormat: false,
			exists: false,
			error: 'Room code must be 6 characters'
		};
	}

	// Check if session exists
	const session = getSession(roomCode);

	if (!session) {
		return {
			isValidFormat: true,
			exists: false,
			error: 'Room not found. Please check the code.'
		};
	}

	return {
		isValidFormat: true,
		exists: true,
		session
	};
}

/**
 * Validate team name exists for the given role
 * @param session The game session
 * @param role The role type (ESP or Destination)
 * @param teamName The team or destination name to validate
 * @returns true if team name is valid for the given role
 */
export function isValidTeamName(
	session: GameSession,
	role: 'ESP' | 'Destination',
	teamName: string
): boolean {
	if (role === 'ESP') {
		return session.esp_teams.some((team) => team.name === teamName);
	} else {
		return session.destinations.some((dest) => dest.name === teamName);
	}
}
