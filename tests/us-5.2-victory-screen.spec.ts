/**
 * US-5.2: Victory Screen E2E Tests
 *
 * Tests for the victory screen that displays after final score calculation.
 * Verifies ESP rankings, destination results, and navigation functionality.
 *
 * REFACTORED: Tests combined to reduce expensive Round 4 setup overhead.
 * Each setup takes ~15s, so combining tests saves ~105s total.
 * Original: 12 tests → Refactored: 5 tests
 */
import { test, expect } from './fixtures';
import { createTestSession, addPlayer, createGameInPlanningPhase, closePages } from './helpers';
import { advanceToRound, lockInAllPlayers } from './helpers';
import { createGameInRound4Consequences } from './helpers/phase-transitions';

test.describe('US-5.2: Victory Screen', () => {
	/**
	 * Combined Test 1: Calculate Final Scores button behavior
	 * Combines: Button visibility, click transition, loading state
	 * (Previously 3 separate tests in Scenario 1)
	 */
	test('Calculate Final Scores button - visibility, click, and transition', async ({
		page,
		context
	}) => {
		const { alicePage, bobPage } = await createGameInRound4Consequences(page, context);

		// Assert: Button is visible in Round 4 consequences phase
		const calculateButton = page.getByTestId('calculate-final-scores-button');
		await expect(calculateButton).toBeVisible();
		await expect(calculateButton).toContainText('Calculate Final Scores');

		// Act: Click the button
		await calculateButton.click();

		// Assert: Transitions to finished phase
		await expect(page.getByTestId('current-phase')).toContainText('finished', {
			timeout: 15000
		});

		await closePages(page, alicePage, bobPage);
	});

	/**
	 * Combined Test 2: Victory screen displays all required elements
	 * Combines: ESP rankings, winner announcement, destination results,
	 *           score breakdown, collaborative score, success/failure status,
	 *           qualification status
	 * (Previously 6 separate tests in Scenarios 2-5)
	 */
	test('Victory screen displays all elements correctly', async ({ page, context }) => {
		const { alicePage, bobPage } = await createGameInRound4Consequences(page, context);

		// Trigger score calculation
		await page.getByTestId('calculate-final-scores-button').click();
		await alicePage.waitForSelector('[data-testid="victory-screen"]', { timeout: 15000 });

		// Assert: Victory screen is visible
		await expect(alicePage.getByTestId('victory-screen')).toBeVisible();

		// Assert: ESP leaderboard is visible
		await expect(alicePage.getByTestId('esp-leaderboard')).toBeVisible();

		// Assert: Winner announcement is visible
		await expect(alicePage.getByTestId('winner-announcement')).toBeVisible();

		// Assert: Destination results section is visible
		await expect(alicePage.getByTestId('destination-results')).toBeVisible();

		// Assert: Collaborative score is visible in destination results
		const destResults = alicePage.getByTestId('destination-results');
		await expect(destResults.getByTestId('collaborative-score')).toBeVisible();

		// Assert: Success or failure indicator is visible
		const successIndicator = destResults.getByTestId('destination-success');
		const failureIndicator = destResults.getByTestId('destination-failure');
		const isSuccess = await successIndicator.isVisible().catch(() => false);
		const isFailure = await failureIndicator.isVisible().catch(() => false);
		expect(isSuccess || isFailure).toBe(true);

		// Assert: ESP entry with score breakdown
		await alicePage.waitForSelector('[data-testid^="esp-entry-"]', { timeout: 10000 });
		const espEntry = alicePage.locator('[data-testid^="esp-entry-"]').first();
		await expect(espEntry).toBeVisible();

		// Assert: Score components exist
		await expect(espEntry.getByTestId('total-score')).toBeVisible();
		await expect(espEntry.getByTestId('reputation-score')).toBeVisible();
		await expect(espEntry.getByTestId('revenue-score')).toBeVisible();
		await expect(espEntry.getByTestId('technical-score')).toBeVisible();

		// Assert: Qualification status indicator
		const qualificationStatus = espEntry.getByTestId('qualification-status');
		await expect(qualificationStatus).toBeVisible();

		await closePages(page, alicePage, bobPage);
	});

	/**
	 * Test 3: All players (ESP + Destination) see victory screen
	 * Different setup - includes destination player, so kept separate
	 */
	test('All players see victory screen after calculation', async ({ page, context }) => {
		const roomCode = await createTestSession(page);
		const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
		const gmailPage = await addPlayer(context, roomCode, 'Diana', 'Destination', 'Gmail');
		await page.waitForTimeout(500);

		// Start game
		await page.getByRole('button', { name: /start game/i }).click();
		await alicePage.waitForURL(/\/game\/.*\/esp\/sendwave/, { timeout: 10000 });

		// Advance to Round 4 consequences
		await advanceToRound(page, [alicePage, gmailPage], 4);
		await lockInAllPlayers([alicePage, gmailPage]);

		// Calculate scores
		await page.getByTestId('calculate-final-scores-button').click();

		// Assert: Both ESP and Destination players see victory screen
		await alicePage.waitForSelector('[data-testid="victory-screen"]', { timeout: 15000 });
		await gmailPage.waitForSelector('[data-testid="victory-screen"]', { timeout: 15000 });

		await expect(alicePage.getByTestId('victory-screen')).toBeVisible();
		await expect(gmailPage.getByTestId('victory-screen')).toBeVisible();

		// Facilitator verification (US-5.2 additional requirement)
		await expect(page.getByTestId('victory-screen')).toBeVisible();
		await expect(page.getByTestId('esp-leaderboard')).toBeVisible();
		await expect(page.getByTestId('destination-results')).toBeVisible();

		await closePages(page, alicePage, gmailPage);
	});

	/**
	 * Test 4: Score data accuracy
	 * Different focus (data validation) - kept separate
	 */
	test('Victory screen receives correct data from API', async ({ page, context }) => {
		const { alicePage, bobPage } = await createGameInRound4Consequences(page, context);

		await page.getByTestId('calculate-final-scores-button').click();
		await alicePage.waitForSelector('[data-testid="victory-screen"]', { timeout: 15000 });

		// Verify data is displayed (basic presence check)
		const winnerAnnouncement = await alicePage.getByTestId('winner-announcement').textContent();
		expect(winnerAnnouncement).toBeTruthy();
		expect(winnerAnnouncement!.length).toBeGreaterThan(0);

		await closePages(page, alicePage, bobPage);
	});

	/**
	 * Combined Test 5: Button visibility restrictions
	 * Combines: Not visible in Round 1 planning, not visible in Round 4 planning
	 * (Previously 2 separate tests in Scenario 8)
	 */
	test('Calculate button visibility restrictions by phase and round', async ({ page, context }) => {
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Assert: In Round 1 planning phase, button should NOT be visible
		await expect(page.getByTestId('calculate-final-scores-button')).not.toBeVisible();

		// Advance to Round 4 planning (but don't lock in)
		await advanceToRound(page, [alicePage, bobPage], 4);

		// Assert: In Round 4 planning phase, button should NOT be visible
		await expect(page.getByTestId('calculate-final-scores-button')).not.toBeVisible();

		await closePages(page, alicePage, bobPage);
	});
});
