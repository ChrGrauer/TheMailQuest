import { test, expect } from './fixtures';
import {
	createTestSession,
	createSessionWithMinimumPlayers,
	closePages
} from './helpers/game-setup';

/**
 * Accessibility Tests
 *
 * Dedicated test suite for accessibility requirements across the application.
 * Tests focus on ARIA attributes, keyboard navigation, and screen reader support.
 *
 * Consolidated from:
 * - game-session-creation.spec.ts (deleted)
 * - game-start.spec.ts
 * - player-join.spec.ts
 */

test.describe('Accessibility', () => {
	test('Facilitator lobby should have accessible room code and copy button', async ({ page }) => {
		await createTestSession(page);

		// Room code should have proper ARIA label for screen readers
		const roomCodeElement = page.locator('[data-testid="room-code"]');
		await expect(roomCodeElement).toHaveAttribute('aria-label', /room code/i);

		// Copy button should be accessible with proper label
		const copyButton = page.getByRole('button', { name: /copy/i });
		await expect(copyButton).toBeVisible();
		await expect(copyButton).toHaveAttribute('aria-label', /copy/i);

		await closePages(page);
	});

	test('Role selection should have ARIA labels, keyboard navigation, and aria-disabled states', async ({
		page
	}) => {
		const roomCode = await createTestSession(page);
		await page.goto(`/lobby/${roomCode}`);

		const sendWaveSlot = page.locator('[data-team="SendWave"]');

		// 1. Available team slots should have ARIA labels
		await expect(sendWaveSlot).toHaveAttribute('aria-label');

		// 2. Keyboard navigation: focus slot and press Enter to select
		await sendWaveSlot.focus();
		await page.keyboard.press('Enter');

		// Modal should appear with input focused
		const displayNameInput = page.locator('input[name="displayName"]');
		await expect(displayNameInput).toBeFocused();

		// 3. Join the game to occupy the slot
		await displayNameInput.fill('Alice');
		await page.click('button:has-text("Join Game")');

		// 4. Occupied slot should have aria-disabled
		await expect(sendWaveSlot).toHaveAttribute('aria-disabled', 'true');

		await closePages(page);
	});

	test('Start Game button should be keyboard focusable', async ({ page, context }) => {
		const { alicePage, bobPage } = await createSessionWithMinimumPlayers(page, context);
		await page.waitForTimeout(500);

		const startGameButton = page.getByRole('button', { name: /start game/i });
		await expect(startGameButton).toBeVisible();

		await startGameButton.focus();
		await expect(startGameButton).toBeFocused();

		await closePages(page, alicePage, bobPage);
	});

	test('Error messages should have role="alert" for screen readers', async ({ page }) => {
		await page.goto('/join');
		await page.locator('input[name="roomCode"]').fill('WRONG1');
		await page.click('button[type="submit"]');

		const errorMessage = page.locator('[role="alert"]');
		await expect(errorMessage).toBeVisible();
		await expect(errorMessage).toContainText('Room not found');

		await closePages(page);
	});
});
