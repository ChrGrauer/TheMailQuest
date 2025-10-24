/**
 * In-Memory Session Storage Adapter
 * Hexagonal Architecture - Adapter for in-memory session persistence
 *
 * This adapter stores sessions in memory using a Map.
 * Can be easily replaced with Redis, PostgreSQL, or other storage solutions.
 */

import type { SessionStoragePort } from '../ports/session-storage.port';
import type { GameSession } from '../types';

export class InMemorySessionStorage implements SessionStoragePort {
  private sessions: Map<string, GameSession> = new Map();

  save(session: GameSession): void {
    this.sessions.set(session.roomCode, session);
  }

  findByRoomCode(roomCode: string): GameSession | undefined {
    return this.sessions.get(roomCode);
  }

  findAll(): GameSession[] {
    return Array.from(this.sessions.values());
  }

  delete(roomCode: string): boolean {
    return this.sessions.delete(roomCode);
  }

  exists(roomCode: string): boolean {
    return this.sessions.has(roomCode);
  }

  update(session: GameSession): void {
    if (this.sessions.has(session.roomCode)) {
      this.sessions.set(session.roomCode, session);
    }
  }

  findInactiveSessions(inactivityMs: number): GameSession[] {
    const now = Date.now();
    const inactiveSessions: GameSession[] = [];

    for (const session of this.sessions.values()) {
      const timeSinceActivity = now - session.lastActivity.getTime();
      if (timeSinceActivity >= inactivityMs) {
        inactiveSessions.push(session);
      }
    }

    return inactiveSessions;
  }

  /**
   * Clear all sessions (useful for testing)
   */
  clear(): void {
    this.sessions.clear();
  }
}
