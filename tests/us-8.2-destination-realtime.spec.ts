/**
 * E2E Tests for Real-time Destination Updates on Facilitator Dashboard
 */

import { test, expect } from './fixtures';
import { createGameWithDestination, closePages } from './helpers/game-setup';

test.describe('US-8.2: Real-time Destination Updates', () => {
	test('Destination budget and tech update in real-time on facilitator dashboard', async ({
		page,
		context
	}) => {
		// Given: a game with a zmail destination
		// Use alicePage and bobPage as dummy pages to keep createGameWithDestination happy
		const { roomCode, destinationPage, alicePage, bobPage } = await createGameWithDestination(
			page,
			context,
			'zmail'
		);

		// And: facilitator page is open
		const facilitatorPage = page;
		await facilitatorPage.goto(`/game/${roomCode}/facilitator`);
		await facilitatorPage.waitForURL(/\/facilitator/);

		// Wait for facilitator page to load and show zmail
		const zmailRow = facilitatorPage.locator('[data-testid="dest-row-zmail"]');
		await expect(zmailRow).toBeVisible({ timeout: 10000 });

		// Initial budget for zmail should be 500
		await expect(zmailRow.locator('[data-testid="dest-budget"]')).toContainText('500', {
			timeout: 10000
		});

		// When: Destination purchases Content Analysis Filter (costs 300)
		await destinationPage.bringToFront();
		await destinationPage.click('[data-testid="tech-shop-button"]');
		await destinationPage.click(
			'[data-tool-id="content_analysis_filter"] [data-testid="purchase-button"]'
		);

		// Wait for success on destination page
		await expect(destinationPage.locator('[data-testid="success-message"]')).toBeVisible();
		// Then close the tech shop modal
		await destinationPage.click('[data-testid="close-tech-shop"]');

		// Then: Facilitator dashboard should update budget to 200
		await facilitatorPage.bringToFront();
		await expect(zmailRow.locator('[data-testid="dest-budget"]')).toContainText('200', {
			timeout: 10000
		});

		// And: tech tool should show as owned (✓)
		const techCell = zmailRow.locator('[data-testid="dest-tech-tools"]');
		await expect(techCell.locator('[data-testid="tool-content_analysis_filter"]')).toHaveAttribute(
			'data-owned',
			'true'
		);
		await expect(techCell.locator('[data-testid="tool-content_analysis_filter"]')).toContainText(
			'✓'
		);

		// When: Destination locks in
		await destinationPage.bringToFront();
		const lockInButton = destinationPage.locator('[data-testid="lock-in-button"]');
		await expect(lockInButton).toBeVisible();
		await lockInButton.click();

		// Then: Facilitator dashboard should show Destination as "Locked"
		await facilitatorPage.bringToFront();
		await expect(zmailRow.locator('[data-testid="dest-lock-status"]')).toBeVisible({
			timeout: 15000
		});
		await expect(zmailRow.locator('[data-testid="dest-lock-status"]')).toContainText('Locked');

		await closePages(facilitatorPage, destinationPage, alicePage, bobPage);
	});
});
