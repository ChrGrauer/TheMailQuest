import { json } from '@sveltejs/kit';
import { joinGame, type JoinGameRequest } from '$lib/server/game/player-manager';
import { getSession } from '$lib/server/game/session-manager';
import { gameWss } from '$lib/server/websocket';
import type { RequestHandler} from './$types';

/**
 * POST /api/sessions/[roomCode]/join
 * Add a player to a game session
 */
export const POST: RequestHandler = async ({ params, request }) => {
	const { roomCode } = params;

	try {
		const body = await request.json();
		const { displayName, role, teamName } = body;

		// Validate request body
		if (!displayName || !role || !teamName) {
			return json(
				{
					error: 'Missing required fields: displayName, role, teamName',
					success: false
				},
				{ status: 400 }
			);
		}

		// Validate role
		if (role !== 'ESP' && role !== 'Destination') {
			return json(
				{
					error: 'Invalid role. Must be ESP or Destination',
					success: false
				},
				{ status: 400 }
			);
		}

		// Attempt to join game
		const joinRequest: JoinGameRequest = {
			roomCode,
			displayName,
			role,
			teamName
		};

		const result = joinGame(joinRequest);

		if (!result.success) {
			return json(
				{
					error: result.error,
					success: false
				},
				{ status: 400 }
			);
		}

		// Broadcast lobby update to all clients in the room
		const session = getSession(roomCode);
		if (session) {
			gameWss.broadcastToRoom(roomCode, {
				type: 'lobby_update',
				data: {
					espTeams: session.esp_teams,
					destinations: session.destinations,
					newPlayer: {
						id: result.playerId,
						displayName: result.player!.displayName,
						role: result.player!.role,
						teamName: result.player!.teamName
					}
				}
			});
		}

		return json({
			success: true,
			playerId: result.playerId,
			player: result.player
		});
	} catch (error) {
		return json(
			{
				error: 'An error occurred while joining the game',
				success: false
			},
			{ status: 500 }
		);
	}
};
