/**
 * US-2.5: Destination Kingdom Dashboard - E2E Tests
 *
 * Tests UI/UX for Destination dashboard including:
 * - Destination-specific branding (blue theme, not ESP green)
 * - ESP traffic statistics display
 * - Reputation, satisfaction, and spam rate color coding
 * - Coordination status display
 * - Technical infrastructure status
 * - Multi-player data isolation
 * - UI layout and responsiveness
 * - Accessibility
 * - Error handling
 *
 * Uses Playwright for end-to-end testing
 *
 * NOTE: Fixtures available in ./fixtures.ts can simplify test setup:
 * - destinationGame: Game with destination player and ESP players
 * - planningPhase: Game with 2 ESP players in planning phase
 * - minimumPlayers: Session with 3 ESP players
 * - gameSession: Basic session with facilitator
 *
 * Example usage:
 *   import { test, expect } from './fixtures';
 *   test('my test', async ({ destinationGame }) => {
 *     const { gmailPage, alicePage, bobPage, roomCode } = destinationGame;
 *     // Test logic...
 *   });
 */

import { test, expect } from './fixtures';
import {
	createTestSession,
	addPlayer,
	createGameWithDestinationPlayer,
	createGameInSecondRound,
	closePages
} from './helpers/game-setup';

// ============================================================================
// TESTS
// ============================================================================

// NOTE: Streamlined test file - removed redundant tests
// Setup validation (dashboard loading, basic visibility) is tested by helpers:
// - createGameWithDestinationPlayer() already validates game setup and dashboard access
// - Generic WebSocket sync tests moved to dedicated WebSocket test file
// This file focuses on Destination Dashboard-specific business logic and calculations

test.describe('Feature: Destination Kingdom Dashboard', () => {
	// Increase timeout for all tests in this suite due to parallel execution resource contention
	test.setTimeout(20000);

	// ============================================================================
	// SECTION 2: ESP TRAFFIC STATISTICS DISPLAY
	// ============================================================================

	test.describe('ESP Statistics Display', () => {
		test('Scenario: ESP with zero volume displays correctly', async ({ page, context }) => {
			// Given: I am viewing the Destination dashboard
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// And: an ESP team has 0 active clients and 0 volume
			// Simulate this via test API
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.setESPStats([
					{
						espName: 'SendWave',
						teamCode: 'SW',
						activeClientsCount: 0,
						volume: '0',
						volumeRaw: 0,
						reputation: 70,
						userSatisfaction: 70,
						spamComplaintRate: 0,
						spamComplaintVolume: 0
					}
				]);
			});

			// When: I view the ESP Statistics Overview
			const espCard = gmailPage.locator('[data-testid="esp-card-sendwave"]');
			await expect(espCard).toBeVisible({ timeout: 2000 });

			// Then: "SendWave" should still appear in the list
			const teamName = espCard.locator('[data-testid="esp-team-name"]');
			await expect(teamName).toContainText('SendWave');

			// And: the volume should display as "0"
			const volume = espCard.locator('[data-testid="esp-volume"]');
			await expect(volume).toContainText('0');

			// And: all other statistics should display their current values
			const reputation = espCard.locator('[data-testid="esp-reputation"]');
			await expect(reputation).toContainText('70');

			await closePages(page, gmailPage);
			await closePages(page, alicePage, bobPage);
		});
	});

	// ============================================================================
	// SECTION 3: REPUTATION & METRICS COLOR CODING
	// ============================================================================

	test.describe('Reputation & Metrics Color Coding', () => {
		// Parameterized test for reputation color coding thresholds
		const reputationThresholds = [
			{ value: 95, expectedStatus: 'excellent', description: 'excellent (≥90)' },
			{ value: 78, expectedStatus: 'good', description: 'good (70-89)' },
			{ value: 58, expectedStatus: 'warning', description: 'warning (50-69)' },
			{ value: 45, expectedStatus: 'poor', description: 'poor (<50)' }
		];

		for (const threshold of reputationThresholds) {
			test(`Scenario: Reputation scores display ${threshold.description} color coding`, async ({
				page,
				context
			}) => {
				const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
					page,
					context
				);

				// When: ESP has reputation at threshold value
				await gmailPage.evaluate((rep) => {
					const spamRate = rep >= 90 ? 0.01 : rep >= 70 ? 0.04 : rep >= 50 ? 0.08 : 0.2;
					const spamVolume = Math.floor(185000 * spamRate);

					(window as any).__destinationDashboardTest.setESPStats([
						{
							espName: 'SendWave',
							teamCode: 'SW',
							activeClientsCount: 4,
							volume: '185K',
							volumeRaw: 185000,
							reputation: rep,
							userSatisfaction: rep,
							spamComplaintRate: spamRate,
							spamComplaintVolume: spamVolume
						}
					]);
				}, threshold.value);

				// Then: reputation should display correct status (wait for DOM update)
				const espCard = gmailPage.locator('[data-testid="esp-card-sendwave"]');
				await expect(espCard).toBeVisible({ timeout: 2000 });

				const reputation = espCard.locator('[data-testid="esp-reputation"]');
				await expect(reputation).toContainText(String(threshold.value), { timeout: 2000 });

				const repStatus = await reputation.getAttribute('data-status');
				expect(repStatus).toBe(threshold.expectedStatus);

				// Verify color styling is applied (for excellent status)
				if (threshold.expectedStatus === 'excellent') {
					const repStyles = await reputation.evaluate((el) => {
						const styles = window.getComputedStyle(el);
						return styles.color;
					});
					// Tailwind v4 uses oklch format, just verify color is set (not default black)
					expect(repStyles).not.toBe('rgb(0, 0, 0)');
					expect(repStyles).not.toBe('rgba(0, 0, 0, 1)');
				}

				await closePages(page, gmailPage, alicePage, bobPage);
			});
		}

		test('Scenario: Spam complaint rates display with correct color coding', async ({
			page,
			context
		}) => {
			const { alicePage, bobPage, gmailPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			const espCard = gmailPage.locator('[data-testid="esp-card-sendwave"]');
			const spamRate = espCard.locator('[data-testid="esp-spam-rate"]');

			// Test low spam rate (<0.05%)
			await gmailPage.evaluate(() => {
				const volumeRaw = 185000;
				const rate = 0.04;
				(window as any).__destinationDashboardTest.setESPStats([
					{
						espName: 'SendWave',
						teamCode: 'SW',
						activeClientsCount: 4,
						volume: '185K',
						volumeRaw: volumeRaw,
						reputation: 85,
						userSatisfaction: 85,
						spamComplaintRate: rate,
						spamComplaintVolume: Math.floor(volumeRaw * rate)
					}
				]);
			});

			// Wait for DOM update
			await expect(espCard).toBeVisible({ timeout: 2000 });
			await expect(spamRate).toHaveAttribute('data-status', 'low', { timeout: 2000 });

			// Test medium spam rate (0.05-0.15%)
			await gmailPage.evaluate(() => {
				const volumeRaw = 185000;
				const rate = 0.1;
				(window as any).__destinationDashboardTest.setESPStats([
					{
						espName: 'SendWave',
						teamCode: 'SW',
						activeClientsCount: 4,
						volume: '185K',
						volumeRaw: volumeRaw,
						reputation: 70,
						userSatisfaction: 70,
						spamComplaintRate: rate,
						spamComplaintVolume: Math.floor(volumeRaw * rate)
					}
				]);
			});

			// Wait for DOM update
			await expect(spamRate).toHaveAttribute('data-status', 'medium', { timeout: 2000 });

			// Test high spam rate (≥0.15%)
			await gmailPage.evaluate(() => {
				const volumeRaw = 185000;
				const rate = 0.28;
				(window as any).__destinationDashboardTest.setESPStats([
					{
						espName: 'SendWave',
						teamCode: 'SW',
						activeClientsCount: 4,
						volume: '185K',
						volumeRaw: volumeRaw,
						reputation: 52,
						userSatisfaction: 52,
						spamComplaintRate: rate,
						spamComplaintVolume: Math.floor(volumeRaw * rate)
					}
				]);
			});

			// Wait for DOM update
			await expect(spamRate).toHaveAttribute('data-status', 'high', { timeout: 2000 });

			await closePages(page, gmailPage);
			await closePages(page, alicePage, bobPage);
		});
	});

	// ============================================================================
	// SECTION 6: MULTI-PLAYER & DATA ISOLATION
	// ============================================================================

	test.describe('Multi-Player Data Isolation', () => {
		test('Scenario: Each destination player sees only their own data', async ({
			page,
			context
		}) => {
			// Given: multiple Destination players are viewing their dashboards
			const roomCode = await createTestSession(page);
			const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
			const gmailPage = await addPlayer(context, roomCode, 'Bob', 'Destination', 'Gmail');
			const outlookPage = await addPlayer(context, roomCode, 'Carol', 'Destination', 'Outlook');
			await page.waitForTimeout(500);

			// Start game
			const startGameButton = page.getByRole('button', { name: /start game/i });
			await startGameButton.click();

			await gmailPage.waitForURL(`/game/${roomCode}/destination/gmail`, { timeout: 10000 });
			await outlookPage.waitForURL(`/game/${roomCode}/destination/outlook`, {
				timeout: 10000
			});

			// Wait for dashboards to load
			await gmailPage.waitForFunction(
				() => (window as any).__destinationDashboardTest?.ready === true,
				{},
				{ timeout: 10000 }
			);
			await outlookPage.waitForFunction(
				() => (window as any).__destinationDashboardTest?.ready === true,
				{},
				{ timeout: 10000 }
			);

			// When: each player views their dashboard
			// Then: each should see only their own data

			// Gmail sees "Gmail"
			const gmailName = gmailPage.locator('[data-testid="destination-name"]');
			await expect(gmailName).toHaveText('Gmail');

			// Outlook sees "Outlook"
			const outlookName = outlookPage.locator('[data-testid="destination-name"]');
			await expect(outlookName).toHaveText('Outlook');

			// Budgets should be different (per game configuration)
			const gmailBudget = await gmailPage.locator('[data-testid="budget-current"]').textContent();
			const outlookBudget = await outlookPage
				.locator('[data-testid="budget-current"]')
				.textContent();

			// Gmail (50%) gets more budget than Outlook (30%)
			// This will depend on game configuration, but they should be different
			expect(gmailBudget).not.toBe(outlookBudget);

			await closePages(page, gmailPage, outlookPage, alicePage);
		});
	});

	// ============================================================================
	// SECTION 8: ACCESSIBILITY
	// ============================================================================

	test.describe('Accessibility', () => {
		test('Scenario: Color-coding is accessible to color-blind users', async ({ page, context }) => {
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// Set ESP with excellent reputation
			await gmailPage.evaluate(() => {
				const volumeRaw = 185000;
				const rate = 0.01;
				(window as any).__destinationDashboardTest.setESPStats([
					{
						espName: 'SendWave',
						teamCode: 'SW',
						activeClientsCount: 4,
						volume: '185K',
						volumeRaw: volumeRaw,
						reputation: 95,
						userSatisfaction: 95,
						spamComplaintRate: rate,
						spamComplaintVolume: Math.floor(volumeRaw * rate)
					}
				]);
			});

			// Then: each status should also use icons (wait for DOM update)
			const espCard = gmailPage.locator('[data-testid="esp-card-sendwave"]');
			await expect(espCard).toBeVisible({ timeout: 2000 });

			// Check for icon (checkmark for excellent) - there are multiple excellent icons (rep + satisfaction)
			// So we'll just check that at least one exists
			const icons = espCard.locator('[data-testid^="status-icon-"]');
			await expect(icons.first()).toBeVisible({ timeout: 2000 });
			const iconText = await icons.first().textContent();
			expect(iconText).toMatch(/[✓✕⚠!👍]/); // Should have an icon

			await closePages(page, gmailPage);
			await closePages(page, alicePage, bobPage);
		});
	});

	// ============================================================================
	// SECTION 9: ERROR HANDLING
	// ============================================================================

	test.describe('Error Handling', () => {
		test('Scenario: Dashboard handles errors gracefully with banner', async ({ page, context }) => {
			// Given: I am viewing the Destination dashboard
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// When: an error occurs
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.setError('Failed to load ESP statistics');
			});

			// Then: an error banner should appear at the top (wait for DOM update)
			const errorBanner = gmailPage.locator('[data-testid="error-banner"]');
			await expect(errorBanner).toBeVisible({ timeout: 2000 });
			await expect(errorBanner).toContainText('Failed to load ESP statistics');

			// And: the dashboard should remain functional (non-blocking)
			const espSection = gmailPage.locator('[data-testid="esp-statistics-overview"]');
			await expect(espSection).toBeVisible();

			// And: user can dismiss the error
			const dismissButton = errorBanner.locator('button');
			await dismissButton.click();
			await expect(errorBanner).not.toBeVisible({ timeout: 2000 });

			await closePages(page, gmailPage);
			await closePages(page, alicePage, bobPage);
		});
	});

	// ============================================================================
	// SECTION: PHASE 4.1.1 - ROUND 1 SPAM COMPLAINTS DISPLAY
	// ============================================================================

	test.describe('Phase 4.1.1: Round 1 Spam Complaints Display', () => {
		test('Round 1 ESP statistics should show spam complaints as "-"', async ({ page, context }) => {
			// Given: I am a destination player in Round 1
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// When: I view the ESP Statistics Overview
			const espOverview = gmailPage.locator('[data-testid="esp-statistics-overview"]');
			await expect(espOverview).toBeVisible({ timeout: 5000 });

			// Then: Spam complaints for all ESPs should show '-' (not numeric data)
			// Because Round 1 has no previous round data to compare
			const espCards = gmailPage.locator('[data-testid^="esp-card-"]');
			const cardCount = await espCards.count();
			expect(cardCount).toBeGreaterThan(0);

			// Check first ESP card
			const firstCard = espCards.first();
			const spamRateElement = firstCard.locator('[data-testid="esp-spam-rate"]');
			await expect(spamRateElement).toBeVisible();

			const spamRateText = await spamRateElement.textContent();
			// Should show '-' or similar placeholder (not a percentage or number)
			expect(spamRateText?.trim()).toBe('-');

			await closePages(page, gmailPage);
			await closePages(page, alicePage, bobPage);
		});

		test('Round 2+ ESP statistics should show actual spam complaint rates', async ({
			page,
			context
		}) => {
			// Given: I am a destination player in Round 2
			const { facilitatorPage, alicePage, gmailPage } = await createGameInSecondRound(
				page,
				context
			);

			// Check ESP Statistics Overview
			const espOverview = gmailPage.locator('[data-testid="esp-statistics-overview"]');
			await expect(espOverview).toBeVisible({ timeout: 5000 });

			const espCards = gmailPage.locator('[data-testid^="esp-card-"]');
			const firstCard = espCards.first();
			const spamRateElement = firstCard.locator('[data-testid="esp-spam-rate"]');
			await expect(spamRateElement).toBeVisible();

			const spamRateText = await spamRateElement.textContent();
			// Should NOT show '-', should show percentage or numeric value
			expect(spamRateText?.trim()).not.toBe('-');
			// Should contain either a percentage sign or numeric data
			expect(spamRateText).toMatch(/\d+|%/);

			await closePages(facilitatorPage, alicePage, gmailPage);
		});
	});
});
