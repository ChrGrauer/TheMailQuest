import { test, expect } from './fixtures';
import { createGameWithDestinationPlayer, closePages } from './helpers/game-setup';

test('Purchase without explicit loading wait', async ({ page, context }) => {
	const { zmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(page, context);

	// Open modal
	await zmailPage.click('[data-testid="tech-shop-button"]');
	await zmailPage.waitForSelector('[data-testid="tech-shop-modal"]');

	// NO loading spinner wait - let Playwright auto-wait

	// Try to click immediately
	await zmailPage.click('[data-tool-id="content_analysis_filter"] [data-testid="purchase-button"]');

	await zmailPage.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
	await expect(zmailPage.locator('[data-testid="budget-display"]')).toContainText('200');

	await zmailPage.close();
	await alicePage.close();
	await bobPage.close();
});
