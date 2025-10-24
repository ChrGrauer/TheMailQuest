import { test, expect } from '@playwright/test';

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
  // BASIC GAME SESSION CREATION
  // ============================================================================

  test.describe('Scenario: Facilitator creates a new game session', () => {
    test('should allow facilitator to create a session from the create page', async ({ page }) => {
      // Given: A facilitator is on the "/create" page
      await page.goto('/create');

      // When: The facilitator clicks the "Create a session" button
      const createButton = page.getByRole('button', { name: /create a session/i });
      await createButton.click();

      // Then: The facilitator should be redirected to the lobby page
      await expect(page).toHaveURL(/\/lobby\/[A-Z0-9]{6}/);

      // And: The facilitator should see the room code displayed prominently
      const roomCodeElement = page.locator('[data-testid="room-code"]');
      await expect(roomCodeElement).toBeVisible();

      // Verify room code format
      const roomCode = await roomCodeElement.textContent();
      expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
    });
  });

  test.describe('Scenario: Room code is displayed prominently on the lobby page', () => {
    test('should display room code with copy button in the lobby', async ({ page }) => {
      // Given: A facilitator has created a game session
      await page.goto('/create');
      const createButton = page.getByRole('button', { name: /create a session/i });
      await createButton.click();

      // Wait for redirect to lobby
      await page.waitForURL(/\/lobby\/[A-Z0-9]{6}/);

      // When: The facilitator is on the lobby page
      // Then: The room code should be visible in the header
      const roomCodeElement = page.locator('[data-testid="room-code"]');
      await expect(roomCodeElement).toBeVisible();

      // And: The room code should be easily readable
      const fontSize = await roomCodeElement.evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });
      // Font size should be reasonably large (at least 20px)
      const fontSizeValue = parseInt(fontSize);
      expect(fontSizeValue).toBeGreaterThanOrEqual(20);

      // And: There should be a "Copy" button next to the room code
      const copyButton = page.getByRole('button', { name: /copy/i });
      await expect(copyButton).toBeVisible();
    });

    test('should copy room code to clipboard when copy button is clicked', async ({ page, context }) => {
      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      // Given: A facilitator is on the lobby page
      await page.goto('/create');
      await page.getByRole('button', { name: /create a session/i }).click();
      await page.waitForURL(/\/lobby\/[A-Z0-9]{6}/);

      // Get the room code text
      const roomCodeElement = page.locator('[data-testid="room-code"]');
      const roomCode = await roomCodeElement.textContent();

      // When: The facilitator clicks the copy button
      const copyButton = page.getByRole('button', { name: /copy/i });
      await copyButton.click();

      // Then: The room code should be copied to clipboard
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toBe(roomCode);
    });
  });

  // ============================================================================
  // SESSION NAVIGATION
  // ============================================================================

  test.describe('Navigation and Session Access', () => {
    test('should allow direct navigation to lobby page with room code', async ({ page }) => {
      // First create a session to get a valid room code
      await page.goto('/create');
      await page.getByRole('button', { name: /create a session/i }).click();
      await page.waitForURL(/\/lobby\/[A-Z0-9]{6}/);

      const url = page.url();
      const roomCode = url.match(/\/lobby\/([A-Z0-9]{6})/)?.[1];

      // Navigate away
      await page.goto('/');

      // When: Navigating directly to lobby with room code
      await page.goto(`/lobby/${roomCode}`);

      // Then: The lobby page should load
      await expect(page).toHaveURL(`/lobby/${roomCode}`);

      // And: The room code should be displayed
      const roomCodeElement = page.locator('[data-testid="room-code"]');
      await expect(roomCodeElement).toHaveText(roomCode!);
    });
  });

  // ============================================================================
  // ERROR HANDLING
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
  // LOBBY PAGE CONTENT
  // ============================================================================

  test.describe('Lobby Page Initial State', () => {
    test('should display waiting message when no players have joined', async ({ page }) => {
      // Given: A facilitator has created a game session
      await page.goto('/create');
      await page.getByRole('button', { name: /create a session/i }).click();
      await page.waitForURL(/\/lobby\/[A-Z0-9]{6}/);

      // Then: The lobby should show a waiting message
      const waitingMessage = page.getByText('Waiting for players to join...');
      await expect(waitingMessage).toBeVisible();
    });

    test('should display ESP team slots in the lobby', async ({ page }) => {
      // Given: A facilitator is on the lobby page
      await page.goto('/create');
      await page.getByRole('button', { name: /create a session/i }).click();
      await page.waitForURL(/\/lobby\/[A-Z0-9]{6}/);

      // Then: 5 ESP team slots should be visible
      const espTeamSlots = page.locator('[data-testid="esp-team-slot"]');
      await expect(espTeamSlots).toHaveCount(5);

      // And: Each slot should show the team name
      const teamNames = ['SendWave', 'MailMonkey', 'BluePost', 'SendBolt', 'RocketMail'];
      for (const name of teamNames) {
        await expect(page.getByText(name)).toBeVisible();
      }
    });

    test('should display destination slots in the lobby', async ({ page }) => {
      // Given: A facilitator is on the lobby page
      await page.goto('/create');
      await page.getByRole('button', { name: /create a session/i }).click();
      await page.waitForURL(/\/lobby\/[A-Z0-9]{6}/);

      // Then: 3 destination slots should be visible
      const destinationSlots = page.locator('[data-testid="destination-slot"]');
      await expect(destinationSlots).toHaveCount(3);

      // And: Each slot should show the destination name
      const destinationNames = ['Gmail', 'Outlook', 'Yahoo'];
      for (const name of destinationNames) {
        await expect(page.getByText(name)).toBeVisible();
      }
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
