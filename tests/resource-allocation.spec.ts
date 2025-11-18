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

import { test, expect } from '@playwright/test';
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
			const bobPage = await addPlayer(context, roomCode, 'Bob', 'Destination', 'Gmail');
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
		test('Given timer is running, When client timer is manipulated, Then server corrects it via WebSocket', async ({
			page,
			context
		}) => {
			// Given - Create game in planning phase
			const { roomCode, alicePage, bobPage } = await createSessionWithMinimumPlayers(page, context);
			await page.waitForTimeout(500);

			// Start game
			const startGameButton = page.getByRole('button', { name: /start game/i });
			await startGameButton.click();

			// Wait for Alice to reach ESP dashboard
			await alicePage.waitForURL(`/game/${roomCode}/esp/sendwave`, { timeout: 10000 });
			await alicePage.waitForFunction(
				() => (window as any).__espDashboardTest?.ready === true,
				{},
				{ timeout: 10000 }
			);

			// Verify timer is visible and running (should be ~300 seconds)
			const timerElement = alicePage.locator('[data-testid="game-timer"]');
			await expect(timerElement).toBeVisible({ timeout: 5000 });

			// Get initial timer value (should be around 5:00)
			const initialTimerText = await timerElement.textContent();
			expect(initialTimerText).toMatch(/[4-5]:[0-9]{2}/); // Between 4:00 and 5:00

			// When - Manipulate client-side timer to simulate drift (set to 100 seconds = 1:40)
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest?.setTimerSeconds(100);
			});

			// Verify manipulation took effect (timer should briefly show ~1:40)
			await alicePage.waitForTimeout(50);
			let manipulatedTimerText = await timerElement.textContent();
			expect(manipulatedTimerText).toMatch(/1:[0-9]{2}/); // Should show 1:XX (around 1:40)

			// Wait for WebSocket update from server (broadcasts every 1 second)
			// Give it up to 3 seconds to receive update
			await alicePage.waitForTimeout(3000);

			// Then - Timer should be corrected by server to ~297-300 (around 4:57-5:00)
			const correctedTimerText = await timerElement.textContent();

			// Should NOT still be in 1:XX range (manipulated value)
			expect(correctedTimerText).not.toMatch(/1:[0-9]{2}/);

			// Should be back in 4:XX-5:XX range (server value)
			expect(correctedTimerText).toMatch(/[4-5]:[0-9]{2}/);

			await closePages(page, alicePage, bobPage);
		});

		test('Given timer is running, When client sets timer to 0, Then server corrects it', async ({
			page,
			context
		}) => {
			// Given - Create game in planning phase
			const { roomCode, alicePage, bobPage } = await createSessionWithMinimumPlayers(page, context);
			await page.waitForTimeout(500);

			// Start game
			const startGameButton = page.getByRole('button', { name: /start game/i });
			await startGameButton.click();

			// Wait for Alice to reach ESP dashboard
			await alicePage.waitForURL(`/game/${roomCode}/esp/sendwave`, { timeout: 10000 });
			await alicePage.waitForFunction(
				() => (window as any).__espDashboardTest?.ready === true,
				{},
				{ timeout: 10000 }
			);

			// Verify timer is visible
			const timerElement = alicePage.locator('[data-testid="game-timer"]');
			await expect(timerElement).toBeVisible({ timeout: 5000 });

			// When - Try to manipulate timer to 0 (malicious attempt to force timer expiry)
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest?.setTimerSeconds(0);
			});

			// Verify manipulation took effect
			await alicePage.waitForTimeout(100);
			let manipulatedTimerText = await timerElement.textContent();
			expect(manipulatedTimerText?.trim()).toBe('0:00');

			// Wait for WebSocket update from server
			await alicePage.waitForTimeout(3000);

			// Then - Timer should be corrected by server (NOT 0:00)
			const correctedTimerText = await timerElement.textContent();
			expect(correctedTimerText).not.toBe('0:00');

			// Should be around 4:57-5:00 (server's actual value)
			expect(correctedTimerText).toMatch(/[4-5]:[0-9]{2}/);

			await closePages(page, alicePage, bobPage);
		});
	});
});
