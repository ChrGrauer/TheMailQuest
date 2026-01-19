/**
 * E2E Tests: Incident Cards Phase 1 MVP
 *
 * Tests complete user flows for incident card system:
 * - Facilitator triggering incidents
 * - All players seeing incident cards
 * - Effects being applied to game state
 * - Automatic DMARC trigger at Round 3
 * - Incident history tracking
 *
 * These tests should FAIL initially (RED phase of ATDD)
 */

import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import {
	createGameInPlanningPhase,
	createGameWithDestinationPlayer,
	closePages
} from './helpers/game-setup';
import { advanceToRound, lockInAllPlayers, triggerIncident } from './helpers/e2e-actions';

test.describe('Incident Cards Phase 1: Manual Triggering', () => {
	let alicePage: Page;
	let bobPage: Page;

	test.afterEach(async ({ page }) => {
		await closePages(page, alicePage, bobPage);
	});

	test('facilitator can trigger incident manually', async ({ page, context }) => {
		const result = await createGameInPlanningPhase(page, context);
		alicePage = result.alicePage;
		bobPage = result.bobPage;

		// Click trigger button on facilitator page
		await page.click('[data-testid="drama-trigger-incident-button"]');

		// Verify selection modal appears
		await expect(page.getByTestId('drama-selection-modal')).toBeVisible();

		// Verify only Round 1 incidents are shown (game is in Round 1)
		await expect(page.getByTestId('drama-incident-INC-001')).toBeVisible();
		// INC-006 is Round 2, should not be visible
		const inc006 = page.getByTestId('drama-incident-INC-006');
		const inc006Count = await inc006.count();
		expect(inc006Count).toBe(0);

		// Select INC-001 (Regulation Announcement)
		await page.click('[data-testid="drama-incident-INC-001"]');

		// Click trigger button in modal
		await page.click('[data-testid="drama-trigger-button"]');

		// Wait for modal to close and incident to trigger
		await page.waitForTimeout(500);

		// Verify all players see the incident card
		await expect(alicePage.getByTestId('drama-card-display')).toBeVisible();
		await expect(alicePage.getByTestId('drama-card-title')).toContainText(
			'Regulation Announcement'
		);
		await expect(alicePage.getByTestId('drama-card-description')).toBeVisible();
		await expect(alicePage.getByTestId('drama-card-educational')).toBeVisible();

		// Verify facilitator also sees the card
		await expect(page.getByTestId('drama-card-display')).toBeVisible();

		// Facilitator closes the incident card
		await page.click('button:has-text("Close")');
		await expect(page.getByTestId('drama-card-display')).not.toBeVisible();

		// Expand incident history to verify incident was logged
		await page.click('[data-testid="drama-history-toggle"]');
		await expect(page.getByTestId('drama-history-item-1-0')).toBeVisible();
	});

	test('incident card does not auto-dismiss', async ({ page, context }) => {
		const result = await createGameInPlanningPhase(page, context);
		alicePage = result.alicePage;
		bobPage = result.bobPage;

		// Trigger incident
		await page.click('[data-testid="drama-trigger-incident-button"]');
		await page.click('[data-testid="drama-incident-INC-001"]');
		await page.click('[data-testid="drama-trigger-button"]');

		// Wait for card to appear
		await expect(alicePage.getByTestId('drama-card-display')).toBeVisible();

		// Wait 10+ seconds - card should STAY visible
		await alicePage.waitForTimeout(10500);

		// Card should still be visible
		await expect(alicePage.getByTestId('drama-card-display')).toBeVisible();

		// Close it manually to clean up
		await page.keyboard.press('Escape');
	});
});

test.describe('Incident Cards Phase 1: Effect Application', () => {
	let alicePage: Page;
	let bobPage: Page;
	let gmailPage: Page;

	test.afterEach(async ({ page }) => {
		await closePages(page, alicePage, bobPage, gmailPage);
	});

	test('Industry Scandal affects all ESP teams and destinations', async ({ page, context }) => {
		// Create game with 2 ESP teams and 1 destination
		const result = await createGameWithDestinationPlayer(page, context);
		alicePage = result.alicePage;
		bobPage = result.bobPage;
		gmailPage = result.gmailPage;
		const players = [alicePage, bobPage, gmailPage];

		// Lock in all players to advance to Round 2
		await advanceToRound(page, players, 2);

		// Get initial values before triggering incident
		// Alice's ESP (SendWave) reputation with Gmail
		const aliceRepElement = alicePage.getByTestId('reputation-gmail');
		const aliceInitialRepText = await aliceRepElement.textContent();
		const aliceInitialRep = parseInt(aliceInitialRepText || '70', 10);

		// Bob's ESP (MailMonkey) reputation with Gmail
		const bobRepElement = bobPage.getByTestId('reputation-gmail');
		const bobInitialRepText = await bobRepElement.textContent();
		const bobInitialRep = parseInt(bobInitialRepText || '70', 10);

		// Gmail's budget
		const gmailBudgetElement = gmailPage.getByTestId('budget-current');
		const gmailInitialBudgetText = await gmailBudgetElement.textContent();
		const gmailInitialBudget = parseInt(gmailInitialBudgetText?.match(/\d+/)?.[0] || '1000', 10);

		// Trigger INC-006 (Industry Scandal) - Round 2 incident
		await triggerIncident(page, 'INC-006', undefined, players);

		// Verify effects applied:
		// Both ESPs should lose 5 reputation
		const aliceFinalRepText = await aliceRepElement.textContent();
		const aliceFinalRep = parseInt(aliceFinalRepText || '70', 10);
		expect(aliceFinalRep).toBe(aliceInitialRep - 5);

		const bobFinalRepText = await bobRepElement.textContent();
		const bobFinalRep = parseInt(bobFinalRepText || '70', 10);
		expect(bobFinalRep).toBe(bobInitialRep - 5);

		// Gmail should gain 100 budget
		const gmailFinalBudgetText = await gmailBudgetElement.textContent();
		const gmailFinalBudget = parseInt(gmailFinalBudgetText?.match(/\d+/)?.[0] || '1000', 10);
		expect(gmailFinalBudget).toBe(gmailInitialBudget + 100);
	});

	test('incident history is collapsible', async ({ page, context }) => {
		const result = await createGameInPlanningPhase(page, context);
		alicePage = result.alicePage;
		bobPage = result.bobPage;

		// Trigger incident
		await triggerIncident(page, 'INC-001', undefined, [alicePage, bobPage]);

		// History should start collapsed - items not visible
		const historyItem = page.getByTestId('drama-history-item-1-0');
		const itemVisible = await historyItem.isVisible().catch(() => false);
		expect(itemVisible).toBe(false);

		// Click toggle to expand
		await page.click('[data-testid="drama-history-toggle"]');
		await expect(historyItem).toBeVisible();

		// Click toggle again to collapse
		await page.click('[data-testid="drama-history-toggle"]');
		// Wait for transition to complete (200ms slide duration)
		await page.waitForTimeout(300);
		const itemVisibleAfterCollapse = await historyItem.isVisible().catch(() => false);
		expect(itemVisibleAfterCollapse).toBe(false);
	});
});

test.describe('Incident Cards Phase 1: Automatic DMARC Trigger', () => {
	let alicePage: Page;
	let bobPage: Page;

	test.afterEach(async ({ page }) => {
		await closePages(page, alicePage, bobPage);
	});

	test('DMARC incident triggers automatically at Round 3', async ({ page, context }) => {
		const result = await createGameInPlanningPhase(page, context);
		alicePage = result.alicePage;
		bobPage = result.bobPage;

		// Advance to Round 3 (completes Rounds 1 automatically)
		await advanceToRound(page, [alicePage, bobPage], 2);
		await lockInAllPlayers([alicePage, bobPage]);
		// Advance to next round's planning phase
		await page.click('[data-testid="start-next-round-button"]');
		await page.waitForTimeout(500);

		// Verify DMARC incident card appeared automatically
		await expect(alicePage.getByTestId('drama-card-display')).toBeVisible();
		await expect(alicePage.getByTestId('drama-card-title')).toContainText('DMARC');

		// Verify incident is in history (Round 3, first incident)
		const incidentCard = page.locator('[data-testid="drama-card-display"]');
		const isVisible = await incidentCard.isVisible().catch(() => false);
		if (isVisible) {
			await page.keyboard.press('Escape');
			await page.waitForTimeout(300);
		}
		await page.click('[data-testid="drama-history-toggle"]');
		await expect(page.getByTestId('drama-history-item-3-0')).toBeVisible();
	});
});

test.describe('Incident Cards Phase 1: Round-Based Filtering', () => {
	let alicePage: Page;
	let bobPage: Page;

	test.afterEach(async ({ page }) => {
		await closePages(page, alicePage, bobPage);
	});

	test('only appropriate round incidents are available', async ({ page, context }) => {
		const result = await createGameInPlanningPhase(page, context);
		alicePage = result.alicePage;
		bobPage = result.bobPage;

		// Round 1: Open incident selection modal
		await page.click('[data-testid="drama-trigger-incident-button"]');
		await expect(page.getByTestId('drama-selection-modal')).toBeVisible();

		// In Round 1, only Round 1 incidents should be visible
		await expect(page.getByTestId('drama-incident-INC-001')).toBeVisible();

		// Round 2, 3, 4 incidents should not be visible
		let inc006Count = await page.getByTestId('drama-incident-INC-006').count();
		let inc010Count = await page.getByTestId('drama-incident-INC-010').count();
		let inc015Count = await page.getByTestId('drama-incident-INC-015').count();
		let inc018Count = await page.getByTestId('drama-incident-INC-018').count();

		expect(inc006Count).toBe(0);
		expect(inc010Count).toBe(0);
		expect(inc015Count).toBe(0);
		expect(inc018Count).toBe(0);

		// Close modal
		await page.keyboard.press('Escape');
		await page.waitForTimeout(300);

		// Advance to Round 2
		await advanceToRound(page, [alicePage, bobPage], 2);

		// Round 2: Open incident selection modal again
		await page.click('[data-testid="drama-trigger-incident-button"]');
		await expect(page.getByTestId('drama-selection-modal')).toBeVisible();

		// In Round 2, only Round 2 incidents should be visible
		await expect(page.getByTestId('drama-incident-INC-006')).toBeVisible();

		// Round 1 incidents should not be visible (already in Round 2)
		const inc001Count = await page.getByTestId('drama-incident-INC-001').count();
		expect(inc001Count).toBe(0);

		// Round 3, 4 incidents should not be visible yet
		inc010Count = await page.getByTestId('drama-incident-INC-010').count();
		inc015Count = await page.getByTestId('drama-incident-INC-015').count();
		inc018Count = await page.getByTestId('drama-incident-INC-018').count();

		expect(inc010Count).toBe(0);
		expect(inc015Count).toBe(0);
		expect(inc018Count).toBe(0);
	});

	test('cannot trigger same incident twice in same round', async ({ page, context }) => {
		const result = await createGameInPlanningPhase(page, context);
		alicePage = result.alicePage;
		bobPage = result.bobPage;

		// Trigger INC-001 first time
		await triggerIncident(page, 'INC-001', undefined, [alicePage, bobPage]);

		// Open modal again
		await page.click('[data-testid="drama-trigger-incident-button"]');

		// INC-001 should be visible but disabled/grayed out
		const inc001Button = page.getByTestId('drama-incident-INC-001');
		await expect(inc001Button).toBeVisible();

		// Verify incident is disabled
		await expect(inc001Button).toBeDisabled();

		// Verify "Already triggered" badge is shown
		await expect(inc001Button.locator('text=Already triggered')).toBeVisible();

		// Verify it has grayed-out styling (opacity-60 class)
		const classes = await inc001Button.getAttribute('class');
		expect(classes).toContain('opacity-60');
		expect(classes).toContain('cursor-not-allowed');

		// Verify clicking doesn't select it (trigger button should remain disabled)
		await inc001Button.click({ force: true }); // Force click on disabled button
		const triggerButton = page.getByTestId('drama-trigger-button');
		await expect(triggerButton).toBeDisabled();
	});
});

test.describe('Incident Cards Phase 1: WebSocket Sync', () => {
	let alicePage: Page;
	let bobPage: Page;
	let gmailPage: Page;

	test.afterEach(async ({ page }) => {
		await closePages(page, alicePage, bobPage, gmailPage);
	});

	test('incident card displays synchronously across all clients', async ({ page, context }) => {
		const result = await createGameWithDestinationPlayer(page, context);
		alicePage = result.alicePage;
		bobPage = result.bobPage;
		gmailPage = result.gmailPage;

		// Facilitator triggers incident
		await page.click('[data-testid="drama-trigger-incident-button"]');
		await page.click('[data-testid="drama-incident-INC-001"]');
		await page.click('[data-testid="drama-trigger-button"]');

		// Wait briefly for WebSocket broadcast
		await page.waitForTimeout(300);

		// All players should see the incident card simultaneously
		await expect(page.getByTestId('drama-card-display')).toBeVisible();
		await expect(alicePage.getByTestId('drama-card-display')).toBeVisible();
		await expect(bobPage.getByTestId('drama-card-display')).toBeVisible();
		await expect(gmailPage.getByTestId('drama-card-display')).toBeVisible();

		// All should show the same incident title
		await expect(page.getByTestId('drama-card-title')).toContainText('Regulation Announcement');
		await expect(alicePage.getByTestId('drama-card-title')).toContainText(
			'Regulation Announcement'
		);
		await expect(bobPage.getByTestId('drama-card-title')).toContainText('Regulation Announcement');
		await expect(gmailPage.getByTestId('drama-card-title')).toContainText(
			'Regulation Announcement'
		);
	});
});
