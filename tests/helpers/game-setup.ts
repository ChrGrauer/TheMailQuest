/**
 * Shared E2E Test Helpers
 *
 * Common helper functions for setting up game sessions and players in E2E tests.
 * Extracted from individual test files to eliminate duplication.
 */

import { expect, type Page, type BrowserContext } from '@playwright/test';

/**
 * Create a game session as facilitator and return room code
 */
export async function createTestSession(page: Page): Promise<string> {
	await page.goto('/');
	await page.click('text=I\'m a facilitator');
	await page.waitForURL('/create');
	await page.click('text=Create a Session');
	await page.waitForURL(/\/lobby\/.+/);
	const url = page.url();
	const roomCode = url.split('/lobby/')[1];
	return roomCode;
}

/**
 * Add a player to a session
 */
export async function addPlayer(
	context: BrowserContext,
	roomCode: string,
	displayName: string,
	role: 'ESP' | 'Destination',
	teamName: string
): Promise<Page> {
	const playerPage = await context.newPage();
	await playerPage.goto(`/lobby/${roomCode}`);
	await playerPage.click(`text=${teamName}`);
	await playerPage.locator('input[name="displayName"]').fill(displayName);
	await playerPage.click('button:has-text("Join Game")');
	await expect(playerPage.locator(`text=${displayName}`)).toBeVisible();
	return playerPage;
}

/**
 * Create a session with minimum players (1 ESP + 1 Destination)
 */
export async function createSessionWithMinimumPlayers(
	facilitatorPage: Page,
	context: BrowserContext
): Promise<{ roomCode: string; alicePage: Page; bobPage: Page }> {
	const roomCode = await createTestSession(facilitatorPage);
	const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
	const bobPage = await addPlayer(context, roomCode, 'Bob', 'Destination', 'Gmail');
	return { roomCode, alicePage, bobPage };
}

/**
 * Create a session with multiple players
 */
export async function createSessionWithMultiplePlayers(
	facilitatorPage: Page,
	context: BrowserContext
): Promise<{
	roomCode: string;
	alicePage: Page;
	bobPage: Page;
	charliePage: Page;
	gracePage: Page;
}> {
	const roomCode = await createTestSession(facilitatorPage);
	const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
	const bobPage = await addPlayer(context, roomCode, 'Bob', 'ESP', 'MailMonkey');
	const charliePage = await addPlayer(context, roomCode, 'Charlie', 'ESP', 'BluePost');
	const gracePage = await addPlayer(context, roomCode, 'Grace', 'Destination', 'Gmail');
	return { roomCode, alicePage, bobPage, charliePage, gracePage };
}

/**
 * Create a session with ESP player and start game (for ESP dashboard tests)
 */
export async function createGameInPlanningPhase(
	facilitatorPage: Page,
	context: BrowserContext
): Promise<{ roomCode: string; alicePage: Page; bobPage: Page }> {
	const roomCode = await createTestSession(facilitatorPage);
	const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
	const bobPage = await addPlayer(context, roomCode, 'Bob', 'Destination', 'Gmail');
	await facilitatorPage.waitForTimeout(500);

	// Start game
	const startGameButton = facilitatorPage.getByRole('button', { name: /start game/i });
	await startGameButton.click();

	// Wait for Alice to be redirected to ESP dashboard
	await alicePage.waitForURL(`/game/${roomCode}/esp/sendwave`, { timeout: 10000 });

	// Wait for dashboard to finish loading
	await alicePage.waitForFunction(
		() => (window as any).__espDashboardTest?.ready === true,
		{},
		{ timeout: 10000 }
	);

	return { roomCode, alicePage, bobPage };
}

/**
 * Create a session with destination player and start game (for Destination dashboard tests)
 */
export async function createGameWithDestinationPlayer(
	facilitatorPage: Page,
	context: BrowserContext
): Promise<{ roomCode: string; alicePage: Page; bobPage: Page; gmailPage: Page }> {
	const roomCode = await createTestSession(facilitatorPage);
	const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
	const bobPage = await addPlayer(context, roomCode, 'Bob', 'ESP', 'MailMonkey');
	const gmailPage = await addPlayer(context, roomCode, 'Carol', 'Destination', 'Gmail');
	await facilitatorPage.waitForTimeout(500);

	// Start game
	const startGameButton = facilitatorPage.getByRole('button', { name: /start game/i });
	await startGameButton.click();

	// Wait for Gmail to be redirected to destination dashboard
	await gmailPage.waitForURL(`/game/${roomCode}/destination/gmail`, { timeout: 10000 });

	// Wait for dashboard to finish loading
	await gmailPage.waitForFunction(
		() => (window as any).__destinationDashboardTest?.ready === true,
		{},
		{ timeout: 10000 }
	);

	return { roomCode, alicePage, bobPage, gmailPage };
}

/**
 * Create a game with 2 ESP teams in planning phase
 * Alice on SendWave, Bob on MailMonkey, with one destination
 */
export async function createGameWith2ESPTeams(
	facilitatorPage: Page,
	context: BrowserContext
): Promise<{ roomCode: string; alicePage: Page; bobPage: Page; destinationPage: Page }> {
	const roomCode = await createTestSession(facilitatorPage);
	const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
	const bobPage = await addPlayer(context, roomCode, 'Bob', 'ESP', 'MailMonkey');
	const destinationPage = await addPlayer(context, roomCode, 'Carol', 'Destination', 'Gmail');
	await facilitatorPage.waitForTimeout(500);

	// Start game
	const startGameButton = facilitatorPage.getByRole('button', { name: /start game/i });
	await startGameButton.click();

	// Wait for Alice to be redirected to SendWave ESP dashboard
	await alicePage.waitForURL(`/game/${roomCode}/esp/sendwave`, { timeout: 10000 });
	await alicePage.waitForFunction(
		() => (window as any).__espDashboardTest?.ready === true,
		{},
		{ timeout: 10000 }
	);

	// Wait for Bob to be redirected to MailMonkey ESP dashboard
	await bobPage.waitForURL(`/game/${roomCode}/esp/mailmonkey`, { timeout: 10000 });
	await bobPage.waitForFunction(
		() => (window as any).__espDashboardTest?.ready === true,
		{},
		{ timeout: 10000 }
	);

	return { roomCode, alicePage, bobPage, destinationPage };
}
