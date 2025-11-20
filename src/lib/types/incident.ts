// Incident Cards Type Definitions
// Phase 1: MVP Foundation - Basic incident system

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
 */
export type IncidentEffectTarget =
	| 'all_esps' // All ESP teams
	| 'all_destinations' // All destination teams
	| 'notification'; // Just a notification, no state change

/**
 * Type of effect to apply
 */
export type IncidentEffectType =
	| 'reputation' // Modify reputation
	| 'credits' // Modify ESP credits
	| 'budget' // Modify destination budget
	| 'notification'; // Display notification only

/**
 * Single effect of an incident card
 */
export interface IncidentEffect {
	target: IncidentEffectTarget;
	type: IncidentEffectType;
	value?: number; // Amount to add/subtract (negative for penalties)
	message?: string; // Notification message
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
 */
export interface IncidentTriggerRequest {
	incidentId: string;
}

/**
 * Result of triggering an incident
 */
export interface IncidentTriggerResult {
	success: boolean;
	error?: string;
	incidentId?: string;
	affectedTeams?: string[]; // Names of teams affected
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
