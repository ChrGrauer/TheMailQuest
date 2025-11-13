/**
 * Game Session Builder for Tests
 * Helper functions to build test game sessions with sensible defaults
 * US 3.3: Resolution Phase Automation
 */

import type {
	GameSession,
	ESPTeam,
	Destination,
	Client,
	ClientState
} from '$lib/server/game/types';

export interface TestTeamConfig {
	name?: string;
	reputation?: Record<string, number>;
	clients?: Client[];
	clientStates?: Record<string, ClientState>;
	techStack?: string[];
	credits?: number;
}

export interface TestSessionConfig {
	roomCode?: string;
	currentRound?: number;
	currentPhase?: 'planning' | 'resolution';
	teams?: TestTeamConfig[];
	destinations?: string[];
}

/**
 * Build a test ESP team with sensible defaults
 */
export function buildTestTeam(nameOrConfig: string | TestTeamConfig): ESPTeam {
	const config = typeof nameOrConfig === 'string' ? { name: nameOrConfig } : nameOrConfig;

	return {
		name: config.name || 'TestESP',
		players: [],
		budget: 0,
		clients: [],
		technical_stack: [],
		credits: config.credits ?? 1000,
		reputation: config.reputation ?? { Gmail: 70, Outlook: 70, Yahoo: 70 },
		active_clients: config.clients?.map((c) => c.id) ?? [],
		owned_tech_upgrades: config.techStack ?? [],
		round_history: [],
		available_clients: config.clients ?? [],
		client_states: config.clientStates ?? {},
		locked_in: true,
		pending_onboarding_decisions: {}
	};
}

/**
 * Build a test destination with sensible defaults
 */
export function buildTestDestination(name: string): Destination {
	return {
		name,
		kingdom: name as 'Gmail' | 'Outlook' | 'Yahoo',
		players: [],
		budget: 500,
		filtering_policies: {},
		esp_reputation: {},
		owned_tools: [],
		authentication_level: 0,
		locked_in: true
	};
}

/**
 * Build a test game session with sensible defaults
 */
export function buildTestSession(config?: TestSessionConfig): GameSession {
	const destinations = config?.destinations?.map(buildTestDestination) ?? [
		buildTestDestination('Gmail'),
		buildTestDestination('Outlook'),
		buildTestDestination('Yahoo')
	];

	return {
		roomCode: config?.roomCode ?? 'TEST-123',
		facilitatorId: 'test-facilitator',
		current_round: config?.currentRound ?? 1,
		current_phase: config?.currentPhase ?? 'planning',
		esp_teams: config?.teams?.map(buildTestTeam) ?? [],
		destinations,
		createdAt: new Date(),
		lastActivity: new Date(),
		phase_start_time: new Date()
	};
}
