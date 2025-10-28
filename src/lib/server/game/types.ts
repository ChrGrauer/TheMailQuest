/**
 * Game Session Type Definitions
 * US-1.1: Create Game Session
 * US-1.3: Game Lobby Management (added facilitatorId)
 */

export interface ESPTeam {
  name: string;
  players: string[];
  budget: number;
  clients: string[];
  technical_stack: string[];
}

export interface Destination {
  name: string;
  players: string[];
  budget: number;
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
}
