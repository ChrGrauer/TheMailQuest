/**
 * US-2.6.2: Destination Tech Shop API - List Tools
 *
 * GET /api/sessions/[roomCode]/destination/[destName]/tools
 * Returns all available tools with status for the destination
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { getSession } from '$lib/server/game/session-manager';
import { DESTINATION_TOOLS } from '$lib/config/destination-technical-upgrades';

/**
 * Get all tools for a destination with their status
 *
 * Returns:
 * - tools: Array of tools with status (Owned/Available/Locked/Unavailable)
 * - budget: Current destination budget
 * - authentication_level: Current auth level (0-3)
 * - owned_tools: Array of owned tool IDs
 * - kingdom: Destination kingdom
 */
export const GET: RequestHandler = async ({ params }) => {
	const { roomCode, destName } = params;

	if (!roomCode || !destName) {
		return json(
			{
				error: 'Invalid parameters'
			},
			{ status: 400 }
		);
	}

	// Get session
	const session = getSession(roomCode);
	if (!session) {
		return json(
			{
				error: 'Session not found'
			},
			{ status: 404 }
		);
	}

	// Find destination (case-insensitive)
	const destination = session.destinations.find(
		(d) => d.name.toLowerCase() === destName.toLowerCase()
	);

	if (!destination) {
		return json(
			{
				error: 'Destination not found'
			},
			{ status: 404 }
		);
	}

	const kingdom = destination.kingdom || 'zmail';
	const ownedTools = destination.owned_tools || [];

	// Map tools with status
	const tools = Object.values(DESTINATION_TOOLS).map((tool) => {
		let status = 'Not Owned';

		if (ownedTools.includes(tool.id)) {
			status = 'Owned';
		} else if (!tool.availability[kingdom]) {
			status = 'Unavailable';
		} else if (tool.requires) {
			// Check if prerequisites are met
			const requirements = Array.isArray(tool.requires) ? tool.requires : [tool.requires];
			const hasAll = requirements.every((reqId) => ownedTools.includes(reqId));
			status = hasAll ? 'Available' : 'Locked';
		} else {
			status = 'Available';
		}

		return {
			...tool,
			status,
			cost: tool.pricing[kingdom],
			unavailable_reason: tool.unavailable_reason?.[kingdom]
		};
	});

	return json({
		tools,
		budget: destination.budget,
		authentication_level: destination.authentication_level || 0,
		owned_tools: ownedTools,
		kingdom
	});
};
