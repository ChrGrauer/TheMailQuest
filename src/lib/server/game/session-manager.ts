/**
 * Game Session Manager
 * US-1.1: Create Game Session
 *
 * Handles creation, storage, and management of game sessions
 * Uses hexagonal architecture with dependency injection for storage
 */

import type { GameSession, ESPTeam, Destination } from './types';
import type { SessionStoragePort } from './ports/session-storage.port';
import { InMemorySessionStorage } from './adapters/in-memory-storage.adapter';
import { gameLogger } from '../logger';

// Singleton storage instance (can be replaced with DI container)
let storage: SessionStoragePort = new InMemorySessionStorage();

/**
 * Set the storage adapter (for testing or switching implementations)
 */
export function setStorageAdapter(adapter: SessionStoragePort): void {
	storage = adapter;
}

/**
 * Get the current storage adapter
 */
export function getStorageAdapter(): SessionStoragePort {
	return storage;
}

/**
 * Generate a unique 6-character room code
 * Format: [A-Z0-9]{6}
 */
function generateRoomCode(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let code = '';
	for (let i = 0; i < 6; i++) {
		code += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return code;
}

/**
 * Create initial ESP teams with predefined names
 * US-1.4: Added resource allocation fields
 * US-2.3: Renamed technical_auth to owned_tech_upgrades
 */
function createInitialESPTeams(): ESPTeam[] {
	const teamNames = ['SendWave', 'MailMonkey', 'BluePost', 'SendBolt', 'RocketMail'];

	return teamNames.map((name) => ({
		name,
		players: [],
		budget: 0,
		clients: [],
		technical_stack: [],
		// US-1.4: Initialize resource allocation fields
		credits: 0,
		reputation: {},
		active_clients: [],
		owned_tech_upgrades: [], // US-2.3: Owned technical upgrade IDs
		round_history: [],
		// US-2.2: Initialize marketplace
		available_clients: []
	}));
}

/**
 * Create initial destinations with predefined names
 * US-1.4: Added resource allocation fields
 */
function createInitialDestinations(): Destination[] {
	const destinationNames: Array<'zmail' | 'intake' | 'yagle'> = ['zmail', 'intake', 'yagle'];

	return destinationNames.map((name) => ({
		name,
		kingdom: name, // US-2.6.2: Set kingdom for pricing
		players: [],
		budget: 0,
		// US-1.4: Initialize resource allocation fields
		filtering_policies: {},
		esp_reputation: {},
		user_satisfaction: 100
	}));
}

/**
 * Create a new game session
 * @param facilitatorId The ID of the facilitator creating the session (US-1.3)
 * @returns The newly created game session
 * @throws Error if unable to generate a unique room code after 100 attempts
 */
export function createGameSession(facilitatorId: string): GameSession {
	let roomCode = generateRoomCode();
	let attempts = 0;
	const maxAttempts = 100;

	// Handle room code collision - regenerate if code already exists
	while (storage.exists(roomCode) && attempts < maxAttempts) {
		roomCode = generateRoomCode();
		attempts++;
	}

	if (attempts >= maxAttempts) {
		gameLogger.error(new Error('Failed to generate unique room code'), {
			context: 'createGameSession',
			attempts: maxAttempts
		});
		throw new Error('Unable to create game session. Please try again.');
	}

	const now = new Date();

	const session: GameSession = {
		roomCode,
		facilitatorId, // US-1.3: Store facilitator ID
		current_round: 0,
		current_phase: 'lobby',
		esp_teams: createInitialESPTeams(),
		destinations: createInitialDestinations(),
		createdAt: now,
		lastActivity: now
	};

	storage.save(session);

	gameLogger.event('session_created', {
		roomCode,
		facilitatorId, // US-1.3: Log facilitator ID
		timestamp: now.toISOString()
	});

	return session;
}

/**
 * Get a game session by room code
 * @param roomCode The room code to look up
 * @returns The game session or undefined if not found
 */
export function getSession(roomCode: string): GameSession | undefined {
	return storage.findByRoomCode(roomCode);
}

/**
 * Get all active game sessions
 * @returns Array of all active game sessions
 */
export function getAllSessions(): GameSession[] {
	return storage.findAll();
}

/**
 * Delete a game session
 * @param roomCode The room code of the session to delete
 * @returns true if deleted, false if not found
 */
export function deleteSession(roomCode: string): boolean {
	const deleted = storage.delete(roomCode);

	if (deleted) {
		gameLogger.event('session_deleted', { roomCode });
	}

	return deleted;
}

/**
 * Update the last activity timestamp for a session
 * @param roomCode The room code of the session to update
 */
export function updateActivity(roomCode: string): void {
	const session = storage.findByRoomCode(roomCode);

	if (session) {
		session.lastActivity = new Date();
		storage.update(session);

		gameLogger.event('session_activity', {
			roomCode,
			timestamp: session.lastActivity.toISOString()
		});
	}
}

/**
 * Check for and remove expired sessions
 * Sessions expire after 2 hours of inactivity
 */
export function checkExpiredSessions(): void {
	const twoHours = 2 * 60 * 60 * 1000;
	const expiredSessions = storage.findInactiveSessions(twoHours);

	for (const session of expiredSessions) {
		storage.delete(session.roomCode);

		gameLogger.event('session_expired', {
			roomCode: session.roomCode,
			createdAt: session.createdAt.toISOString(),
			lastActivity: session.lastActivity.toISOString(),
			inactiveFor:
				Math.floor((Date.now() - session.lastActivity.getTime()) / 1000 / 60) + ' minutes'
		});
	}

	if (expiredSessions.length > 0) {
		gameLogger.event('expired_sessions_cleaned', {
			count: expiredSessions.length,
			remainingSessions: storage.findAll().length
		});
	}
}

/**
 * Test helper: Set session activity time (for testing expiration)
 * @param roomCode The room code
 * @param activityTime The activity timestamp to set
 */
export function setSessionActivity(roomCode: string, activityTime: Date): void {
	const session = storage.findByRoomCode(roomCode);

	if (session) {
		session.lastActivity = activityTime;
		storage.update(session);
	}
}

// Start periodic cleanup of expired sessions (every 10 minutes)
if (typeof setInterval !== 'undefined') {
	setInterval(
		() => {
			checkExpiredSessions();
		},
		10 * 60 * 1000
	);
}
