/**
 * E2E Test Helper Functions
 *
 * Reusable helper functions to reduce duplication in E2E tests.
 * These helpers encapsulate common patterns used across multiple test files.
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Wait for a dashboard to be fully loaded and ready
 * Uses the test API's ready flag to ensure dashboard state is initialized
 *
 * @param page - Playwright page object
 * @param dashboardType - Type of dashboard ('esp' or 'destination')
 * @param timeout - Maximum time to wait in ms (default: 10000)
 */
export async function waitForDashboardReady(
	page: Page,
	dashboardType: 'esp' | 'destination' = 'esp',
	timeout = 10000
): Promise<void> {
	const testApiName = dashboardType === 'esp' ? '__espDashboardTest' : '__destinationDashboardTest';

	await page.waitForFunction((apiName) => (window as any)[apiName]?.ready === true, testApiName, {
		timeout
	});
}

/**
 * Open a modal and wait for it to be visible
 *
 * @param page - Playwright page object
 * @param buttonTestId - Test ID of the button to click
 * @param modalTestId - Test ID of the modal to wait for
 * @param timeout - Maximum time to wait in ms (default: 5000)
 */
export async function openModal(
	page: Page,
	buttonTestId: string,
	modalTestId: string,
	timeout = 5000
): Promise<void> {
	await page.getByTestId(buttonTestId).click();
	await page.getByTestId(modalTestId).waitFor({ state: 'visible', timeout });
}

/**
 * Perform a purchase/action and wait for success or error
 * Handles the common pattern of clicking a button and waiting for feedback
 *
 * @param page - Playwright page object
 * @param buttonLocator - Locator for the button to click
 * @param options - Optional configuration
 * @returns 'success' or 'error'
 * @throws Error if action fails
 */
export async function performPurchaseAction(
	page: Page,
	buttonLocator: Locator,
	options?: { timeout?: number }
): Promise<'success' | 'error'> {
	await buttonLocator.click();

	const timeout = options?.timeout || 15000;

	const result = await Promise.race([
		page
			.getByTestId('success-message')
			.waitFor({ state: 'visible', timeout })
			.then(() => 'success' as const),
		page
			.getByTestId('error-banner')
			.waitFor({ state: 'visible', timeout })
			.then(() => 'error' as const)
	]).catch(() => 'timeout' as const);

	if (result === 'error') {
		const errorText = await page.getByTestId('error-banner').textContent();
		throw new Error(`Action failed: ${errorText}`);
	}

	if (result === 'timeout') {
		throw new Error('Action timed out: No success or error message appeared');
	}

	return result;
}

/**
 * Extract numeric value from budget/credits display
 * Removes non-numeric characters and parses as integer
 *
 * @param page - Playwright page object
 * @param testId - Test ID of the element containing the number (default: 'budget-current')
 * @returns Parsed number
 */
export async function extractBudget(page: Page, testId = 'budget-current'): Promise<number> {
	await page.getByTestId(testId).waitFor({ state: 'visible', timeout: 5000 });
	const text = await page.getByTestId(testId).textContent();
	return parseInt(text?.replace(/[^0-9]/g, '') || '0');
}

/**
 * Extract numeric value from any element
 * More generic version of extractBudget
 *
 * @param locator - Playwright locator for the element
 * @returns Parsed number
 */
export async function extractNumeric(locator: Locator): Promise<number> {
	await expect(locator).toBeVisible({ timeout: 5000 });
	const text = await locator.textContent();
	return parseInt(text?.replace(/[^0-9]/g, '') || '0');
}

/**
 * Wait for an element to update with new content
 * Useful after state changes to ensure UI has reflected the update
 *
 * @param locator - Playwright locator for the element
 * @param expectedPattern - Text or regex pattern to match
 * @param timeout - Maximum time to wait in ms (default: 2000)
 */
export async function waitForContentUpdate(
	locator: Locator,
	expectedPattern: string | RegExp,
	timeout = 2000
): Promise<void> {
	if (typeof expectedPattern === 'string') {
		await expect(locator).toContainText(expectedPattern, { timeout });
	} else {
		await expect(locator).toHaveText(expectedPattern, { timeout });
	}
}

/**
 * Lock in all players to trigger resolution/consequences transition
 * Replaces ~5 instances of multi-player lock-in pattern
 *
 * @param pages - Array of player pages to lock in
 * @param waitTime - Time to wait after last lock-in for phase transition (default: 2000ms)
 */
export async function lockInAllPlayers(pages: Page[], waitTime = 2000): Promise<void> {
	for (const page of pages) {
		const lockButton = page.locator('[data-testid="lock-in-button"]');
		if (await lockButton.isVisible()) {
			await lockButton.click();
		}
	}
	// Wait for resolution to complete and phase transition
	if (pages.length > 0) {
		await pages[0].waitForTimeout(waitTime);
	}
}
