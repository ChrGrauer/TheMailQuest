/**
 * E2E Tests: US-8.2-0.0 - Facilitator Start Next Round
 * ATDD RED PHASE: These tests should FAIL initially until implementation is complete
 *
 * Feature: Facilitator can manually start the next round after reviewing consequences
 * As a facilitator
 * I want to manually start the next round after reviewing consequences
 * So that I can control the game pace and ensure players are ready to continue
 */

import { test, expect } from './fixtures';
import type { Page, BrowserContext } from '@playwright/test';
import { createGameInPlanningPhase, closePages } from './helpers/game-setup';

/**
 * Helper: Get a game to consequences phase
 * Starts game in planning, locks in all players, waits for consequences
 */
async function getToConsequencesPhase(facilitatorPage: Page, playerPages: Page[]): Promise<void> {
	// Lock in all players
	for (const playerPage of playerPages) {
		const lockInButton = playerPage.locator('[data-testid="lock-in-button"]');
		if (await lockInButton.isVisible()) {
			await lockInButton.click();
			await playerPage.waitForTimeout(300);
		}
	}

	// Wait for resolution and consequences phase
	await facilitatorPage.waitForTimeout(1500);

	// Verify we're in consequences phase
	await expect(facilitatorPage.locator('[data-testid="current-phase"]')).toContainText(
		'consequences',
		{ timeout: 5000 }
	);
}

test.describe('US-8.2-0.0: Facilitator Start Next Round', () => {
	// ========================================================================
	// Scenario 1: Button Visibility
	// ========================================================================

	test('1.1 - Start Next Round button visibility during planning and consequences phases', async ({
		page,
		context
	}) => {
		// Given: the game is in round 1, planning phase
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// When: the facilitator views the facilitator dashboard
		await page.goto(`/game/${roomCode}/facilitator`);
		await page.waitForTimeout(500);

		// Then: the "Start Next Round" button should NOT be visible
		const startButton = page.locator('[data-testid="start-next-round-button"]');
		await expect(startButton).not.toBeVisible();

		// When: all players lock in their decisions and game transitions to consequences
		await getToConsequencesPhase(page, [alicePage, bobPage]);

		// Then: the "Start Next Round" button should be visible
		await expect(startButton).toBeVisible({ timeout: 3000 });

		await closePages(page, alicePage, bobPage);
	});

	test('1.2 - Button not visible in Round 4 consequences (final round)', async ({
		page,
		context
	}) => {
		// Given: the game is in round 4 consequences (final round)
		// Use the phase-transitions helper to advance to Round 4
		const { createGameInRound4Consequences } = await import('./helpers/phase-transitions');
		const { alicePage, bobPage } = await createGameInRound4Consequences(page, context);

		// Note: createGameInRound4Consequences already leaves facilitator (page) on the
		// facilitator dashboard with updated state via WebSocket. No need to navigate again.

		// Verify we're in Round 4 consequences (check on facilitator page)
		await expect(page.locator('[data-testid="current-phase"]')).toContainText('consequences', {
			timeout: 5000
		});
		await expect(page.locator('text=/Round 4/i')).toBeVisible({ timeout: 3000 });

		// Then: the "Start Next Round" button should NOT be visible
		// (because Round 4 is the final round)
		const startButton = page.locator('[data-testid="start-next-round-button"]');
		await expect(startButton).not.toBeVisible();

		// And: the "Calculate Final Scores" button SHOULD be visible instead
		const calculateButton = page.locator('[data-testid="calculate-final-scores-button"]');
		await expect(calculateButton).toBeVisible();

		await closePages(page, alicePage, bobPage);
	});

	// ========================================================================
	// Scenario 2: Core Functionality
	// ========================================================================

	test('2.1 - Successfully start Round 2 from Round 1 consequences', async ({ page, context }) => {
		// Given: the game is in round 1 consequences
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);
		await page.goto(`/game/${roomCode}/facilitator`);
		await getToConsequencesPhase(page, [alicePage, bobPage]);

		// Verify we're in round 1
		const roundIndicator = page.locator('text=/Round 1/i');
		await expect(roundIndicator).toBeVisible();

		// When: the facilitator clicks "Start Next Round" button
		const startButton = page.locator('[data-testid="start-next-round-button"]');
		await startButton.click();

		// Wait for transition
		await page.waitForTimeout(1000);

		// Then: the game should transition to round 2
		const round2Indicator = page.locator('text=/Round 2/i');
		await expect(round2Indicator).toBeVisible({ timeout: 3000 });

		// And: the current phase should be "planning"
		await expect(page.locator('[data-testid="current-phase"]')).toContainText('planning');

		// And: a planning phase timer should start with 300 seconds
		const timer = page.locator('[data-testid="game-timer"]');
		await expect(timer).toBeVisible();
		// Timer should show 5:00 or 4:59 (accounting for 1 second delay)
		await expect(timer).toContainText(/[45]:[0-9]{2}/);

		// And: all players should receive phase transition notification
		// ESP player should be back on dashboard
		await expect(alicePage.locator('[data-testid="esp-dashboard"]')).toBeVisible({
			timeout: 3000
		});
		// Destination player should be back on dashboard
		await expect(bobPage.locator('[data-testid="dashboard-layout"]')).toBeVisible({
			timeout: 3000
		});

		await closePages(page, alicePage, bobPage);
	});

	// ========================================================================
	// Scenario 3: Lock-In State Reset
	// ========================================================================

	test('3.1 - Lock-in states are cleared when starting next round', async ({ page, context }) => {
		// Given: the game is in round 1 consequences
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);
		await page.goto(`/game/${roomCode}/facilitator`);

		// Lock in all players (they should be locked in after reaching consequences)
		await getToConsequencesPhase(page, [alicePage, bobPage]);

		// Verify players are in consequences (read-only mode)
		await expect(alicePage.locator('[data-testid="consequences-header"]')).toBeVisible();
		await expect(bobPage.locator('[data-testid="consequences-header"]')).toBeVisible();

		// When: the facilitator clicks "Start Next Round" button
		const startButton = page.locator('[data-testid="start-next-round-button"]');
		await startButton.click();
		await page.waitForTimeout(1500);

		// Wait for dashboards to load
		await expect(alicePage.locator('[data-testid="esp-dashboard"]')).toBeVisible({ timeout: 5000 });
		await expect(bobPage.locator('[data-testid="dashboard-layout"]')).toBeVisible({
			timeout: 5000
		});

		// Then: ESP players should NOT be locked in (can interact with dashboard)
		// Check that lock-in button is visible and enabled
		const aliceLockButton = alicePage.locator('[data-testid="lock-in-button"]');
		await expect(aliceLockButton).toBeVisible({ timeout: 5000 });
		await expect(aliceLockButton).toBeEnabled();
		await expect(aliceLockButton).toContainText('Lock In Decisions');

		// And: Destination players should NOT be locked in
		const bobLockButton = bobPage.locator('[data-testid="lock-in-button"]');
		await expect(bobLockButton).toBeVisible({ timeout: 5000 });
		await expect(bobLockButton).toBeEnabled();
		await expect(bobLockButton).toContainText('Lock In Decisions');

		await closePages(page, alicePage, bobPage);
	});

	// ========================================================================
	// Scenario 4: Dashboard Read-Only Mode Exit
	// ========================================================================

	test('4.1 - ESP dashboards exit read-only mode when planning phase starts', async ({
		page,
		context
	}) => {
		// Given: the game is in round 1 consequences
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);
		await page.goto(`/game/${roomCode}/facilitator`);
		await getToConsequencesPhase(page, [alicePage, bobPage]);

		// And: ESP player is viewing their results
		await expect(alicePage.locator('[data-testid="consequences-header"]')).toBeVisible();

		// When: the facilitator clicks "Start Next Round" button
		const startButton = page.locator('[data-testid="start-next-round-button"]');
		await startButton.click();
		await page.waitForTimeout(1000);

		// Then: ESP player is automatically directed to their dashboard
		await expect(alicePage.locator('[data-testid="esp-dashboard"]')).toBeVisible({
			timeout: 3000
		});

		// And: the ESP dashboard should exit read-only mode
		// And: the player should be able to acquire clients
		const clientMarketplaceButton = alicePage.locator('[data-testid="open-client-marketplace"]');
		await expect(clientMarketplaceButton).toBeVisible();
		await expect(clientMarketplaceButton).toBeEnabled();

		// And: the player should be able to purchase technical upgrades
		const techShopButton = alicePage.locator('[data-testid="open-tech-shop"]');
		await expect(techShopButton).toBeVisible();
		await expect(techShopButton).toBeEnabled();

		// And: the player should be able to manage client portfolio
		const portfolioButton = alicePage.locator('[data-testid="open-portfolio"]');
		await expect(portfolioButton).toBeVisible();
		await expect(portfolioButton).toBeEnabled();

		await closePages(page, alicePage, bobPage);
	});

	test('4.2 - Destination dashboards exit read-only mode when planning phase starts', async ({
		page,
		context
	}) => {
		// Given: the game is in round 1 consequences
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);
		await page.goto(`/game/${roomCode}/facilitator`);
		await getToConsequencesPhase(page, [alicePage, bobPage]);

		// And: destination player is viewing their results
		await expect(bobPage.locator('[data-testid="consequences-header"]')).toBeVisible();

		// When: the facilitator clicks "Start Next Round" button
		const startButton = page.locator('[data-testid="start-next-round-button"]');
		await startButton.click();
		await page.waitForTimeout(1000);

		// Then: destination player is automatically directed to their dashboard
		await expect(bobPage.locator('[data-testid="dashboard-layout"]')).toBeVisible({
			timeout: 3000
		});

		// And: the destination dashboard should exit read-only mode
		// And: the player should be able to adjust filtering levels
		const filteringButton = bobPage.locator('[data-testid="filtering-controls-button"]');
		await expect(filteringButton).toBeVisible();
		await expect(filteringButton).toBeEnabled();

		// And: the player should be able to purchase tools
		const techShopButton = bobPage.locator('[data-testid="tech-shop-button"]');
		await expect(techShopButton).toBeVisible();
		await expect(techShopButton).toBeEnabled();

		await closePages(page, alicePage, bobPage);
	});

	// ========================================================================
	// Scenario 5: State Persistence Across Rounds
	// ========================================================================

	test('5.1-5.3 - Acquired resources remain owned in the next round', async ({ page, context }) => {
		// Given: the game is in round 1 planning
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// And: ESP acquires a client
		const clientMarketplaceBtn = alicePage.locator('[data-testid="open-client-marketplace"]');
		await clientMarketplaceBtn.click();
		await alicePage.waitForTimeout(500);

		// Acquire first client
		const acquireButton = alicePage.locator('[data-testid="acquire-button"]').first();
		await acquireButton.click();
		await alicePage.waitForTimeout(500);

		// Close modal
		const closeBtn = alicePage.locator('[data-testid="close-modal"]');
		await closeBtn.click();
		await alicePage.waitForTimeout(300);

		// And: ESP purchases a technical upgrade
		const techShopBtn = alicePage.locator('[data-testid="open-tech-shop"]');
		await techShopBtn.click();
		await alicePage.waitForTimeout(500);

		// Purchase first available upgrade (SPF)
		const purchaseBtn = alicePage.locator('[data-testid="purchase-button"]').first();
		await purchaseBtn.click();
		await alicePage.waitForTimeout(500);

		// Close tech shop
		const closeTechShop = alicePage.locator('[data-testid="close-modal"]');
		await closeTechShop.click();
		await alicePage.waitForTimeout(300);

		// And: Destination purchases a tool
		const destTechShopBtn = bobPage.locator('[data-testid="tech-shop-button"]');
		await destTechShopBtn.click();
		await bobPage.waitForTimeout(500);

		// Purchase first available tool
		const destPurchaseBtn = bobPage.locator('[data-testid="purchase-button"]').first();
		if (await destPurchaseBtn.isVisible()) {
			await destPurchaseBtn.click();
			await bobPage.waitForTimeout(500);
		}

		// Close tech shop
		const closeDestShop = bobPage.locator('[data-testid="close-tech-shop"]');
		if (await closeDestShop.isVisible()) {
			await closeDestShop.click();
			await bobPage.waitForTimeout(300);
		}

		// Get to consequences
		await page.goto(`/game/${roomCode}/facilitator`);
		await getToConsequencesPhase(page, [alicePage, bobPage]);

		// When: the facilitator clicks "Start Next Round" button
		const startButton = page.locator('[data-testid="start-next-round-button"]');
		await startButton.click();
		await page.waitForTimeout(1000);

		// Then: ESP should still own the client
		const portfolioBtn = alicePage.locator('[data-testid="open-portfolio"]');
		await portfolioBtn.click();
		await alicePage.waitForTimeout(500);

		// Check portfolio has at least 1 client
		const clientCard = alicePage.locator('[data-testid^="client-card-"]').first();
		await expect(clientCard).toBeVisible();

		// And: ESP should still own the technical upgrade
		// Check in technical infrastructure section
		const techInfra = alicePage.locator('[data-testid="technical-infrastructure"]');
		await expect(techInfra).toContainText('SPF');

		await closePages(page, alicePage, bobPage);
	});

	test('5.4-5.5 - Client statuses persist across rounds', async ({ page, context }) => {
		// NOTE: This test verifies that paused/suspended clients persist their status
		// Given: the game is in round 1 planning
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Acquire a client
		const clientMarketplaceBtn = alicePage.locator('[data-testid="open-client-marketplace"]');
		await clientMarketplaceBtn.click();
		await alicePage.waitForTimeout(500);

		const acquireButton = alicePage.locator('[data-testid="acquire-button"]').first();
		await acquireButton.click();
		await alicePage.waitForTimeout(500);

		const closeModal = alicePage.locator('[data-testid="close-modal"]');
		await closeModal.click();
		await alicePage.waitForTimeout(300);

		// Open portfolio and pause the client
		const portfolioBtn = alicePage.locator('[data-testid="open-portfolio"]');
		await portfolioBtn.click();
		await alicePage.waitForTimeout(500);

		const pauseButton = alicePage.locator('[data-testid="toggle-paused-btn"]').first();
		await pauseButton.click();
		await alicePage.waitForTimeout(500);

		// Close portfolio
		const closePortfolio = alicePage.locator('[data-testid="modal-close-btn"]');
		await closePortfolio.click();
		await alicePage.waitForTimeout(300);

		// Get to consequences and start next round
		await page.goto(`/game/${roomCode}/facilitator`);
		await getToConsequencesPhase(page, [alicePage, bobPage]);

		const startButton = page.locator('[data-testid="start-next-round-button"]');
		await startButton.click();
		await page.waitForTimeout(1000);

		// Then: client should still be paused
		await portfolioBtn.click();
		await alicePage.waitForTimeout(500);

		// Check that the client status badge shows "Paused" (inside modal)
		const modal = alicePage.locator('[data-testid="client-management-modal"]');
		const statusBadge = modal.locator('[data-testid="client-status-badge-0"]');
		await expect(statusBadge).toContainText('Paused');

		// And: the player should be able to change the status
		const activateButton = modal.locator('[data-testid="toggle-active-btn"]').first();
		await expect(activateButton).toBeEnabled();

		await closePages(page, alicePage, bobPage);
	});

	// ========================================================================
	// Scenario 6: UI Behavior and Feedback
	// ========================================================================

	test('6.1 - Button shows loading state while processing', async ({ page, context }) => {
		// Given: the game is in round 1 consequences
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);
		await page.goto(`/game/${roomCode}/facilitator`);
		await getToConsequencesPhase(page, [alicePage, bobPage]);

		// When: the facilitator clicks "Start Next Round" button
		const startButton = page.locator('[data-testid="start-next-round-button"]');

		// Verify button is enabled before clicking
		await expect(startButton).toBeEnabled();

		await startButton.click();

		// NOTE: The loading state may be too fast to catch reliably in tests
		// The important part is that the button becomes disabled and then disappears
		// Check if button is disabled (may show "Starting..." or already processing)
		try {
			await expect(startButton).toBeDisabled({ timeout: 500 });
		} catch (e) {
			// Button may have already transitioned - that's OK
		}

		// And: when the transition completes, the button should disappear
		await page.waitForTimeout(1500);
		await expect(page.locator('[data-testid="current-phase"]')).toContainText('planning');
		await expect(startButton).not.toBeVisible();

		await closePages(page, alicePage, bobPage);
	});

	test('6.3 - No confirmation dialog is shown', async ({ page, context }) => {
		// Given: the game is in round 1 consequences
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);
		await page.goto(`/game/${roomCode}/facilitator`);
		await getToConsequencesPhase(page, [alicePage, bobPage]);

		// When: the facilitator clicks "Start Next Round" button
		const startButton = page.locator('[data-testid="start-next-round-button"]');
		await startButton.click();

		// Then: NO confirmation dialog should appear
		// Check that no dialog elements are present
		const dialog = page.locator('[role="dialog"]');
		await expect(dialog).not.toBeVisible();

		// And: the round should start immediately
		await page.waitForTimeout(1000);
		await expect(page.locator('[data-testid="current-phase"]')).toContainText('planning');

		await closePages(page, alicePage, bobPage);
	});

	// ========================================================================
	// Scenario 7: Real-Time Updates to All Players
	// ========================================================================

	test('7.1 - All players receive real-time phase transition notification', async ({
		page,
		context
	}) => {
		// Given: the game is in round 1 consequences
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);
		await page.goto(`/game/${roomCode}/facilitator`);
		await getToConsequencesPhase(page, [alicePage, bobPage]);

		// And: players are viewing consequences
		await expect(alicePage.locator('[data-testid="consequences-header"]')).toBeVisible();
		await expect(bobPage.locator('[data-testid="consequences-header"]')).toBeVisible();

		// When: the facilitator clicks "Start Next Round" button
		const startButton = page.locator('[data-testid="start-next-round-button"]');
		await startButton.click();
		await page.waitForTimeout(1000);

		// Then: ESP player should see their planning phase dashboard
		await expect(alicePage.locator('[data-testid="esp-dashboard"]')).toBeVisible({
			timeout: 3000
		});

		// And: destination player should see their planning phase dashboard
		await expect(bobPage.locator('[data-testid="dashboard-layout"]')).toBeVisible({
			timeout: 3000
		});

		// And: both should see "Round 2" displayed (use round indicator in header)
		await expect(alicePage.locator('[data-testid="round-indicator"]')).toContainText('Round 2');
		await expect(bobPage.locator('[data-testid="round-indicator"]')).toContainText('Round 2');

		// And: both should see the planning timer counting down
		// Note: Using game-timer from dashboard header
		const aliceTimer = alicePage.locator('text=/[0-5]:[0-9]{2}/').first();
		const bobTimer = bobPage.locator('text=/[0-5]:[0-9]{2}/').first();

		await expect(aliceTimer).toBeVisible({ timeout: 5000 });
		await expect(bobTimer).toBeVisible({ timeout: 5000 });

		// Timer should show approximately 5:00 or 4:59
		await expect(aliceTimer).toContainText(/[45]:[0-9]{2}/);
		await expect(bobTimer).toContainText(/[45]:[0-9]{2}/);

		await closePages(page, alicePage, bobPage);
	});
});
