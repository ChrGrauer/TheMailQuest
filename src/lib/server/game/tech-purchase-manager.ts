/**
 * US-2.3: Technical Infrastructure Shop - Tech Purchase Manager
 *
 * Handles tech upgrade purchases including:
 * - Credit deduction
 * - Adding tech to owned_tech_upgrades
 * - Team state updates
 * - Validation orchestration
 * - Comprehensive logging
 */

import { getSession, updateActivity } from './session-manager';
import { validateTechPurchase, getValidationErrorMessage } from './validation/tech-validator';
import { getTechnicalUpgrade } from '$lib/config/technical-upgrades';
import type { ESPTeam } from './types';
import { gameLogger } from '../logger';

/**
 * Tech Purchase Result
 */
export interface TechPurchaseResult {
	success: boolean;
	error?: string;
	updatedTeam?: ESPTeam;
}

/**
 * Purchase a tech upgrade for an ESP team
 *
 * Process:
 * 1. Validate session and team exist
 * 2. Validate upgrade exists
 * 3. Validate purchase (dependencies, credits, not owned)
 * 4. Deduct credits
 * 5. Add to owned_tech_upgrades
 * 6. Log purchase
 * 7. Return updated team
 *
 * @param roomCode - Game session room code
 * @param teamName - ESP team name
 * @param upgradeId - Tech upgrade ID to purchase
 * @returns Purchase result with success flag and updated team or error
 */
export function purchaseTechUpgrade(
	roomCode: string,
	teamName: string,
	upgradeId: string
): TechPurchaseResult {
	// Validate session exists
	const session = getSession(roomCode);
	if (!session) {
		gameLogger.event('tech_purchase_failed', {
			roomCode,
			teamName,
			upgradeId,
			reason: 'session_not_found'
		});
		return {
			success: false,
			error: 'Session not found'
		};
	}

	// Find ESP team (case-insensitive)
	const teamIndex = session.esp_teams.findIndex(
		(t) => t.name.toLowerCase() === teamName.toLowerCase()
	);

	if (teamIndex === -1) {
		gameLogger.event('tech_purchase_failed', {
			roomCode,
			teamName,
			upgradeId,
			reason: 'team_not_found'
		});
		return {
			success: false,
			error: 'ESP team not found'
		};
	}

	const team = session.esp_teams[teamIndex];

	// Validate upgrade exists
	const upgrade = getTechnicalUpgrade(upgradeId);
	if (!upgrade) {
		gameLogger.event('tech_purchase_failed', {
			roomCode,
			teamName,
			upgradeId,
			reason: 'upgrade_not_found'
		});
		return {
			success: false,
			error: 'Tech upgrade not found'
		};
	}

	// Validate purchase
	const validation = validateTechPurchase(team, upgrade);
	if (!validation.canPurchase) {
		const errorMessage = getValidationErrorMessage(validation);

		gameLogger.event('tech_purchase_failed', {
			roomCode,
			teamName,
			upgradeId,
			upgradeName: upgrade.name,
			reason: validation.reason,
			missingDependencies: validation.missingDependencies,
			requiredCredits: validation.requiredCredits,
			availableCredits: validation.availableCredits
		});

		return {
			success: false,
			error: errorMessage
		};
	}

	// Capture state before purchase for logging
	const creditsBefore = team.credits;

	// Perform purchase
	team.credits -= upgrade.cost;
	team.owned_tech_upgrades.push(upgradeId);

	// Update activity timestamp
	updateActivity(roomCode);

	// Log successful purchase
	gameLogger.event('tech_purchase_success', {
		roomCode,
		teamName,
		upgradeId,
		upgradeName: upgrade.name,
		cost: upgrade.cost,
		creditsBefore,
		creditsAfter: team.credits,
		ownedUpgrades: team.owned_tech_upgrades,
		timestamp: new Date().toISOString()
	});

	return {
		success: true,
		updatedTeam: team
	};
}

/**
 * Get purchase summary for logging/display
 *
 * @param roomCode - Game session room code
 * @param teamName - ESP team name
 * @returns Purchase summary with credits and owned upgrades
 */
export function getPurchaseSummary(
	roomCode: string,
	teamName: string
): { credits: number; ownedUpgrades: string[] } | null {
	const session = getSession(roomCode);
	if (!session) return null;

	const team = session.esp_teams.find((t) => t.name.toLowerCase() === teamName.toLowerCase());

	if (!team) return null;

	return {
		credits: team.credits,
		ownedUpgrades: team.owned_tech_upgrades
	};
}
