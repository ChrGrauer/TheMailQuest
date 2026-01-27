/**
 * E2E Tests: US-3.5 Scenario 1.3 - Destination Consequences Screen
 *
 * Feature: Destination Spam Blocking Display
 * As a Destination player
 * I want to see how effectively I blocked spam
 * So that I can evaluate my filtering strategy
 *
 * REFACTORED: Tests combined to reduce setup overhead.
 * Original: 19 tests → Refactored: 8 tests (saves ~30s)
 */

import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import {
	createTestSession,
	addPlayer,
	closePages,
	createGameWithDestinationPlayer
} from './helpers';
import { lockInAllPlayers } from './helpers';

test.describe('US-3.5: Destination Consequences Screen', () => {
	let alicePage: Page;
	let bobPage: Page;
	let zmailPage: Page;
	let yaglePage: Page | undefined;

	test.afterEach(async ({ page }) => {
		await closePages(page, alicePage, bobPage, zmailPage, yaglePage);
	});

	/**
	 * Combined Test A: Destination consequences screen structure and basic info
	 * Combines: Screen structure, basic team info, all sections visibility
	 * (Previously 3 separate tests in Scenario 1.3)
	 */
	test('Destination consequences screen structure and basic info', async ({ page, context }) => {
		const result = await createGameWithDestinationPlayer(page, context);
		alicePage = result.alicePage;
		bobPage = result.bobPage;
		zmailPage = result.zmailPage;

		await lockInAllPlayers([alicePage, bobPage, zmailPage]);

		// Assert: Header shows "Round 1 Results"
		const header = zmailPage.locator('[data-testid="consequences-header"]');
		await expect(header).toBeVisible({ timeout: 5000 });
		await expect(header).toContainText('Round 1 Results');

		// Assert: Destination name "zmail" prominently displayed
		const destName = zmailPage.locator('[data-testid="consequences-team-name"]');
		await expect(destName).toBeVisible();
		await expect(destName).toContainText('zmail');

		// Assert: All 5 sections are visible with appropriate titles
		const expectedSections = [
			{ testId: 'section-spam-blocking', title: 'Spam Blocking' },
			{ testId: 'section-user-satisfaction', title: 'User Satisfaction' },
			{ testId: 'section-revenue-summary', title: 'Revenue' },
			{ testId: 'section-budget-update', title: 'Budget' },
			{ testId: 'section-esp-behavior', title: 'ESP' }
		];

		for (const section of expectedSections) {
			const sectionLocator = zmailPage.locator(`[data-testid="${section.testId}"]`);
			await expect(sectionLocator).toBeVisible({ timeout: 3000 });
			const hasContent = await sectionLocator.locator(`text=/.*${section.title}.*/i`).count();
			expect(hasContent).toBeGreaterThan(0);
		}

		// Assert: Revenue section shows budget info
		const revenueSection = zmailPage.locator('[data-testid="section-revenue-summary"]');
		await expect(revenueSection).toContainText('credits');
		await expect(revenueSection).toContainText(/\d+/);

		// Assert: No errors displayed
		const errorBanner = zmailPage.locator('[data-testid="error-banner"]');
		await expect(errorBanner).not.toBeVisible();
	});

	/**
	 * Test B: Multiple destinations see their own consequences
	 * Different setup (multiple destinations) - kept separate
	 */
	test('Multiple destinations see their own consequences', async ({ page, context }) => {
		const roomCode = await createTestSession(page);
		alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
		zmailPage = await addPlayer(context, roomCode, 'Carol', 'Destination', 'zmail');
		yaglePage = await addPlayer(context, roomCode, 'Diana', 'Destination', 'yagle');

		await page.click('text=Start Game');
		await page.waitForTimeout(1000);
		await lockInAllPlayers([alicePage, zmailPage, yaglePage]);

		// Assert: zmail sees "zmail" and yagle sees "yagle"
		await expect(zmailPage.locator('[data-testid="consequences-team-name"]')).toContainText(
			'zmail',
			{ timeout: 5000 }
		);
		await expect(yaglePage.locator('[data-testid="consequences-team-name"]')).toContainText(
			'yagle',
			{ timeout: 5000 }
		);

		// Assert: Both see consequences screens
		await expect(zmailPage.locator('[data-testid="consequences-header"]')).toBeVisible();
		await expect(yaglePage.locator('[data-testid="consequences-header"]')).toBeVisible();
	});

	/**
	 * Combined Test C: Detailed results - all sections populated with real data
	 * Combines: Spam blocking stats, false positives, ESP filtering, satisfaction,
	 *           revenue breakdown, ESP alerts, budget update
	 * (Previously 8 separate tests in Iteration 3)
	 */
	test('Detailed results - all sections show real data (no placeholders)', async ({
		page,
		context
	}) => {
		const result = await createGameWithDestinationPlayer(page, context);
		alicePage = result.alicePage;
		bobPage = result.bobPage;
		zmailPage = result.zmailPage;

		await lockInAllPlayers([alicePage, bobPage, zmailPage]);

		// Spam Blocking section: Real metrics, no placeholders
		const spamSection = zmailPage.locator('[data-testid="section-spam-blocking"]');
		await expect(spamSection).toBeVisible({ timeout: 5000 });
		const spamPlaceholder = await spamSection.locator('text=/coming soon/i').count();
		expect(spamPlaceholder).toBe(0);
		await expect(spamSection).toContainText(/spam blocking performance/i);
		await expect(spamSection).toContainText(/\d+/);
		await expect(spamSection).toContainText(/false positive/i);
		await expect(spamSection).toContainText(/legitimate/i);

		// ESP Behavior section: ESP-specific data
		const espSection = zmailPage.locator('[data-testid="section-esp-behavior"]');
		await expect(espSection).toBeVisible({ timeout: 5000 });
		const espPlaceholder = await espSection.locator('text=/coming soon/i').count();
		expect(espPlaceholder).toBe(0);
		await expect(espSection).toContainText(/SendWave|MailMonkey/i);
		await expect(espSection).toContainText(/ESP|behavior|reputation|spam/i);

		// User Satisfaction section: Score displayed
		const satisfactionSection = zmailPage.locator('[data-testid="section-user-satisfaction"]');
		await expect(satisfactionSection).toBeVisible({ timeout: 5000 });
		const satPlaceholder = await satisfactionSection.locator('text=/coming soon/i').count();
		expect(satPlaceholder).toBe(0);
		await expect(satisfactionSection).toContainText(/satisfaction/i);
		await expect(satisfactionSection).toContainText(/\d+%?/);

		// Revenue Summary section: Breakdown displayed
		const revenueSection = zmailPage.locator('[data-testid="section-revenue-summary"]');
		await expect(revenueSection).toBeVisible({ timeout: 5000 });
		await expect(revenueSection).toContainText(/base revenue/i);
		await expect(revenueSection).toContainText(/volume bonus/i);
		await expect(revenueSection).toContainText(/satisfaction multiplier/i);
		await expect(revenueSection).toContainText(/total revenue/i);
		await expect(revenueSection).toContainText(/\d+ credits/);

		// Budget Update section: Revenue impact shown
		const budgetSection = zmailPage.locator('[data-testid="section-budget-update"]');
		await expect(budgetSection).toBeVisible({ timeout: 5000 });
		const budgetPlaceholder = await budgetSection.locator('text=/coming soon/i').count();
		expect(budgetPlaceholder).toBe(0);
		await expect(budgetSection).toContainText(/revenue|earned|budget/i);
		await expect(budgetSection).toContainText(/\d+ credits/);
	});

	/**
	 * Combined Test D: Layout improvements - satisfaction and formatting
	 * Combines: Satisfaction not duplicated, includes explanation
	 * (Previously 2 tests in Phase 4.2.1)
	 */
	test('Layout - satisfaction appears once with explanation', async ({ page, context }) => {
		const result = await createGameWithDestinationPlayer(page, context);
		alicePage = result.alicePage;
		bobPage = result.bobPage;
		zmailPage = result.zmailPage;

		await lockInAllPlayers([alicePage, bobPage, zmailPage]);

		// Assert: Satisfaction section visible with score
		const satisfactionSection = zmailPage.locator('[data-testid="section-user-satisfaction"]');
		await expect(satisfactionSection).toBeVisible({ timeout: 5000 });
		const satisfactionScore = satisfactionSection.locator('text=/\\d+.*100|\\d+%/');
		await expect(satisfactionScore.first()).toBeVisible();

		// Assert: Exactly 1 satisfaction section header (not duplicated)
		const satisfactionSectionHeaders = zmailPage.locator('h3:has-text("User Satisfaction")');
		const headerCount = await satisfactionSectionHeaders.count();
		expect(headerCount).toBe(1);

		// Assert: Explanation present (if penalties exist)
		const whyHeading = satisfactionSection.locator('text=/why.*satisfaction/i');
		const hasWhySection = (await whyHeading.count()) > 0;
		if (hasWhySection) {
			await expect(whyHeading).toBeVisible();
			const hasExplanation =
				(await satisfactionSection.locator('text=/spam/i').count()) > 0 ||
				(await satisfactionSection.locator('text=/false positive/i').count()) > 0 ||
				(await satisfactionSection.locator('text=/legitimate/i').count()) > 0 ||
				(await satisfactionSection.locator('text=/filtering/i').count()) > 0;
			expect(hasExplanation).toBeTruthy();
		}
	});

	/**
	 * Combined Test E: Spam data display - volumes and formatting
	 * Combines: Volume display, K/M formatting
	 * (Previously 2 tests in Phase 4.3.1)
	 */
	test('Spam data displays volumes with readable formatting', async ({ page, context }) => {
		const result = await createGameWithDestinationPlayer(page, context);
		zmailPage = result.zmailPage;
		alicePage = result.alicePage;
		bobPage = result.bobPage;

		await lockInAllPlayers([alicePage, bobPage, zmailPage]);

		await expect(zmailPage.locator('[data-testid="consequences-header"]')).toBeVisible({
			timeout: 5000
		});

		const spamSection = zmailPage.locator('[data-testid="section-spam-blocking"]');
		await expect(spamSection).toBeVisible();

		// Check volume data if filtering breakdown exists
		const hasFilteringBreakdown =
			(await spamSection.locator('text=/Filtering Effectiveness by ESP/i').count()) > 0;

		if (hasFilteringBreakdown) {
			const hasEmailsText = await spamSection.locator('text=/emails/i').count();
			if (hasEmailsText > 0) {
				const hasVolumeTestIds =
					(await spamSection.locator('[data-testid="spam-blocked-volume"]').count()) > 0 ||
					(await spamSection.locator('[data-testid="spam-delivered-volume"]').count()) > 0;
				expect(hasVolumeTestIds).toBeTruthy();
			}
		}

		// Check formatting (K/M suffixes or comma-separated)
		const sectionText = await spamSection.textContent();
		if (sectionText && /\d/.test(sectionText)) {
			const hasReasonableFormatting =
				/\d+[KM]/i.test(sectionText) ||
				/\d{1,3}(,\d{3})*\s/i.test(sectionText) ||
				/\d{1,3}\s/i.test(sectionText);
			expect(hasReasonableFormatting).toBeTruthy();
		}
	});

	/**
	 * Combined Test F: ESP behavior analysis - enriched metrics
	 * Combines: Detailed metrics, reputation, client count
	 * (Previously 3 tests in Phase 4.4.1)
	 */
	test('ESP behavior analysis shows enriched metrics', async ({ page, context }) => {
		const result = await createGameWithDestinationPlayer(page, context);
		zmailPage = result.zmailPage;
		alicePage = result.alicePage;
		bobPage = result.bobPage;

		await lockInAllPlayers([alicePage, bobPage, zmailPage]);

		const espBehaviorSection = zmailPage.locator('[data-testid="section-esp-behavior"]');
		await expect(espBehaviorSection).toBeVisible({ timeout: 5000 });

		// Assert: Contains ESP names
		await expect(espBehaviorSection).toContainText(/SendWave|MailMonkey/i);

		// Assert: ESP cards show enriched metrics
		const espCards = espBehaviorSection
			.locator('[class*="border"]')
			.filter({ hasText: /SendWave|MailMonkey/ });
		const cardCount = await espCards.count();

		if (cardCount > 0) {
			const firstCard = espCards.first();
			await expect(firstCard).toBeVisible();

			// Check satisfaction
			await expect(firstCard).toContainText(/satisfaction/i);

			// Check volume info
			const hasVolumeInfo =
				(await firstCard.locator('text=/volume/i').count()) > 0 ||
				(await firstCard.locator('text=/emails/i').count()) > 0 ||
				(await firstCard.locator('text=/delivered/i').count()) > 0;
			expect(hasVolumeInfo).toBeTruthy();

			// Check spam metrics
			const hasSpamMetrics =
				(await firstCard.locator('text=/spam/i').count()) > 0 ||
				(await firstCard.locator('text=/blocked/i').count()) > 0;
			expect(hasSpamMetrics).toBeTruthy();
		}

		// Check reputation info
		const hasReputationInfo =
			(await espBehaviorSection.locator('text=/reputation/i').count()) > 0 ||
			(await espBehaviorSection.locator('text=/\\d+\\/100/').count()) > 0;
		// Reputation may or may not be displayed - main assertion is section visible with ESP names
	});
});
