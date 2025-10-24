/**
 * Session Storage Port (Interface)
 * Hexagonal Architecture - Port for session persistence
 *
 * This interface defines the contract for session storage.
 * Different adapters can implement this interface (in-memory, Redis, PostgreSQL, etc.)
 */

import type { GameSession } from '../types';

export interface SessionStoragePort {
  /**
   * Save a game session
   */
  save(session: GameSession): Promise<void> | void;

  /**
   * Find a session by room code
   */
  findByRoomCode(roomCode: string): Promise<GameSession | undefined> | GameSession | undefined;

  /**
   * Find all active sessions
   */
  findAll(): Promise<GameSession[]> | GameSession[];

  /**
   * Delete a session by room code
   */
  delete(roomCode: string): Promise<boolean> | boolean;

  /**
   * Check if a room code exists
   */
  exists(roomCode: string): Promise<boolean> | boolean;

  /**
   * Update a session
   */
  update(session: GameSession): Promise<void> | void;

  /**
   * Find all sessions that have been inactive for a given duration
   */
  findInactiveSessions(inactivityMs: number): Promise<GameSession[]> | GameSession[];
}
