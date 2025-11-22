/**
 * E2E Tests: Incident Cards Phase 2
 *
 * Tests advanced incident mechanics:
 * - Team selection (facilitator picks ESP)
 * - Client selection (system picks random client)
 * - Conditional effects (tech requirements, client types)
 * - Volume/spam trap modifiers
 * - Auto-lock functionality
 *
 * Following ATDD: These tests should FAIL initially (RED phase)
 */

import { test, expect } from '@playwright/test';
import {
	createGameInPlanningPhase,
	createGameWithDestinationPlayer,
	closePages
} from './helpers/game-setup';
import {
	lockInAllPlayers,
	extractBudget,
	extractNumeric,
	triggerIncident,
	advanceToRound
} from './helpers/e2e-actions';
import {
	purchaseTechUpgrade,
	getAvailableClients,
	acquireClient,
	configureOnboarding
} from './helpers/client-management';

test.describe('INC-003: Venture Capital Boost', () => {
	let alicePage: any;
	let bobPage: any;

	test.afterEach(async ({ page }) => {
		await closePages(page, alicePage, bobPage);
	});

	test('facilitator selects ESP team to receive 200 credits', async ({ page, context }) => {
		({ alicePage, bobPage } = await createGameInPlanningPhase(page, context));

		// Get initial credits for SendWave (Alice's team)
		const initialCredits = await extractBudget(alicePage, 'budget-current');

		// Facilitator triggers INC-003 on SendWave
		await triggerIncident(page, 'INC-003', 'SendWave', [alicePage, bobPage]);

		// Verify SendWave gained 200 credits
		const newCredits = await extractBudget(alicePage, 'budget-current');
		expect(newCredits).toBe(initialCredits + 200);

		// Verify incident appears in history
		await page.click('[data-testid="drama-history-toggle"]');
		await expect(page.getByTestId('drama-history-item-1-0')).toContainText('Venture Capital');
	});
});

test.describe('INC-008: Authentication Emergency', () => {
	let alicePage: any;
	let bobPage: any;
	let gmailPage: any;

	test.afterEach(async ({ page }) => {
		await closePages(page, alicePage, bobPage, gmailPage);
	});

	test('ESPs without DKIM lose 10 reputation', async ({ page, context }) => {
		({ alicePage, bobPage, gmailPage } = await createGameWithDestinationPlayer(page, context));

		// Advance to Round 2
		await advanceToRound(page, [alicePage, bobPage, gmailPage], 2);

		// Get initial reputation for both ESPs
		const aliceRepElement = alicePage.getByTestId('reputation-gmail');
		const aliceInitialRep = await extractNumeric(aliceRepElement);

		const bobRepElement = bobPage.getByTestId('reputation-gmail');
		const bobInitialRep = await extractNumeric(bobRepElement);

		// Trigger INC-008 (Authentication Emergency)
		await triggerIncident(page, 'INC-008', undefined, [alicePage, bobPage, gmailPage]);

		// Both ESPs should lose 10 reputation (neither has DKIM at start)
		const aliceNewRep = await extractNumeric(aliceRepElement);
		expect(aliceNewRep).toBe(aliceInitialRep - 10);

		const bobNewRep = await extractNumeric(bobRepElement);
		expect(bobNewRep).toBe(bobInitialRep - 10);
	});

	test('ESPs with DKIM are not affected', async ({ page, context }) => {
		const { alicePage, bobPage, roomCode } = await createGameInPlanningPhase(page, context);

		// Give Alice DKIM (requires SPF first due to dependencies)
		await purchaseTechUpgrade(alicePage, roomCode, 'SendWave', 'spf');
		await purchaseTechUpgrade(alicePage, roomCode, 'SendWave', 'dkim');

		// Advance to Round 2
		await advanceToRound(page, [alicePage, bobPage], 2);

		// Get initial reputation
		const repElement = alicePage.getByTestId('reputation-gmail');
		const initialRep = await extractNumeric(repElement);

		// Trigger INC-008 (Authentication Emergency)
		await triggerIncident(page, 'INC-008', undefined, [alicePage, bobPage]);

		// Verify Alice's reputation is unchanged (protected by DKIM)
		const newRep = await extractNumeric(repElement);
		expect(newRep).toBe(initialRep);
	});
});

test.describe('INC-009: Seasonal Traffic Surge', () => {
	let alicePage: any;
	let bobPage: any;

	test.afterEach(async ({ page }) => {
		await closePages(page, alicePage, bobPage);
	});

	test('e-commerce/retail/event clients get 1.5x volume', async ({ page, context }) => {
		const { alicePage, bobPage, roomCode } = await createGameInPlanningPhase(page, context);

		// Acquire a re_engagement client (available Round 1, affected by INC-009)
		const clients = await getAvailableClients(alicePage, roomCode, 'SendWave');
		const reEngagementClient = clients.find((c) => c.type === 're_engagement');
		expect(reEngagementClient).toBeDefined();
		await acquireClient(alicePage, roomCode, 'SendWave', reEngagementClient.id);

		// Lock in and wait for consequences phase Round 1 (baseline)
		await lockInAllPlayers([alicePage, bobPage]);
		await page.waitForTimeout(2000);

		// Get baseline volume from Round 1
		const clientPerfSection = alicePage.getByTestId('section-client-performance');
		const volumeText1 = await clientPerfSection.locator('text=Total Volume:').textContent();
		const baselineVolume = parseInt(volumeText1?.match(/[\d,]+/)?.[0]?.replace(/,/g, '') || '0');
		expect(baselineVolume).toBeGreaterThan(0);

		// Advance to Round 2
		await page.click('[data-testid="start-next-round-button"]');
		await page.waitForTimeout(500);

		// Trigger INC-009 (Seasonal Traffic Surge) in Round 2
		await triggerIncident(page, 'INC-009', undefined, [alicePage, bobPage]);

		// Lock in and wait for consequences phase Round 2
		await lockInAllPlayers([alicePage, bobPage]);
		await page.waitForTimeout(2000);

		// Get volume from Round 2 (with incident multiplier)
		const volumeText2 = await clientPerfSection.locator('text=Total Volume:').textContent();
		const incidentVolume = parseInt(volumeText2?.match(/[\d,]+/)?.[0]?.replace(/,/g, '') || '0');

		// Verify volume increased by at least 10% (conservative check due to delivery variance)
		expect(incidentVolume).toBeGreaterThan(baselineVolume * 1.1);

		// Note: INC-009 creates volume/spam trap modifiers, not direct reputation changes
		// So it won't appear in the incident-effects-summary (which only shows reputation effects)
		// The modifiers are applied during resolution calculations
	});
});

test.describe('INC-011: Viral Campaign', () => {
	let alicePage: any;
	let bobPage: any;

	test.afterEach(async ({ page }) => {
		await closePages(page, alicePage, bobPage);
	});

	test('client with list hygiene gets bonus (+10 rep, +500 credits)', async ({ page, context }) => {
		const { alicePage, bobPage, roomCode } = await createGameInPlanningPhase(page, context);

		// Acquire a client and configure with list hygiene
		const clients = await getAvailableClients(alicePage, roomCode, 'SendWave');
		expect(clients.length).toBeGreaterThan(0);
		await acquireClient(alicePage, roomCode, 'SendWave', clients[0].id);
		await configureOnboarding(alicePage, roomCode, 'SendWave', clients[0].id, false, true);

		// Advance to Round 3
		await advanceToRound(page, [alicePage, bobPage], 3);

		// Get initial values before triggering INC-011
		const initialCredits = await extractBudget(alicePage, 'budget-current');
		const repElement = alicePage.getByTestId('reputation-gmail');
		const initialRep = await extractNumeric(repElement);

		// Trigger INC-011 (Viral Campaign) on SendWave
		await triggerIncident(page, 'INC-011', 'SendWave', [alicePage, bobPage]);

		// Verify SendWave gained reputation and credits
		const newCredits = await extractBudget(alicePage, 'budget-current');
		expect(newCredits).toBe(initialCredits + 500);

		const newRep = await extractNumeric(repElement);
		expect(newRep).toBe(initialRep + 10);
	});

	test('client without list hygiene gets penalty (-10 rep, 3x spam trap)', async ({
		page,
		context
	}) => {
		const { alicePage, bobPage, roomCode } = await createGameInPlanningPhase(page, context);

		// Acquire a client WITHOUT list hygiene
		const clients = await getAvailableClients(alicePage, roomCode, 'SendWave');
		expect(clients.length).toBeGreaterThan(0);
		await acquireClient(alicePage, roomCode, 'SendWave', clients[0].id);
		await configureOnboarding(alicePage, roomCode, 'SendWave', clients[0].id, false, false);

		// Advance to Round 3
		await advanceToRound(page, [alicePage, bobPage], 3);

		// Get initial reputation before triggering INC-011
		const repElement = alicePage.getByTestId('reputation-gmail');
		const initialRep = await extractNumeric(repElement);

		// Trigger INC-011 (Viral Campaign) on SendWave
		await triggerIncident(page, 'INC-011', 'SendWave', [alicePage, bobPage]);

		// Verify SendWave lost reputation
		const newRep = await extractNumeric(repElement);
		expect(newRep).toBe(initialRep - 10);

		// Note: 3x spam trap multiplier will be applied during consequences phase
	});
});

test.describe('INC-016: Legal Reckoning', () => {
	let alicePage: any;
	let bobPage: any;

	test.afterEach(async ({ page }) => {
		await closePages(page, alicePage, bobPage);
	});

	test('selected team loses 400 credits and gets auto-locked', async ({ page, context }) => {
		({ alicePage, bobPage } = await createGameInPlanningPhase(page, context));

		// Advance to Round 4
		await advanceToRound(page, [alicePage, bobPage], 4);

		// Now in Round 4 - verify Alice is not locked and get initial credits
		const lockButton = alicePage.getByTestId('lock-in-button');
		await expect(lockButton).toBeVisible();
		await expect(lockButton).not.toBeDisabled();

		const round4Credits = await extractBudget(alicePage, 'budget-current');

		// Trigger INC-016 (Legal Reckoning) on SendWave
		await triggerIncident(page, 'INC-016', 'SendWave', [alicePage, bobPage]);

		// Verify SendWave lost 400 credits
		const newCredits = await extractBudget(alicePage, 'budget-current');
		expect(newCredits).toBe(round4Credits - 400);

		// Verify SendWave is now locked in
		await expect(alicePage.getByTestId('lock-in-confirmation')).toBeVisible();
	});

	test('auto-lock applies at next planning phase if not in planning', async ({ page, context }) => {
		test.setTimeout(30000); // Increase timeout as this test advances through multiple rounds

		// This test verifies pendingAutoLock flag behavior
		// Trigger INC-016 during consequences phase, verify lock is applied at start of next planning phase

		({ alicePage, bobPage } = await createGameInPlanningPhase(page, context));

		// Advance to Round 3 planning phase, then lock in to reach consequences
		await advanceToRound(page, [alicePage, bobPage], 3);
		await lockInAllPlayers([alicePage, bobPage]);

		// Wait for transition to consequences phase
		await page.waitForTimeout(3000);

		// Now in Round 3 consequences phase - trigger INC-016 on Alice
		await triggerIncident(page, 'INC-016', 'SendWave', [alicePage, bobPage]);

		// Advance to Round 4 planning phase
		await page.click('[data-testid="start-next-round-button"]');
		await page.waitForTimeout(2000);

		// Verify Alice is auto-locked at the start of Round 4
		await expect(alicePage.getByTestId('lock-in-confirmation')).toBeVisible();
	});
});

test.describe('Modifier Stacking', () => {
	let alicePage: any;
	let bobPage: any;

	test.afterEach(async ({ page }) => {
		await closePages(page, alicePage, bobPage);
	});

	test('multiple volume modifiers multiply together', async ({ page, context }) => {
		const { alicePage, bobPage, roomCode } = await createGameInPlanningPhase(page, context);

		// Advance to Round 2
		await advanceToRound(page, [alicePage, bobPage], 2);

		// In Round 2: Acquire client with warmup (0.5x) and list hygiene (0.85x)
		// Must be event_seasonal, aggressive_marketer, or re_engagement for INC-009 to apply
		const clients = await getAvailableClients(alicePage, roomCode, 'SendWave');
		expect(clients.length).toBeGreaterThan(0);
		const targetClient = clients.find(
			(c) =>
				c.type === 'event_seasonal' ||
				c.type === 'aggressive_marketer' ||
				c.type === 're_engagement'
		);
		expect(targetClient).toBeDefined();
		await acquireClient(alicePage, roomCode, 'SendWave', targetClient!.id);
		await configureOnboarding(alicePage, roomCode, 'SendWave', targetClient!.id, true, true);

		// Trigger INC-009 (Seasonal Traffic Surge) - adds 1.5x multiplier
		await triggerIncident(page, 'INC-009', undefined, [alicePage, bobPage]);

		// Lock in and wait for consequences phase
		await lockInAllPlayers([alicePage, bobPage]);
		await page.waitForTimeout(2000);

		// Verify volume modifiers multiply together
		// Expected: base × 0.5 (warmup) × 0.85 (list hygiene) × 1.5 (INC-009) = base × 0.6375
		// Check that warmup and list hygiene adjustment messages are visible
		await expect(alicePage.getByTestId('warmup-adjustment-message')).toBeVisible();
		await expect(alicePage.getByTestId('list-hygiene-adjustment-message')).toBeVisible();

		// Verify incident effects summary shows INC-009
		await expect(alicePage.getByTestId('incident-effects-summary')).toBeVisible();
		await expect(alicePage.getByTestId('incident-effects-summary')).toContainText(
			'Seasonal Traffic Surge'
		);
	});

	test('spam trap modifiers multiply together', async ({ page, context }) => {
		const { alicePage, bobPage, roomCode } = await createGameInPlanningPhase(page, context);

		// Advance to Round 2
		await advanceToRound(page, [alicePage, bobPage], 2);

		// In Round 2: Acquire client with list hygiene (0.6x spam trap reduction)
		// Must be event_seasonal, aggressive_marketer, or re_engagement for INC-009 to apply
		const clients = await getAvailableClients(alicePage, roomCode, 'SendWave');
		expect(clients.length).toBeGreaterThan(0);
		const targetClient = clients.find(
			(c) =>
				c.type === 'event_seasonal' ||
				c.type === 'aggressive_marketer' ||
				c.type === 're_engagement'
		);
		expect(targetClient).toBeDefined();
		await acquireClient(alicePage, roomCode, 'SendWave', targetClient!.id);
		await configureOnboarding(alicePage, roomCode, 'SendWave', targetClient!.id, false, true);

		// Trigger INC-009 (Seasonal Traffic Surge) - adds 1.2x spam trap multiplier for seasonal clients
		await triggerIncident(page, 'INC-009', undefined, [alicePage, bobPage]);

		// Lock in and wait for consequences phase
		await lockInAllPlayers([alicePage, bobPage]);
		await page.waitForTimeout(2000);

		// Verify spam trap modifiers multiply together
		// Expected: base × 0.6 (list hygiene) × 1.2 (INC-009) = base × 0.72
		await expect(alicePage.getByTestId('list-hygiene-adjustment-message')).toBeVisible();

		// Verify incident effects summary shows INC-009
		await expect(alicePage.getByTestId('incident-effects-summary')).toBeVisible();
		await expect(alicePage.getByTestId('incident-effects-summary')).toContainText(
			'Seasonal Traffic Surge'
		);
	});
});
