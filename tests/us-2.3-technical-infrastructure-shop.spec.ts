/**
 * US-2.3: Technical Infrastructure Shop E2E Tests
 * Tests tech shop display, purchase flow, dependency enforcement, and integration
 */

import { test, expect } from '@playwright/test';
import { createGameInPlanningPhase, closePages } from './helpers/game-setup';

test.describe('US-2.3: Technical Infrastructure Shop', () => {
	// ============================================================================
	// SECTION 1: SHOP DISPLAY AND VISIBILITY
	// ============================================================================

	test('Scenario: Display available technical upgrades in shop', async ({ page, context }) => {
		const { alicePage } = await createGameInPlanningPhase(page, context);

		// Open tech shop
		await alicePage.getByTestId('open-tech-shop').click();

		// Wait for modal to appear
		await alicePage.getByTestId('tech-shop-modal').waitFor({ state: 'visible' });

		// Verify 5 core upgrades are displayed (check for specific upgrade cards)
		await expect(alicePage.getByTestId('upgrade-card-spf')).toBeVisible();
		await expect(alicePage.getByTestId('upgrade-card-dkim')).toBeVisible();
		await expect(alicePage.getByTestId('upgrade-card-dmarc')).toBeVisible();

		// Verify first upgrade has required fields
		const spfCard = alicePage.getByTestId('upgrade-card-spf');
		await expect(spfCard.getByTestId('upgrade-name')).toBeVisible();
		await expect(spfCard.getByTestId('upgrade-cost')).toBeVisible();
		await expect(spfCard.getByTestId('upgrade-description')).toBeVisible();
		await expect(spfCard.getByTestId('upgrade-category')).toBeVisible();

		await closePages(page, alicePage);
	});

	test('Scenario: Display purchase requirements for each upgrade', async ({ page, context }) => {
		const { alicePage } = await createGameInPlanningPhase(page, context);

		await alicePage.getByTestId('open-tech-shop').click();
		await alicePage.getByTestId('tech-shop-modal').waitFor({ state: 'visible' });

		// SPF should show "No requirements"
		const spfCard = alicePage.getByTestId('upgrade-card-spf');
		await expect(spfCard.getByText('No requirements')).toBeVisible();

		// DKIM should show "Requires: SPF Authentication"
		const dkimCard = alicePage.getByTestId('upgrade-card-dkim');
		await expect(dkimCard.getByText(/Requires:.*SPF Authentication/i)).toBeVisible();

		// DMARC Policy should show "Requires: SPF Authentication, DKIM Signature"
		const dmarcCard = alicePage.getByTestId('upgrade-card-dmarc');
		await expect(
			dmarcCard.getByText(/Requires:.*SPF Authentication.*DKIM Signature/i)
		).toBeVisible();

		await closePages(page, alicePage);
	});

	test('Scenario: Highlight DMARC as mandatory from Round 3', async ({ page, context }) => {
		const { alicePage } = await createGameInPlanningPhase(page, context);

		// Set current round to 2 (one round before DMARC becomes mandatory in round 3)
		await alicePage.waitForFunction(
			() => (window as any).__espDashboardTest?.ready === true,
			{},
			{ timeout: 5000 }
		);
		await alicePage.evaluate(() => {
			(window as any).__espDashboardTest.setRound(2);
		});

		await alicePage.getByTestId('open-tech-shop').click();
		await alicePage.getByTestId('tech-shop-modal').waitFor({ state: 'visible' });

		// DMARC should be visually highlighted
		const dmarcCard = alicePage.getByTestId('upgrade-card-dmarc');
		await expect(dmarcCard.getByTestId('mandatory-warning')).toBeVisible();
		await expect(dmarcCard.getByText(/MANDATORY from Round 3/i)).toBeVisible();

		await closePages(page, alicePage);
	});

	// ============================================================================
	// SECTION 2: PURCHASE VALIDATION - DEPENDENCY ENFORCEMENT
	// ============================================================================

	test('Scenario: Enforce purchase order for authentication stack', async ({ page, context }) => {
		test.setTimeout(30000);
		const { alicePage } = await createGameInPlanningPhase(page, context);

		await alicePage.getByTestId('open-tech-shop').click();
		await alicePage.getByTestId('tech-shop-modal').waitFor({ state: 'visible' });

		// Try to purchase DKIM without SPF - should be locked
		const dkimCard = alicePage.getByTestId('upgrade-card-dkim');
		await expect(dkimCard.getByTestId('upgrade-status')).toHaveText('Locked');
		await expect(dkimCard.getByTestId('purchase-button')).toBeDisabled();

		// Purchase SPF first
		const spfCard = alicePage.getByTestId('upgrade-card-spf');
		await spfCard.getByTestId('purchase-button').click();

		// Wait for success
		await alicePage.getByTestId('success-message').waitFor({ state: 'visible', timeout: 15000 });

		// Now DKIM should be unlocked
		await expect(dkimCard.getByTestId('upgrade-status')).toHaveText('Available');
		await expect(dkimCard.getByTestId('purchase-button')).toBeEnabled();

		// DMARC should still be locked
		const dmarcCard = alicePage.getByTestId('upgrade-card-dmarc');
		await expect(dmarcCard.getByTestId('upgrade-status')).toHaveText('Locked');

		await closePages(page, alicePage);
	});

	test('Scenario: Display locked status for upgrades with unmet dependencies', async ({
		page,
		context
	}) => {
		const { alicePage } = await createGameInPlanningPhase(page, context);

		await alicePage.getByTestId('open-tech-shop').click();
		await alicePage.getByTestId('tech-shop-modal').waitFor({ state: 'visible' });

		// DKIM should show Locked status
		const dkimCard = alicePage.getByTestId('upgrade-card-dkim');
		await expect(dkimCard.getByTestId('upgrade-status')).toHaveText('Locked');
		await expect(dkimCard.getByTestId('lock-icon')).toBeVisible();
		await expect(dkimCard.getByTestId('purchase-button')).toBeDisabled();

		// DMARC should show Locked status
		const dmarcCard = alicePage.getByTestId('upgrade-card-dmarc');
		await expect(dmarcCard.getByTestId('upgrade-status')).toHaveText('Locked');
		await expect(dmarcCard.getByTestId('lock-icon')).toBeVisible();
		await expect(dmarcCard.getByTestId('purchase-button')).toBeDisabled();

		// SPF should be Available
		const spfCard = alicePage.getByTestId('upgrade-card-spf');
		await expect(spfCard.getByTestId('upgrade-status')).toHaveText('Available');
		await expect(spfCard.getByTestId('purchase-button')).toBeEnabled();

		await closePages(page, alicePage);
	});

	// ============================================================================
	// SECTION 3: PURCHASE VALIDATION - BUDGET CONSTRAINTS
	// ============================================================================

	test('Scenario: Validate budget before purchase', async ({ page, context }) => {
		test.setTimeout(30000);
		const { alicePage } = await createGameInPlanningPhase(page, context);

		// Set credits to insufficient amount (50 credits, SPF costs 100)
		await alicePage.waitForFunction(
			() => (window as any).__espDashboardTest?.ready === true,
			{},
			{ timeout: 5000 }
		);
		await alicePage.evaluate(() => {
			(window as any).__espDashboardTest.setCredits(50);
		});

		await alicePage.getByTestId('open-tech-shop').click();
		await alicePage.getByTestId('tech-shop-modal').waitFor({ state: 'visible' });

		// SPF purchase button should be disabled
		const spfCard = alicePage.getByTestId('upgrade-card-spf');
		await expect(spfCard.getByTestId('purchase-button')).toBeDisabled();
		await expect(spfCard.getByText(/Insufficient Budget/i)).toBeVisible();

		await closePages(page, alicePage);
	});

	test('Scenario: Budget is deducted immediately upon successful purchase', async ({
		page,
		context
	}) => {
		test.setTimeout(30000);
		const { alicePage } = await createGameInPlanningPhase(page, context);

		// Get initial credits
		await alicePage.getByTestId('budget-current').waitFor({ state: 'visible' });
		const initialCreditsText = await alicePage.getByTestId('budget-current').textContent();
		const initialCredits = parseInt(initialCreditsText?.replace(/[^0-9]/g, '') || '0');

		await alicePage.getByTestId('open-tech-shop').click();
		await alicePage.getByTestId('tech-shop-modal').waitFor({ state: 'visible' });

		// Get SPF cost
		const spfCard = alicePage.getByTestId('upgrade-card-spf');
		const costText = await spfCard.getByTestId('upgrade-cost').textContent();
		const spfCost = parseInt(costText?.replace(/[^0-9]/g, '') || '0');

		// Purchase SPF
		await spfCard.getByTestId('purchase-button').click();

		// Wait for success
		await alicePage.getByTestId('success-message').waitFor({ state: 'visible', timeout: 15000 });

		// Close modal and verify credits deducted
		await alicePage.getByTestId('close-modal').click();

		const updatedCreditsText = await alicePage.getByTestId('budget-current').textContent();
		const updatedCredits = parseInt(updatedCreditsText?.replace(/[^0-9]/g, '') || '0');

		expect(updatedCredits).toBe(initialCredits - spfCost);

		await closePages(page, alicePage);
	});

	// ============================================================================
	// SECTION 4: OWNED UPGRADES STATE
	// ============================================================================

	test('Scenario: Display owned upgrades with distinct visual style', async ({ page, context }) => {
		test.setTimeout(30000);
		const { alicePage } = await createGameInPlanningPhase(page, context);

		await alicePage.getByTestId('open-tech-shop').click();
		await alicePage.getByTestId('tech-shop-modal').waitFor({ state: 'visible' });

		// Purchase SPF
		const spfCard = alicePage.getByTestId('upgrade-card-spf');
		await spfCard.getByTestId('purchase-button').click();
		await alicePage.getByTestId('success-message').waitFor({ state: 'visible', timeout: 15000 });

		// SPF should now show as Owned
		await expect(spfCard.getByTestId('upgrade-status')).toHaveText(/Active|Owned/i);
		await expect(spfCard.getByTestId('owned-checkmark')).toBeVisible();

		// Purchase button should not be visible for owned upgrade
		await expect(spfCard.getByTestId('purchase-button')).not.toBeVisible();

		await closePages(page, alicePage);
	});

	test('Scenario: Owned upgrades unlock dependent upgrades', async ({ page, context }) => {
		test.setTimeout(30000);
		const { alicePage } = await createGameInPlanningPhase(page, context);

		await alicePage.getByTestId('open-tech-shop').click();
		await alicePage.getByTestId('tech-shop-modal').waitFor({ state: 'visible' });

		// DKIM should be locked initially
		const dkimCard = alicePage.getByTestId('upgrade-card-dkim');
		await expect(dkimCard.getByTestId('upgrade-status')).toHaveText('Locked');

		// DMARC should be locked
		const dmarcCard = alicePage.getByTestId('upgrade-card-dmarc');
		await expect(dmarcCard.getByTestId('upgrade-status')).toHaveText('Locked');

		// Purchase SPF
		const spfCard = alicePage.getByTestId('upgrade-card-spf');
		await spfCard.getByTestId('purchase-button').click();
		await alicePage.getByTestId('success-message').waitFor({ state: 'visible', timeout: 15000 });

		// DKIM should now be Available
		await expect(dkimCard.getByTestId('upgrade-status')).toHaveText('Available');
		await expect(dkimCard.getByTestId('purchase-button')).toBeEnabled();

		// But DMARC should still be Locked
		await expect(dmarcCard.getByTestId('upgrade-status')).toHaveText('Locked');

		await closePages(page, alicePage);
	});

	// ============================================================================
	// SECTION 5: INTEGRATION WITH DASHBOARD
	// ============================================================================

	test('Scenario: Dashboard shows current technical infrastructure status', async ({
		page,
		context
	}) => {
		test.setTimeout(30000);
		const { alicePage } = await createGameInPlanningPhase(page, context);

		// Purchase SPF through shop
		await alicePage.getByTestId('open-tech-shop').click();
		await alicePage.getByTestId('tech-shop-modal').waitFor({ state: 'visible' });

		const spfCard = alicePage.getByTestId('upgrade-card-spf');
		await spfCard.getByTestId('purchase-button').click();
		await alicePage.getByTestId('success-message').waitFor({ state: 'visible', timeout: 15000 });

		// Close modal
		await alicePage.getByTestId('close-modal').click();

		// Dashboard's technical infrastructure card should show SPF as Active
		const techInfraCard = alicePage.getByTestId('technical-infrastructure');
		const spfItem = techInfraCard.getByTestId('tech-item-spf');
		await expect(spfItem.getByTestId('tech-icon-checkmark')).toBeVisible();
		await expect(spfItem).toHaveAttribute('data-status', 'active');

		// DMARC should still show as Missing
		const dmarcItem = techInfraCard.getByTestId('tech-item-dmarc');
		await expect(dmarcItem.getByTestId('tech-icon-cross')).toBeVisible();
		await expect(dmarcItem).toHaveAttribute('data-status', 'missing');

		await closePages(page, alicePage);
	});

	test('Scenario: Quick action badge alerts for missing critical upgrades', async ({
		page,
		context
	}) => {
		const { alicePage } = await createGameInPlanningPhase(page, context);

		// Set current round to 2 (one round before DMARC becomes mandatory in round 3)
		await alicePage.waitForFunction(
			() => (window as any).__espDashboardTest?.ready === true,
			{},
			{ timeout: 5000 }
		);
		await alicePage.evaluate(() => {
			(window as any).__espDashboardTest.setRound(2);
		});

		// DMARC warning badge should appear on quick action button
		const techShopButton = alicePage.getByTestId('open-tech-shop');
		await expect(techShopButton.getByText(/DMARC needed/i)).toBeVisible();

		await closePages(page, alicePage);
	});

	// ============================================================================
	// SECTION 6: INDEPENDENT UPGRADES
	// ============================================================================

	test('Scenario: Independent upgrades can be purchased without dependencies', async ({
		page,
		context
	}) => {
		test.setTimeout(30000);
		const { alicePage } = await createGameInPlanningPhase(page, context);

		await alicePage.getByTestId('open-tech-shop').click();
		await alicePage.getByTestId('tech-shop-modal').waitFor({ state: 'visible' });

		// Content Filtering should be available immediately
		const contentFilteringCard = alicePage.getByTestId('upgrade-card-content-filtering');
		await expect(contentFilteringCard.getByTestId('upgrade-status')).toHaveText('Available');
		await expect(contentFilteringCard.getByTestId('purchase-button')).toBeEnabled();

		// Purchase it without any dependencies
		await contentFilteringCard.getByTestId('purchase-button').click();
		await alicePage.getByTestId('success-message').waitFor({ state: 'visible', timeout: 15000 });

		// Should now be owned
		await expect(contentFilteringCard.getByTestId('upgrade-status')).toHaveText(/Active|Owned/i);

		await closePages(page, alicePage);
	});
});
