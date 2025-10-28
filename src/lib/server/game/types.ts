/**
 * Game Session Type Definitions
 * US-1.1: Create Game Session
 * US-1.3: Game Lobby Management (added facilitatorId)
 * US-1.4: Resources Allocation (added resources, timer, shared_pool, phase_start_time)
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
