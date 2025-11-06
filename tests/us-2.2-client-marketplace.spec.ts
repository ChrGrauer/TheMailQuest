/**
 * US-2.2: Client Marketplace E2E Tests
 * Tests marketplace display, filtering, and client acquisition
 */

import { test, expect } from '@playwright/test';
import { createGameInPlanningPhase, createGameWith2ESPTeams } from './helpers/game-setup';

test.describe('US-2.2: Client Marketplace', () => {
	test('Scenario: Marketplace displays client details', async ({ page, context }) => {
		const { alicePage } = await createGameInPlanningPhase(page, context);

		// Open marketplace
		await alicePage.getByTestId('quick-action-client-marketplace').click();

		// Wait for modal and for clients to load
		await alicePage.getByTestId('marketplace-modal').waitFor({ state: 'visible' });
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

		await alicePage.close();
	});

	test('Scenario: Filter clients by risk level', async ({ page, context }) => {
		const { alicePage } = await createGameInPlanningPhase(page, context);

		await alicePage.getByTestId('quick-action-client-marketplace').click();
		await alicePage.getByTestId('marketplace-modal').waitFor({ state: 'visible' });
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

		await alicePage.close();
	});

	test('Scenario: Successfully acquire a client', async ({ page, context }) => {
		test.setTimeout(30000); // Increase timeout for API call
		const { alicePage } = await createGameInPlanningPhase(page, context);

		// Wait for dashboard to load and get initial credits
		await alicePage.getByTestId('budget-current').waitFor({ state: 'visible' });
		const initialCreditsText = await alicePage.getByTestId('budget-current').textContent();
		const initialCredits = parseInt(initialCreditsText?.replace(/[^0-9]/g, '') || '0');

		// Open marketplace
		await alicePage.getByTestId('quick-action-client-marketplace').click();
		await alicePage.getByTestId('marketplace-modal').waitFor({ state: 'visible' });
		await alicePage.getByTestId('client-card').first().waitFor({ state: 'visible', timeout: 5000 });

		// Get initial count and first client info
		const initialCount = await alicePage.getByTestId('client-card').count();
		const firstCard = alicePage.getByTestId('client-card').first();
		const costText = await firstCard.getByTestId('client-cost').textContent();
		const clientCost = parseInt(costText?.replace(/[^0-9]/g, '') || '0');

		// Click acquire button
		await firstCard.getByTestId('acquire-button').click();

		// Wait for either success or error (with longer timeout for API call)
		const successOrError = await Promise.race([
			alicePage
				.getByTestId('success-message')
				.waitFor({ state: 'visible', timeout: 15000 })
				.then(() => 'success'),
			alicePage
				.getByTestId('error-banner')
				.waitFor({ state: 'visible', timeout: 15000 })
				.then(() => 'error'),
			alicePage.waitForTimeout(15000).then(() => 'timeout')
		]);

		// If error or timeout, capture details and fail
		if (successOrError === 'error') {
			const errorText = await alicePage.getByTestId('error-banner').textContent();
			throw new Error(`Acquisition failed with error: ${errorText}`);
		}
		if (successOrError === 'timeout') {
			// Check if still loading
			const isLoading = await alicePage
				.getByTestId('loading-spinner')
				.isVisible()
				.catch(() => false);
			throw new Error(`Acquisition timed out. Still loading: ${isLoading}`);
		}

		// Verify client was removed
		const newCount = await alicePage.getByTestId('client-card').count();
		expect(newCount).toBe(initialCount - 1);

		// Close modal
		await alicePage.getByTestId('close-modal').click();

		// Verify credits updated (wait a bit for WebSocket)
		await alicePage.waitForTimeout(1000);
		const newCreditsText = await alicePage.getByTestId('budget-current').textContent();
		const newCredits = parseInt(newCreditsText?.replace(/[^0-9]/g, '') || '0');

		expect(newCredits).toBe(initialCredits - clientCost);

		await alicePage.close();
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
		await alicePage.getByTestId('quick-action-client-marketplace').click();
		await alicePage.getByTestId('marketplace-modal').waitFor({ state: 'visible' });
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

		await alicePage.close();
	});

	test('Scenario: Client remains unavailable after acquisition', async ({ page, context }) => {
		test.setTimeout(30000); // Increase timeout for API call
		const { alicePage } = await createGameInPlanningPhase(page, context);

		// Open marketplace and get initial count
		await alicePage.getByTestId('quick-action-client-marketplace').click();
		await alicePage.getByTestId('marketplace-modal').waitFor({ state: 'visible' });
		await alicePage.getByTestId('client-card').first().waitFor({ state: 'visible', timeout: 5000 });

		const initialCount = await alicePage.getByTestId('client-card').count();

		// Get first client name
		const firstCard = alicePage.getByTestId('client-card').first();
		const clientName = await firstCard.getByTestId('client-name').textContent();

		// Acquire it
		await firstCard.getByTestId('acquire-button').click();

		// Wait for either success or error
		const successOrError = await Promise.race([
			alicePage
				.getByTestId('success-message')
				.waitFor({ state: 'visible', timeout: 15000 })
				.then(() => 'success'),
			alicePage
				.getByTestId('error-banner')
				.waitFor({ state: 'visible', timeout: 15000 })
				.then(() => 'error'),
			alicePage.waitForTimeout(15000).then(() => 'timeout')
		]);

		if (successOrError === 'error') {
			const errorText = await alicePage.getByTestId('error-banner').textContent();
			throw new Error(`Acquisition failed with error: ${errorText}`);
		}
		if (successOrError === 'timeout') {
			const isLoading = await alicePage
				.getByTestId('loading-spinner')
				.isVisible()
				.catch(() => false);
			throw new Error(`Acquisition timed out. Still loading: ${isLoading}`);
		}

		// Close and reopen marketplace
		await alicePage.getByTestId('close-modal').click();
		await alicePage.waitForTimeout(300);
		await alicePage.getByTestId('quick-action-client-marketplace').click();
		await alicePage.getByTestId('marketplace-modal').waitFor({ state: 'visible' });
		await alicePage.getByTestId('client-card').first().waitFor({ state: 'visible', timeout: 5000 });

		// Count should be reduced
		const newCount = await alicePage.getByTestId('client-card').count();
		expect(newCount).toBe(initialCount - 1);

		// Acquired client should not be in list
		const clientNames = await alicePage.getByTestId('client-name').allTextContents();
		expect(clientNames).not.toContain(clientName);

		await alicePage.close();
	});

	test('Scenario: ESP teams have independent client stocks', async ({ page, context }) => {
		test.setTimeout(30000);
		const { alicePage, bobPage } = await createGameWith2ESPTeams(page, context);

		// Alice opens marketplace
		await alicePage.getByTestId('quick-action-client-marketplace').click();
		await alicePage.getByTestId('marketplace-modal').waitFor({ state: 'visible' });
		await alicePage.getByTestId('client-card').first().waitFor({ state: 'visible', timeout: 5000 });

		// Get Alice's available clients count
		const aliceCount = await alicePage.getByTestId('client-card').count();

		// Alice acquires a client
		await alicePage.getByTestId('client-card').first().getByTestId('acquire-button').click();

		// Wait for success or error
		const result = await Promise.race([
			alicePage
				.getByTestId('success-message')
				.waitFor({ state: 'visible', timeout: 15000 })
				.then(() => 'success'),
			alicePage
				.getByTestId('error-banner')
				.waitFor({ state: 'visible', timeout: 15000 })
				.then(() => 'error'),
			alicePage.waitForTimeout(15000).then(() => 'timeout')
		]);

		if (result === 'error') {
			const errorText = await alicePage.getByTestId('error-banner').textContent();
			throw new Error(`Alice acquisition failed: ${errorText}`);
		}
		if (result === 'timeout') {
			throw new Error('Alice acquisition timed out');
		}

		await alicePage.getByTestId('close-modal').click();

		// Bob opens his marketplace
		await bobPage.getByTestId('quick-action-client-marketplace').click();
		await bobPage.getByTestId('marketplace-modal').waitFor({ state: 'visible' });
		await bobPage.getByTestId('client-card').first().waitFor({ state: 'visible', timeout: 5000 });

		// Bob should still see all his clients (independent stock)
		const bobCount = await bobPage.getByTestId('client-card').count();
		expect(bobCount).toBe(aliceCount); // Same initial count, Alice's acquisition doesn't affect Bob

		await alicePage.close();
		await bobPage.close();
	});
});
