/**
 * Game Session Type Definitions
 * US-1.1: Create Game Session
 * US-1.3: Game Lobby Management (added facilitatorId)
 * US-1.4: Resources Allocation (added resources, timer, shared_pool, phase_start_time)
 * US-2.2: Client Marketplace (added Client, ClientType, ClientRequirements, available_clients)
 * US-2.4: Client Basic Management (added ClientState, client_states, Suspended status)
 * US-2.5: Destination Dashboard (added destination fields, ESPDestinationStats, DestinationDashboardUpdate)
 * US-2.6.1: Destination Filtering Controls (added FilteringLevel, FilteringPolicy, FilteringPolicyUpdateResult)
 * US-2.6.2: Destination Tech Shop (added kingdom, owned_tools, authentication_level, spam_trap_active, esp_metrics)
 * US-3.2: Decision Lock-In (added locked_in, locked_in_at, pending_onboarding_decisions, lock-in interfaces)
 * Phase 1: Incident Cards (added incident_history)
 * Phase 2: Incident Cards Refactor (added VolumeModifier, SpamTrapModifier; refactored ClientState to use modifier arrays)
 * Phase 5: Incident Choices (added pending_incident_choice to ESPTeam)
 */

import type { IncidentHistoryEntry } from '$lib/types/incident';

export interface ESPTeam {
	name: string;
	players: string[];
	budget: number; // DEPRECATED: Use 'credits' instead. Kept for backwards compatibility.
	clients: string[];
	technical_stack: string[];
	// US-1.4: Resource allocation fields
	credits: number; // PRIMARY FIELD: Current team budget. Updated by resolution phase with earned revenue.
	reputation: Record<string, number>; // per destination: { Gmail: 70, Outlook: 70, ... }
	active_clients: string[];
	owned_tech_upgrades: string[]; // US-2.3: Owned technical upgrade IDs (e.g., ['spf', 'dkim'])
	round_history: any[];
	// US-2.2: Client marketplace fields
	available_clients: Client[]; // Marketplace stock (not yet acquired)
	// US-2.4: Client portfolio management fields
	client_states?: Record<string, ClientState>; // Per-client state (status, onboarding, first_active_round)
	// US-3.2: Decision lock-in fields
	locked_in?: boolean; // Whether team has locked in their decisions for this round
	locked_in_at?: Date; // Timestamp when team locked in
	pending_onboarding_decisions?: Record<string, OnboardingOptions>; // Uncommitted onboarding options (key = clientId)
	// Phase 2: Incident Cards
	pendingAutoLock?: boolean; // INC-016: Flag to auto-lock at next planning phase start
	// Phase 5: Incident Choices
	pending_incident_choice?: {
		incidentId: string; // ID of the incident requiring choice
		choiceId: string; // Currently selected choice option ID
		confirmed: boolean; // Whether player has clicked "Confirm Choice"
		effectsApplied?: boolean; // Whether effects have been applied (happens at confirmation)
		options: Array<{
			// Stored options for validation (avoids lookup)
			id: string;
			effects: Array<{ target: string; type: string; value?: number }>;
		}>;
	};
}

export interface Destination {
	name: string;
	kingdom?: 'Gmail' | 'Outlook' | 'Yahoo'; // US-2.6.2: Kingdom for pricing
	players: string[];
	budget: number;
	revenue?: number; // US-3.3 Iteration 6.1: Revenue earned per round
	// US-1.4: Resource allocation fields
	filtering_policies: Record<string, FilteringPolicy>; // US-2.6.1: Filtering policies per ESP (key = espName)
	esp_reputation: Record<string, number>; // per ESP: { SendWave: 70, MailMonkey: 70, ... }
	// US-2.5: Destination dashboard fields
	technical_stack?: string[]; // Owned destination technologies (deprecated, use owned_tools)
	// US-2.6.2: Per-ESP metrics (for delivery resolution)
	esp_metrics?: Record<
		string,
		{
			user_satisfaction: number; // 0-100 (US-3.3 Iteration 6.1: calculated from satisfaction-calculator)
			spam_level: number; // 0-100
		}
	>;
	// US-2.6.2: Tool ownership
	owned_tools?: string[]; // Tool IDs like ['content_analysis_filter', 'auth_validator_l1']
	authentication_level?: number; // 0-3 for Auth Validator progression
	spam_trap_active?: {
		round: number;
		announced: boolean;
	}; // Single-round tool tracking
	// US-3.2: Decision lock-in fields
	locked_in?: boolean; // Whether destination has locked in their decisions for this round
	locked_in_at?: Date; // Timestamp when destination locked in
}

/**
 * US-2.2: Client Type
 * Represents the different types of clients available in the marketplace
 */
export type ClientType =
	| 'premium_brand'
	| 'growing_startup'
	| 're_engagement'
	| 'aggressive_marketer'
	| 'event_seasonal';

/**
 * US-2.2: Client Requirements
 * Technical and reputation requirements for acquiring a client (mainly for Premium Brand)
 */
export interface ClientRequirements {
	tech: string[]; // Required tech IDs: ['spf', 'dkim', 'dmarc']
	reputation: number; // Minimum overall reputation (weighted average)
}

/**
 * US-2.2: Client
 * Represents an email client that can be acquired by ESP teams
 */
export interface Client {
	id: string; // Unique identifier (e.g., "client-sendwave-001")
	name: string; // Display name (e.g., "Tech Innovators")
	type: ClientType; // Client type category
	cost: number; // Acquisition cost in credits
	revenue: number; // Revenue per round
	volume: number; // Email volume (numeric, format with formatVolume() for display)
	risk: 'Low' | 'Medium' | 'High'; // Risk level
	spam_rate: number; // Spam complaint rate percentage (e.g., 1.2 for 1.2%)
	available_from_round: number; // Round when this client becomes available (1, 2, or 3)
	requirements?: ClientRequirements; // Optional requirements (for Premium Brand clients)
	status?: 'Active' | 'Paused' | 'Suspended'; // Status for acquired clients in portfolio (US-2.4.0)
	destination_distribution: {
		// US-3.3: Resolution Phase Automation - Iteration 6
		Gmail: number; // Percentage (0-100)
		Outlook: number; // Percentage (0-100)
		Yahoo: number; // Percentage (0-100)
	};
}

/**
 * Volume Modifier
 * Phase 2: Generic modifier system for volume multipliers
 * Applied to client volumes during resolution
 */
export interface VolumeModifier {
	id: string; // Unique ID: "warmup-client-001-r2" | "INC-009-r2" | "list_hygiene-client-001-r2"
	source: string; // "warmup" | "list_hygiene" | "INC-009" | "INC-011" | "INC-015"
	multiplier: number; // 0.5 (warmup), 0.85 (list hygiene), 1.5 (seasonal), 10 (viral), 2 (black friday)
	applicableRounds: number[]; // [2, 3] for warmup starting R2
	description?: string; // For UI display: "Warm-up active" | "Seasonal Traffic Surge"
}

/**
 * Spam Trap Modifier
 * Phase 2: Generic modifier system for spam trap probability multipliers
 * Applied to spam trap risk during resolution
 */
export interface SpamTrapModifier {
	id: string; // Unique ID: "list_hygiene-client-001-r2" | "INC-009-r2" | "INC-011-r2"
	source: string; // "list_hygiene" | "INC-009" | "INC-011"
	multiplier: number; // 0.6 (list hygiene = 40% reduction), 1.2 (INC-009 = 20% increase), 3 (INC-011 = 200% increase)
	applicableRounds: number[]; // [2, 3] for modifiers starting R2
	description?: string; // For UI display: "List Hygiene active" | "Viral Campaign risk"
}

/**
 * US-2.4: Client State
 * Per-team state for an acquired client (status, onboarding config, activation history)
 * Phase 2 Refactor: Replaced boolean flags with generic modifier arrays
 */
export interface ClientState {
	status: 'Active' | 'Paused' | 'Suspended'; // Current status
	first_active_round: number | null; // Round when client first became active (null if never activated)
	// Phase 2: Generic modifier system
	volumeModifiers: VolumeModifier[]; // All volume multipliers (warmup, list hygiene, incidents)
	spamTrapModifiers: SpamTrapModifier[]; // All spam trap probability multipliers
}

/**
 * US-2.6.1: Filtering Level
 * Spam filtering levels that destinations can apply to ESPs
 */
export type FilteringLevel = 'permissive' | 'moderate' | 'strict' | 'maximum';

/**
 * US-2.6.1: Filtering Policy
 * Represents a destination's filtering configuration for a specific ESP
 */
export interface FilteringPolicy {
	espName: string; // ESP team name
	level: FilteringLevel; // Filtering level applied
	spamReduction: number; // Percentage of spam blocked: 0, 35, 65, 85
	falsePositives: number; // Percentage of legitimate emails blocked: 0, 3, 8, 15
}

/**
 * US-2.6.1: Filtering Policy Update Result
 * Result of updating a filtering policy
 */
export interface FilteringPolicyUpdateResult {
	success: boolean;
	error?: string;
	filtering_policies?: Record<string, FilteringPolicy>; // Updated policies (key = espName)
}

export interface GameTimer {
	duration: number; // Total duration in seconds
	remaining: number; // Remaining time in seconds
	startedAt: Date; // When the timer started
	isRunning: boolean; // Whether timer is currently running
}

export interface GameSession {
	roomCode: string;
	facilitatorId: string;
	current_round: number;
	current_phase: string;
	esp_teams: ESPTeam[];
	destinations: Destination[];
	createdAt: Date;
	lastActivity: Date;
	// US-1.4: Resource allocation fields
	shared_pool?: number; // Shared destination budget pool
	phase_start_time?: Date; // When current phase started
	timer?: GameTimer; // Phase timer
	// US-3.5: Resolution history for all rounds (max 4)
	// Array of resolution results, one per completed round
	resolution_history?: Array<{
		round: number;
		results: any; // ResolutionResults from resolution-types.ts (avoiding circular import)
		timestamp: Date;
	}>;
	// Phase 1: Incident Cards history
	// Array of triggered incidents for facilitator reference
	incident_history?: IncidentHistoryEntry[];
	// US-5.1: Final scores after Round 4 calculation
	final_scores?: import('./final-score-types').FinalScoreOutput;
}

/**
 * US-1.4: Game Configuration
 * Defines starting resources and phase durations
 */
export interface GameConfiguration {
	esp_starting_credits: number;
	esp_starting_reputation: number;
	destination_budgets: Record<string, number>; // { Gmail: 500, Outlook: 350, Yahoo: 200 }
	shared_pool_credits: number;
	planning_phase_duration: number; // in seconds
}

/**
 * US-1.4: Game Phase Type
 * US-3.2: Removed 'action' phase - planning transitions directly to resolution after lock-in
 * US-3.5: Added 'consequences' phase for displaying resolution results
 */
export type GamePhase =
	| 'lobby'
	| 'resource_allocation'
	| 'planning'
	| 'resolution'
	| 'consequences'
	| 'finished';

/**
 * US-2.5: ESP Destination Statistics
 * Represents traffic and metrics data for an ESP from a destination's perspective
 */
export interface ESPDestinationStats {
	espName: string; // ESP team name
	teamCode: string; // 2-letter team code (e.g., "SW" for SendWave)
	activeClientsCount: number; // Number of active clients sending to this destination
	volume: string; // Email volume formatted (e.g., "185K")
	volumeRaw: number; // Email volume as number
	reputation: number; // ESP's reputation at this destination (0-100)
	userSatisfaction: number | null; // User satisfaction percentage (0-100), null if no history
	spamComplaintRate: number; // Spam complaint rate percentage (0-100)
	spamComplaintVolume: number; // Spam email volume (number of spam emails)
}

/**
 * US-2.5: Destination Dashboard Update
 * WebSocket message payload for real-time destination dashboard updates
 */
export interface DestinationDashboardUpdate {
	budget?: number;
	esp_stats?: ESPDestinationStats[];
	spam_level?: number;
	technical_stack?: string[];
	collaborations_count?: number;
	// US-2.6.1: Filtering policy updates
	filtering_policies?: Record<string, FilteringPolicy>;
	// US-2.6.2: Tool ownership updates
	owned_tools?: string[];
	authentication_level?: number;
}

/**
 * US-2.6.2: Destination Tool Purchase Result
 * Result of a tool purchase attempt
 */
export interface DestinationToolPurchaseResult {
	success: boolean;
	error?: string;
	updatedDestination?: Destination;
}

/**
 * US-3.2: Onboarding Options
 * Represents pending onboarding options for a client (not yet committed)
 */
export interface OnboardingOptions {
	warmUp: boolean; // Warm-up option (150 credits)
	listHygiene: boolean; // List hygiene option (80 credits)
}

/**
 * US-3.2: Lock-In Validation Result
 * Result of validating whether a player can lock in their decisions
 */
export interface LockInValidation {
	isValid: boolean; // Whether lock-in is allowed
	error?: string; // Error message if invalid
	pendingCosts?: number; // Total cost of pending onboarding options
	budgetExceeded?: boolean; // Whether budget would be exceeded
	excessAmount?: number; // Amount over budget (if exceeded)
}

/**
 * US-3.2: Lock-In Result
 * Result of a lock-in operation
 */
export interface LockInResult {
	success: boolean;
	error?: string;
	locked_in?: boolean; // Whether player is now locked in
	locked_in_at?: Date; // Timestamp of lock-in
	remaining_players?: number; // Number of players still not locked in
	all_locked?: boolean; // Whether all players are now locked in
	corrections?: AutoCorrectionLog[]; // Auto-corrections made (if any)
}

/**
 * US-3.2: Auto-Correction Log Entry
 * Tracks a single auto-correction made during auto-lock
 */
export interface AutoCorrectionLog {
	clientId: string; // Client ID
	clientName: string; // Client name for logging
	optionType: 'warmUp' | 'listHygiene'; // Type of option removed
	costSaved: number; // Credits saved (150 for warm-up, 80 for list hygiene)
}
