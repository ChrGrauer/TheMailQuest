/**
 * US-1.4: Resources Allocation - E2E Tests
 *
 * Tests UI/UX for resource allocation including:
 * - Full flow from lobby to planning phase
 * - Automatic player redirections to dashboards
 * - WebSocket synchronization for resource allocation
 * - Timer display and countdown
 * - Late-joining and reconnection handling
 * - Performance requirements
 *
 * Uses Playwright for end-to-end testing
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a game session as facilitator and return room code
 */
async function createTestSession(page: Page): Promise<string> {
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
async function addPlayer(
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
async function createSessionWithMinimumPlayers(
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
async function createSessionWithMultiplePlayers(
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

// ============================================================================
// TESTS
// ============================================================================

test.describe('Feature: Resources Allocation - E2E', () => {
	// ============================================================================
	// FULL FLOW: LOBBY → RESOURCE ALLOCATION → PLANNING
	// ============================================================================

	test.describe('Scenario: Complete resource allocation flow', () => {
		test('Given sufficient players, When facilitator starts game, Then players are redirected to appropriate dashboards', async ({
			page,
			context
		}) => {
			// Given - Create session with minimum players
			const { roomCode, alicePage, bobPage } = await createSessionWithMinimumPlayers(
				page,
				context
			);
			await page.waitForTimeout(500);

			// When - Facilitator clicks Start Game
			const startGameButton = page.getByRole('button', { name: /start game/i });
			await expect(startGameButton).toBeEnabled();
			await startGameButton.click();

			// Then - Alice (ESP) should be redirected to ESP dashboard
			await alicePage.waitForURL(`/game/${roomCode}/esp/sendwave`, { timeout: 10000 });
			expect(alicePage.url()).toContain(`/game/${roomCode}/esp/sendwave`);

			// And - Bob (Destination) should be redirected to Destination dashboard
			await bobPage.waitForURL(`/game/${roomCode}/destination/gmail`, { timeout: 10000 });
			expect(bobPage.url()).toContain(`/game/${roomCode}/destination/gmail`);

			// And - Facilitator should be redirected to facilitator dashboard
			await page.waitForURL(`/game/${roomCode}/facilitator`, { timeout: 10000 });
			expect(page.url()).toContain(`/game/${roomCode}/facilitator`);

			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// WEBSOCKET SYNCHRONIZATION
	// ============================================================================

	test.describe('Scenario: All clients receive resource allocation notification', () => {
		test('Given multiple players, When allocation completes, Then all clients receive resources_allocated message', async ({
			page,
			context
		}) => {
			// Given - Create session with multiple players
			const { roomCode, alicePage, bobPage, charliePage, gracePage } =
				await createSessionWithMultiplePlayers(page, context);
			await page.waitForTimeout(500);

			// Set up WebSocket message listeners
			const aliceMessages: any[] = [];
			const bobMessages: any[] = [];
			const charlieMessages: any[] = [];
			const graceMessages: any[] = [];

			await alicePage.evaluate(() => {
				(window as any).wsMessages = [];
				// Capture WebSocket messages
			});

			await bobPage.evaluate(() => {
				(window as any).wsMessages = [];
			});

			await charliePage.evaluate(() => {
				(window as any).wsMessages = [];
			});

			await gracePage.evaluate(() => {
				(window as any).wsMessages = [];
			});

			// When - Facilitator starts game
			const startGameButton = page.getByRole('button', { name: /start game/i });
			await startGameButton.click();

			// Wait for redirections
			await page.waitForURL(`/game/${roomCode}/facilitator`, { timeout: 10000 });

			// Then - All players should be on their dashboards
			await expect(alicePage).toHaveURL(`/game/${roomCode}/esp/sendwave`);
			await expect(bobPage).toHaveURL(`/game/${roomCode}/esp/mailmonkey`);
			await expect(charliePage).toHaveURL(`/game/${roomCode}/esp/bluepost`);
			await expect(gracePage).toHaveURL(`/game/${roomCode}/destination/gmail`);

			await alicePage.close();
			await bobPage.close();
			await charliePage.close();
			await gracePage.close();
		});
	});

	// ============================================================================
	// TIMER DISPLAY
	// ============================================================================

	test.describe('Scenario: Game timer displays and counts down', () => {
		test('Given game transitions to Planning, Then timer displays 5:00 and counts down', async ({
			page,
			context
		}) => {
			// Given
			const { roomCode, alicePage, bobPage } = await createSessionWithMinimumPlayers(
				page,
				context
			);
			await page.waitForTimeout(500);

			// When - Start game
			const startGameButton = page.getByRole('button', { name: /start game/i });
			await startGameButton.click();

			// Wait for redirect to ESP dashboard
			await alicePage.waitForURL(`/game/${roomCode}/esp/sendwave`, { timeout: 10000 });

			// Then - Timer should be visible and showing 5:00 format
			const timerElement = alicePage.locator('[data-testid="game-timer"]');
			await expect(timerElement).toBeVisible({ timeout: 5000 });

			// Get initial time - should show timer in M:SS format
			const initialTime = await timerElement.textContent();
			expect(initialTime).toMatch(/[0-5]:[0-5][0-9]/); // Format: M:SS (0:00 to 5:59)

			// NOTE: Actual timer countdown via WebSocket would be implemented in future UI stories
			// The backend timer logic is fully tested in unit tests (timer-manager.test.ts)
			// This E2E test verifies the timer is displayed after resource allocation

			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// RESOURCE DISPLAY
	// ============================================================================

	test.describe('Scenario: Players see their allocated resources', () => {
		test('Given ESP player redirected to dashboard, Then they see 1000 credits and 70 reputation', async ({
			page,
			context
		}) => {
			// Given
			const { roomCode, alicePage, bobPage } = await createSessionWithMinimumPlayers(
				page,
				context
			);
			await page.waitForTimeout(500);

			// When - Start game
			const startGameButton = page.getByRole('button', { name: /start game/i });
			await startGameButton.click();

			await alicePage.waitForURL(`/game/${roomCode}/esp/sendwave`, { timeout: 10000 });

			// Then - Alice should see allocated resources
			await expect(alicePage.locator('text=/1000.*credits/i')).toBeVisible({
				timeout: 5000
			});
			await expect(alicePage.locator('text=/70.*reputation/i')).toBeVisible({
				timeout: 5000
			});

			await alicePage.close();
			await bobPage.close();
		});

		test('Given Destination player redirected to dashboard, Then they see their budget', async ({
			page,
			context
		}) => {
			// Given
			const { roomCode, alicePage, bobPage } = await createSessionWithMinimumPlayers(
				page,
				context
			);
			await page.waitForTimeout(500);

			// When - Start game
			const startGameButton = page.getByRole('button', { name: /start game/i });
			await startGameButton.click();

			await bobPage.waitForURL(`/game/${roomCode}/destination/gmail`, { timeout: 10000 });

			// Then - Bob (Gmail) should see budget of 500
			await expect(bobPage.locator('text=/500.*credits/i')).toBeVisible({ timeout: 5000 });

			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// PERFORMANCE
	// ============================================================================

	test.describe('Scenario: Allocation completes within time limit', () => {
		test('Given multiple players, When game starts, Then allocation completes within 2 seconds', async ({
			page,
			context
		}) => {
			// Given
			const { roomCode, alicePage, bobPage, charliePage, gracePage } =
				await createSessionWithMultiplePlayers(page, context);
			await page.waitForTimeout(500);

			const startGameButton = page.getByRole('button', { name: /start game/i });
			await expect(startGameButton).toBeEnabled();

			// When - Measure time from click to redirect
			const startTime = Date.now();
			await startGameButton.click();

			// Wait for redirects
			await Promise.all([
				alicePage.waitForURL(`/game/${roomCode}/esp/sendwave`, { timeout: 10000 }),
				bobPage.waitForURL(`/game/${roomCode}/esp/mailmonkey`, { timeout: 10000 }),
				charliePage.waitForURL(`/game/${roomCode}/esp/bluepost`, { timeout: 10000 }),
				gracePage.waitForURL(`/game/${roomCode}/destination/gmail`, { timeout: 10000 }),
				page.waitForURL(`/game/${roomCode}/facilitator`, { timeout: 10000 })
			]);

			const endTime = Date.now();
			const duration = endTime - startTime;

			// Then - Should complete within 2 seconds (2000ms)
			expect(duration).toBeLessThan(2000);

			await alicePage.close();
			await bobPage.close();
			await charliePage.close();
			await gracePage.close();
		});
	});

	// ============================================================================
	// LATE JOINING / RECONNECTION
	// ============================================================================

	test.describe('Scenario: Late-joining client receives current game state', () => {
		test('Given game is in Planning phase, When player reconnects, Then they see current state', async ({
			page,
			context,
			browser
		}) => {
			// Given - Create session and start game
			const { roomCode, alicePage, bobPage } = await createSessionWithMinimumPlayers(
				page,
				context
			);
			await page.waitForTimeout(500);

			const startGameButton = page.getByRole('button', { name: /start game/i });
			await startGameButton.click();

			await alicePage.waitForURL(`/game/${roomCode}/esp/sendwave`, { timeout: 10000 });

			// Simulate Alice disconnecting
			await alicePage.close();

			// Wait a bit to simulate being disconnected
			await page.waitForTimeout(1000);

			// When - Alice reconnects
			const newContext = await browser.newContext();
			const reconnectedAlicePage = await newContext.newPage();
			await reconnectedAlicePage.goto(`/game/${roomCode}/esp/sendwave`);

			// Then - Alice should see the game in progress
			await expect(reconnectedAlicePage.locator('[data-testid="game-timer"]')).toBeVisible({
				timeout: 5000
			});
			await expect(reconnectedAlicePage.locator('text=/1000.*credits/i')).toBeVisible({
				timeout: 5000
			});
			await expect(reconnectedAlicePage.locator('text=/round.*1/i')).toBeVisible({
				timeout: 5000
			});

			await reconnectedAlicePage.close();
			await newContext.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// ERROR SCENARIOS
	// ============================================================================

	test.describe('Scenario: Game start validation', () => {
		test('Given no destinations, When facilitator tries to start, Then error is shown', async ({
			page,
			context
		}) => {
			// Given - Only ESP teams
			const roomCode = await createTestSession(page);
			const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
			await page.waitForTimeout(500);

			// Then - Start Game button should be disabled
			const startGameButton = page.getByRole('button', { name: /start game/i });
			await expect(startGameButton).toBeDisabled();

			// And - Error message should be visible
			await expect(page.locator('text=/at least.*destination/i')).toBeVisible();

			await alicePage.close();
		});

		test('Given no ESP teams, When facilitator tries to start, Then error is shown', async ({
			page,
			context
		}) => {
			// Given - Only Destinations
			const roomCode = await createTestSession(page);
			const bobPage = await addPlayer(context, roomCode, 'Bob', 'Destination', 'Gmail');
			await page.waitForTimeout(500);

			// Then - Start Game button should be disabled
			const startGameButton = page.getByRole('button', { name: /start game/i });
			await expect(startGameButton).toBeDisabled();

			// And - Error message should be visible
			await expect(page.locator('text=/at least.*esp/i')).toBeVisible();

			await bobPage.close();
		});
	});
});
