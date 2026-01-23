/**
 * Dashboard State Helpers
 *
 * Helpers for interacting with dashboard test APIs to set/get state.
 * These wrap the window.__espDashboardTest and window.__destinationDashboardTest APIs.
 */
import type { Page } from '@playwright/test';
import type { EspDashboardState, DestinationDashboardState } from './types';

/**
 * Set ESP dashboard state via test API
 * Only sets properties that are provided in the state object
 *
 * @param page - ESP player's page
 * @param state - Partial state to set
 */
export async function setEspDashboardState(
	page: Page,
	state: Partial<EspDashboardState>
): Promise<void> {
	await page.evaluate((s) => {
		const api = (window as any).__espDashboardTest;
		if (!api) throw new Error('ESP Dashboard test API not available');

		if (s.credits !== undefined) api.setCredits(s.credits);
		if (s.spentCredits !== undefined) api.setSpentCredits(s.spentCredits);
		if (s.reputation !== undefined) api.setReputation(s.reputation);
		if (s.round !== undefined) api.setRound(s.round);
		if (s.timerSeconds !== undefined) api.setTimerSeconds(s.timerSeconds);
		if (s.pendingOnboarding !== undefined) api.setPendingOnboarding(s.pendingOnboarding);
	}, state);
}

/**
 * Set Destination dashboard state via test API
 * Only sets properties that are provided in the state object
 *
 * @param page - Destination player's page
 * @param state - Partial state to set
 */
export async function setDestinationDashboardState(
	page: Page,
	state: Partial<DestinationDashboardState>
): Promise<void> {
	await page.evaluate((s) => {
		const api = (window as any).__destinationDashboardTest;
		if (!api) throw new Error('Destination Dashboard test API not available');

		if (s.credits !== undefined) api.setCredits(s.credits);
		if (s.kingdom !== undefined) api.setKingdom(s.kingdom);
	}, state);
}

/**
 * Get ESP dashboard credits via test API
 *
 * @param page - ESP player's page
 * @returns Current credits value
 */
export async function getEspCredits(page: Page): Promise<number> {
	return await page.evaluate(() => {
		const api = (window as any).__espDashboardTest;
		if (!api) throw new Error('ESP Dashboard test API not available');
		return api.getCredits();
	});
}

/**
 * Get ESP dashboard current phase via test API
 *
 * @param page - ESP player's page
 * @returns Current phase string
 */
export async function getEspCurrentPhase(page: Page): Promise<string> {
	return await page.evaluate(() => {
		const api = (window as any).__espDashboardTest;
		if (!api) throw new Error('ESP Dashboard test API not available');
		return api.getCurrentPhase();
	});
}

/**
 * Get ESP dashboard revenue via test API
 *
 * @param page - ESP player's page
 * @returns Current revenue value
 */
export async function getEspRevenue(page: Page): Promise<number> {
	return await page.evaluate(() => {
		const api = (window as any).__espDashboardTest;
		if (!api) throw new Error('ESP Dashboard test API not available');
		return api.getRevenue();
	});
}

/**
 * Get ESP pending onboarding decisions via test API
 *
 * @param page - ESP player's page
 * @returns Pending onboarding decisions map
 */
export async function getEspPendingOnboarding(
	page: Page
): Promise<Record<string, { warmup: boolean; listHygiene: boolean }>> {
	return await page.evaluate(() => {
		const api = (window as any).__espDashboardTest;
		if (!api) throw new Error('ESP Dashboard test API not available');
		return api.getPendingOnboarding();
	});
}

/**
 * Add a pending onboarding decision for a client via test API
 *
 * @param page - ESP player's page
 * @param clientId - Client ID
 * @param warmup - Enable warm-up
 * @param listHygiene - Enable list hygiene
 */
export async function addEspPendingOnboarding(
	page: Page,
	clientId: string,
	warmup: boolean,
	listHygiene: boolean
): Promise<void> {
	await page.evaluate(
		({ clientId, warmup, listHygiene }) => {
			const api = (window as any).__espDashboardTest;
			if (!api) throw new Error('ESP Dashboard test API not available');
			api.addPendingOnboarding(clientId, warmup, listHygiene);
		},
		{ clientId, warmup, listHygiene }
	);
}

/**
 * Get Destination dashboard owned tools via test API
 *
 * @param page - Destination player's page
 * @returns Array of owned tool IDs
 */
export async function getDestinationOwnedTools(page: Page): Promise<string[]> {
	return await page.evaluate(() => {
		const api = (window as any).__destinationDashboardTest;
		if (!api) throw new Error('Destination Dashboard test API not available');
		return api.getOwnedTools();
	});
}

/**
 * Get Destination dashboard authentication level via test API
 *
 * @param page - Destination player's page
 * @returns Authentication level (0-4)
 */
export async function getDestinationAuthLevel(page: Page): Promise<number> {
	return await page.evaluate(() => {
		const api = (window as any).__destinationDashboardTest;
		if (!api) throw new Error('Destination Dashboard test API not available');
		return api.getAuthLevel();
	});
}

/**
 * Wait for ESP dashboard test API to be ready
 *
 * @param page - ESP player's page
 * @param timeout - Maximum time to wait (default: 10000ms)
 */
export async function waitForEspDashboardReady(page: Page, timeout = 10000): Promise<void> {
	await page.waitForFunction(() => (window as any).__espDashboardTest?.ready === true, {
		timeout
	});
}

/**
 * Wait for Destination dashboard test API to be ready
 *
 * @param page - Destination player's page
 * @param timeout - Maximum time to wait (default: 10000ms)
 */
export async function waitForDestinationDashboardReady(page: Page, timeout = 10000): Promise<void> {
	await page.waitForFunction(() => (window as any).__destinationDashboardTest?.ready === true, {
		timeout
	});
}
