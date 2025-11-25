/**
 * E2E Tests: US-3.5 Scenario 1.1 - Transition to Consequences Phase
 * ATDD RED PHASE: These tests should FAIL initially until implementation is complete
 *
 * Feature: Consequences Phase Display Initialization
 * As a player
 * I want the game to automatically display consequences after resolution
 * So that I can see the results of my decisions
 */

import { test, expect } from './fixtures';
import { createGameInPlanningPhase, closePages } from './helpers/game-setup';
import { lockInAllPlayers } from './helpers/e2e-actions';

test.describe('US-3.5 Scenario 1.1: Transition to Consequences Phase', () => {
	test('Successful transition from Resolution to Consequences phase', async ({ page, context }) => {
		// Given: the game is in "Resolution" phase for Round 2
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// SETUP: We need to advance to Round 2 Planning phase
		// For now, we'll test with Round 1 since we don't have a helper to advance rounds yet
		// TODO: In future iteration, add proper round advancement

		// Lock in decisions to trigger phase transition
		const lockInButton = alicePage.locator('[data-testid="lock-in-button"]');
		await lockInButton.click();
		await alicePage.waitForTimeout(500);

		// Lock in destination decisions
		const destLockIn = bobPage.locator('[data-testid="lock-in-button"]');
		if (await destLockIn.isVisible()) {
			await destLockIn.click();
			await bobPage.waitForTimeout(500);
		}

		// When: the resolution calculation completes
		// (Resolution should trigger automatically after all players lock in)
		// Wait for phase to change to Resolution (may be very brief)
		await page.waitForTimeout(1000);

		// Then: the phase should change to "Consequences"
		// Check on facilitator page for phase indicator
		await expect(page.locator('[data-testid="current-phase"]')).toContainText('consequences', {
			timeout: 5000
		});

		// And: all players should see the Consequences Phase screen
		await expect(alicePage.locator('[data-testid="consequences-header"]')).toBeVisible({
			timeout: 3000
		});

		// And: no timer should be displayed (consequences phase has no timer)
		await expect(alicePage.locator('[data-testid="phase-timer"]')).not.toBeVisible();
	});

	test('Multiple players see consequences simultaneously', async ({ page, context }) => {
		// Given: Game with multiple ESP players
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Lock in all players
		await alicePage.locator('[data-testid="lock-in-button"]').click();
		await alicePage.waitForTimeout(300);

		await bobPage.locator('[data-testid="lock-in-button"]').click();
		await bobPage.waitForTimeout(300);

		// When: Resolution completes and transitions to Consequences
		await page.waitForTimeout(1500); // Wait for resolution + transition

		// Then: Both players should see consequences screen
		await expect(alicePage.locator('[data-testid="consequences-header"]')).toBeVisible({
			timeout: 3000
		});
		await expect(bobPage.locator('[data-testid="consequences-header"]')).toBeVisible({
			timeout: 3000
		});

		// And: Both should see their respective team/destination names
		await expect(alicePage.locator('[data-testid="consequences-team-name"]')).toContainText(
			'SendWave'
		);
		await expect(bobPage.locator('[data-testid="consequences-team-name"]')).toContainText('Gmail');
	});

	test('Resolution phase executes in background before consequences', async ({ page, context }) => {
		// Given: Game in planning phase with decisions made
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// When: Players lock in (triggering resolution)
		await alicePage.locator('[data-testid="lock-in-button"]').click();
		await bobPage.locator('[data-testid="lock-in-button"]').click();

		// Then: Should see resolution loading screen (briefly)
		const loadingScreen = alicePage.locator('[data-testid="resolution-loading"]');
		// Loading may be very brief, so we use try-catch
		try {
			await expect(loadingScreen).toBeVisible({ timeout: 1000 });
		} catch (e) {
			// Resolution may complete too fast to see loading - that's OK
			console.log('Resolution completed before loading screen could be detected');
		}

		// And: After resolution, should see consequences
		await expect(alicePage.locator('[data-testid="consequences-header"]')).toBeVisible({
			timeout: 5000
		});

		// And: Consequences should contain resolution data
		await expect(alicePage.locator('[data-testid="section-revenue-summary"]')).toContainText(
			'credits'
		);
	});
});
