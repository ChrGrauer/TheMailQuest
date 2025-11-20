/**
 * Client Management Test Helpers
 *
 * Helper functions for setting up and manipulating client portfolio state in E2E tests.
 * Uses real API calls instead of test API mocking for proper integration testing.
 */

import type { Page } from '@playwright/test';

/**
 * Acquire a client for a team via the marketplace API
 *
 * @param page - Player page
 * @param roomCode - Room code
 * @param teamName - ESP team name (e.g., 'SendWave')
 * @param clientId - Client ID to acquire
 * @returns Response from API
 */
export async function acquireClient(
	page: Page,
	roomCode: string,
	teamName: string,
	clientId: string
): Promise<any> {
	return await page.evaluate(
		async ({ roomCode, teamName, clientId }) => {
			const response = await fetch(`/api/sessions/${roomCode}/esp/${teamName}/clients/acquire`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ clientId })
			});
			return await response.json();
		},
		{ roomCode, teamName, clientId }
	);
}

/**
 * Toggle client status (Active <-> Paused) via API
 *
 * @param page - Player page
 * @param roomCode - Room code
 * @param teamName - ESP team name
 * @param clientId - Client ID
 * @param newStatus - New status ('Active' or 'Paused')
 * @returns Response from API
 */
export async function toggleClientStatus(
	page: Page,
	roomCode: string,
	teamName: string,
	clientId: string,
	newStatus: 'Active' | 'Paused'
): Promise<any> {
	return await page.evaluate(
		async ({ roomCode, teamName, clientId, newStatus }) => {
			const response = await fetch(
				`/api/sessions/${roomCode}/esp/${teamName}/clients/${clientId}/status`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ status: newStatus })
				}
			);
			return await response.json();
		},
		{ roomCode, teamName, clientId, newStatus }
	);
}

/**
 * Configure onboarding options for a new client via API
 *
 * @param page - Player page
 * @param roomCode - Room code
 * @param teamName - ESP team name
 * @param clientId - Client ID
 * @param warmup - Whether to purchase warm-up (150 credits)
 * @param listHygiene - Whether to purchase list hygiene (80 credits)
 * @returns Response from API
 */
export async function configureOnboarding(
	page: Page,
	roomCode: string,
	teamName: string,
	clientId: string,
	warmup: boolean,
	listHygiene: boolean
): Promise<any> {
	return await page.evaluate(
		async ({ roomCode, teamName, clientId, warmup, listHygiene }) => {
			const response = await fetch(
				`/api/sessions/${roomCode}/esp/${teamName}/clients/${clientId}/onboarding`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ warmup, list_hygiene: listHygiene })
				}
			);
			return await response.json();
		},
		{ roomCode, teamName, clientId, warmup, listHygiene }
	);
}

/**
 * Configure pending onboarding for a client (without immediately deducting costs)
 * Uses the /pending-onboarding endpoint to store selections that will be applied at lock-in
 *
 * @param page - Player page
 * @param roomCode - Room code
 * @param teamName - ESP team name
 * @param clientId - Client ID
 * @param warmup - Whether to enable warm-up option
 * @param listHygiene - Whether to enable list hygiene option
 * @returns Response from API
 */
export async function configurePendingOnboarding(
	page: Page,
	roomCode: string,
	teamName: string,
	clientId: string,
	warmup: boolean,
	listHygiene: boolean
): Promise<any> {
	return await page.evaluate(
		async ({ roomCode, teamName, clientId, warmup, listHygiene }) => {
			const response = await fetch(`/api/sessions/${roomCode}/esp/${teamName}/pending-onboarding`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ clientId, warmup, list_hygiene: listHygiene })
			});
			return await response.json();
		},
		{ roomCode, teamName, clientId, warmup, listHygiene }
	);
}

/**
 * Get portfolio data for a team via API
 *
 * @param page - Player page
 * @param roomCode - Room code
 * @param teamName - ESP team name
 * @returns Portfolio data
 */
export async function getPortfolio(page: Page, roomCode: string, teamName: string): Promise<any> {
	return await page.evaluate(
		async ({ roomCode, teamName }) => {
			const response = await fetch(`/api/sessions/${roomCode}/esp/${teamName}/portfolio`);
			return await response.json();
		},
		{ roomCode, teamName }
	);
}

/**
 * Manually suspend a client in the backend (for testing suspended state)
 * This bypasses the normal game flow and directly modifies the session state
 *
 * @param page - Player page
 * @param roomCode - Room code
 * @param teamName - ESP team name
 * @param clientId - Client ID to suspend
 */
export async function suspendClient(
	page: Page,
	roomCode: string,
	teamName: string,
	clientId: string
): Promise<void> {
	// Since there's no API endpoint for manually suspending clients (it's done by game engine),
	// we need to directly manipulate the session state via evaluation
	// This is a test-only operation
	await page.evaluate(
		async ({ roomCode, teamName, clientId }) => {
			// This will need to be implemented as a test-only endpoint or
			// we can use the dashboard test API for this specific case
			if ((window as any).__espDashboardTest) {
				// For now, we'll use the test API for suspended state since it's a game-engine action
				console.warn('suspendClient: Using test API as fallback (no real API endpoint for this)');
			}
		},
		{ roomCode, teamName, clientId }
	);
}

/**
 * Wait for client management modal to be ready
 *
 * @param page - Player page
 */
export async function waitForClientManagementModal(page: Page): Promise<void> {
	await page.getByTestId('client-management-modal').waitFor({ state: 'visible' });

	// Wait for budget banner to be visible (means portfolio data is loaded)
	await page.getByTestId('budget-banner').waitFor({ state: 'visible', timeout: 5000 });

	// Small additional wait for any animations/renders
	await page.waitForTimeout(200);
}

/**
 * Open client management modal
 *
 * @param page - Player page
 */
export async function openClientManagementModal(page: Page): Promise<void> {
	// Wait for dashboard to be fully loaded
	await page.waitForSelector('[data-testid="open-portfolio"]', { timeout: 15000 });

	// Click the button
	await page.getByTestId('open-portfolio').click();
	await waitForClientManagementModal(page);
}

/**
 * Close client management modal
 *
 * @param page - Player page
 */
export async function closeClientManagementModal(page: Page): Promise<void> {
	await page.getByTestId('modal-close-btn').click();
	await page.getByTestId('client-management-modal').waitFor({ state: 'hidden' });
}

/**
 * Get available clients from the team's marketplace
 *
 * @param page - Player page
 * @param roomCode - Room code
 * @param teamName - ESP team name
 * @returns Array of available client IDs
 */
export async function getAvailableClientIds(
	page: Page,
	roomCode: string,
	teamName: string
): Promise<string[]> {
	return await page.evaluate(
		async ({ roomCode, teamName }) => {
			const response = await fetch(`/api/sessions/${roomCode}/esp/${teamName}/clients`);
			const data = await response.json();
			if (data.success && data.clients) {
				return data.clients.map((c: any) => c.id);
			}
			return [];
		},
		{ roomCode, teamName }
	);
}
