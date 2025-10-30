import { json, type RequestHandler } from '@sveltejs/kit';
import { getSession } from '$lib/server/game/session-manager';
import { gameLogger } from '$lib/server/logger';

/**
 * GET /api/sessions/[roomCode]/esp/[teamName]
 * Get ESP team dashboard data
 * US-2.1: ESP Team Dashboard
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

	gameLogger.event('esp_dashboard_fetch', { roomCode, teamName });

	// Get the session
	const session = getSession(roomCode);

	if (!session) {
		gameLogger.event('esp_dashboard_fetch_failed', {
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
	const team = session.esp_teams.find(
		(t) => t.name.toLowerCase() === teamName.toLowerCase()
	);

	if (!team) {
		gameLogger.event('esp_dashboard_fetch_failed', {
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

	// Calculate timer remaining time if timer exists
	let timerRemaining = 0;
	if (session.timer && session.timer.isRunning) {
		const elapsed = Math.floor((Date.now() - session.timer.startedAt.getTime()) / 1000);
		timerRemaining = Math.max(0, session.timer.duration - elapsed);
	}

	// Filter available clients by current round
	const availableClients = team.available_clients.filter(
		(client) => client.available_from_round <= session.current_round
	);

	// Prepare dashboard data
	const dashboardData = {
		success: true,
		team: {
			name: team.name,
			credits: team.credits,
			reputation: team.reputation,
			active_clients: team.active_clients,
			available_clients_count: availableClients.length,
			technical_auth: team.technical_auth,
			round_history: team.round_history
		},
		game: {
			roomCode: session.roomCode,
			current_round: session.current_round,
			current_phase: session.current_phase,
			timer: session.timer
				? {
						duration: session.timer.duration,
						remaining: timerRemaining,
						isRunning: session.timer.isRunning
					}
				: null
		},
		destinations: session.destinations.map((dest) => ({
			name: dest.name,
			weight: getDestinationWeight(dest.name)
		}))
	};

	gameLogger.event('esp_dashboard_fetch_success', {
		roomCode,
		teamName,
		credits: team.credits,
		currentRound: session.current_round
	});

	return json(dashboardData);
};

/**
 * Get destination market weight
 * Based on game design (Gmail: 50%, Outlook: 30%, Yahoo: 20%)
 */
function getDestinationWeight(destinationName: string): number {
	const weights: Record<string, number> = {
		Gmail: 50,
		Outlook: 30,
		Yahoo: 20
	};

	return weights[destinationName] || 0;
}
