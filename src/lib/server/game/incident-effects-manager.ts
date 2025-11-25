/**
 * Incident Effects Manager
 * Phase 1: MVP Foundation
 * Phase 2: Conditional Effects
 *
 * Handles application of incident effects to game state:
 * - Reputation changes (all ESPs, selected ESP, conditional ESP, selected client)
 * - Credit changes (all ESPs, selected ESP, selected client)
 * - Budget changes (all destinations)
 * - Volume modifiers (selected client, all ESPs with client type filter)
 * - Spam trap modifiers (selected client, all ESPs with client type filter)
 * - Auto-lock (selected ESP)
 * - Conditional effects (has_tech, lacks_tech)
 * - Notifications
 *
 * Effects are applied with proper clamping:
 * - Reputation: 0-100
 * - Credits/Budget: >= 0
 */

import type { GameSession } from './types';
import type {
	IncidentCard,
	EffectApplicationResult,
	EffectChanges,
	EffectCondition
} from '$lib/types/incident';

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
 * Phase 2: Evaluate if a condition is met for an ESP team
 */
function evaluateCondition(
	session: GameSession,
	teamName: string,
	condition: EffectCondition
): boolean {
	const team = session.esp_teams.find((t) => t.name === teamName);
	if (!team) return false;

	switch (condition.type) {
		case 'has_tech':
			return condition.tech ? team.owned_tech_upgrades.includes(condition.tech) : false;
		case 'lacks_tech':
			return condition.tech ? !team.owned_tech_upgrades.includes(condition.tech) : false;
		default:
			return false;
	}
}

/**
 * Phase 2: Check if a client has list hygiene modifier
 */
function clientHasListHygiene(session: GameSession, teamName: string, clientId: string): boolean {
	const team = session.esp_teams.find((t) => t.name === teamName);
	if (!team || !team.client_states) return false;

	const clientState = team.client_states[clientId];
	if (!clientState) return false;

	return clientState.volumeModifiers.some((m) => m.source === 'list_hygiene');
}

/**
 * Phase 2: Apply volume modifier to a specific client
 */
function applyVolumeModifier(
	session: GameSession,
	teamName: string,
	clientId: string,
	incidentId: string,
	multiplier: number,
	duration: string,
	displayMessage?: string
): boolean {
	const team = session.esp_teams.find((t) => t.name === teamName);
	if (!team || !team.client_states) return false;

	const clientState = team.client_states[clientId];
	if (!clientState) return false;

	// Determine applicable rounds based on duration
	let applicableRounds: number[];
	if (duration === 'this_round') {
		applicableRounds = [session.current_round];
	} else if (duration === 'next_round') {
		applicableRounds = [session.current_round + 1];
	} else {
		// permanent
		applicableRounds = [1, 2, 3, 4];
	}

	// Add volume modifier
	clientState.volumeModifiers.push({
		id: `${incidentId}-${clientId}-r${session.current_round}`,
		source: incidentId,
		multiplier,
		applicableRounds,
		description: displayMessage || `${incidentId} volume multiplier`
	});

	return true;
}

/**
 * Phase 2: Apply spam trap modifier to a specific client
 */
function applySpamTrapModifier(
	session: GameSession,
	teamName: string,
	clientId: string,
	incidentId: string,
	multiplier: number,
	duration: string
): boolean {
	const team = session.esp_teams.find((t) => t.name === teamName);
	if (!team || !team.client_states) return false;

	const clientState = team.client_states[clientId];
	if (!clientState) return false;

	// Determine applicable rounds
	let applicableRounds: number[];
	if (duration === 'this_round') {
		applicableRounds = [session.current_round];
	} else if (duration === 'next_round') {
		applicableRounds = [session.current_round + 1];
	} else {
		applicableRounds = [1, 2, 3, 4];
	}

	// Add spam trap modifier
	clientState.spamTrapModifiers.push({
		id: `${incidentId}-spam-${clientId}-r${session.current_round}`,
		source: incidentId,
		multiplier,
		applicableRounds,
		description: `${incidentId} spam trap multiplier`
	});

	return true;
}

/**
 * Phase 2: Apply auto-lock to a team
 */
function applyAutoLock(session: GameSession, teamName: string): boolean {
	const team = session.esp_teams.find((t) => t.name === teamName);
	if (!team) return false;

	// If in planning phase, lock immediately
	if (session.current_phase === 'planning') {
		team.locked_in = true;
		team.locked_in_at = new Date();
	} else {
		// Set pending auto-lock for next planning phase
		team.pendingAutoLock = true;
	}

	return true;
}

/**
 * Apply incident effects to game state
 *
 * @param session - Game session to modify
 * @param incident - Incident card with effects to apply
 * @param selectedTeam - Optional selected ESP team for targeted effects
 * @param selectedClient - Optional selected client for targeted effects
 * @returns Result with success status and detailed changes
 */
export function applyIncidentEffects(
	session: GameSession,
	incident: IncidentCard,
	selectedTeam?: string,
	selectedClient?: string
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
				case 'selected_esp':
					// Apply effect to selected ESP team only
					if (!selectedTeam) break;

					const targetTeam = session.esp_teams.find((t) => t.name === selectedTeam);
					if (!targetTeam) break;

					if (effect.type === 'reputation' && effect.value !== undefined) {
						// Check condition if present
						if (effect.condition && !evaluateCondition(session, selectedTeam, effect.condition)) {
							break;
						}

						if (!changes.espChanges[selectedTeam]) {
							changes.espChanges[selectedTeam] = {};
						}
						if (!changes.espChanges[selectedTeam].reputation) {
							changes.espChanges[selectedTeam].reputation = {};
						}

						for (const destName in targetTeam.reputation) {
							const oldReputation = targetTeam.reputation[destName];
							const newReputation = clampReputation(oldReputation + effect.value);
							targetTeam.reputation[destName] = newReputation;
							changes.espChanges[selectedTeam].reputation![destName] = effect.value;
						}
					} else if (effect.type === 'reputation_set' && effect.value !== undefined) {
						// Phase 5: Set reputation to fixed value (for INC-020 Reputation Reset)
						if (!changes.espChanges[selectedTeam]) {
							changes.espChanges[selectedTeam] = {};
						}
						if (!changes.espChanges[selectedTeam].reputation) {
							changes.espChanges[selectedTeam].reputation = {};
						}

						const clampedSetValue = clampReputation(effect.value);
						for (const destName in targetTeam.reputation) {
							const oldReputation = targetTeam.reputation[destName];
							targetTeam.reputation[destName] = clampedSetValue;
							// Track the delta (change) for broadcasting
							changes.espChanges[selectedTeam].reputation![destName] =
								clampedSetValue - oldReputation;
						}
					} else if (effect.type === 'credits' && effect.value !== undefined) {
						// Check condition if present
						if (effect.condition && !evaluateCondition(session, selectedTeam, effect.condition)) {
							break;
						}

						if (!changes.espChanges[selectedTeam]) {
							changes.espChanges[selectedTeam] = {};
						}

						const oldCredits = targetTeam.credits;
						const newCredits = clampBudget(oldCredits + effect.value);
						targetTeam.credits = newCredits;
						changes.espChanges[selectedTeam].credits = effect.value;
					} else if (effect.type === 'auto_lock') {
						applyAutoLock(session, selectedTeam);
					}
					break;

				case 'selected_client':
					// Apply effect to selected client only
					if (!selectedTeam || !selectedClient) break;

					if (effect.type === 'client_volume_multiplier' && effect.multiplier && effect.duration) {
						applyVolumeModifier(
							session,
							selectedTeam,
							selectedClient,
							incident.id,
							effect.multiplier,
							effect.duration,
							effect.displayMessage
						);
					} else if (
						effect.type === 'client_spam_trap_multiplier' &&
						effect.multiplier &&
						effect.duration
					) {
						// Check condition if present (for INC-011 spam trap penalty)
						if (effect.condition) {
							if (
								effect.condition.type === 'lacks_tech' &&
								effect.condition.tech === 'list_hygiene'
							) {
								// Only apply if client LACKS list hygiene
								if (clientHasListHygiene(session, selectedTeam, selectedClient)) {
									break; // Has list hygiene, don't apply penalty
								}
							} else if (
								effect.condition.type === 'has_tech' &&
								effect.condition.tech === 'list_hygiene'
							) {
								// Only apply if client HAS list hygiene
								if (!clientHasListHygiene(session, selectedTeam, selectedClient)) {
									break; // Doesn't have list hygiene, don't apply bonus
								}
							}
						}

						applySpamTrapModifier(
							session,
							selectedTeam,
							selectedClient,
							incident.id,
							effect.multiplier,
							effect.duration
						);
					} else if (effect.type === 'reputation' && effect.value !== undefined) {
						// Check condition for list hygiene (for INC-011)
						if (effect.condition) {
							if (
								effect.condition.type === 'has_tech' &&
								effect.condition.tech === 'list_hygiene'
							) {
								if (!clientHasListHygiene(session, selectedTeam, selectedClient)) {
									break; // Doesn't have list hygiene, skip bonus
								}
							} else if (
								effect.condition.type === 'lacks_tech' &&
								effect.condition.tech === 'list_hygiene'
							) {
								if (clientHasListHygiene(session, selectedTeam, selectedClient)) {
									break; // Has list hygiene, skip penalty
								}
							}
						}

						// Apply reputation change to the team
						const targetTeam = session.esp_teams.find((t) => t.name === selectedTeam);
						if (targetTeam) {
							if (!changes.espChanges[selectedTeam]) {
								changes.espChanges[selectedTeam] = {};
							}
							if (!changes.espChanges[selectedTeam].reputation) {
								changes.espChanges[selectedTeam].reputation = {};
							}

							for (const destName in targetTeam.reputation) {
								const oldReputation = targetTeam.reputation[destName];
								const newReputation = clampReputation(oldReputation + effect.value);
								targetTeam.reputation[destName] = newReputation;
								changes.espChanges[selectedTeam].reputation![destName] = effect.value;
							}
						}
					} else if (effect.type === 'credits' && effect.value !== undefined) {
						// Check condition (for INC-011 bonus)
						if (effect.condition) {
							if (
								effect.condition.type === 'has_tech' &&
								effect.condition.tech === 'list_hygiene'
							) {
								if (!clientHasListHygiene(session, selectedTeam, selectedClient)) {
									break; // Doesn't have list hygiene, skip bonus
								}
							}
						}

						// Apply credits to the team
						const targetTeam = session.esp_teams.find((t) => t.name === selectedTeam);
						if (targetTeam) {
							if (!changes.espChanges[selectedTeam]) {
								changes.espChanges[selectedTeam] = {};
							}

							const oldCredits = targetTeam.credits;
							const newCredits = clampBudget(oldCredits + effect.value);
							targetTeam.credits = newCredits;
							changes.espChanges[selectedTeam].credits = effect.value;
						}
					}
					break;

				case 'conditional_esp':
					// Apply effect to ESPs matching a condition
					if (effect.type === 'reputation' && effect.value !== undefined && effect.condition) {
						for (const team of session.esp_teams) {
							// Check if team matches condition
							if (!evaluateCondition(session, team.name, effect.condition)) {
								continue; // Skip this team
							}

							if (!changes.espChanges[team.name]) {
								changes.espChanges[team.name] = {};
							}
							if (!changes.espChanges[team.name].reputation) {
								changes.espChanges[team.name].reputation = {};
							}

							for (const destName in team.reputation) {
								const oldReputation = team.reputation[destName];
								const newReputation = clampReputation(oldReputation + effect.value);
								team.reputation[destName] = newReputation;
								changes.espChanges[team.name].reputation![destName] = effect.value;
							}
						}
					}
					break;

				case 'all_esps':
					// Handle new effect types for all ESPs
					if (
						effect.type === 'client_volume_multiplier' &&
						effect.multiplier &&
						effect.duration &&
						effect.clientTypes
					) {
						// Apply volume modifier to matching clients across all ESPs
						for (const team of session.esp_teams) {
							if (!team.active_clients || !team.client_states) continue;

							for (const clientId of team.active_clients) {
								const client = team.available_clients.find((c) => c.id === clientId);
								if (!client) continue;

								// Check if client type matches
								if (effect.clientTypes.includes(client.type)) {
									applyVolumeModifier(
										session,
										team.name,
										clientId,
										incident.id,
										effect.multiplier,
										effect.duration,
										effect.displayMessage
									);
								}
							}
						}
					} else if (
						effect.type === 'client_spam_trap_multiplier' &&
						effect.multiplier &&
						effect.duration &&
						effect.clientTypes
					) {
						// Apply spam trap modifier to matching clients across all ESPs
						for (const team of session.esp_teams) {
							if (!team.active_clients || !team.client_states) continue;

							for (const clientId of team.active_clients) {
								const client = team.available_clients.find((c) => c.id === clientId);
								if (!client) continue;

								// Check if client type matches
								if (effect.clientTypes.includes(client.type)) {
									applySpamTrapModifier(
										session,
										team.name,
										clientId,
										incident.id,
										effect.multiplier,
										effect.duration
									);
								}
							}
						}
					} else if (effect.type === 'reputation' && effect.value !== undefined) {
						// Existing reputation logic...
						for (const team of session.esp_teams) {
							if (!changes.espChanges[team.name]) {
								changes.espChanges[team.name] = {};
							}
							if (!changes.espChanges[team.name].reputation) {
								changes.espChanges[team.name].reputation = {};
							}

							for (const destName in team.reputation) {
								const oldReputation = team.reputation[destName];
								const newReputation = clampReputation(oldReputation + effect.value);
								team.reputation[destName] = newReputation;
								changes.espChanges[team.name].reputation![destName] = effect.value;
							}
						}
					} else if (effect.type === 'credits' && effect.value !== undefined) {
						// Existing credits logic...
						for (const team of session.esp_teams) {
							if (!changes.espChanges[team.name]) {
								changes.espChanges[team.name] = {};
							}

							const oldCredits = team.credits;
							const newCredits = clampBudget(oldCredits + effect.value);
							team.credits = newCredits;
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
