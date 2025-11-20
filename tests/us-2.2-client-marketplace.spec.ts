/**
 * US-2.2: Client Marketplace E2E Tests
 * Tests marketplace display, filtering, and client acquisition
 */

import { test, expect } from '@playwright/test';
import {
	createGameInPlanningPhase,
	createGameWith2ESPTeams,
	closePages
} from './helpers/game-setup';
import { openModal, performPurchaseAction, extractBudget } from './helpers/e2e-actions';

test.describe('US-2.2: Client Marketplace', () => {
	test('Scenario: Marketplace displays client details', async ({ page, context }) => {
		const { alicePage } = await createGameInPlanningPhase(page, context);

		// Open marketplace
		await openModal(alicePage, 'open-client-marketplace', 'marketplace-modal');
		await alicePage.getByTestId('client-card').first().waitFor({ state: 'visible', timeout: 5000 });

		// Check that clients are displayed (Round 1 = 9 clients)
		const clientCards = alicePage.getByTestId('client-card');
		await expect(clientCards.first()).toBeVisible();

		// Check first client has all required fields
		const firstCard = clientCards.first();
		await expect(firstCard.getByTestId('client-name')).toBeVisible();
		await expect(firstCard.getByTestId('client-cost')).toBeVisible();
		await expect(firstCard.getByTestId('client-revenue')).toBeVisible();
		await expect(firstCard.getByTestId('client-volume')).toBeVisible();
		await expect(firstCard.getByTestId('client-risk')).toBeVisible();

		await closePages(page, alicePage);
	});

	test('Scenario: Filter clients by risk level', async ({ page, context }) => {
		const { alicePage } = await createGameInPlanningPhase(page, context);

		await openModal(alicePage, 'open-client-marketplace', 'marketplace-modal');
		await alicePage.getByTestId('client-card').first().waitFor({ state: 'visible', timeout: 5000 });

		// Get initial client count
		const allClients = alicePage.getByTestId('client-card');
		const initialCount = await allClients.count();
		expect(initialCount).toBeGreaterThan(0);

		// Filter by Low risk
		await alicePage.getByTestId('filter-risk-low').click();

		// Wait for filter to apply
		await alicePage.waitForTimeout(200);

		// Check that only Low risk clients are shown
		const filteredClients = alicePage.getByTestId('client-card');
		const filteredCount = await filteredClients.count();

		// Should have fewer clients (not all are Low risk)
		if (filteredCount > 0) {
			// Verify all shown clients have Low risk
			for (let i = 0; i < filteredCount; i++) {
				const card = filteredClients.nth(i);
				await expect(card.getByText('Low', { exact: true })).toBeVisible();
			}
		}

		await closePages(page, alicePage);
	});

	test('Scenario: Successfully acquire a client', async ({ page, context }) => {
		test.setTimeout(30000); // Increase timeout for API call
		const { alicePage } = await createGameInPlanningPhase(page, context);

		// Wait for dashboard to load and get initial credits
		const initialCredits = await extractBudget(alicePage, 'budget-current');

		// Open marketplace
		await openModal(alicePage, 'open-client-marketplace', 'marketplace-modal');
		await alicePage.getByTestId('client-card').first().waitFor({ state: 'visible', timeout: 5000 });

		// Get initial count and first client info
		const initialCount = await alicePage.getByTestId('client-card').count();
		const firstCard = alicePage.getByTestId('client-card').first();
		const costText = await firstCard.getByTestId('client-cost').textContent();
		const clientCost = parseInt(costText?.replace(/[^0-9]/g, '') || '0');

		// Acquire client
		await performPurchaseAction(alicePage, firstCard.getByTestId('acquire-button'));

		// Verify client was removed
		const newCount = await alicePage.getByTestId('client-card').count();
		expect(newCount).toBe(initialCount - 1);

		// Close modal
		await alicePage.getByTestId('close-modal').click();

		// Verify credits updated (wait a bit for WebSocket)
		await alicePage.waitForTimeout(1000);
		const newCredits = await extractBudget(alicePage, 'budget-current');

		expect(newCredits).toBe(initialCredits - clientCost);

		await closePages(page, alicePage);
	});

	test('Scenario: Cannot acquire client with insufficient credits', async ({ page, context }) => {
		const { alicePage } = await createGameInPlanningPhase(page, context);

		// Use test API to set low credits
		await alicePage.evaluate(() => {
			if ((window as any).__espDashboardTest) {
				(window as any).__espDashboardTest.setCredits(50);
			}
		});

		await alicePage.waitForTimeout(200);

		// Open marketplace
		await openModal(alicePage, 'open-client-marketplace', 'marketplace-modal');
		await alicePage.getByTestId('client-card').first().waitFor({ state: 'visible', timeout: 5000 });

		// Find expensive client (check multiple cards)
		const cards = alicePage.getByTestId('client-card');
		const count = await cards.count();

		for (let i = 0; i < Math.min(count, 5); i++) {
			const card = cards.nth(i);
			const costText = await card.getByTestId('client-cost').textContent();
			const cost = parseInt(costText?.replace(/[^0-9]/g, '') || '0');

			if (cost > 50) {
				// This client should have disabled button
				const button = card.getByTestId('acquire-button');
				await expect(button).toBeDisabled();
				break;
			}
		}

		await closePages(page, alicePage);
	});

	test('Scenario: Client remains unavailable after acquisition', async ({ page, context }) => {
		test.setTimeout(30000); // Increase timeout for API call
		const { alicePage } = await createGameInPlanningPhase(page, context);

		// Open marketplace and get initial count
		await openModal(alicePage, 'open-client-marketplace', 'marketplace-modal');
		await alicePage.getByTestId('client-card').first().waitFor({ state: 'visible', timeout: 5000 });

		const initialCount = await alicePage.getByTestId('client-card').count();

		// Get first client name
		const firstCard = alicePage.getByTestId('client-card').first();
		const clientName = await firstCard.getByTestId('client-name').textContent();

		// Acquire it
		await performPurchaseAction(alicePage, firstCard.getByTestId('acquire-button'));

		// Close and reopen marketplace
		await alicePage.getByTestId('close-modal').click();
		await alicePage.waitForTimeout(300);
		await openModal(alicePage, 'open-client-marketplace', 'marketplace-modal');
		await alicePage.getByTestId('client-card').first().waitFor({ state: 'visible', timeout: 5000 });

		// Count should be reduced
		const newCount = await alicePage.getByTestId('client-card').count();
		expect(newCount).toBe(initialCount - 1);

		// Acquired client should not be in list
		const clientNames = await alicePage.getByTestId('client-name').allTextContents();
		expect(clientNames).not.toContain(clientName);

		await closePages(page, alicePage);
	});

	test('Scenario: ESP teams have independent client stocks', async ({ page, context }) => {
		test.setTimeout(30000);
		const { alicePage, bobPage } = await createGameWith2ESPTeams(page, context);

		// Alice opens marketplace
		await openModal(alicePage, 'open-client-marketplace', 'marketplace-modal');
		await alicePage.getByTestId('client-card').first().waitFor({ state: 'visible', timeout: 5000 });

		// Get Alice's available clients count
		const aliceCount = await alicePage.getByTestId('client-card').count();

		// Alice acquires a client
		const acquireButton = alicePage
			.getByTestId('client-card')
			.first()
			.getByTestId('acquire-button');
		await performPurchaseAction(alicePage, acquireButton);

		await alicePage.getByTestId('close-modal').click();

		// Bob opens his marketplace
		await openModal(bobPage, 'open-client-marketplace', 'marketplace-modal');
		await bobPage.getByTestId('client-card').first().waitFor({ state: 'visible', timeout: 5000 });

		// Bob should still see all his clients (independent stock)
		const bobCount = await bobPage.getByTestId('client-card').count();
		expect(bobCount).toBe(aliceCount); // Same initial count, Alice's acquisition doesn't affect Bob

		await closePages(page, alicePage, bobPage);
	});
});
