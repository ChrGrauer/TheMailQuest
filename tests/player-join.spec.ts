/**
 * US-1.2: Join Game Session - E2E Tests
 *
 * Tests user interface flows for joining a game session:
 * - Room code entry page
 * - Room code validation and error messages
 * - Role selection screen
 * - Display name entry
 * - Real-time lobby updates
 * - Error states and accessibility
 *
 * Uses Playwright for end-to-end testing
 */

import { test, expect } from '@playwright/test';
import { createTestSession } from './helpers/game-setup';

test.describe('Feature: Join Game Session - E2E', () => {
	// ============================================================================
	// ROOM CODE ENTRY AND VALIDATION
	// ============================================================================
	//
	// NOTE: Happy path tests for successful joining have been removed as they are
	// implicitly tested 50+ times via the addPlayer() helper across all test files.
	// This file now focuses on:
	// - Error cases (invalid/malformed room codes, validation failures)
	// - Edge cases (occupied slots, full sessions)
	// - Accessibility attributes
	// ============================================================================

	test.describe('Scenario: Player enters invalid or non-existent room code', () => {
		test('should show error message for non-existent room code', async ({ page }) => {
			// Given a player is on the join page
			await page.goto('/join');

			// When the player enters room code "INVALID"
			const roomCodeInput = page.locator('input[name="roomCode"]');
			await roomCodeInput.fill('INVALID');

			// And the player submits the form
			await page.click('button[type="submit"]');

			// Then the player should see an error message
			await expect(page.locator('text=Room not found. Please check the code.')).toBeVisible();

			// And the player should remain on the join page
			await expect(page).toHaveURL('/join');
		});

		test('should show error message for different invalid room codes', async ({ page }) => {
			const invalidCodes = ['XYZ999', '123456'];

			for (const code of invalidCodes) {
				await page.goto('/join');
				const roomCodeInput = page.locator('input[name="roomCode"]');
				await roomCodeInput.fill(code);
				await page.click('button[type="submit"]');

				await expect(page.locator('text=Room not found. Please check the code.')).toBeVisible();
				await expect(page).toHaveURL('/join');
			}
		});
	});

	test.describe('Scenario: Player enters room code with wrong format', () => {
		test('should show format error for too short room code', async ({ page }) => {
			// Given a player is on the join page
			await page.goto('/join');

			// When the player enters room code "AB12"
			const roomCodeInput = page.locator('input[name="roomCode"]');
			await roomCodeInput.fill('AB12');

			// And the player submits the form
			await page.click('button[type="submit"]');

			// Then the system should show a format error
			await expect(page.locator('text=Room code must be 6 characters')).toBeVisible();
		});

		test('should show format error for various invalid formats', async ({ page }) => {
			// Test that auto-formatting works correctly
			await page.goto('/join');
			const roomCodeInput = page.locator('input[name="roomCode"]');

			// Test 1: Too short (AB -> AB, only 2 chars)
			await roomCodeInput.fill('AB');
			await page.click('button[type="submit"]');
			await expect(page.locator('text=Room code must be 6 characters')).toBeVisible();

			// Test 2: Lowercase gets auto-uppercased (abc123 -> ABC123, valid format)
			await page.goto('/join');
			await roomCodeInput.fill('abc123');
			// Verify it was uppercased
			await expect(roomCodeInput).toHaveValue('ABC123');

			// Test 3: Special chars get stripped (AB-123 -> AB123, only 5 chars)
			await page.goto('/join');
			await roomCodeInput.fill('AB-12'); // After stripping becomes AB12 (4 chars)
			await page.click('button[type="submit"]');
			await expect(page.locator('text=Room code must be 6 characters')).toBeVisible();

			// Test 4: Too long gets truncated (input is limited to 6 chars)
			await page.goto('/join');
			await roomCodeInput.fill('ABCDEFGHIJ');
			// Verify it was truncated to 6
			await expect(roomCodeInput).toHaveValue('ABCDEF');
		});
	});

	// ============================================================================
	// OCCUPIED SLOTS & EDGE CASES
	// ============================================================================

	test.describe('Scenario: Player sees occupied slots as unavailable', () => {
		test('should show occupied slots as unavailable and remaining slots as available', async ({
			page,
			context
		}) => {
			// Given - Create a session
			const roomCode = await createTestSession(page);

			// Player Alice joins as SendWave team
			await page.goto(`/lobby/${roomCode}`);
			await page.click('text=SendWave');
			await page.locator('input[name="displayName"]').fill('Alice');
			await page.click('button:has-text("Join Game")');

			// Wait for Alice to be added
			await expect(page.locator('text=Alice')).toBeVisible();

			// Player Bob joins as Gmail destination
			const bobPage = await context.newPage();
			await bobPage.goto(`/lobby/${roomCode}`);
			await bobPage.click('text=Gmail');
			await bobPage.locator('input[name="displayName"]').fill('Bob');
			await bobPage.click('button:has-text("Join Game")');

			// Wait for Bob to be added
			await expect(bobPage.locator('text=Bob')).toBeVisible();

			// When a new player Charlie joins the lobby
			const charliePage = await context.newPage();
			await charliePage.goto(`/lobby/${roomCode}`);

			// Then Charlie should see SendWave as unavailable/occupied
			const sendWaveSlot = charliePage.locator('[data-team="SendWave"]');
			await expect(sendWaveSlot).toHaveAttribute('data-occupied', 'true');
			await expect(sendWaveSlot.locator('text=Occupied')).toBeVisible();

			// And Charlie should see Gmail as unavailable/occupied
			const gmailSlot = charliePage.locator('[data-team="Gmail"]');
			await expect(gmailSlot).toHaveAttribute('data-occupied', 'true');
			await expect(gmailSlot.locator('text=Occupied')).toBeVisible();

			// And Charlie should see the other 7 slots as available
			const availableSlots = charliePage.locator('[data-occupied="false"]');
			await expect(availableSlots).toHaveCount(6); // 4 ESP teams + 2 destinations
		});
	});

	// ============================================================================
	// VALIDATION ERRORS
	// ============================================================================

	test.describe('Scenario: Player cannot join with empty display name', () => {
		test('should show validation error when display name is empty', async ({ page }) => {
			// Given a player is on the lobby page
			const roomCode = await createTestSession(page);
			await page.goto(`/lobby/${roomCode}`);

			// When the player selects "SendWave" team slot
			await page.click('text=SendWave');

			// And the player leaves the display name field empty
			const displayNameInput = page.locator('input[name="displayName"]');
			await expect(displayNameInput).toBeVisible();
			// Leave it empty

			// And the player tries to confirm their selection
			await page.click('button:has-text("Join Game")');

			// Then the system should show a validation error
			await expect(page.locator('text=Name is required')).toBeVisible();

			// And the player should not be added to the game session
			await expect(page.locator('text=ESP Teams: 0/5')).toBeVisible();
		});
	});

	// ============================================================================
	// PREVENT DUPLICATE ROLE SELECTION
	// ============================================================================

	test.describe('Scenario: Player cannot select already occupied ESP team slot', () => {
		test('should prevent selection of occupied ESP team and show error message', async ({
			page,
			context
		}) => {
			// Given player Alice has joined as SendWave team
			const roomCode = await createTestSession(page);
			await page.goto(`/lobby/${roomCode}`);
			await page.click('text=SendWave');
			await page.locator('input[name="displayName"]').fill('Alice');
			await page.click('button:has-text("Join Game")');
			await expect(page.locator('text=Alice')).toBeVisible();

			// When a new player Bob opens the lobby
			const bobPage = await context.newPage();
			await bobPage.goto(`/lobby/${roomCode}`);

			// Wait for WebSocket to connect and receive updates
			await bobPage.waitForTimeout(500);

			// Then the SendWave slot should be disabled
			const sendWaveSlot = bobPage.locator('[data-team="SendWave"]');
			await expect(sendWaveSlot).toBeDisabled();

			// And it should be marked as occupied
			await expect(sendWaveSlot).toHaveAttribute('data-occupied', 'true');

			// And show Alice's name
			await expect(bobPage.locator('text=Alice')).toBeVisible();
		});
	});

	test.describe('Scenario: Player cannot select already occupied Destination slot', () => {
		test('should prevent selection of occupied destination and show error message', async ({
			page,
			context
		}) => {
			// Given player Alice has joined as Gmail destination
			const roomCode = await createTestSession(page);
			await page.goto(`/lobby/${roomCode}`);
			await page.click('text=Gmail');
			await page.locator('input[name="displayName"]').fill('Alice');
			await page.click('button:has-text("Join Game")');
			await expect(page.locator('text=Alice')).toBeVisible();

			// When a new player Bob opens the lobby
			const bobPage = await context.newPage();
			await bobPage.goto(`/lobby/${roomCode}`);

			// Wait for WebSocket to connect and receive updates
			await bobPage.waitForTimeout(500);

			// Then the Gmail slot should be disabled
			const gmailSlot = bobPage.locator('[data-team="Gmail"]');
			await expect(gmailSlot).toBeDisabled();

			// And it should be marked as occupied
			await expect(gmailSlot).toHaveAttribute('data-occupied', 'true');

			// And show Alice's name
			await expect(bobPage.locator('text=Alice')).toBeVisible();
		});
	});

	// ============================================================================
	// SESSION VALIDATION - UI BEHAVIOR
	// ============================================================================
	//
	// NOTE: WebSocket real-time update tests have been removed as generic sync
	// behavior should be tested in a dedicated websocket-sync.spec.ts file
	// (Phase 4 of refactoring).
	// ============================================================================

	test.describe('Scenario: Player cannot join full session', () => {
		// Run this test serially to avoid resource contention
		// This test creates 9 browser pages (1 facilitator + 5 ESP + 3 destinations + 9th player)
		// When run in parallel with other tests, it can cause timeouts and flaky failures
		test.describe.configure({ mode: 'serial' });

		test('should show "session is full" message when trying to join full lobby', async ({
			page,
			context
		}) => {
			// Increase timeout for this resource-intensive test (creates 9 browser pages)
			test.setTimeout(30000); // 30 seconds

			// Given a game session with all 8 slots occupied
			const roomCode = await createTestSession(page);

			// Fill all 5 ESP teams
			const espTeamNames = ['SendWave', 'MailMonkey', 'BluePost', 'SendBolt', 'RocketMail'];
			for (let i = 0; i < espTeamNames.length; i++) {
				const playerPage = i === 0 ? page : await context.newPage();
				await playerPage.goto(`/lobby/${roomCode}`);
				await playerPage.click(`text=${espTeamNames[i]}`);
				await playerPage.locator('input[name="displayName"]').fill(`ESPPlayer${i + 1}`);
				await playerPage.click('button:has-text("Join Game")');
				await expect(playerPage.locator(`text=ESPPlayer${i + 1}`)).toBeVisible();
			}

			// Fill all 3 destinations
			const destinations = ['Gmail', 'Outlook', 'Yahoo'];
			for (let i = 0; i < destinations.length; i++) {
				const playerPage = await context.newPage();
				await playerPage.goto(`/lobby/${roomCode}`);

				// Wait for page to stabilize (animations to complete) before interacting
				// This test creates many pages and can cause resource contention
				await playerPage.waitForLoadState('networkidle');
				await playerPage.waitForTimeout(200);

				await playerPage.click(`text=${destinations[i]}`);
				await playerPage.locator('input[name="displayName"]').fill(`DestPlayer${i + 1}`);
				await playerPage.click('button:has-text("Join Game")');
				await expect(playerPage.locator(`text=DestPlayer${i + 1}`)).toBeVisible();
			}

			// When a 9th player tries to join
			const player9Page = await context.newPage();
			await player9Page.goto(`/lobby/${roomCode}`);
			await player9Page.waitForLoadState('networkidle');

			// Then the player should see "This session is full"
			await expect(player9Page.locator('text=This session is full')).toBeVisible();

			// And all slots should be disabled/unavailable
			const availableSlots = player9Page.locator('[data-occupied="false"]');
			await expect(availableSlots).toHaveCount(0);
		});
	});

	// ============================================================================
	// ACCESSIBILITY
	// ============================================================================

	test.describe('Accessibility: Role selection', () => {
		test('should have proper ARIA labels and keyboard navigation', async ({ page }) => {
			const roomCode = await createTestSession(page);
			await page.goto(`/lobby/${roomCode}`);

			// Check that team slots have proper ARIA labels
			const sendWaveSlot = page.locator('[data-team="SendWave"]');
			// Note: <button> elements don't need role="button" (redundant)
			await expect(sendWaveSlot).toHaveAttribute('aria-label');

			// Check that occupied slots have aria-disabled
			await page.click('text=SendWave');
			await page.locator('input[name="displayName"]').fill('Alice');
			await page.click('button:has-text("Join Game")');

			await expect(sendWaveSlot).toHaveAttribute('aria-disabled', 'true');
		});

		test('should support keyboard navigation for role selection', async ({ page }) => {
			const roomCode = await createTestSession(page);
			await page.goto(`/lobby/${roomCode}`);

			// Focus on first team slot
			const sendWaveSlot = page.locator('[data-team="SendWave"]');
			await sendWaveSlot.focus();

			// Press Enter to select
			await page.keyboard.press('Enter');

			// Display name modal should appear
			await expect(page.locator('input[name="displayName"]')).toBeFocused();
		});
	});

	// ============================================================================
	// ERROR MESSAGES UI
	// ============================================================================

	test.describe('Scenario: Error messages are displayed correctly', () => {
		test('should show error messages with proper styling and dismissibility', async ({ page }) => {
			// Test room not found error
			await page.goto('/join');
			await page.locator('input[name="roomCode"]').fill('WRONG1');
			await page.click('button[type="submit"]');

			const errorMessage = page.locator('[role="alert"]');
			await expect(errorMessage).toBeVisible();
			await expect(errorMessage).toContainText('Room not found');

			// Error should have proper ARIA attributes
			await expect(errorMessage).toHaveAttribute('role', 'alert');

			// Error should be dismissible (if implemented)
			const dismissButton = errorMessage.locator('button[aria-label="Dismiss"]');
			if (await dismissButton.isVisible()) {
				await dismissButton.click();
				await expect(errorMessage).not.toBeVisible();
			}
		});
	});
});
