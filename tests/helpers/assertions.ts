/**
 * E2E Test Assertion Helpers
 *
 * Reusable assertion functions for common test validations.
 */
import { expect, type Page } from '@playwright/test';

/**
 * Assert the current round number is displayed correctly
 *
 * @param page - Playwright page object
 * @param expectedRound - Expected round number (1-4)
 * @param timeout - Maximum time to wait (default: 3000ms)
 */
export async function assertRound(
	page: Page,
	expectedRound: number,
	timeout = 3000
): Promise<void> {
	const roundIndicator = page.locator('[data-testid="round-indicator"]');
	await expect(roundIndicator).toContainText(`${expectedRound}`, { timeout });
}

/**
 * Assert the current game phase
 *
 * @param page - Playwright page object
 * @param expectedPhase - Expected phase ('planning', 'resolution', 'consequences', 'finished')
 * @param timeout - Maximum time to wait (default: 5000ms)
 */
export async function assertPhase(
	page: Page,
	expectedPhase: string,
	timeout = 5000
): Promise<void> {
	const phaseIndicator = page.locator('[data-testid="current-phase"]');
	await expect(phaseIndicator).toContainText(expectedPhase, { timeout });
}

/**
 * Assert budget/credits value with optional tolerance
 *
 * @param page - Playwright page object
 * @param expectedBudget - Expected budget value
 * @param tolerance - Allowed deviation (default: 0)
 * @param testId - Test ID of budget element (default: 'budget-current')
 */
export async function assertBudget(
	page: Page,
	expectedBudget: number,
	tolerance = 0,
	testId = 'budget-current'
): Promise<void> {
	const budgetElement = page.locator(`[data-testid="${testId}"]`);
	await expect(budgetElement).toBeVisible({ timeout: 3000 });

	const text = await budgetElement.textContent();
	const actualBudget = parseInt(text?.replace(/[^0-9]/g, '') || '0');

	if (tolerance === 0) {
		expect(actualBudget).toBe(expectedBudget);
	} else {
		expect(actualBudget).toBeGreaterThanOrEqual(expectedBudget - tolerance);
		expect(actualBudget).toBeLessThanOrEqual(expectedBudget + tolerance);
	}
}

/**
 * Assert no error banner is visible on the page
 *
 * @param page - Playwright page object
 */
export async function assertNoErrorBanner(page: Page): Promise<void> {
	const errorBanner = page.locator('[data-testid="error-banner"]');
	await expect(errorBanner).not.toBeVisible();
}

/**
 * Assert error banner is visible with optional message check
 *
 * @param page - Playwright page object
 * @param expectedMessage - Optional expected error message (partial match)
 * @param timeout - Maximum time to wait (default: 3000ms)
 */
export async function assertErrorBanner(
	page: Page,
	expectedMessage?: string,
	timeout = 3000
): Promise<void> {
	const errorBanner = page.locator('[data-testid="error-banner"]');
	await expect(errorBanner).toBeVisible({ timeout });

	if (expectedMessage) {
		await expect(errorBanner).toContainText(expectedMessage);
	}
}

/**
 * Assert a modal is visible
 *
 * @param page - Playwright page object
 * @param modalTestId - Test ID of the modal
 * @param timeout - Maximum time to wait (default: 3000ms)
 */
export async function assertModalVisible(
	page: Page,
	modalTestId: string,
	timeout = 3000
): Promise<void> {
	const modal = page.locator(`[data-testid="${modalTestId}"]`);
	await expect(modal).toBeVisible({ timeout });
}

/**
 * Assert a modal is not visible
 *
 * @param page - Playwright page object
 * @param modalTestId - Test ID of the modal
 */
export async function assertModalNotVisible(page: Page, modalTestId: string): Promise<void> {
	const modal = page.locator(`[data-testid="${modalTestId}"]`);
	await expect(modal).not.toBeVisible();
}

/**
 * Assert lock-in confirmation is visible (player has locked in)
 *
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait (default: 3000ms)
 */
export async function assertLockedIn(page: Page, timeout = 3000): Promise<void> {
	const confirmation = page.locator('[data-testid="lock-in-confirmation"]');
	await expect(confirmation).toBeVisible({ timeout });
	await expect(confirmation).toContainText('Locked In');
}

/**
 * Assert lock-in button is visible and enabled (player can lock in)
 *
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait (default: 3000ms)
 */
export async function assertCanLockIn(page: Page, timeout = 3000): Promise<void> {
	const lockInButton = page.locator('[data-testid="lock-in-button"]');
	await expect(lockInButton).toBeVisible({ timeout });
	await expect(lockInButton).toBeEnabled();
}

/**
 * Assert dashboard is in read-only mode (view-only banner visible)
 *
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait (default: 3000ms)
 */
export async function assertReadOnlyMode(page: Page, timeout = 3000): Promise<void> {
	const viewOnlyBanner = page.locator('[data-testid="view-only-banner"]');
	await expect(viewOnlyBanner).toBeVisible({ timeout });
}
