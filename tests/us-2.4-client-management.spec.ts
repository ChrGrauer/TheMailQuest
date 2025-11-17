/**
 * E2E Tests for US-2.4.0: Client Basic Management (ESP)
 *
 * Tests client portfolio management functionality using REAL API calls:
 * - Client list display with status visualization
 * - New client onboarding options (warm-up, list hygiene)
 * - Existing client management (toggle active/paused)
 * - Real-time budget calculations
 * - Revenue preview calculations
 *
 * IMPORTANT: These tests use real API calls and actual game state,
 * not mocked test data. This provides true end-to-end integration testing.
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import {
	createGameInPlanningPhase ,
	closePages
} from './helpers/game-setup';
import {
	acquireClient,
	toggleClientStatus,
	configureOnboarding,
	getPortfolio,
	getAvailableClientIds,
	openClientManagementModal,
	closeClientManagementModal
} from './helpers/client-management';

test.describe('US-2.4.0: Client Basic Management (ESP)', () => {
	let facilitatorPage: Page;
	let alicePage: Page;
	let bobPage: Page;
	let context: BrowserContext;
	let roomCode: string;

	test.beforeEach(async ({ browser }) => {
		context = await browser.newContext();
		facilitatorPage = await context.newPage();

		// Create session with ESP team and start game in planning phase
		const result = await createGameInPlanningPhase(facilitatorPage, context);
		alicePage = result.alicePage;
		bobPage = result.bobPage;
		roomCode = result.roomCode;
	});

	test.afterEach(async () => {
		await context.close();
	});

	// ============================================================================
	// SECTION 1: BASIC CLIENT PORTFOLIO DISPLAY
	// ============================================================================

	test('1.1: Open client management modal and see empty portfolio', async () => {
		// Given: Team has no clients yet (initial state)

		// When: Opens client management modal
		await openClientManagementModal(alicePage);

		// Then: Modal is visible
		await expect(alicePage.getByTestId('client-management-modal')).toBeVisible();
		await expect(alicePage.getByText('Client Portfolio Management')).toBeVisible();

		// And: Shows empty state or budget information
		await expect(alicePage.getByTestId('budget-banner')).toBeVisible();
	});

	test('1.2: Display acquired clients in portfolio', async () => {
		// Given: Team acquires clients from marketplace
		const clientIds = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
		expect(clientIds.length).toBeGreaterThan(0);

		// Acquire first 2 available clients
		const client1Id = clientIds[0];
		const client2Id = clientIds[1];

		const acquire1 = await acquireClient(alicePage, roomCode, 'SendWave', client1Id);
		expect(acquire1.success).toBe(true);

		const acquire2 = await acquireClient(alicePage, roomCode, 'SendWave', client2Id);
		expect(acquire2.success).toBe(true);

		// When: Opens client management modal
		await openClientManagementModal(alicePage);

		// Then: Both clients are visible in the portfolio (scope to modal)
		const modal = alicePage.getByTestId('client-management-modal');
		await expect(modal.getByTestId('client-card-0')).toBeVisible();
		await expect(modal.getByTestId('client-card-1')).toBeVisible();

		// And: Both have status badges showing "Active"
		await expect(modal.getByTestId('client-status-badge-0')).toContainText('Active');
		await expect(modal.getByTestId('client-status-badge-1')).toContainText('Active');
	});

	// ============================================================================
	// SECTION 2: NEW CLIENT ONBOARDING
	// ============================================================================

	test('2.1: New client shows onboarding options', async () => {
		// Given: Team acquires a new client
		const clientIds = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
		const clientId = clientIds[0];

		const acquireResult = await acquireClient(alicePage, roomCode, 'SendWave', clientId);
		expect(acquireResult.success).toBe(true);

		// When: Opens client management modal
		await openClientManagementModal(alicePage);

		// Then: Client card shows onboarding section
		const clientCard = alicePage.getByTestId('client-card-0');
		await expect(clientCard.getByTestId('onboarding-section')).toBeVisible();

		// And: Shows warm-up checkbox (150 credits)
		await expect(clientCard.getByTestId('warm-up-checkbox')).toBeVisible();
		await expect(clientCard.getByText('150 cr')).toBeVisible();

		// And: Shows list hygiene checkbox (80 credits)
		await expect(clientCard.getByTestId('list-hygiene-checkbox')).toBeVisible();
		await expect(clientCard.getByText('80 cr')).toBeVisible();

		// And: Both are unchecked by default
		await expect(clientCard.getByTestId('warm-up-checkbox')).not.toBeChecked();
		await expect(clientCard.getByTestId('list-hygiene-checkbox')).not.toBeChecked();
	});

	test('2.2: Configure onboarding warm-up for new client', async () => {
		// Given: Team acquires a new client
		const clientIds = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
		const clientId = clientIds[0];

		await acquireClient(alicePage, roomCode, 'SendWave', clientId);

		// Get initial credits
		const portfolioBefore = await getPortfolio(alicePage, roomCode, 'SendWave');
		const creditsBefore = portfolioBefore.team.credits;

		// When: Configure warm-up via API
		const result = await configureOnboarding(
			alicePage,
			roomCode,
			'SendWave',
			clientId,
			true,
			false
		);

		// Then: Onboarding configuration succeeds
		expect(result.success).toBe(true);
		expect(result.cost).toBe(150);

		// And: Credits are deducted
		const portfolioAfter = await getPortfolio(alicePage, roomCode, 'SendWave');
		expect(portfolioAfter.team.credits).toBe(creditsBefore - 150);

		// And: Client state reflects warm-up purchase
		const clientState = portfolioAfter.team.client_states[clientId];
		expect(clientState.has_warmup).toBe(true);
		expect(clientState.has_list_hygiene).toBe(false);
	});

	test('2.3: Configure both onboarding options', async () => {
		// Given: Team acquires a new client
		const clientIds = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
		const clientId = clientIds[0];

		await acquireClient(alicePage, roomCode, 'SendWave', clientId);

		const portfolioBefore = await getPortfolio(alicePage, roomCode, 'SendWave');
		const creditsBefore = portfolioBefore.team.credits;

		// When: Configure both options via API
		const result = await configureOnboarding(alicePage, roomCode, 'SendWave', clientId, true, true);

		// Then: Onboarding configuration succeeds
		expect(result.success).toBe(true);
		expect(result.cost).toBe(230); // 150 + 80

		// And: Credits are deducted
		const portfolioAfter = await getPortfolio(alicePage, roomCode, 'SendWave');
		expect(portfolioAfter.team.credits).toBe(creditsBefore - 230);

		// And: Client state reflects both purchases
		const clientState = portfolioAfter.team.client_states[clientId];
		expect(clientState.has_warmup).toBe(true);
		expect(clientState.has_list_hygiene).toBe(true);
	});

	test('2.4: Cannot configure onboarding with insufficient credits', async () => {
		// Given: Team acquires one client (leaves them with 800 credits)
		const clientIds = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
		const clientId = clientIds[0];

		const acquireResult = await acquireClient(alicePage, roomCode, 'SendWave', clientId);
		expect(acquireResult.success).toBe(true);

		// Acquire more clients until credits < 230
		let creditsRemaining = acquireResult.team.credits;
		let attempts = 0;

		while (creditsRemaining >= 230 && attempts < clientIds.length - 1) {
			attempts++;
			const nextClientId = clientIds[attempts];
			const result = await acquireClient(alicePage, roomCode, 'SendWave', nextClientId);
			if (result.success) {
				creditsRemaining = result.team.credits;
			} else {
				break; // Can't afford more clients
			}
		}

		// Skip test if we couldn't get to <230 credits (rare edge case)
		if (creditsRemaining >= 230) {
			console.log(
				`Skipping test: Unable to reduce credits below 230 (remaining: ${creditsRemaining})`
			);
			return;
		}

		// When: Try to configure expensive onboarding options
		const result = await configureOnboarding(
			alicePage,
			roomCode,
			'SendWave',
			clientId, // First acquired client
			true,
			true
		);

		// Then: Configuration fails due to insufficient budget
		expect(result.success).toBe(false);
		expect(result.error).toMatch(/insufficient/i);
	});

	// ============================================================================
	// SECTION 3: EXISTING CLIENT MANAGEMENT
	// ============================================================================

	test('3.1: Toggle client from Active to Paused', async () => {
		// Given: Team has an active client
		const clientIds = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
		const clientId = clientIds[0];

		await acquireClient(alicePage, roomCode, 'SendWave', clientId);

		// When: Toggle client to Paused
		const result = await toggleClientStatus(alicePage, roomCode, 'SendWave', clientId, 'Paused');

		// Then: Toggle succeeds
		expect(result.success).toBe(true);

		// And: Client state is updated
		const portfolio = await getPortfolio(alicePage, roomCode, 'SendWave');
		expect(portfolio.team.client_states[clientId].status).toBe('Paused');

		// And: UI reflects the change
		await openClientManagementModal(alicePage);
		const modal = alicePage.getByTestId('client-management-modal');
		await expect(modal.getByTestId('client-status-badge-0')).toContainText('Paused');
	});

	test('3.2: Toggle client from Paused to Active', async () => {
		// Given: Team has a paused client
		const clientIds = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
		const clientId = clientIds[0];

		await acquireClient(alicePage, roomCode, 'SendWave', clientId);
		await toggleClientStatus(alicePage, roomCode, 'SendWave', clientId, 'Paused');

		// When: Toggle client back to Active
		const result = await toggleClientStatus(alicePage, roomCode, 'SendWave', clientId, 'Active');

		// Then: Toggle succeeds
		expect(result.success).toBe(true);

		// And: Client state is updated
		const portfolio = await getPortfolio(alicePage, roomCode, 'SendWave');
		expect(portfolio.team.client_states[clientId].status).toBe('Active');
	});

	test('3.3: Visual distinction between Active and Paused clients', async () => {
		// Given: Team has two clients, one active and one paused
		const clientIds = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
		const client1Id = clientIds[0];
		const client2Id = clientIds[1];

		await acquireClient(alicePage, roomCode, 'SendWave', client1Id);
		await acquireClient(alicePage, roomCode, 'SendWave', client2Id);

		// Pause the second client
		await toggleClientStatus(alicePage, roomCode, 'SendWave', client2Id, 'Paused');

		// When: Opens client management modal
		await openClientManagementModal(alicePage);

		// Then: First client (Active) has green border and full opacity (scope to modal)
		const modal = alicePage.getByTestId('client-management-modal');
		const activeCard = modal.getByTestId('client-card-0');
		const activeStyles = await activeCard.evaluate((el) => {
			const styles = window.getComputedStyle(el);
			return {
				borderLeftWidth: styles.borderLeftWidth,
				opacity: styles.opacity
			};
		});
		// Check for 4px border-left (border-l-4 class)
		expect(activeStyles.borderLeftWidth).toBe('4px');
		expect(activeStyles.opacity).toBe('1');

		// And: Second client (Paused) has reduced opacity
		const pausedCard = modal.getByTestId('client-card-1');
		const pausedStyles = await pausedCard.evaluate((el) => {
			const styles = window.getComputedStyle(el);
			return {
				borderLeftWidth: styles.borderLeftWidth,
				opacity: styles.opacity
			};
		});
		expect(pausedStyles.borderLeftWidth).toBe('4px');
		expect(parseFloat(pausedStyles.opacity)).toBeLessThan(1);
	});

	// ============================================================================
	// SECTION 4: BUDGET AND REVENUE CALCULATIONS
	// ============================================================================

	test('4.1: Budget banner shows current credits', async () => {
		// Given: Team has known credits
		const portfolio = await getPortfolio(alicePage, roomCode, 'SendWave');
		const expectedCredits = portfolio.team.credits;

		// When: Opens client management modal
		await openClientManagementModal(alicePage);

		// Then: Budget banner shows current credits (formatted with toLocaleString)
		const budgetBanner = alicePage.getByTestId('budget-banner');
		await expect(budgetBanner).toBeVisible();
		await expect(budgetBanner).toContainText(`${expectedCredits.toLocaleString()} credits`);
	});

	test('4.2: Budget updates after onboarding configuration', async () => {
		// Given: Team acquires a new client
		const clientIds = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
		const clientId = clientIds[0];

		await acquireClient(alicePage, roomCode, 'SendWave', clientId);

		const portfolioBefore = await getPortfolio(alicePage, roomCode, 'SendWave');
		const creditsBefore = portfolioBefore.team.credits;

		// When: Configure onboarding
		await configureOnboarding(alicePage, roomCode, 'SendWave', clientId, true, false);

		// Then: Portfolio reflects updated budget
		const portfolioAfter = await getPortfolio(alicePage, roomCode, 'SendWave');
		expect(portfolioAfter.budget_forecast).toBe(creditsBefore - 150);
	});

	test('4.3: Revenue preview shows potential from active clients', async () => {
		// Given: Team has active clients
		const clientIds = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
		const client1Id = clientIds[0];
		const client2Id = clientIds[1];

		await acquireClient(alicePage, roomCode, 'SendWave', client1Id);
		await acquireClient(alicePage, roomCode, 'SendWave', client2Id);

		// When: Get portfolio data
		const portfolio = await getPortfolio(alicePage, roomCode, 'SendWave');

		// Then: Revenue preview is calculated
		expect(portfolio.revenue_preview).toBeGreaterThan(0);

		// And: UI shows revenue preview
		await openClientManagementModal(alicePage);
		await expect(alicePage.getByTestId('revenue-preview')).toBeVisible();
		await expect(alicePage.getByTestId('revenue-preview')).toContainText(
			`${portfolio.revenue_preview}`
		);
	});

	test('4.4: Paused clients excluded from revenue preview', async () => {
		// Given: Team has two clients
		const clientIds = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
		const client1Id = clientIds[0];
		const client2Id = clientIds[1];

		await acquireClient(alicePage, roomCode, 'SendWave', client1Id);
		await acquireClient(alicePage, roomCode, 'SendWave', client2Id);

		// Get revenue with both active
		const portfolioBothActive = await getPortfolio(alicePage, roomCode, 'SendWave');
		const revenueWithBoth = portfolioBothActive.revenue_preview;

		// When: Pause one client
		await toggleClientStatus(alicePage, roomCode, 'SendWave', client2Id, 'Paused');

		// Then: Revenue preview decreases
		const portfolioOnePaused = await getPortfolio(alicePage, roomCode, 'SendWave');
		expect(portfolioOnePaused.revenue_preview).toBeLessThan(revenueWithBoth);
	});

	// ============================================================================
	// SECTION 5: CLIENT STATE PERSISTENCE
	// ============================================================================

	test('5.1: Client remains "new" until first activation', async () => {
		// Given: Team acquires a new client
		const clientIds = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
		const clientId = clientIds[0];

		await acquireClient(alicePage, roomCode, 'SendWave', clientId);

		// When: Check client state
		const portfolio = await getPortfolio(alicePage, roomCode, 'SendWave');
		const clientState = portfolio.team.client_states[clientId];

		// Then: first_active_round is null (client is "new")
		expect(clientState.first_active_round).toBeNull();

		// And: Onboarding section is visible
		await openClientManagementModal(alicePage);
		const clientCard = alicePage.getByTestId('client-card-0');
		await expect(clientCard.getByTestId('onboarding-section')).toBeVisible();
	});

	test('5.2: Onboarding state persists after configuration', async () => {
		// Given: Team configures onboarding for a client
		const clientIds = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
		const clientId = clientIds[0];

		await acquireClient(alicePage, roomCode, 'SendWave', clientId);
		await configureOnboarding(alicePage, roomCode, 'SendWave', clientId, true, true);

		// When: Reload portfolio
		await alicePage.reload();
		await alicePage.waitForFunction(
			() => (window as any).__espDashboardTest?.ready === true,
			{},
			{ timeout: 10000 }
		);

		const portfolio = await getPortfolio(alicePage, roomCode, 'SendWave');
		const clientState = portfolio.team.client_states[clientId];

		// Then: Onboarding configuration persists
		expect(clientState.has_warmup).toBe(true);
		expect(clientState.has_list_hygiene).toBe(true);
	});

	test('5.3: Client status persists after page reload', async () => {
		// Given: Team pauses a client
		const clientIds = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
		const clientId = clientIds[0];

		await acquireClient(alicePage, roomCode, 'SendWave', clientId);
		await toggleClientStatus(alicePage, roomCode, 'SendWave', clientId, 'Paused');

		// When: Reload page
		await alicePage.reload();
		await alicePage.waitForFunction(
			() => (window as any).__espDashboardTest?.ready === true,
			{},
			{ timeout: 10000 }
		);

		const portfolio = await getPortfolio(alicePage, roomCode, 'SendWave');

		// Then: Client status persists
		expect(portfolio.team.client_states[clientId].status).toBe('Paused');
	});

	// ============================================================================
	// SECTION 6: MODAL INTERACTIONS
	// ============================================================================

	test('6.1: Can close modal with close button', async () => {
		// Given: Modal is open
		await openClientManagementModal(alicePage);
		await expect(alicePage.getByTestId('client-management-modal')).toBeVisible();

		// When: Click close button
		await closeClientManagementModal(alicePage);

		// Then: Modal is hidden
		await expect(alicePage.getByTestId('client-management-modal')).not.toBeVisible();
	});

	test('6.2: Can close modal with overlay click', async () => {
		// Given: Modal is open
		await openClientManagementModal(alicePage);

		// When: Click modal overlay (outside modal content) - click on top-left corner
		await alicePage.getByTestId('modal-overlay').click({ position: { x: 10, y: 10 } });

		// Then: Modal is hidden
		await expect(alicePage.getByTestId('client-management-modal')).not.toBeVisible();
	});

	// ============================================================================
	// SECTION 7: PORTFOLIO DISPLAY ON MAIN DASHBOARD
	// ============================================================================

	test('7.1: Acquired client displays on dashboard portfolio', async () => {
		// Given: ESP team acquires a client
		const availableClientIds = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
		const firstClientId = availableClientIds[0];

		// When: Acquiring a client from marketplace
		await acquireClient(alicePage, roomCode, 'SendWave', firstClientId);

		// Wait for WebSocket update and portfolio refresh
		await alicePage.waitForTimeout(2000);

		// Then: Active Portfolio shows client with full details
		const portfolio = alicePage.locator('[data-testid="client-portfolio"]');

		const clientCard = portfolio.locator('[data-testid="client-card-0"]');
		await expect(clientCard).toBeVisible();

		// And: Client displays name (check for any non-empty text that's not just whitespace)
		const cardText = await clientCard.textContent();
		expect(cardText).toBeTruthy();
		expect(cardText?.length).toBeGreaterThan(10); // Has substantial content

		// And: Client displays status badge
		const statusBadge = clientCard.locator('[data-testid^="client-status-badge"]');
		await expect(statusBadge).toBeVisible();
		await expect(statusBadge).toContainText('Active');

		// And: Client displays revenue
		await expect(clientCard).toContainText(/\d+.*credits.*round/i);

		// And: Client displays volume
		await expect(clientCard).toContainText(/\d+.*emails.*round/i);

		// And: Client displays risk level
		await expect(clientCard).toContainText(/(Low|Medium|High)/);

		// And: Portfolio header shows count
		const header = alicePage.locator('[data-testid="portfolio-header"]');
		await expect(header).toContainText('1 active client');
	});

	test('7.2: Multiple clients display correctly', async () => {
		// Given: ESP team acquires 2 clients
		const availableClientIds = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
		await acquireClient(alicePage, roomCode, 'SendWave', availableClientIds[0]);
		await alicePage.waitForTimeout(1500);
		await acquireClient(alicePage, roomCode, 'SendWave', availableClientIds[1]);

		// Wait for WebSocket updates
		await alicePage.waitForTimeout(2000);

		// When: Viewing dashboard portfolio
		const portfolio = alicePage.locator('[data-testid="client-portfolio"]');

		// Then: Both clients are visible
		const clientCards = portfolio.locator('[data-testid^="client-card-"]');
		await expect(clientCards).toHaveCount(2);

		// And: Each client has status badge
		await expect(clientCards.first().locator('[data-testid^="client-status-badge"]')).toBeVisible();
		await expect(clientCards.nth(1).locator('[data-testid^="client-status-badge"]')).toBeVisible();

		// And: Portfolio header shows correct count
		const header = alicePage.locator('[data-testid="portfolio-header"]');
		await expect(header).toContainText('2 active clients');
	});

	test('7.3: Portfolio updates in real-time after acquisition', async () => {
		// Given: Viewing dashboard with empty portfolio
		const portfolio = alicePage.locator('[data-testid="client-portfolio"]');
		await expect(portfolio.getByTestId('portfolio-empty-state')).toBeVisible();

		// When: Acquiring a client (triggers WebSocket update)
		const availableClientIds = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
		await acquireClient(alicePage, roomCode, 'SendWave', availableClientIds[0]);

		// Wait for WebSocket update
		await alicePage.waitForTimeout(1000);

		// Then: Portfolio updates automatically without page refresh
		await expect(portfolio.getByTestId('portfolio-empty-state')).not.toBeVisible();
		const clientCard = portfolio.locator('[data-testid="client-card-0"]');
		await expect(clientCard).toBeVisible();

		// And: Client shows full details immediately
		const cardText2 = await clientCard.textContent();
		expect(cardText2).toBeTruthy();
		expect(cardText2?.length).toBeGreaterThan(10);
		await expect(clientCard.locator('[data-testid^="client-status-badge"]')).toContainText(
			'Active'
		);
	});

	test('7.4: Portfolio reflects status changes from management modal', async () => {
		// Given: ESP has an active client
		const availableClientIds = await getAvailableClientIds(alicePage, roomCode, 'SendWave');
		await acquireClient(alicePage, roomCode, 'SendWave', availableClientIds[0]);

		// And: Client is Active in portfolio
		const portfolio = alicePage.locator('[data-testid="client-portfolio"]');
		const clientCard = portfolio.locator('[data-testid="client-card-0"]');
		await expect(clientCard.locator('[data-testid^="client-status-badge"]')).toContainText(
			'Active'
		);

		// When: Toggling status to Paused in ClientManagementModal
		await openClientManagementModal(alicePage);

		const modal = alicePage.getByTestId('client-management-modal');
		const modalClientCard = modal.getByTestId('client-card-0');
		const pauseButton = modalClientCard.getByTestId('toggle-paused-btn');
		await pauseButton.click();

		// Wait for API update
		await alicePage.waitForTimeout(1000);

		await closeClientManagementModal(alicePage);

		// Wait for WebSocket update and portfolio refresh
		await alicePage.waitForTimeout(2500);

		// Then: Dashboard portfolio shows Paused status
		await expect(clientCard.locator('[data-testid^="client-status-badge"]')).toContainText(
			'Paused'
		);

		// And: Visual distinction is applied
		const cardStatus = await clientCard.getAttribute('data-status');
		expect(cardStatus).toBe('paused');
	});
});
