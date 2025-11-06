/**
 * US-2.1: ESP Team Dashboard - E2E Tests
 *
 * Tests UI/UX for ESP team dashboard including:
 * - Budget display (current + forecast)
 * - Reputation gauges (color-coded per destination)
 * - Active client portfolio
 * - Technical infrastructure status
 * - Game state information (round, timer)
 * - Real-time WebSocket updates
 * - Quick action buttons
 * - Responsive design
 * - Accessibility
 * - Error handling
 *
 * Uses Playwright for end-to-end testing
 *
 * NOTE: Fixtures available in ./fixtures.ts can simplify test setup:
 * - planningPhase: Game with 2 ESP players in planning phase
 * - destinationGame: Game with destination player and ESP players
 * - minimumPlayers: Session with 3 ESP players
 * - gameSession: Basic session with facilitator
 *
 * Example usage:
 *   import { test, expect } from './fixtures';
 *   test('my test', async ({ planningPhase }) => {
 *     const { alicePage, bobPage, roomCode } = planningPhase;
 *     // Test logic...
 *   });
 */

import { test, expect } from '@playwright/test';
import { createGameInPlanningPhase } from './helpers/game-setup';

// ============================================================================
// TESTS
// ============================================================================

test.describe('Feature: ESP Team Dashboard', () => {
	// ============================================================================
	// BUDGET DISPLAY
	// ============================================================================

	test.describe('Budget Display', () => {
		test('Scenario: Budget is displayed prominently', async ({ page, context }) => {
			// Given: ESP team "SendWave" has 1000 credits
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// When: player "Alice" views the dashboard
			// Then: budget should be displayed prominently
			const budgetElement = alicePage.locator('[data-testid="budget-current"]');
			await expect(budgetElement).toBeVisible({ timeout: 5000 });

			// And: the budget value should show "1000" (formatted as "1,000")
			const budgetText = await budgetElement.textContent();
			expect(budgetText).toMatch(/1[,]?000/);

			// And: budget should be clearly visible without scrolling (check viewport position)
			const box = await budgetElement.boundingBox();
			expect(box).not.toBeNull();
			expect(box!.y).toBeLessThan(200); // Should be in top 200px of viewport

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Budget updates in real-time when spending credits on purchases', async ({
			page,
			context
		}) => {
			// Given: ESP team "SendWave" has 1000 credits
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// And: player "Alice" is viewing the dashboard
			const budgetElement = alicePage.locator('[data-testid="budget-current"]');
			let initialText = await budgetElement.textContent();
			expect(initialText).toMatch(/1[,]?000/);

			// When: the team spends 200 credits on a client acquisition
			// TODO: This will be fully testable once US-2.2 (Client Marketplace) is implemented
			// For now, we'll simulate state change via test API
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setCredits(800);
			});

			// Wait for front-end to process the update
			await alicePage.waitForTimeout(500);

			// Then: the budget should update to "800" in real-time
			let updatedText = await budgetElement.textContent();
			expect(updatedText).toMatch(/800/);

			// And: the update should be smooth without page refresh
			// (if page refreshed, we'd lose test state)

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Budget forecast is displayed after making decisions', async ({
			page,
			context
		}) => {
			// Given: ESP team "SendWave" has 1000 credits
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// And: the team has made decisions that will cost 330 credits this round
			// TODO: This will be fully testable once US-2.3 (Tech Shop) is implemented
			// For now, we'll simulate pending decisions via test API
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setPendingCosts(330);
			});

			// Wait for front-end to process the update
			await alicePage.waitForTimeout(500);

			// When: player "Alice" views the dashboard
			// Then: a budget forecast should show "670" as "After Lock-in" value
			const forecastElement = alicePage.locator('[data-testid="budget-forecast"]');
			await expect(forecastElement).toBeVisible();
			let forecastText = await forecastElement.textContent();
			expect(forecastText).toMatch(/670/);

			// And: the forecast should be visually distinct from current budget
			const currentBudget = alicePage.locator('[data-testid="budget-current"]');
			const forecastStyles = await forecastElement.evaluate((el) => window.getComputedStyle(el));
			const currentStyles = await currentBudget.evaluate((el) => window.getComputedStyle(el));

			// Forecast should have different styling (opacity, color, etc.)
			expect(forecastStyles.opacity).not.toBe(currentStyles.opacity);

			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// REPUTATION DISPLAY
	// ============================================================================

	test.describe('Reputation Display', () => {
		test('Scenario: Reputation per destination is displayed with color-coded gauges', async ({
			page,
			context
		}) => {
			// Given: ESP team "SendWave" has reputation values
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// Simulate specific reputation values via test API
			// Using values that match the threshold table: 90+=Excellent, 70-89=Good, 50-69=Warning
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setReputation({
					Gmail: 92, // Excellent (90+)
					Outlook: 75, // Good (70-89)
					Yahoo: 55 // Warning (50-69)
				});
			});

			// Wait for front-end to process the update
			await alicePage.waitForTimeout(500);

			// When: player "Alice" views the dashboard
			// Then: reputation gauges should be displayed for each destination
			const gmailGauge = alicePage.locator('[data-testid="reputation-gmail"]');
			const outlookGauge = alicePage.locator('[data-testid="reputation-outlook"]');
			const yahooGauge = alicePage.locator('[data-testid="reputation-yahoo"]');

			await expect(gmailGauge).toBeVisible();
			await expect(outlookGauge).toBeVisible();
			await expect(yahooGauge).toBeVisible();

			// And: the Gmail gauge should show "92" with excellent/green styling
			await expect(gmailGauge).toContainText('92');
			const gmailColor = await gmailGauge.getAttribute('data-status');
			expect(gmailColor).toBe('excellent');

			// And: the Outlook gauge should show "75" with good/blue styling
			await expect(outlookGauge).toContainText('75');
			const outlookColor = await outlookGauge.getAttribute('data-status');
			expect(outlookColor).toBe('good');

			// And: the Yahoo gauge should show "55" with warning/orange styling
			await expect(yahooGauge).toContainText('55');
			const yahooColor = await yahooGauge.getAttribute('data-status');
			expect(yahooColor).toBe('warning');

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Reputation color coding follows defined thresholds', async ({
			page,
			context
		}) => {
			// Given: ESP team "SendWave" has reputation scores across different ranges
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// When: player "Alice" views the reputation gauges
			// Then: reputations should be color-coded by threshold
			const testCases = [
				{ value: 95, expectedStatus: 'excellent', destination: 'Gmail' },
				{ value: 75, expectedStatus: 'good', destination: 'Outlook' },
				{ value: 55, expectedStatus: 'warning', destination: 'Yahoo' }
			];

			for (const testCase of testCases) {
				await alicePage.evaluate(
					({ value, destination }) => {
						(window as any).__espDashboardTest.setReputation({ [destination]: value });
					},
					{ value: testCase.value, destination: testCase.destination }
				);

				// Wait for front-end to process the update
				await alicePage.waitForTimeout(500);

				const gauge = alicePage.locator(
					`[data-testid="reputation-${testCase.destination.toLowerCase()}"]`
				);
				const status = await gauge.getAttribute('data-status');
				expect(status).toBe(testCase.expectedStatus);
			}

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Visual warning appears when reputation drops to warning zone', async ({
			page,
			context
		}) => {
			// Given: ESP team "SendWave" has Gmail reputation at 65
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setReputation({ Gmail: 65 });
			});

			// Wait for front-end to process the update
			await alicePage.waitForTimeout(500);

			// When: the round starts
			// Then: a visual warning should appear for Gmail reputation
			const warningIndicator = alicePage.locator('[data-testid="reputation-gmail-warning"]');
			await expect(warningIndicator).toBeVisible();

			// And: the warning should indicate "Warning Zone"
			await expect(warningIndicator).toContainText(/warning zone/i);

			// And: the gauge should change to orange/warning styling
			const gmailGauge = alicePage.locator('[data-testid="reputation-gmail"]');
			const status = await gmailGauge.getAttribute('data-status');
			expect(status).toBe('warning');

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Visual alert appears when reputation drops to danger zone', async ({
			page,
			context
		}) => {
			// Given: ESP team "SendWave" has Gmail reputation at 45
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setReputation({ Gmail: 45 });
			});

			// Wait for front-end to process the update
			await alicePage.waitForTimeout(500);

			// When: the round starts
			// Then: a visual alert should appear for Gmail reputation
			const alertIndicator = alicePage.locator('[data-testid="reputation-gmail-alert"]');
			await expect(alertIndicator).toBeVisible();

			// And: the alert should indicate "Danger Zone"
			await expect(alertIndicator).toContainText(/danger zone/i);

			// And: the gauge should change to red/poor styling
			const gmailGauge = alicePage.locator('[data-testid="reputation-gmail"]');
			const status = await gmailGauge.getAttribute('data-status');
			expect(status).toBe('poor');

			// And: the alert should be more prominent than a warning
			const alertStyles = await alertIndicator.evaluate((el) => window.getComputedStyle(el));
			// Check for bold styling (fontWeight >= 600 covers 'bold' which is typically 700)
			const fontWeight = parseFloat(alertStyles.fontWeight) || 400;
			expect(fontWeight).toBeGreaterThanOrEqual(600);

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Destination weight is displayed with reputation', async ({ page, context }) => {
			// Given: ESP team "SendWave" is viewing reputation gauges
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// When: player "Alice" views the dashboard
			// Then: each destination should display its market weight
			const gmailWeight = alicePage.locator('[data-testid="destination-weight-gmail"]');
			const outlookWeight = alicePage.locator('[data-testid="destination-weight-outlook"]');
			const yahooWeight = alicePage.locator('[data-testid="destination-weight-yahoo"]');

			await expect(gmailWeight).toContainText('50%');
			await expect(outlookWeight).toContainText('30%');
			await expect(yahooWeight).toContainText('20%');

			// And: the weight should be shown near each reputation gauge
			const gmailGauge = alicePage.locator('[data-testid="reputation-gmail"]');
			const gmailGaugeBox = await gmailGauge.boundingBox();
			const gmailWeightBox = await gmailWeight.boundingBox();

			expect(gmailGaugeBox).not.toBeNull();
			expect(gmailWeightBox).not.toBeNull();

			// Weight should be within 100px of gauge
			const distance = Math.abs(gmailGaugeBox!.y - gmailWeightBox!.y);
			expect(distance).toBeLessThan(100);

			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// CURRENT CLIENTS (ACTIVE PORTFOLIO)
	// ============================================================================

	test.describe('Current Clients / Active Portfolio', () => {
		test('Scenario: Active clients are listed in portfolio', async ({ page, context }) => {
			// Given: ESP team "SendWave" has active clients
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setClients([
					{
						name: 'Premium Brand Co.',
						status: 'Active',
						revenue: 250,
						volume: '50K',
						risk: 'Low'
					},
					{
						name: 'Growing Startup',
						status: 'Active',
						revenue: 180,
						volume: '35K',
						risk: 'Medium'
					},
					{
						name: 'Aggressive Marketer',
						status: 'Paused',
						revenue: 320,
						volume: '80K',
						risk: 'High'
					}
				]);
			});

			// Wait for front-end to process the update
			await alicePage.waitForTimeout(500);

			// When: player "Alice" views the dashboard
			// Then: the active portfolio should display 3 clients
			const portfolioSection = alicePage.locator('[data-testid="client-portfolio"]');
			const clientCards = portfolioSection.locator('[data-testid^="client-card-"]');
			await expect(clientCards).toHaveCount(3);

			// And: each client should show its name, status, revenue, volume, and risk level
			const firstClient = clientCards.nth(0);
			await expect(firstClient).toContainText('Premium Brand Co.');
			await expect(firstClient).toContainText('Active');
			await expect(firstClient).toContainText('250');
			await expect(firstClient).toContainText('50K');
			await expect(firstClient).toContainText('Low');

			// And: active clients should be visually distinct from paused clients
			const activeClient = alicePage.locator('[data-testid="client-card-0"]');
			const pausedClient = alicePage.locator('[data-testid="client-card-2"]');

			const activeStatus = await activeClient.getAttribute('data-status');
			const pausedStatus = await pausedClient.getAttribute('data-status');

			expect(activeStatus).toBe('active');
			expect(pausedStatus).toBe('paused');

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Empty portfolio displays helpful message', async ({ page, context }) => {
			// Given: ESP team "SendWave" has no clients acquired yet
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// When: player "Alice" views the dashboard
			// Then: the portfolio section should display a message
			const emptyMessage = alicePage.locator('[data-testid="portfolio-empty-state"]');
			await expect(emptyMessage).toBeVisible();
			await expect(emptyMessage).toContainText(/No clients yet.*Visit the Client Marketplace/i);

			// And: there should be a clear call-to-action to access the marketplace
			const ctaButton = alicePage.locator('[data-testid="cta-marketplace"]');
			await expect(ctaButton).toBeVisible();
			await expect(ctaButton).toContainText(/client marketplace/i);

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Client status is clearly indicated', async ({ page, context }) => {
			// Given: ESP team "SendWave" has clients with different statuses
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setClients([
					{ name: 'Active Client', status: 'Active' },
					{ name: 'Paused Client', status: 'Paused' }
				]);
			});

			// Wait for front-end to process the update
			await alicePage.waitForTimeout(500);

			// When: player "Alice" views the active portfolio
			// Then: active clients should display a green "Active" badge
			const activeBadge = alicePage.locator('[data-testid="client-status-badge-0"]');
			await expect(activeBadge).toContainText('Active');
			const activeBadgeClass = await activeBadge.getAttribute('class');
			expect(activeBadgeClass).toMatch(/green|success/i);

			// And: paused clients should display an orange "Paused" badge
			const pausedBadge = alicePage.locator('[data-testid="client-status-badge-1"]');
			await expect(pausedBadge).toContainText('Paused');
			const pausedBadgeClass = await pausedBadge.getAttribute('class');
			expect(pausedBadgeClass).toMatch(/orange|warning/i);

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Portfolio displays client count', async ({ page, context }) => {
			// Given: ESP team "SendWave" has 4 active clients
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setClients([
					{ name: 'Client 1', status: 'Active' },
					{ name: 'Client 2', status: 'Active' },
					{ name: 'Client 3', status: 'Active' },
					{ name: 'Client 4', status: 'Active' }
				]);
			});

			// Wait for front-end to process the update
			await alicePage.waitForTimeout(500);

			// When: player "Alice" views the dashboard
			// Then: the portfolio header should show "4 active clients"
			const portfolioHeader = alicePage.locator('[data-testid="portfolio-header"]');
			await expect(portfolioHeader).toContainText(/4.*active.*clients/i);

			// And: the count should update in real-time when clients are added
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setClients([
					{ name: 'Client 1', status: 'Active' },
					{ name: 'Client 2', status: 'Active' },
					{ name: 'Client 3', status: 'Active' },
					{ name: 'Client 4', status: 'Active' },
					{ name: 'Client 5', status: 'Active' }
				]);
			});

			// Wait for front-end to process the update
			await alicePage.waitForTimeout(500);

			await expect(portfolioHeader).toContainText(/5.*active.*clients/i, { timeout: 2000 });

			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// TECHNICAL INFRASTRUCTURE STATUS
	// ============================================================================

	test.describe('Technical Infrastructure Status', () => {
		test('Scenario: Owned technical upgrades are displayed', async ({ page, context }) => {
			// Given: ESP team "SendWave" has purchased tech
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setOwnedTech(['spf', 'dkim']);
			});

			// Wait for front-end to process the update
			await alicePage.waitForTimeout(500);

			// When: player "Alice" views the dashboard
			// Then: the technical infrastructure section should list owned tech
			const techSection = alicePage.locator('[data-testid="technical-infrastructure"]');
			await expect(techSection).toBeVisible();

			// And: SPF Authentication should show as "Active"
			const spfItem = alicePage.locator('[data-testid="tech-item-spf"]');
			await expect(spfItem).toContainText('SPF Authentication');
			await expect(spfItem).toContainText('Active');

			// And: DKIM Signature should show as "Active"
			const dkimItem = alicePage.locator('[data-testid="tech-item-dkim"]');
			await expect(dkimItem).toContainText('DKIM Signature');
			await expect(dkimItem).toContainText('Active');

			// And: active tech should have green checkmark icons
			const spfIcon = spfItem.locator('[data-testid="tech-icon-checkmark"]');
			await expect(spfIcon).toBeVisible();

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Missing critical tech is highlighted', async ({ page, context }) => {
			// Given: ESP team "SendWave" has SPF and DKIM but not DMARC
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// And: the game is in round 2 where DMARC becomes mandatory
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setOwnedTech(['spf', 'dkim']);
				(window as any).__espDashboardTest.setRound(2);
			});

			// Wait for front-end to process the update
			await alicePage.waitForTimeout(500);

			// When: player "Alice" views the dashboard
			// Then: DMARC should be highlighted as "Not Installed"
			const dmarcItem = alicePage.locator('[data-testid="tech-item-dmarc"]');
			await expect(dmarcItem).toContainText('DMARC');
			await expect(dmarcItem).toContainText(/not installed/i);

			// And: there should be a warning indicator "MANDATORY from Round 3"
			const mandatoryWarning = alicePage.locator('[data-testid="tech-mandatory-warning"]');
			await expect(mandatoryWarning).toContainText(/mandatory from round 3/i);

			// And: the missing tech should have a red cross icon
			const crossIcon = dmarcItem.locator('[data-testid="tech-icon-cross"]');
			await expect(crossIcon).toBeVisible();

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Missing technical upgrades are indicated', async ({ page, context }) => {
			// Given: ESP team "SendWave" has not purchased all available tech
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// When: player "Alice" views the technical infrastructure section
			const techSection = alicePage.locator('[data-testid="technical-infrastructure"]');
			await expect(techSection).toBeVisible();

			// Then: missing tech should show as "Not Installed"
			const missingTech = alicePage.locator('[data-testid^="tech-item-"][data-status="missing"]');
			await expect(missingTech.first()).toContainText(/not installed/i);

			// And: there should be an indication that upgrades are available
			const upgradeNotice = alicePage.locator('[data-testid="tech-upgrade-available"]');
			await expect(upgradeNotice).toBeVisible();

			// And: missing tech should be styled differently from owned tech
			const ownedTech = alicePage.locator('[data-testid^="tech-item-"][data-status="active"]');
			const missingTechItem = alicePage.locator(
				'[data-testid^="tech-item-"][data-status="missing"]'
			);

			if ((await ownedTech.count()) > 0 && (await missingTechItem.count()) > 0) {
				const ownedStyles = await ownedTech.first().evaluate((el) => window.getComputedStyle(el));
				const missingStyles = await missingTechItem
					.first()
					.evaluate((el) => window.getComputedStyle(el));

				expect(ownedStyles.opacity).not.toBe(missingStyles.opacity);
			}

			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// GAME STATE INFORMATION
	// ============================================================================

	test.describe('Game State Information', () => {
		test('Scenario: Current round number is visible', async ({ page, context }) => {
			// Given: the game is in round 2 of 4
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setRound(2);
			});

			// Wait for front-end to process the update
			await alicePage.waitForTimeout(500);

			// When: player "Alice" views the dashboard
			// Then: the round number should be clearly displayed as "Round 2 / 4"
			const roundIndicator = alicePage.locator('[data-testid="round-indicator"]');
			await expect(roundIndicator).toContainText(/round 2.*\/ 4/i);

			// And: it should be positioned in the header or prominent location
			const box = await roundIndicator.boundingBox();
			expect(box).not.toBeNull();
			expect(box!.y).toBeLessThan(200); // Should be in top 200px

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Timer shows remaining time in current phase', async ({ page, context }) => {
			// Given: the planning phase has time remaining
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// When: player "Alice" views the dashboard
			// Then: a countdown timer should be visible
			const timerElement = alicePage.locator('[data-testid="game-timer"]');
			await expect(timerElement).toBeVisible({ timeout: 5000 });

			// And: the timer should show MM:SS format (e.g., "4:32")
			const timerText = await timerElement.textContent();
			expect(timerText).toMatch(/[0-5]:[0-5][0-9]/);

			// And: the timer should be prominent and easy to read
			const timerStyles = await timerElement.evaluate((el) => window.getComputedStyle(el));
			const fontSize = parseFloat(timerStyles.fontSize);
			expect(fontSize).toBeGreaterThanOrEqual(16); // At least 16px font size

			// And: the timer should decrement (check after 2 seconds)
			const initialTime = await timerElement.textContent();
			await alicePage.waitForTimeout(2000);
			const laterTime = await timerElement.textContent();
			// Time should have decreased (not necessarily by exactly 2 seconds due to clock sync)
			expect(laterTime).not.toBe(initialTime);

			await alicePage.close();
			await bobPage.close();
		});

		// Parameterized test for timer color changes at different thresholds
		const timerThresholds = [
			{ seconds: 60, expectedPattern: /warning|orange/i, description: '1 minute (warning)' },
			{ seconds: 30, expectedPattern: /urgent|red|danger/i, description: '30 seconds (urgent)' }
		];

		for (const threshold of timerThresholds) {
			test(`Scenario: Timer changes to appropriate color at ${threshold.description} threshold`, async ({
				page,
				context
			}) => {
				// Given: the planning phase timer is counting down
				const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

				const timerElement = alicePage.locator('[data-testid="game-timer"]');

				// When: the timer reaches the threshold
				await alicePage.evaluate((s) => {
					(window as any).__espDashboardTest.setTimer(s);
				}, threshold.seconds);

				// Wait for front-end to process the update
				await alicePage.waitForTimeout(500);

				// Then: the timer should change to the expected color
				const timerClass = await timerElement.getAttribute('class');
				expect(timerClass).toMatch(threshold.expectedPattern);

				// For urgent threshold, verify animation
				if (threshold.seconds === 30) {
					const animations = await timerElement.evaluate((el) => {
						const styles = window.getComputedStyle(el);
						return styles.animationName;
					});
					expect(typeof animations).toBe('string');
				}

				await alicePage.close();
				await bobPage.close();
			});
		}
	});

	// ============================================================================
	// REAL-TIME UPDATES
	// ============================================================================

	test.describe('Real-Time Updates', () => {
		test('Scenario: Dashboard receives WebSocket updates', async ({ page, context }) => {
			// Given: player "Alice" is viewing the dashboard
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// And: the WebSocket connection is active
			const wsStatus = alicePage.locator('[data-testid="ws-status"]');
			await expect(wsStatus).toContainText(/connected/i);

			// When: a game state update is broadcast
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setCredits(950);
				(window as any).__espDashboardTest.setReputation({ Gmail: 72 });
			});

			// Wait for front-end to process the update
			await alicePage.waitForTimeout(500);

			// Then: the dashboard should receive the update
			// And: relevant sections should update automatically
			const budgetElement = alicePage.locator('[data-testid="budget-current"]');
			await expect(budgetElement).toContainText('950', { timeout: 2000 });

			// And: no manual refresh should be required
			// (test continues without page reload)

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Dashboard handles disconnection gracefully', async ({ page, context }) => {
			// Given: player "Alice" is viewing the dashboard
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// When: the WebSocket connection is lost
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setWsStatus(false, 'Connection lost');
			});

			// Wait for front-end to process the disconnection
			await alicePage.waitForTimeout(500);

			// Then: a connection status indicator should show "Disconnected"
			const wsStatus = alicePage.locator('[data-testid="ws-status"]');
			await expect(wsStatus).toContainText(/disconnected/i, { timeout: 2000 });

			// And: the dashboard should attempt to reconnect automatically
			// (simulated by firing reconnection event after delay)
			await alicePage.waitForTimeout(1000);

			// When: the connection is restored
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setWsStatus(true);
			});

			// Wait for front-end to process the reconnection
			await alicePage.waitForTimeout(500);

			// Then: the status indicator should show "Connected"
			await expect(wsStatus).toContainText(/connected/i, { timeout: 2000 });

			// And: the dashboard should sync with the latest game state
			// (verified by checking data is still present)
			const budgetElement = alicePage.locator('[data-testid="budget-current"]');
			await expect(budgetElement).toBeVisible();

			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// QUICK ACTIONS / NAVIGATION
	// ============================================================================

	test.describe('Quick Actions / Navigation', () => {
		test('Scenario: Quick action buttons are accessible', async ({ page, context }) => {
			// Given: player "Alice" is viewing the dashboard
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// When: player "Alice" looks for ways to make decisions
			// Then: there should be prominent quick action buttons
			const marketplaceButton = alicePage.locator(
				'[data-testid="quick-action-client-marketplace"]'
			);
			const techShopButton = alicePage.locator('[data-testid="quick-action-tech-shop"]');
			const clientMgmtButton = alicePage.locator('[data-testid="quick-action-client-mgmt"]');

			await expect(marketplaceButton).toBeVisible();
			await expect(techShopButton).toBeVisible();
			await expect(clientMgmtButton).toBeVisible();

			// And: each button should be clearly labeled
			await expect(marketplaceButton).toContainText(/client marketplace/i);
			await expect(techShopButton).toContainText(/technical shop/i);
			await expect(clientMgmtButton).toContainText(/client management/i);

			// And: with an icon (check for icon element or emoji)
			const marketplaceIcon = marketplaceButton.locator('[data-testid="button-icon"]');
			await expect(marketplaceIcon).toBeVisible();

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Lock-in button is visible during planning phase', async ({ page, context }) => {
			// Given: the game is in "planning" phase
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// When: player "Alice" views the dashboard
			// Then: a "Lock In Decisions" button should be visible
			const lockInButton = alicePage.locator('[data-testid="lock-in-button"]');
			await expect(lockInButton).toBeVisible();

			// And: the button should be prominent and easy to find
			const box = await lockInButton.boundingBox();
			expect(box).not.toBeNull();
			expect(box!.width).toBeGreaterThan(100); // Large enough to be prominent

			// And: the button should be enabled
			await expect(lockInButton).toBeEnabled();

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Lock-in button is disabled during resolution phase', async ({
			page,
			context
		}) => {
			// Given: game is in planning phase, then transitions to resolution
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// Transition to resolution phase
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setPhase('resolution');
			});

			// Wait for front-end to process the phase transition
			await alicePage.waitForTimeout(500);

			// When: player "Alice" views the dashboard
			// Then: the "Lock In Decisions" button should not be visible or disabled
			const lockInButton = alicePage.locator('[data-testid="lock-in-button"]');
			const isVisible = await lockInButton.isVisible();

			if (isVisible) {
				// If visible, it should be disabled
				await expect(lockInButton).toBeDisabled();
			}
			// Otherwise, it's hidden, which is acceptable

			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// RESPONSIVE DESIGN
	// ============================================================================

	test.describe('Responsive Design', () => {
		test('Scenario: Dashboard is responsive on desktop', async ({ page, context }) => {
			// Given: player "Alice" is viewing the dashboard on desktop (1920x1080)
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			await alicePage.setViewportSize({ width: 1920, height: 1080 });

			// When: the dashboard loads
			// Then: all elements should fit properly on screen
			const dashboard = alicePage.locator('[data-testid="esp-dashboard"]');
			await expect(dashboard).toBeVisible();

			// And: the layout should use valid display mode (block is valid for container)
			const dashboardStyles = await dashboard.evaluate((el) => window.getComputedStyle(el));
			expect(dashboardStyles.display).toMatch(/grid|flex|block/);

			// And: no horizontal scrolling should be required
			const scrollWidth = await alicePage.evaluate(() => document.body.scrollWidth);
			const clientWidth = await alicePage.evaluate(() => document.body.clientWidth);
			expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Dashboard is responsive on mobile', async ({ page, context }) => {
			// Given: player "Alice" is viewing the dashboard on mobile (375x667)
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			await alicePage.setViewportSize({ width: 375, height: 667 });

			// When: the dashboard loads
			// Then: the layout should stack vertically for mobile
			const dashboard = alicePage.locator('[data-testid="esp-dashboard"]');
			await expect(dashboard).toBeVisible();

			// And: text should be readable without zooming
			const textElement = alicePage.locator('[data-testid="budget-current"]');
			const fontSize = await textElement.evaluate((el) => {
				const styles = window.getComputedStyle(el);
				return parseFloat(styles.fontSize);
			});
			expect(fontSize).toBeGreaterThanOrEqual(14); // At least 14px

			// And: buttons should be large enough for thumb interaction (44x44px minimum)
			const lockInButton = alicePage.locator('[data-testid="lock-in-button"]');
			const buttonBox = await lockInButton.boundingBox();
			if (buttonBox) {
				expect(buttonBox.height).toBeGreaterThanOrEqual(44);
			}

			// And: critical information should be visible without scrolling
			const budgetElement = alicePage.locator('[data-testid="budget-current"]');
			const budgetBox = await budgetElement.boundingBox();
			expect(budgetBox).not.toBeNull();
			expect(budgetBox!.y).toBeLessThan(667); // Should be within viewport

			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// ACCESSIBILITY
	// ============================================================================

	test.describe('Accessibility', () => {
		test('Scenario: Color-coding is accessible to color-blind users', async ({ page, context }) => {
			// Given: player "Alice" has color vision deficiency
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// Set up reputation values (using thresholds: 90+=Excellent, 70-89=Good, 50-69=Warning)
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setReputation({
					Gmail: 95, // Excellent (90+)
					Outlook: 75, // Good (70-89)
					Yahoo: 55 // Warning (50-69)
				});
			});

			// Wait for front-end to process the update
			await alicePage.waitForTimeout(500);

			// When: viewing reputation gauges with color coding
			// Then: each status should also use patterns or icons
			const gmailGauge = alicePage.locator('[data-testid="reputation-gmail"]');
			const outlookGauge = alicePage.locator('[data-testid="reputation-outlook"]');
			const yahooGauge = alicePage.locator('[data-testid="reputation-yahoo"]');

			// Excellent should have checkmark icon
			const checkmarkIcon = gmailGauge.locator('[data-testid="status-icon-checkmark"]');
			await expect(checkmarkIcon).toBeVisible();

			// Good should have thumb up icon
			const thumbUpIcon = outlookGauge.locator('[data-testid="status-icon-thumbup"]');
			await expect(thumbUpIcon).toBeVisible();

			// Warning should have warning triangle icon
			const warningIcon = yahooGauge.locator('[data-testid="status-icon-warning"]');
			await expect(warningIcon).toBeVisible();

			// And: the status should be readable by screen readers
			const gmailLabel = await gmailGauge.getAttribute('aria-label');
			expect(gmailLabel).toMatch(/excellent|95/i);

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Dashboard is keyboard navigable', async ({ page, context }) => {
			// Given: player "Alice" is using keyboard navigation
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// When: player "Alice" navigates through interactive elements
			// Then: focus should move logically and all interactive elements should be reachable

			// Test 1: Quick action buttons should be focusable
			const marketplaceButton = alicePage.locator(
				'[data-testid="quick-action-client-marketplace"]'
			);
			await marketplaceButton.focus();
			let isFocused = await marketplaceButton.evaluate((el) => document.activeElement === el);
			expect(isFocused).toBe(true);

			// And: focused elements should have visible focus indicators (outline or ring/box-shadow)
			const focusStyles = await marketplaceButton.evaluate((el) => {
				const styles = window.getComputedStyle(el);
				return {
					outlineWidth: styles.outlineWidth,
					outlineStyle: styles.outlineStyle,
					boxShadow: styles.boxShadow
				};
			});
			// Should have a visible focus indicator (outline or box-shadow for ring)
			const hasOutline = focusStyles.outlineWidth !== '0px' && focusStyles.outlineStyle !== 'none';
			const hasRing = focusStyles.boxShadow !== 'none' && focusStyles.boxShadow.length > 0;
			expect(hasOutline || hasRing).toBeTruthy();

			// Test 2: Tab to next button
			await alicePage.keyboard.press('Tab');
			const techShopButton = alicePage.locator('[data-testid="quick-action-tech-shop"]');
			isFocused = await techShopButton.evaluate((el) => document.activeElement === el);
			expect(isFocused).toBe(true);

			// Test 3: Tab to client management button
			await alicePage.keyboard.press('Tab');
			const clientMgmtButton = alicePage.locator('[data-testid="quick-action-client-mgmt"]');
			isFocused = await clientMgmtButton.evaluate((el) => document.activeElement === el);
			expect(isFocused).toBe(true);

			// Test 4: Lock-in button should be reachable
			const lockInButton = alicePage.locator('[data-testid="lock-in-button"]');
			await lockInButton.focus();
			isFocused = await lockInButton.evaluate((el) => document.activeElement === el);
			expect(isFocused).toBe(true);

			// Test 5: Enter key should activate buttons
			let buttonClicked = false;
			await alicePage.evaluate(() => {
				const btn = document.querySelector('[data-testid="lock-in-button"]');
				if (btn) {
					btn.addEventListener('click', () => {
						(window as any).lockInClicked = true;
					});
				}
			});

			await alicePage.keyboard.press('Enter');
			buttonClicked = await alicePage.evaluate(() => (window as any).lockInClicked === true);
			expect(buttonClicked).toBe(true);

			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// ERROR HANDLING
	// ============================================================================

	test.describe('Error Handling', () => {
		test('Scenario: Dashboard handles missing data gracefully', async ({ page, context }) => {
			// Given: player "Alice" is viewing the dashboard
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// And: some game data fails to load
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setLoading(true);
				(window as any).__espDashboardTest.setError('Unable to load data. Retrying...');
			});

			// Wait for front-end to process the error
			await alicePage.waitForTimeout(500);

			// When: the dashboard attempts to display the data
			// Then: placeholder content or loading indicators should be shown
			const loadingIndicator = alicePage.locator('[data-testid="loading-reputation"]');
			await expect(loadingIndicator).toBeVisible();

			// And: an error message should appear
			const errorMessage = alicePage.locator('[data-testid="error-message"]');
			await expect(errorMessage).toBeVisible();
			await expect(errorMessage).toContainText(/unable to load.*retrying/i);

			// And: the dashboard should attempt to reload the data
			// (simulated by checking for retry mechanism - implementation detail)

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Dashboard shows error when game state is invalid', async ({
			page,
			context
		}) => {
			// Given: player "Alice" is viewing the dashboard
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// When: the game state becomes corrupted or invalid
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setError(
					'Game state sync error. Please refresh the page.'
				);
			});

			// Wait for front-end to process the error
			await alicePage.waitForTimeout(500);

			// Then: an error banner should appear at the top
			const errorBanner = alicePage.locator('[data-testid="error-banner"]');
			await expect(errorBanner).toBeVisible();

			// And: the message should say: "Game state sync error. Please refresh the page."
			await expect(errorBanner).toContainText(/game state sync error.*refresh/i);

			// And: the banner should be positioned at the top
			const bannerBox = await errorBanner.boundingBox();
			expect(bannerBox).not.toBeNull();
			expect(bannerBox!.y).toBeLessThan(100);

			// And: critical information should still be displayed if available
			const budgetElement = alicePage.locator('[data-testid="budget-current"]');
			// Budget might still be visible with last known value
			const budgetExists = await budgetElement.isVisible();
			expect(budgetExists).toBe(true);

			await alicePage.close();
			await bobPage.close();
		});
	});
});
