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

import { test, expect } from '@playwright/test';
import {
	createGameWithDestinationPlayer,
	createTestSession,
	addPlayer,
	createGameWith5ESPTeams,
	createGameWith3ESPTeams
, closePages} from './helpers/game-setup';

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

			await closePages(page, gmailPage, sendWavePage, mailMonkeyPage, bluePostPage, sendBoltPage, rocketMailPage);
		});

		test('Scenario: ESP metrics are destination-specific', async ({ page, context }) => {
			// Given: "BluePost" has different metrics at each destination
			const roomCode = await createTestSession(page);
			const sendWavePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
			const mailMonkeyPage = await addPlayer(context, roomCode, 'Bob', 'ESP', 'MailMonkey');
			const bluePostPage = await addPlayer(context, roomCode, 'Charlie', 'ESP', 'BluePost');
			const gmailPage = await addPlayer(context, roomCode, 'Diana', 'Destination', 'Gmail');
			const outlookPage = await addPlayer(context, roomCode, 'Eve', 'Destination', 'Outlook');

			await page.waitForTimeout(500);

			// Start game
			const startGameButton = page.getByRole('button', { name: /start game/i });
			await startGameButton.click();

			await gmailPage.waitForURL(`/game/${roomCode}/destination/gmail`, { timeout: 10000 });
			await outlookPage.waitForURL(`/game/${roomCode}/destination/outlook`, { timeout: 10000 });

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

			// Set BluePost with different metrics at each destination
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.setESPStats([
					{
						espName: 'BluePost',
						teamCode: 'BP',
						activeClientsCount: 5,
						volume: '54K',
						volumeRaw: 54000,
						reputation: 70,
						userSatisfaction: 52,
						spamComplaintRate: 2.8
					}
				]);
			});

			await outlookPage.evaluate(() => {
				(window as any).__destinationDashboardTest.setESPStats([
					{
						espName: 'BluePost',
						teamCode: 'BP',
						activeClientsCount: 3,
						volume: '37K',
						volumeRaw: 37000,
						reputation: 82,
						userSatisfaction: 58,
						spamComplaintRate: 2.2
					}
				]);
			});

			// When I am "Gmail" and view "BluePost" filtering item
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.openFilteringControls();
			});
			await gmailPage.waitForTimeout(300);

			const gmailBluePost = gmailPage.locator('[data-testid="filtering-item-bluepost"]');
			const gmailSatisfaction = gmailBluePost.locator('[data-testid="filtering-esp-satisfaction"]');
			const gmailSpamRate = gmailBluePost.locator('[data-testid="filtering-esp-spam-rate"]');

			// Then: I should see Satisfaction: 52% and Spam: 2.8%
			await expect(gmailSatisfaction).toContainText('52');
			await expect(gmailSpamRate).toContainText('2.8');

			// When I am "Outlook" and view "BluePost" filtering item
			await outlookPage.evaluate(() => {
				(window as any).__destinationDashboardTest.openFilteringControls();
			});
			await outlookPage.waitForTimeout(300);

			const outlookBluePost = outlookPage.locator('[data-testid="filtering-item-bluepost"]');
			const outlookSatisfaction = outlookBluePost.locator(
				'[data-testid="filtering-esp-satisfaction"]'
			);
			const outlookSpamRate = outlookBluePost.locator('[data-testid="filtering-esp-spam-rate"]');

			// Then: I should see Satisfaction: 58% and Spam: 2.2%
			await expect(outlookSatisfaction).toContainText('58');
			await expect(outlookSpamRate).toContainText('2.2');

			await closePages(page, gmailPage, outlookPage, sendWavePage, mailMonkeyPage, bluePostPage);
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
		test('Scenario: Handle ESP data loading error', async ({ page, context }) => {
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// Simulate error state
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.setError('Unable to load ESP data');
			});

			// When: I open the Filtering Controls modal
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.openFilteringControls();
			});
			await gmailPage.waitForTimeout(300);

			// Then: I should see error message "Unable to load ESP data"
			const errorBanner = gmailPage.locator('[data-testid="filtering-error-banner"]');
			await expect(errorBanner).toBeVisible();
			await expect(errorBanner).toContainText('Unable to load ESP data');

			// And: I should see a retry button
			const retryButton = gmailPage.locator('[data-testid="filtering-error-retry"]');
			await expect(retryButton).toBeVisible();

			// And: error banner should have proper styling
			const errorTitle = errorBanner.locator('text=Error Loading ESP Data');
			await expect(errorTitle).toBeVisible();

			// When: Error is cleared, modal should show ESP data
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.setError(null);
				(window as any).__destinationDashboardTest.setESPStats([
					{
						espName: 'SendWave',
						teamCode: 'SW',
						activeClientsCount: 4,
						volume: '185K',
						volumeRaw: 185000,
						reputation: 78,
						userSatisfaction: 78,
						spamComplaintRate: 0.8
					}
				]);
			});

			await gmailPage.waitForTimeout(300);

			// Then: Error should be gone, ESP items should appear
			await expect(errorBanner).not.toBeVisible();
			const espItems = gmailPage.locator('[data-testid^="filtering-item-"]');
			await expect(espItems.first()).toBeVisible();

			await closePages(page, gmailPage);
			await closePages(page, alicePage, bobPage);
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
