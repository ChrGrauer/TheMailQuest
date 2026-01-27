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

import { test, expect } from './fixtures';
import {
	createTestSession,
	addPlayer,
	createSessionWithMinimumPlayers,
	createSessionWithMultiplePlayers,
	closePages
} from './helpers/game-setup';

// ============================================================================
// TESTS
// ============================================================================

// NOTE: Streamlined test file - removed redundant tests
// Setup validation (player joining, game starting) is tested by helpers:
// - createSessionWithMinimumPlayers() already validates game setup works
// - Generic WebSocket sync tests moved to dedicated WebSocket test file
// This file focuses on resource allocation-specific logic and edge cases

test.describe('Feature: Resources Allocation - E2E', () => {
	// ============================================================================
	// PERFORMANCE
	// ============================================================================

	test.describe('Scenario: Allocation completes within time limit', () => {
		test('Given multiple players, When game starts, Then allocation completes within reasonable time', async ({
			page,
			context
		}) => {
			// Given
			const { roomCode, alicePage, bobPage, charliePage, gracePage } =
				await createSessionWithMultiplePlayers(page, context);

			// Wait for Start Game button to be enabled (condition-based, not hard timeout)
			const startGameButton = page.getByRole('button', { name: /start game/i });
			await expect(startGameButton).toBeEnabled({ timeout: 5000 });

			// When - Measure time from click to redirect
			const startTime = Date.now();
			await startGameButton.click();

			// Wait for redirects
			await Promise.all([
				alicePage.waitForURL(`/game/${roomCode}/esp/sendwave`, { timeout: 10000 }),
				bobPage.waitForURL(`/game/${roomCode}/esp/mailmonkey`, { timeout: 10000 }),
				charliePage.waitForURL(`/game/${roomCode}/esp/bluepost`, { timeout: 10000 }),
				gracePage.waitForURL(`/game/${roomCode}/destination/zmail`, { timeout: 10000 }),
				page.waitForURL(`/game/${roomCode}/facilitator`, { timeout: 10000 })
			]);

			const endTime = Date.now();
			const duration = endTime - startTime;

			// Then - Should complete within reasonable time
			// Increased to 3s for CI environment tolerance (from 2s)
			expect(duration).toBeLessThan(3000);

			await closePages(page, alicePage, bobPage, charliePage, gracePage);
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
			const { roomCode, alicePage, bobPage } = await createSessionWithMinimumPlayers(page, context);
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

			// Wait for dashboard to be ready (US-2.1)
			await reconnectedAlicePage.waitForFunction(
				() => (window as any).__espDashboardTest?.ready === true,
				{},
				{ timeout: 10000 }
			);

			// Then - Alice should see the game in progress (using US-2.1 dashboard testids)
			await expect(reconnectedAlicePage.locator('[data-testid="game-timer"]')).toBeVisible({
				timeout: 5000
			});

			const budgetElement = reconnectedAlicePage.locator('[data-testid="budget-current"]');
			await expect(budgetElement).toBeVisible({ timeout: 5000 });
			const budgetText = await budgetElement.textContent();
			expect(budgetText).toMatch(/1[,]?000/); // Accepts both "1000" and "1,000"

			const roundIndicator = reconnectedAlicePage.locator('[data-testid="round-indicator"]');
			await expect(roundIndicator).toBeVisible({ timeout: 5000 });
			await expect(roundIndicator).toContainText(/round.*1/i);

			await closePages(page, reconnectedAlicePage, bobPage);
			await newContext.close();
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

			await closePages(page, alicePage);
		});

		test('Given no ESP teams, When facilitator tries to start, Then error is shown', async ({
			page,
			context
		}) => {
			// Given - Only Destinations
			const roomCode = await createTestSession(page);
			const bobPage = await addPlayer(context, roomCode, 'Bob', 'Destination', 'zmail');
			await page.waitForTimeout(500);

			// Then - Start Game button should be disabled
			const startGameButton = page.getByRole('button', { name: /start game/i });
			await expect(startGameButton).toBeDisabled();

			// And - Error message should be visible
			await expect(page.locator('text=/at least.*esp/i')).toBeVisible();

			await closePages(page, bobPage);
		});
	});

	// ============================================================================
	// TIMER SYNCHRONIZATION - SERVER AUTHORITY
	// ============================================================================

	test.describe('Scenario: Server timer overrides client-side drift', () => {
		// Shared test logic for timer manipulation tests
		const testTimerCorrection = async (
			page: any,
			context: any,
			manipulatedValue: number,
			manipulatedPattern: RegExp,
			expectedNotPattern: RegExp
		) => {
			// Given - Create game in planning phase
			const { roomCode, alicePage, bobPage } = await createSessionWithMinimumPlayers(page, context);

			// Start game and wait for dashboard (condition-based, not hard timeout)
			const startGameButton = page.getByRole('button', { name: /start game/i });
			await expect(startGameButton).toBeEnabled({ timeout: 5000 });
			await startGameButton.click();

			// Wait for Alice to reach ESP dashboard
			await alicePage.waitForURL(`/game/${roomCode}/esp/sendwave`, { timeout: 10000 });

			// Wait for dashboard ready state
			await alicePage.waitForFunction(
				() => (window as any).__espDashboardTest?.ready === true,
				{},
				{ timeout: 10000 }
			);

			// Verify timer is visible and showing correct initial value
			const timerElement = alicePage.locator('[data-testid="game-timer"]');
			await expect(timerElement).toBeVisible({ timeout: 5000 });

			const initialTimerText = await timerElement.textContent();
			expect(initialTimerText).toMatch(/[4-5]:[0-9]{2}/); // Between 4:00 and 5:00

			// When - Manipulate client-side timer
			await alicePage.evaluate((value) => {
				(window as any).__espDashboardTest?.setTimerSeconds(value);
			}, manipulatedValue);

			// Wait for manipulation to take effect (condition-based)
			await expect(timerElement).toHaveText(manipulatedPattern, { timeout: 1000 });

			// Then - Wait for server correction (poll until corrected, max 15 seconds)
			// Use toPass() for condition-based polling instead of hard timeout
			await expect(async () => {
				const currentText = await timerElement.textContent();
				// Should NOT match the manipulated pattern anymore
				expect(currentText).not.toMatch(expectedNotPattern);
				// Should be back in correct range
				expect(currentText).toMatch(/[4-5]:[0-9]{2}/);
			}).toPass({ timeout: 15000, intervals: [500, 1000] });

			await closePages(page, alicePage, bobPage);
		};

		test('Given timer is running, When client sets timer to drift (100s), Then server corrects it', async ({
			page,
			context
		}) => {
			await testTimerCorrection(page, context, 100, /1:[0-9]{2}/, /1:[0-9]{2}/);
		});

		test('Given timer is running, When client sets timer to zero (0s), Then server corrects it', async ({
			page,
			context
		}) => {
			await testTimerCorrection(page, context, 0, /0:00/, /0:00/);
		});
	});
});
