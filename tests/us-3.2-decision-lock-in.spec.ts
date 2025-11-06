/**
 * US-3.2: Decision Lock-In - E2E Tests
 *
 * Tests lock-in functionality including:
 * - Successful lock-in for ESP teams and Destinations
 * - Lock-in button state (enabled/disabled based on budget)
 * - Early lock-in waiting state with player countdown
 * - Auto-lock at timer expiry (with auto-correction)
 * - Transition to Resolution Phase
 * - Lock-in state persistence and read-only dashboards
 * - Comprehensive logging
 *
 * Uses Playwright for end-to-end testing
 * Follows ATDD approach from feature file: features/US-3.2-decision-lock-in.feature
 */

import { test, expect } from '@playwright/test';
import {
	createGameInPlanningPhase,
	createGameWith5ESPTeams,
	createGameWithDestinationPlayer
} from './helpers/game-setup';

// ============================================================================
// SECTION 1: SUCCESSFUL LOCK-IN
// ============================================================================

test.describe('Feature: Decision Lock-In', () => {
	test.describe('Section 1: Successful Lock-In', () => {
		test('Scenario: ESP team successfully locks in valid decisions', async ({ page, context }) => {
			// Given: "SendWave" team has valid decisions
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// And: "SendWave" has budget of 1450 credits
			// And: "SendWave" decisions total 500 credits
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setCredits(1450);
				(window as any).__espDashboardTest.setPendingCosts(500);
			});
			await alicePage.waitForTimeout(500);

			// When: "SendWave" clicks the "Lock In" button
			const lockInButton = alicePage.locator('[data-testid="lock-in-button"]');
			await expect(lockInButton).toBeEnabled();
			await lockInButton.click();
			await alicePage.waitForTimeout(500);

			// Then: "SendWave" decisions should be marked as locked
			// And: "SendWave" dashboard should become read-only
			// And: "SendWave" should see "Locked In ✓" confirmation
			const confirmation = alicePage.locator('[data-testid="lock-in-confirmation"]');
			await expect(confirmation).toBeVisible();
			await expect(confirmation).toContainText('Locked In');

			// And: "SendWave" should see "Waiting for others..." message
			const waitingMessage = alicePage.locator('[data-testid="waiting-message"]');
			await expect(waitingMessage).toBeVisible();
			await expect(waitingMessage).toContainText('Waiting for others');

			// And: game state should show "SendWave" as locked
			// (Verified via WebSocket - implementation will handle this)

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Destination successfully locks in filtering decisions', async ({
			page,
			context
		}) => {
			// Given: "Gmail" has set filtering levels
			const { alicePage, bobPage, gmailPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			// And: "Gmail" has budget of 800 credits
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.setCredits(800);
			});
			await gmailPage.waitForTimeout(500);

			// When: "Gmail" clicks the "Lock In" button
			const lockInButton = gmailPage.locator('[data-testid="lock-in-button"]');
			await expect(lockInButton).toBeEnabled();
			await lockInButton.click();
			await gmailPage.waitForTimeout(500);

			// Then: "Gmail" decisions should be marked as locked
			// And: "Gmail" dashboard should become read-only
			// And: "Gmail" should see "Locked In ✓" confirmation
			const confirmation = gmailPage.locator('[data-testid="lock-in-confirmation"]');
			await expect(confirmation).toBeVisible();
			await expect(confirmation).toContainText('Locked In');

			// And: game state should show "Gmail" as locked
			// (Verified via WebSocket - implementation will handle this)

			await alicePage.close();
			await bobPage.close();
			await gmailPage.close();
		});
	});

	// ============================================================================
	// SECTION 2: LOCK-IN BUTTON STATE
	// ============================================================================

	test.describe('Section 2: Lock-In Button State', () => {
		test('Scenario: Lock-in button is disabled when pending onboarding options exceed budget', async ({
			page,
			context
		}) => {
			// Given: "SendWave" has 150 credits remaining after committed costs
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// Set up: Alice has 1450 total budget, 1300 already spent (committed), 150 remaining
			// And: Alice has selected 3 pending onboarding options:
			//   - Client A: warm-up (150cr) + list hygiene (80cr) = 230cr
			//   - Client B: list hygiene (80cr) = 80cr
			// Total pending: 310cr, but only 150cr remaining → exceeds by 160cr
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setCredits(1450); // Total budget
				(window as any).__espDashboardTest.setSpentCredits(1300); // Already spent (committed)
				// Set pending onboarding options for 3 clients
				(window as any).__espDashboardTest.setPendingOnboarding({
					'client-a': { warmUp: true, listHygiene: true }, // 230cr
					'client-b': { warmUp: false, listHygiene: true } // 80cr
				});
			});
			await alicePage.waitForTimeout(500);

			// Then: "SendWave" should see "Lock In" button as disabled on main dashboard
			const lockInButton = alicePage.locator('[data-testid="lock-in-button"]');
			await expect(lockInButton).toBeDisabled();

			// And: "SendWave" should see budget warning showing 160cr over budget
			const budgetWarning = alicePage.locator('[data-testid="budget-warning"]');
			await expect(budgetWarning).toBeVisible();
			await expect(budgetWarning).toContainText('Budget exceeded');
			await expect(budgetWarning).toContainText('160');

			// When: "SendWave" removes warm-up from Client A (150 credits)
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setPendingOnboarding({
					'client-a': { warmUp: false, listHygiene: true }, // Now 80cr
					'client-b': { warmUp: false, listHygiene: true } // 80cr
				}); // Total now 160cr, still over by 10cr
			});
			await alicePage.waitForTimeout(500);

			// Then: total becomes 1460 credits (still over by 10)
			await expect(lockInButton).toBeDisabled();
			await expect(budgetWarning).toContainText('10'); // Now shows 10cr over

			// When: "SendWave" removes list hygiene from Client B (80 credits)
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setPendingOnboarding({
					'client-a': { warmUp: false, listHygiene: true } // 80cr
					// client-b removed
				}); // Total now 80cr, within budget (150cr remaining)
			});
			await alicePage.waitForTimeout(500);

			// Then: "SendWave" should see "Lock In" button as enabled
			await expect(lockInButton).toBeEnabled();
			// Budget warning should disappear
			await expect(budgetWarning).not.toBeVisible();

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Lock-in button is enabled when budget is within limits', async ({
			page,
			context
		}) => {
			// Given: "SendWave" has budget of 1450 credits
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// And: "SendWave" has decisions totaling 500 credits
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setCredits(1450);
				(window as any).__espDashboardTest.setPendingCosts(500);
			});
			await alicePage.waitForTimeout(500);

			// Then: "SendWave" should see "Lock In" button as enabled
			const lockInButton = alicePage.locator('[data-testid="lock-in-button"]');
			await expect(lockInButton).toBeEnabled();

			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// SECTION 3: EARLY LOCK-IN WAITING
	// ============================================================================

	test.describe('Section 3: Early Lock-In Waiting', () => {
		test('Scenario: First player to lock in sees waiting state', async ({ page, context }) => {
			// Given: Game with 5 ESP teams and 1 destination (6 total players)
			const {
				sendWavePage,
				mailMonkeyPage,
				bluePostPage,
				sendBoltPage,
				rocketMailPage,
				gmailPage
			} = await createGameWith5ESPTeams(page, context);

			// When: "SendWave" locks in their decisions
			const lockInButton = sendWavePage.locator('[data-testid="lock-in-button"]');
			await lockInButton.click();
			await sendWavePage.waitForTimeout(500);

			// Then: "SendWave" should see "Waiting for others..." message
			const waitingMessage = sendWavePage.locator('[data-testid="waiting-message"]');
			await expect(waitingMessage).toBeVisible();
			await expect(waitingMessage).toContainText('Waiting for others');

			// And: "SendWave" should see "5 players remaining"
			const remainingCount = sendWavePage.locator('[data-testid="remaining-players-count"]');
			await expect(remainingCount).toBeVisible();
			await expect(remainingCount).toContainText('5');

			// And: "SendWave" dashboard should remain read-only
			const confirmation = sendWavePage.locator('[data-testid="lock-in-confirmation"]');
			await expect(confirmation).toBeVisible();
			await expect(lockInButton).not.toBeVisible();

			await sendWavePage.close();
			await mailMonkeyPage.close();
			await bluePostPage.close();
			await sendBoltPage.close();
			await rocketMailPage.close();
			await gmailPage.close();
		});

		test('Scenario: Waiting count updates as more players lock in', async ({ page, context }) => {
			// Given: Game with 5 ESP teams and 1 destination
			const {
				sendWavePage,
				mailMonkeyPage,
				bluePostPage,
				sendBoltPage,
				rocketMailPage,
				gmailPage
			} = await createGameWith5ESPTeams(page, context);

			// And: "SendWave" has locked in and sees "5 players remaining"
			const sendWaveLockInButton = sendWavePage.locator('[data-testid="lock-in-button"]');
			await sendWaveLockInButton.click();
			await sendWavePage.waitForTimeout(500);

			const remainingCount = sendWavePage.locator('[data-testid="remaining-players-count"]');
			await expect(remainingCount).toContainText('5');

			// When: "BluePost" locks in their decisions
			const bluePostLockInButton = bluePostPage.locator('[data-testid="lock-in-button"]');
			await bluePostLockInButton.click();
			await bluePostPage.waitForTimeout(500);

			// Then: "SendWave" should see "4 players remaining"
			await expect(remainingCount).toContainText('4', { timeout: 2000 });

			// When: "Gmail" locks in their decisions
			const gmailLockInButton = gmailPage.locator('[data-testid="lock-in-button"]');
			await gmailLockInButton.click();
			await gmailPage.waitForTimeout(500);

			// Then: "SendWave" should see "3 players remaining"
			await expect(remainingCount).toContainText('3', { timeout: 2000 });

			await sendWavePage.close();
			await mailMonkeyPage.close();
			await bluePostPage.close();
			await sendBoltPage.close();
			await rocketMailPage.close();
			await gmailPage.close();
		});
	});

	// ============================================================================
	// SECTION 4: AUTO-LOCK AT TIMER EXPIRY
	// ============================================================================

	test.describe('Section 4: Auto-Lock at Timer Expiry', () => {
		test('Scenario: Warning displayed at 15 seconds remaining', async ({ page, context }) => {
			// Given: Planning Phase timer shows 15 seconds remaining
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// Simulate timer reaching 15 seconds via test API
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setTimerSeconds(15);
			});
			await alicePage.waitForTimeout(500);

			// When: timer reaches exactly 15 seconds
			// Then: all players should see warning message
			const warningMessage = alicePage.locator('[data-testid="timer-warning"]');
			await expect(warningMessage).toBeVisible();
			await expect(warningMessage).toContainText('Decisions will be locked automatically');
			await expect(warningMessage).toContainText('15');

			// And: warning should persist until timer expires
			// (Implementation will handle timer countdown)

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Valid decisions auto-locked when timer reaches zero', async ({
			page,
			context
		}) => {
			// Given: Planning Phase timer reaches 0 seconds
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// And: "SendWave" has not locked in
			// And: "SendWave" has valid decisions totaling 500 credits with budget 1450
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setCredits(1450);
				(window as any).__espDashboardTest.setPendingCosts(500);
			});
			await alicePage.waitForTimeout(500);

			// When: timer expires - trigger auto-lock directly
			const roomCode = await alicePage.evaluate(() => {
				const url = window.location.pathname;
				return url.split('/')[2];
			});
			await alicePage.evaluate(async ({ rc }) => {
				await fetch(`/api/sessions/${rc}/auto-lock`, { method: 'POST' });
			}, { rc: roomCode });
			await alicePage.waitForTimeout(1000);

			// Then: "SendWave" decisions should be auto-locked as-is
			// And: "SendWave" should see "Time's up! Decisions locked automatically"
			const autoLockMessage = alicePage.locator('[data-testid="auto-lock-message"]');
			await expect(autoLockMessage).toBeVisible();
			await expect(autoLockMessage).toContainText("Time's up");
			await expect(autoLockMessage).toContainText('automatically');

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Invalid decisions are corrected during auto-lock (onboarding options exceed budget)', async ({
			page,
			context
		}) => {
			// Given: Planning Phase timer reaches 0 seconds
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// And: "SendWave" has not locked in
			// And: "SendWave" has budget of 1000 credits, already spent 690 (310 remaining)
			// And: pending onboarding costs total 610 credits (3 warm-ups + 2 list hygiene)
			// Total would be 690 + 610 = 1300 credits (exceeding budget by 300)

			// Get room code for API calls
			const roomCode = await alicePage.evaluate(() => {
				const url = window.location.pathname;
				return url.split('/')[2]; // Extract from /game/[roomCode]/esp/sendwave
			});

			// Set up test state via test API
			await alicePage.evaluate(async ({ rc }) => {
				await fetch(`/api/test/set-team-state`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						roomCode: rc,
						teamName: 'SendWave',
						credits: 1000,
						budget: 690, // Already committed costs
						pending_onboarding_decisions: {
							'client-premium': { warmUp: true, listHygiene: true }, // 230cr
							'client-startup': { warmUp: true, listHygiene: true }, // 230cr
							'client-c': { warmUp: true, listHygiene: false } // 150cr
						} // Total: 690 + 610 = 1300 > 1000 (exceeds by 300cr)
					})
				});
			}, { rc: roomCode });
			await alicePage.waitForTimeout(500);

			// When: timer expires - trigger auto-lock directly
			await alicePage.evaluate(async ({ rc }) => {
				await fetch(`/api/sessions/${rc}/auto-lock`, { method: 'POST' });
			}, { rc: roomCode });
			await alicePage.waitForTimeout(1000);

			// Then: system should auto-correct "SendWave" onboarding options to fit budget
			// Auto-correction should remove 2 warm-ups (300cr saved) to bring total within budget
			// And: "SendWave" should see message about removed options
			const autoCorrectMessage = alicePage.locator('[data-testid="auto-lock-message"]');
			await expect(autoCorrectMessage).toBeVisible();
			await expect(autoCorrectMessage).toContainText("Time's up");
			await expect(autoCorrectMessage).toContainText('onboarding options were removed');

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Empty decisions auto-locked when timer reaches zero', async ({
			page,
			context
		}) => {
			// Given: Planning Phase timer reaches 0 seconds
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// And: "SendWave" has not locked in
			// And: "SendWave" has made no decisions
			await alicePage.evaluate(() => {
				(window as any).__espDashboardTest.setPendingCosts(0);
			});
			await alicePage.waitForTimeout(500);

			// When: timer expires - trigger auto-lock directly
			const roomCode = await alicePage.evaluate(() => {
				const url = window.location.pathname;
				return url.split('/')[2];
			});
			await alicePage.evaluate(async ({ rc }) => {
				await fetch(`/api/sessions/${rc}/auto-lock`, { method: 'POST' });
			}, { rc: roomCode });
			await alicePage.waitForTimeout(1000);

			// Then: "SendWave" should be auto-locked with empty decisions
			// And: "SendWave" should see "Time's up! No decisions submitted"
			const autoLockMessage = alicePage.locator('[data-testid="auto-lock-message"]');
			await expect(autoLockMessage).toBeVisible();
			await expect(autoLockMessage).toContainText("Time's up");

			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// SECTION 5: TRANSITION TO RESOLUTION
	// ============================================================================

	test.describe('Section 5: Transition to Resolution', () => {
		test('Scenario: Resolution phase starts when all players lock in before timer', async ({
			page,
			context
		}) => {
			// Given: there are 6 total players (5 ESP + 1 Destination)
			const {
				sendWavePage,
				mailMonkeyPage,
				bluePostPage,
				sendBoltPage,
				rocketMailPage,
				gmailPage
			} = await createGameWith5ESPTeams(page, context);

			// And: Planning Phase timer shows 2:30 remaining (timer still running)

			// And: 5 players have already locked in
			await sendWavePage.locator('[data-testid="lock-in-button"]').click();
			await sendWavePage.waitForTimeout(300);
			await mailMonkeyPage.locator('[data-testid="lock-in-button"]').click();
			await mailMonkeyPage.waitForTimeout(300);
			await bluePostPage.locator('[data-testid="lock-in-button"]').click();
			await bluePostPage.waitForTimeout(300);
			await sendBoltPage.locator('[data-testid="lock-in-button"]').click();
			await sendBoltPage.waitForTimeout(300);
			await rocketMailPage.locator('[data-testid="lock-in-button"]').click();
			await rocketMailPage.waitForTimeout(300);

			// Verify remaining count is 1
			const remainingCount = sendWavePage.locator('[data-testid="remaining-players-count"]');
			await expect(remainingCount).toContainText('1');

			// When: the last player (Gmail) locks in their decisions
			await gmailPage.locator('[data-testid="lock-in-button"]').click();
			await gmailPage.waitForTimeout(1000);

			// Then: Planning Phase should end immediately
			// And: Resolution Phase should start
			// Verify phase transition occurred by checking current phase via test API
			const currentPhase = await sendWavePage.evaluate(() => {
				return (window as any).__espDashboardTest.getCurrentPhase();
			});
			expect(currentPhase).toBe('resolution');

			// And: all players should see "All players locked in - Starting Resolution"
			const transitionMessage = sendWavePage.locator('[data-testid="phase-transition-message"]');
			await expect(transitionMessage).toBeVisible();
			await expect(transitionMessage).toContainText('All players locked in');
			await expect(transitionMessage).toContainText('Resolution');

			await sendWavePage.close();
			await mailMonkeyPage.close();
			await bluePostPage.close();
			await sendBoltPage.close();
			await rocketMailPage.close();
			await gmailPage.close();
		});

		test('Scenario: Resolution phase starts when timer expires', async ({ page, context }) => {
			// Given: Planning Phase timer reaches 0 seconds
			const { alicePage, bobPage, roomCode } = await createGameInPlanningPhase(page, context);

			// And: 1 out of 2 players has locked in
			await alicePage.locator('[data-testid="lock-in-button"]').click();
			await alicePage.waitForTimeout(500);

			// Verify Alice sees waiting state
			const waitingMessage = alicePage.locator('[data-testid="waiting-message"]');
			await expect(waitingMessage).toBeVisible();
			await expect(waitingMessage).toContainText('Waiting for others');

			// When: timer expires and auto-locks remaining players
			// Trigger auto-lock via server-side call (simulating timer expiry)
			await alicePage.evaluate(
				async ({ rc }) => {
					// Call auto-lock endpoint
					await fetch(`/api/sessions/${rc}/auto-lock`, { method: 'POST' });
				},
				{ rc: roomCode }
			);
			await alicePage.waitForTimeout(1000);

			// Then: Planning Phase should end
			// And: Resolution Phase should start
			// Verify phase transition occurred
			const currentPhase = await alicePage.evaluate(() => {
				return (window as any).__espDashboardTest.getCurrentPhase();
			});
			expect(currentPhase).toBe('resolution');

			// And: players should see auto-lock message
			const autoLockMessage = bobPage.locator('[data-testid="auto-lock-message"]');
			await expect(autoLockMessage).toBeVisible();
			await expect(autoLockMessage).toContainText("Time's up");

			await alicePage.close();
			await bobPage.close();
		});
	});

	// ============================================================================
	// SECTION 6: LOCK-IN STATE PERSISTENCE
	// ============================================================================

	test.describe('Section 6: Lock-In State Persistence', () => {
		test('Scenario: Lock-in state persists after disconnection', async ({ page, context }) => {
			// Given: "SendWave" has locked in their decisions
			const { alicePage, bobPage, roomCode } = await createGameInPlanningPhase(page, context);

			await alicePage.locator('[data-testid="lock-in-button"]').click();
			await alicePage.waitForTimeout(500);

			// Verify locked state
			const confirmation = alicePage.locator('[data-testid="lock-in-confirmation"]');
			await expect(confirmation).toBeVisible();

			// When: "SendWave" disconnects from the game
			await alicePage.close();

			// And: "SendWave" reconnects after 10 seconds
			const reconnectedPage = await context.newPage();
			await reconnectedPage.goto(`/game/${roomCode}/esp/sendwave`);
			await reconnectedPage.waitForFunction(
				() => (window as any).__espDashboardTest?.ready === true,
				{},
				{ timeout: 10000 }
			);

			// Then: "SendWave" should still see their locked state
			const reconnectedConfirmation = reconnectedPage.locator(
				'[data-testid="lock-in-confirmation"]'
			);
			await expect(reconnectedConfirmation).toBeVisible();

			// And: "SendWave" dashboard should remain read-only
			const lockInButton = reconnectedPage.locator('[data-testid="lock-in-button"]');
			await expect(lockInButton).not.toBeVisible();

			await reconnectedPage.close();
			await bobPage.close();
		});

		test('Scenario: Cannot unlock once locked in', async ({ page, context }) => {
			// Given: "SendWave" has locked in their decisions
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			await alicePage.locator('[data-testid="lock-in-button"]').click();
			await alicePage.waitForTimeout(500);

			// When: "SendWave" attempts to modify a decision
			// Quick action buttons should remain enabled (to view decisions)
			const clientMarketplaceButton = alicePage.locator('[data-testid="open-client-marketplace"]');
			await expect(clientMarketplaceButton).toBeEnabled();

			// But: When opening the modal, controls should be disabled
			await clientMarketplaceButton.click();
			await alicePage.waitForTimeout(300);

			const marketplaceModal = alicePage.locator('[data-testid="marketplace-modal"]');
			await expect(marketplaceModal).toBeVisible();

			// Then: The "View Only" banner should be visible
			const viewOnlyBanner = alicePage.locator('[data-testid="view-only-banner"]');
			await expect(viewOnlyBanner).toBeVisible();
			await expect(viewOnlyBanner).toContainText('Locked In - View Only');

			// And: All action buttons within modal should be disabled
			const lockedButtons = marketplaceModal.locator('button:has-text("Decisions locked")');
			await expect(lockedButtons.first()).toBeVisible();
			await expect(lockedButtons.first()).toBeDisabled();

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: ESP dashboard becomes read-only after lock-in', async ({ page, context }) => {
			// Given: "SendWave" has acquired at least one client
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// First, acquire a client from the marketplace
			const marketplaceButton = alicePage.locator('[data-testid="open-client-marketplace"]');
			await marketplaceButton.click();

			// Wait for modal to fully open and animations to complete
			await alicePage.waitForSelector('[data-testid="marketplace-modal"]', { state: 'visible' });
			await alicePage.waitForTimeout(500);

			// Acquire the first available client
			const acquireButton = alicePage.locator('button:has-text("Acquire Client")').first();
			await acquireButton.click();
			await alicePage.waitForTimeout(500);

			// Close marketplace modal
			const closeButton = alicePage.locator('[data-testid="close-modal"]').first();
			await closeButton.click();
			await alicePage.waitForTimeout(300);

			// And: "SendWave" has locked in their decisions
			await alicePage.locator('[data-testid="lock-in-button"]').click();
			await alicePage.waitForTimeout(500);

			// When: "SendWave" views their ESP dashboard

			// But: Modals can still be opened for viewing (buttons remain enabled)
			// Try opening portfolio modal
			const portfolioButton = alicePage.locator('[data-testid="open-portfolio"]');
			await expect(portfolioButton).toBeEnabled();
			await portfolioButton.click();
			await alicePage.waitForTimeout(300);

			// Then: Modal should open with "View Only" banner
			const portfolioModal = alicePage.locator('[data-testid="client-management-modal"]');
			await expect(portfolioModal).toBeVisible();

			const viewOnlyBanner = alicePage.locator('[data-testid="view-only-banner"]');
			await expect(viewOnlyBanner).toBeVisible();
			await expect(viewOnlyBanner).toContainText('Locked In - View Only');

			// And: All action buttons within modal should be disabled
			// Check that onboarding checkboxes are disabled
			const warmUpCheckbox = alicePage.locator('[data-testid="warm-up-checkbox"]').first();
			await expect(warmUpCheckbox).toBeDisabled();

			const listHygieneCheckbox = alicePage
				.locator('[data-testid="list-hygiene-checkbox"]')
				.first();
			await expect(listHygieneCheckbox).toBeDisabled();

			// And: Status change buttons should be disabled
			const pauseButton = alicePage.locator('[data-testid="toggle-paused-btn"]').first();
			await expect(pauseButton).toBeDisabled();

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Destination dashboard becomes read-only after lock-in', async ({
			page,
			context
		}) => {
			// Given: "Gmail" has locked in their decisions
			const { alicePage, bobPage, gmailPage } = await createGameWithDestinationPlayer(
				page,
				context
			);

			await gmailPage.locator('[data-testid="lock-in-button"]').click();
			await gmailPage.waitForTimeout(500);

			// When: "Gmail" views their Destination dashboard

			// But: Modals can still be opened for viewing (if clicked programmatically)
			// But: Modals can still be opened for viewing (buttons remain enabled)
			// Click filtering controls button
			await gmailPage.click('[data-testid="filtering-controls-button"]');
			await gmailPage.waitForTimeout(300);

			// Then: Modal should open with "View Only" banner
			const filteringModal = gmailPage.locator('[data-testid="filtering-controls-modal"]');
			await expect(filteringModal).toBeVisible();

			const viewOnlyBanner = gmailPage.locator('[data-testid="view-only-banner"]');
			await expect(viewOnlyBanner).toBeVisible();
			await expect(viewOnlyBanner).toContainText('Locked In - View Only');

			// And: All filtering sliders should be disabled
			const filteringSlider = gmailPage.locator('[data-testid="filtering-slider"]').first();
			await expect(filteringSlider).toBeDisabled();

			await alicePage.close();
			await bobPage.close();
			await gmailPage.close();
		});
	});

	// ============================================================================
	// SECTION 7: LOGGING
	// ============================================================================

	test.describe('Section 7: Logging', () => {
		test('Scenario: Successful lock-in events are logged', async ({ page, context }) => {
			// Given: "SendWave" clicks "Lock In" button
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// When: lock-in succeeds
			await alicePage.locator('[data-testid="lock-in-button"]').click();
			await alicePage.waitForTimeout(500);

			// Then: system should log appropriate messages
			// NOTE: Logging verification will be done in unit tests
			// E2E tests verify the user-facing behavior
			const confirmation = alicePage.locator('[data-testid="lock-in-confirmation"]');
			await expect(confirmation).toBeVisible();

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Auto-lock events are logged', async ({ page, context }) => {
			// Given: Planning Phase timer expires
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// When: auto-lock occurs - trigger auto-lock directly
			const roomCode = await alicePage.evaluate(() => {
				const url = window.location.pathname;
				return url.split('/')[2];
			});
			await alicePage.evaluate(async ({ rc }) => {
				await fetch(`/api/sessions/${rc}/auto-lock`, { method: 'POST' });
			}, { rc: roomCode });
			await alicePage.waitForTimeout(1000);

			// Then: system should log auto-lock events
			// NOTE: Logging verification will be done in unit tests
			const autoLockMessage = alicePage.locator('[data-testid="auto-lock-message"]');
			await expect(autoLockMessage).toBeVisible();

			await alicePage.close();
			await bobPage.close();
		});

		test('Scenario: Auto-correction during auto-lock is logged', async ({ page, context }) => {
			// Given: Planning Phase timer expires
			const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

			// And: "SendWave" has invalid decisions (budget exceeded by pending onboarding options)

			// Get room code for API calls
			const roomCode = await alicePage.evaluate(() => {
				const url = window.location.pathname;
				return url.split('/')[2]; // Extract from /game/[roomCode]/esp/sendwave
			});

			// Set up test state via test API
			await alicePage.evaluate(async ({ rc }) => {
				await fetch(`/api/test/set-team-state`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						roomCode: rc,
						teamName: 'SendWave',
						credits: 1000,
						budget: 690, // Already committed costs
						pending_onboarding_decisions: {
							'client-premium': { warmUp: true, listHygiene: true }, // 230cr
							'client-startup': { warmUp: true, listHygiene: true }, // 230cr
							'client-c': { warmUp: true, listHygiene: false } // 150cr
						} // Total: 690 + 610 = 1300 > 1000 (exceeds by 300cr)
					})
				});
			}, { rc: roomCode });
			await alicePage.waitForTimeout(500);

			// When: auto-lock corrects decisions - trigger auto-lock directly
			await alicePage.evaluate(async ({ rc }) => {
				await fetch(`/api/sessions/${rc}/auto-lock`, { method: 'POST' });
			}, { rc: roomCode });
			await alicePage.waitForTimeout(1000);

			// Then: system should log auto-correction with details
			// NOTE: Detailed logging verification will be done in unit tests
			const autoCorrectMessage = alicePage.locator('[data-testid="auto-lock-message"]');
			await expect(autoCorrectMessage).toBeVisible();
			await expect(autoCorrectMessage).toContainText('removed');

			await alicePage.close();
			await bobPage.close();
		});
	});
});
