/**
 * QR Code Lobby Join Feature - E2E Tests
 *
 * Tests the QR code feature that allows mobile users to quickly join a lobby
 * by scanning a QR code instead of manually entering the room code.
 *
 * Feature Requirements:
 * - Button in lobby header to display QR code
 * - Modal showing QR code that encodes the full lobby URL
 * - QR code uses dynamic URL (not hardcoded) based on current deployment
 * - Modal can be closed via close button, Escape key, or click outside
 *
 * Uses Playwright for end-to-end testing
 */

import { test, expect, type Page } from '@playwright/test';
import { createTestSession, closePages } from './helpers/game-setup';

test.describe('Feature: QR Code Lobby Join', () => {
	let facilitatorPage: Page;

	test.afterEach(async ({ page }) => {
		await closePages(page, facilitatorPage);
	});

	// ============================================================================
	// QR CODE BUTTON VISIBILITY AND PLACEMENT
	// ============================================================================

	test.describe('Scenario: QR code button is visible in lobby', () => {
		test('should display QR code button in lobby header', async ({ page, context }) => {
			// Given a facilitator has created a game session
			const roomCode = await createTestSession(page);
			facilitatorPage = page;

			// When the facilitator is on the lobby page
			await page.goto(`/lobby/${roomCode}`);

			// Then the QR code button should be visible in the header
			const qrButton = page.getByTestId('show-qr-code-button');
			await expect(qrButton).toBeVisible();

			// And the button should have appropriate accessibility attributes
			await expect(qrButton).toHaveAttribute('aria-label', /qr code|share/i);

			// And the button should be styled as a prominent action
			await expect(qrButton).toBeEnabled();
		});

		test('should display QR code button for all lobby visitors (players and facilitator)', async ({
			page,
			context
		}) => {
			// Given a facilitator has created a game session
			const roomCode = await createTestSession(page);
			facilitatorPage = page;

			// And the facilitator is on the lobby page
			await page.goto(`/lobby/${roomCode}`);

			// Then the facilitator should see the QR code button
			await expect(page.getByTestId('show-qr-code-button')).toBeVisible();

			// When a player joins the lobby
			const playerPage = await context.newPage();
			await playerPage.goto(`/lobby/${roomCode}`);

			// Then the player should also see the QR code button
			await expect(playerPage.getByTestId('show-qr-code-button')).toBeVisible();

			await playerPage.close();
		});
	});

	// ============================================================================
	// QR CODE MODAL DISPLAY
	// ============================================================================

	test.describe('Scenario: Clicking QR code button opens modal with QR code', () => {
		test('should open QR code modal when button is clicked', async ({ page }) => {
			// Given a facilitator is on the lobby page
			const roomCode = await createTestSession(page);
			facilitatorPage = page;
			await page.goto(`/lobby/${roomCode}`);

			// When the facilitator clicks the QR code button
			await page.getByTestId('show-qr-code-button').click();

			// Then the QR code modal should appear
			const modal = page.getByTestId('qr-code-modal');
			await expect(modal).toBeVisible();

			// And the modal should have proper ARIA attributes
			await expect(modal).toHaveAttribute('role', 'dialog');
			await expect(modal).toHaveAttribute('aria-modal', 'true');

			// And the modal should contain a QR code image
			const qrImage = page.getByTestId('qr-code-image');
			await expect(qrImage).toBeVisible();

			// And the modal should have a close button
			const closeButton = page.getByTestId('close-qr-modal');
			await expect(closeButton).toBeVisible();
		});

		test('should display modal with title and instructions', async ({ page }) => {
			// Given a facilitator is on the lobby page
			const roomCode = await createTestSession(page);
			facilitatorPage = page;
			await page.goto(`/lobby/${roomCode}`);

			// When the facilitator clicks the QR code button
			await page.getByTestId('show-qr-code-button').click();

			// Then the modal should have a descriptive title
			const modal = page.getByTestId('qr-code-modal');
			await expect(modal.locator('text=/scan.*join/i').first()).toBeVisible();

			// And the modal should show the room code for reference
			await expect(modal.locator(`text=${roomCode}`)).toBeVisible();

			// And the modal should provide helpful instructions
			await expect(modal.locator('text=/mobile.*camera|scan.*code/i').first()).toBeVisible();
		});
	});

	// ============================================================================
	// QR CODE CONTENT VALIDATION
	// ============================================================================

	test.describe('Scenario: QR code contains correct dynamic lobby URL', () => {
		test('should encode the full lobby URL with room code in QR code', async ({ page }) => {
			// Given a facilitator is on the lobby page
			const roomCode = await createTestSession(page);
			facilitatorPage = page;
			await page.goto(`/lobby/${roomCode}`);

			// When the facilitator opens the QR code modal
			await page.getByTestId('show-qr-code-button').click();

			// Then the QR code should be present
			const qrImage = page.getByTestId('qr-code-image');
			await expect(qrImage).toBeVisible();

			// And the QR code should have a data URL or src attribute
			const qrSrc = await qrImage.getAttribute('src');
			expect(qrSrc).toBeTruthy();

			// And the page should expose the encoded URL for testing
			// (Implementation should set a data attribute or expose via test API)
			const encodedUrl = await page.evaluate(() => {
				return (window as any).__qrCodeTest?.encodedUrl;
			});

			// And the encoded URL should contain the room code
			expect(encodedUrl).toContain(roomCode);

			// And the encoded URL should point to the lobby page
			expect(encodedUrl).toContain(`/lobby/${roomCode}`);

			// And the URL should use the current origin (not hardcoded)
			const currentOrigin = await page.evaluate(() => window.location.origin);
			expect(encodedUrl).toContain(currentOrigin);
		});

		test('should generate different QR codes for different room codes', async ({
			page,
			context
		}) => {
			// Given two different game sessions
			const roomCode1 = await createTestSession(page);
			facilitatorPage = page;

			const facilitator2Page = await context.newPage();
			const roomCode2 = await createTestSession(facilitator2Page);

			expect(roomCode1).not.toBe(roomCode2);

			// When viewing the QR code for the first session
			await page.goto(`/lobby/${roomCode1}`);
			await page.getByTestId('show-qr-code-button').click();
			const encodedUrl1 = await page.evaluate(() => {
				return (window as any).__qrCodeTest?.encodedUrl;
			});

			// And viewing the QR code for the second session
			await facilitator2Page.goto(`/lobby/${roomCode2}`);
			await facilitator2Page.getByTestId('show-qr-code-button').click();
			const encodedUrl2 = await facilitator2Page.evaluate(() => {
				return (window as any).__qrCodeTest?.encodedUrl;
			});

			// Then the URLs should be different
			expect(encodedUrl1).not.toBe(encodedUrl2);

			// And each should contain its respective room code
			expect(encodedUrl1).toContain(roomCode1);
			expect(encodedUrl2).toContain(roomCode2);

			await facilitator2Page.close();
		});
	});

	// ============================================================================
	// MODAL CLOSING BEHAVIORS
	// ============================================================================

	test.describe('Scenario: QR code modal can be closed in multiple ways', () => {
		test('should close modal when close button is clicked', async ({ page }) => {
			// Given the QR code modal is open
			const roomCode = await createTestSession(page);
			facilitatorPage = page;
			await page.goto(`/lobby/${roomCode}`);
			await page.getByTestId('show-qr-code-button').click();

			const modal = page.getByTestId('qr-code-modal');
			await expect(modal).toBeVisible();

			// When the close button is clicked
			await page.getByTestId('close-qr-modal').click();

			// Then the modal should close
			await expect(modal).not.toBeVisible();
		});

		test('should close modal when Escape key is pressed', async ({ page }) => {
			// Given the QR code modal is open
			const roomCode = await createTestSession(page);
			facilitatorPage = page;
			await page.goto(`/lobby/${roomCode}`);
			await page.getByTestId('show-qr-code-button').click();

			const modal = page.getByTestId('qr-code-modal');
			await expect(modal).toBeVisible();

			// When the Escape key is pressed
			await page.keyboard.press('Escape');

			// Then the modal should close
			await expect(modal).not.toBeVisible();
		});

		test('should close modal when clicking outside (backdrop)', async ({ page }) => {
			// Given the QR code modal is open
			const roomCode = await createTestSession(page);
			facilitatorPage = page;
			await page.goto(`/lobby/${roomCode}`);
			await page.getByTestId('show-qr-code-button').click();

			const modal = page.getByTestId('qr-code-modal');
			await expect(modal).toBeVisible();

			// When clicking on the backdrop (outside the modal content)
			// The backdrop should have tabindex="-1" as per accessibility guidelines
			const backdrop = page.locator('[role="dialog"]').locator('..'); // Parent of dialog
			await backdrop.click({ position: { x: 10, y: 10 } }); // Click top-left corner

			// Then the modal should close
			await expect(modal).not.toBeVisible();
		});

		test('should allow reopening modal after closing', async ({ page }) => {
			// Given the QR code modal was opened and then closed
			const roomCode = await createTestSession(page);
			facilitatorPage = page;
			await page.goto(`/lobby/${roomCode}`);

			await page.getByTestId('show-qr-code-button').click();
			await page.getByTestId('close-qr-modal').click();

			const modal = page.getByTestId('qr-code-modal');
			await expect(modal).not.toBeVisible();

			// When the user clicks the QR code button again
			await page.getByTestId('show-qr-code-button').click();

			// Then the modal should open again
			await expect(modal).toBeVisible();

			// And the QR code should still be visible
			await expect(page.getByTestId('qr-code-image')).toBeVisible();
		});
	});

	// ============================================================================
	// ACCESSIBILITY
	// ============================================================================

	test.describe('Scenario: QR code feature is accessible', () => {
		test('should have proper focus management when opening modal', async ({ page }) => {
			// Given a facilitator is on the lobby page
			const roomCode = await createTestSession(page);
			facilitatorPage = page;
			await page.goto(`/lobby/${roomCode}`);

			// When the facilitator clicks the QR code button
			await page.getByTestId('show-qr-code-button').click();

			// Then focus should move to the modal
			const modal = page.getByTestId('qr-code-modal');
			await expect(modal).toBeVisible();

			// And the modal or a focusable element within should have focus
			const closeButton = page.getByTestId('close-qr-modal');
			await expect(closeButton).toBeFocused();
		});

		test('should have proper ARIA labels and roles', async ({ page }) => {
			// Given the QR code modal is open
			const roomCode = await createTestSession(page);
			facilitatorPage = page;
			await page.goto(`/lobby/${roomCode}`);
			await page.getByTestId('show-qr-code-button').click();

			// Then the modal should have role="dialog"
			const modal = page.getByTestId('qr-code-modal');
			await expect(modal).toHaveAttribute('role', 'dialog');

			// And aria-modal="true"
			await expect(modal).toHaveAttribute('aria-modal', 'true');

			// And the QR code image should have descriptive alt text
			const qrImage = page.getByTestId('qr-code-image');
			const altText = await qrImage.getAttribute('alt');
			expect(altText).toBeTruthy();
			expect(altText).toMatch(/qr code|lobby|join/i);

			// And the close button should have an aria-label
			const closeButton = page.getByTestId('close-qr-modal');
			await expect(closeButton).toHaveAttribute('aria-label', /close/i);
		});
	});

	// ============================================================================
	// EDGE CASES
	// ============================================================================

	test.describe('Scenario: QR code feature edge cases', () => {
		test('should display QR code correctly when lobby URL contains special characters', async ({
			page
		}) => {
			// Given a game session with a room code that might have edge cases
			// (Though the current implementation uses 6-char alphanumeric codes)
			const roomCode = await createTestSession(page);
			facilitatorPage = page;
			await page.goto(`/lobby/${roomCode}`);

			// When opening the QR code
			await page.getByTestId('show-qr-code-button').click();

			// Then the QR code should still generate correctly
			const qrImage = page.getByTestId('qr-code-image');
			await expect(qrImage).toBeVisible();

			const qrSrc = await qrImage.getAttribute('src');
			expect(qrSrc).toBeTruthy();

			// And the URL should be properly encoded
			const encodedUrl = await page.evaluate(() => {
				return (window as any).__qrCodeTest?.encodedUrl;
			});
			expect(encodedUrl).toContain(roomCode);
		});

		test('should maintain QR code display when WebSocket updates occur', async ({
			page,
			context
		}) => {
			// Given the QR code modal is open
			const roomCode = await createTestSession(page);
			facilitatorPage = page;
			await page.goto(`/lobby/${roomCode}`);
			await page.getByTestId('show-qr-code-button').click();

			const modal = page.getByTestId('qr-code-modal');
			await expect(modal).toBeVisible();

			// When a player joins (triggering WebSocket updates)
			const playerPage = await context.newPage();
			await playerPage.goto(`/lobby/${roomCode}`);
			await playerPage.click('text=SendWave');
			await playerPage.locator('input[name="displayName"]').fill('TestPlayer');
			await playerPage.click('button:has-text("Join Game")');

			// Wait for WebSocket update
			await page.waitForTimeout(500);

			// Then the QR code modal should still be visible
			await expect(modal).toBeVisible();

			// And the QR code should still be displayed
			await expect(page.getByTestId('qr-code-image')).toBeVisible();

			await playerPage.close();
		});
	});
});
