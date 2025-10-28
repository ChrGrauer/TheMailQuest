/**
 * US-1.3: Game Lobby Management - E2E Tests
 *
 * Tests UI/UX for game start functionality:
 * - Start Game button visibility (facilitator only)
 * - Start Game button state (enabled/disabled)
 * - Game launch and phase transition
 * - Player redirections after game start
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

// ============================================================================
// TESTS
// ============================================================================

test.describe('Feature: Game Lobby Management - E2E', () => {
	// ============================================================================
	// START GAME BUTTON VISIBILITY
	// ============================================================================

	test.describe('Scenario: Start Game button visibility based on role', () => {
		test('Given facilitator and player in lobby, Then only facilitator sees Start Game button', async ({
			page,
			browser
		}) => {
			// Given - Create session with one player
			const roomCode = await createTestSession(page);

			// Wait for the lobby page to fully render (check for player count indicator)
			await expect(page.locator('text=0 players ready')).toBeVisible({ timeout: 10000 });

			// Create a NEW browser context for the player (separate cookies)
			const playerContext = await browser.newContext();
			const playerPage = await addPlayer(playerContext, roomCode, 'Alice', 'ESP', 'SendWave');

			// Wait for WebSocket update to propagate to facilitator page
			await expect(page.locator('text=1 players ready')).toBeVisible({ timeout: 10000 });

			// Then - Facilitator should see Start Game button
			const facilitatorButton = page.getByRole('button', { name: /start game/i });
			await expect(facilitatorButton).toBeVisible({ timeout: 10000 });

			// And - Player should NOT see Start Game button (different browser context = no facilitatorId cookie)
			const playerButton = playerPage.getByRole('button', { name: /start game/i });
			await expect(playerButton).not.toBeVisible();

			await playerPage.close();
			await playerContext.close();
		});
	});

	// ============================================================================
	// START GAME BUTTON STATE
	// ============================================================================

	test.describe('Scenario: Start Game button state based on player count', () => {
		test('Given different player configurations, Then Start Game button state should reflect minimum requirements', async ({
			page,
			context
		}) => {
			// Given - Facilitator creates session
			const roomCode = await createTestSession(page);
			const startGameButton = page.getByRole('button', { name: /start game/i });

			// Case 1: Only 1 ESP player - button should be disabled
			const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
			await page.waitForTimeout(500); // Wait for WebSocket update

			await expect(startGameButton).toBeVisible();
			await expect(startGameButton).toBeDisabled();
			await expect(
				page.locator('text=/minimum.*required|at least.*destination/i')
			).toBeVisible();

			// Case 2: Add 1 Destination - button should be enabled
			const bobPage = await addPlayer(context, roomCode, 'Bob', 'Destination', 'Gmail');
			await page.waitForTimeout(500); // Wait for WebSocket update

			await expect(startGameButton).toBeEnabled();

			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// STARTING THE GAME
	// ============================================================================

	test.describe('Scenario: Clicking Start Game launches the game', () => {
		test('Given minimum players present, When facilitator clicks Start Game, Then game starts and button disappears', async ({
			page,
			context
		}) => {
			// Given - Create session with minimum players
			const { alicePage, bobPage } = await createSessionWithMinimumPlayers(page, context);
			await page.waitForTimeout(500);

			// When - Facilitator clicks Start Game
			const startGameButton = page.getByRole('button', { name: /start game/i });
			await expect(startGameButton).toBeEnabled();
			await startGameButton.click();

			// Then - Button should disappear (game has started)
			await expect(startGameButton).not.toBeVisible();

			await alicePage.close();
			await bobPage.close();
		});

		test('Given game has started, When checking the page, Then Start Game button should not be visible', async ({
			page,
			context
		}) => {
			// Given - Create session with players and start the game
			const { alicePage, bobPage } = await createSessionWithMinimumPlayers(page, context);
			await page.waitForTimeout(500);

			const startGameButton = page.getByRole('button', { name: /start game/i });
			await startGameButton.click();

			// When/Then - Start Game button should not be visible
			await expect(startGameButton).not.toBeVisible();

			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// ACCESSIBILITY
	// ============================================================================

	test.describe('Accessibility', () => {
		test('Start Game button should have proper accessibility attributes', async ({
			page,
			context
		}) => {
			// Given - Session with minimum players
			const { alicePage, bobPage } = await createSessionWithMinimumPlayers(page, context);
			await page.waitForTimeout(500);

			// Then - Button should have proper role and be keyboard accessible
			const startGameButton = page.getByRole('button', { name: /start game/i });
			await expect(startGameButton).toBeVisible();

			// Should be able to focus with keyboard
			await startGameButton.focus();
			await expect(startGameButton).toBeFocused();

			await alicePage.close();
			await bobPage.close();
		});
	});
});
