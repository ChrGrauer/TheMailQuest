/**
 * GET /api/sessions/[roomCode]/esp/[teamName]/portfolio
 * US-2.4: Client Basic Management
 *
 * Returns full client portfolio with enriched client data:
 * - All acquired clients with their states merged
 * - Revenue preview (from active clients only)
 * - Budget forecast (current credits, no revenue)
 * - Team data (credits, client_states)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSession } from '$lib/server/game/session-manager';
import {
	calculateRevenuePreview,
	calculateBudgetForecast
} from '$lib/server/game/client-portfolio-manager';
import { gameLogger } from '$lib/server/logger';
import type { Client } from '$lib/server/game/types';

export const GET: RequestHandler = async ({ params }) => {
	const { roomCode, teamName } = params;

	if (!roomCode || !teamName) {
		return json({ error: 'Invalid parameters', success: false }, { status: 400 });
	}

	gameLogger.event('portfolio_fetch', { roomCode, teamName });

	const session = getSession(roomCode);

	if (!session) {
		gameLogger.event('portfolio_fetch_failed', { roomCode, teamName, reason: 'session_not_found' });
		return json({ error: 'Session not found', success: false }, { status: 404 });
	}

	// Find ESP team (case-insensitive)
	const team = session.esp_teams.find((t) => t.name.toLowerCase() === teamName.toLowerCase());
	if (!team) {
		gameLogger.event('portfolio_fetch_failed', { roomCode, teamName, reason: 'team_not_found' });
		return json({ error: 'ESP team not found', success: false }, { status: 404 });
	}

	// Get all clients from team's available_clients (marketplace stock)
	// These are the full Client objects
	const allClients = team.available_clients;

	// Build enriched client list with states merged
	const clients: Array<
		Client & {
			status: 'Active' | 'Paused' | 'Suspended';
			has_warmup: boolean;
			has_list_hygiene: boolean;
			first_active_round: number | null;
		}
	> = [];

	for (const clientId of team.active_clients) {
		// Find the client in available_clients
		const client = allClients.find((c) => c.id === clientId);
		if (!client) {
			gameLogger.event('client_not_found_in_marketplace', { roomCode, teamName, clientId });
			continue;
		}

		// Merge with state
		const clientState = team.client_states?.[clientId];
		if (clientState) {
			clients.push({
				...client,
				...clientState
			});
		}
	}

	// Calculate revenue preview and budget forecast
	const revenuePreview = calculateRevenuePreview(team, allClients);
	const budgetForecast = calculateBudgetForecast(team); // Only current credits, no revenue

	gameLogger.event('portfolio_fetch_success', {
		roomCode,
		teamName,
		clientCount: clients.length,
		revenuePreview,
		budgetForecast
	});

	return json({
		success: true,
		clients,
		revenue_preview: revenuePreview,
		budget_forecast: budgetForecast,
		pending_onboarding_decisions: team.pending_onboarding_decisions || {},
		team: {
			name: team.name,
			credits: team.credits,
			client_states: team.client_states || {}
		}
	});
};
