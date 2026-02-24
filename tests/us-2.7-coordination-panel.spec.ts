/**
 * US-2.7: Coordination Panel - E2E Tests
 *
 * Tests investigation voting and coordination between destination players.
 * Following ATDD workflow: These tests are written FIRST (RED phase).
 * Frontend implementation will make them pass (GREEN phase).
 *
 * Based on feature file: features/US-2.7-coordination-panel.feature
 */

import { test, expect, type Page } from './fixtures';
import { createGameWith3DestinationsAnd3ESPs, closePages } from './helpers/game-setup';
import { lockInAllPlayers, extractBudget } from './helpers/e2e-actions';
import {
	getAvailableClients,
	acquireClient,
	configureOnboarding,
	getPortfolio
} from './helpers/client-management';

// ============================================================================
// API HELPERS (for non-UI sections where API is faster/cleaner)
// ============================================================================

/**
 * Cast an investigation vote via API
 */
async function castInvestigationVote(
	page: Page,
	roomCode: string,
	destName: string,
	targetEsp: string
) {
	return page.evaluate(
		async ({ rc, dn, te }) => {
			const res = await fetch(`/api/sessions/${rc}/destination/${dn}/investigation/vote`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ targetEsp: te })
			});
			return res.json();
		},
		{ rc: roomCode, dn: destName, te: targetEsp }
	);
}

/**
 * Get investigation votes via API
 */
async function getInvestigationVotes(page: Page, roomCode: string, destName: string) {
	return page.evaluate(
		async ({ rc, dn }) => {
			const res = await fetch(`/api/sessions/${rc}/destination/${dn}/investigation/vote`);
			return res.json();
		},
		{ rc: roomCode, dn: destName }
	);
}

/**
 * Find a high-risk client from available clients
 * Note: In round 1, there are always 3 high-risk clients available per ESP
 */
async function findHighRiskClient(
	page: Page,
	roomCode: string,
	teamName: string
): Promise<{ id: string; name: string }> {
	const clients = await getAvailableClients(page, roomCode, teamName);
	const highRiskClient = clients.find((c: any) => c.risk_level === 'high');
	return { id: highRiskClient.id, name: highRiskClient.name };
}

// ============================================================================
// TEST SUITES
// ============================================================================

test.describe('US-2.7: Coordination Panel', () => {
	// ============================================================================
	// SECTION 1: INVESTIGATION VOTING INTERFACE
	// ============================================================================
	test.describe.configure({ mode: 'serial' });

	test.describe('Section 1: Investigation Voting Interface', () => {
		let zmailPage: Page,
			intakePage: Page,
			yaglePage: Page,
			sendWavePage: Page,
			mailMonkeyPage: Page,
			bluePostPage: Page;

		test.afterEach(async ({ page }) => {
			await closePages(
				page,
				zmailPage,
				intakePage,
				yaglePage,
				sendWavePage,
				mailMonkeyPage,
				bluePostPage
			);
		});

		test('Display coordination panel with ESP targets and voting controls', async ({
			page,
			context
		}) => {
			// Given: a game with 3 destinations and 3 ESPs
			const result = await createGameWith3DestinationsAnd3ESPs(page, context);
			zmailPage = result.zmailPage;
			intakePage = result.intakePage;
			yaglePage = result.yaglePage;
			sendWavePage = result.sendWavePage;
			mailMonkeyPage = result.mailMonkeyPage;
			bluePostPage = result.bluePostPage;

			// When: zmail opens the Coordination Panel
			await zmailPage.click('[data-testid="coordination-panel-button"]');
			await zmailPage.waitForSelector('[data-testid="coordination-panel-modal"]');

			// Then: I should see a section titled "Joint Investigation"
			await expect(zmailPage.locator('[data-testid="joint-investigation-section"]')).toBeVisible();
			await expect(zmailPage.locator('[data-testid="joint-investigation-section"]')).toContainText(
				'Joint Investigation'
			);

			// And: I should see all 3 ESP teams as selectable investigation targets
			await expect(zmailPage.locator('[data-testid="esp-target-sendwave"]')).toBeVisible();
			await expect(zmailPage.locator('[data-testid="esp-target-mailmonkey"]')).toBeVisible();
			await expect(zmailPage.locator('[data-testid="esp-target-bluepost"]')).toBeVisible();

			// And: each target should show "0/3 votes"
			await expect(zmailPage.locator('[data-testid="vote-count-sendwave"]')).toContainText('0/3');
			await expect(zmailPage.locator('[data-testid="vote-count-mailmonkey"]')).toContainText('0/3');
			await expect(zmailPage.locator('[data-testid="vote-count-bluepost"]')).toContainText('0/3');

			// And: I should see the cost displayed
			await expect(zmailPage.locator('[data-testid="investigation-cost-info"]')).toContainText(
				'50 credits'
			);
		});

		test('Select, change, and clear investigation vote using UI', async ({ page, context }) => {
			// Given: a game with 3 destinations and 3 ESPs
			const result = await createGameWith3DestinationsAnd3ESPs(page, context);
			zmailPage = result.zmailPage;
			intakePage = result.intakePage;
			yaglePage = result.yaglePage;
			sendWavePage = result.sendWavePage;
			mailMonkeyPage = result.mailMonkeyPage;
			bluePostPage = result.bluePostPage;

			// And: zmail opens the Coordination Panel
			await zmailPage.click('[data-testid="coordination-panel-button"]');
			await zmailPage.waitForSelector('[data-testid="coordination-panel-modal"]');

			// When: I click to select "BluePost" as my investigation target
			await zmailPage.click('[data-testid="vote-button-bluepost"]');
			await zmailPage.waitForTimeout(500);

			// Then: "BluePost" should show as my selected vote
			await expect(zmailPage.locator('[data-testid="esp-target-bluepost"]')).toHaveAttribute(
				'data-selected',
				'true'
			);
			await expect(zmailPage.locator('[data-testid="vote-count-bluepost"]')).toContainText('1/3');

			// When: I click to select "SendWave" instead
			await zmailPage.click('[data-testid="vote-button-sendwave"]');
			await zmailPage.waitForTimeout(500);

			// Then: "SendWave" should show as my selected vote
			await expect(zmailPage.locator('[data-testid="esp-target-sendwave"]')).toHaveAttribute(
				'data-selected',
				'true'
			);
			// And: "BluePost" should no longer show my vote
			await expect(zmailPage.locator('[data-testid="esp-target-bluepost"]')).toHaveAttribute(
				'data-selected',
				'false'
			);
			await expect(zmailPage.locator('[data-testid="vote-count-bluepost"]')).toContainText('0/3');
			await expect(zmailPage.locator('[data-testid="vote-count-sendwave"]')).toContainText('1/3');

			// When: I click to deselect "SendWave" (clicking again on selected)
			await zmailPage.click('[data-testid="vote-button-sendwave"]');
			await zmailPage.waitForTimeout(500);

			// Then: I should have no active investigation vote
			await expect(zmailPage.locator('[data-testid="esp-target-sendwave"]')).toHaveAttribute(
				'data-selected',
				'false'
			);
			await expect(zmailPage.locator('[data-testid="vote-count-sendwave"]')).toContainText('0/3');
		});

		test('Real-time updates show other destinations votes', async ({ page, context }) => {
			// Given: a game with 3 destinations and 3 ESPs
			const result = await createGameWith3DestinationsAnd3ESPs(page, context);
			zmailPage = result.zmailPage;
			intakePage = result.intakePage;
			yaglePage = result.yaglePage;
			sendWavePage = result.sendWavePage;
			mailMonkeyPage = result.mailMonkeyPage;
			bluePostPage = result.bluePostPage;

			// And: zmail has the Coordination Panel open
			await zmailPage.click('[data-testid="coordination-panel-button"]');
			await zmailPage.waitForSelector('[data-testid="coordination-panel-modal"]');

			// When: intake opens their panel and votes for "BluePost"
			await intakePage.click('[data-testid="coordination-panel-button"]');
			await intakePage.waitForSelector('[data-testid="coordination-panel-modal"]');
			await intakePage.click('[data-testid="vote-button-bluepost"]');

			// Then: zmail should see "BluePost" update to "1/3 votes" in real-time
			await expect(zmailPage.locator('[data-testid="vote-count-bluepost"]')).toContainText('1/3', {
				timeout: 5000
			});

			// And: zmail should see "intake" listed as a voter for "BluePost"
			await expect(zmailPage.locator('[data-testid="voters-bluepost"]')).toContainText('intake');
		});

		test('Insufficient budget disables voting', async ({ page, context }) => {
			// Given: a game with 3 destinations and 3 ESPs
			const result = await createGameWith3DestinationsAnd3ESPs(page, context);
			zmailPage = result.zmailPage;
			intakePage = result.intakePage;
			yaglePage = result.yaglePage;
			sendWavePage = result.sendWavePage;
			mailMonkeyPage = result.mailMonkeyPage;
			bluePostPage = result.bluePostPage;

			// And: zmail has only 30 credits budget (less than 50 required)
			await zmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.setBudget(30);
			});
			await zmailPage.waitForTimeout(500);

			// When: zmail opens the Coordination Panel
			await zmailPage.click('[data-testid="coordination-panel-button"]');
			await zmailPage.waitForSelector('[data-testid="coordination-panel-modal"]');

			// Then: all ESP vote buttons should be disabled
			await expect(zmailPage.locator('[data-testid="vote-button-sendwave"]')).toBeDisabled();
			await expect(zmailPage.locator('[data-testid="vote-button-mailmonkey"]')).toBeDisabled();
			await expect(zmailPage.locator('[data-testid="vote-button-bluepost"]')).toBeDisabled();

			// And: should display "Not enough budget" message
			await expect(zmailPage.locator('[data-testid="budget-insufficient-message"]')).toBeVisible();
		});
	});

	// ============================================================================
	// SECTION 2: INVESTIGATION TRIGGER LOGIC
	// ============================================================================

	test.describe('Section 2: Investigation Trigger Logic', () => {
		let zmailPage: Page,
			intakePage: Page,
			yaglePage: Page,
			sendWavePage: Page,
			mailMonkeyPage: Page,
			bluePostPage: Page;

		test.afterEach(async ({ page }) => {
			await closePages(
				page,
				zmailPage,
				intakePage,
				yaglePage,
				sendWavePage,
				mailMonkeyPage,
				bluePostPage
			);
		});

		test('Investigation triggers with 2/3 consensus and charges 50 credits to voters', async ({
			page,
			context
		}) => {
			// Given: a game with 3 destinations and 3 ESPs
			const result = await createGameWith3DestinationsAnd3ESPs(page, context);
			const { roomCode } = result;
			zmailPage = result.zmailPage;
			intakePage = result.intakePage;
			yaglePage = result.yaglePage;
			sendWavePage = result.sendWavePage;
			mailMonkeyPage = result.mailMonkeyPage;
			bluePostPage = result.bluePostPage;

			// US-2.7: Capture console logs for destination pages
			zmailPage.on('console', (msg) => console.log(`[BROWSER zmail] ${msg.text()}`));
			intakePage.on('console', (msg) => console.log(`[BROWSER intake] ${msg.text()}`));
			yaglePage.on('console', (msg) => console.log(`[BROWSER yagle] ${msg.text()}`));

			// Record initial budgets
			const zmailBudgetBefore = await extractBudget(zmailPage, 'budget-current');
			const intakeBudgetBefore = await extractBudget(intakePage, 'budget-current');
			const yagleBudgetBefore = await extractBudget(yaglePage, 'budget-current');

			// And: zmail and intake vote to investigate BluePost (2/3 threshold met)
			await castInvestigationVote(zmailPage, roomCode, 'zmail', 'BluePost');
			await castInvestigationVote(intakePage, roomCode, 'intake', 'BluePost');
			// yagle abstains

			// When: all players lock in and resolution runs
			await lockInAllPlayers([
				zmailPage,
				intakePage,
				yaglePage,
				sendWavePage,
				mailMonkeyPage,
				bluePostPage
			]);

			// Wait for consequences phase
			await zmailPage.waitForSelector('[data-testid="consequences-header"]', { timeout: 15000 });

			// Then: investigation should be triggered against BluePost
			await expect(zmailPage.locator('[data-testid="investigation-result-section"]')).toBeVisible({
				timeout: 10000
			});
			await expect(zmailPage.locator('[data-testid="investigation-target"]')).toContainText(
				'BluePost'
			);

			// And: zmail and intake should be charged 50 credits each
			const zmailBudgetAfter = await extractBudget(zmailPage, 'budget-current');
			const intakeBudgetAfter = await extractBudget(intakePage, 'budget-current');
			const yagleBudgetAfter = await extractBudget(yaglePage, 'budget-current');

			// Extract revenue earned by each destination
			const zmailRevenue = await extractBudget(zmailPage, 'revenue-earned');
			const intakeRevenue = await extractBudget(intakePage, 'revenue-earned');
			const yagleRevenue = await extractBudget(yaglePage, 'revenue-earned');

			// Formula: budgetBefore - budgetAfter + revenue = investigation cost (50 for voters, 0 for non-voters)
			// Voters charged 50 credits
			expect(zmailBudgetBefore - zmailBudgetAfter + zmailRevenue).toBe(50);
			expect(intakeBudgetBefore - intakeBudgetAfter + intakeRevenue).toBe(50);
			// yagle didn't vote, not charged
			expect(yagleBudgetBefore - yagleBudgetAfter + yagleRevenue).toBe(0);
		});

		test('Investigation does not trigger without consensus and no credits charged', async ({
			page,
			context
		}) => {
			// Given: a game with 3 destinations and 3 ESPs
			const result = await createGameWith3DestinationsAnd3ESPs(page, context);
			const { roomCode } = result;
			zmailPage = result.zmailPage;
			intakePage = result.intakePage;
			yaglePage = result.yaglePage;
			sendWavePage = result.sendWavePage;
			mailMonkeyPage = result.mailMonkeyPage;
			bluePostPage = result.bluePostPage;

			// Record initial budgets
			const zmailBudgetBefore = await extractBudget(zmailPage, 'budget-current');
			const intakeBudgetBefore = await extractBudget(intakePage, 'budget-current');

			// And: votes are split (no 2/3 consensus)
			await castInvestigationVote(zmailPage, roomCode, 'zmail', 'BluePost');
			await castInvestigationVote(intakePage, roomCode, 'intake', 'SendWave');
			// yagle abstains

			// When: all players lock in and resolution runs
			await lockInAllPlayers([
				zmailPage,
				intakePage,
				yaglePage,
				sendWavePage,
				mailMonkeyPage,
				bluePostPage
			]);

			// Wait for consequences phase
			await zmailPage.waitForSelector('[data-testid="consequences-header"]', { timeout: 15000 });

			// Then: no investigation should be triggered
			await expect(
				zmailPage.locator('[data-testid="investigation-result-section"]')
			).not.toBeVisible();

			// And: no credits should be charged to voters
			const zmailBudgetAfter = await extractBudget(zmailPage, 'budget-current');
			const intakeBudgetAfter = await extractBudget(intakePage, 'budget-current');

			// Extract revenue earned by each destination
			const zmailRevenue = await extractBudget(zmailPage, 'revenue-earned');
			const intakeRevenue = await extractBudget(intakePage, 'revenue-earned');

			// Formula: budgetBefore - budgetAfter + revenue = 0 (no investigation cost when no consensus)
			expect(zmailBudgetBefore - zmailBudgetAfter + zmailRevenue).toBe(0);
			expect(intakeBudgetBefore - intakeBudgetAfter + intakeRevenue).toBe(0);
		});
	});

	// ============================================================================
	// SECTION 3: INVESTIGATION RESOLUTION
	// ============================================================================

	test.describe('Section 3: Investigation Resolution', () => {
		let zmailPage: Page,
			intakePage: Page,
			yaglePage: Page,
			sendWavePage: Page,
			mailMonkeyPage: Page,
			bluePostPage: Page;

		test.afterEach(async ({ page }) => {
			await closePages(
				page,
				zmailPage,
				intakePage,
				yaglePage,
				sendWavePage,
				mailMonkeyPage,
				bluePostPage
			);
		});

		test('Investigation suspends HIGH-risk client missing warmup protection', async ({
			page,
			context
		}) => {
			// Given: a game with 3 destinations and 3 ESPs
			const result = await createGameWith3DestinationsAnd3ESPs(page, context);
			const { roomCode } = result;
			zmailPage = result.zmailPage;
			intakePage = result.intakePage;
			yaglePage = result.yaglePage;
			sendWavePage = result.sendWavePage;
			mailMonkeyPage = result.mailMonkeyPage;
			bluePostPage = result.bluePostPage;

			// And: BluePost acquires a HIGH-risk client without warmup protection
			// Acquire a re_engagement client (available Round 1, high risk)
			const clients = await getAvailableClients(bluePostPage, roomCode, 'BluePost');
			const reEngagementClient = clients.find((c) => c.type === 're_engagement');
			expect(reEngagementClient).toBeDefined();
			await acquireClient(bluePostPage, roomCode, 'BluePost', reEngagementClient.id);

			// Configure without warmup (violation condition for HIGH-risk)
			await configureOnboarding(
				bluePostPage,
				roomCode,
				'BluePost',
				reEngagementClient.id,
				false,
				false
			);
			await bluePostPage.waitForTimeout(500);

			// And: zmail and intake vote to investigate BluePost (2/3 threshold met)
			await castInvestigationVote(zmailPage, roomCode, 'zmail', 'BluePost');
			await castInvestigationVote(intakePage, roomCode, 'intake', 'BluePost');

			// When: all players lock in and resolution runs
			await lockInAllPlayers([
				zmailPage,
				intakePage,
				yaglePage,
				sendWavePage,
				mailMonkeyPage,
				bluePostPage
			]);

			// Wait for consequences phase
			await zmailPage.waitForSelector('[data-testid="consequences-header"]', { timeout: 15000 });

			// Then: investigation result should show violation found
			await expect(zmailPage.locator('[data-testid="investigation-result-section"]')).toBeVisible();
			await expect(zmailPage.locator('[data-testid="investigation-result-message"]')).toContainText(
				'Bad practices found'
			);

			// And: the client should be suspended
			await expect(zmailPage.locator('[data-testid="suspended-client-name"]')).toContainText(
				reEngagementClient.name
			);

			// And: BluePost should see the suspended client in their dashboard
			await bluePostPage.waitForSelector('[data-testid="esp-consequences"]', { timeout: 15000 });
			await expect(bluePostPage.locator('[data-testid="investigation-message"]')).toContainText(
				'Investigation launched against you'
			);

			// Start next round (facilitator)
			await page.click('[data-testid="start-next-round-button"]');

			// When: Round 2 planning phase begins
			await bluePostPage.waitForTimeout(500);

			// Then: the client should appear as suspended in BluePost's portfolio
			const portfolio = await getPortfolio(bluePostPage, roomCode, 'BluePost');

			// Then: Client status is suspended
			expect(portfolio.team.client_states[reEngagementClient.id].status).toBe('Suspended');
		});

		test('Investigation finds no violation for ESP with empty portfolio', async ({
			page,
			context
		}) => {
			// Given: a game with 3 destinations and 3 ESPs
			const result = await createGameWith3DestinationsAnd3ESPs(page, context);
			const { roomCode } = result;
			zmailPage = result.zmailPage;
			intakePage = result.intakePage;
			yaglePage = result.yaglePage;
			sendWavePage = result.sendWavePage;
			mailMonkeyPage = result.mailMonkeyPage;
			bluePostPage = result.bluePostPage;

			// BluePost has no acquired clients (empty portfolio = no violations possible)

			// And: zmail and intake vote to investigate BluePost
			await castInvestigationVote(zmailPage, roomCode, 'zmail', 'BluePost');
			await castInvestigationVote(intakePage, roomCode, 'intake', 'BluePost');

			// When: all players lock in and resolution runs
			await lockInAllPlayers([
				zmailPage,
				intakePage,
				yaglePage,
				sendWavePage,
				mailMonkeyPage,
				bluePostPage
			]);

			// Wait for consequences phase
			await zmailPage.waitForSelector('[data-testid="consequences-header"]', { timeout: 15000 });

			// Then: investigation result should show "No violations detected"
			await expect(zmailPage.locator('[data-testid="investigation-result-section"]')).toBeVisible();
			await expect(zmailPage.locator('[data-testid="investigation-result-message"]')).toContainText(
				'No violations detected'
			);
		});
	});

	// ============================================================================
	// SECTION 8: BUDGET RESERVATION
	// ============================================================================

	test.describe('Section 8: Budget Reservation', () => {
		let zmailPage: Page,
			intakePage: Page,
			yaglePage: Page,
			sendWavePage: Page,
			mailMonkeyPage: Page,
			bluePostPage: Page;

		test.afterEach(async ({ page }) => {
			await closePages(
				page,
				zmailPage,
				intakePage,
				yaglePage,
				sendWavePage,
				mailMonkeyPage,
				bluePostPage
			);
		});

		test('Budget reservation displayed when voting (matches ESP pattern)', async ({
			page,
			context
		}) => {
			// Given: a game with 3 destinations and 3 ESPs
			const result = await createGameWith3DestinationsAnd3ESPs(page, context);
			zmailPage = result.zmailPage;
			intakePage = result.intakePage;
			yaglePage = result.yaglePage;
			sendWavePage = result.sendWavePage;
			mailMonkeyPage = result.mailMonkeyPage;
			bluePostPage = result.bluePostPage;

			// Get zmail's initial budget
			const initialBudget = await extractBudget(zmailPage, 'budget-current');

			// When: zmail votes to investigate BluePost via UI
			await zmailPage.click('[data-testid="coordination-panel-button"]');
			await zmailPage.waitForSelector('[data-testid="coordination-panel-modal"]');
			await zmailPage.click('[data-testid="vote-button-bluepost"]');
			await zmailPage.waitForTimeout(500);

			// Close modal to see dashboard
			await zmailPage.click('[data-testid="close-coordination-panel"]');
			await zmailPage.waitForTimeout(300);

			// Then: budget display should show available (current - 50 reserved)
			// Using same pattern as ESP dashboard: budget-current and budget-forecast
			const displayedBudget = await extractBudget(zmailPage, 'budget-current');
			expect(displayedBudget).toBe(initialBudget - 50);

			// And: should show pending costs indicator
			await expect(zmailPage.locator('[data-testid="pending-costs"]')).toContainText('50');
		});

		test('Vote auto-removed if budget insufficient at lock-in', async ({ page, context }) => {
			// Given: a game with 3 destinations and 3 ESPs
			const result = await createGameWith3DestinationsAnd3ESPs(page, context);
			const { roomCode } = result;
			zmailPage = result.zmailPage;
			intakePage = result.intakePage;
			yaglePage = result.yaglePage;
			sendWavePage = result.sendWavePage;
			mailMonkeyPage = result.mailMonkeyPage;
			bluePostPage = result.bluePostPage;

			// And: zmail votes to investigate BluePost (50 credits reserved)
			await castInvestigationVote(zmailPage, roomCode, 'zmail', 'BluePost');

			// And: zmail purchases ml_system (500 credits) - now over budget
			await zmailPage.click('[data-testid="tech-shop-button"]');
			await zmailPage.waitForSelector('[data-testid="tech-shop-modal"]');
			await zmailPage.click('[data-tool-id="ml_system"] [data-testid="purchase-button"]');
			// Confirm the purchase (required for expensive items that spend all budget)
			await zmailPage.click('[data-testid="confirm-purchase-button"]');
			await zmailPage.waitForTimeout(500);
			await zmailPage.click('[data-testid="close-tech-shop"]');

			// When: zmail attempts to lock in
			await zmailPage.locator('[data-testid="lock-in-button"]').click();
			await zmailPage.waitForTimeout(1000);

			// Then: the investigation vote should be auto-removed
			const votesAfter = await getInvestigationVotes(zmailPage, roomCode, 'zmail');
			expect(votesAfter.myVote).toBeNull();

			// And: zmail should see notification about vote removal
			await expect(zmailPage.locator('[data-testid="auto-correction-message"]')).toBeVisible();
			await expect(zmailPage.locator('[data-testid="auto-correction-message"]')).toContainText(
				'investigation vote'
			);
		});
	});

	// ============================================================================
	// SECTION 9: PHASE RESTRICTIONS
	// ============================================================================

	test.describe('Section 9: Phase Restrictions', () => {
		let zmailPage: Page,
			intakePage: Page,
			yaglePage: Page,
			sendWavePage: Page,
			mailMonkeyPage: Page,
			bluePostPage: Page;

		test.afterEach(async ({ page }) => {
			await closePages(
				page,
				zmailPage,
				intakePage,
				yaglePage,
				sendWavePage,
				mailMonkeyPage,
				bluePostPage
			);
		});

		test('Voting disabled after lock-in', async ({ page, context }) => {
			// Given: a game with 3 destinations and 3 ESPs
			const result = await createGameWith3DestinationsAnd3ESPs(page, context);
			const { roomCode } = result;
			zmailPage = result.zmailPage;
			intakePage = result.intakePage;
			yaglePage = result.yaglePage;
			sendWavePage = result.sendWavePage;
			mailMonkeyPage = result.mailMonkeyPage;
			bluePostPage = result.bluePostPage;

			// And: zmail has locked in their decisions
			await zmailPage.locator('[data-testid="lock-in-button"]').click();
			await zmailPage.waitForTimeout(500);

			// When: zmail opens the Coordination Panel
			await zmailPage.click('[data-testid="coordination-panel-button"]');
			await zmailPage.waitForSelector('[data-testid="coordination-panel-modal"]');

			// Then: the voting controls should be disabled
			await expect(zmailPage.locator('[data-testid="view-only-banner"]')).toBeVisible();
			await expect(zmailPage.locator('[data-testid="vote-button-sendwave"]')).toBeDisabled();
			await expect(zmailPage.locator('[data-testid="vote-button-mailmonkey"]')).toBeDisabled();
			await expect(zmailPage.locator('[data-testid="vote-button-bluepost"]')).toBeDisabled();

			// And: attempting to vote via API should fail
			const voteResult = await castInvestigationVote(zmailPage, roomCode, 'zmail', 'BluePost');
			expect(voteResult.success).toBe(false);
			expect(voteResult.error).toContain('Cannot vote after locking in');
		});
	});

	// ============================================================================
	// SECTION 5 & 6: RESULTS DISPLAY (Merged)
	// ============================================================================

	test.describe('Section 5 & 6: Investigation Results Display', () => {
		let zmailPage: Page,
			intakePage: Page,
			yaglePage: Page,
			sendWavePage: Page,
			mailMonkeyPage: Page,
			bluePostPage: Page;

		test.afterEach(async ({ page }) => {
			await closePages(
				page,
				zmailPage,
				intakePage,
				yaglePage,
				sendWavePage,
				mailMonkeyPage,
				bluePostPage
			);
		});

		test('All destinations and investigated ESP see investigation results in consequences phase', async ({
			page,
			context
		}) => {
			// Given: a game with 3 destinations and 3 ESPs
			const result = await createGameWith3DestinationsAnd3ESPs(page, context);
			const { roomCode } = result;
			zmailPage = result.zmailPage;
			intakePage = result.intakePage;
			yaglePage = result.yaglePage;
			sendWavePage = result.sendWavePage;
			mailMonkeyPage = result.mailMonkeyPage;
			bluePostPage = result.bluePostPage;

			// And: zmail and intake vote to investigate BluePost
			await castInvestigationVote(zmailPage, roomCode, 'zmail', 'BluePost');
			await castInvestigationVote(intakePage, roomCode, 'intake', 'BluePost');

			// When: all players lock in
			await lockInAllPlayers([
				zmailPage,
				intakePage,
				yaglePage,
				sendWavePage,
				mailMonkeyPage,
				bluePostPage
			]);

			// Wait for consequences phase on all pages
			await zmailPage.waitForSelector('[data-testid="consequences-header"]', { timeout: 15000 });
			await intakePage.waitForSelector('[data-testid="consequences-header"]', { timeout: 15000 });
			await yaglePage.waitForSelector('[data-testid="consequences-header"]', { timeout: 15000 });
			await bluePostPage.waitForSelector('[data-testid="esp-consequences"]', { timeout: 15000 });
			await sendWavePage.waitForSelector('[data-testid="esp-consequences"]', { timeout: 15000 });

			// Then: all destinations should see investigation results
			await expect(zmailPage.locator('[data-testid="investigation-result-section"]')).toBeVisible();
			await expect(
				intakePage.locator('[data-testid="investigation-result-section"]')
			).toBeVisible();
			// yagle didn't vote but should still see results
			await expect(yaglePage.locator('[data-testid="investigation-result-section"]')).toBeVisible();

			// And: results should show the target ESP
			await expect(zmailPage.locator('[data-testid="investigation-target"]')).toContainText(
				'BluePost'
			);

			// And: BluePost (investigated) should see investigation message
			await expect(bluePostPage.locator('[data-testid="investigation-message"]')).toBeVisible();
			await expect(bluePostPage.locator('[data-testid="investigation-message"]')).toContainText(
				'Investigation launched against you'
			);

			// And: SendWave (not investigated) should NOT see investigation message
			await expect(sendWavePage.locator('[data-testid="investigation-message"]')).not.toBeVisible();
		});
	});

	// ============================================================================
	// SECTION 7: INVESTIGATION HISTORY
	// ============================================================================

	test.describe('Section 7: Investigation History', () => {
		let zmailPage: Page,
			intakePage: Page,
			yaglePage: Page,
			sendWavePage: Page,
			mailMonkeyPage: Page,
			bluePostPage: Page;

		test.afterEach(async ({ page }) => {
			await closePages(
				page,
				zmailPage,
				intakePage,
				yaglePage,
				sendWavePage,
				mailMonkeyPage,
				bluePostPage
			);
		});

		test('Votes reset at start of each planning phase', async ({ page, context }) => {
			// Given: a game with 3 destinations and 3 ESPs
			const result = await createGameWith3DestinationsAnd3ESPs(page, context);
			const { roomCode } = result;
			zmailPage = result.zmailPage;
			intakePage = result.intakePage;
			yaglePage = result.yaglePage;
			sendWavePage = result.sendWavePage;
			mailMonkeyPage = result.mailMonkeyPage;
			bluePostPage = result.bluePostPage;

			// And: zmail voted to investigate BluePost in round 1 (but not triggered - only 1 vote)
			await castInvestigationVote(zmailPage, roomCode, 'zmail', 'BluePost');

			// Verify vote is active
			const votesBefore = await getInvestigationVotes(zmailPage, roomCode, 'zmail');
			expect(votesBefore.myVote).toBe('BluePost');

			// Lock in all players (no investigation triggers - only 1 vote)
			await lockInAllPlayers([
				zmailPage,
				intakePage,
				yaglePage,
				sendWavePage,
				mailMonkeyPage,
				bluePostPage
			]);

			// Wait for consequences phase
			await zmailPage.waitForSelector('[data-testid="consequences-header"]', { timeout: 15000 });

			// Start next round (facilitator)
			await page.click('[data-testid="start-next-round-button"]');
			await zmailPage.waitForTimeout(2000);

			// When: Round 2 planning phase begins
			// Then: zmail should have no active vote
			const votesAfter = await getInvestigationVotes(zmailPage, roomCode, 'zmail');
			expect(votesAfter.myVote).toBeNull();

			// And: when opening the Coordination Panel, all ESP targets should show "0/3 votes"
			await zmailPage.click('[data-testid="coordination-panel-button"]');
			await zmailPage.waitForSelector('[data-testid="coordination-panel-modal"]');

			await expect(zmailPage.locator('[data-testid="vote-count-sendwave"]')).toContainText('0/3');
			await expect(zmailPage.locator('[data-testid="vote-count-mailmonkey"]')).toContainText('0/3');
			await expect(zmailPage.locator('[data-testid="vote-count-bluepost"]')).toContainText('0/3');
		});
	});
});
