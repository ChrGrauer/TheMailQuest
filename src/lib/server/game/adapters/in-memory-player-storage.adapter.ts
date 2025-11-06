/**
 * In-Memory Player Storage Adapter
 * US-1.2: Join Game Session
 *
 * In-memory implementation of PlayerStoragePort
 * Suitable for development and testing
 */

import type { Player, PlayerStoragePort } from '../ports/player-storage.port';

export class InMemoryPlayerStorage implements PlayerStoragePort {
	private players: Map<string, Player> = new Map();
	private playerRoomIndex: Map<string, string> = new Map(); // playerId -> roomCode

	save(player: Player): void {
		this.players.set(player.id, player);
		// Note: Room code association is managed by the session storage
	}

	findById(playerId: string): Player | undefined {
		return this.players.get(playerId);
	}

	findByRoomCode(roomCode: string): Player[] {
		return Array.from(this.players.values()).filter((player) => {
			return this.playerRoomIndex.get(player.id) === roomCode;
		});
	}

	findByIds(playerIds: string[]): Player[] {
		return playerIds.map((id) => this.players.get(id)).filter((p): p is Player => p !== undefined);
	}

	delete(playerId: string): boolean {
		this.playerRoomIndex.delete(playerId);
		return this.players.delete(playerId);
	}

	clear(): void {
		this.players.clear();
		this.playerRoomIndex.clear();
	}

	/**
	 * Associate a player with a room (helper for in-memory implementation)
	 */
	associatePlayerWithRoom(playerId: string, roomCode: string): void {
		this.playerRoomIndex.set(playerId, roomCode);
	}

	/**
	 * Get room code for a player (helper for in-memory implementation)
	 */
	getRoomCodeForPlayer(playerId: string): string | undefined {
		return this.playerRoomIndex.get(playerId);
	}
}
