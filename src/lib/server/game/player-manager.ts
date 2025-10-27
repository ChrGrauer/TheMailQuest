/**
 * Player Manager
 * US-1.2: Join Game Session
 *
 * Handles player joining, validation, and slot management
 * Uses hexagonal architecture with dependency injection for storage
 */

import { getSession, updateActivity } from './session-manager';
import type { GameSession } from './types';
import type { Player, PlayerStoragePort } from './ports/player-storage.port';
import { InMemoryPlayerStorage } from './adapters/in-memory-player-storage.adapter';
import { gameLogger } from '../logger';

// Export Player type for convenience
export type { Player } from './ports/player-storage.port';

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

export interface RoomCodeValidation {
  isValidFormat: boolean;
  exists: boolean;
  session?: GameSession;
  error?: string;
}

export interface SessionJoinValidation {
  canJoin: boolean;
  reason?: string;
}

export interface TeamSlot {
  name: string;
  available: boolean;
  playerCount: number;
  players: string[];
}

export interface SlotInfo {
  espTeams: TeamSlot[];
  destinations: TeamSlot[];
  espTeamCount: number;
  destinationCount: number;
  totalPlayers: number;
}

// ============================================================================
// ROOM CODE VALIDATION
// ============================================================================

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

// ============================================================================
// SESSION VALIDATION
// ============================================================================

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
  const occupiedESPTeams = session.esp_teams.filter(team => team.players.length > 0).length;
  const occupiedDestinations = session.destinations.filter(dest => dest.players.length > 0).length;
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

// ============================================================================
// SLOT AVAILABILITY
// ============================================================================

/**
 * Check if a specific slot is available
 * @param roomCode The room code
 * @param role The role type (ESP or Destination)
 * @param teamName The team or destination name
 * @returns true if slot is available, false if occupied
 */
export function isSlotAvailable(roomCode: string, role: 'ESP' | 'Destination', teamName: string): boolean {
  const session = getSession(roomCode);

  if (!session) {
    return false;
  }

  if (role === 'ESP') {
    const team = session.esp_teams.find(t => t.name === teamName);
    return team ? team.players.length === 0 : false;
  } else {
    const destination = session.destinations.find(d => d.name === teamName);
    return destination ? destination.players.length === 0 : false;
  }
}

/**
 * Get all slot information with availability status
 * @param roomCode The room code
 * @returns Detailed slot information or undefined if session not found
 */
export function getAvailableSlots(roomCode: string): SlotInfo | undefined {
  const session = getSession(roomCode);

  if (!session) {
    return undefined;
  }

  const espTeams: TeamSlot[] = session.esp_teams.map(team => ({
    name: team.name,
    available: team.players.length === 0,
    playerCount: team.players.length,
    players: team.players
  }));

  const destinations: TeamSlot[] = session.destinations.map(dest => ({
    name: dest.name,
    available: dest.players.length === 0,
    playerCount: dest.players.length,
    players: dest.players
  }));

  const espTeamCount = espTeams.filter(t => !t.available).length;
  const destinationCount = destinations.filter(d => !d.available).length;
  const totalPlayers = espTeamCount + destinationCount;

  return {
    espTeams,
    destinations,
    espTeamCount,
    destinationCount,
    totalPlayers
  };
}

// ============================================================================
// PLAYER JOIN LOGIC
// ============================================================================

/**
 * Generate a unique player ID
 */
function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate team name exists for the given role
 */
function isValidTeamName(session: GameSession, role: 'ESP' | 'Destination', teamName: string): boolean {
  if (role === 'ESP') {
    return session.esp_teams.some(team => team.name === teamName);
  } else {
    return session.destinations.some(dest => dest.name === teamName);
  }
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
  const freshSession = getSession(roomCode);
  if (!freshSession) {
    return {
      success: false,
      error: 'Room not found. Please check the code.'
    };
  }

  const slotStillAvailable =
    role === 'ESP'
      ? (freshSession.esp_teams.find((t) => t.name === teamName)?.players.length ?? 0) === 0
      : (freshSession.destinations.find((d) => d.name === teamName)?.players.length ?? 0) === 0;

  if (!slotStillAvailable) {
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
    const team = session.esp_teams.find(t => t.name === teamName);
    if (team) {
      team.players.push(playerId);
    }
  } else {
    const destination = session.destinations.find(d => d.name === teamName);
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

/**
 * Get a player by ID
 * @param playerId The player ID
 * @returns The player or undefined if not found
 */
export function getPlayer(playerId: string): Player | undefined {
  return playerStorage.findById(playerId);
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
  session.esp_teams.forEach(team => {
    playerIds.push(...team.players);
  });

  // Collect all player IDs from destinations
  session.destinations.forEach(dest => {
    playerIds.push(...dest.players);
  });

  // Get player objects
  return playerStorage.findByIds(playerIds);
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

  const player = playerStorage.findById(playerId);
  if (!player) {
    return false;
  }

  // Remove from session
  if (player.role === 'ESP') {
    const team = session.esp_teams.find(t => t.name === player.teamName);
    if (team) {
      team.players = team.players.filter(id => id !== playerId);
    }
  } else {
    const destination = session.destinations.find(d => d.name === player.teamName);
    if (destination) {
      destination.players = destination.players.filter(id => id !== playerId);
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
