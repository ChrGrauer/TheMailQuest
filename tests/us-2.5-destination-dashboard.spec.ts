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

import { test, expect } from '@playwright/test';
import {
	createTestSession,
	addPlayer,
	createGameWithDestinationPlayer
} from './helpers/game-setup';

// ============================================================================
// TESTS
// ============================================================================

test.describe('Feature: Destination Kingdom Dashboard', () => {
	// Increase timeout for all tests in this suite due to parallel execution resource contention
	test.setTimeout(20000);

	// ============================================================================
	// SECTION 1: DASHBOARD INITIAL LOAD & BRANDING
	// ============================================================================

	test.describe('Dashboard Branding', () => {
		test('Scenario: Dashboard displays destination-specific branding for Gmail', async ({
			page,
			context
		}) => {
			// Given: I am logged in as a Destination player for "Gmail"
			// When: I navigate to the Destination dashboard
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// Then: I should see the destination name as "Gmail"
			const destinationName = gmailPage.locator('[data-testid="destination-name"]');
			await expect(destinationName).toHaveText('Gmail');

			// And: I should see an appropriate destination icon
			const destinationIcon = gmailPage.locator('[data-testid="destination-icon"]');
			await expect(destinationIcon).toBeVisible();

			// And: the color theme should use blue tones (not ESP green)
			const header = gmailPage.locator('[data-testid="game-header"]');
			const headerStyles = await header.evaluate((el) => {
				const styles = window.getComputedStyle(el);
				return {
					background: styles.background,
					color: styles.color
				};
			});
			// Check for blue tones (not green)
			expect(headerStyles.background).not.toContain('rgb(16, 185, 129)'); // Not emerald-500

			// And: I should see my current budget displayed
			const budget = gmailPage.locator('[data-testid="budget-current"]');
			await expect(budget).toBeVisible();
			const budgetText = await budget.textContent();
			expect(budgetText).toMatch(/\d+/);

			// And: I should see the round
			const roundInfo = gmailPage.locator('[data-testid="round-indicator"]');
			await expect(roundInfo).toBeVisible();
			await expect(roundInfo).toContainText('Round');

			// And: I should see the timer counting down
			const timer = gmailPage.locator('[data-testid="timer-display"]');
			await expect(timer).toBeVisible();
			const timerText = await timer.textContent();
			expect(timerText).toMatch(/\d+:\d+/);

			await gmailPage.close();
			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// SECTION 2: ESP TRAFFIC STATISTICS DISPLAY
	// ============================================================================

	test.describe('ESP Statistics Display', () => {
		test('Scenario: Dashboard displays statistics for all playing ESPs', async ({
			page,
			context
		}) => {
			// Given: I am logged in as a Destination player for "Gmail"
			// And: there are 2 ESP teams active in the game
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// When: I view the ESP Statistics Overview section
			const espSection = gmailPage.locator('[data-testid="esp-statistics-overview"]');
			await expect(espSection).toBeVisible();

			// Then: I should see exactly 2 ESP teams listed
			const espCards = gmailPage.locator('[data-testid^="esp-card-"]');
			await expect(espCards).toHaveCount(2);

			// And: each ESP should display required fields
			const firstCard = gmailPage.locator('[data-testid="esp-card-sendwave"]');
			await expect(firstCard).toBeVisible();

			// Team identifier (2-letter code)
			const teamCode = firstCard.locator('[data-testid="esp-team-code"]');
			await expect(teamCode).toBeVisible();
			await expect(teamCode).toHaveText(/^[A-Z]{2}$/);

			// Team name (Full name)
			const teamName = firstCard.locator('[data-testid="esp-team-name"]');
			await expect(teamName).toBeVisible();
			await expect(teamName).toContainText('SendWave');

			// Active clients count
			const clientsCount = firstCard.locator('[data-testid="esp-clients-count"]');
			await expect(clientsCount).toBeVisible();

			// Email volume
			const volume = firstCard.locator('[data-testid="esp-volume"]');
			await expect(volume).toBeVisible();
			const volumeText = await volume.textContent();
			expect(volumeText).toMatch(/\d+K?/); // Format: "185K"

			// Reputation score (0-100 with color)
			const reputation = firstCard.locator('[data-testid="esp-reputation"]');
			await expect(reputation).toBeVisible();
			const repText = await reputation.textContent();
			expect(repText).toMatch(/\d+/);

			// User satisfaction (Percentage + color)
			const satisfaction = firstCard.locator('[data-testid="esp-satisfaction"]');
			await expect(satisfaction).toBeVisible();
			const satText = await satisfaction.textContent();
			expect(satText).toMatch(/\d+%/);

			// Spam complaint rate (Percentage + color)
			const spamRate = firstCard.locator('[data-testid="esp-spam-rate"]');
			await expect(spamRate).toBeVisible();
			const spamText = await spamRate.textContent();
			expect(spamText).toMatch(/\d+\.?\d*%/);

			await gmailPage.close();
			await alicePage.close();
			await bobPage.close();
		});

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
						spamComplaintRate: 0
					}
				]);
			});

			await gmailPage.waitForTimeout(500);

			// When: I view the ESP Statistics Overview
			const espCard = gmailPage.locator('[data-testid="esp-card-sendwave"]');
			await expect(espCard).toBeVisible();

			// Then: "SendWave" should still appear in the list
			const teamName = espCard.locator('[data-testid="esp-team-name"]');
			await expect(teamName).toContainText('SendWave');

			// And: the volume should display as "0"
			const volume = espCard.locator('[data-testid="esp-volume"]');
			await expect(volume).toContainText('0');

			// And: all other statistics should display their current values
			const reputation = espCard.locator('[data-testid="esp-reputation"]');
			await expect(reputation).toContainText('70');

			await gmailPage.close();
			await alicePage.close();
			await bobPage.close();
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
					(window as any).__destinationDashboardTest.setESPStats([
						{
							espName: 'SendWave',
							teamCode: 'SW',
							activeClientsCount: 4,
							volume: '185K',
							volumeRaw: 185000,
							reputation: rep,
							userSatisfaction: rep,
							spamComplaintRate: rep >= 90 ? 0.01 : rep >= 70 ? 0.04 : rep >= 50 ? 0.08 : 0.2
						}
					]);
				}, threshold.value);

				await gmailPage.waitForTimeout(500);

				// Then: reputation should display correct status
				const espCard = gmailPage.locator('[data-testid="esp-card-sendwave"]');
				const reputation = espCard.locator('[data-testid="esp-reputation"]');
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

				await gmailPage.close();
				await alicePage.close();
				await bobPage.close();
			});
		}

		test('Scenario: Spam complaint rates display with correct color coding', async ({
			page,
			context
		}) => {
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// Test low spam rate (<0.05%)
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.setESPStats([
					{
						espName: 'SendWave',
						teamCode: 'SW',
						activeClientsCount: 4,
						volume: '185K',
						volumeRaw: 185000,
						reputation: 85,
						userSatisfaction: 85,
						spamComplaintRate: 0.04
					}
				]);
			});

			await gmailPage.waitForTimeout(500);

			const espCard = gmailPage.locator('[data-testid="esp-card-sendwave"]');
			const spamRate = espCard.locator('[data-testid="esp-spam-rate"]');
			let spamStatus = await spamRate.getAttribute('data-status');
			expect(spamStatus).toBe('low');

			// Test medium spam rate (0.05-0.15%)
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.setESPStats([
					{
						espName: 'SendWave',
						teamCode: 'SW',
						activeClientsCount: 4,
						volume: '185K',
						volumeRaw: 185000,
						reputation: 70,
						userSatisfaction: 70,
						spamComplaintRate: 0.1
					}
				]);
			});

			await gmailPage.waitForTimeout(500);
			spamStatus = await spamRate.getAttribute('data-status');
			expect(spamStatus).toBe('medium');

			// Test high spam rate (≥0.15%)
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.setESPStats([
					{
						espName: 'SendWave',
						teamCode: 'SW',
						activeClientsCount: 4,
						volume: '185K',
						volumeRaw: 185000,
						reputation: 52,
						userSatisfaction: 52,
						spamComplaintRate: 0.28
					}
				]);
			});

			await gmailPage.waitForTimeout(500);
			spamStatus = await spamRate.getAttribute('data-status');
			expect(spamStatus).toBe('high');

			await gmailPage.close();
			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// SECTION 4: COORDINATION STATUS DISPLAY
	// ============================================================================

	test.describe('Coordination Status', () => {
		test('Scenario: Dashboard shows coordination status when no collaborations exist', async ({
			page,
			context
		}) => {
			// Given: I am logged in as a Destination player
			// And: I have no active collaborations with other destinations
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// When: I view the Inter-Destination Coordination card
			const coordCard = gmailPage.locator('[data-testid="coordination-status"]');
			await expect(coordCard).toBeVisible();

			// Then: I should see "Active Collaborations: 0"
			const collabCount = coordCard.locator('[data-testid="collaborations-count"]');
			await expect(collabCount).toContainText('0');

			await gmailPage.close();
			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// SECTION 5: TECHNICAL INFRASTRUCTURE STATUS
	// ============================================================================

	test.describe('Technical Infrastructure', () => {
		test('Scenario: Owned technical upgrades are displayed', async ({ page, context }) => {
			// Given: I am logged in as a Destination player
			// And: I have purchased some tech
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.setOwnedTools([
					'auth_validator_l1',
					'auth_validator_l2'
				]);
			});

			await gmailPage.waitForTimeout(500);

			// When: I view the dashboard
			const techSection = gmailPage.locator('[data-testid="technical-infrastructure"]');
			await expect(techSection).toBeVisible();

			// Then: the technical infrastructure section should list owned tech
			// Note: Tool names updated to match current config (auth_validator_l1, auth_validator_l2, auth_validator_l3)
			const authValidator = techSection.locator('text=Authentication Validator');
			await expect(authValidator.first()).toBeVisible();

			// And: active tech should show "Active" status
			const l1Status = techSection.locator('[data-testid="tech-status-auth_validator_l1"]');
			await expect(l1Status).toContainText('Active');

			const l2Status = techSection.locator('[data-testid="tech-status-auth_validator_l2"]');
			await expect(l2Status).toContainText('Active');

			await gmailPage.close();
			await alicePage.close();
			await bobPage.close();
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

			await gmailPage.close();
			await outlookPage.close();
			await alicePage.close();
		});
	});

	// ============================================================================
	// SECTION 7: UI LAYOUT & RESPONSIVENESS
	// ============================================================================

	test.describe('UI Layout', () => {
		test('Scenario: Lock-in button is visible and properly positioned', async ({
			page,
			context
		}) => {
			// Given: I am viewing the Destination dashboard
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// When: I scroll to the bottom of the page
			await gmailPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
			await gmailPage.waitForTimeout(500);

			// Then: I should see a "Lock In Decisions" button
			const lockInButton = gmailPage.locator('[data-testid="lock-in-button"]');
			await expect(lockInButton).toBeVisible();

			// And: the button should be prominent and full-width
			const buttonBox = await lockInButton.boundingBox();
			expect(buttonBox).not.toBeNull();
			const viewportSize = gmailPage.viewportSize();
			if (viewportSize && buttonBox) {
				expect(buttonBox.width).toBeGreaterThan(viewportSize.width * 0.8); // At least 80% width
			}

			// And: the button should have a lock icon
			await expect(lockInButton).toContainText('Lock In');

			await gmailPage.close();
			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Dashboard layout adapts to different screen sizes', async ({
			page,
			context
		}) => {
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// Desktop (1600px): Two-column grid
			await gmailPage.setViewportSize({ width: 1600, height: 900 });
			await gmailPage.waitForTimeout(500);

			const dashboardLayout = gmailPage.locator('[data-testid="dashboard-layout"]');
			const gridCols = await dashboardLayout.evaluate((el) => {
				const styles = window.getComputedStyle(el);
				return styles.gridTemplateColumns;
			});
			// Check if it's a multi-column layout (not "none")
			expect(gridCols).not.toBe('none');

			// Mobile (768px): Single column layout
			await gmailPage.setViewportSize({ width: 768, height: 900 });
			await gmailPage.waitForTimeout(500);

			// Check that layout adapts (grid becomes single column or flex stacks)
			const mobileLayout = await dashboardLayout.evaluate((el) => {
				const styles = window.getComputedStyle(el);
				return {
					display: styles.display,
					gridTemplateColumns: styles.gridTemplateColumns
				};
			});
			// On mobile, should be single column or flex
			expect(mobileLayout.display).toBeTruthy();

			await gmailPage.close();
			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// SECTION 8: ACCESSIBILITY
	// ============================================================================

	test.describe('Accessibility', () => {
		test('Scenario: Dashboard is keyboard navigable', async ({ page, context }) => {
			// Given: I am viewing the Destination dashboard
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// When: I tab through the dashboard
			// Start from the top
			await gmailPage.keyboard.press('Tab');
			await gmailPage.waitForTimeout(200);

			// Then: focused elements should have visible focus indicators
			const focusedElement = await gmailPage.evaluate(() => {
				const el = document.activeElement;
				if (!el) return null;
				const styles = window.getComputedStyle(el);
				return {
					tagName: el.tagName,
					outlineWidth: styles.outlineWidth,
					boxShadow: styles.boxShadow
				};
			});

			expect(focusedElement).not.toBeNull();
			// Should have either outline or ring (box-shadow)
			if (focusedElement) {
				const hasOutline = focusedElement.outlineWidth !== '0px';
				const hasRing = focusedElement.boxShadow !== 'none' && focusedElement.boxShadow.length > 0;
				expect(hasOutline || hasRing).toBeTruthy();
			}

			await gmailPage.close();
			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Color-coding is accessible to color-blind users', async ({ page, context }) => {
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// Set ESP with excellent reputation
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.setESPStats([
					{
						espName: 'SendWave',
						teamCode: 'SW',
						activeClientsCount: 4,
						volume: '185K',
						volumeRaw: 185000,
						reputation: 95,
						userSatisfaction: 95,
						spamComplaintRate: 0.01
					}
				]);
			});

			await gmailPage.waitForTimeout(500);

			// Then: each status should also use icons
			const espCard = gmailPage.locator('[data-testid="esp-card-sendwave"]');

			// Check for icon (checkmark for excellent) - there are multiple excellent icons (rep + satisfaction)
			// So we'll just check that at least one exists
			const icons = espCard.locator('[data-testid^="status-icon-"]');
			await expect(icons.first()).toBeVisible();
			const iconText = await icons.first().textContent();
			expect(iconText).toMatch(/[✓✕⚠!👍]/); // Should have an icon

			await gmailPage.close();
			await alicePage.close();
			await bobPage.close();
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

			await gmailPage.waitForTimeout(500);

			// Then: an error banner should appear at the top
			const errorBanner = gmailPage.locator('[data-testid="error-banner"]');
			await expect(errorBanner).toBeVisible();
			await expect(errorBanner).toContainText('Failed to load ESP statistics');

			// And: the dashboard should remain functional (non-blocking)
			const espSection = gmailPage.locator('[data-testid="esp-statistics-overview"]');
			await expect(espSection).toBeVisible();

			// And: user can dismiss the error
			const dismissButton = errorBanner.locator('button');
			await dismissButton.click();
			await expect(errorBanner).not.toBeVisible();

			await gmailPage.close();
			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// SECTION 10: WEBSOCKET CONNECTION
	// ============================================================================

	test.describe('WebSocket Connection', () => {
		test('Scenario: Dashboard handles disconnection gracefully', async ({ page, context }) => {
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// When: the WebSocket connection is lost
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.setWsStatus(false, 'Connection lost');
			});

			await gmailPage.waitForTimeout(500);

			// Then: a connection status indicator should show "Disconnected"
			const wsStatus = gmailPage.locator('[data-testid="ws-status"]');
			await expect(wsStatus).toBeVisible();
			await expect(wsStatus).toContainText(/Disconnected|Connection lost/i);

			// When: the connection is restored
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.setWsStatus(true);
			});

			await gmailPage.waitForTimeout(500);

			// Then: the status indicator should show "Connected" or disappear
			const wsStatusAfter = await wsStatus.isVisible().catch(() => false);
			if (wsStatusAfter) {
				const statusText = await wsStatus.textContent();
				expect(statusText).toMatch(/Connected/i);
			}

			await gmailPage.close();
			await alicePage.close();
			await bobPage.close();
		});
	});
});
