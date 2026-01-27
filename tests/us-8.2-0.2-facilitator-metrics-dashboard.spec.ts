/**
 * E2E Tests for US-8.2-0.2: Facilitator Metrics Dashboard
 *
 * As a facilitator
 * I want to see comprehensive metrics for all players in a compact table format
 * So that I can monitor game progress and make informed decisions
 */

import { test, expect } from './fixtures';
import { createGameInPlanningPhase, closePages } from './helpers/game-setup';
import { purchaseTechUpgrade } from './helpers/client-management';

// ============================================================================
// Dashboard Layout Tests
// ============================================================================

test.describe('US-8.2-0.2: Dashboard Layout', () => {
	test('Dashboard displays header with game status', async ({ page, context }) => {
		// Given: a game in planning phase
		const { alicePage, bobPage, roomCode } = await createGameInPlanningPhase(page, context);

		// Wait for facilitator page to fully load
		await page.waitForURL(/\/facilitator/, { timeout: 10000 });
		await page.waitForTimeout(500);

		// Then: header should display round info (Round 1)
		await expect(page.getByText(/Round 1/)).toBeVisible();

		// And: header should display current phase
		await expect(page.locator('[data-testid="current-phase"]')).toContainText('planning');

		// And: header should display the timer
		await expect(page.locator('[data-testid="game-timer"]')).toBeVisible();

		await closePages(page, alicePage, bobPage);
	});

	test('Dashboard displays ESP metrics table', async ({ page, context }) => {
		// Given: a game in planning phase
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Then: ESP metrics table should be visible
		await expect(page.locator('[data-testid="esp-metrics-table"]')).toBeVisible();

		// And: should have column headers
		await expect(page.locator('[data-testid="esp-metrics-table"]')).toContainText('Team');
		await expect(page.locator('[data-testid="esp-metrics-table"]')).toContainText('Budget');

		await closePages(page, alicePage, bobPage);
	});

	test('Dashboard displays Destination metrics table', async ({ page, context }) => {
		// Given: a game in planning phase
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Then: Destination metrics table should be visible
		await expect(page.locator('[data-testid="destination-metrics-table"]')).toBeVisible();

		// And: should have column headers
		await expect(page.locator('[data-testid="destination-metrics-table"]')).toContainText(
			'Destination'
		);
		await expect(page.locator('[data-testid="destination-metrics-table"]')).toContainText('Budget');

		await closePages(page, alicePage, bobPage);
	});
});

// ============================================================================
// ESP Metrics Table Tests
// ============================================================================

test.describe('US-8.2-0.2: ESP Metrics Table', () => {
	test('ESP metrics table shows all ESP teams', async ({ page, context }) => {
		// Given: a game with ESP teams
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Then: SendWave row should be visible
		const espTable = page.locator('[data-testid="esp-metrics-table"]');
		await expect(espTable.locator('[data-testid="esp-row-SendWave"]')).toBeVisible();

		await closePages(page, alicePage, bobPage);
	});

	test('ESP metrics table displays budget column', async ({ page, context }) => {
		// Given: a game with ESP teams
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Then: SendWave should show budget (1000 is starting budget)
		const sendWaveRow = page.locator('[data-testid="esp-row-SendWave"]');
		await expect(sendWaveRow.locator('[data-testid="esp-budget"]')).toContainText('700');

		await closePages(page, alicePage, bobPage);
	});

	test('ESP metrics table displays reputation columns for each destination', async ({
		page,
		context
	}) => {
		// Given: a game with ESP teams
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Then: SendWave should show reputation for zmail (starting at 70)
		const sendWaveRow = page.locator('[data-testid="esp-row-SendWave"]');
		await expect(sendWaveRow.locator('[data-testid="esp-rep-zmail"]')).toContainText('70');
		await expect(sendWaveRow.locator('[data-testid="esp-rep-intake"]')).toContainText('70');
		await expect(sendWaveRow.locator('[data-testid="esp-rep-yagle"]')).toContainText('70');

		await closePages(page, alicePage, bobPage);
	});

	test('ESP metrics table displays spam rate as N/A in round 1 planning', async ({
		page,
		context
	}) => {
		// Given: a game in round 1 planning phase
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Then: spam rate should show N/A (no resolution history yet)
		const sendWaveRow = page.locator('[data-testid="esp-row-SendWave"]');
		await expect(sendWaveRow.locator('[data-testid="esp-spam-rate"]')).toContainText('N/A');

		await closePages(page, alicePage, bobPage);
	});

	test('ESP metrics table displays tech tools with ownership status', async ({ page, context }) => {
		// Given: a game with ESP teams (no tech purchased yet)
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Then: SendWave should show all tech as not owned (✗)
		const sendWaveRow = page.locator('[data-testid="esp-row-SendWave"]');
		const techCell = sendWaveRow.locator('[data-testid="esp-tech-tools"]');

		// Should show SPF as not owned
		await expect(techCell.locator('[data-testid="tech-spf"]')).toContainText('SPF');
		await expect(techCell.locator('[data-testid="tech-spf"]')).toHaveAttribute(
			'data-owned',
			'false'
		);

		await closePages(page, alicePage, bobPage);
	});

	test('ESP metrics table displays clients by type column', async ({ page, context }) => {
		// Given: a game with ESP teams (no clients yet)
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Then: SendWave should show clients column (empty or "None")
		const sendWaveRow = page.locator('[data-testid="esp-row-SendWave"]');
		await expect(sendWaveRow.locator('[data-testid="esp-clients"]')).toBeVisible();

		await closePages(page, alicePage, bobPage);
	});
});

// ============================================================================
// Destination Metrics Table Tests
// ============================================================================

test.describe('US-8.2-0.2: Destination Metrics Table', () => {
	test('Destination metrics table shows all destinations', async ({ page, context }) => {
		// Given: a game with destinations
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Then: zmail, intake, yagle rows should be visible
		const destTable = page.locator('[data-testid="destination-metrics-table"]');
		await expect(destTable.locator('[data-testid="dest-row-zmail"]')).toBeVisible();
		await expect(destTable.locator('[data-testid="dest-row-intake"]')).toBeVisible();
		await expect(destTable.locator('[data-testid="dest-row-yagle"]')).toBeVisible();

		await closePages(page, alicePage, bobPage);
	});

	test('Destination metrics table displays budget column', async ({ page, context }) => {
		// Given: a game with destinations (Bob joined zmail)
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Then: zmail should show budget (500 is starting budget for zmail)
		// Note: Only destinations with players get budget allocated
		const zmailRow = page.locator('[data-testid="dest-row-zmail"]');
		await expect(zmailRow.locator('[data-testid="dest-budget"]')).toContainText('500');

		await closePages(page, alicePage, bobPage);
	});

	test('Destination metrics table displays user satisfaction column', async ({ page, context }) => {
		// Given: a game with destinations (no resolution yet, satisfaction N/A or 0)
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Then: zmail should show satisfaction column
		const zmailRow = page.locator('[data-testid="dest-row-zmail"]');
		await expect(zmailRow.locator('[data-testid="dest-satisfaction"]')).toBeVisible();

		await closePages(page, alicePage, bobPage);
	});

	test('Destination metrics table displays tech tools with ownership status', async ({
		page,
		context
	}) => {
		// Given: a game with destinations (no tech purchased yet)
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Then: zmail should show all tech as not owned
		const zmailRow = page.locator('[data-testid="dest-row-zmail"]');
		const techCell = zmailRow.locator('[data-testid="dest-tech-tools"]');

		// Should show Content Analysis as not owned
		await expect(techCell.locator('[data-testid="tool-content_analysis_filter"]')).toBeVisible();
		await expect(techCell.locator('[data-testid="tool-content_analysis_filter"]')).toHaveAttribute(
			'data-owned',
			'false'
		);

		await closePages(page, alicePage, bobPage);
	});
});

// ============================================================================
// Real-time Updates Tests
// ============================================================================

test.describe('US-8.2-0.2: Real-time Updates', () => {
	test('ESP budget updates in real-time when tech is purchased', async ({ page, context }) => {
		// Given: a game with ESP teams
		const { alicePage, bobPage, roomCode } = await createGameInPlanningPhase(page, context);

		// Wait for facilitator page to load
		await page.waitForURL(/\/facilitator/, { timeout: 10000 });

		// Initial budget should be 1000
		const sendWaveRow = page.locator('[data-testid="esp-row-SendWave"]');
		await expect(sendWaveRow.locator('[data-testid="esp-budget"]')).toContainText('700', {
			timeout: 5000
		});

		// When: ESP purchases SPF (100 credits)
		await purchaseTechUpgrade(alicePage, roomCode, 'SendWave', 'spf');

		// Then: Budget should update to 700-100 = 600 (with polling)
		await expect(sendWaveRow.locator('[data-testid="esp-budget"]')).toContainText('600', {
			timeout: 5000
		});

		await closePages(page, alicePage, bobPage);
	});

	test('ESP tech ownership updates in real-time when tech is purchased', async ({
		page,
		context
	}) => {
		// Given: a game with ESP teams
		const { alicePage, bobPage, roomCode } = await createGameInPlanningPhase(page, context);

		// Wait for facilitator page to load
		await page.waitForURL(/\/facilitator/, { timeout: 10000 });

		// Initial: SPF not owned
		const sendWaveRow = page.locator('[data-testid="esp-row-SendWave"]');
		const techCell = sendWaveRow.locator('[data-testid="esp-tech-tools"]');
		await expect(techCell.locator('[data-testid="tech-spf"]')).toHaveAttribute(
			'data-owned',
			'false',
			{ timeout: 5000 }
		);

		// When: ESP purchases SPF
		await purchaseTechUpgrade(alicePage, roomCode, 'SendWave', 'spf');

		// Then: SPF should show as owned (with polling)
		await expect(techCell.locator('[data-testid="tech-spf"]')).toHaveAttribute(
			'data-owned',
			'true',
			{ timeout: 5000 }
		);

		await closePages(page, alicePage, bobPage);
	});
});

// ============================================================================
// Tech Tools Display Tests
// ============================================================================

test.describe('US-8.2-0.2: ESP Tech Tools Display', () => {
	test('ESP tech tools show SPF, DKIM, DMARC, Content, Monitor', async ({ page, context }) => {
		// Given: a game with ESP teams
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Then: Tech cell should show all 5 tech tools
		const sendWaveRow = page.locator('[data-testid="esp-row-SendWave"]');
		const techCell = sendWaveRow.locator('[data-testid="esp-tech-tools"]');

		await expect(techCell.locator('[data-testid="tech-spf"]')).toBeVisible();
		await expect(techCell.locator('[data-testid="tech-dkim"]')).toBeVisible();
		await expect(techCell.locator('[data-testid="tech-dmarc"]')).toBeVisible();
		await expect(techCell.locator('[data-testid="tech-content-filtering"]')).toBeVisible();
		await expect(techCell.locator('[data-testid="tech-advanced-monitoring"]')).toBeVisible();

		await closePages(page, alicePage, bobPage);
	});

	test('ESP tech tools use checkmarks for owned status', async ({ page, context }) => {
		// Given: a game where ESP has purchased SPF and DKIM
		const { alicePage, bobPage, roomCode } = await createGameInPlanningPhase(page, context);

		// Wait for facilitator page to load
		await page.waitForURL(/\/facilitator/, { timeout: 10000 });

		const sendWaveRow = page.locator('[data-testid="esp-row-SendWave"]');
		const techCell = sendWaveRow.locator('[data-testid="esp-tech-tools"]');

		// Purchase SPF first
		await purchaseTechUpgrade(alicePage, roomCode, 'SendWave', 'spf');

		// Wait for SPF to show as owned
		await expect(techCell.locator('[data-testid="tech-spf"]')).toHaveAttribute(
			'data-owned',
			'true',
			{ timeout: 5000 }
		);

		// Then purchase DKIM
		await purchaseTechUpgrade(alicePage, roomCode, 'SendWave', 'dkim');

		// Wait for DKIM to show as owned
		await expect(techCell.locator('[data-testid="tech-dkim"]')).toHaveAttribute(
			'data-owned',
			'true',
			{ timeout: 5000 }
		);

		// DMARC should still not be owned
		await expect(techCell.locator('[data-testid="tech-dmarc"]')).toHaveAttribute(
			'data-owned',
			'false'
		);

		await closePages(page, alicePage, bobPage);
	});
});

test.describe('US-8.2-0.2: Destination Tech Tools Display', () => {
	test('Destination tech tools show all available tools', async ({ page, context }) => {
		// Given: a game with destinations
		const { alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		// Then: zmail tech cell should show all relevant tools
		const zmailRow = page.locator('[data-testid="dest-row-zmail"]');
		const techCell = zmailRow.locator('[data-testid="dest-tech-tools"]');

		await expect(techCell.locator('[data-testid="tool-content_analysis_filter"]')).toBeVisible();
		await expect(techCell.locator('[data-testid="tool-auth_validator_l1"]')).toBeVisible();
		await expect(techCell.locator('[data-testid="tool-auth_validator_l2"]')).toBeVisible();
		await expect(techCell.locator('[data-testid="tool-auth_validator_l3"]')).toBeVisible();

		await closePages(page, alicePage, bobPage);
	});
});
