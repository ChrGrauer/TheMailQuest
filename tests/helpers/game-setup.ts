/**
 * Shared E2E Test Helpers
 *
 * Common helper functions for setting up game sessions and players in E2E tests.
 * Extracted from individual test files to eliminate duplication.
 */
import { expect } from '@playwright/test';
import { type Page, type BrowserContext } from '@playwright/test';

/**
 * Close multiple pages safely (ignores null/undefined and already closed pages)
 * Useful for cleanup in tests to prevent resource leaks
 *
 * @example
 * await closePages(facilitatorPage, alicePage, bobPage, zmailPage);
 */
export async function closePages(...pages: (Page | null | undefined)[]): Promise<void> {
	for (const page of pages) {
		if (page && !page.isClosed()) {
			await page.close().catch(() => {
				// Ignore errors if page is already closed
			});
		}
	}
}

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
	const bobPage = await addPlayer(context, roomCode, 'Bob', 'Destination', 'zmail');
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
	const gracePage = await addPlayer(context, roomCode, 'Grace', 'Destination', 'zmail');
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
	const bobPage = await addPlayer(context, roomCode, 'Bob', 'Destination', 'zmail');
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
): Promise<{ roomCode: string; alicePage: Page; bobPage: Page; zmailPage: Page }> {
	const roomCode = await createTestSession(facilitatorPage);
	const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
	const bobPage = await addPlayer(context, roomCode, 'Bob', 'ESP', 'MailMonkey');
	const zmailPage = await addPlayer(context, roomCode, 'Carol', 'Destination', 'zmail');
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

	// Wait for zmail to be redirected to destination dashboard
	await zmailPage.waitForURL(`/game/${roomCode}/destination/zmail`, { timeout: 10000 });

	// Wait for dashboard to finish loading
	await zmailPage.waitForFunction(
		() => (window as any).__destinationDashboardTest?.ready === true,
		{},
		{ timeout: 10000 }
	);

	return { roomCode, alicePage, bobPage, zmailPage };
}

/**
 * Create a session with destination player and move to round 2
 */
export async function createGameInSecondRound(
	facilitatorPage: Page,
	context: BrowserContext
): Promise<{ roomCode: string; facilitatorPage: Page; alicePage: Page; zmailPage: Page }> {
	const roomCode = await createTestSession(facilitatorPage);
	const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
	const zmailPage = await addPlayer(context, roomCode, 'Carol', 'Destination', 'zmail');
	await facilitatorPage.waitForTimeout(500);

	// Start game
	const startGameButton = facilitatorPage.getByRole('button', { name: /start game/i });
	await startGameButton.click();

	// Wait for ESPs to be redirected to their dashboards
	await alicePage.waitForURL(`/game/${roomCode}/esp/sendwave`, { timeout: 10000 });

	// Wait for dashboards to be ready
	await alicePage.waitForFunction(
		() => (window as any).__espDashboardTest?.ready === true,
		{},
		{ timeout: 10000 }
	);

	// Acquire one client for each ESP team to enable resolution data generation
	await acquireClientForTeam(alicePage, roomCode, 'SendWave');
	await acquireClientForTeam(alicePage, roomCode, 'SendWave');

	// Wait for client acquisition to complete and state to update
	await alicePage.waitForTimeout(1000);

	// Wait for zmail to be redirected to destination dashboard
	await zmailPage.waitForURL(`/game/${roomCode}/destination/zmail`, { timeout: 10000 });

	// Wait for dashboard to finish loading
	await zmailPage.waitForFunction(
		() => (window as any).__destinationDashboardTest?.ready === true,
		{},
		{ timeout: 10000 }
	);

	// All players lock in to trigger resolution and Alice should see the consequences phase
	await alicePage.locator('[data-testid="lock-in-button"]').click();
	await zmailPage.locator('[data-testid="lock-in-button"]').click();
	await alicePage.waitForTimeout(2000); // Wait for resolution to complete
	await expect(alicePage.locator('[data-testid="consequences-header"]')).toBeVisible({
		timeout: 5000
	});

	// facilitator clicks "Continue" to advance to next planning phase and Alice
	// should see the planning phase dashboard for Round 2
	const continueButton = facilitatorPage.locator('[data-testid="start-next-round-button"]');
	await continueButton.click();
	await alicePage.waitForTimeout(1000); // Wait for phase transition
	await expect(alicePage.locator('[data-testid="round-indicator"]')).toContainText('2', {
		timeout: 5000
	});

	// Wait for zmail page to also transition to Round 2
	await zmailPage.waitForTimeout(1000);
	await expect(zmailPage.locator('[data-testid="round-indicator"]')).toContainText('2', {
		timeout: 5000
	});

	return { roomCode, facilitatorPage, alicePage, zmailPage };
}

/**
 * Create a session with yagle destination player and start game
 * For testing yagle-specific tech shop features
 */
export async function createGameWithyagleDestination(
	facilitatorPage: Page,
	context: BrowserContext
): Promise<{ roomCode: string; alicePage: Page; bobPage: Page; yaglePage: Page }> {
	const roomCode = await createTestSession(facilitatorPage);
	const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
	const bobPage = await addPlayer(context, roomCode, 'Bob', 'ESP', 'MailMonkey');
	const yaglePage = await addPlayer(context, roomCode, 'Diana', 'Destination', 'yagle');
	await facilitatorPage.waitForTimeout(500);

	// Start game
	const startGameButton = facilitatorPage.getByRole('button', { name: /start game/i });
	await startGameButton.click();

	// Wait for yagle to be redirected to destination dashboard
	await yaglePage.waitForURL(`/game/${roomCode}/destination/yagle`, { timeout: 10000 });

	// Wait for dashboard to finish loading
	await yaglePage.waitForFunction(
		() => (window as any).__destinationDashboardTest?.ready === true,
		{},
		{ timeout: 10000 }
	);

	return { roomCode, alicePage, bobPage, yaglePage };
}

/**
 * Create a session with a specified destination player and start game
 * Generic helper that allows choosing any destination
 *
 * @param facilitatorPage - Page for the facilitator
 * @param context - Browser context for creating new pages
 * @param destination - Destination name: 'zmail', 'intake', or 'yagle'
 * @returns Object with roomCode and pages (alicePage, bobPage, destinationPage)
 */
export async function createGameWithDestination(
	facilitatorPage: Page,
	context: BrowserContext,
	destination: 'zmail' | 'intake' | 'yagle'
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
	const destinationPage = await addPlayer(context, roomCode, 'Carol', 'Destination', 'zmail');
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
 * Alice=SendWave, Bob=MailMonkey, Charlie=BluePost, David=SendBolt, Eve=RocketMail, zmail=Destination
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
	zmailPage: Page;
}> {
	const roomCode = await createTestSession(facilitatorPage);
	const sendWavePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
	const mailMonkeyPage = await addPlayer(context, roomCode, 'Bob', 'ESP', 'MailMonkey');
	const bluePostPage = await addPlayer(context, roomCode, 'Charlie', 'ESP', 'BluePost');
	const sendBoltPage = await addPlayer(context, roomCode, 'David', 'ESP', 'SendBolt');
	const rocketMailPage = await addPlayer(context, roomCode, 'Eve', 'ESP', 'RocketMail');
	const zmailPage = await addPlayer(context, roomCode, 'Frank', 'Destination', 'zmail');
	await facilitatorPage.waitForTimeout(500);

	// Start game
	const startGameButton = facilitatorPage.getByRole('button', { name: /start game/i });
	await startGameButton.click();

	// Wait for zmail to be redirected to destination dashboard
	await zmailPage.waitForURL(`/game/${roomCode}/destination/zmail`, { timeout: 10000 });
	await zmailPage.waitForFunction(
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
		zmailPage
	};
}

/**
 * Create a game with 3 destination players and ESP teams
 * Used for coordination panel/investigation voting tests (needs 3 destinations for 2/3 threshold)
 * zmail, intake, yagle destinations + SendWave, MailMonkey, BluePost ESPs
 */
export async function createGameWith3DestinationsAnd3ESPs(
	facilitatorPage: Page,
	context: BrowserContext
): Promise<{
	roomCode: string;
	sendWavePage: Page;
	mailMonkeyPage: Page;
	bluePostPage: Page;
	zmailPage: Page;
	intakePage: Page;
	yaglePage: Page;
}> {
	const roomCode = await createTestSession(facilitatorPage);
	const sendWavePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
	const mailMonkeyPage = await addPlayer(context, roomCode, 'Bob', 'ESP', 'MailMonkey');
	const bluePostPage = await addPlayer(context, roomCode, 'Charlie', 'ESP', 'BluePost');
	const zmailPage = await addPlayer(context, roomCode, 'Grace', 'Destination', 'zmail');
	const intakePage = await addPlayer(context, roomCode, 'Henry', 'Destination', 'intake');
	const yaglePage = await addPlayer(context, roomCode, 'Iris', 'Destination', 'yagle');
	await facilitatorPage.waitForTimeout(500);

	// Start game
	const startGameButton = facilitatorPage.getByRole('button', { name: /start game/i });
	await startGameButton.click();

	// Wait for all destination players to be redirected to their dashboards
	await zmailPage.waitForURL(`/game/${roomCode}/destination/zmail`, { timeout: 10000 });
	await intakePage.waitForURL(`/game/${roomCode}/destination/intake`, { timeout: 10000 });
	await yaglePage.waitForURL(`/game/${roomCode}/destination/yagle`, { timeout: 10000 });

	// Wait for destination dashboards to be ready
	await zmailPage.waitForFunction(
		() => (window as any).__destinationDashboardTest?.ready === true,
		{},
		{ timeout: 10000 }
	);

	return {
		roomCode,
		sendWavePage,
		mailMonkeyPage,
		bluePostPage,
		zmailPage,
		intakePage,
		yaglePage
	};
}

/**
 * Create a game with 3 ESP teams and destination player
 * Alice=SendWave, Bob=MailMonkey, Charlie=BluePost, zmail=Destination
 */
export async function createGameWith3ESPTeams(
	facilitatorPage: Page,
	context: BrowserContext
): Promise<{
	roomCode: string;
	sendWavePage: Page;
	mailMonkeyPage: Page;
	bluePostPage: Page;
	zmailPage: Page;
}> {
	const roomCode = await createTestSession(facilitatorPage);
	const sendWavePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
	const mailMonkeyPage = await addPlayer(context, roomCode, 'Bob', 'ESP', 'MailMonkey');
	const bluePostPage = await addPlayer(context, roomCode, 'Charlie', 'ESP', 'BluePost');
	const zmailPage = await addPlayer(context, roomCode, 'Diana', 'Destination', 'zmail');
	await facilitatorPage.waitForTimeout(500);

	// Start game
	const startGameButton = facilitatorPage.getByRole('button', { name: /start game/i });
	await startGameButton.click();

	// Wait for zmail to be redirected to destination dashboard
	await zmailPage.waitForURL(`/game/${roomCode}/destination/zmail`, { timeout: 10000 });
	await zmailPage.waitForFunction(
		() => (window as any).__destinationDashboardTest?.ready === true,
		{},
		{ timeout: 10000 }
	);

	return { roomCode, sendWavePage, mailMonkeyPage, bluePostPage, zmailPage };
}
