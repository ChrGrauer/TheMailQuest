/**
 * E2E Tests: US-3.5 Scenario 1.3 - Destination Consequences Screen Structure
 * ATDD RED PHASE: These tests should FAIL initially until implementation is complete
 *
 * Feature: Destination Spam Blocking Display
 * As a Destination player
 * I want to see how effectively I blocked spam
 * So that I can evaluate my filtering strategy
 */

import { test, expect } from '@playwright/test';
import { createGameWithDestinationPlayer } from './helpers/game-setup';

test.describe('US-3.5 Scenario 1.3: Destination Consequences Screen Structure', () => {
	test('Destination player sees consequences screen structure', async ({ page, context }) => {
		// Given: I am logged in as Destination player from "Gmail"
		const { roomCode, alicePage, bobPage, gmailPage } = await createGameWithDestinationPlayer(
			page,
			context
		);

		// And: The game transitions to Consequences phase for Round 1
		// Lock in all players to trigger transition
		await alicePage.locator('[data-testid="lock-in-button"]').click();
		await bobPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.waitForTimeout(2000); // Wait for resolution + transition

		// When: I view my consequences screen

		// Then: I should see a header showing "Round 1 Results"
		const header = gmailPage.locator('[data-testid="consequences-header"]');
		await expect(header).toBeVisible({ timeout: 5000 });
		await expect(header).toContainText('Round 1 Results');

		// And: I should see my destination name "Gmail" prominently displayed
		const destName = gmailPage.locator('[data-testid="consequences-team-name"]');
		await expect(destName).toBeVisible();
		await expect(destName).toContainText('Gmail');

		// And: I should see the following sections:
		const expectedSections = [
			{ testId: 'section-spam-blocking', title: 'Spam Blocking' },
			{ testId: 'section-user-satisfaction', title: 'User Satisfaction' },
			{ testId: 'section-revenue-summary', title: 'Revenue' },
			{ testId: 'section-budget-update', title: 'Budget' },
			{ testId: 'section-esp-behavior', title: 'ESP' }
		];

		for (const section of expectedSections) {
			const sectionLocator = gmailPage.locator(`[data-testid="${section.testId}"]`);
			await expect(sectionLocator).toBeVisible({
				timeout: 3000
			});

			// Verify section has some content related to its title
			const hasContent = await sectionLocator.locator(`text=/.*${section.title}.*/i`).count();
			expect(hasContent).toBeGreaterThan(0);
		}

		// And: Each section should have a clear visual container
		// Check that all 5 sections exist
		const sections = await gmailPage.locator('[data-testid^="section-"]').all();
		expect(sections.length).toBeGreaterThanOrEqual(5);
	});

	test('Destination consequences show basic team info', async ({ page, context }) => {
		// Given: Destination with budget
		const { roomCode, alicePage, bobPage, gmailPage } = await createGameWithDestinationPlayer(
			page,
			context
		);

		// Lock in players to trigger consequences
		await alicePage.locator('[data-testid="lock-in-button"]').click();
		await bobPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.waitForTimeout(2000);

		// Then: Should see budget displayed in Revenue Summary
		const revenueSection = gmailPage.locator('[data-testid="section-revenue-summary"]');
		await expect(revenueSection).toBeVisible({ timeout: 5000 });
		await expect(revenueSection).toContainText('credits');

		// Should show some budget value (500 is default Gmail budget)
		await expect(revenueSection).toContainText(/\d+/);

		// And: Placeholder messages for unimplemented sections (US-3.3 Iteration 6 needed)
		const spamSection = gmailPage.locator('[data-testid="section-spam-blocking"]');
		await expect(spamSection).toBeVisible({ timeout: 3000 });

		// Spam section should exist (content may be placeholder)
		const hasPlaceholder =
			(await spamSection.locator('text=/coming soon/i').count()) > 0 ||
			(await spamSection.locator('text=/placeholder/i').count()) > 0 ||
			(await spamSection.locator('text=/requires/i').count()) > 0;

		// It's OK if there's no explicit placeholder text - section just needs to exist
	});

	test('Destination sees all sections even without filtering data', async ({ page, context }) => {
		// Given: Destination in consequences phase
		// (Without US-3.3 Iteration 6, we won't have filtering data)
		const { roomCode, alicePage, bobPage, gmailPage } = await createGameWithDestinationPlayer(
			page,
			context
		);

		await alicePage.locator('[data-testid="lock-in-button"]').click();
		await bobPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.waitForTimeout(2000);

		// Then: All 5 sections should be visible (even if some are placeholders)
		const sections = [
			'section-spam-blocking',
			'section-user-satisfaction',
			'section-revenue-summary',
			'section-budget-update',
			'section-esp-behavior'
		];

		for (const sectionId of sections) {
			const section = gmailPage.locator(`[data-testid="${sectionId}"]`);
			await expect(section).toBeVisible({ timeout: 3000 });
		}

		// And: No errors should be displayed
		const errorBanner = gmailPage.locator('[data-testid="error-banner"]');
		await expect(errorBanner).not.toBeVisible();
	});

	test('Multiple destinations see their own consequences', async ({ page, context }) => {
		// Given: Multiple destinations in game
		const roomCode = await page.goto('/').then(() => page.click("text=I'm a facilitator"));
		await page.waitForURL('/create');
		await page.click('text=Create a Session');
		await page.waitForURL(/\/lobby\/.+/);
		const url = page.url();
		const roomCodeValue = url.split('/lobby/')[1];

		// Create players
		const alicePage = await context.newPage();
		await alicePage.goto(`/lobby/${roomCodeValue}`);
		await alicePage.click('text=SendWave');
		await alicePage.locator('input[name="displayName"]').fill('Alice');
		await alicePage.click('button:has-text("Join Game")');
		await alicePage.waitForTimeout(500);

		const gmailPage = await context.newPage();
		await gmailPage.goto(`/lobby/${roomCodeValue}`);
		await gmailPage.click('text=Gmail');
		await gmailPage.locator('input[name="displayName"]').fill('Carol');
		await gmailPage.click('button:has-text("Join Game")');
		await gmailPage.waitForTimeout(500);

		const yahooPage = await context.newPage();
		await yahooPage.goto(`/lobby/${roomCodeValue}`);
		await yahooPage.click('text=Yahoo');
		await yahooPage.locator('input[name="displayName"]').fill('Diana');
		await yahooPage.click('button:has-text("Join Game")');
		await yahooPage.waitForTimeout(500);

		// Start game
		await page.click('text=Start Game');
		await page.waitForTimeout(1000);

		// Lock in all players
		await alicePage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.locator('[data-testid="lock-in-button"]').click();
		await yahooPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.waitForTimeout(2000);

		// Then: Gmail sees "Gmail" in header
		await expect(gmailPage.locator('[data-testid="consequences-team-name"]')).toContainText(
			'Gmail',
			{ timeout: 5000 }
		);

		// And: Yahoo sees "Yahoo" in header
		await expect(yahooPage.locator('[data-testid="consequences-team-name"]')).toContainText(
			'Yahoo',
			{ timeout: 5000 }
		);

		// And: Both see consequences screens
		await expect(gmailPage.locator('[data-testid="consequences-header"]')).toBeVisible();
		await expect(yahooPage.locator('[data-testid="consequences-header"]')).toBeVisible();
	});
});
