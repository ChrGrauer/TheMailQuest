/**
 * E2E Test Type Definitions
 *
 * Shared type definitions for E2E test helpers and test APIs.
 */

/**
 * ESP Dashboard Test API interface
 * Exposed via window.__espDashboardTest in ESP dashboard components
 */
export interface EspDashboardTestAPI {
	ready: boolean;
	setCredits: (value: number) => void;
	getCredits: () => number;
	setSpentCredits: (value: number) => void;
	setReputation: (values: Record<string, number>) => void;
	setRound: (round: number) => void;
	setTimerSeconds: (seconds: number) => void;
	addPendingOnboarding: (clientId: string, warmup: boolean, listHygiene: boolean) => void;
	setPendingOnboarding: (
		pending: Record<string, { warmup: boolean; listHygiene: boolean }>
	) => void;
	getPendingOnboarding: () => Record<string, { warmup: boolean; listHygiene: boolean }>;
	getCurrentPhase: () => string;
	getRevenue: () => number;
}

/**
 * Destination Dashboard Test API interface
 * Exposed via window.__destinationDashboardTest in Destination dashboard components
 */
export interface DestinationDashboardTestAPI {
	ready: boolean;
	setCredits: (value: number) => void;
	setBudget: (value: number) => void;
	setKingdom: (kingdom: string) => void;
	getOwnedTools: () => string[];
	getAuthLevel: () => number;
	openTechShop: () => void;
}

/**
 * Global window augmentation for test APIs
 */
declare global {
	interface Window {
		__espDashboardTest?: EspDashboardTestAPI;
		__destinationDashboardTest?: DestinationDashboardTestAPI;
	}
}

/**
 * Dashboard state for ESP teams
 */
export interface EspDashboardState {
	credits: number;
	spentCredits?: number;
	reputation?: Record<string, number>;
	round?: number;
	timerSeconds?: number;
	pendingOnboarding?: Record<string, { warmup: boolean; listHygiene: boolean }>;
}

/**
 * Dashboard state for Destination teams
 */
export interface DestinationDashboardState {
	credits: number;
	kingdom?: string;
}
