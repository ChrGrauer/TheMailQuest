/**
 * US-2.6.1: Destination Filtering Controls API - Update Filtering Policy
 *
 * POST /api/sessions/[roomCode]/destination/[destName]/filtering
 * Update filtering policy for a specific ESP at a destination
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { updateFilteringPolicy } from '$lib/server/game/filtering-policy-manager';
import { gameWss } from '$lib/server/websocket';
import type { FilteringLevel } from '$lib/server/game/types';

/**
 * Update filtering policy for a specific ESP
 *
 * Request body:
 * - espName: string (required)
 * - level: FilteringLevel (required) - 'permissive' | 'moderate' | 'strict' | 'maximum'
 *
 * Returns:
 * - success: boolean
 * - filtering_policies: Updated filtering policies
 * - error: Error message if failed
 */
export const POST: RequestHandler = async ({ params, request }) => {
	const { roomCode, destName } = params;

	if (!roomCode || !destName) {
		return json(
			{
				error: 'Invalid parameters',
				success: false
			},
			{ status: 400 }
		);
	}

	// Parse request body
	let espName: string;
	let level: FilteringLevel;

	try {
		const body = await request.json();
		espName = body.espName;
		level = body.level;

		if (!espName) {
			return json(
				{
					error: 'Missing espName in request body',
					success: false
				},
				{ status: 400 }
			);
		}

		if (!level) {
			return json(
				{
					error: 'Missing level in request body',
					success: false
				},
				{ status: 400 }
			);
		}
	} catch (error) {
		return json(
			{
				error: 'Invalid request body',
				success: false
			},
			{ status: 400 }
		);
	}

	// Attempt update
	const result = await updateFilteringPolicy(roomCode, destName, espName, level);

	if (!result.success) {
		return json(
			{
				success: false,
				error: result.error
			},
			{ status: 400 }
		);
	}

	// Broadcast WebSocket update on success
	if (result.filtering_policies) {
		gameWss.broadcastToRoom(roomCode, {
			type: 'destination_dashboard_update',
			destinationName: destName,
			filtering_policies: result.filtering_policies
		});
	}

	return json({
		success: true,
		filtering_policies: result.filtering_policies
	});
};
