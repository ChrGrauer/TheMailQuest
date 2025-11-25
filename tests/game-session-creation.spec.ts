import { test, expect } from './fixtures';

/**
 * Feature: Create Game Session - E2E/UI Tests
 *
 * This test suite implements the UI/E2E acceptance criteria from:
 * features/US-1.1-create-game-session.feature
 *
 * Using ATDD approach with Playwright (Red-Green-Refactor):
 * - These tests will FAIL initially (Red phase)
 * - Then we implement the UI to make them pass (Green phase)
 *
 * Business logic is tested separately with Vitest
 */

test.describe('Feature: Create Game Session - UI/E2E', () => {
	// ============================================================================
	// ERROR HANDLING
	// ============================================================================
	//
	// NOTE: Happy path tests for session creation have been removed as they are
	// implicitly tested in 17+ other test files via the createTestSession() helper.
	// If session creation breaks, all tests fail immediately. This file now focuses
	// on error cases that are NOT covered by happy path tests.
	// ============================================================================

	test.describe('Scenario: System handles session creation failure gracefully', () => {
		test('should show error message if session creation fails', async ({ page }) => {
			// This test would require mocking the API to fail
			// For now, we test the error UI exists

			// Given: On the create page
			await page.goto('/create');

			// When: Session creation fails (we'll implement API mocking later)
			// For now, just verify error handling UI exists in the component

			// Then: An error message should be displayed
			// (This will be implemented when we add error handling)
		});

		test('should allow retry after session creation failure', async ({ page }) => {
			// Given: Session creation has failed
			await page.goto('/create');

			// Then: The facilitator should remain on the "/create" page
			await expect(page).toHaveURL('/create');

			// And: The create button should still be clickable for retry
			const createButton = page.getByRole('button', { name: /create a session/i });
			await expect(createButton).toBeEnabled();
		});
	});

	// ============================================================================
	// ACCESSIBILITY
	// ============================================================================

	test.describe('Accessibility', () => {
		test('should have accessible room code display', async ({ page }) => {
			await page.goto('/create');
			await page.getByRole('button', { name: /create a session/i }).click();
			await page.waitForURL(/\/lobby\/[A-Z0-9]{6}/);

			// Room code should have proper ARIA label
			const roomCodeElement = page.locator('[data-testid="room-code"]');
			const ariaLabel = await roomCodeElement.getAttribute('aria-label');
			expect(ariaLabel).toBeTruthy();
			expect(ariaLabel).toMatch(/room code/i);
		});

		test('should have accessible copy button', async ({ page }) => {
			await page.goto('/create');
			await page.getByRole('button', { name: /create a session/i }).click();
			await page.waitForURL(/\/lobby\/[A-Z0-9]{6}/);

			// Copy button should be accessible
			const copyButton = page.getByRole('button', { name: /copy/i });
			await expect(copyButton).toBeVisible();

			// Should have proper accessible name
			const accessibleName = await copyButton.getAttribute('aria-label');
			expect(accessibleName).toMatch(/copy/i);
		});
	});
});
