/**
 * Player Manager
 * US-1.2: Join Game Session
 *
 * Orchestrates player joining, validation, and slot management.
 * Uses hexagonal architecture with dependency injection for storage.
 *
 * Note: Validation logic has been extracted to separate modules:
 * - validation/room-validator.ts - Room code validation
 * - validation/session-validator.ts - Session state validation
 * - slots/slot-manager.ts - Slot availability management
 */

import { getSession, updateActivity } from './session-manager';
import type { Player, PlayerStoragePort } from './ports/player-storage.port';
import { InMemoryPlayerStorage } from './adapters/in-memory-player-storage.adapter';
import { gameLogger } from '../logger';

// Import validation modules
import { validateRoomCode, isValidTeamName } from './validation/room-validator';
import { canJoinSession } from './validation/session-validator';
import { isSlotAvailable, verifySlotAvailability } from './slots/slot-manager';

// Re-export types and functions for backwards compatibility
export type { Player } from './ports/player-storage.port';
export { validateRoomCode, type RoomCodeValidation } from './validation/room-validator';
export { canJoinSession, type SessionJoinValidation } from './validation/session-validator';
export {
	isSlotAvailable,
	getAvailableSlots,
	type TeamSlot,
	type SlotInfo
} from './slots/slot-manager';

// ============================================================================
// STORAGE MANAGEMENT
// ============================================================================

// Singleton storage instance (can be replaced with DI container)
let playerStorage: PlayerStoragePort = new InMemoryPlayerStorage();

/**
 * Set the player storage adapter (for testing or switching implementations)
 */
export function setPlayerStorageAdapter(adapter: PlayerStoragePort): void {
	playerStorage = adapter;
}

/**
 * Get the current player storage adapter
 */
export function getPlayerStorageAdapter(): PlayerStoragePort {
	return playerStorage;
}

/**
 * Get players by their IDs
 */
export function getPlayersByIds(playerIds: string[]): Player[] {
	const result = playerStorage.findByIds(playerIds);
	// In-memory storage returns synchronously, handle Promise for future adapters
	if (result instanceof Promise) {
		throw new Error('Async player storage not supported in synchronous context');
	}
	return result;
}

// ============================================================================
// TYPES
// ============================================================================

export interface JoinGameRequest {
	roomCode: string;
	displayName: string;
	role: 'ESP' | 'Destination';
	teamName: string;
}

export interface JoinGameResult {
	success: boolean;
	playerId?: string;
	player?: Player;
	error?: string;
}

// ============================================================================
// PLAYER JOIN LOGIC
// ============================================================================

/**
 * Generate a unique player ID
 */
function generatePlayerId(): string {
	return `player_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Add a player to a game session
 * @param request The join game request
 * @returns Result with success status and player info or error message
 */
export function joinGame(request: JoinGameRequest): JoinGameResult {
	const { roomCode, displayName, role, teamName } = request;

	// Validate display name
	const trimmedName = displayName.trim();
	if (!trimmedName) {
		gameLogger.event('player_join_failed', {
			roomCode,
			playerName: displayName,
			reason: 'Name is required'
		});

		return {
			success: false,
			error: 'Name is required'
		};
	}

	// Validate room code
	const roomValidation = validateRoomCode(roomCode);
	if (!roomValidation.isValidFormat || !roomValidation.exists) {
		gameLogger.event('player_join_failed', {
			roomCode,
			playerName: trimmedName,
			reason: roomValidation.error
		});

		return {
			success: false,
			error: roomValidation.error
		};
	}

	const session = roomValidation.session!;

	// Validate session can accept players
	const sessionValidation = canJoinSession(roomCode);
	if (!sessionValidation.canJoin) {
		gameLogger.event('player_join_failed', {
			roomCode,
			playerName: trimmedName,
			reason: sessionValidation.reason
		});

		return {
			success: false,
			error: sessionValidation.reason
		};
	}

	// Validate team name exists
	if (!isValidTeamName(session, role, teamName)) {
		gameLogger.event('player_join_failed', {
			roomCode,
			playerName: trimmedName,
			reason: 'Invalid team name'
		});

		return {
			success: false,
			error: 'Invalid team name'
		};
	}

	// Check if slot is available
	if (!isSlotAvailable(roomCode, role, teamName)) {
		gameLogger.event('player_join_failed', {
			roomCode,
			playerName: trimmedName,
			teamName,
			role,
			reason: 'This role is already taken'
		});

		return {
			success: false,
			error: 'This role is already taken'
		};
	}

	// Double-check slot availability with fresh data (race condition protection)
	if (!verifySlotAvailability(roomCode, role, teamName)) {
		gameLogger.event('player_join_race_condition_detected', {
			roomCode,
			playerName: trimmedName,
			teamName,
			role
		});

		return {
			success: false,
			error: 'This role was just taken by another player'
		};
	}

	// Create player
	const playerId = generatePlayerId();
	const player: Player = {
		id: playerId,
		displayName: trimmedName,
		role,
		teamName,
		joinedAt: new Date()
	};

	// Add player to session
	if (role === 'ESP') {
		const team = session.esp_teams.find((t) => t.name === teamName);
		if (team) {
			team.players.push(playerId);
		}
	} else {
		const destination = session.destinations.find((d) => d.name === teamName);
		if (destination) {
			destination.players.push(playerId);
		}
	}

	// Store player
	playerStorage.save(player);

	// Associate player with room (for in-memory adapter)
	if (playerStorage instanceof InMemoryPlayerStorage) {
		playerStorage.associatePlayerWithRoom(playerId, roomCode);
	}

	// Update session activity
	updateActivity(roomCode);

	// Log successful join
	gameLogger.event('player_joined', {
		roomCode,
		playerId,
		playerName: trimmedName,
		role,
		team: teamName,
		timestamp: player.joinedAt.toISOString()
	});

	return {
		success: true,
		playerId,
		player
	};
}

// ============================================================================
// PLAYER CRUD OPERATIONS
// ============================================================================

/**
 * Get a player by ID
 * @param playerId The player ID
 * @returns The player or undefined if not found
 */
export function getPlayer(playerId: string): Player | undefined {
	const result = playerStorage.findById(playerId);
	// In-memory storage returns synchronously, handle Promise for future adapters
	if (result instanceof Promise) {
		throw new Error('Async player storage not supported in synchronous context');
	}
	return result;
}

/**
 * Get all players in a session
 * @param roomCode The room code
 * @returns Array of players in the session
 */
export function getSessionPlayers(roomCode: string): Player[] {
	const session = getSession(roomCode);
	if (!session) {
		return [];
	}

	const playerIds: string[] = [];

	// Collect all player IDs from ESP teams
	session.esp_teams.forEach((team) => {
		playerIds.push(...team.players);
	});

	// Collect all player IDs from destinations
	session.destinations.forEach((dest) => {
		playerIds.push(...dest.players);
	});

	// Get player objects
	const result = playerStorage.findByIds(playerIds);
	// In-memory storage returns synchronously, handle Promise for future adapters
	if (result instanceof Promise) {
		throw new Error('Async player storage not supported in synchronous context');
	}
	return result;
}

/**
 * Remove a player from a session
 * @param roomCode The room code
 * @param playerId The player ID
 * @returns true if removed, false if not found
 */
export function removePlayer(roomCode: string, playerId: string): boolean {
	const session = getSession(roomCode);
	if (!session) {
		return false;
	}

	const result = playerStorage.findById(playerId);
	// In-memory storage returns synchronously, handle Promise for future adapters
	if (result instanceof Promise) {
		throw new Error('Async player storage not supported in synchronous context');
	}

	const player = result;
	if (!player) {
		return false;
	}

	// Remove from session
	if (player.role === 'ESP') {
		const team = session.esp_teams.find((t) => t.name === player.teamName);
		if (team) {
			team.players = team.players.filter((id) => id !== playerId);
		}
	} else {
		const destination = session.destinations.find((d) => d.name === player.teamName);
		if (destination) {
			destination.players = destination.players.filter((id) => id !== playerId);
		}
	}

	// Remove from storage
	playerStorage.delete(playerId);

	gameLogger.event('player_left', {
		roomCode,
		playerId,
		playerName: player.displayName,
		role: player.role,
		team: player.teamName
	});

	return true;
}

/**
 * Clear all players (for testing)
 */
export function clearPlayers(): void {
	playerStorage.clear();
}
