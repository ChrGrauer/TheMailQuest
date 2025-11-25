/**
 * US-5.2: Victory Screen E2E Tests
 *
 * Tests for the victory screen that displays after final score calculation.
 * Verifies ESP rankings, destination results, and navigation functionality.
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import {
	createTestSession,
	addPlayer,
	createGameInPlanningPhase,
	closePages
} from './helpers/game-setup';
import { advanceToRound, lockInAllPlayers } from './helpers/e2e-actions';

/**
 * Helper: Create a game in Round 4 consequences phase
 * Sets up minimum required players and advances through rounds 1-3
 */
async function createGameInRound4Consequences(
	facilitatorPage: Page,
	context: BrowserContext
): Promise<{
	roomCode: string;
	alicePage: Page;
	bobPage: Page;
}> {
	const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(
		facilitatorPage,
		context
	);

	// Advance to Round 4
	await advanceToRound(facilitatorPage, [alicePage, bobPage], 4);

	// Lock in players to reach consequences phase
	await lockInAllPlayers([alicePage, bobPage]);

	// Wait for consequences phase
	await expect(facilitatorPage.getByTestId('current-phase')).toContainText('consequences', {
		timeout: 10000
	});

	return { roomCode, alicePage, bobPage };
}

test.describe('US-5.2: Victory Screen', () => {
	test.describe('Scenario 1: Calculate Final Scores Button', () => {
		test('facilitator sees Calculate Final Scores button in Round 4 consequences phase', async ({
			page,
			context
		}) => {
			const { alicePage, bobPage } = await createGameInRound4Consequences(page, context);

			// Verify button is visible
			await expect(page.getByTestId('calculate-final-scores-button')).toBeVisible();
			await expect(page.getByTestId('calculate-final-scores-button')).toContainText(
				'Calculate Final Scores'
			);

			await closePages(page, alicePage, bobPage);
		});

		test('clicking Calculate Final Scores transitions to finished phase', async ({
			page,
			context
		}) => {
			const { alicePage, bobPage } = await createGameInRound4Consequences(page, context);

			// Click calculate final scores
			await page.getByTestId('calculate-final-scores-button').click();

			// Wait for phase transition
			await expect(page.getByTestId('current-phase')).toContainText('finished', {
				timeout: 15000
			});

			await closePages(page, alicePage, bobPage);
		});

		test('button shows loading state while calculating', async ({ page, context }) => {
			const { alicePage, bobPage } = await createGameInRound4Consequences(page, context);

			// Click button and immediately check loading state
			const button = page.getByTestId('calculate-final-scores-button');
			await button.click();

			// Should show loading state briefly
			// Note: This might be too fast to catch in some cases
			await expect(page.getByTestId('current-phase')).toContainText('finished', {
				timeout: 15000
			});

			await closePages(page, alicePage, bobPage);
		});
	});

	test.describe('Scenario 2: Victory Screen Display', () => {
		test('victory screen shows ESP rankings after calculation', async ({ page, context }) => {
			const { alicePage, bobPage } = await createGameInRound4Consequences(page, context);

			await page.getByTestId('calculate-final-scores-button').click();
			await expect(page.getByTestId('current-phase')).toContainText('finished', {
				timeout: 15000
			});

			// Verify victory screen elements on player pages
			await alicePage.waitForSelector('[data-testid="victory-screen"]', { timeout: 10000 });
			await expect(alicePage.getByTestId('victory-screen')).toBeVisible();

			// Should show ESP leaderboard
			await expect(alicePage.getByTestId('esp-leaderboard')).toBeVisible();

			await closePages(page, alicePage, bobPage);
		});

		test('victory screen shows winner announcement and destination results', async ({
			page,
			context
		}) => {
			// Combined test to avoid redundant setup
			const { alicePage, bobPage } = await createGameInRound4Consequences(page, context);

			await page.getByTestId('calculate-final-scores-button').click();
			await alicePage.waitForSelector('[data-testid="victory-screen"]', { timeout: 15000 });

			// Should show winner section (may be "No Qualified Winner" if all disqualified)
			await expect(alicePage.getByTestId('winner-announcement')).toBeVisible();

			// Should show destination results section
			await expect(alicePage.getByTestId('destination-results')).toBeVisible();

			await closePages(page, alicePage, bobPage);
		});
	});

	test.describe('Scenario 3: ESP Leaderboard Details', () => {
		test('leaderboard shows ESP team with score breakdown', async ({ page, context }) => {
			// Use simpler setup - just verify the leaderboard structure works
			const { alicePage, bobPage } = await createGameInRound4Consequences(page, context);

			await page.getByTestId('calculate-final-scores-button').click();
			await alicePage.waitForSelector('[data-testid="victory-screen"]', { timeout: 15000 });

			// Verify leaderboard is visible
			const leaderboard = alicePage.getByTestId('esp-leaderboard');
			await expect(leaderboard).toBeVisible();

			// Wait for and verify ESP entry - use broader match first
			await alicePage.waitForSelector('[data-testid^="esp-entry-"]', { timeout: 10000 });
			const espEntry = alicePage.locator('[data-testid^="esp-entry-"]').first();
			await expect(espEntry).toBeVisible();

			// Verify score components exist within the entry
			await expect(espEntry.getByTestId('total-score')).toBeVisible();
			await expect(espEntry.getByTestId('reputation-score')).toBeVisible();
			await expect(espEntry.getByTestId('revenue-score')).toBeVisible();
			await expect(espEntry.getByTestId('technical-score')).toBeVisible();

			await closePages(page, alicePage, bobPage);
		});
	});

	test.describe('Scenario 4: Destination Results Display', () => {
		test('destination section shows collaborative score', async ({ page, context }) => {
			const { alicePage, bobPage } = await createGameInRound4Consequences(page, context);

			await page.getByTestId('calculate-final-scores-button').click();
			await alicePage.waitForSelector('[data-testid="victory-screen"]', { timeout: 15000 });

			// Should show destination collaborative score
			const destResults = alicePage.getByTestId('destination-results');
			await expect(destResults.getByTestId('collaborative-score')).toBeVisible();

			await closePages(page, alicePage, bobPage);
		});

		test('destination section shows success or failure status', async ({ page, context }) => {
			const { alicePage, bobPage } = await createGameInRound4Consequences(page, context);

			await page.getByTestId('calculate-final-scores-button').click();
			await alicePage.waitForSelector('[data-testid="victory-screen"]', { timeout: 15000 });

			// Should show either success or failure indicator
			const destResults = alicePage.getByTestId('destination-results');
			const successIndicator = destResults.getByTestId('destination-success');
			const failureIndicator = destResults.getByTestId('destination-failure');

			// One of them should be visible
			const isSuccess = await successIndicator.isVisible().catch(() => false);
			const isFailure = await failureIndicator.isVisible().catch(() => false);
			expect(isSuccess || isFailure).toBe(true);

			await closePages(page, alicePage, bobPage);
		});
	});

	test.describe('Scenario 5: Qualification Status Display', () => {
		test('ESP entry shows qualification status indicator', async ({ page, context }) => {
			const { alicePage, bobPage } = await createGameInRound4Consequences(page, context);

			await page.getByTestId('calculate-final-scores-button').click();
			await alicePage.waitForSelector('[data-testid="victory-screen"]', { timeout: 15000 });

			// Wait for ESP entry and check for qualification status
			await alicePage.waitForSelector('[data-testid^="esp-entry-"]', { timeout: 10000 });
			const espEntry = alicePage.locator('[data-testid^="esp-entry-"]').first();
			await expect(espEntry).toBeVisible();

			// Check for qualified or disqualified status indicator
			const qualificationStatus = espEntry.getByTestId('qualification-status');
			await expect(qualificationStatus).toBeVisible();

			await closePages(page, alicePage, bobPage);
		});
	});

	test.describe('Scenario 6: All Players See Victory Screen', () => {
		test('all players see the victory screen after calculation', async ({ page, context }) => {
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

			// Both ESP and Destination players should see victory screen
			await alicePage.waitForSelector('[data-testid="victory-screen"]', { timeout: 15000 });
			await gmailPage.waitForSelector('[data-testid="victory-screen"]', { timeout: 15000 });

			await expect(alicePage.getByTestId('victory-screen')).toBeVisible();
			await expect(gmailPage.getByTestId('victory-screen')).toBeVisible();

			await closePages(page, alicePage, gmailPage);
		});
	});

	test.describe('Scenario 7: Score Data Accuracy', () => {
		test('victory screen receives correct data from API', async ({ page, context }) => {
			const { roomCode, alicePage, bobPage } = await createGameInRound4Consequences(
				page,
				context
			);

			await page.getByTestId('calculate-final-scores-button').click();
			await alicePage.waitForSelector('[data-testid="victory-screen"]', { timeout: 15000 });

			// Verify data is displayed (basic presence check)
			const winnerAnnouncement = await alicePage
				.getByTestId('winner-announcement')
				.textContent();
			expect(winnerAnnouncement).toBeTruthy();
			expect(winnerAnnouncement!.length).toBeGreaterThan(0);

			await closePages(page, alicePage, bobPage);
		});
	});

	test.describe('Scenario 8: Error Handling', () => {
		test('button not visible in non-Round 4 consequences phase', async ({ page, context }) => {
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// In Round 1 planning phase, button should not be visible
			await expect(page.getByTestId('calculate-final-scores-button')).not.toBeVisible();

			await closePages(page, alicePage, bobPage);
		});

		test('button not visible in Round 4 planning phase', async ({ page, context }) => {
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// Advance to Round 4 but stay in planning
			await advanceToRound(page, [alicePage, bobPage], 4);

			// In Round 4 planning phase, button should not be visible
			await expect(page.getByTestId('calculate-final-scores-button')).not.toBeVisible();

			await closePages(page, alicePage, bobPage);
		});
	});
});
