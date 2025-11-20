/**
 * Shared type definitions for The Mail Quest
 * This file will be expanded as game logic is implemented
 */

export interface WebSocketMessage {
	type: string;
	payload?: unknown;
	timestamp: number;
}

// Export incident card types
export type {
	IncidentCategory,
	IncidentRarity,
	IncidentDuration,
	IncidentEffectTarget,
	IncidentEffectType,
	IncidentEffect,
	IncidentCard,
	IncidentHistoryEntry,
	IncidentTriggerRequest,
	IncidentTriggerResult,
	EffectChanges,
	EffectApplicationResult
} from './incident';
