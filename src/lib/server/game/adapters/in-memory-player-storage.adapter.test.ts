/**
 * In-Memory Player Storage Adapter Tests
 *
 * Tests CRUD operations and edge cases for the in-memory player storage.
 * These tests improve coverage for uncovered lines 21-38, 41-57.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { InMemoryPlayerStorage } from './in-memory-player-storage.adapter';
import type { Player } from '../ports/player-storage.port';

describe('InMemoryPlayerStorage', () => {
	let storage: InMemoryPlayerStorage;

	beforeEach(() => {
		storage = new InMemoryPlayerStorage();
	});

	// ============================================================================
	// BASIC CRUD OPERATIONS
	// ============================================================================

	describe('save() and findById()', () => {
		test('should save and retrieve a player', () => {
			const player: Player = {
				id: 'player_1',
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave',
				joinedAt: new Date()
			};

			storage.save(player);
			const retrieved = storage.findById('player_1');

			expect(retrieved).toBeDefined();
			expect(retrieved?.displayName).toBe('Alice');
			expect(retrieved?.role).toBe('ESP');
		});

		test('should return undefined for non-existent player', () => {
			const result = storage.findById('non_existent');
			expect(result).toBeUndefined();
		});

		test('should overwrite player if saved with same ID', () => {
			const player1: Player = {
				id: 'player_1',
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave',
				joinedAt: new Date()
			};

			const player2: Player = {
				id: 'player_1',
				displayName: 'Alice Updated',
				role: 'Destination',
				teamName: 'Gmail',
				joinedAt: new Date()
			};

			storage.save(player1);
			storage.save(player2);

			const retrieved = storage.findById('player_1');
			expect(retrieved?.displayName).toBe('Alice Updated');
			expect(retrieved?.role).toBe('Destination');
		});
	});

	// ============================================================================
	// FIND BY IDS - EDGE CASES
	// ============================================================================

	describe('findByIds()', () => {
		test('should find multiple players by IDs', () => {
			const player1: Player = {
				id: 'player_1',
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave',
				joinedAt: new Date()
			};

			const player2: Player = {
				id: 'player_2',
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'Gmail',
				joinedAt: new Date()
			};

			storage.save(player1);
			storage.save(player2);

			const results = storage.findByIds(['player_1', 'player_2']);
			expect(results).toHaveLength(2);
			expect(results[0].displayName).toBe('Alice');
			expect(results[1].displayName).toBe('Bob');
		});

		test('should return empty array for empty input', () => {
			const results = storage.findByIds([]);
			expect(results).toEqual([]);
		});

		test('should filter out non-existent IDs', () => {
			const player: Player = {
				id: 'player_1',
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave',
				joinedAt: new Date()
			};

			storage.save(player);

			const results = storage.findByIds(['player_1', 'non_existent', 'also_missing']);
			expect(results).toHaveLength(1);
			expect(results[0].displayName).toBe('Alice');
		});

		test('should return empty array when all IDs are non-existent', () => {
			const results = storage.findByIds(['missing_1', 'missing_2']);
			expect(results).toEqual([]);
		});

		test('should preserve order based on input IDs', () => {
			const player1: Player = {
				id: 'player_1',
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave',
				joinedAt: new Date()
			};

			const player2: Player = {
				id: 'player_2',
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'Gmail',
				joinedAt: new Date()
			};

			storage.save(player1);
			storage.save(player2);

			// Request in reverse order
			const results = storage.findByIds(['player_2', 'player_1']);
			expect(results[0].displayName).toBe('Bob');
			expect(results[1].displayName).toBe('Alice');
		});
	});

	// ============================================================================
	// DELETE OPERATIONS
	// ============================================================================

	describe('delete()', () => {
		test('should delete an existing player', () => {
			const player: Player = {
				id: 'player_1',
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave',
				joinedAt: new Date()
			};

			storage.save(player);
			const deleted = storage.delete('player_1');

			expect(deleted).toBe(true);
			expect(storage.findById('player_1')).toBeUndefined();
		});

		test('should return false when deleting non-existent player', () => {
			const deleted = storage.delete('non_existent');
			expect(deleted).toBe(false);
		});

		test('should also remove player from room index when deleting', () => {
			const player: Player = {
				id: 'player_1',
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave',
				joinedAt: new Date()
			};

			storage.save(player);
			storage.associatePlayerWithRoom('player_1', 'ABC123');

			// Verify association exists
			expect(storage.getRoomCodeForPlayer('player_1')).toBe('ABC123');

			// Delete player
			storage.delete('player_1');

			// Verify association is removed
			expect(storage.getRoomCodeForPlayer('player_1')).toBeUndefined();
		});
	});

	// ============================================================================
	// CLEAR OPERATIONS
	// ============================================================================

	describe('clear()', () => {
		test('should clear all players', () => {
			const player1: Player = {
				id: 'player_1',
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave',
				joinedAt: new Date()
			};

			const player2: Player = {
				id: 'player_2',
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'Gmail',
				joinedAt: new Date()
			};

			storage.save(player1);
			storage.save(player2);

			storage.clear();

			expect(storage.findById('player_1')).toBeUndefined();
			expect(storage.findById('player_2')).toBeUndefined();
			expect(storage.findByIds(['player_1', 'player_2'])).toEqual([]);
		});

		test('should clear room index when clearing all', () => {
			const player: Player = {
				id: 'player_1',
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave',
				joinedAt: new Date()
			};

			storage.save(player);
			storage.associatePlayerWithRoom('player_1', 'ABC123');

			storage.clear();

			expect(storage.getRoomCodeForPlayer('player_1')).toBeUndefined();
		});

		test('should allow saving new players after clear', () => {
			const player1: Player = {
				id: 'player_1',
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave',
				joinedAt: new Date()
			};

			storage.save(player1);
			storage.clear();

			const player2: Player = {
				id: 'player_2',
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'Gmail',
				joinedAt: new Date()
			};

			storage.save(player2);

			expect(storage.findById('player_1')).toBeUndefined();
			expect(storage.findById('player_2')).toBeDefined();
		});
	});

	// ============================================================================
	// ROOM CODE ASSOCIATION
	// ============================================================================

	describe('Room Code Association', () => {
		test('should associate player with room code', () => {
			const player: Player = {
				id: 'player_1',
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave',
				joinedAt: new Date()
			};

			storage.save(player);
			storage.associatePlayerWithRoom('player_1', 'ABC123');

			const roomCode = storage.getRoomCodeForPlayer('player_1');
			expect(roomCode).toBe('ABC123');
		});

		test('should update room code association', () => {
			const player: Player = {
				id: 'player_1',
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave',
				joinedAt: new Date()
			};

			storage.save(player);
			storage.associatePlayerWithRoom('player_1', 'ABC123');
			storage.associatePlayerWithRoom('player_1', 'XYZ789');

			const roomCode = storage.getRoomCodeForPlayer('player_1');
			expect(roomCode).toBe('XYZ789');
		});

		test('should return undefined for player with no room association', () => {
			const player: Player = {
				id: 'player_1',
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave',
				joinedAt: new Date()
			};

			storage.save(player);

			const roomCode = storage.getRoomCodeForPlayer('player_1');
			expect(roomCode).toBeUndefined();
		});

		test('should find players by room code', () => {
			const player1: Player = {
				id: 'player_1',
				displayName: 'Alice',
				role: 'ESP',
				teamName: 'SendWave',
				joinedAt: new Date()
			};

			const player2: Player = {
				id: 'player_2',
				displayName: 'Bob',
				role: 'Destination',
				teamName: 'Gmail',
				joinedAt: new Date()
			};

			const player3: Player = {
				id: 'player_3',
				displayName: 'Charlie',
				role: 'ESP',
				teamName: 'MailMonkey',
				joinedAt: new Date()
			};

			storage.save(player1);
			storage.save(player2);
			storage.save(player3);

			storage.associatePlayerWithRoom('player_1', 'ABC123');
			storage.associatePlayerWithRoom('player_2', 'ABC123');
			storage.associatePlayerWithRoom('player_3', 'XYZ789');

			const room1Players = storage.findByRoomCode('ABC123');
			expect(room1Players).toHaveLength(2);
			expect(room1Players.map((p) => p.displayName).sort()).toEqual(['Alice', 'Bob']);

			const room2Players = storage.findByRoomCode('XYZ789');
			expect(room2Players).toHaveLength(1);
			expect(room2Players[0].displayName).toBe('Charlie');
		});

		test('should return empty array for room with no players', () => {
			const players = storage.findByRoomCode('EMPTY1');
			expect(players).toEqual([]);
		});
	});
});
