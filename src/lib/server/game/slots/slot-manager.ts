/**
 * Slot Manager
 *
 * Handles slot availability checking and slot information retrieval.
 * Extracted from player-manager.ts for better separation of concerns.
 */

import { getSession } from '../session-manager';

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

/**
 * Check if a specific slot is available
 * @param roomCode The room code
 * @param role The role type (ESP or Destination)
 * @param teamName The team or destination name
 * @returns true if slot is available, false if occupied
 */
export function isSlotAvailable(
	roomCode: string,
	role: 'ESP' | 'Destination',
	teamName: string
): boolean {
	const session = getSession(roomCode);

	if (!session) {
		return false;
	}

	if (role === 'ESP') {
		const team = session.esp_teams.find((t) => t.name === teamName);
		return team ? team.players.length === 0 : false;
	} else {
		const destination = session.destinations.find((d) => d.name === teamName);
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

	const espTeams: TeamSlot[] = session.esp_teams.map((team) => ({
		name: team.name,
		available: team.players.length === 0,
		playerCount: team.players.length,
		players: team.players
	}));

	const destinations: TeamSlot[] = session.destinations.map((dest) => ({
		name: dest.name,
		available: dest.players.length === 0,
		playerCount: dest.players.length,
		players: dest.players
	}));

	const espTeamCount = espTeams.filter((t) => !t.available).length;
	const destinationCount = destinations.filter((d) => !d.available).length;
	const totalPlayers = espTeamCount + destinationCount;

	return {
		espTeams,
		destinations,
		espTeamCount,
		destinationCount,
		totalPlayers
	};
}

/**
 * Check if slot is still available with fresh data (for race condition protection)
 * @param roomCode The room code
 * @param role The role type (ESP or Destination)
 * @param teamName The team or destination name
 * @returns true if slot is still available
 */
export function verifySlotAvailability(
	roomCode: string,
	role: 'ESP' | 'Destination',
	teamName: string
): boolean {
	const freshSession = getSession(roomCode);

	if (!freshSession) {
		return false;
	}

	const slotStillAvailable =
		role === 'ESP'
			? (freshSession.esp_teams.find((t) => t.name === teamName)?.players.length ?? 0) === 0
			: (freshSession.destinations.find((d) => d.name === teamName)?.players.length ?? 0) === 0;

	return slotStillAvailable;
}
