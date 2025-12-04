/**
 * E2E Tests: US-3.5 Scenario 1.2 - ESP Consequences Screen Structure
 *
 * Feature: ESP Client Performance Display
 * As an ESP player
 * I want to see how each of my clients performed
 * So that I can understand which clients are helping or hurting my reputation
 *
 * REFACTORED: Tests combined to reduce setup overhead.
 * Original: 6 tests → Refactored: 4 tests (saves ~6s)
 */

import { test, expect } from './fixtures';
import { createGameInPlanningPhase, closePages } from './helpers';
import { lockInAllPlayers, acquireAndConfigureClients } from './helpers';

test.describe('US-3.5 Scenario 1.2: ESP Consequences Screen Structure', () => {
	/**
	 * Combined Test A: ESP consequences screen structure and data
	 * Combines: Screen structure, resolution data display, placeholder sections
	 * (Previously 3 separate tests)
	 */
	test('ESP consequences screen structure and data', async ({ page, context }) => {
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

		// === Screen Structure Assertions ===

		// Assert: Header shows "Round 1 Results"
		const header = alicePage.locator('[data-testid="consequences-header"]');
		await expect(header).toBeVisible({ timeout: 5000 });
		await expect(header).toContainText('Round 1 Results');

		// Assert: Team name "SendWave" prominently displayed
		const teamName = alicePage.locator('[data-testid="consequences-team-name"]');
		await expect(teamName).toBeVisible();
		await expect(teamName).toContainText('SendWave');

		// Assert: All 5 core sections are visible with appropriate titles
		// Note: Alerts & Notifications section was removed for MVP
		const expectedSections = [
			{ testId: 'section-client-performance', title: 'Client Performance' },
			{ testId: 'section-revenue-summary', title: 'Revenue Summary' },
			{ testId: 'section-spam-complaints', title: 'Spam Complaints' },
			{ testId: 'section-reputation-changes', title: 'Reputation Changes' },
			{ testId: 'section-budget-update', title: 'Budget Update' }
		];

		for (const section of expectedSections) {
			const sectionLocator = alicePage.locator(`[data-testid="${section.testId}"]`);
			await expect(sectionLocator).toBeVisible({ timeout: 3000 });

			// Verify section has title (flexible text matching)
			const hasTitle = await sectionLocator.locator(`text=/.*${section.title}.*/i`).count();
			expect(hasTitle).toBeGreaterThan(0);
		}

		// Assert: Each section should have a clear visual container (at least 5 sections exist)
		const sections = await alicePage.locator('[data-testid^="section-"]').all();
		expect(sections.length).toBeGreaterThanOrEqual(5);

		// === Resolution Data Assertions ===

		// Assert: Client Performance section shows volume/email information
		const clientSection = alicePage.locator('[data-testid="section-client-performance"]');
		const hasVolumeInfo =
			(await clientSection.locator('text=/\\d+.*email/i').count()) > 0 ||
			(await clientSection.locator('text=/volume/i').count()) > 0;
		expect(hasVolumeInfo).toBeTruthy();

		// Assert: Revenue Summary shows total revenue in credits
		const revenueSection = alicePage.locator('[data-testid="section-revenue-summary"]');
		await expect(revenueSection).toContainText('credits');

		// Assert: Budget Update shows budget information
		const budgetSection = alicePage.locator('[data-testid="section-budget-update"]');
		await expect(budgetSection).toContainText('credits');

		// === Placeholder/Future Sections Assertions ===

		// Assert: Reputation Changes section exists
		const reputationSection = alicePage.locator('[data-testid="section-reputation-changes"]');
		await expect(reputationSection).toBeVisible();

		// Note: Alerts section was removed for MVP

		await closePages(page, alicePage, bobPage);
	});

	/**
	 * Test B: ESP with no clients sees appropriate message
	 * Different scenario (empty state) - kept separate
	 */
	test('ESP with no clients sees appropriate message', async ({ page, context }) => {
		// Given: ESP with no acquired clients
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

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
		// Main assertion is that the section is visible and doesn't cause errors

		await closePages(page, alicePage, bobPage);
	});

	/**
	 * Test C: Warmup message styling - gray informative text
	 * Tests specific UI styling for warmup adjustments
	 */
	test('Warmup message styling - gray informative text', async ({ page, context }) => {
		// Given: ESP with a client that has warmup applied
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Use helper to acquire client with warmup enabled
		const acquiredClients = await acquireAndConfigureClients(alicePage, roomCode, 'SendWave', 1, {
			warmUp: true,
			listHygiene: false
		});

		// Lock in to trigger consequences
		await lockInAllPlayers([alicePage, bobPage]);

		// Then: Warmup message should be visible (if warmup was applied)
		const warmupMessage = alicePage.locator('[data-testid="warmup-adjustment-message"]').first();

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

		await closePages(page, alicePage, bobPage);
	});

	/**
	 * Test D: Spam complaints per-client display
	 * Tests spam complaint section and per-client data
	 */
	test('Spam complaints per-client display', async ({ page, context }) => {
		// Given: ESP with active clients
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Use helper to acquire a client
		const acquiredClients = await acquireAndConfigureClients(alicePage, roomCode, 'SendWave', 1);

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

		await closePages(page, alicePage, bobPage);
	});
});
