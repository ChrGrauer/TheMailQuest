/**
 * WebSocket Message Type Definitions
 * Comprehensive type definitions for all WebSocket messages in The Mail Quest
 *
 * Message Structure Convention:
 * - All fields at root level (no nested 'data' wrapper)
 * - Use discriminated union based on 'type' field
 * - Optional fields for partial updates
 */

import type {
	GamePhase,
	ClientState,
	FilteringPolicy,
	ESPDestinationStats,
	AutoCorrectionLog
} from '$lib/server/game/types';
import type {
	IncidentCard,
	IncidentHistoryEntry,
	EffectChanges,
	IncidentCategory,
	IncidentChoiceOption
} from './incident';
import type { FinalScoreOutput } from '$lib/server/game/final-score-types';

// ============================================================================
// Server-to-Client Messages
// ============================================================================

/**
 * Confirmation that client successfully joined a room
 */
export interface RoomJoinedMessage {
	type: 'room_joined';
	roomCode: string;
	message: string;
}

/**
 * Lobby state update when players join/leave
 */
export interface LobbyUpdateMessage {
	type: 'lobby_update';
	espTeams: Array<{ name: string; players: string[] }>;
	destinations: Array<{ name: string; players: string[] }>;
	newPlayer?: {
		id: string;
		displayName: string;
		role: 'ESP' | 'Destination';
		teamName: string;
	};
}

/**
 * Initial resources allocated at game start
 */
export interface ResourcesAllocatedMessage {
	type: 'resources_allocated';
	esp_teams: Array<{
		name: string;
		credits: number;
		reputation: number;
	}>;
	destinations: Array<{
		name: string;
		budget: number;
	}>;
}

/**
 * Generic game state updates (phase, round, timer, incident history)
 * STANDARDIZED: All fields optional for partial updates
 */
export interface GameStateUpdateMessage {
	type: 'game_state_update';
	phase?: GamePhase;
	round?: number;
	timer_duration?: number;
	timer_remaining?: number;
	incident_history?: IncidentHistoryEntry[];
	locked_in?: boolean;
}

/**
 * ESP team dashboard update
 * Includes teamName for client-side filtering
 */
export interface ESPDashboardUpdateMessage {
	type: 'esp_dashboard_update';
	teamName: string; // Required for filtering
	credits?: number;
	reputation?: Record<string, number>; // destination -> reputation
	clients?: string[]; // Active client IDs
	client_states?: Record<string, ClientState>;
	owned_tech_upgrades?: string[];
	pending_onboarding_decisions?: Record<string, { warmUp: boolean; listHygiene: boolean }>;
	locked_in?: boolean;
	available_clients_count?: number;
}

/**
 * Destination dashboard update
 * Includes destinationName for client-side filtering
 */
export interface DestinationDashboardUpdateMessage {
	type: 'destination_dashboard_update';
	destinationName: string; // Required for filtering
	budget?: number;
	esp_stats?: ESPDestinationStats[];
	spam_level?: number;
	filtering_policies?: Record<string, FilteringPolicy>;
	owned_tools?: string[];
	authentication_level?: number;
	esp_metrics?: Record<string, { user_satisfaction: number; spam_level: number }>;
}

/**
 * Confirmation that a player has locked in their decisions
 */
export interface LockInConfirmedMessage {
	type: 'lock_in_confirmed';
	teamName?: string; // For ESP teams
	destinationName?: string; // For destinations
	role: 'ESP' | 'Destination';
	locked_in: boolean;
	locked_in_at: Date | string;
}

/**
 * Announcement that a player locked in (for other players)
 * Shows remaining players count
 */
export interface PlayerLockedInMessage {
	type: 'player_locked_in';
	playerName: string; // teamName or destinationName
	role: 'ESP' | 'Destination';
	remaining_players: number;
	all_locked: boolean;
}

/**
 * Warning that auto-lock will happen soon (15 seconds)
 */
export interface AutoLockWarningMessage {
	type: 'auto_lock_warning';
	message: string;
	seconds_remaining: number;
}

/**
 * Budget corrections made during auto-lock
 * Only sent to affected team
 */
export interface AutoLockCorrectionsMessage {
	type: 'auto_lock_corrections';
	teamName: string;
	corrections: AutoCorrectionLog[];
}

/**
 * Auto-lock completed for all players
 */
export interface AutoLockCompleteMessage {
	type: 'auto_lock_complete';
	message: string;
}

/**
 * Phase transition occurred (e.g., planning -> resolution)
 * Uses nested 'data' structure for all transition data
 */
export interface PhaseTransitionMessage {
	type: 'phase_transition';
	data: {
		phase: GamePhase;
		round: number;
		message?: string;
		timer_remaining?: number;
		locked_in?: boolean;
		incident_history?: IncidentHistoryEntry[];
		resolution_history?: Array<{
			round: number;
			results: any;
			timestamp: Date;
		}>;
		current_round_results?: any; // ResolutionResults (avoiding circular import)
		final_scores?: FinalScoreOutput; // US-5.2: Final scores for victory screen
	};
}

/**
 * Incident card triggered - display to all players
 */
export interface IncidentTriggeredMessage {
	type: 'incident_triggered';
	incident: IncidentCard & {
		displayDurationMs: number; // How long to show the card
		affectedTeam?: string; // Phase 2: Team affected (if selected_esp)
	};
}

/**
 * Incident effects applied - show outcome to all players
 */
export interface IncidentEffectsAppliedMessage {
	type: 'incident_effects_applied';
	incidentId: string;
	changes: EffectChanges;
}

/**
 * Phase 5: Incident requires player choice - sent to affected team(s)
 */
export interface IncidentChoiceRequiredMessage {
	type: 'incident_choice_required';
	incidentId: string;
	incidentName: string;
	description: string;
	educationalNote: string;
	category: IncidentCategory;
	options: IncidentChoiceOption[];
	targetTeams: string[]; // Which team(s) need to make this choice
}

/**
 * Phase 5: Player confirmed their incident choice
 * Effects are applied immediately at confirmation
 */
export interface IncidentChoiceConfirmedMessage {
	type: 'incident_choice_confirmed';
	incidentId: string;
	teamName: string;
	choiceId: string;
	appliedEffects?: Array<{ type: string; value?: number }>;
}

/**
 * US-5.2: Final scores calculated - sent when game ends
 */
export interface FinalScoresCalculatedMessage {
	type: 'final_scores_calculated';
	espResults: FinalScoreOutput['espResults'];
	winner: FinalScoreOutput['winner'];
	destinationResults: FinalScoreOutput['destinationResults'];
	metadata: FinalScoreOutput['metadata'];
}

/**
 * US-2.7: Investigation update - unified type for vote changes and results
 * Uses 'event' field to distinguish between vote updates and investigation results
 */
export interface InvestigationUpdateMessage {
	type: 'investigation_update';
	event: 'vote' | 'result';
	// Vote event fields
	votes?: Record<string, string[]>; // ESP name -> list of destination voters
	voterName?: string; // Which destination changed their vote
	action?: 'voted' | 'removed'; // What action was taken
	// Result event fields
	round?: number;
	targetEsp?: string; // Used by both: vote target or investigation target
	voters?: string[]; // Destinations who voted for investigation
	violationFound?: boolean;
	suspendedClient?: {
		clientId: string;
		clientName: string;
		riskLevel: 'Low' | 'Medium' | 'High';
		missingProtection: 'warmup' | 'listHygiene' | 'both';
		spamRate: number;
	};
	message?: string;
}

/**
 * US-8.2-0.1: Timer update - unified message for pause, resume, and extend actions
 * Broadcast to all players when facilitator controls timer
 */
export interface TimerUpdateMessage {
	type: 'timer_update';
	isPaused: boolean;
	remainingTime: number;
	action: 'pause' | 'resume' | 'extend';
	addedSeconds?: number; // Only for 'extend' action
}

// ============================================================================
// Client-to-Server Messages
// ============================================================================

/**
 * Client subscribes to room updates
 */
export interface JoinRoomMessage {
	type: 'join_room';
	roomCode: string;
}

/**
 * Client unsubscribes from room
 */
export interface LeaveRoomMessage {
	type: 'leave_room';
	roomCode: string;
}

/**
 * Client reports an error (for server logging)
 */
export interface ClientErrorMessage {
	type: 'client_error';
	error: string;
	context?: string;
}

// ============================================================================
// Discriminated Union Type
// ============================================================================

/**
 * All possible WebSocket messages (server-to-client)
 * Use discriminated union for type-safe message handling
 */
export type ServerMessage =
	| RoomJoinedMessage
	| LobbyUpdateMessage
	| ResourcesAllocatedMessage
	| GameStateUpdateMessage
	| ESPDashboardUpdateMessage
	| DestinationDashboardUpdateMessage
	| LockInConfirmedMessage
	| PlayerLockedInMessage
	| AutoLockWarningMessage
	| AutoLockCorrectionsMessage
	| AutoLockCompleteMessage
	| PhaseTransitionMessage
	| IncidentTriggeredMessage
	| IncidentEffectsAppliedMessage
	| IncidentChoiceRequiredMessage
	| IncidentChoiceConfirmedMessage
	| FinalScoresCalculatedMessage
	| InvestigationUpdateMessage
	| TimerUpdateMessage;

/**
 * All possible WebSocket messages (client-to-server)
 */
export type ClientMessage = JoinRoomMessage | LeaveRoomMessage | ClientErrorMessage;

/**
 * All WebSocket messages (bidirectional)
 */
export type WebSocketMessage = ServerMessage | ClientMessage;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if message is a specific type
 * Usage: if (isMessageType(message, 'game_state_update')) { ... }
 */
export function isMessageType<T extends WebSocketMessage['type']>(
	message: WebSocketMessage,
	type: T
): message is Extract<WebSocketMessage, { type: T }> {
	return message.type === type;
}
