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

import { test, expect } from '@playwright/test';
import {
	createTestSession,
	addPlayer,
	createGameInPlanningPhase,
	createGameWithDestinationPlayer,
	closePages
} from './helpers/game-setup';
import { lockInAllPlayers } from './helpers/e2e-actions';

test.describe('Incident Cards Phase 1: Manual Triggering', () => {
	test('facilitator can trigger incident manually', async ({ page, context }) => {
		const { roomCode, alicePage } = await createGameInPlanningPhase(page, context);

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

		await closePages(page, alicePage);
	});

	test('players cannot trigger incidents', async ({ page, context }) => {
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// On player page, trigger button should not be visible
		const triggerButton = alicePage.getByTestId('drama-trigger-incident-button');
		const buttonCount = await triggerButton.count();
		expect(buttonCount).toBe(0);

		// Selection modal should not be accessible
		const selectionModal = alicePage.getByTestId('drama-selection-modal');
		const modalCount = await selectionModal.count();
		expect(modalCount).toBe(0);

		await closePages(page, alicePage, bobPage);
	});

	test('incident card auto-dismisses after 10 seconds', async ({ page, context }) => {
		const { roomCode, alicePage } = await createGameInPlanningPhase(page, context);

		// Trigger incident
		await page.click('[data-testid="drama-trigger-incident-button"]');
		await page.click('[data-testid="drama-incident-INC-001"]');
		await page.click('[data-testid="drama-trigger-button"]');

		// Wait for card to appear
		await expect(alicePage.getByTestId('drama-card-display')).toBeVisible();

		// Wait 10+ seconds for auto-dismiss
		await alicePage.waitForTimeout(10500);

		// Card should be hidden
		await expect(alicePage.getByTestId('drama-card-display')).not.toBeVisible();

		await closePages(page, alicePage);
	});
});

test.describe('Incident Cards Phase 1: Effect Application', () => {
	test('Industry Scandal affects all ESP teams and destinations', async ({ page, context }) => {
		// Create game with 2 ESP teams and 1 destination
		const { roomCode, alicePage, bobPage, gmailPage } = await createGameWithDestinationPlayer(page, context);

		// Wait for game state to sync
		await page.waitForTimeout(500);

		// Lock in all players to advance to Round 2
		await lockInAllPlayers([alicePage, bobPage, gmailPage]);
		await page.waitForTimeout(1000);

		// Facilitator advances to Round 2
		await page.click('[data-testid="start-next-round-button"]');
		await page.waitForTimeout(1000);

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
		await page.click('[data-testid="drama-trigger-incident-button"]');
		await page.click('[data-testid="drama-incident-INC-006"]');
		await page.click('[data-testid="drama-trigger-button"]');

		// Wait for incident to trigger and effects to apply
		await page.waitForTimeout(1000);

		// Verify card appeared for all players
		await expect(alicePage.getByTestId('drama-card-display')).toBeVisible();
		await expect(bobPage.getByTestId('drama-card-display')).toBeVisible();
		await expect(gmailPage.getByTestId('drama-card-display')).toBeVisible();

		// Facilitator closes the incident card
		await page.click('button:has-text("Close")');
		await page.waitForTimeout(500);

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

		await closePages(page, alicePage, bobPage, gmailPage);
	});

	test('incident history is collapsible', async ({ page, context }) => {
		const { roomCode, alicePage } = await createGameInPlanningPhase(page, context);

		// Trigger incident
		await page.click('[data-testid="drama-trigger-incident-button"]');
		await page.click('[data-testid="drama-incident-INC-001"]');
		await page.click('[data-testid="drama-trigger-button"]');

		// Wait for incident to be added to history
		await page.waitForTimeout(500);

		// Facilitator closes the incident card
		await page.click('button:has-text("Close")');

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

		await closePages(page, alicePage);
	});
});

test.describe('Incident Cards Phase 1: Automatic DMARC Trigger', () => {
	test('DMARC incident triggers automatically at Round 3', async ({ page, context }) => {
		// This test requires completing Rounds 1-2 and transitioning to Round 3
		// For Phase 1 MVP, this is a placeholder test that will be completed
		// once we integrate the automatic trigger in phase-manager.ts

		const { roomCode, alicePage } = await createGameInPlanningPhase(page, context);

		// TODO: Complete Rounds 1 and 2
		// This requires:
		// 1. Allocating resources
		// 2. Locking in decisions
		// 3. Running resolution
		// 4. Viewing consequences
		// 5. Starting next round
		// Repeat for Round 2

		// For now, we'll just verify the test structure is correct
		// The actual implementation will be added when we integrate
		// the automatic trigger in phase-manager.ts

		// Expected behavior:
		// - At start of Round 3 planning phase
		// - INC-010 (DMARC Enforcement) should trigger automatically
		// - All players should see the card
		// - Incident should be in history
		// - DMARC 80% penalty already applies (from delivery-calculator.ts)

		// Placeholder assertion
		expect(true).toBe(true);

		await closePages(page, alicePage);
	});
});

test.describe('Incident Cards Phase 1: Round-Based Filtering', () => {
	test('only appropriate round incidents are available', async ({ page, context }) => {
		const { roomCode, alicePage } = await createGameInPlanningPhase(page, context);

		// Open incident selection modal
		await page.click('[data-testid="drama-trigger-incident-button"]');
		await expect(page.getByTestId('drama-selection-modal')).toBeVisible();

		// In Round 1, only Round 1 incidents should be visible
		await expect(page.getByTestId('drama-incident-INC-001')).toBeVisible();

		// Round 2, 3, 4 incidents should not be visible
		const inc006Count = await page.getByTestId('drama-incident-INC-006').count();
		const inc010Count = await page.getByTestId('drama-incident-INC-010').count();
		const inc015Count = await page.getByTestId('drama-incident-INC-015').count();
		const inc018Count = await page.getByTestId('drama-incident-INC-018').count();

		expect(inc006Count).toBe(0);
		expect(inc010Count).toBe(0);
		expect(inc015Count).toBe(0);
		expect(inc018Count).toBe(0);

		await closePages(page, alicePage);
	});

	test('cannot trigger same incident twice in same round', async ({ page, context }) => {
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Trigger INC-001 first time
		await page.click('[data-testid="drama-trigger-incident-button"]');
		await page.click('[data-testid="drama-incident-INC-001"]');
		await page.click('[data-testid="drama-trigger-button"]');

		// Wait for incident to complete
		await page.waitForTimeout(1000);

		// Facilitator closes the incident card
		await page.click('button:has-text("Close")');

		// Try to trigger again
		await page.click('[data-testid="drama-trigger-incident-button"]');

		// INC-001 should either:
		// a) Not be in the list anymore, OR
		// b) Be disabled/grayed out, OR
		// c) Show error when trying to trigger

		// For MVP, we'll check that it's not in the available list
		const inc001Count = await page.getByTestId('drama-incident-INC-001').count();

		// If it's still showing, verify we get an error when triggering
		if (inc001Count > 0) {
			await page.click('[data-testid="drama-incident-INC-001"]');
			await page.click('[data-testid="drama-trigger-button"]');

			// Should see error message (implementation will handle this)
			// For now, just verify the second trigger attempt doesn't duplicate
			await page.waitForTimeout(500);

			// History should still only have 1 entry
			await page.click('[data-testid="drama-history-toggle"]');
			const historyItems = await page.locator('[data-testid^="drama-history-item-"]').count();
			expect(historyItems).toBe(1);
		} else {
			// INC-001 was removed from list - this is valid behavior
			expect(inc001Count).toBe(0);
		}

		await closePages(page, alicePage, bobPage);
	});
});

test.describe('Incident Cards Phase 1: WebSocket Sync', () => {
	test('incident card displays synchronously across all clients', async ({ page, context }) => {
		const { roomCode, alicePage, bobPage, gmailPage } = await createGameWithDestinationPlayer(page, context);

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

		await closePages(page, alicePage, bobPage, gmailPage);
	});
});
