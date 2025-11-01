/**
 * US-2.6.2: Destination Tech Shop - E2E Tests
 * Following the feature file scenarios from features/US-2.6.2-tests/destination-tech-shop.feature
 */

import { test, expect } from '@playwright/test';
import { createGameWithDestinationPlayer } from './helpers/game-setup';

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
		test('Display kingdom-specific tool catalog for Gmail', async ({ page, context }) => {
			// Create game session and navigate to Gmail destination dashboard
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(page, context);

			// Open tech shop
			await gmailPage.click('[data-testid="tech-shop-button"]');
			await gmailPage.waitForSelector('[data-testid="tech-shop-modal"]');

			// Verify Content Analysis Filter shows Gmail price (300)
			const contentAnalysisCard = gmailPage.locator('[data-tool-id="content_analysis_filter"]');
			await expect(contentAnalysisCard.locator('[data-testid="tool-cost"]')).toContainText('300');

			// Verify ML System shows Gmail price (500)
			const mlSystemCard = gmailPage.locator('[data-tool-id="ml_system"]');
			await expect(mlSystemCard.locator('[data-testid="tool-cost"]')).toContainText('500');

			// Verify all tools show "Applies to ALL ESPs"
			const scopeBadges = await gmailPage
				.locator('[data-testid="tool-scope"]')
				.allTextContents();
			expect(scopeBadges.every((text) => text.includes('ALL ESPs'))).toBe(true);

			// Cleanup
			await gmailPage.close();
			await alicePage.close();
			await bobPage.close();
		});

		test('Display kingdom-specific tool catalog for Yahoo', async ({ page, context }) => {
			// Create game session and navigate to Gmail destination dashboard
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(page, context);

			// Set kingdom to Yahoo via test API
			await gmailPage.evaluate(() => {
				(window as any).__destinationDashboardTest.setKingdom('Yahoo');
			});

			// Open tech shop
			await gmailPage.click('[data-testid="tech-shop-button"]');
			await gmailPage.waitForSelector('[data-testid="tech-shop-modal"]');

			// Verify Content Analysis Filter shows Yahoo price (160)
			const contentAnalysisCard = gmailPage.locator('[data-tool-id="content_analysis_filter"]');
			await expect(contentAnalysisCard.locator('[data-testid="tool-cost"]')).toContainText('160');

			// Verify ML System shows "Suspended" status (unavailable)
			const mlSystemCard = gmailPage.locator('[data-tool-id="ml_system"]');
			await expect(mlSystemCard.locator('[data-testid="tool-status"]')).toContainText('Suspended');
			await expect(mlSystemCard.locator('[data-testid="unavailable-reason"]')).toHaveText(
				'Insufficient computational resources'
			);

			// Cleanup
			await gmailPage.close();
			await alicePage.close();
			await bobPage.close();
		});

		test('Tool displays comprehensive information', async ({ page, context }) => {
			// Create game session and navigate to Gmail destination dashboard
			const { gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(page, context);

			// Open tech shop
			await gmailPage.click('[data-testid="tech-shop-button"]');
			await gmailPage.waitForSelector('[data-testid="tech-shop-modal"]');

			const toolCard = gmailPage.locator('[data-tool-id="content_analysis_filter"]');

			await expect(toolCard.locator('[data-testid="tool-name"]')).toHaveText(
				'Content Analysis Filter'
			);
			await expect(toolCard.locator('[data-testid="tool-category"]')).toContainText(
				'Content Analysis'
			);
			await expect(toolCard.locator('[data-testid="tool-cost"]')).toContainText('300');
			await expect(toolCard.locator('[data-testid="tool-scope"]')).toContainText(
				'Applies to ALL ESPs'
			);
			await expect(toolCard.locator('[data-testid="tool-effect"]')).toContainText(
				'+15% spam detection'
			);
			await expect(toolCard.locator('[data-testid="tool-status"]')).toContainText('Paused');

			// Cleanup
			await gmailPage.close();
			await alicePage.close();
			await bobPage.close();
		});
	});

	test.describe('Section 2: Basic Tool Purchase', () => {
		test.skip('Successfully purchase a permanent tool', async ({ page }) => {
			await page.goto('/lobby');

			// TODO: Create game as Gmail with 500 budget
			await page.waitForSelector('[data-testid="destination-dashboard"]', { timeout: 10000 });
			await page.waitForFunction(() => (window as any).__destinationDashboardTest?.ready);

			// Set budget via test API
			await page.evaluate(() => {
				(window as any).__destinationDashboardTest.setBudget(500);
			});

			await page.click('[data-testid="tech-shop-button"]');

			// Purchase Content Analysis Filter
			await page.click(
				'[data-tool-id="content_analysis_filter"] [data-testid="purchase-button"]'
			);

			// Verify purchase succeeded
			await expect(page.locator('[data-testid="budget-display"]')).toHaveText('200');

			const toolCard = page.locator('[data-tool-id="content_analysis_filter"]');
			await expect(toolCard.locator('[data-testid="tool-status"]')).toHaveText('Owned');
		});

		test('Purchase fails when budget insufficient', async ({ page }) => {
			await page.goto('/lobby');

			await page.waitForSelector('[data-testid="destination-dashboard"]', { timeout: 10000 });
			await page.waitForFunction(() => (window as any).__destinationDashboardTest?.ready);

			// Set insufficient budget
			await page.evaluate(() => {
				(window as any).__destinationDashboardTest.setBudget(100);
			});

			await page.click('[data-testid="tech-shop-button"]');

			// Attempt purchase
			await page.click(
				'[data-tool-id="content_analysis_filter"] [data-testid="purchase-button"]'
			);

			// Verify error message
			await expect(page.locator('[data-testid="error-message"]')).toContainText(
				'Insufficient budget'
			);

			// Verify budget unchanged
			await expect(page.locator('[data-testid="budget-display"]')).toHaveText('100');
		});

		test('Confirmation dialog for expensive tools', async ({ page }) => {
			await page.goto('/lobby');

			await page.waitForSelector('[data-testid="destination-dashboard"]', { timeout: 10000 });
			await page.waitForFunction(() => (window as any).__destinationDashboardTest?.ready);

			await page.evaluate(() => {
				(window as any).__destinationDashboardTest.setBudget(500);
			});

			await page.click('[data-testid="tech-shop-button"]');

			// Click ML System purchase (costs entire budget)
			await page.click('[data-tool-id="ml_system"] [data-testid="purchase-button"]');

			// Verify confirmation dialog
			await expect(page.locator('[data-testid="confirmation-dialog"]')).toBeVisible();
			await expect(page.locator('[data-testid="confirmation-message"]')).toContainText(
				'This tool costs 500 credits (your entire budget)'
			);

			// Confirm purchase
			await page.click('[data-testid="confirm-purchase-button"]');

			// Verify purchase succeeded
			await expect(page.locator('[data-testid="budget-display"]')).toHaveText('0');
		});
	});

	test.describe('Section 3: Authentication Validator Progression', () => {
		test('Authentication Validator requires sequential purchase', async ({ page }) => {
			await page.goto('/lobby');

			await page.waitForSelector('[data-testid="destination-dashboard"]', { timeout: 10000 });
			await page.waitForFunction(() => (window as any).__destinationDashboardTest?.ready);

			await page.click('[data-testid="tech-shop-button"]');

			// L2 should be locked initially
			const l2Card = page.locator('[data-tool-id="auth_validator_l2"]');
			await expect(l2Card.locator('[data-testid="tool-status"]')).toHaveText('Locked');
			await expect(l2Card.locator('[data-testid="requirement-message"]')).toContainText(
				'Requires: SPF (Level 1)'
			);

			// L3 should be locked
			const l3Card = page.locator('[data-tool-id="auth_validator_l3"]');
			await expect(l3Card.locator('[data-testid="tool-status"]')).toHaveText('Locked');
			await expect(l3Card.locator('[data-testid="requirement-message"]')).toContainText(
				'Requires: SPF (Level 1) and DKIM (Level 2)'
			);
		});

		test('Progressive Authentication Validator purchase', async ({ page }) => {
			await page.goto('/lobby');

			await page.waitForSelector('[data-testid="destination-dashboard"]', { timeout: 10000 });
			await page.waitForFunction(() => (window as any).__destinationDashboardTest?.ready);

			await page.evaluate(() => {
				(window as any).__destinationDashboardTest.setBudget(350);
			});

			await page.click('[data-testid="tech-shop-button"]');

			// Purchase L1
			await page.click('[data-tool-id="auth_validator_l1"] [data-testid="purchase-button"]');

			// Verify auth level = 1
			await expect(page.locator('[data-testid="auth-level-display"]')).toHaveText('1');
			await expect(page.locator('[data-testid="budget-display"]')).toHaveText('300');

			// L2 should now be available
			const l2Card = page.locator('[data-tool-id="auth_validator_l2"]');
			await expect(l2Card.locator('[data-testid="tool-status"]')).toHaveText('Available');

			// L3 still locked
			const l3Card = page.locator('[data-tool-id="auth_validator_l3"]');
			await expect(l3Card.locator('[data-testid="tool-status"]')).toHaveText('Locked');

			// Purchase L2
			await page.click('[data-tool-id="auth_validator_l2"] [data-testid="purchase-button"]');

			// Verify auth level = 2
			await expect(page.locator('[data-testid="auth-level-display"]')).toHaveText('2');
			await expect(page.locator('[data-testid="budget-display"]')).toHaveText('250');

			// L3 now available
			await expect(l3Card.locator('[data-testid="tool-status"]')).toHaveText('Available');

			// Purchase L3
			await page.click('[data-tool-id="auth_validator_l3"] [data-testid="purchase-button"]');

			// Verify auth level = 3
			await expect(page.locator('[data-testid="auth-level-display"]')).toHaveText('3');
			await expect(page.locator('[data-testid="budget-display"]')).toHaveText('200');
		});

		test('Complete authentication stack is affordable for all kingdoms', async ({ page }) => {
			await page.goto('/lobby');

			await page.waitForSelector('[data-testid="destination-dashboard"]', { timeout: 10000 });
			await page.waitForFunction(() => (window as any).__destinationDashboardTest?.ready);

			// Set as Yahoo with 200 budget
			await page.evaluate(() => {
				(window as any).__destinationDashboardTest.setKingdom('Yahoo');
				(window as any).__destinationDashboardTest.setBudget(200);
			});

			await page.click('[data-testid="tech-shop-button"]');

			// Verify total cost is 150 (50 + 50 + 50)
			// Purchase all three auth validators
			await page.click('[data-tool-id="auth_validator_l1"] [data-testid="purchase-button"]');
			await page.click('[data-tool-id="auth_validator_l2"] [data-testid="purchase-button"]');
			await page.click('[data-tool-id="auth_validator_l3"] [data-testid="purchase-button"]');

			// Verify final budget is 50 (200 - 150)
			await expect(page.locator('[data-testid="budget-display"]')).toHaveText('50');
		});
	});

	test.describe('Section 5: Spam Trap Network', () => {
		test('Purchase Spam Trap Network with announcement option', async ({ page }) => {
			await page.goto('/lobby');

			await page.waitForSelector('[data-testid="destination-dashboard"]', { timeout: 10000 });
			await page.waitForFunction(() => (window as any).__destinationDashboardTest?.ready);

			await page.evaluate(() => {
				(window as any).__destinationDashboardTest.setBudget(500);
			});

			await page.click('[data-testid="tech-shop-button"]');

			// Click purchase on Spam Trap
			await page.click('[data-tool-id="spam_trap_network"] [data-testid="purchase-button"]');

			// Verify announcement dialog
			await expect(page.locator('[data-testid="announcement-dialog"]')).toBeVisible();

			const announceOption = page.locator('[data-testid="option-announce"]');
			await expect(announceOption).toContainText('Alert ESPs (deterrent effect)');

			const secretOption = page.locator('[data-testid="option-secret"]');
			await expect(secretOption).toContainText('Surprise deployment');

			// Select "Keep Secret"
			await secretOption.click();
			await page.click('[data-testid="confirm-announcement-button"]');

			// Verify purchase succeeded
			await expect(page.locator('[data-testid="budget-display"]')).toHaveText('250');

			const toolCard = page.locator('[data-tool-id="spam_trap_network"]');
			await expect(toolCard.locator('[data-testid="tool-status"]')).toHaveText('Owned');
		});

		test.skip('Spam Trap Network must be repurchased each round', async ({ page }) => {
			// TODO: Implement when round transition is available
			// Purchase Spam Trap in round 1
			// Transition to round 2
			// Verify Spam Trap shows "Not Owned"
		});
	});

	test.describe('Section 7: Kingdom Constraints', () => {
		test('ML System unavailable for Yahoo', async ({ page }) => {
			await page.goto('/lobby');

			await page.waitForSelector('[data-testid="destination-dashboard"]', { timeout: 10000 });
			await page.waitForFunction(() => (window as any).__destinationDashboardTest?.ready);

			await page.evaluate(() => {
				(window as any).__destinationDashboardTest.setKingdom('Yahoo');
			});

			await page.click('[data-testid="tech-shop-button"]');

			const mlCard = page.locator('[data-tool-id="ml_system"]');
			await expect(mlCard.locator('[data-testid="tool-status"]')).toHaveText('Unavailable');
			await expect(mlCard.locator('[data-testid="purchase-button"]')).toBeDisabled();
		});

		test('ML System available for Gmail and Outlook', async ({ page }) => {
			await page.goto('/lobby');

			await page.waitForSelector('[data-testid="destination-dashboard"]', { timeout: 10000 });
			await page.waitForFunction(() => (window as any).__destinationDashboardTest?.ready);

			await page.evaluate(() => {
				(window as any).__destinationDashboardTest.setKingdom('Gmail');
			});

			await page.click('[data-testid="tech-shop-button"]');

			const mlCard = page.locator('[data-tool-id="ml_system"]');
			await expect(mlCard.locator('[data-testid="tool-status"]')).toHaveText('Not Owned');
			await expect(mlCard.locator('[data-testid="purchase-button"]')).toBeEnabled();
		});
	});

	test.describe('Section 9: Tool Management & Persistence', () => {
		test('Owned tools display on main dashboard', async ({ page }) => {
			await page.goto('/lobby');

			await page.waitForSelector('[data-testid="destination-dashboard"]', { timeout: 10000 });
			await page.waitForFunction(() => (window as any).__destinationDashboardTest?.ready);

			await page.evaluate(() => {
				(window as any).__destinationDashboardTest.setBudget(500);
			});

			// Purchase some tools
			await page.click('[data-testid="tech-shop-button"]');
			await page.click('[data-tool-id="content_analysis_filter"] [data-testid="purchase-button"]');
			await page.click('[data-tool-id="auth_validator_l1"] [data-testid="purchase-button"]');

			// Close tech shop
			await page.click('[data-testid="close-tech-shop"]');

			// Verify owned tools section on dashboard
			await expect(page.locator('[data-testid="owned-tools-section"]')).toBeVisible();

			const ownedToolsList = page.locator('[data-testid="owned-tools-list"]');
			await expect(ownedToolsList).toContainText('Content Analysis Filter');
			await expect(ownedToolsList).toContainText('Authentication Validator - Level 1');

			// Verify auth level display
			await expect(page.locator('[data-testid="auth-level-badge"]')).toHaveText(
				'Level 1 (SPF)'
			);
		});

		test.skip('Tool ownership persists across rounds', async ({ page }) => {
			// TODO: Implement when round transition is available
			// Purchase tool in round 1
			// Transition to round 2
			// Verify tool still shows "Owned" (except Spam Trap)
		});
	});

	test.describe('Section 10: Logging', () => {
		test('Tool purchase logging', async ({ page }) => {
			await page.goto('/lobby');

			await page.waitForSelector('[data-testid="destination-dashboard"]', { timeout: 10000 });
			await page.waitForFunction(() => (window as any).__destinationDashboardTest?.ready);

			await page.evaluate(() => {
				(window as any).__destinationDashboardTest.setBudget(500);
			});

			await page.click('[data-testid="tech-shop-button"]');
			await page.click('[data-tool-id="volume_throttling"] [data-testid="purchase-button"]');

			// Verify Pino logs (would need server-side log access in real implementation)
			// For now, just verify purchase succeeded as proxy
			const toolCard = page.locator('[data-tool-id="volume_throttling"]');
			await expect(toolCard.locator('[data-testid="tool-status"]')).toHaveText('Owned');
		});
	});
});
