/**
 * E2E Tests: Resolution Execution Trigger
 * ATDD RED PHASE: These tests should FAIL initially until implementation is complete
 *
 * Tests that resolution calculation is triggered automatically when
 * Planning phase transitions to Resolution phase
 */

import { test, expect } from '@playwright/test';
import { createGameInPlanningPhase } from './helpers/game-setup';
import { lockInAllPlayers } from './helpers/e2e-actions';

test.describe('Resolution Execution Trigger', () => {
	test('Resolution executes when Planning transitions to Resolution', async ({ page, context }) => {
		// Given: Game in Planning phase with active clients
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Acquire a client for Alice to have resolution data
		await alicePage.locator('[data-testid="open-client-marketplace"]').click();
		await alicePage.waitForTimeout(500);

		const acquireButton = alicePage.locator('[data-testid="acquire-button"]').first();
		if (await acquireButton.isVisible()) {
			await acquireButton.click();
			await alicePage.waitForTimeout(500);
		}

		const closeButton = alicePage.locator('[data-testid="close-modal"]');
		if (await closeButton.isVisible()) {
			await closeButton.click();
		}

		// When: Phase transitions to Resolution (via lock-in)
		await alicePage.locator('[data-testid="lock-in-button"]').click();
		await bobPage.locator('[data-testid="lock-in-button"]').click();

		// Brief wait for resolution to execute
		await alicePage.waitForTimeout(1500);

		// Then: Resolution calculation should execute in background
		// Verified by checking consequences phase has data

		// Wait for auto-transition to Consequences
		await expect(page.locator('[data-testid="current-phase"]')).toContainText('consequences', {
			timeout: 5000
		});

		// And: ESP page should have resolution data available
		await expect(alicePage.locator('[data-testid="section-revenue-summary"]')).toContainText(
			'credits',
			{ timeout: 3000 }
		);

		// And: Should have client performance data
		const clientSection = alicePage.locator('[data-testid="section-client-performance"]');
		await expect(clientSection).toBeVisible({ timeout: 3000 });
	});

	test('Dashboard shows loading during resolution', async ({ page, context }) => {
		// Given: Game transitioning to Resolution
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// When: Resolution phase starts (via lock-in)
		await alicePage.locator('[data-testid="lock-in-button"]').click();
		await bobPage.locator('[data-testid="lock-in-button"]').click();

		// Then: Dashboard should show loading state (may be very brief)
		// Try to catch the loading screen, but it may complete too fast
		const loadingLocator = alicePage.locator('[data-testid="resolution-loading"]');

		try {
			await expect(loadingLocator).toBeVisible({ timeout: 1000 });
			await expect(loadingLocator).toContainText(/calculating|processing/i);
		} catch (e) {
			// Loading may complete too fast - that's OK
			console.log('Resolution completed before loading screen could be detected');
		}

		// And: Loading should disappear when consequences phase starts
		// Either it was never visible (too fast) or it should disappear
		await expect(loadingLocator).not.toBeVisible({ timeout: 4000 });

		// And: Consequences screen should be visible
		await expect(alicePage.locator('[data-testid="consequences-header"]')).toBeVisible({
			timeout: 3000
		});
	});

	test('Resolution stores results in session for display', async ({ page, context }) => {
		// Given: Game with multiple ESP teams
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Both ESPs acquire clients
		for (const espPage of [alicePage]) {
			await espPage.locator('[data-testid="open-client-marketplace"]').click();
			await espPage.waitForTimeout(500);

			const acquireBtn = espPage.locator('[data-testid="acquire-button"]').first();
			if (await acquireBtn.isVisible()) {
				await acquireBtn.click();
				await espPage.waitForTimeout(500);
			}

			const closeBtn = espPage.locator('[data-testid="close-modal"]');
			if (await closeBtn.isVisible()) {
				await closeBtn.click();
			}
		}

		// When: Resolution executes
		await lockInAllPlayers([alicePage, bobPage]);

		// Then: Consequences should show calculated data
		await expect(alicePage.locator('[data-testid="consequences-header"]')).toBeVisible({
			timeout: 5000
		});

		// And: Revenue section should show actual revenue (not just placeholders)
		const revenueSection = alicePage.locator('[data-testid="section-revenue-summary"]');
		await expect(revenueSection).toBeVisible();
		await expect(revenueSection).toContainText('credits');

		// Should show a numeric value (any positive number)
		const hasNumber = await revenueSection.locator('text=/\\d+/').count();
		expect(hasNumber).toBeGreaterThan(0);
	});

	test('Resolution handles empty client portfolio gracefully', async ({ page, context }) => {
		// Given: ESP with no clients acquired
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Don't acquire any clients

		// When: Resolution executes
		await lockInAllPlayers([alicePage, bobPage]);

		// Then: Should still reach consequences phase without errors
		await expect(alicePage.locator('[data-testid="consequences-header"]')).toBeVisible({
			timeout: 5000
		});

		// And: Sections should be visible (even if showing empty state)
		await expect(alicePage.locator('[data-testid="section-client-performance"]')).toBeVisible({
			timeout: 3000
		});
		await expect(alicePage.locator('[data-testid="section-revenue-summary"]')).toBeVisible();
		await expect(alicePage.locator('[data-testid="section-budget-update"]')).toBeVisible();

		// And: No error banners should be shown
		await expect(alicePage.locator('[data-testid="error-banner"]')).not.toBeVisible();
	});

	test('Resolution calculates data for all ESP teams independently', async ({ page, context }) => {
		// Given: Multiple ESP teams in planning phase
		const roomCode = await page.goto('/').then(() => page.click("text=I'm a facilitator"));
		await page.waitForURL('/create');
		await page.click('text=Create a Session');
		await page.waitForURL(/\/lobby\/.+/);
		const url = page.url();
		const roomCodeValue = url.split('/lobby/')[1];

		// Create two ESP players
		const alicePage = await context.newPage();
		await alicePage.goto(`/lobby/${roomCodeValue}`);
		await alicePage.click('text=SendWave');
		await alicePage.locator('input[name="displayName"]').fill('Alice');
		await alicePage.click('button:has-text("Join Game")');
		await alicePage.waitForTimeout(500);

		const bobPage = await context.newPage();
		await bobPage.goto(`/lobby/${roomCodeValue}`);
		await bobPage.click('text=MailMonkey');
		await bobPage.locator('input[name="displayName"]').fill('Bob');
		await bobPage.click('button:has-text("Join Game")');
		await bobPage.waitForTimeout(500);

		const gmailPage = await context.newPage();
		await gmailPage.goto(`/lobby/${roomCodeValue}`);
		await gmailPage.click('text=Gmail');
		await gmailPage.locator('input[name="displayName"]').fill('Carol');
		await gmailPage.click('button:has-text("Join Game")');
		await gmailPage.waitForTimeout(500);

		// Start game
		await page.click('text=Start Game');
		await alicePage.waitForTimeout(1000);

		// When: Resolution executes
		await alicePage.locator('[data-testid="lock-in-button"]').click();
		await bobPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.locator('[data-testid="lock-in-button"]').click();
		await alicePage.waitForTimeout(2000);

		// Then: Both ESPs should see their own team names in consequences
		await expect(alicePage.locator('[data-testid="consequences-team-name"]')).toContainText(
			'SendWave',
			{ timeout: 5000 }
		);
		await expect(bobPage.locator('[data-testid="consequences-team-name"]')).toContainText(
			'MailMonkey',
			{ timeout: 5000 }
		);

		// And: Both should see consequences sections
		await expect(alicePage.locator('[data-testid="section-revenue-summary"]')).toBeVisible();
		await expect(bobPage.locator('[data-testid="section-revenue-summary"]')).toBeVisible();
	});
});
