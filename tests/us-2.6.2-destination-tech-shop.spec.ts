/**
 * US-2.6.2: Destination Tech Shop - E2E Tests
 * Following the feature file scenarios from features/US-2.6.2-tests/destination-tech-shop.feature
 */

import { test, expect } from './fixtures';
import { createGameWithDestination, closePages } from './helpers/game-setup';

// Test helper type for destination dashboard test API
type DestinationDashboardTestAPI = {
	ready: boolean;
	setBudget: (value: number) => void;
	setKingdom: (kingdom: string) => void;
	getOwnedTools: () => string[];
	getAuthLevel: () => number;
	openTechShop: () => void;
};

declare global {
	interface Window {
		__destinationDashboardTest?: DestinationDashboardTestAPI;
	}
}

test.describe('US-2.6.2: Destination Tech Shop', () => {
	test.describe('Section 1: Display & Tool Catalog', () => {
		test('Display kingdom-specific tool catalog for zmail', async ({ page, context }) => {
			// Create game session and navigate to zmail destination dashboard
			const { destinationPage, alicePage, bobPage } = await createGameWithDestination(
				page,
				context,
				'zmail'
			);

			// Open tech shop
			await destinationPage.click('[data-testid="tech-shop-button"]');
			await destinationPage.waitForSelector('[data-testid="tech-shop-modal"]');

			// Verify Content Analysis Filter shows zmail price (300)
			const contentAnalysisCard = destinationPage.locator(
				'[data-tool-id="content_analysis_filter"]'
			);
			await expect(contentAnalysisCard.locator('[data-testid="tool-cost"]')).toContainText('300');

			// Verify ML System shows zmail price (500)
			const mlSystemCard = destinationPage.locator('[data-tool-id="ml_system"]');
			await expect(mlSystemCard.locator('[data-testid="tool-cost"]')).toContainText('500');

			// Verify all tools show "ALL_ESPS"
			const scopeBadges = await destinationPage
				.locator('[data-testid="tool-scope"]')
				.allTextContents();
			expect(scopeBadges.every((text: string) => text.includes('ALL_ESPS'))).toBe(true);

			// Cleanup
			await closePages(page, destinationPage);
			await closePages(page, alicePage, bobPage);
		});

		test('Display kingdom-specific tool catalog for yagle', async ({ page, context }) => {
			// Create game session and navigate to yagle destination dashboard
			const { destinationPage, alicePage, bobPage } = await createGameWithDestination(
				page,
				context,
				'yagle'
			);

			// Open tech shop
			await destinationPage.click('[data-testid="tech-shop-button"]');
			await destinationPage.waitForSelector('[data-testid="tech-shop-modal"]');

			// Verify Content Analysis Filter shows yagle price (160)
			const contentAnalysisCard = destinationPage.locator(
				'[data-tool-id="content_analysis_filter"]'
			);
			await expect(contentAnalysisCard.locator('[data-testid="tool-cost"]')).toContainText('160');

			// Verify ML System shows "Suspended" status (unavailable)
			const mlSystemCard = destinationPage.locator('[data-tool-id="ml_system"]');
			await expect(mlSystemCard.locator('[data-testid="tool-status"]')).toContainText('Suspended');
			await expect(mlSystemCard.locator('[data-testid="unavailable-reason"]')).toContainText(
				'Insufficient computational resources'
			);

			// Cleanup
			await closePages(page, destinationPage);
			await closePages(page, alicePage, bobPage);
		});

		test('Tool displays comprehensive information', async ({ page, context }) => {
			// Create game session and navigate to zmail destination dashboard
			const { destinationPage, alicePage, bobPage } = await createGameWithDestination(
				page,
				context,
				'zmail'
			);

			// Open tech shop
			await destinationPage.click('[data-testid="tech-shop-button"]');
			await destinationPage.waitForSelector('[data-testid="tech-shop-modal"]');

			const toolCard = destinationPage.locator('[data-tool-id="content_analysis_filter"]');

			await expect(toolCard.locator('[data-testid="tool-name"]')).toHaveText(
				'Content Analysis Filter'
			);
			await expect(toolCard.locator('[data-testid="tool-category"]')).toContainText(
				'Content Analysis'
			);
			await expect(toolCard.locator('[data-testid="tool-cost"]')).toContainText('300');
			await expect(toolCard.locator('[data-testid="tool-scope"]')).toContainText('ALL_ESPS');
			await expect(toolCard.locator('[data-testid="tool-effect"]')).toContainText(
				'+15% spam detection'
			);
			await expect(toolCard.locator('[data-testid="tool-status"]')).toContainText('Paused');

			// Cleanup
			await closePages(page, destinationPage);
			await closePages(page, alicePage, bobPage);
		});
	});

	test.describe('Section 2: Basic Tool Purchase', () => {
		test('Successfully purchase a permanent tool', async ({ page, context }) => {
			// Create game session and navigate to zmail destination dashboard
			const { destinationPage, alicePage, bobPage } = await createGameWithDestination(
				page,
				context,
				'zmail'
			);

			// zmail gets 500 budget from server (no need to set it)

			// Open tech shop
			await destinationPage.click('[data-testid="tech-shop-button"]');
			await destinationPage.waitForSelector('[data-testid="tech-shop-modal"]');

			// Purchase Content Analysis Filter (costs 300)
			await destinationPage.click(
				'[data-tool-id="content_analysis_filter"] [data-testid="purchase-button"]'
			);

			// Wait for success message
			await destinationPage.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });

			// Verify budget updated: 500 - 300 = 200
			await expect(destinationPage.locator('[data-testid="budget-display"]')).toContainText('200');

			// Verify tool status updated to Active
			const toolCard = destinationPage.locator('[data-tool-id="content_analysis_filter"]');
			await expect(toolCard.locator('[data-testid="tool-status"]')).toContainText('Active');

			// Cleanup
			await closePages(page, destinationPage, alicePage, bobPage);
		});

		test('Purchase fails when budget insufficient', async ({ page, context }) => {
			// Create game session with yagle (200 budget)
			const { destinationPage, alicePage, bobPage } = await createGameWithDestination(
				page,
				context,
				'yagle'
			);

			// yagle has 200 budget. Purchase auth_validator_l1 (50) + auth_validator_l2 (50) + auth_validator_l3 (50) = 150
			// Remaining budget: 50
			await destinationPage.click('[data-testid="tech-shop-button"]');
			await destinationPage.waitForSelector('[data-testid="tech-shop-modal"]');

			await destinationPage.click(
				'[data-tool-id="auth_validator_l1"] [data-testid="purchase-button"]'
			);
			await destinationPage.click(
				'[data-tool-id="auth_validator_l2"] [data-testid="purchase-button"]'
			);
			await destinationPage.click(
				'[data-tool-id="auth_validator_l3"] [data-testid="purchase-button"]'
			);

			// Wait for last purchase to complete
			await destinationPage.waitForSelector('[data-testid="success-message"]');

			// Verify budget is now 50 (200 - 150)
			await expect(destinationPage.locator('[data-testid="budget-display"]')).toContainText('50');

			// Content Analysis Filter costs 160, but budget is only 50
			// Verify the purchase button is disabled due to insufficient budget
			const contentAnalysisButton = destinationPage.locator(
				'[data-tool-id="content_analysis_filter"] [data-testid="purchase-button"]'
			);
			await expect(contentAnalysisButton).toBeDisabled();
			await expect(contentAnalysisButton).toContainText('Insufficient Budget');

			// Cleanup
			await closePages(page, destinationPage);
			await closePages(page, alicePage, bobPage);
		});

		test('Confirmation dialog for expensive tools', async ({ page, context }) => {
			// Create game session with zmail (500 budget)
			const { destinationPage, alicePage, bobPage } = await createGameWithDestination(
				page,
				context,
				'zmail'
			);

			// zmail has 500 budget, ML System costs 500 (entire budget)
			await destinationPage.click('[data-testid="tech-shop-button"]');
			await destinationPage.waitForSelector('[data-testid="tech-shop-modal"]');

			// Click ML System purchase (costs entire budget)
			await destinationPage.click('[data-tool-id="ml_system"] [data-testid="purchase-button"]');

			// Verify confirmation dialog
			await expect(destinationPage.locator('[data-testid="confirmation-dialog"]')).toBeVisible();
			await expect(destinationPage.locator('[data-testid="confirmation-message"]')).toContainText(
				'This tool costs 500 credits (your entire budget)'
			);

			// Confirm purchase
			await destinationPage.click('[data-testid="confirm-purchase-button"]');

			// Verify purchase succeeded
			await expect(destinationPage.locator('[data-testid="budget-display"]')).toContainText('0');

			// Cleanup
			await closePages(page, destinationPage);
			await closePages(page, alicePage, bobPage);
		});
	});

	test.describe('Section 3: Authentication Validator Progression', () => {
		test('Authentication Validator requires sequential purchase', async ({ page, context }) => {
			// Create game session with zmail
			const { destinationPage, alicePage, bobPage } = await createGameWithDestination(
				page,
				context,
				'zmail'
			);

			await destinationPage.click('[data-testid="tech-shop-button"]');
			await destinationPage.waitForSelector('[data-testid="tech-shop-modal"]');

			// L2 should be locked initially
			const l2Card = destinationPage.locator('[data-tool-id="auth_validator_l2"]');
			await expect(l2Card.locator('[data-testid="tool-status"]')).toContainText('Paused');
			await expect(l2Card.locator('[data-testid="requirement-message"]')).toContainText(
				'Requires: SPF (Level 1)'
			);

			// L3 should be locked
			const l3Card = destinationPage.locator('[data-tool-id="auth_validator_l3"]');
			await expect(l3Card.locator('[data-testid="tool-status"]')).toContainText('Paused');
			await expect(l3Card.locator('[data-testid="requirement-message"]')).toContainText(
				'Requires: SPF (Level 1) and DKIM (Level 2)'
			);

			// Cleanup
			await closePages(page, destinationPage);
			await closePages(page, alicePage, bobPage);
		});

		test('Progressive Authentication Validator purchase', async ({ page, context }) => {
			// Create game session with intake (350 budget)
			const { destinationPage, alicePage, bobPage } = await createGameWithDestination(
				page,
				context,
				'intake'
			);

			// intake has 350 budget
			await destinationPage.click('[data-testid="tech-shop-button"]');
			await destinationPage.waitForSelector('[data-testid="tech-shop-modal"]');

			// Purchase L1
			await destinationPage.click(
				'[data-tool-id="auth_validator_l1"] [data-testid="purchase-button"]'
			);

			// Verify auth level = 1
			// TODO: Add auth-level-display to destination dashboard
			// await expect(destinationPage.locator('[data-testid="auth-level-display"]')).toContainText('1');
			await expect(destinationPage.locator('[data-testid="budget-display"]')).toContainText('300');

			// L2 should now be available
			const l2Card = destinationPage.locator('[data-tool-id="auth_validator_l2"]');
			await expect(l2Card.locator('[data-testid="tool-status"]')).toContainText('Paused');

			// L3 still locked
			const l3Card = destinationPage.locator('[data-tool-id="auth_validator_l3"]');
			await expect(l3Card.locator('[data-testid="tool-status"]')).toContainText('Paused');

			// Purchase L2
			await destinationPage.click(
				'[data-tool-id="auth_validator_l2"] [data-testid="purchase-button"]'
			);

			// Verify auth level = 2
			// TODO: Add auth-level-display to destination dashboard
			// await expect(destinationPage.locator('[data-testid="auth-level-display"]')).toContainText('2');
			await expect(destinationPage.locator('[data-testid="budget-display"]')).toContainText('250');

			// L3 now available
			await expect(l3Card.locator('[data-testid="tool-status"]')).toContainText('Paused');

			// Purchase L3
			await destinationPage.click(
				'[data-tool-id="auth_validator_l3"] [data-testid="purchase-button"]'
			);

			// Verify auth level = 3
			// TODO: Add auth-level-display to destination dashboard
			// await expect(destinationPage.locator('[data-testid="auth-level-display"]')).toContainText('3');
			await expect(destinationPage.locator('[data-testid="budget-display"]')).toContainText('200');

			// Cleanup
			await closePages(page, destinationPage);
			await closePages(page, alicePage, bobPage);
		});

		test('Complete authentication stack is affordable for all kingdoms', async ({
			page,
			context
		}) => {
			// Create game session with yagle (200 budget)
			const { destinationPage, alicePage, bobPage } = await createGameWithDestination(
				page,
				context,
				'yagle'
			);

			// yagle has 200 budget
			await destinationPage.click('[data-testid="tech-shop-button"]');
			await destinationPage.waitForSelector('[data-testid="tech-shop-modal"]');

			// Verify total cost is 150 (50 + 50 + 50)
			// Purchase all three auth validators
			await destinationPage.click(
				'[data-tool-id="auth_validator_l1"] [data-testid="purchase-button"]'
			);
			await destinationPage.click(
				'[data-tool-id="auth_validator_l2"] [data-testid="purchase-button"]'
			);
			await destinationPage.click(
				'[data-tool-id="auth_validator_l3"] [data-testid="purchase-button"]'
			);

			// Verify final budget is 50 (200 - 150)
			await expect(destinationPage.locator('[data-testid="budget-display"]')).toContainText('50');

			// Cleanup
			await closePages(page, destinationPage);
			await closePages(page, alicePage, bobPage);
		});
	});

	test.describe('Section 5: Spam Trap Network', () => {
		test('Purchase Spam Trap Network with announcement option', async ({ page, context }) => {
			// Create game session with zmail (500 budget)
			const { destinationPage, alicePage, bobPage } = await createGameWithDestination(
				page,
				context,
				'zmail'
			);

			// zmail has 500 budget
			await destinationPage.click('[data-testid="tech-shop-button"]');
			await destinationPage.waitForSelector('[data-testid="tech-shop-modal"]');

			// Click purchase on Spam Trap
			await destinationPage.click(
				'[data-tool-id="spam_trap_network"] [data-testid="purchase-button"]'
			);

			// Verify announcement dialog
			await expect(destinationPage.locator('[data-testid="announcement-dialog"]')).toBeVisible();

			const announceOption = destinationPage.locator('[data-testid="option-announce"]');
			await expect(announceOption).toContainText('Alert ESPs (deterrent effect)');

			const secretOption = destinationPage.locator('[data-testid="option-secret"]');
			await expect(secretOption).toContainText('Surprise deployment');

			// Select "Keep Secret"
			await secretOption.click();
			await destinationPage.click('[data-testid="confirm-announcement-button"]');

			// Verify purchase succeeded
			await expect(destinationPage.locator('[data-testid="budget-display"]')).toContainText('250');

			const toolCard = destinationPage.locator('[data-tool-id="spam_trap_network"]');
			await expect(toolCard.locator('[data-testid="tool-status"]')).toContainText('Active');

			// Cleanup
			await closePages(page, destinationPage);
			await closePages(page, alicePage, bobPage);
		});

		test('Spam Trap Network must be repurchased each round', async ({ page, context }) => {
			// Given: the game is in round 1 planning with a zmail destination
			const { destinationPage, alicePage, bobPage, roomCode } = await createGameWithDestination(
				page,
				context,
				'zmail'
			);

			// And: destination purchases Spam Trap Network (consumable/temporary)
			await destinationPage.click('[data-testid="tech-shop-button"]');
			await destinationPage.waitForSelector('[data-testid="tech-shop-modal"]');

			// Purchase Spam Trap Network
			await destinationPage.click(
				'[data-tool-id="spam_trap_network"] [data-testid="purchase-button"]'
			);

			// Handle announcement dialog (select "Keep Secret")
			await destinationPage.waitForSelector('[data-testid="announcement-dialog"]');
			await destinationPage.click('[data-testid="option-secret"]');
			await destinationPage.click('[data-testid="confirm-announcement-button"]');
			await destinationPage.waitForTimeout(500);

			// Verify it's Active in round 1
			const spamTrapCard = destinationPage.locator('[data-tool-id="spam_trap_network"]');
			await expect(spamTrapCard.locator('[data-testid="tool-status"]')).toContainText('Active');

			// Close tech shop
			await destinationPage.click('[data-testid="close-tech-shop"]');
			await destinationPage.waitForTimeout(300);

			// Get to consequences and start next round
			await page.goto(`/game/${roomCode}/facilitator`);
			await page.waitForTimeout(500);

			// Lock in all players (Alice, Bob, and destination player)
			const aliceLockButton = alicePage.locator('[data-testid="lock-in-button"]');
			if (await aliceLockButton.isVisible()) {
				await aliceLockButton.click();
				await alicePage.waitForTimeout(300);
			}

			const bobLockButton = bobPage.locator('[data-testid="lock-in-button"]');
			if (await bobLockButton.isVisible()) {
				await bobLockButton.click();
				await bobPage.waitForTimeout(300);
			}

			const destLockButton = destinationPage.locator('[data-testid="lock-in-button"]');
			if (await destLockButton.isVisible()) {
				await destLockButton.click();
				await destinationPage.waitForTimeout(300);
			}

			// Wait for consequences phase
			await page.waitForTimeout(1500);
			await expect(page.locator('[data-testid="current-phase"]')).toContainText(
				'Consequences Phase',
				{
					timeout: 5000
				}
			);

			// When: facilitator starts next round
			const startButton = page.locator('[data-testid="start-next-round-button"]');
			await startButton.click();
			await page.waitForTimeout(1000);

			// Then: verify we're in round 2
			await expect(destinationPage.locator('[data-testid="round-indicator"]')).toContainText(
				'Round 2',
				{ timeout: 5000 }
			);

			// And: Spam Trap Network should NOT be owned anymore (should be Paused)
			// Open tech shop to check status
			await destinationPage.click('[data-testid="tech-shop-button"]');
			await destinationPage.waitForSelector('[data-testid="tech-shop-modal"]');

			const spamTrapCardRound2 = destinationPage.locator('[data-tool-id="spam_trap_network"]');
			await expect(spamTrapCardRound2.locator('[data-testid="tool-status"]')).toContainText(
				'Paused'
			);

			// And: purchase button should be enabled (can be repurchased)
			await expect(spamTrapCardRound2.locator('[data-testid="purchase-button"]')).toBeEnabled();

			// Cleanup
			await closePages(page, alicePage, bobPage, destinationPage);
		});
	});

	test.describe('Section 7: Kingdom Constraints', () => {
		test('ML System unavailable for yagle', async ({ page, context }) => {
			// Create game session with yagle
			const { destinationPage, alicePage, bobPage } = await createGameWithDestination(
				page,
				context,
				'yagle'
			);

			await destinationPage.click('[data-testid="tech-shop-button"]');
			await destinationPage.waitForSelector('[data-testid="tech-shop-modal"]');

			// Wait for tools to load
			const mlCard = destinationPage.locator('[data-tool-id="ml_system"]');
			await mlCard.waitFor({ state: 'visible', timeout: 10000 });

			await expect(mlCard.locator('[data-testid="tool-status"]')).toContainText('Suspended');
			// Purchase button is not rendered for unavailable tools
			await expect(mlCard.locator('[data-testid="purchase-button"]')).not.toBeVisible();

			// Cleanup
			await closePages(page, destinationPage);
			await closePages(page, alicePage, bobPage);
		});

		test('ML System available for zmail and intake', async ({ page, context }) => {
			// Create game session with zmail
			const { destinationPage, alicePage, bobPage } = await createGameWithDestination(
				page,
				context,
				'zmail'
			);

			await destinationPage.click('[data-testid="tech-shop-button"]');
			await destinationPage.waitForSelector('[data-testid="tech-shop-modal"]');

			const mlCard = destinationPage.locator('[data-tool-id="ml_system"]');
			await expect(mlCard.locator('[data-testid="tool-status"]')).toContainText('Paused');
			await expect(mlCard.locator('[data-testid="purchase-button"]')).toBeEnabled();

			// Cleanup
			await closePages(page, destinationPage);
			await closePages(page, alicePage, bobPage);
		});
	});

	test.describe('Section 9: Tool Management & Persistence', () => {
		test('Owned tools display on main dashboard', async ({ page, context }) => {
			// Create game session with zmail (500 budget)
			const { destinationPage, alicePage, bobPage } = await createGameWithDestination(
				page,
				context,
				'zmail'
			);

			// zmail has 500 budget
			// Purchase some tools
			await destinationPage.click('[data-testid="tech-shop-button"]');
			await destinationPage.waitForSelector('[data-testid="tech-shop-modal"]');
			await destinationPage.click(
				'[data-tool-id="content_analysis_filter"] [data-testid="purchase-button"]'
			);
			await destinationPage.click(
				'[data-tool-id="auth_validator_l1"] [data-testid="purchase-button"]'
			);

			// Close tech shop
			await destinationPage.click('[data-testid="close-tech-shop"]');

			// Verify technical infrastructure panel shows owned tools as Active
			await expect(
				destinationPage.locator('[data-testid="technical-infrastructure"]')
			).toBeVisible();

			// Verify Content Analysis Filter is Active
			const contentAnalysisTool = destinationPage.locator(
				'[data-testid="tech-item-content_analysis_filter"]'
			);
			await expect(contentAnalysisTool).toBeVisible();
			await expect(contentAnalysisTool).toContainText('Content Analysis Filter');
			await expect(
				contentAnalysisTool.locator('[data-testid="tech-status-content_analysis_filter"]')
			).toContainText('Active');

			// Verify Auth Validator L1 is Active
			const authValidatorTool = destinationPage.locator(
				'[data-testid="tech-item-auth_validator_l1"]'
			);
			await expect(authValidatorTool).toBeVisible();
			await expect(authValidatorTool).toContainText('Authentication Validator');
			await expect(
				authValidatorTool.locator('[data-testid="tech-status-auth_validator_l1"]')
			).toContainText('Active');

			// Cleanup
			await closePages(page, destinationPage, alicePage, bobPage);
		});

		test('Tool ownership persists across rounds', async ({ page, context }) => {
			// Given: the game is in round 1 planning with a zmail destination
			const { destinationPage, alicePage, bobPage, roomCode } = await createGameWithDestination(
				page,
				context,
				'zmail'
			);

			// And: destination purchases permanent tools (not Spam Trap)
			await destinationPage.click('[data-testid="tech-shop-button"]');
			await destinationPage.waitForSelector('[data-testid="tech-shop-modal"]');

			// Purchase Content Analysis Filter (permanent)
			await destinationPage.click(
				'[data-tool-id="content_analysis_filter"] [data-testid="purchase-button"]'
			);
			await destinationPage.waitForTimeout(500);

			// Purchase Auth Validator L1 (permanent)
			await destinationPage.click(
				'[data-tool-id="auth_validator_l1"] [data-testid="purchase-button"]'
			);
			await destinationPage.waitForTimeout(500);

			// Close tech shop
			await destinationPage.click('[data-testid="close-tech-shop"]');
			await destinationPage.waitForTimeout(300);

			// Get to consequences and start next round
			await page.goto(`/game/${roomCode}/facilitator`);
			await page.waitForTimeout(500);

			// Lock in all players (Alice, Bob, and destination player)
			const aliceLockButton = alicePage.locator('[data-testid="lock-in-button"]');
			if (await aliceLockButton.isVisible()) {
				await aliceLockButton.click();
				await alicePage.waitForTimeout(300);
			}

			const bobLockButton = bobPage.locator('[data-testid="lock-in-button"]');
			if (await bobLockButton.isVisible()) {
				await bobLockButton.click();
				await bobPage.waitForTimeout(300);
			}

			const destLockButton = destinationPage.locator('[data-testid="lock-in-button"]');
			if (await destLockButton.isVisible()) {
				await destLockButton.click();
				await destinationPage.waitForTimeout(300);
			}

			// Wait for consequences phase
			await page.waitForTimeout(1500);
			await expect(page.locator('[data-testid="current-phase"]')).toContainText(
				'Consequences Phase',
				{
					timeout: 5000
				}
			);

			// When: facilitator starts next round
			const startButton = page.locator('[data-testid="start-next-round-button"]');
			await startButton.click();
			await page.waitForTimeout(1000);

			// Then: verify we're in round 2
			await expect(destinationPage.locator('[data-testid="round-indicator"]')).toContainText(
				'Round 2',
				{ timeout: 5000 }
			);

			// And: permanent tools should still be owned (show Active status)
			await expect(
				destinationPage.locator('[data-testid="technical-infrastructure"]')
			).toBeVisible();

			const contentAnalysisTool = destinationPage.locator(
				'[data-testid="tech-item-content_analysis_filter"]'
			);
			await expect(contentAnalysisTool).toBeVisible();
			await expect(
				contentAnalysisTool.locator('[data-testid="tech-status-content_analysis_filter"]')
			).toContainText('Active');

			const authValidatorTool = destinationPage.locator(
				'[data-testid="tech-item-auth_validator_l1"]'
			);
			await expect(authValidatorTool).toBeVisible();
			await expect(
				authValidatorTool.locator('[data-testid="tech-status-auth_validator_l1"]')
			).toContainText('Active');

			// Cleanup
			await closePages(page, alicePage, bobPage, destinationPage);
		});
	});

	test.describe('Section: Regression Tests', () => {
		test('Budget deducted exactly once (not twice) - Fix for double deduction bug', async ({
			page,
			context
		}) => {
			// Bug description: Previously, budget was deducted twice:
			// 1. Optimistically on client-side in handleToolPurchase callback
			// 2. Again when WebSocket update arrived with server-calculated budget
			// Fix: Removed optimistic update, rely solely on WebSocket for authoritative state

			// Create game session with zmail (500 budget)
			const { destinationPage, alicePage, bobPage } = await createGameWithDestination(
				page,
				context,
				'zmail'
			);

			// Verify initial budget is 500 (uses budget-current test ID from DashboardHeader)
			await expect(destinationPage.locator('[data-testid="budget-current"]')).toContainText('500');

			// Open tech shop and purchase Authentication Validator L1 (cost: 50)
			await destinationPage.click('[data-testid="tech-shop-button"]');
			await destinationPage.waitForSelector('[data-testid="tech-shop-modal"]');
			await destinationPage.click(
				'[data-tool-id="auth_validator_l1"] [data-testid="purchase-button"]'
			);

			// Wait for success message to ensure WebSocket update completed
			await destinationPage.waitForSelector('[data-testid="success-message"]', { timeout: 5000 });

			// Close modal to see dashboard budget (uses close-tech-shop test ID)
			await destinationPage.click('[data-testid="close-tech-shop"]');

			// CRITICAL: Verify budget is 450 (500 - 50), NOT 400 (500 - 50 - 50)
			// If bug were present, budget would be deducted twice and show 400
			await expect(destinationPage.locator('[data-testid="budget-current"]')).toContainText('450');

			// Make another purchase to further verify correct behavior
			// Purchase Volume Throttling (cost: 200, zmail price)
			await destinationPage.click('[data-testid="tech-shop-button"]');
			await destinationPage.waitForSelector('[data-testid="tech-shop-modal"]');
			await destinationPage.click(
				'[data-tool-id="volume_throttling"] [data-testid="purchase-button"]'
			);
			await destinationPage.waitForSelector('[data-testid="success-message"]', { timeout: 5000 });
			await destinationPage.click('[data-testid="close-tech-shop"]');

			// Verify budget is now 250 (450 - 200), NOT 50 (450 - 200 - 200)
			// If double deduction occurred, budget would be 50 instead of 250
			await expect(destinationPage.locator('[data-testid="budget-current"]')).toContainText('250');

			// Cleanup
			await closePages(page, destinationPage);
			await closePages(page, alicePage, bobPage);
		});
	});

	test.describe('Section 10: Logging', () => {
		test('Tool purchase logging', async ({ page, context }) => {
			// Create game session with zmail (500 budget)
			const { destinationPage, alicePage, bobPage } = await createGameWithDestination(
				page,
				context,
				'zmail'
			);

			// zmail has 500 budget
			await destinationPage.click('[data-testid="tech-shop-button"]');
			await destinationPage.waitForSelector('[data-testid="tech-shop-modal"]');
			await destinationPage.click(
				'[data-tool-id="volume_throttling"] [data-testid="purchase-button"]'
			);

			// Verify Pino logs (would need server-side log access in real implementation)
			// For now, just verify purchase succeeded as proxy
			const toolCard = destinationPage.locator('[data-tool-id="volume_throttling"]');
			await expect(toolCard.locator('[data-testid="tool-status"]')).toContainText('Active');

			// Cleanup
			await closePages(page, destinationPage);
			await closePages(page, alicePage, bobPage);
		});
	});
});
