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

import { test, expect } from './fixtures';
import {
	createTestSession,
	addPlayer,
	createSessionWithMinimumPlayers,
	closePages
} from './helpers/game-setup';

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

			await closePages(page, playerPage);
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
			await expect(page.locator('text=/minimum.*required|at least.*destination/i')).toBeVisible();

			// Case 2: Add 1 Destination - button should be enabled
			const bobPage = await addPlayer(context, roomCode, 'Bob', 'Destination', 'Gmail');
			await page.waitForTimeout(500); // Wait for WebSocket update

			await expect(startGameButton).toBeEnabled();

			await closePages(page, alicePage, bobPage);
		});
	});

	// ============================================================================
	// ACCESSIBILITY
	// ============================================================================
	//
	// NOTE: Happy path tests for successful game start have been removed as they
	// are implicitly tested in 9+ other test files via helper functions like
	// createGameInPlanningPhase(). This file now focuses on:
	// - Permission checks (facilitator-only visibility)
	// - Validation logic (minimum player requirements)
	// - Accessibility attributes
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

			await closePages(page, alicePage, bobPage);
		});
	});
});
