/**
 * Incident Choice Manager
 * Phase 5: Player Choices
 *
 * Handles player-facing incident choices for INC-017, INC-018, INC-020
 * - Resolves which team(s) should make a choice
 * - Initiates pending choices with default selection
 * - Processes player choice submissions
 * - Applies choice effects at lock-in
 */

import type { GameSession, ESPTeam } from './types';
import type {
	IncidentCard,
	TeamSelectionCriteria,
	IncidentChoiceOption
} from '$lib/types/incident';

/**
 * Calculate average reputation across all destinations for a team
 */
export function calculateAverageReputation(team: ESPTeam): number {
	const reps = Object.values(team.reputation);
	if (reps.length === 0) return 0;
	return reps.reduce((sum, r) => sum + r, 0) / reps.length;
}

/**
 * Find the team with highest average reputation
 */
function findHighestRepTeam(session: GameSession): string | null {
	if (session.esp_teams.length === 0) return null;

	let highest = session.esp_teams[0];
	let highestAvg = calculateAverageReputation(highest);

	for (const team of session.esp_teams) {
		const avg = calculateAverageReputation(team);
		if (avg > highestAvg) {
			highest = team;
			highestAvg = avg;
		}
	}

	return highest.name;
}

/**
 * Find the team with lowest average reputation
 */
function findLowestRepTeam(session: GameSession): string | null {
	if (session.esp_teams.length === 0) return null;

	let lowest = session.esp_teams[0];
	let lowestAvg = calculateAverageReputation(lowest);

	for (const team of session.esp_teams) {
		const avg = calculateAverageReputation(team);
		if (avg < lowestAvg) {
			lowest = team;
			lowestAvg = avg;
		}
	}

	return lowest.name;
}

/**
 * Resolve team selection criteria to team name(s)
 */
export function resolveTargetTeams(
	session: GameSession,
	criteria: TeamSelectionCriteria
): string[] {
	switch (criteria) {
		case 'highest_reputation': {
			const team = findHighestRepTeam(session);
			return team ? [team] : [];
		}
		case 'lowest_reputation': {
			const team = findLowestRepTeam(session);
			return team ? [team] : [];
		}
		case 'all_esps':
			return session.esp_teams.map((t) => t.name);
		default:
			return [];
	}
}

/**
 * Get the default choice option from an incident's choice config
 */
function getDefaultOption(options: IncidentChoiceOption[]): IncidentChoiceOption | undefined {
	return options.find((o) => o.isDefault) || options[0];
}

/**
 * Initiate pending choices for an incident
 * Sets default choice for each target team
 */
export function initiatePendingChoices(
	session: GameSession,
	incident: IncidentCard
): { success: boolean; error?: string; targetTeams: string[] } {
	// Validate incident has choice config
	if (!incident.choiceConfig) {
		return {
			success: false,
			error: `Incident ${incident.id} is not a choice incident`,
			targetTeams: []
		};
	}

	// Resolve target teams
	const targetTeams = resolveTargetTeams(session, incident.choiceConfig.targetSelection);

	if (targetTeams.length === 0) {
		return {
			success: false,
			error: 'No target teams resolved for choice incident',
			targetTeams: []
		};
	}

	// Get default option
	const defaultOption = getDefaultOption(incident.choiceConfig.options);
	if (!defaultOption) {
		return {
			success: false,
			error: 'No options defined for choice incident',
			targetTeams: []
		};
	}

	// Prepare options for storage (simplified structure for validation)
	const storedOptions = incident.choiceConfig.options.map((opt) => ({
		id: opt.id,
		effects: opt.effects.map((e) => ({
			target: e.target,
			type: e.type,
			value: e.value
		}))
	}));

	// Set pending choice for each target team
	for (const teamName of targetTeams) {
		const team = session.esp_teams.find((t) => t.name.toLowerCase() === teamName.toLowerCase());
		if (team) {
			team.pending_incident_choice = {
				incidentId: incident.id,
				choiceId: defaultOption.id,
				confirmed: false,
				options: storedOptions
			};
		}
	}

	return {
		success: true,
		targetTeams
	};
}

/**
 * Confirm and apply incident choice for a team
 * Called when player confirms their choice - effects are applied IMMEDIATELY
 */
export function confirmAndApplyChoice(
	session: GameSession,
	teamName: string,
	incidentId: string,
	choiceId: string
): { success: boolean; error?: string; appliedEffects?: Array<{ type: string; value?: number }> } {
	// Find team
	const team = session.esp_teams.find((t) => t.name.toLowerCase() === teamName.toLowerCase());
	if (!team) {
		return { success: false, error: `Team ${teamName} not found` };
	}

	// Check team has pending choice
	if (!team.pending_incident_choice) {
		return { success: false, error: `Team ${teamName} has no pending choice` };
	}

	// Check incident ID matches
	if (team.pending_incident_choice.incidentId !== incidentId) {
		return {
			success: false,
			error: `Pending incident ID does not match: expected ${team.pending_incident_choice.incidentId}, got ${incidentId}`
		};
	}

	// Validate choice option exists in stored options
	const validOption = team.pending_incident_choice.options.find((o) => o.id === choiceId);
	if (!validOption) {
		return {
			success: false,
			error: `Invalid choice option: ${choiceId}. Valid options: ${team.pending_incident_choice.options.map((o) => o.id).join(', ')}`
		};
	}

	// Update choice and mark as confirmed
	team.pending_incident_choice.choiceId = choiceId;
	team.pending_incident_choice.confirmed = true;

	// Apply effects IMMEDIATELY
	const appliedEffects: Array<{ type: string; value?: number }> = [];
	for (const effect of validOption.effects) {
		applyChoiceEffect(session, team, effect);
		appliedEffects.push({ type: effect.type, value: effect.value });
	}

	// Store that effects have been applied (in case we need to track this)
	team.pending_incident_choice.effectsApplied = true;

	return { success: true, appliedEffects };
}

/**
 * @deprecated Use confirmAndApplyChoice instead - effects now apply immediately at confirmation
 * Set the pending incident choice for a team (legacy - does NOT apply effects)
 */
export function setPendingChoice(
	session: GameSession,
	teamName: string,
	incidentId: string,
	choiceId: string
): { success: boolean; error?: string } {
	// For backwards compatibility, call the new function
	return confirmAndApplyChoice(session, teamName, incidentId, choiceId);
}

/**
 * Apply pending choice effects at lock-in time
 * Note: Since Phase 5 update, effects are applied immediately at confirmation.
 * This function now primarily handles cleanup and edge cases.
 */
export function applyPendingChoiceEffects(
	session: GameSession,
	team: ESPTeam
): {
	success: boolean;
	error?: string;
	applied: boolean;
	choiceId?: string;
	effectsApplied?: Array<{ type: string; value?: number }>;
} {
	// Check team has pending choice
	if (!team.pending_incident_choice) {
		return { success: false, error: `Team ${team.name} has no pending choice`, applied: false };
	}

	// Check choice is confirmed
	if (!team.pending_incident_choice.confirmed) {
		return {
			success: false,
			error: `Choice for team ${team.name} is not confirmed`,
			applied: false
		};
	}

	const { choiceId, options, effectsApplied: alreadyApplied } = team.pending_incident_choice;

	// If effects were already applied at confirmation time, just clear and return
	if (alreadyApplied) {
		const chosenOption = options.find((o) => o.id === choiceId);
		team.pending_incident_choice = undefined;
		return {
			success: true,
			applied: false, // Already applied at confirmation
			choiceId,
			effectsApplied: chosenOption?.effects.map((e) => ({ type: e.type, value: e.value })) || []
		};
	}

	// Get chosen option from stored options
	const chosenOption = options.find((o) => o.id === choiceId);
	if (!chosenOption) {
		return { success: false, error: `Choice option ${choiceId} not found`, applied: false };
	}

	// Apply effects from chosen option (fallback for any edge cases)
	const appliedEffects: Array<{ type: string; value?: number }> = [];
	for (const effect of chosenOption.effects) {
		applyChoiceEffect(session, team, effect);
		appliedEffects.push({ type: effect.type, value: effect.value });
	}

	// Clear pending choice
	team.pending_incident_choice = undefined;

	return { success: true, applied: true, choiceId, effectsApplied: appliedEffects };
}

/**
 * Apply a single effect from a choice option
 * Handles 'self' target as the choosing team
 */
function applyChoiceEffect(
	_session: GameSession,
	team: ESPTeam,
	effect: { target: string; type: string; value?: number }
): void {
	// Resolve target team - 'self' means the team making the choice
	const targetTeam = effect.target === 'self' || effect.target === 'selected_esp' ? team : null;

	if (!targetTeam) return;

	switch (effect.type) {
		case 'credits':
			if (effect.value !== undefined) {
				targetTeam.credits = Math.max(0, targetTeam.credits + effect.value);
			}
			break;

		case 'reputation':
			if (effect.value !== undefined) {
				for (const dest in targetTeam.reputation) {
					targetTeam.reputation[dest] = Math.max(
						0,
						Math.min(100, targetTeam.reputation[dest] + effect.value)
					);
				}
			}
			break;

		case 'reputation_set':
			if (effect.value !== undefined) {
				const clampedValue = Math.max(0, Math.min(100, effect.value));
				for (const dest in targetTeam.reputation) {
					targetTeam.reputation[dest] = clampedValue;
				}
			}
			break;

		case 'auto_lock':
			targetTeam.locked_in = true;
			targetTeam.locked_in_at = new Date();
			break;
	}
}
