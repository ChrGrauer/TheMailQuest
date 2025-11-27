/**
 * US-2.6.2: Destination Tech Shop API - Purchase Tool
 *
 * POST /api/sessions/[roomCode]/destination/[destName]/tools/purchase
 * Purchase a tool for a destination
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { purchaseDestinationTool } from '$lib/server/game/destination-tool-purchase-manager';
import { gameWss } from '$lib/server/websocket';

/**
 * Purchase a tool for a destination
 *
 * Request body:
 * - toolId: string (required)
 * - announcement: 'announce' | 'secret' (optional, for Spam Trap Network)
 *
 * Returns:
 * - success: boolean
 * - budget: Updated budget
 * - owned_tools: Updated owned tools array
 * - authentication_level: Updated auth level
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
	let toolId: string;
	let announcement: 'announce' | 'secret' | undefined;

	try {
		const body = await request.json();
		toolId = body.toolId;
		announcement = body.announcement;

		if (!toolId) {
			return json(
				{
					error: 'Missing toolId in request body',
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

	// Attempt purchase
	const result = purchaseDestinationTool(roomCode, destName, toolId, announcement);

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
	if (result.updatedDestination) {
		gameWss.broadcastToRoom(roomCode, {
			type: 'destination_dashboard_update',
			destinationName: destName,
			budget: result.updatedDestination.budget,
			owned_tools: result.updatedDestination.owned_tools,
			authentication_level: result.updatedDestination.authentication_level
		});
	}

	return json({
		success: true,
		budget: result.updatedDestination?.budget,
		owned_tools: result.updatedDestination?.owned_tools,
		authentication_level: result.updatedDestination?.authentication_level
	});
};
