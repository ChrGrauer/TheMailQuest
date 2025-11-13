/**
 * Shared E2E Test Helpers
 *
 * Common helper functions for setting up game sessions and players in E2E tests.
 * Extracted from individual test files to eliminate duplication.
 */

import { type Page, type BrowserContext } from '@playwright/test';

/**
 * Create a game session as facilitator and return room code
 */
export async function createTestSession(page: Page): Promise<string> {
	await page.goto('/');
	await page.click("text=I'm a facilitator");
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
	// Wait for join to complete (button changes to "Joining..." then modal closes)
	await playerPage.waitForTimeout(500);
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

	// Verify we're on the correct page
	const aliceURL = alicePage.url();
	if (!aliceURL.includes('/esp/sendwave')) {
		throw new Error(`Alice page is on wrong URL: ${aliceURL}`);
	}

	// Wait for dashboard to finish loading - check for key elements
	await alicePage.waitForSelector('[data-testid="team-name"]', { timeout: 10000 });
	await alicePage.waitForSelector('[data-testid="lock-in-button"]', { timeout: 10000 });

	// Wait for dashboard test API to be ready (best effort)
	try {
		await alicePage.waitForFunction(
			() => (window as any).__espDashboardTest?.ready === true,
			{},
			{ timeout: 5000 }
		);
	} catch (e) {
		// Continue even if test API not ready - elements are loaded
		console.log('Test API not ready, but dashboard elements are present');
	}

	// Final verification: ensure we're still on Alice's page
	await alicePage.bringToFront();

	return { roomCode, alicePage, bobPage };
}

/**
 * Acquire a client for an ESP team to enable resolution data generation
 * @param page - ESP player page
 * @param roomCode - Room code
 * @param teamName - ESP team name
 */
async function acquireClientForTeam(page: Page, roomCode: string, teamName: string): Promise<void> {
	// Get available client IDs
	const clientIds = await page.evaluate(
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

	if (clientIds.length === 0) {
		throw new Error(`No clients available for ${teamName}`);
	}

	// Acquire the first available client
	const clientId = clientIds[0];
	const result = await page.evaluate(
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

	if (!result.success) {
		throw new Error(`Failed to acquire client for ${teamName}: ${result.error}`);
	}
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

	// Wait for ESPs to be redirected to their dashboards
	await alicePage.waitForURL(`/game/${roomCode}/esp/sendwave`, { timeout: 10000 });
	await bobPage.waitForURL(`/game/${roomCode}/esp/mailmonkey`, { timeout: 10000 });

	// Wait for dashboards to be ready
	await alicePage.waitForFunction(
		() => (window as any).__espDashboardTest?.ready === true,
		{},
		{ timeout: 10000 }
	);
	await bobPage.waitForFunction(
		() => (window as any).__espDashboardTest?.ready === true,
		{},
		{ timeout: 10000 }
	);

	// Acquire one client for each ESP team to enable resolution data generation
	await acquireClientForTeam(alicePage, roomCode, 'SendWave');
	await acquireClientForTeam(bobPage, roomCode, 'MailMonkey');

	// Wait for client acquisition to complete and state to update
	await alicePage.waitForTimeout(1000);

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
 * Create a session with Yahoo destination player and start game
 * For testing Yahoo-specific tech shop features
 */
export async function createGameWithYahooDestination(
	facilitatorPage: Page,
	context: BrowserContext
): Promise<{ roomCode: string; alicePage: Page; bobPage: Page; yahooPage: Page }> {
	const roomCode = await createTestSession(facilitatorPage);
	const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
	const bobPage = await addPlayer(context, roomCode, 'Bob', 'ESP', 'MailMonkey');
	const yahooPage = await addPlayer(context, roomCode, 'Diana', 'Destination', 'Yahoo');
	await facilitatorPage.waitForTimeout(500);

	// Start game
	const startGameButton = facilitatorPage.getByRole('button', { name: /start game/i });
	await startGameButton.click();

	// Wait for Yahoo to be redirected to destination dashboard
	await yahooPage.waitForURL(`/game/${roomCode}/destination/yahoo`, { timeout: 10000 });

	// Wait for dashboard to finish loading
	await yahooPage.waitForFunction(
		() => (window as any).__destinationDashboardTest?.ready === true,
		{},
		{ timeout: 10000 }
	);

	return { roomCode, alicePage, bobPage, yahooPage };
}

/**
 * Create a session with a specified destination player and start game
 * Generic helper that allows choosing any destination
 *
 * @param facilitatorPage - Page for the facilitator
 * @param context - Browser context for creating new pages
 * @param destination - Destination name: 'Gmail', 'Outlook', or 'Yahoo'
 * @returns Object with roomCode and pages (alicePage, bobPage, destinationPage)
 */
export async function createGameWithDestination(
	facilitatorPage: Page,
	context: BrowserContext,
	destination: 'Gmail' | 'Outlook' | 'Yahoo'
): Promise<{ roomCode: string; alicePage: Page; bobPage: Page; destinationPage: Page }> {
	const roomCode = await createTestSession(facilitatorPage);
	const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
	const bobPage = await addPlayer(context, roomCode, 'Bob', 'ESP', 'MailMonkey');
	const destinationPage = await addPlayer(context, roomCode, 'Carol', 'Destination', destination);
	await facilitatorPage.waitForTimeout(500);

	// Start game
	const startGameButton = facilitatorPage.getByRole('button', { name: /start game/i });
	await startGameButton.click();

	// Wait for destination to be redirected to dashboard
	const destLower = destination.toLowerCase();
	await destinationPage.waitForURL(`/game/${roomCode}/destination/${destLower}`, {
		timeout: 10000
	});

	// Wait for dashboard to finish loading
	await destinationPage.waitForFunction(
		() => (window as any).__destinationDashboardTest?.ready === true,
		{},
		{ timeout: 10000 }
	);

	return { roomCode, alicePage, bobPage, destinationPage };
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

/**
 * Create a session with 5 ESP teams and destination player (for filtering controls tests)
 * Alice=SendWave, Bob=MailMonkey, Charlie=BluePost, David=SendBolt, Eve=RocketMail, Gmail=Destination
 */
export async function createGameWith5ESPTeams(
	facilitatorPage: Page,
	context: BrowserContext
): Promise<{
	roomCode: string;
	sendWavePage: Page;
	mailMonkeyPage: Page;
	bluePostPage: Page;
	sendBoltPage: Page;
	rocketMailPage: Page;
	gmailPage: Page;
}> {
	const roomCode = await createTestSession(facilitatorPage);
	const sendWavePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
	const mailMonkeyPage = await addPlayer(context, roomCode, 'Bob', 'ESP', 'MailMonkey');
	const bluePostPage = await addPlayer(context, roomCode, 'Charlie', 'ESP', 'BluePost');
	const sendBoltPage = await addPlayer(context, roomCode, 'David', 'ESP', 'SendBolt');
	const rocketMailPage = await addPlayer(context, roomCode, 'Eve', 'ESP', 'RocketMail');
	const gmailPage = await addPlayer(context, roomCode, 'Frank', 'Destination', 'Gmail');
	await facilitatorPage.waitForTimeout(500);

	// Start game
	const startGameButton = facilitatorPage.getByRole('button', { name: /start game/i });
	await startGameButton.click();

	// Wait for Gmail to be redirected to destination dashboard
	await gmailPage.waitForURL(`/game/${roomCode}/destination/gmail`, { timeout: 10000 });
	await gmailPage.waitForFunction(
		() => (window as any).__destinationDashboardTest?.ready === true,
		{},
		{ timeout: 10000 }
	);

	return {
		roomCode,
		sendWavePage,
		mailMonkeyPage,
		bluePostPage,
		sendBoltPage,
		rocketMailPage,
		gmailPage
	};
}

/**
 * Create a game with 3 ESP teams and destination player
 * Alice=SendWave, Bob=MailMonkey, Charlie=BluePost, Gmail=Destination
 */
export async function createGameWith3ESPTeams(
	facilitatorPage: Page,
	context: BrowserContext
): Promise<{
	roomCode: string;
	sendWavePage: Page;
	mailMonkeyPage: Page;
	bluePostPage: Page;
	gmailPage: Page;
}> {
	const roomCode = await createTestSession(facilitatorPage);
	const sendWavePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
	const mailMonkeyPage = await addPlayer(context, roomCode, 'Bob', 'ESP', 'MailMonkey');
	const bluePostPage = await addPlayer(context, roomCode, 'Charlie', 'ESP', 'BluePost');
	const gmailPage = await addPlayer(context, roomCode, 'Diana', 'Destination', 'Gmail');
	await facilitatorPage.waitForTimeout(500);

	// Start game
	const startGameButton = facilitatorPage.getByRole('button', { name: /start game/i });
	await startGameButton.click();

	// Wait for Gmail to be redirected to destination dashboard
	await gmailPage.waitForURL(`/game/${roomCode}/destination/gmail`, { timeout: 10000 });
	await gmailPage.waitForFunction(
		() => (window as any).__destinationDashboardTest?.ready === true,
		{},
		{ timeout: 10000 }
	);

	return { roomCode, sendWavePage, mailMonkeyPage, bluePostPage, gmailPage };
}
