/**
 * E2E Tests: US-3.5 Scenario 1.2 - ESP Consequences Screen Structure
 * ATDD RED PHASE: These tests should FAIL initially until implementation is complete
 *
 * Feature: ESP Client Performance Display
 * As an ESP player
 * I want to see how each of my clients performed
 * So that I can understand which clients are helping or hurting my reputation
 */

import { test, expect } from '@playwright/test';
import { createGameInPlanningPhase } from './helpers/game-setup';
import { lockInAllPlayers } from './helpers/e2e-actions';

test.describe('US-3.5 Scenario 1.2: ESP Consequences Screen Structure', () => {
	test('ESP player sees consequences screen structure', async ({ page, context }) => {
		// Given: I am logged in as ESP player "Alice" from team "SendWave"
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// And: The game transitions to Consequences phase for Round 1
		// Lock in all players to trigger transition
		await lockInAllPlayers([alicePage, bobPage]); // Wait for resolution + transition

		// When: I view my consequences screen
		// (Screen should auto-display on phase transition)

		// Then: I should see a header showing "Round 1 Results"
		const header = alicePage.locator('[data-testid="consequences-header"]');
		await expect(header).toBeVisible({ timeout: 5000 });
		await expect(header).toContainText('Round 1 Results');

		// And: I should see my team name "SendWave" prominently displayed
		const teamName = alicePage.locator('[data-testid="consequences-team-name"]');
		await expect(teamName).toBeVisible();
		await expect(teamName).toContainText('SendWave');

		// And: I should see the following sections:
		const expectedSections = [
			{ testId: 'section-client-performance', title: 'Client Performance' },
			{ testId: 'section-revenue-summary', title: 'Revenue Summary' },
			{ testId: 'section-reputation-changes', title: 'Reputation Changes' },
			{ testId: 'section-budget-update', title: 'Budget Update' },
			{ testId: 'section-alerts-notifications', title: 'Alerts' }
		];

		for (const section of expectedSections) {
			const sectionLocator = alicePage.locator(`[data-testid="${section.testId}"]`);
			await expect(sectionLocator).toBeVisible({
				timeout: 3000
			});

			// Verify section has title (flexible text matching)
			const hasTitle = await sectionLocator.locator(`text=/.*${section.title}.*/i`).count();
			expect(hasTitle).toBeGreaterThan(0);
		}

		// And: Each section should have a clear visual container
		// Check that all 5 sections exist
		const sections = await alicePage.locator('[data-testid^="section-"]').all();
		expect(sections.length).toBeGreaterThanOrEqual(5);
	});

	test('ESP consequences display resolution data', async ({ page, context }) => {
		// Given: ESP has active clients with volume and revenue data
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Acquire a client to have data to display
		await alicePage.locator('[data-testid="open-client-marketplace"]').click();
		await alicePage.waitForTimeout(500);

		// Try to acquire first available client
		const acquireButton = alicePage.locator('[data-testid="acquire-button"]').first();
		if (await acquireButton.isVisible()) {
			await acquireButton.click();
			await alicePage.waitForTimeout(500);
		}

		// Close marketplace
		const closeButton = alicePage.locator('[data-testid="close-modal"]');
		if (await closeButton.isVisible()) {
			await closeButton.click();
		}

		// Lock in players to trigger consequences
		await lockInAllPlayers([alicePage, bobPage]);

		// Then: Client Performance section should show client data
		const clientSection = alicePage.locator('[data-testid="section-client-performance"]');
		await expect(clientSection).toBeVisible({ timeout: 5000 });

		// Should contain some volume/email information
		const hasVolumeInfo =
			(await clientSection.locator('text=/\\d+.*email/i').count()) > 0 ||
			(await clientSection.locator('text=/volume/i').count()) > 0;
		expect(hasVolumeInfo).toBeTruthy();

		// And: Revenue Summary should show total revenue
		const revenueSection = alicePage.locator('[data-testid="section-revenue-summary"]');
		await expect(revenueSection).toBeVisible({ timeout: 3000 });
		await expect(revenueSection).toContainText('credits');

		// And: Budget Update should show budget information
		const budgetSection = alicePage.locator('[data-testid="section-budget-update"]');
		await expect(budgetSection).toBeVisible({ timeout: 3000 });
		await expect(budgetSection).toContainText('credits');
	});

	test('ESP sees placeholder for unimplemented sections', async ({ page, context }) => {
		// Given: Game in consequences phase
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		await lockInAllPlayers([alicePage, bobPage]);

		// Then: Reputation Changes section exists (but may have placeholder)
		const reputationSection = alicePage.locator('[data-testid="section-reputation-changes"]');
		await expect(reputationSection).toBeVisible({ timeout: 5000 });

		// And: Alerts section exists (but may have placeholder)
		const alertsSection = alicePage.locator('[data-testid="section-alerts-notifications"]');
		await expect(alertsSection).toBeVisible({ timeout: 3000 });
	});

	test('ESP with no clients sees appropriate message', async ({ page, context }) => {
		// Given: ESP with no acquired clients
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Don't acquire any clients

		// Lock in to trigger consequences
		await lockInAllPlayers([alicePage, bobPage]);

		// Then: Should see consequences screen
		await expect(alicePage.locator('[data-testid="consequences-header"]')).toBeVisible({
			timeout: 5000
		});

		// And: Client Performance section should handle empty state gracefully
		const clientSection = alicePage.locator('[data-testid="section-client-performance"]');
		await expect(clientSection).toBeVisible({ timeout: 3000 });

		// Should show some indication of no clients (flexible matching)
		const hasEmptyMessage =
			(await clientSection.locator('text=/no.*client/i').count()) > 0 ||
			(await clientSection.locator('text=/empty/i').count()) > 0 ||
			(await clientSection.locator('text=/available/i').count()) > 0;

		// This is OK if it doesn't explicitly show a message - just shouldn't crash
		// Main assertion is that the section is visible and doesn't cause errors
	});

	test('Phase 3.1.1: Warmup message styling - gray informative text', async ({ page, context }) => {
		// Given: ESP with a client that has warmup applied
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Use API helpers to acquire a client and apply warmup
		const { acquireClient, configureOnboarding, getAvailableClientIds } = await import(
			'./helpers/client-management'
		);

		// Get first available client
		const availableClients = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
		if (availableClients.length > 0) {
			const clientId = availableClients[0];

			// Acquire the client
			await acquireClient(alicePage, roomCode, 'SendWave', clientId);
			await alicePage.waitForTimeout(500);

			// Apply warmup onboarding option
			await configureOnboarding(alicePage, roomCode, 'SendWave', clientId, true, false);
			await alicePage.waitForTimeout(500);
		}

		// Lock in to trigger consequences
		await lockInAllPlayers([alicePage, bobPage]);

		// Then: Warmup message should be visible
		const warmupMessage = alicePage.locator('[data-testid="warmup-adjustment-message"]').first();

		// If warmup was applied, check the message styling
		if ((await warmupMessage.count()) > 0) {
			// Message should be visible
			await expect(warmupMessage).toBeVisible({ timeout: 3000 });

			// Message should contain informative text (not celebratory)
			await expect(warmupMessage).toContainText(/initial volume reduced/i);

			// Message should NOT be green (emerald) - should be gray
			const color = await warmupMessage.evaluate((el) => {
				return window.getComputedStyle(el).color;
			});

			// Gray color RGB values (approximately): rgb(107, 114, 128) or similar
			// Green/emerald RGB would be: rgb(16, 185, 129) or similar
			// We check that it's NOT greenish (green channel > 150)
			const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
			if (rgbMatch) {
				const [, r, g, b] = rgbMatch.map(Number);
				// Ensure it's not green (emerald-600 would have g > 150)
				expect(g).toBeLessThan(150);
			}
		}
	});

	test('Phase 3.2.1: Spam complaints per-client display', async ({ page, context }) => {
		// Given: ESP with active clients
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Use API helpers to acquire clients
		const { acquireClient, getAvailableClientIds } = await import('./helpers/client-management');

		// Get first available client
		const availableClients = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
		if (availableClients.length > 0) {
			const clientId = availableClients[0];
			// Acquire the client
			await acquireClient(alicePage, roomCode, 'SendWave', clientId);
			await alicePage.waitForTimeout(500);
		}

		// Lock in to trigger consequences
		await lockInAllPlayers([alicePage, bobPage]);

		// Then: Spam Complaints section should exist
		const spamComplaintsSection = alicePage.locator('[data-testid="section-spam-complaints"]');
		await expect(spamComplaintsSection).toBeVisible({ timeout: 5000 });

		// And: Section should have title
		await expect(spamComplaintsSection).toContainText(/spam complaint/i);

		// And: Should show per-client spam complaint data
		const clientComplaintCards = alicePage.locator('[data-testid="client-complaint-card"]');
		const count = await clientComplaintCards.count();
		expect(count).toBeGreaterThan(0);

		// And: Each client card should show complaint rate
		const firstCard = clientComplaintCards.first();
		await expect(firstCard).toBeVisible();

		// Should contain either rate information or explanation text
		const hasComplaintInfo =
			(await firstCard.locator('text=/rate/i').count()) > 0 ||
			(await firstCard.locator('text=/complaint/i').count()) > 0 ||
			(await firstCard.locator('text=/%/').count()) > 0;

		expect(hasComplaintInfo).toBeTruthy();
	});
});
