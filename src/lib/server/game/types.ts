/**
 * Game Session Type Definitions
 * US-1.1: Create Game Session
 * US-1.3: Game Lobby Management (added facilitatorId)
 * US-1.4: Resources Allocation (added resources, timer, shared_pool, phase_start_time)
 * US-2.5: Destination Dashboard (added destination fields, ESPDestinationStats, DestinationDashboardUpdate)
 */

export interface ESPTeam {
  name: string;
  players: string[];
  budget: number;
  clients: string[];
  technical_stack: string[];
  // US-1.4: Resource allocation fields
  credits: number;
  reputation: Record<string, number>; // per destination: { Gmail: 70, Outlook: 70, ... }
  active_clients: string[];
  technical_auth: string[];
  round_history: any[];
}

export interface Destination {
  name: string;
  players: string[];
  budget: number;
  // US-1.4: Resource allocation fields
  filtering_policies: Record<string, any>;
  esp_reputation: Record<string, number>; // per ESP: { SendWave: 70, MailMonkey: 70, ... }
  user_satisfaction: number;
  // US-2.5: Destination dashboard fields
  technical_stack?: string[]; // Owned destination technologies
  spam_level?: number; // Current spam level percentage (0-100)
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
 */
export type GamePhase = 'lobby' | 'resource_allocation' | 'planning' | 'action' | 'resolution' | 'finished';

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
	userSatisfaction: number; // User satisfaction percentage (0-100)
	spamComplaintRate: number; // Spam complaint rate percentage (0-100)
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
}
