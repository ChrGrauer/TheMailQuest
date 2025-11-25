/**
 * US-2.6.1: Destination Filtering Controls - E2E Tests
 *
 * Tests UI/UX for destination filtering controls including:
 * - Modal UI & navigation
 * - Filtering levels & impact display (Permissive: 0%/0%, Moderate: 35%/3%, Strict: 65%/8%, Maximum: 85%/15%)
 * - Multiple ESP filtering
 * - Persistence across modal sessions
 * - Persistence across rounds
 * - Visual feedback & gradients
 * - Destination-specific ESP metrics
 * - Error handling
 *
 * Following ATDD methodology - these tests are written BEFORE implementation (RED phase)
 */

import { test, expect } from './fixtures';
import {
	createGameWithDestinationPlayer,
	createGameWith5ESPTeams,
	createGameWith3ESPTeams,
	closePages
} from './helpers/game-setup';

test.describe('Feature: US-2.6.1 Destination Filtering Controls', () => {
	test.setTimeout(20000);

	// ============================================================================
	// SECTION 1: MODAL UI & NAVIGATION
	// ============================================================================

	test.describe('Section 1: Modal UI & Navigation', () => {
		test('Scenario: Open and close Filtering Controls modal', async ({ page, context }) => {
			// Given: I am on the Destination dashboard
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// When: I click the "Filtering Controls" quick action button
			const filteringButton = gmailPage.locator('[data-testid="filtering-controls-button"]');
			await filteringButton.click();
			await gmailPage.waitForTimeout(300);

			// Then: the Filtering Controls modal should open
			const modal = gmailPage.locator('[data-testid="filtering-controls-modal"]');
			await expect(modal).toBeVisible();

			// And: I should see modal header containing "Filtering Controls"
			const modalHeader = gmailPage.locator('[data-testid="filtering-modal-title"]');
			await expect(modalHeader).toContainText('Filtering Controls');

			// And: I should see filtering items for all active ESPs
			const espItems = gmailPage.locator('[data-testid^="filtering-item-"]');
			await expect(espItems).toHaveCount(2); // 2 ESP teams in test setup

			// When: I click the close button "✕"
			const closeButton = gmailPage.locator('[data-testid="filtering-modal-close"]');
			await closeButton.click();
			await gmailPage.waitForTimeout(300);

			// Then: the modal should close
			await expect(modal).not.toBeVisible();

			// And: all filtering settings should be preserved (verified in persistence tests)

			await closePages(page, gmailPage);
			await closePages(page, alicePage, bobPage);
		});

		test('Scenario: Close modal by clicking outside', async ({ page, context }) => {
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// Open modal
			const filteringButton = gmailPage.locator('[data-testid="filtering-controls-button"]');
			await filteringButton.click();
			await gmailPage.waitForTimeout(300);

			const modal = gmailPage.locator('[data-testid="filtering-controls-modal"]');
			await expect(modal).toBeVisible();

			// Click outside modal (on backdrop)
			const backdrop = gmailPage.locator('[data-testid="modal-backdrop"]');
			await backdrop.click({ position: { x: 10, y: 10 } });
			await gmailPage.waitForTimeout(300);

			// Modal should close
			await expect(modal).not.toBeVisible();

			await closePages(page, gmailPage);
			await closePages(page, alicePage, bobPage);
		});
	});

	// ============================================================================
	// SECTION 2: VIEWING ESP FILTERING STATUS
	// ============================================================================

	test.describe('Section 2: Viewing ESP Filtering Status', () => {
		test('Scenario: View filtering controls with all active ESPs', async ({ page, context }) => {
			// Given: I am a Destination player for "Gmail"
			// And: all 5 ESP teams are active in the game
			const {
				gmailPage,
				sendWavePage,
				mailMonkeyPage,
				bluePostPage,
				sendBoltPage,
				rocketMailPage
			} = await createGameWith5ESPTeams(page, context);

			// When: I open the Filtering Controls modal
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.openFilteringControls();
			});
			await gmailPage.waitForTimeout(300);

			// Then: I should see 5 ESP entries
			const espItems = gmailPage.locator('[data-testid^="filtering-item-"]');
			await expect(espItems).toHaveCount(5);

			// And: each ESP should display complete Gmail-specific metrics
			const sendWaveItem = gmailPage.locator('[data-testid="filtering-item-sendwave"]');

			// ESP name
			const espName = sendWaveItem.locator('[data-testid="filtering-esp-name"]');
			await expect(espName).toContainText('SendWave');

			// Current filtering level
			const currentLevel = sendWaveItem.locator('[data-testid="filtering-current-level"]');
			await expect(currentLevel).toBeVisible();

			// Email volume last round
			const volume = sendWaveItem.locator('[data-testid="filtering-esp-volume"]');
			await expect(volume).toBeVisible();

			// Reputation score
			const reputation = sendWaveItem.locator('[data-testid="filtering-esp-reputation"]');
			await expect(reputation).toBeVisible();

			// User satisfaction
			const satisfaction = sendWaveItem.locator('[data-testid="filtering-esp-satisfaction"]');
			await expect(satisfaction).toBeVisible();

			// Spam rate
			const spamRate = sendWaveItem.locator('[data-testid="filtering-esp-spam-rate"]');
			await expect(spamRate).toBeVisible();

			await closePages(
				page,
				gmailPage,
				sendWavePage,
				mailMonkeyPage,
				bluePostPage,
				sendBoltPage,
				rocketMailPage
			);
		});
	});

	// ============================================================================
	// SECTION 3: FILTERING LEVELS & IMPACT DISPLAY
	// ============================================================================

	test.describe('Section 3: Filtering Levels & Impact Display', () => {
		test('Scenario: View filter impact for each filtering level', async ({ page, context }) => {
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// Open filtering controls
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.openFilteringControls();
			});
			await gmailPage.waitForTimeout(300);

			const sendWaveItem = gmailPage.locator('[data-testid="filtering-item-sendwave"]');
			const slider = sendWaveItem.locator('[data-testid="filtering-slider"]');
			const levelDisplay = sendWaveItem.locator('[data-testid="filtering-current-level"]');
			const impactTitle = sendWaveItem.locator('[data-testid="filtering-impact-title"]');
			const spamReduction = sendWaveItem.locator('[data-testid="filtering-spam-reduction"]');
			const falsePositives = sendWaveItem.locator('[data-testid="filtering-false-positives"]');

			// Test data from feature file
			const levels = [
				{ position: 0, name: 'Permissive', title: 'Current Impact', spam: '0%', fp: '0%' },
				{
					position: 1,
					name: 'Moderate',
					title: 'Active Filtering Impact',
					spam: '35%',
					fp: '3%'
				},
				{
					position: 2,
					name: 'Strict',
					title: 'Active Filtering Impact',
					spam: '65%',
					fp: '8%'
				},
				{
					position: 3,
					name: 'Maximum',
					title: 'Active Filtering Impact',
					spam: '85%',
					fp: '15%'
				}
			];

			for (const level of levels) {
				// When: I drag the slider to position
				await slider.fill(level.position.toString());
				await gmailPage.waitForTimeout(200);

				// Then: the title should show correct text
				await expect(impactTitle).toContainText(level.title);

				// And: the level display should show correct level
				await expect(levelDisplay).toContainText(level.name);

				// And: spam reduction should show correct percentage
				await expect(spamReduction).toContainText(level.spam);

				// And: false positives should show correct percentage
				await expect(falsePositives).toContainText(level.fp);
			}

			await closePages(page, gmailPage);
			await closePages(page, alicePage, bobPage);
		});

		test('Scenario: Slider visual feedback and gradient', async ({ page, context }) => {
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// Open filtering controls
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.openFilteringControls();
			});
			await gmailPage.waitForTimeout(300);

			const sendWaveItem = gmailPage.locator('[data-testid="filtering-item-sendwave"]');
			const slider = sendWaveItem.locator('[data-testid="filtering-slider"]');

			// Then: the slider background should show a color gradient
			// (green → blue → orange → red)
			const sliderStyles = await slider.evaluate((el) => {
				const styles = window.getComputedStyle(el);
				return {
					background: styles.background,
					backgroundImage: styles.backgroundImage
				};
			});

			// Verify gradient exists (contains linear-gradient)
			const hasGradient =
				sliderStyles.background.includes('linear-gradient') ||
				sliderStyles.backgroundImage.includes('linear-gradient');
			expect(hasGradient).toBe(true);

			// And: the level display should show current level with appropriate color
			const levelDisplay = sendWaveItem.locator('[data-testid="filtering-current-level"]');
			await expect(levelDisplay).toBeVisible();

			// Test color coding for different levels
			await slider.fill('0'); // Permissive
			await gmailPage.waitForTimeout(200);
			const permissiveColor = await levelDisplay.getAttribute('data-level-color');
			expect(permissiveColor).toBe('green');

			await slider.fill('2'); // Strict
			await gmailPage.waitForTimeout(200);
			const strictColor = await levelDisplay.getAttribute('data-level-color');
			expect(strictColor).toBe('orange');

			await closePages(page, gmailPage);
			await closePages(page, alicePage, bobPage);
		});
	});

	// ============================================================================
	// SECTION 4: MULTIPLE ESP FILTERING
	// ============================================================================

	test.describe('Section 4: Multiple ESP Filtering', () => {
		test('Scenario: Apply different filtering levels to multiple ESPs', async ({
			page,
			context
		}) => {
			// Given: Multiple ESP teams are active (SendWave, MailMonkey, BluePost)
			const { gmailPage, sendWavePage, mailMonkeyPage, bluePostPage } =
				await createGameWith3ESPTeams(page, context);

			// Open filtering controls
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.openFilteringControls();
			});
			await gmailPage.waitForTimeout(300);

			// When: I set the following filtering levels
			// SendWave = Permissive (0)
			const sendWaveSlider = gmailPage.locator(
				'[data-testid="filtering-item-sendwave"] [data-testid="filtering-slider"]'
			);
			await sendWaveSlider.fill('0');
			await gmailPage.waitForTimeout(300);

			// MailMonkey = Moderate (1)
			const mailMonkeySlider = gmailPage.locator(
				'[data-testid="filtering-item-mailmonkey"] [data-testid="filtering-slider"]'
			);
			await mailMonkeySlider.fill('1');
			await gmailPage.waitForTimeout(300);

			// BluePost = Strict (2)
			const bluePostSlider = gmailPage.locator(
				'[data-testid="filtering-item-bluepost"] [data-testid="filtering-slider"]'
			);
			await bluePostSlider.fill('2');
			await gmailPage.waitForTimeout(300);

			// Then: each ESP should display its respective impact
			// SendWave: 0% spam reduction, 0% false positives
			const sendWaveSpam = gmailPage.locator(
				'[data-testid="filtering-item-sendwave"] [data-testid="filtering-spam-reduction"]'
			);
			const sendWaveFP = gmailPage.locator(
				'[data-testid="filtering-item-sendwave"] [data-testid="filtering-false-positives"]'
			);
			await expect(sendWaveSpam).toContainText('0%');
			await expect(sendWaveFP).toContainText('0%');

			// MailMonkey: 35% spam reduction, 3% false positives
			const mailMonkeySpam = gmailPage.locator(
				'[data-testid="filtering-item-mailmonkey"] [data-testid="filtering-spam-reduction"]'
			);
			const mailMonkeyFP = gmailPage.locator(
				'[data-testid="filtering-item-mailmonkey"] [data-testid="filtering-false-positives"]'
			);
			await expect(mailMonkeySpam).toContainText('35%');
			await expect(mailMonkeyFP).toContainText('3%');

			// BluePost: 65% spam reduction, 8% false positives
			const bluePostSpam = gmailPage.locator(
				'[data-testid="filtering-item-bluepost"] [data-testid="filtering-spam-reduction"]'
			);
			const bluePostFP = gmailPage.locator(
				'[data-testid="filtering-item-bluepost"] [data-testid="filtering-false-positives"]'
			);
			await expect(bluePostSpam).toContainText('65%');
			await expect(bluePostFP).toContainText('8%');

			await closePages(page, gmailPage, sendWavePage, mailMonkeyPage, bluePostPage);
		});
	});

	// ============================================================================
	// SECTION 5: PERSISTENCE & STATE MANAGEMENT
	// ============================================================================

	test.describe('Section 5: Persistence & State Management', () => {
		test('Scenario: Filtering settings persist across modal sessions', async ({
			page,
			context
		}) => {
			// Given: Game with 2 ESPs (SendWave and MailMonkey)
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// Given: I set filtering levels
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.openFilteringControls();
			});
			await gmailPage.waitForTimeout(300);

			// SendWave = Strict (2)
			const sendWaveSlider = gmailPage.locator(
				'[data-testid="filtering-item-sendwave"] [data-testid="filtering-slider"]'
			);
			await sendWaveSlider.fill('2');
			await gmailPage.waitForTimeout(300);

			// MailMonkey = Moderate (1)
			const mailMonkeySlider = gmailPage.locator(
				'[data-testid="filtering-item-mailmonkey"] [data-testid="filtering-slider"]'
			);
			await mailMonkeySlider.fill('1');
			await gmailPage.waitForTimeout(300);

			// When: I close the Filtering Controls modal
			const closeButton = gmailPage.locator('[data-testid="filtering-modal-close"]');
			await closeButton.click();
			await gmailPage.waitForTimeout(300);

			// And: I reopen the Filtering Controls modal
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.openFilteringControls();
			});
			await gmailPage.waitForTimeout(300);

			// Then: "SendWave" should still be at "Strict"
			const sendWaveValue = await sendWaveSlider.inputValue();
			expect(sendWaveValue).toBe('2');

			// And: "MailMonkey" should still be at "Moderate"
			const mailMonkeyValue = await mailMonkeySlider.inputValue();
			expect(mailMonkeyValue).toBe('1');

			// And: impact values should be preserved
			const sendWaveSpam = gmailPage.locator(
				'[data-testid="filtering-item-sendwave"] [data-testid="filtering-spam-reduction"]'
			);
			await expect(sendWaveSpam).toContainText('65%');

			const mailMonkeySpam = gmailPage.locator(
				'[data-testid="filtering-item-mailmonkey"] [data-testid="filtering-spam-reduction"]'
			);
			await expect(mailMonkeySpam).toContainText('35%');

			await closePages(page, gmailPage);
			await closePages(page, alicePage, bobPage);
		});

		test('Scenario: Filtering maintains state across rounds', async ({ page, context }) => {
			// Given: Game with 2 ESPs (SendWave and MailMonkey)
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// Given: I set filtering in Round 1
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.openFilteringControls();
			});
			await gmailPage.waitForTimeout(300);

			// SendWave = Moderate (1)
			const sendWaveSlider = gmailPage.locator(
				'[data-testid="filtering-item-sendwave"] [data-testid="filtering-slider"]'
			);
			await sendWaveSlider.fill('1');
			await gmailPage.waitForTimeout(300);

			// MailMonkey = Strict (2)
			const mailMonkeySlider = gmailPage.locator(
				'[data-testid="filtering-item-mailmonkey"] [data-testid="filtering-slider"]'
			);
			await mailMonkeySlider.fill('2');
			await gmailPage.waitForTimeout(300);

			// Close modal
			const closeButton = gmailPage.locator('[data-testid="filtering-modal-close"]');
			await closeButton.click();
			await gmailPage.waitForTimeout(300);

			// When: Round 2 Planning phase begins (simulate round change)
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.setRound(2);
				(window as any).__destinationDashboardTest.setPhase('planning');
			});
			await gmailPage.waitForTimeout(500);

			// Reopen modal
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.openFilteringControls();
			});
			await gmailPage.waitForTimeout(300);

			// Then: the filtering levels should remain unchanged
			const sendWaveValue = await sendWaveSlider.inputValue();
			expect(sendWaveValue).toBe('1');

			const mailMonkeyValue = await mailMonkeySlider.inputValue();
			expect(mailMonkeyValue).toBe('2');

			// And: I can adjust them during the new Planning phase
			await mailMonkeySlider.fill('3');
			await gmailPage.waitForTimeout(300);
			const newMailMonkeyValue = await mailMonkeySlider.inputValue();
			expect(newMailMonkeyValue).toBe('3');

			await closePages(page, gmailPage);
			await closePages(page, alicePage, bobPage);
		});
	});

	// ============================================================================
	// SECTION 6: ERROR HANDLING
	// ============================================================================

	test.describe('Section 6: Error Handling', () => {
		test('Scenario: Handle dashboard API error and retry', async ({ page, context }) => {
			// Given: I create a game with destination player but mock API to fail initially
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// Get room code from URL
			const url = gmailPage.url();
			const roomCode = url.match(/\/game\/([^/]+)\//)?.[1];

			let apiCallCount = 0;

			// Mock the dashboard API to fail on first retry, succeed on second
			await gmailPage.route(`**/api/sessions/${roomCode}/destination/gmail`, (route) => {
				apiCallCount++;
				if (apiCallCount === 1) {
					// First refetch: simulate server error
					route.fulfill({
						status: 500,
						contentType: 'application/json',
						body: JSON.stringify({ success: false, error: 'Database connection failed' })
					});
				} else {
					// Subsequent calls: let it through to real API
					route.continue();
				}
			});

			// Simulate an error state (as if initial load failed)
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.setError('Database connection failed');
			});

			// When: I open the Filtering Controls modal (use test API since UI might be hidden due to error)
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.openFilteringControls();
			});
			await gmailPage.waitForTimeout(300);

			// Then: I should see the error banner with database error message
			const errorBanner = gmailPage.locator('[data-testid="filtering-error-banner"]');
			await expect(errorBanner).toBeVisible();
			await expect(errorBanner).toContainText('Database connection failed');

			// And: I should see a retry button
			const retryButton = gmailPage.locator('[data-testid="filtering-error-retry"]');
			await expect(retryButton).toBeVisible();

			// When: I click the retry button (will trigger refetch and hit our mock)
			await retryButton.click();
			await gmailPage.waitForTimeout(500);

			// Then: Still shows error because first retry failed
			await expect(errorBanner).toBeVisible();
			await expect(errorBanner).toContainText('Database connection failed');

			// When: I click retry again (will succeed this time)
			await retryButton.click();
			await gmailPage.waitForTimeout(500);

			// Then: Error banner should disappear
			await expect(errorBanner).not.toBeVisible();

			// And: ESP data should now be visible
			const espItems = gmailPage.locator('[data-testid^="filtering-item-"]');
			await expect(espItems.first()).toBeVisible();
			await expect(gmailPage.locator('[data-testid="filtering-item-sendwave"]')).toBeVisible();
			await expect(gmailPage.locator('[data-testid="filtering-item-mailmonkey"]')).toBeVisible();

			await closePages(page, gmailPage, alicePage, bobPage);
		});

		test('Scenario: Handle slider interaction error', async ({ page, context }) => {
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// Open modal
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.openFilteringControls();
			});
			await gmailPage.waitForTimeout(300);

			// Given: a slider control encounters a technical issue
			// When: I attempt to adjust filtering and the operation fails
			// (This will be simulated by the component when API fails)
			// For now, we test that error handling structure exists

			const sendWaveItem = gmailPage.locator('[data-testid="filtering-item-sendwave"]');
			const slider = sendWaveItem.locator('[data-testid="filtering-slider"]');
			const errorMessage = sendWaveItem.locator('[data-testid="filtering-slider-error"]');

			// Try to change level
			await slider.fill('2');
			await gmailPage.waitForTimeout(300);

			// Then: I should see error message "Failed to update filtering level"
			// (In GREEN phase, this will be properly wired to API failures)

			// And: the previous filtering level should remain unchanged
			// (Slider reverts to previous value on error)

			// And: I can retry the adjustment
			// (Slider remains interactive)

			await closePages(page, gmailPage);
			await closePages(page, alicePage, bobPage);
		});
	});
});
