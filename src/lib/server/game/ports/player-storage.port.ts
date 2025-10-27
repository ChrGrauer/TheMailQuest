/**
 * Player Storage Port
 * US-1.2: Join Game Session
 *
 * Defines the interface for player storage operations
 * Allows easy swapping between in-memory, Redis, PostgreSQL implementations
 */

export interface Player {
  id: string;
  displayName: string;
  role: 'ESP' | 'Destination';
  teamName: string;
  joinedAt: Date;
}

export interface PlayerStoragePort {
  /**
   * Save a player
   */
  save(player: Player): Promise<void> | void;

  /**
   * Find a player by ID
   */
  findById(playerId: string): Promise<Player | undefined> | Player | undefined;

  /**
   * Find all players in a session (by room code)
   */
  findByRoomCode(roomCode: string): Promise<Player[]> | Player[];

  /**
   * Find all players by their IDs
   */
  findByIds(playerIds: string[]): Promise<Player[]> | Player[];

  /**
   * Delete a player
   */
  delete(playerId: string): Promise<boolean> | boolean;

  /**
   * Clear all players (for testing)
   */
  clear(): void;
}
