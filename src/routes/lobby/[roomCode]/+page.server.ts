import { error } from '@sveltejs/kit';
import { getSession } from '$lib/server/game/session-manager';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { roomCode } = params;

	const session = getSession(roomCode);

	if (!session) {
		throw error(404, {
			message: 'Game session not found'
		});
	}

	return {
		session: {
			roomCode: session.roomCode,
			current_round: session.current_round,
			current_phase: session.current_phase,
			esp_teams: session.esp_teams,
			destinations: session.destinations
		}
	};
};
