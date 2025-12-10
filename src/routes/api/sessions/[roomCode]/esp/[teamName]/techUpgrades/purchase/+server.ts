import { json, type RequestHandler } from '@sveltejs/kit';
import { purchaseTechUpgrade } from '$lib/server/game/tech-purchase-manager';
import { getSession } from '$lib/server/game/session-manager';
import { gameLogger } from '$lib/server/logger';
import { gameWss } from '$lib/server/websocket';

/**
 * POST /api/sessions/[roomCode]/esp/[teamName]/techUpgrades/purchase
 * Purchase a technical upgrade
 * US-2.3: Technical Infrastructure Shop
 */
export const POST: RequestHandler = async ({ params, request }) => {
	const roomCode = params.roomCode;
	const teamName = params.teamName;

	if (!roomCode || !teamName) {
		return json(
			{
				error: 'Invalid parameters',
				success: false
			},
			{ status: 400 }
		);
	}

	let upgradeId: string;
	try {
		const body = await request.json();
		upgradeId = body.upgradeId;

		if (!upgradeId) {
			return json(
				{
					error: 'Missing upgradeId in request body',
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

	gameLogger.event('tech_purchase_attempt', {
		roomCode,
		teamName,
		upgradeId
	});

	// Attempt purchase
	const result = purchaseTechUpgrade(roomCode, teamName, upgradeId);

	if (!result.success) {
		return json(
			{
				error: result.error,
				success: false
			},
			{ status: 400 }
		);
	}

	// Purchase successful - broadcast update via WebSocket
	const session = getSession(roomCode);
	if (session && result.updatedTeam) {
		gameWss.broadcastToRoom(roomCode, {
			type: 'esp_dashboard_update',
			teamName: teamName, // Include team name to filter updates on client side
			credits: result.updatedTeam.credits,
			owned_tech_upgrades: result.updatedTeam.owned_tech_upgrades,
			client_states: result.updatedTeam.client_states
		});

		gameLogger.event('tech_purchase_broadcast', {
			roomCode,
			teamName,
			upgradeId,
			credits: result.updatedTeam.credits,
			ownedUpgrades: result.updatedTeam.owned_tech_upgrades
		});
	}

	return json({
		success: true,
		team: {
			name: result.updatedTeam?.name,
			credits: result.updatedTeam?.credits,
			owned_tech_upgrades: result.updatedTeam?.owned_tech_upgrades
		}
	});
};
