import { json, type RequestHandler } from '@sveltejs/kit';
import { getSession } from '$lib/server/game/session-manager';
import { TECHNICAL_UPGRADES, getUpgradeStatus } from '$lib/config/technical-upgrades';
import { gameLogger } from '$lib/server/logger';

/**
 * GET /api/sessions/[roomCode]/esp/[teamName]/techUpgrades
 * Get available technical upgrades for ESP team
 * US-2.3: Technical Infrastructure Shop
 */
export const GET: RequestHandler = async ({ params }) => {
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

	gameLogger.event('tech_upgrades_fetch', { roomCode, teamName });

	// Get the session
	const session = getSession(roomCode);

	if (!session) {
		gameLogger.event('tech_upgrades_fetch_failed', {
			roomCode,
			teamName,
			reason: 'Session not found'
		});
		return json(
			{
				error: 'Session not found',
				success: false
			},
			{ status: 404 }
		);
	}

	// Find the ESP team (case-insensitive)
	const team = session.esp_teams.find((t) => t.name.toLowerCase() === teamName.toLowerCase());

	if (!team) {
		gameLogger.event('tech_upgrades_fetch_failed', {
			roomCode,
			teamName,
			reason: 'ESP team not found'
		});
		return json(
			{
				error: 'ESP team not found',
				success: false
			},
			{ status: 404 }
		);
	}

	// Prepare upgrades with status
	const upgradesWithStatus = TECHNICAL_UPGRADES.map((upgrade) => ({
		id: upgrade.id,
		name: upgrade.name,
		description: upgrade.description,
		cost: upgrade.cost,
		category: upgrade.category,
		dependencies: upgrade.dependencies || [],
		benefits: upgrade.benefits || [],
		mandatory: upgrade.mandatory || false,
		mandatoryFrom: upgrade.mandatoryFrom,
		status: getUpgradeStatus(upgrade.id, team.owned_tech_upgrades)
	}));

	gameLogger.event('tech_upgrades_fetch_success', {
		roomCode,
		teamName,
		upgradeCount: upgradesWithStatus.length,
		ownedCount: team.owned_tech_upgrades.length
	});

	return json({
		success: true,
		upgrades: upgradesWithStatus,
		currentRound: session.current_round,
		teamCredits: team.credits,
		ownedUpgrades: team.owned_tech_upgrades
	});
};
