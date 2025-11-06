/**
 * Session Validator
 *
 * Handles session-level validation: expiry, capacity, game state.
 * Extracted from player-manager.ts for better separation of concerns.
 */

import { getSession } from '../session-manager';
import type { GameSession } from '../types';

export interface SessionJoinValidation {
	canJoin: boolean;
	reason?: string;
}

/**
 * Check if a session can accept new players
 * @param roomCode The room code to check
 * @returns Validation result with reason if cannot join
 */
export function canJoinSession(roomCode: string): SessionJoinValidation {
	const session = getSession(roomCode);

	if (!session) {
		return {
			canJoin: false,
			reason: 'Room not found. Please check the code.'
		};
	}

	// Check if session has expired (2 hours of inactivity)
	const twoHours = 2 * 60 * 60 * 1000;
	const timeSinceActivity = Date.now() - session.lastActivity.getTime();

	if (timeSinceActivity > twoHours) {
		return {
			canJoin: false,
			reason: 'This session has expired'
		};
	}

	// Check if game has already started
	if (session.current_round > 0) {
		return {
			canJoin: false,
			reason: 'This game has already started'
		};
	}

	// Check if session is full (5 ESP teams + 3 destinations = 8 total slots)
	const occupiedESPTeams = session.esp_teams.filter((team) => team.players.length > 0).length;
	const occupiedDestinations = session.destinations.filter(
		(dest) => dest.players.length > 0
	).length;
	const totalOccupied = occupiedESPTeams + occupiedDestinations;

	if (totalOccupied >= 8) {
		return {
			canJoin: false,
			reason: 'This session is full'
		};
	}

	return {
		canJoin: true
	};
}

/**
 * Check if a session is expired based on last activity
 * @param session The game session to check
 * @returns true if session has expired (> 2 hours of inactivity)
 */
export function isSessionExpired(session: GameSession): boolean {
	const twoHours = 2 * 60 * 60 * 1000;
	const timeSinceActivity = Date.now() - session.lastActivity.getTime();
	return timeSinceActivity > twoHours;
}

/**
 * Check if a session is full (all 8 slots occupied)
 * @param session The game session to check
 * @returns true if session has all 8 slots occupied
 */
export function isSessionFull(session: GameSession): boolean {
	const occupiedESPTeams = session.esp_teams.filter((team) => team.players.length > 0).length;
	const occupiedDestinations = session.destinations.filter(
		(dest) => dest.players.length > 0
	).length;
	const totalOccupied = occupiedESPTeams + occupiedDestinations;
	return totalOccupied >= 8;
}

/**
 * Check if a game has started
 * @param session The game session to check
 * @returns true if game has started (current_round > 0)
 */
export function hasGameStarted(session: GameSession): boolean {
	return session.current_round > 0;
}
