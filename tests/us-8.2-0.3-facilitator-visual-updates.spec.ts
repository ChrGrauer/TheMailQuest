/**
 * E2E Tests for US-8.2-0.3: Facilitator Dashboard Visual Updates
 *
 * As a facilitator
 * I want to see participant names next to team/destination names
 * So that I know who is playing which role
 *
 * And I want consistent lock-in status styles
 * So that the dashboard looks professional and consistent
 */

import { test, expect } from './fixtures';
import { createGameInPlanningPhase, closePages } from './helpers/game-setup';

test.describe('US-8.2-0.3: Visual Updates', () => {
	test('Dashboard displays participant names', async ({ page, context }) => {
		// Given: a game in planning phase with Alice (SendWave) and Bob (zmail)
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Wait for facilitator page to load
		await page.waitForURL(/\/facilitator/);

		// Check ESP Table for participant name
		const espRow = page.locator('[data-testid="esp-row-SendWave"]');
		await expect(espRow.locator('.team-name')).toContainText('SendWave');
		await expect(espRow.locator('.team-name')).toContainText('(Alice)');

		// Check Destination Table for participant name
		const destRow = page.locator('[data-testid="dest-row-zmail"]');
		await expect(destRow.locator('.dest-name')).toContainText('zmail');
		await expect(destRow.locator('.dest-name')).toContainText('(Bob)');

		await closePages(page, alicePage, bobPage);
	});

	test('Dashboard displays consistent lock-in status for destinations', async ({
		page,
		context
	}) => {
		// Given: a game in planning phase
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		await page.waitForURL(/\/facilitator/);

		// Check Destination Lock-in status style (Plan phase = Planning...)
		const destLockStatus = page.locator(
			'[data-testid="dest-row-zmail"] [data-testid="dest-lock-status"]'
		);
		await expect(destLockStatus).toContainText('Planning...');
		await expect(destLockStatus.locator('.animate-pulse')).toBeVisible();

		// Lock in the destination (via API or UI action if possible, but API is easier/faster if we had a helper)
		// For now, let's just check the "Planning..." state which confirms we aren't using the old badge style
		// (The old style was separate spans with testids, the new one is different structure, but text content is similar)
		// The key is likely checking the class or structure if we want to be very specific,
		// but finding "Planning..." text inside the cell is a good start.

		// Let's verify it does NOT have the old class "bg-slate-100" (old pill style)
		// and HAS "text-amber-500" (new text style matches ESP table "Planning...")
		await expect(destLockStatus.locator('span')).toHaveClass(/text-amber-500/);
		await expect(destLockStatus.locator('span')).not.toHaveClass(/bg-slate-100/);

		await closePages(page, alicePage, bobPage);
	});

	test('Dashboard displays neutral header without budget', async ({ page, context }) => {
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);
		await page.waitForURL(/\/facilitator/);

		const header = page.locator('[data-testid="game-header"]');
		await expect(header).toBeVisible();

		// Check for neutral theme (slate gradient on avatar)
		// Accessing component internal logic is hard, but we can check CSS classes
		const avatar = header.locator('[data-testid="facilitator-avatar"]');
		await expect(avatar).toHaveClass(/from-slate-400/);

		// Check that budget is NOT displayed
		await expect(header.locator('[data-testid="budget-current"]')).not.toBeVisible();

		await closePages(page, alicePage, bobPage);
	});
});
