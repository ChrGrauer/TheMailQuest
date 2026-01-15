/**
 * US-8.2-DEBUG: Facilitator Dashboard Sync & Lock-in Status
 * 
 * This test verifies that the facilitator dashboard:
 * 1. Shows "Locked In" status for teams in real-time.
 * 2. Displays new clients acquired in later rounds correctly without a manual refresh.
 * 3. Correctly syncs client metadata from the server.
 */

import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import {
	createGameInSecondRound,
	closePages
} from './helpers/game-setup';
import {
	acquireClient,
	getAvailableClientIds
} from './helpers/client-management';

test.describe('Facilitator Dashboard Real-time Sync Debug', () => {
	let alicePage: Page;
	let bobPage: Page;

	test.afterEach(async ({ page }) => {
		await closePages(page, alicePage, bobPage);
	});

	test('should show lock-in status and new clients in real-time', async ({
		page,
		context
	}) => {
		// Pipe browser console to terminal
		page.on('console', (msg) => console.log(`[FACILITATOR] ${msg.text()}`));

		// Given: a game in Round 2 Planning phase
		// alicePage is ESP (SendWave), bobPage is Destination (Gmail)
		const { roomCode, alicePage: alice, gmailPage: bob } = await createGameInSecondRound(page, context);

		alice.on('console', (msg) => console.log(`[ALICE] ${msg.text()}`));
		bob.on('console', (msg) => console.log(`[BOB] ${msg.text()}`));

		alicePage = alice;
		bobPage = bob;

		// Verify we are in Round 2
		const roundText = alice.locator('[data-testid="round-indicator"]');
		await expect(roundText).toContainText('Round 2 / 4');

		// Verify Facilitator sees "Planning" status for Alice
		const aliceRow = page.locator('[data-testid="esp-row-SendWave"]');
		const lockStatus = aliceRow.locator('[data-testid="esp-lock-status"]');
		await expect(lockStatus).toContainText('Planning');

		// Verification: Client Acquisition Sync
		// When: Alice acquires a new client in Round 2
		// (MUST happen while Alice is in Planning state - NOT locked in)
		await alice.getByTestId('open-client-marketplace').click();
		await alice.waitForSelector('[data-testid="marketplace-modal"]', { timeout: 10000 });

		// Find a Round 2 client (they should be available in Round 2)
		const clientToAcquire = alice.getByTestId('client-card').first();
		const clientName = await clientToAcquire.getByTestId('client-name').textContent();
		console.log(`[TEST] Alice acquiring client: ${clientName}`);

		await clientToAcquire.getByTestId('acquire-button').click();
		await alice.waitForTimeout(1000); // Wait for acquisition to process

		// Close marketplace modal to allow clicking the lock-in button
		await alice.getByTestId('close-modal').click();
		await expect(alice.getByTestId('marketplace-modal')).not.toBeVisible();
		console.log(`[TEST] Alice closed marketplace modal.`);

		// Verify Facilitator sees the new client in real-time
		const clientsCell = aliceRow.locator('[data-testid="esp-clients"]');
		await expect(clientsCell).toContainText(clientName!, { timeout: 10000 });
		console.log(`[TEST] Facilitator synced client acquisition: ${clientName}`);

		// When: After acquisition, Alice (SendWave) locks in
		const aliceLockIn = alice.getByTestId('lock-in-button');
		await aliceLockIn.click();

		// Verify Facilitator sees "✓ Locked In" status for Alice
		await expect(lockStatus).toContainText('Locked In', { timeout: 10000 });
		const lockIcon = aliceRow.locator('[data-testid="lock-icon"]');
		await expect(lockIcon).toBeVisible();
		console.log(`[TEST] Facilitator synced lock-in status correctly.`);
	});
});
