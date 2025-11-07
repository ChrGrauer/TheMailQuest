/**
 * POST /api/test/set-team-state
 * Test-only endpoint to directly manipulate team state for E2E testing
 *
 * This allows tests to set up complex scenarios without making multiple API calls
 * ONLY available in development/test environments
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSession } from '$lib/server/game/session-manager';
import { gameLogger } from '$lib/server/logger';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { roomCode, teamName, credits, budget, pending_onboarding_decisions } = body;

	if (!roomCode || !teamName) {
		return json({ error: 'Invalid parameters', success: false }, { status: 400 });
	}

	const session = getSession(roomCode);
	if (!session) {
		return json({ error: 'Session not found', success: false }, { status: 404 });
	}

	// Find ESP team
	const team = session.esp_teams.find((t) => t.name.toLowerCase() === teamName.toLowerCase());
	if (!team) {
		return json({ error: 'Team not found', success: false }, { status: 404 });
	}

	// Set credits if provided
	if (credits !== undefined) {
		team.credits = credits;
	}

	// Set budget (committed costs) if provided
	if (budget !== undefined) {
		team.budget = budget;
	}

	// Set pending onboarding decisions if provided
	if (pending_onboarding_decisions !== undefined) {
		team.pending_onboarding_decisions = pending_onboarding_decisions;
	}

	gameLogger.info('Test: Set team state', {
		roomCode,
		teamName,
		credits: team.credits,
		budget: team.budget,
		pendingOnboardingCount: Object.keys(team.pending_onboarding_decisions || {}).length
	});

	return json({
		success: true,
		team: {
			name: team.name,
			credits: team.credits,
			budget: team.budget,
			pending_onboarding_decisions: team.pending_onboarding_decisions
		}
	});
};
