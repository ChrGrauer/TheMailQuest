/**
 * Incident Effects Manager
 * Phase 1: MVP Foundation
 *
 * Handles application of incident effects to game state:
 * - Reputation changes (all ESPs)
 * - Credit changes (all ESPs)
 * - Budget changes (all destinations)
 * - Notifications
 *
 * Effects are applied with proper clamping:
 * - Reputation: 0-100
 * - Credits/Budget: >= 0
 */

import type { GameSession } from './types';
import type { IncidentCard, EffectApplicationResult, EffectChanges } from '$lib/types/incident';

// Lazy logger import
let gameLogger: any = null;
async function getLogger() {
	if (!gameLogger) {
		const module = await import('../logger');
		gameLogger = module.gameLogger;
	}
	return gameLogger;
}

/**
 * Clamp reputation value to valid range [0, 100]
 */
function clampReputation(value: number): number {
	return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Clamp budget/credits to minimum of 0 (cannot go negative)
 */
function clampBudget(value: number): number {
	return Math.max(0, Math.round(value));
}

/**
 * Apply incident effects to game state
 *
 * @param session - Game session to modify
 * @param incident - Incident card with effects to apply
 * @returns Result with success status and detailed changes
 */
export function applyIncidentEffects(
	session: GameSession,
	incident: IncidentCard
): EffectApplicationResult {
	const logger = getLogger();

	// Initialize changes tracking
	const changes: EffectChanges = {
		espChanges: {},
		destinationChanges: {},
		notifications: []
	};

	try {
		// Process each effect
		for (const effect of incident.effects) {
			switch (effect.target) {
				case 'all_esps':
					// Apply effect to all ESP teams
					if (effect.type === 'reputation' && effect.value !== undefined) {
						// Reputation change: apply to all destinations
						for (const team of session.esp_teams) {
							if (!changes.espChanges[team.name]) {
								changes.espChanges[team.name] = {};
							}
							if (!changes.espChanges[team.name].reputation) {
								changes.espChanges[team.name].reputation = {};
							}

							// Apply to all destinations
							for (const destName in team.reputation) {
								const oldReputation = team.reputation[destName];
								const newReputation = clampReputation(oldReputation + effect.value);
								team.reputation[destName] = newReputation;

								// Track change
								changes.espChanges[team.name].reputation![destName] = effect.value;
							}
						}
					} else if (effect.type === 'credits' && effect.value !== undefined) {
						// Credits change
						for (const team of session.esp_teams) {
							if (!changes.espChanges[team.name]) {
								changes.espChanges[team.name] = {};
							}

							const oldCredits = team.credits;
							const newCredits = clampBudget(oldCredits + effect.value);
							team.credits = newCredits;

							// Track change
							changes.espChanges[team.name].credits = effect.value;
						}
					}
					break;

				case 'all_destinations':
					// Apply effect to all destination teams
					if (effect.type === 'budget' && effect.value !== undefined) {
						for (const destination of session.destinations) {
							if (!changes.destinationChanges[destination.name]) {
								changes.destinationChanges[destination.name] = {};
							}

							const oldBudget = destination.budget;
							const newBudget = clampBudget(oldBudget + effect.value);
							destination.budget = newBudget;

							// Track change
							changes.destinationChanges[destination.name].budget = effect.value;
						}
					}
					break;

				case 'notification':
					// Just add notification message
					if (effect.type === 'notification' && effect.message) {
						changes.notifications.push(effect.message);
					}
					break;

				default:
					// Unknown target - log warning but don't fail
					logger.then((log: any) => {
						log.warn({
							action: 'incident_effect_unknown_target',
							target: effect.target,
							incidentId: incident.id
						});
					});
			}
		}

		// Log successful effect application
		logger.then((log: any) => {
			log.info({
				action: 'incident_effects_applied',
				roomCode: session.roomCode,
				incidentId: incident.id,
				incidentName: incident.name,
				espChanges: Object.keys(changes.espChanges),
				destinationChanges: Object.keys(changes.destinationChanges),
				notificationCount: changes.notifications.length
			});
		});

		return {
			success: true,
			changes
		};
	} catch (error) {
		// Log error
		logger.then((log: any) => {
			log.error({
				action: 'incident_effects_error',
				roomCode: session.roomCode,
				incidentId: incident.id,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		});

		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to apply incident effects',
			changes
		};
	}
}
