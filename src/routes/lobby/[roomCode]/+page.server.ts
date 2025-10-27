import { error } from '@sveltejs/kit';
import { getSession } from '$lib/server/game/session-manager';
import { getPlayersByIds } from '$lib/server/game/player-manager';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { roomCode } = params;

	const session = getSession(roomCode);

	if (!session) {
		throw error(404, {
			message: 'Game session not found'
		});
	}

	// Collect all player IDs from teams and destinations
	const allPlayerIds: string[] = [];
	session.esp_teams.forEach((team) => allPlayerIds.push(...team.players));
	session.destinations.forEach((dest) => allPlayerIds.push(...dest.players));

	// Fetch player details
	const players = getPlayersByIds(allPlayerIds);
	const playerNames: Record<string, string> = {};
	players.forEach((player) => {
		playerNames[player.id] = player.displayName;
	});

	return {
		session: {
			roomCode: session.roomCode,
			current_round: session.current_round,
			current_phase: session.current_phase,
			esp_teams: session.esp_teams,
			destinations: session.destinations
		},
		playerNames
	};
};
