/**
 * E2E Tests: Incident Cards Phase 5 - Player Choices
 *
 * Tests choice-based incident cards where players make decisions:
 * - INC-017: Acquisition Offer (highest-reputation ESP)
 * - INC-018: Zero-Day Crisis (all ESPs)
 * - INC-020: Reputation Reset Opportunity (lowest-reputation ESP)
 *
 * Key behaviors:
 * - Modal cannot be closed without confirming
 * - Default option is pre-selected
 * - Effects apply immediately at confirmation (not at lock-in)
 * - Private choices for INC-018 (teams can't see each other's choices)
 *
 * Following ATDD: These tests should FAIL initially (RED phase)
 */

import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { createGameWith2ESPTeams, closePages } from './helpers/game-setup';
import {
	lockInAllPlayers,
	extractBudget,
	extractNumeric,
	triggerIncident,
	advanceToRound
} from './helpers/e2e-actions';
import {
	getAvailableClients,
	acquireClient,
	configureOnboarding
} from './helpers/client-management';

// Increase timeout for these complex multi-player tests (default is 20s)
test.setTimeout(40000);

test.describe('INC-017: Acquisition Offer', () => {
	let alicePage: Page;
	let bobPage: Page;
	let destinationPage: Page;

	test.afterEach(async ({ page }) => {
		await closePages(page, alicePage, bobPage, destinationPage);
	});

	test('choice modal appears only for highest-reputation team with default selection, and declining grants +5 rep', async ({
		page,
		context
	}) => {
		// Setup: Create game with 2 ESPs (Alice=SendWave, Bob=MailMonkey)
		const result = await createGameWith2ESPTeams(page, context);
		alicePage = result.alicePage;
		bobPage = result.bobPage;
		destinationPage = result.destinationPage;
		const roomCode = result.roomCode;

		// Wait for facilitator to be redirected to facilitator dashboard
		await page.waitForURL(`/game/${roomCode}/facilitator`, { timeout: 10000 });

		// Make Bob acquire a risky client to lower his reputation
		// Alice stays clean → Alice will have higher reputation after resolution
		const bobClients = await getAvailableClients(bobPage, roomCode, 'MailMonkey');
		const riskyClient = bobClients.find((c) => c.type === 're_engagement');
		expect(riskyClient).toBeDefined();
		await acquireClient(bobPage, roomCode, 'MailMonkey', riskyClient!.id);
		// No list hygiene = max spam trap risk
		await configureOnboarding(bobPage, roomCode, 'MailMonkey', riskyClient!.id, false, false);

		// Advance to Round 4 (going through resolution cycles will differentiate reputation)
		await advanceToRound(page, [alicePage, bobPage, destinationPage], 4);

		// Get Alice's reputation before incident
		const aliceRepElement = alicePage.getByTestId('reputation-zmail-score');
		const aliceInitialRep = await extractNumeric(aliceRepElement);

		// Trigger INC-017 (Acquisition Offer) - should target Alice (highest rep)
		await triggerIncident(page, 'INC-017', undefined, [alicePage, bobPage]);

		// Verify: Alice sees choice modal (highest reputation)
		await expect(alicePage.getByTestId('incident-choice-modal')).toBeVisible();
		await expect(alicePage.getByTestId('incident-choice-title')).toContainText('Acquisition Offer');

		// Verify: Bob does NOT see choice modal
		await expect(bobPage.getByTestId('incident-choice-modal')).not.toBeVisible();

		// Verify: Default option "Decline" is pre-selected
		const declineOption = alicePage.getByTestId('incident-choice-option-decline');
		await expect(declineOption).toHaveAttribute('data-selected', 'true');
		await expect(declineOption.getByTestId('incident-choice-option-default')).toBeVisible();

		// Confirm the default choice (Decline)
		await alicePage.getByTestId('incident-choice-confirm-button').click();

		// Verify: Modal closes after confirmation
		await expect(alicePage.getByTestId('incident-choice-modal')).not.toBeVisible();

		// Verify: Alice gained +5 reputation (decline bonus)
		const aliceNewRep = await extractNumeric(aliceRepElement);
		expect(aliceNewRep).toBe(aliceInitialRep + 5);

		// Verify: Alice is NOT auto-locked (she declined)
		const lockButton = alicePage.getByTestId('lock-in-button');
		await expect(lockButton).toBeVisible();
		await expect(lockButton).not.toBeDisabled();
	});

	test('accepting offer grants +800 credits and auto-locks team immediately', async ({
		page,
		context
	}) => {
		// Setup: Create game with 2 ESPs (Alice=SendWave, Bob=MailMonkey)
		const result = await createGameWith2ESPTeams(page, context);
		alicePage = result.alicePage;
		bobPage = result.bobPage;
		destinationPage = result.destinationPage;
		const roomCode = result.roomCode;

		// Wait for facilitator to be redirected to facilitator dashboard
		await page.waitForURL(`/game/${roomCode}/facilitator`, { timeout: 10000 });

		// Make Bob acquire a risky client to lower his reputation
		const bobClients = await getAvailableClients(bobPage, roomCode, 'MailMonkey');
		const riskyClient = bobClients.find((c) => c.type === 're_engagement');
		expect(riskyClient).toBeDefined();
		await acquireClient(bobPage, roomCode, 'MailMonkey', riskyClient!.id);
		await configureOnboarding(bobPage, roomCode, 'MailMonkey', riskyClient!.id, false, false);

		// Advance to Round 4
		await advanceToRound(page, [alicePage, bobPage, destinationPage], 4);

		// Get Alice's credits before incident
		const aliceInitialCredits = await extractBudget(alicePage, 'budget-current');

		// Trigger INC-017 (Acquisition Offer)
		await triggerIncident(page, 'INC-017', undefined, [alicePage, bobPage]);

		// Verify modal is visible for Alice
		await expect(alicePage.getByTestId('incident-choice-modal')).toBeVisible();

		// Select "Accept" option (not the default)
		await alicePage.getByTestId('incident-choice-option-accept').click();

		// Confirm the choice
		await alicePage.getByTestId('incident-choice-confirm-button').click();
		// Wait for modal to close (indicates effects are applied)
		await expect(alicePage.getByTestId('incident-choice-modal')).not.toBeVisible();

		// Verify: Effects applied immediately
		// Alice gained +800 credits
		const aliceNewCredits = await extractBudget(alicePage, 'budget-current');
		expect(aliceNewCredits).toBe(aliceInitialCredits + 800);

		// Alice is now auto-locked (accepted offer = exit competition)
		await expect(alicePage.getByTestId('lock-in-confirmation')).toBeVisible();
	});
});

test.describe('INC-018: Zero-Day Crisis', () => {
	let alicePage: Page;
	let bobPage: Page;
	let destinationPage: Page;

	test.afterEach(async ({ page }) => {
		await closePages(page, alicePage, bobPage, destinationPage);
	});

	test('all teams see choice modal and can make independent choices with immediate effects', async ({
		page,
		context
	}) => {
		// Setup: Create game with 2 ESPs (Alice=SendWave, Bob=MailMonkey)
		const result = await createGameWith2ESPTeams(page, context);
		alicePage = result.alicePage;
		bobPage = result.bobPage;
		destinationPage = result.destinationPage;
		const roomCode = result.roomCode;

		// Wait for facilitator to be redirected to facilitator dashboard
		await page.waitForURL(`/game/${roomCode}/facilitator`, { timeout: 10000 });

		// Advance to Round 4 (INC-018 is Round 4)
		await advanceToRound(page, [alicePage, bobPage, destinationPage], 4);

		// Get initial values
		const aliceInitialCredits = await extractBudget(alicePage, 'budget-current');
		const bobInitialCredits = await extractBudget(bobPage, 'budget-current');
		const bobRepElement = bobPage.getByTestId('reputation-zmail-score');
		const bobInitialRep = await extractNumeric(bobRepElement);

		// Trigger INC-018 (Zero-Day Crisis)
		await triggerIncident(page, 'INC-018', undefined, [alicePage, bobPage]);

		// Verify: BOTH teams see choice modal (targetSelection: 'all_esps')
		await expect(alicePage.getByTestId('incident-choice-modal')).toBeVisible();
		await expect(bobPage.getByTestId('incident-choice-modal')).toBeVisible();

		// Verify: Default option "Apply Patch" is pre-selected for both
		const alicePatchOption = alicePage.getByTestId('incident-choice-option-patch');
		await expect(alicePatchOption).toHaveAttribute('data-selected', 'true');
		await expect(alicePatchOption.getByTestId('incident-choice-option-default')).toBeVisible();

		const bobPatchOption = bobPage.getByTestId('incident-choice-option-patch');
		await expect(bobPatchOption).toHaveAttribute('data-selected', 'true');

		// Alice: Confirm "Apply Patch" (default) → -150 credits
		await alicePage.getByTestId('incident-choice-confirm-button').click();
		await expect(alicePage.getByTestId('incident-choice-modal')).not.toBeVisible();

		// Bob: Select "Ignore Vulnerability" → -15 reputation
		await bobPage.getByTestId('incident-choice-option-ignore').click();
		await bobPage.getByTestId('incident-choice-confirm-button').click();
		await expect(bobPage.getByTestId('incident-choice-modal')).not.toBeVisible();

		// Verify: Effects applied immediately at confirmation
		// Alice lost 150 credits (patched)
		const aliceNewCredits = await extractBudget(alicePage, 'budget-current');
		expect(aliceNewCredits).toBe(aliceInitialCredits - 150);

		// Bob lost 15 reputation (ignored)
		const bobNewRep = await extractNumeric(bobRepElement);
		expect(bobNewRep).toBe(bobInitialRep - 15);

		// Bob should still have same credits (didn't pay for patch)
		const bobFinalCredits = await extractBudget(bobPage, 'budget-current');
		expect(bobFinalCredits).toBe(bobInitialCredits);
	});
});

test.describe('INC-020: Reputation Reset Opportunity', () => {
	let alicePage: Page;
	let bobPage: Page;
	let destinationPage: Page;

	test.afterEach(async ({ page }) => {
		await closePages(page, alicePage, bobPage, destinationPage);
	});

	test('choice modal appears only for lowest-reputation team with default selection, and accepting resets reputation to 70', async ({
		page,
		context
	}) => {
		// Setup: Create game with 2 ESPs (Alice=SendWave, Bob=MailMonkey)
		const result = await createGameWith2ESPTeams(page, context);
		alicePage = result.alicePage;
		bobPage = result.bobPage;
		destinationPage = result.destinationPage;
		const roomCode = result.roomCode;

		// Wait for facilitator to be redirected to facilitator dashboard
		await page.waitForURL(`/game/${roomCode}/facilitator`, { timeout: 10000 });

		// Make Alice acquire a risky client to lower her reputation
		// Bob stays clean → Alice will have lower reputation after resolution
		const aliceClients = await getAvailableClients(alicePage, roomCode, 'SendWave');
		const riskyClient = aliceClients.find((c) => c.type === 're_engagement');
		expect(riskyClient).toBeDefined();
		await acquireClient(alicePage, roomCode, 'SendWave', riskyClient!.id);
		// No list hygiene = max spam trap risk
		await configureOnboarding(alicePage, roomCode, 'SendWave', riskyClient!.id, false, false);

		// Advance to Round 4 (going through resolution cycles will differentiate reputation)
		await advanceToRound(page, [alicePage, bobPage, destinationPage], 4);

		// Get Alice's credits before incident
		const aliceInitialCredits = await extractBudget(alicePage, 'budget-current');

		// Trigger INC-020 (Reputation Reset Opportunity) - should target Alice (lowest rep)
		await triggerIncident(page, 'INC-020', undefined, [alicePage, bobPage]);

		// Verify: Alice sees choice modal (lowest reputation)
		await expect(alicePage.getByTestId('incident-choice-modal')).toBeVisible();
		await expect(alicePage.getByTestId('incident-choice-title')).toContainText(
			'Reputation Reset Opportunity'
		);

		// Verify: Bob does NOT see choice modal
		await expect(bobPage.getByTestId('incident-choice-modal')).not.toBeVisible();

		// Verify: Default option "Accept Reset" is pre-selected
		const acceptOption = alicePage.getByTestId('incident-choice-option-accept');
		await expect(acceptOption).toHaveAttribute('data-selected', 'true');
		await expect(acceptOption.getByTestId('incident-choice-option-default')).toBeVisible();

		// Confirm the default choice (Accept Reset)
		await alicePage.getByTestId('incident-choice-confirm-button').click();

		// Verify: Modal closes after confirmation
		await expect(alicePage.getByTestId('incident-choice-modal')).not.toBeVisible();

		// Verify: Effects applied immediately
		// Alice lost 500 credits
		const aliceNewCredits = await extractBudget(alicePage, 'budget-current');
		expect(aliceNewCredits).toBe(aliceInitialCredits - 500);

		// Alice's reputation is now 70 across all destinations
		const aliceRepzmail = await extractNumeric(alicePage.getByTestId('reputation-zmail-score'));
		expect(aliceRepzmail).toBe(70);
	});

	test('declining reset keeps current reputation and saves credits', async ({ page, context }) => {
		// Setup: Create game with 2 ESPs (Alice=SendWave, Bob=MailMonkey)
		const result = await createGameWith2ESPTeams(page, context);
		alicePage = result.alicePage;
		bobPage = result.bobPage;
		destinationPage = result.destinationPage;
		const roomCode = result.roomCode;

		// Wait for facilitator to be redirected to facilitator dashboard
		await page.waitForURL(`/game/${roomCode}/facilitator`, { timeout: 10000 });

		// Make Alice acquire a risky client to lower her reputation
		const aliceClients = await getAvailableClients(alicePage, roomCode, 'SendWave');
		const riskyClient = aliceClients.find((c) => c.type === 're_engagement');
		expect(riskyClient).toBeDefined();
		await acquireClient(alicePage, roomCode, 'SendWave', riskyClient!.id);
		await configureOnboarding(alicePage, roomCode, 'SendWave', riskyClient!.id, false, false);

		// Advance to Round 4
		await advanceToRound(page, [alicePage, bobPage, destinationPage], 4);

		// Get Alice's values before incident
		const aliceInitialCredits = await extractBudget(alicePage, 'budget-current');
		const aliceRepElement = alicePage.getByTestId('reputation-zmail-score');
		const aliceInitialRep = await extractNumeric(aliceRepElement);

		// Trigger INC-020
		await triggerIncident(page, 'INC-020', undefined, [alicePage, bobPage]);

		// Verify modal is visible for Alice
		await expect(alicePage.getByTestId('incident-choice-modal')).toBeVisible();

		// Select "Decline Reset" option (not the default)
		await alicePage.getByTestId('incident-choice-option-decline').click();

		// Confirm the choice
		await alicePage.getByTestId('incident-choice-confirm-button').click();
		// Wait for modal to close (indicates effects are applied)
		await expect(alicePage.getByTestId('incident-choice-modal')).not.toBeVisible();

		// Verify: No effects applied (declined)
		// Credits unchanged
		const aliceNewCredits = await extractBudget(alicePage, 'budget-current');
		expect(aliceNewCredits).toBe(aliceInitialCredits);

		// Reputation unchanged
		const aliceNewRep = await extractNumeric(aliceRepElement);
		expect(aliceNewRep).toBe(aliceInitialRep);
	});
});

test.describe('Incident Choice Modal Behavior', () => {
	let alicePage: Page;
	let bobPage: Page;
	let destinationPage: Page;

	test.afterEach(async ({ page }) => {
		await closePages(page, alicePage, bobPage, destinationPage);
	});

	test('choice modal cannot be closed without confirming (Escape key blocked)', async ({
		page,
		context
	}) => {
		// Setup: Create game with 2 ESPs (Alice=SendWave, Bob=MailMonkey)
		const result = await createGameWith2ESPTeams(page, context);
		alicePage = result.alicePage;
		bobPage = result.bobPage;
		destinationPage = result.destinationPage;
		const roomCode = result.roomCode;

		// Wait for facilitator to be redirected to facilitator dashboard
		await page.waitForURL(`/game/${roomCode}/facilitator`, { timeout: 10000 });

		// Advance to Round 4
		await advanceToRound(page, [alicePage, bobPage, destinationPage], 4);

		// Trigger INC-018 (targets all ESPs)
		await triggerIncident(page, 'INC-018', undefined, [alicePage, bobPage]);

		// Verify modal is visible
		await expect(alicePage.getByTestId('incident-choice-modal')).toBeVisible();

		// Try to close with Escape key
		await alicePage.keyboard.press('Escape');
		await alicePage.waitForTimeout(300);

		// Verify: Modal is still visible (cannot be dismissed)
		await expect(alicePage.getByTestId('incident-choice-modal')).toBeVisible();

		// Verify: Clicking outside doesn't close either
		// (modal backdrop should not be clickable)
		await alicePage.click('body', { position: { x: 10, y: 10 }, force: true });
		await alicePage.waitForTimeout(300);
		await expect(alicePage.getByTestId('incident-choice-modal')).toBeVisible();

		// Clean up: Confirm choice to dismiss modal
		await alicePage.getByTestId('incident-choice-confirm-button').click();
		await bobPage.getByTestId('incident-choice-confirm-button').click();
	});

	test('confirmed choice shows confirmation badge', async ({ page, context }) => {
		// Setup: Create game with 2 ESPs (Alice=SendWave, Bob=MailMonkey)
		const result = await createGameWith2ESPTeams(page, context);
		alicePage = result.alicePage;
		bobPage = result.bobPage;
		destinationPage = result.destinationPage;
		const roomCode = result.roomCode;

		// Wait for facilitator to be redirected to facilitator dashboard
		await page.waitForURL(`/game/${roomCode}/facilitator`, { timeout: 10000 });

		// Advance to Round 4
		await advanceToRound(page, [alicePage, bobPage, destinationPage], 4);

		// Trigger INC-018
		await triggerIncident(page, 'INC-018', undefined, [alicePage, bobPage]);

		// Alice confirms her choice
		await alicePage.getByTestId('incident-choice-confirm-button').click();

		// Verify: Confirmation badge is visible INSIDE the modal briefly before it auto-closes
		await expect(alicePage.getByTestId('incident-choice-confirmed-badge')).toBeVisible();

		// Wait for modal to close after the brief confirmation display
		await expect(alicePage.getByTestId('incident-choice-modal')).not.toBeVisible();

		// Clean up: Bob confirms too
		await bobPage.getByTestId('incident-choice-confirm-button').click();
		await expect(bobPage.getByTestId('incident-choice-modal')).not.toBeVisible();
	});
});
