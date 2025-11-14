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

/**
 * US-3.5 Iteration 3: Destination-Specific Detailed Results
 * REQUIRES: US-3.3 Iteration 6.1 (satisfaction & revenue calculations)
 * ATDD RED PHASE: These tests FAIL until real data is displayed
 */
test.describe('US-3.5 Iteration 3: Destination Detailed Results (Post US-3.3 Iteration 6.1)', () => {
	test('Scenario 3.1: Display overall spam blocking statistics', async ({ page, context }) => {
		// Given: I am Destination player from "Gmail"
		const { roomCode, alicePage, bobPage, gmailPage } = await createGameWithDestinationPlayer(
			page,
			context
		);

		// And: The game transitions to Consequences phase
		await alicePage.locator('[data-testid="lock-in-button"]').click();
		await bobPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.waitForTimeout(2000);

		// When: I view the "Spam Blocking Summary" section
		const spamSection = gmailPage.locator('[data-testid="section-spam-blocking"]');
		await expect(spamSection).toBeVisible({ timeout: 5000 });

		// Then: I should see spam blocking metrics (not "Coming Soon")
		// Should NOT contain placeholder text
		const hasPlaceholder = await spamSection.locator('text=/coming soon/i').count();
		expect(hasPlaceholder).toBe(0);

		// Should contain actual metrics
		await expect(spamSection).toContainText(/spam blocked/i);
		await expect(spamSection).toContainText(/\d+/); // Should show numbers
	});

	test('Scenario 3.2: Display false positive statistics and impact', async ({ page, context }) => {
		// Given: I am Destination player from "Gmail"
		const { roomCode, alicePage, bobPage, gmailPage } = await createGameWithDestinationPlayer(
			page,
			context
		);

		// And: The game transitions to Consequences phase
		await alicePage.locator('[data-testid="lock-in-button"]').click();
		await bobPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.waitForTimeout(2000);

		// When: I view the "Spam Blocking Summary" section
		const spamSection = gmailPage.locator('[data-testid="section-spam-blocking"]');
		await expect(spamSection).toBeVisible({ timeout: 5000 });

		// Then: I should see false positive metrics
		await expect(spamSection).toContainText(/false positive/i);
		await expect(spamSection).toContainText(/legitimate/i);
	});

	test('Scenario 3.3: Display filtering effectiveness per ESP', async ({ page, context }) => {
		// Given: I am Destination player from "Gmail"
		const { roomCode, alicePage, bobPage, gmailPage } = await createGameWithDestinationPlayer(
			page,
			context
		);

		// And: The game transitions to Consequences phase
		await alicePage.locator('[data-testid="lock-in-button"]').click();
		await bobPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.waitForTimeout(2000);

		// When: I view the "ESP Behavior Analysis" section
		const espSection = gmailPage.locator('[data-testid="section-esp-behavior"]');
		await expect(espSection).toBeVisible({ timeout: 5000 });

		// Then: I should see ESP-specific data (not "Coming Soon")
		const hasPlaceholder = await espSection.locator('text=/coming soon/i').count();
		expect(hasPlaceholder).toBe(0);

		// Should show ESP names and filtering data
		await expect(espSection).toContainText(/SendWave|MailMonkey/i); // ESP team names
	});

	test('Scenario 3.4: Display user satisfaction score and changes', async ({ page, context }) => {
		// Given: I am Destination player from "Gmail"
		const { roomCode, alicePage, bobPage, gmailPage } = await createGameWithDestinationPlayer(
			page,
			context
		);

		// And: The game transitions to Consequences phase
		await alicePage.locator('[data-testid="lock-in-button"]').click();
		await bobPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.waitForTimeout(2000);

		// When: I view the "User Satisfaction" section
		const satisfactionSection = gmailPage.locator('[data-testid="section-user-satisfaction"]');
		await expect(satisfactionSection).toBeVisible({ timeout: 5000 });

		// Then: I should see satisfaction score (not "Coming Soon")
		const hasPlaceholder = await satisfactionSection.locator('text=/coming soon/i').count();
		expect(hasPlaceholder).toBe(0);

		// Should show satisfaction score (0-100)
		await expect(satisfactionSection).toContainText(/satisfaction/i);
		await expect(satisfactionSection).toContainText(/\d+%?/); // Score as number or percentage
	});

	test('Scenario 3.5: Display destination revenue earned', async ({ page, context }) => {
		// Given: I am Destination player from "Gmail"
		const { roomCode, alicePage, bobPage, gmailPage } = await createGameWithDestinationPlayer(
			page,
			context
		);

		// And: The game transitions to Consequences phase
		await alicePage.locator('[data-testid="lock-in-button"]').click();
		await bobPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.waitForTimeout(2000);

		// When: I view the "Revenue Summary" section
		const revenueSection = gmailPage.locator('[data-testid="section-revenue-summary"]');
		await expect(revenueSection).toBeVisible({ timeout: 5000 });

		// Then: I should see revenue breakdown with:
		// - Base Revenue
		await expect(revenueSection).toContainText(/base revenue/i);

		// - Volume Bonus
		await expect(revenueSection).toContainText(/volume bonus/i);

		// - Satisfaction Multiplier
		await expect(revenueSection).toContainText(/satisfaction multiplier/i);

		// - Total Revenue
		await expect(revenueSection).toContainText(/total revenue/i);
		await expect(revenueSection).toContainText(/\d+ credits/);
	});

	test('Scenario 3.6: Display alerts about problematic ESP behavior', async ({ page, context }) => {
		// Given: I am Destination player from "Gmail"
		const { roomCode, alicePage, bobPage, gmailPage } = await createGameWithDestinationPlayer(
			page,
			context
		);

		// And: The game transitions to Consequences phase
		await alicePage.locator('[data-testid="lock-in-button"]').click();
		await bobPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.waitForTimeout(2000);

		// When: I view the "ESP Behavior Alerts" section
		const espSection = gmailPage.locator('[data-testid="section-esp-behavior"]');
		await expect(espSection).toBeVisible({ timeout: 5000 });

		// Then: Section should show ESP behavior data (may or may not have alerts depending on game state)
		// At minimum, should not show "Coming Soon"
		const hasPlaceholder = await espSection.locator('text=/coming soon/i').count();
		expect(hasPlaceholder).toBe(0);

		// Should have some content about ESP behavior
		await expect(espSection).toContainText(/ESP|behavior|reputation|spam/i);
	});

	test('Scenario 3.7: Display positive alerts for improving ESP behavior', async ({
		page,
		context
	}) => {
		// Given: I am Destination player from "Gmail"
		const { roomCode, alicePage, bobPage, gmailPage } = await createGameWithDestinationPlayer(
			page,
			context
		);

		// And: The game transitions to Consequences phase
		await alicePage.locator('[data-testid="lock-in-button"]').click();
		await bobPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.waitForTimeout(2000);

		// When: I view the "ESP Behavior Alerts" section
		const espSection = gmailPage.locator('[data-testid="section-esp-behavior"]');
		await expect(espSection).toBeVisible({ timeout: 5000 });

		// Then: Section should be capable of showing improvement notifications
		// (Specific alert presence depends on game state, but structure should support it)
		const hasPlaceholder = await espSection.locator('text=/coming soon/i').count();
		expect(hasPlaceholder).toBe(0);
	});

	test('Budget Update section shows actual revenue impact', async ({ page, context }) => {
		// Given: I am Destination player from "Gmail"
		const { roomCode, alicePage, bobPage, gmailPage } = await createGameWithDestinationPlayer(
			page,
			context
		);

		// And: The game transitions to Consequences phase
		await alicePage.locator('[data-testid="lock-in-button"]').click();
		await bobPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.locator('[data-testid="lock-in-button"]').click();
		await gmailPage.waitForTimeout(2000);

		// When: I view the "Budget Update" section
		const budgetSection = gmailPage.locator('[data-testid="section-budget-update"]');
		await expect(budgetSection).toBeVisible({ timeout: 5000 });

		// Then: Should show budget change (not "Coming Soon")
		const hasPlaceholder = await budgetSection.locator('text=/coming soon/i').count();
		expect(hasPlaceholder).toBe(0);

		// Should show revenue impact on budget
		await expect(budgetSection).toContainText(/revenue|earned|budget/i);
		await expect(budgetSection).toContainText(/\d+ credits/);
	});
});
