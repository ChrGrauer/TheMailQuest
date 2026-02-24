/**
 * E2E Tests: US-8.2-0.1 - Facilitator Basic Controls
 * ATDD RED PHASE: These tests should FAIL initially until implementation is complete
 *
 * Feature: Facilitator can control game flow with pause, extend timer, and end phase actions
 * As a facilitator
 * I want to pause/resume game, extend timer, end phase early, and end game early
 * So that I can animate the session effectively
 */

import { test, expect } from './fixtures';
import { createGameInPlanningPhase, closePages } from './helpers/game-setup';
import { lockInAllPlayers } from './helpers/e2e-actions';
import { purchaseTechUpgrade } from './helpers/client-management';
import type { Locator } from '@playwright/test';

// ============================================================================
// Buttons visibility
// ============================================================================
test.describe('Facilitator button visibility', () => {
	test('Pause, Extend Timer, End Phase buttons visible ONLY during planning phase, End Game Early button visible only during consequences', async ({
		page,
		context
	}) => {
		// Given: the game is in round 1, planning phase
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// When: the facilitator views the facilitator dashboard (page auto-navigates)
		// Then: the "Pause Game" button should be visible
		const pauseButton = page.locator('[data-testid="pause-game-button"]');
		await expect(pauseButton).toBeVisible();
		// And: button should show "Pause Game" text
		await expect(pauseButton).toContainText('Pause');

		// And: the "Extend Timer" button should be visible
		const extendButton = page.locator('[data-testid="extend-timer-button"]');
		await expect(extendButton).toBeVisible();

		// And: the "End Current Phase" button should be visible
		const endPhaseButton = page.locator('[data-testid="end-phase-button"]');
		await expect(endPhaseButton).toBeVisible();

		// And: End Game Early should NOT be visible during planning
		const endGameButton = page.locator('[data-testid="end-game-early-button"]');
		await expect(endGameButton).not.toBeVisible();

		// When: all players lock in and game transitions to consequences
		await lockInAllPlayers([alicePage, bobPage]);

		// Then: the "Pause Game" button should NOT be visible
		await expect(pauseButton).not.toBeVisible();
		// Then: the "Extend Timer" button should NOT be visible
		await expect(extendButton).not.toBeVisible();
		// Then: the "End Current Phase" button should NOT be visible
		await expect(endPhaseButton).not.toBeVisible();
		// Then: End Game Early should be visible during consequences
		await expect(endGameButton).toBeVisible();

		await closePages(page, alicePage, bobPage);
	});
});

// ============================================================================
// Pause/Resume Game Tests
// ============================================================================

test.describe('Pause/Resume Game', () => {
	test('Clicking Pause stops timer countdown and shows Paused indicator to all participants, clicking Resume restart the timer', async ({
		page,
		context
	}) => {
		// Given: the game is in round 1, planning phase
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Get initial timer value
		const timer = page.locator('[data-testid="game-timer"]');
		const initialTimerText = await timer.textContent();

		// When: the facilitator clicks "Pause Game" button
		const pauseButton = page.locator('[data-testid="pause-game-button"]');
		await pauseButton.click();
		await page.waitForTimeout(500);

		// Then: the timer should stop counting down (verify after 2 seconds)
		const timerAfterPause = await timer.textContent();
		await page.waitForTimeout(2000);
		const timerAfter2Seconds = await timer.textContent();

		// Timer value should be the same (or very close - accounting for the moment of capture)
		expect(timerAfterPause).toBe(timerAfter2Seconds);

		// And: the button should change to "Resume Game"
		const resumeButton = page.locator('[data-testid="resume-game-button"]');
		await expect(resumeButton).toBeVisible();
		await expect(resumeButton).toContainText('Resume');

		// And: pause button should NOT be visible
		await expect(pauseButton).not.toBeVisible();

		// And: ESP player should see "Game Paused" indicator
		const alicePausedBanner = alicePage.locator('[data-testid="game-paused-banner"]');
		await expect(alicePausedBanner).toBeVisible({ timeout: 3000 });

		// And: Destination player should see "Game Paused" indicator
		const bobPausedBanner = bobPage.locator('[data-testid="game-paused-banner"]');
		await expect(bobPausedBanner).toBeVisible({ timeout: 3000 });

		// When: the facilitator clicks "Resume Game" button
		await resumeButton.click();
		await page.waitForTimeout(500);

		// Then: the "Resume Game" button should change back to "Pause Game"
		await expect(resumeButton).not.toBeVisible();
		await expect(pauseButton).toBeVisible();

		// And: players should NOT see "Game Paused" indicator
		await expect(alicePausedBanner).not.toBeVisible();

		await closePages(page, alicePage, bobPage);
	});

	test('Players can still interact with dashboard while game is paused', async ({
		page,
		context
	}) => {
		// Given: the game is paused
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		const pauseButton = page.locator('[data-testid="pause-game-button"]');
		await pauseButton.click();
		await page.waitForTimeout(500);

		// When: ESP player attempts to purchase technical upgrade "spf" via API
		const result = await purchaseTechUpgrade(alicePage, roomCode, 'SendWave', 'spf');

		// Then: the purchase should succeed
		expect(result.success).toBe(true);

		// And: ESP should own technical upgrade "spf" (verify via dashboard)
		await alicePage.waitForTimeout(500);
		const techInfra = alicePage.locator('[data-testid="technical-infrastructure"]');
		await expect(techInfra).toContainText('SPF');

		await closePages(page, alicePage, bobPage);
	});
});

// ============================================================================
// Extend Timer Tests
// ============================================================================

test.describe('Extend Timer', () => {
	test('Multiple Extend Timer clicks accumulate', async ({ page, context }) => {
		// Given: the game is in round 1, planning phase
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Wait for timer to tick down
		await page.waitForTimeout(2000);

		const extendButton = page.locator('[data-testid="extend-timer-button"]');

		// When: facilitator clicks extend 3 times
		await extendButton.click();
		await page.waitForTimeout(500);
		await extendButton.click();
		await page.waitForTimeout(500);
		await extendButton.click();
		await page.waitForTimeout(500);

		// Then: timer should show approximately 180 seconds more than when we started clicking
		// After 2s elapsed from 300s = 298s remaining
		// After 3 extensions = 298 + 180 = 478s = ~7:58
		const timer = page.locator('[data-testid="game-timer"]');
		const timerText = await timer.textContent();

		// Timer should be above 7 minutes 50 seconds
		const totalSeconds = await getTotalSecond(timer);
		expect(totalSeconds).toBeGreaterThan(470);

		await closePages(page, alicePage, bobPage);
	});
});

// ============================================================================
// End Current Phase Tests
// ============================================================================

test.describe('End Current Phase', () => {
	test('Cancel on confirmation dialog keeps phase unchanged', async ({ page, context }) => {
		// Given: the game is in round 1, planning phase
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// When: the facilitator clicks "End Current Phase"
		const endPhaseButton = page.locator('[data-testid="end-phase-button"]');
		await endPhaseButton.click();
		await page.waitForTimeout(500);
		// Then: a confirmation dialog should appear
		const dialog = page.locator('[data-testid="confirmation-dialog"]');
		await expect(dialog).toBeVisible();

		// And: the dialog should display appropriate message
		await expect(dialog).toContainText('Are you sure');
		await expect(dialog).toContainText('planning phase');

		// When: facilitator clicks on Cancel
		const cancelButton = page.locator('[data-testid="cancel-button"]');
		await cancelButton.click();
		await page.waitForTimeout(500);

		// Then: the dialog should close
		await expect(dialog).not.toBeVisible();

		// And: the current phase should still be "planning"
		await expect(page.locator('[data-testid="current-phase"]')).toContainText('planning');

		await closePages(page, alicePage, bobPage);
	});

	test('Confirm on dialog triggers resolution phase transition and End phase applies auto-lock to unlocked players', async ({
		page,
		context
	}) => {
		// Given: the game is in planning phase
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// And: only Alice has locked in (Bob has NOT locked in)
		const aliceLockIn = alicePage.locator('[data-testid="lock-in-button"]');
		await aliceLockIn.click();
		await page.waitForTimeout(500);

		// When: the facilitator ends the phase early
		const endPhaseButton = page.locator('[data-testid="end-phase-button"]');
		await endPhaseButton.click();
		await page.waitForTimeout(500);

		const confirmButton = page.locator('[data-testid="confirm-button"]');
		await confirmButton.click();
		await page.waitForTimeout(2000);

		// Then: the game should transition to consequences phase (through resolution)
		await expect(page.locator('[data-testid="current-phase"]')).toContainText(
			'Consequences Phase',
			{
				timeout: 5000
			}
		);

		// Then: Bob should be auto-locked and see consequences
		await expect(bobPage.locator('[data-testid="consequences-header"]')).toBeVisible({
			timeout: 5000
		});

		await closePages(page, alicePage, bobPage);
	});
});

// ============================================================================
// End Game Early Tests
// ============================================================================

test.describe('End Game Early', () => {
	test('End Game Early button NOT visible during Round 4 consequences', async ({
		page,
		context
	}) => {
		// Given: the game is in Round 4 consequences
		const { createGameInRound4Consequences } = await import('./helpers/phase-transitions');
		const { alicePage, bobPage } = await createGameInRound4Consequences(page, context);

		// Then: End Game Early should NOT be visible
		const endGameButton = page.locator('[data-testid="end-game-early-button"]');
		await expect(endGameButton).not.toBeVisible();

		// And: Calculate Final Scores should be visible instead
		const calculateButton = page.locator('[data-testid="calculate-final-scores-button"]');
		await expect(calculateButton).toBeVisible();

		await closePages(page, alicePage, bobPage);
	});

	test('Confirm End Game Early calculates final scores and shows victory', async ({
		page,
		context
	}) => {
		// Given: the game is in consequences phase
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);
		await lockInAllPlayers([alicePage, bobPage]);

		// When: the facilitator confirms End Game Early
		const endGameButton = page.locator('[data-testid="end-game-early-button"]');
		await endGameButton.click();
		await page.waitForTimeout(500);

		// Then: a confirmation dialog should appear with warning
		const dialog = page.locator('[data-testid="confirmation-dialog"]');
		await expect(dialog).toBeVisible();
		await expect(dialog).toContainText('end the game early');
		await expect(dialog).toContainText('final scores');

		// When: facilitator clicks on Confirm
		const confirmButton = page.locator('[data-testid="confirm-button"]');
		await confirmButton.click();
		await page.waitForTimeout(2000);

		// Then: the game should transition to "finished" phase
		await expect(page.locator('[data-testid="current-phase"]')).toContainText('finished', {
			timeout: 5000
		});

		// And: all players should see the victory screen
		await expect(alicePage.locator('[data-testid="victory-screen"]')).toBeVisible({
			timeout: 5000
		});
		await expect(bobPage.locator('[data-testid="victory-screen"]')).toBeVisible({
			timeout: 5000
		});

		await closePages(page, alicePage, bobPage);
	});
});

// Helper function to get the remaining time in seconds
async function getTotalSecond(timer: Locator) {
	const timerText = await timer.textContent();
	// Parse timer (format: "M:SS" or "MM:SS")
	const match = timerText?.match(/(\d+):(\d+)/);
	const minutes = parseInt(match?.[1] || '0');
	const seconds = parseInt(match?.[2] || '0');
	const totalSeconds = minutes * 60 + seconds;
	return totalSeconds;
}
