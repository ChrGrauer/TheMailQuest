import { test, expect } from './fixtures';
import { createGameWithDestinationPlayer, closePages } from './helpers/game-setup';

test('Purchase without explicit loading wait', async ({ page, context }) => {
	const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(page, context);

	// Open modal
	await gmailPage.click('[data-testid="tech-shop-button"]');
	await gmailPage.waitForSelector('[data-testid="tech-shop-modal"]');

	// NO loading spinner wait - let Playwright auto-wait

	// Try to click immediately
	await gmailPage.click('[data-tool-id="content_analysis_filter"] [data-testid="purchase-button"]');

	await gmailPage.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
	await expect(gmailPage.locator('[data-testid="budget-display"]')).toContainText('200');

	await gmailPage.close();
	await alicePage.close();
	await bobPage.close();
});
