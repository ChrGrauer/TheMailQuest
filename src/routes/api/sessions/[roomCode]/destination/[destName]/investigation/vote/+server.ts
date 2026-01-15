import { json, type RequestHandler } from '@sveltejs/kit';
import { getSession } from '$lib/server/game/session-manager';
import {
	castInvestigationVote,
	removeInvestigationVote,
	getInvestigationVotes,
	INVESTIGATION_COST
} from '$lib/server/game/investigation-manager';
import { gameWss } from '$lib/server/websocket';
import { gameLogger } from '$lib/server/logger';

/**
 * POST /api/sessions/[roomCode]/destination/[destName]/investigation/vote
 * US-2.7: Cast or change investigation vote
 *
 * Request body: { targetEsp: string }
 */
export const POST: RequestHandler = async ({ params, request }) => {
	const { roomCode, destName } = params;

	if (!roomCode || !destName) {
		return json({ error: 'Invalid parameters', success: false }, { status: 400 });
	}

	try {
		const { targetEsp } = await request.json();

		if (!targetEsp) {
			return json({ error: 'targetEsp is required', success: false }, { status: 400 });
		}

		// Cast the vote
		const result = castInvestigationVote({
			roomCode,
			destinationName: destName,
			targetEsp
		});

		if (!result.success) {
			gameLogger.event('investigation_vote_failed', {
				roomCode,
				destination: destName,
				targetEsp,
				error: result.error
			});
			return json({ error: result.error, success: false }, { status: 400 });
		}

		// Broadcast vote update to all clients in the room
		gameWss.broadcastToRoom(roomCode, {
			type: 'investigation_update',
			event: 'vote',
			votes: result.currentVotes!,
			voterName: destName,
			action: 'voted',
			targetEsp
		});

		return json({
			success: true,
			votes: result.currentVotes,
			reservedCredits: INVESTIGATION_COST
		});
	} catch (error) {
		gameLogger.error(error as Error, {
			context: 'POST /api/sessions/[roomCode]/destination/[destName]/investigation/vote',
			roomCode,
			destName
		});
		return json({ error: 'Failed to cast vote', success: false }, { status: 500 });
	}
};

/**
 * DELETE /api/sessions/[roomCode]/destination/[destName]/investigation/vote
 * US-2.7: Remove investigation vote
 */
export const DELETE: RequestHandler = async ({ params }) => {
	const { roomCode, destName } = params;

	if (!roomCode || !destName) {
		return json({ error: 'Invalid parameters', success: false }, { status: 400 });
	}

	try {
		// Get current vote before removing (for broadcast)
		const session = getSession(roomCode);
		const destination = session?.destinations.find(
			(d) => d.name.toLowerCase() === destName.toLowerCase()
		);
		const previousVote = destination?.pending_investigation_vote?.espName;

		// Remove the vote
		const result = removeInvestigationVote({
			roomCode,
			destinationName: destName
		});

		if (!result.success) {
			gameLogger.event('investigation_vote_remove_failed', {
				roomCode,
				destination: destName,
				error: result.error
			});
			return json({ error: result.error, success: false }, { status: 400 });
		}

		// Broadcast vote update to all clients in the room
		gameWss.broadcastToRoom(roomCode, {
			type: 'investigation_update',
			event: 'vote',
			votes: result.currentVotes!,
			voterName: destName,
			action: 'removed',
			targetEsp: previousVote
		});

		return json({
			success: true,
			votes: result.currentVotes
		});
	} catch (error) {
		gameLogger.error(error as Error, {
			context: 'DELETE /api/sessions/[roomCode]/destination/[destName]/investigation/vote',
			roomCode,
			destName
		});
		return json({ error: 'Failed to remove vote', success: false }, { status: 500 });
	}
};

/**
 * GET /api/sessions/[roomCode]/destination/[destName]/investigation/vote
 * US-2.7: Get current investigation votes
 */
export const GET: RequestHandler = async ({ params }) => {
	const { roomCode, destName } = params;

	if (!roomCode || !destName) {
		return json({ error: 'Invalid parameters', success: false }, { status: 400 });
	}

	try {
		const session = getSession(roomCode);
		if (!session) {
			return json({ error: 'Session not found', success: false }, { status: 404 });
		}

		// Get destination's current vote
		const destination = session.destinations.find(
			(d) => d.name.toLowerCase() === destName.toLowerCase()
		);
		if (!destination) {
			return json({ error: 'Destination not found', success: false }, { status: 404 });
		}

		// Get all votes
		const votes = getInvestigationVotes(roomCode);

		// Get list of ESP teams (with players) for voting targets
		const espTeams = session.esp_teams
			.filter((e) => e.players.length > 0)
			.map((e) => ({ name: e.name }));

		return json({
			success: true,
			votes,
			myVote: destination.pending_investigation_vote?.espName || null,
			espTeams,
			voteCost: INVESTIGATION_COST,
			canVote: !destination.locked_in && session.current_phase === 'planning'
		});
	} catch (error) {
		gameLogger.error(error as Error, {
			context: 'GET /api/sessions/[roomCode]/destination/[destName]/investigation/vote',
			roomCode,
			destName
		});
		return json({ error: 'Failed to get votes', success: false }, { status: 500 });
	}
};
