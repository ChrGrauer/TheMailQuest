/**
 * Game Start Manager
 * US-1.3: Game Lobby Management
 *
 * Handles game start validation and execution
 */

import { getSession, updateActivity } from './session-manager';
import { validateRoomCode } from './validation/room-validator';
import { gameLogger } from '../logger';

// ============================================================================
// TYPES
// ============================================================================

export interface StartGameRequest {
	roomCode: string;
	facilitatorId: string;
}

export interface StartGameResult {
	success: boolean;
	error?: string;
}

export interface StartGameValidation {
	canStart: boolean;
	reason?: string;
	espTeamCount?: number;
	destinationCount?: number;
	totalPlayers?: number;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if a game can be started
 * Validates minimum player requirements:
 * - At least 1 ESP team player
 * - At least 1 Destination player
 *
 * @param roomCode The room code to validate
 * @returns Validation result with player counts
 */
export function canStartGame(roomCode: string): StartGameValidation {
	// Validate room code
	const roomValidation = validateRoomCode(roomCode);
	if (!roomValidation.isValidFormat || !roomValidation.exists) {
		return {
			canStart: false,
			reason: roomValidation.error
		};
	}

	const session = roomValidation.session!;

	// Count occupied ESP teams (teams with at least 1 player)
	const espTeamCount = session.esp_teams.filter((team) => team.players.length > 0).length;

	// Count occupied destinations (destinations with at least 1 player)
	const destinationCount = session.destinations.filter((dest) => dest.players.length > 0).length;

	const totalPlayers = espTeamCount + destinationCount;

	// Check minimum requirements
	if (espTeamCount === 0) {
		return {
			canStart: false,
			reason: 'At least 1 ESP team is required',
			espTeamCount,
			destinationCount,
			totalPlayers
		};
	}

	if (destinationCount === 0) {
		return {
			canStart: false,
			reason: 'At least 1 Destination is required',
			espTeamCount,
			destinationCount,
			totalPlayers
		};
	}

	// All checks passed
	return {
		canStart: true,
		espTeamCount,
		destinationCount,
		totalPlayers
	};
}

// ============================================================================
// GAME START
// ============================================================================

/**
 * Start a game session
 * Transitions from lobby phase to resource_allocation phase
 * Sets round to 1
 *
 * @param request Start game request with roomCode and facilitatorId
 * @returns Result indicating success or error
 */
export function startGame(request: StartGameRequest): StartGameResult {
	const { roomCode, facilitatorId } = request;

	// Validate room code
	const roomValidation = validateRoomCode(roomCode);
	if (!roomValidation.isValidFormat || !roomValidation.exists) {
		gameLogger.event('game_start_failed', {
			roomCode,
			facilitatorId,
			reason: roomValidation.error
		});

		return {
			success: false,
			error: roomValidation.error
		};
	}

	const session = roomValidation.session!;

	// Verify facilitator authorization
	if (session.facilitatorId !== facilitatorId) {
		gameLogger.event('game_start_failed', {
			roomCode,
			facilitatorId,
			actualFacilitatorId: session.facilitatorId,
			reason: 'Only the facilitator can start the game'
		});

		return {
			success: false,
			error: 'Only the facilitator can start the game'
		};
	}

	// Check if game already started
	if (session.current_phase !== 'lobby') {
		gameLogger.event('game_start_failed', {
			roomCode,
			facilitatorId,
			currentPhase: session.current_phase,
			reason: 'Game has already started'
		});

		return {
			success: false,
			error: 'Game has already started'
		};
	}

	// Validate minimum player requirements
	const validation = canStartGame(roomCode);
	if (!validation.canStart) {
		gameLogger.event('game_start_failed', {
			roomCode,
			facilitatorId,
			reason: validation.reason,
			playerCount: validation.totalPlayers,
			espTeamCount: validation.espTeamCount,
			destinationCount: validation.destinationCount,
			minRequired: '2 (1 ESP + 1 Destination)'
		});

		return {
			success: false,
			error: validation.reason
		};
	}

	// Start the game
	session.current_phase = 'resource_allocation';
	session.current_round = 1;

	// Update activity
	updateActivity(roomCode);

	// Get ESP team names and destination names for logging
	const espTeamNames = session.esp_teams
		.filter((team) => team.players.length > 0)
		.map((team) => team.name);

	const destinationNames = session.destinations
		.filter((dest) => dest.players.length > 0)
		.map((dest) => dest.name);

	// Log game start
	gameLogger.event('game_started', {
		roomCode,
		facilitatorId,
		playerCount: validation.totalPlayers,
		espTeams: espTeamNames,
		destinations: destinationNames,
		timestamp: new Date().toISOString()
	});

	return {
		success: true
	};
}
