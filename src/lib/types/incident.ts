// Incident Cards Type Definitions
// Phase 1: MVP Foundation - Basic incident system
// Phase 2: Advanced incident mechanics - conditions, modifiers, team selection

import type { ClientType } from '$lib/server/game/types';

/**
 * Category of an incident card
 */
export type IncidentCategory = 'Regulatory' | 'Security' | 'Market' | 'Industry' | 'Technical';

/**
 * Rarity of an incident card (affects selection probability in later phases)
 */
export type IncidentRarity = 'Common' | 'Uncommon' | 'Rare';

/**
 * Duration of incident effects
 * - Immediate: Effect applies once, immediately
 * - This Round: Effect lasts until end of current round
 * - Next Round: Effect applies next round only
 * - Permanent: Effect lasts rest of game
 */
export type IncidentDuration = 'Immediate' | 'This Round' | 'Next Round' | 'Permanent';

/**
 * Target of an incident effect
 * Phase 2: Added selected_esp, selected_client, conditional_esp
 */
export type IncidentEffectTarget =
	| 'all_esps' // All ESP teams
	| 'all_destinations' // All destination teams
	| 'notification' // Just a notification, no state change
	| 'selected_esp' // Facilitator picks ESP team
	| 'selected_client' // System picks random client
	| 'conditional_esp'; // ESPs matching a condition

/**
 * Type of effect to apply
 * Phase 2: Added client_volume_multiplier, client_spam_trap_multiplier, auto_lock
 */
export type IncidentEffectType =
	| 'reputation' // Modify reputation
	| 'credits' // Modify ESP credits
	| 'budget' // Modify destination budget
	| 'notification' // Display notification only
	| 'client_volume_multiplier' // Add volume modifier to clients
	| 'client_spam_trap_multiplier' // Add spam trap modifier to clients
	| 'auto_lock'; // Force team lock-in

/**
 * Phase 2: Condition for conditional effects
 * Used to filter which teams/clients are affected
 */
export interface EffectCondition {
	type: 'has_tech' | 'lacks_tech' | 'client_type';
	tech?: string; // Tech ID: 'dkim', 'dmarc', 'spf'
	clientTypes?: ClientType[]; // For filtering clients by type
}

/**
 * Single effect of an incident card
 * Phase 2: Added multiplier, duration, clientTypes, condition, displayMessage
 */
export interface IncidentEffect {
	target: IncidentEffectTarget;
	type: IncidentEffectType;
	value?: number; // Amount to add/subtract (negative for penalties)
	message?: string; // Notification message
	// Phase 2 additions:
	multiplier?: number; // For volume/spam trap modifiers (0.5, 1.5, 10, etc.)
	duration?: 'this_round' | 'next_round' | 'permanent'; // How long modifier lasts
	clientTypes?: ClientType[]; // Filter which client types are affected
	condition?: EffectCondition; // Condition for applying this effect
	displayMessage?: string; // User-friendly message for consequences dashboard
}

/**
 * Complete incident card definition
 */
export interface IncidentCard {
	id: string; // Unique identifier (e.g., "INC-001")
	name: string; // Display title
	round: number[]; // Which round(s) this card can appear in
	category: IncidentCategory;
	rarity: IncidentRarity;
	description: string; // Narrative text shown to players
	educationalNote: string; // Learning objective
	duration: IncidentDuration;
	effects: IncidentEffect[];
	automatic?: boolean; // If true, triggers automatically (e.g., DMARC at Round 3)
	affectedTeam?: string | null; // Phase 2: Team affected by this incident (added during broadcast)
}

/**
 * Record of a triggered incident in game history
 */
export interface IncidentHistoryEntry {
	incidentId: string;
	name: string;
	category: IncidentCategory;
	roundTriggered: number;
	timestamp: Date;
}

/**
 * Request to trigger an incident
 * Phase 2: Added selectedTeam for facilitator team selection
 */
export interface IncidentTriggerRequest {
	incidentId: string;
	selectedTeam?: string; // Optional team name for selected_esp/selected_client effects
}

/**
 * Result of triggering an incident
 * Phase 2: Added affectedClient for random client selection
 */
export interface IncidentTriggerResult {
	success: boolean;
	error?: string;
	incidentId?: string;
	affectedTeams?: string[]; // Names of teams affected
	affectedClient?: string; // Client ID for selected_client effects
}

/**
 * Changes made by incident effects (for broadcasting)
 */
export interface EffectChanges {
	espChanges: Record<
		string,
		{
			// ESP team name -> changes
			reputation?: Record<string, number>; // destination -> reputation change
			credits?: number; // credit change amount
		}
	>;
	destinationChanges: Record<
		string,
		{
			// Destination name -> changes
			budget?: number; // budget change amount
		}
	>;
	notifications: string[]; // Notification messages
}

/**
 * Result of applying incident effects
 */
export interface EffectApplicationResult {
	success: boolean;
	error?: string;
	changes: EffectChanges;
}
