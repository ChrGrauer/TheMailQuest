/**
 * WebSocket Synchronization - E2E Tests
 *
 * Consolidated tests for real-time WebSocket synchronization across the application.
 * Tests generic WebSocket behavior that applies to all features.
 *
 * Previously scattered across:
 * - player-join.spec.ts (lobby updates)
 * - us-2.1-esp-dashboard.spec.ts (budget/reputation updates)
 * - us-2.5-destination-dashboard.spec.ts (disconnection handling)
 * - resource-allocation.spec.ts (notification broadcasts)
 *
 * This file focuses on:
 * - Real-time updates between multiple clients
 * - Connection/disconnection handling
 * - Message routing and filtering
 * - Concurrent update handling
 *
 * Feature-specific WebSocket tests (e.g., specific data calculations after updates)
 * remain in their respective feature test files.
 */

import { test, expect } from '@playwright/test';
import { createTestSession, addPlayer, closePages } from './helpers/game-setup';

test.describe('Feature: WebSocket Synchronization', () => {
	// ============================================================================
	// REAL-TIME LOBBY UPDATES
	// ============================================================================

	test.describe('Lobby: Real-time updates', () => {
		test('should update all connected clients when a new player joins', async ({
			page,
			context
		}) => {
			// Given: Facilitator and Alice are in the lobby
			const roomCode = await createTestSession(page);

			const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
			await page.waitForTimeout(500);

			// When: Bob joins
			const bobPage = await addPlayer(context, roomCode, 'Bob', 'ESP', 'MailMonkey');
			await page.waitForTimeout(500);

			// Then: Facilitator should see Bob's slot occupied
			await expect(page.locator('[data-team="MailMonkey"]')).toHaveAttribute(
				'data-occupied',
				'true'
			);
			await expect(page.locator('text=Bob')).toBeVisible();

			// And: Alice should also see Bob's slot occupied
			await expect(alicePage.locator('[data-team="MailMonkey"]')).toHaveAttribute(
				'data-occupied',
				'true'
			);
			await expect(alicePage.locator('text=Bob')).toBeVisible();

			await closePages(page, alicePage, bobPage);
		});

		test('should update player counts in real-time for all connected clients', async ({
			page,
			context
		}) => {
			// Given: Facilitator is in the lobby
			const roomCode = await createTestSession(page);
			await expect(page.locator('text=ESP Teams: 0/5')).toBeVisible();

			// When: Alice joins as ESP
			const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
			await page.waitForTimeout(500);

			// Then: Both facilitator and Alice see updated count
			await expect(page.locator('text=ESP Teams: 1/5')).toBeVisible();
			await expect(alicePage.locator('text=ESP Teams: 1/5')).toBeVisible();

			// When: Bob joins as Destination
			const bobPage = await addPlayer(context, roomCode, 'Bob', 'Destination', 'Gmail');
			await page.waitForTimeout(500);

			// Then: All clients see both counters updated
			await expect(page.locator('text=ESP Teams: 1/5')).toBeVisible();
			await expect(page.locator('text=Destinations: 1/3')).toBeVisible();

			await expect(alicePage.locator('text=ESP Teams: 1/5')).toBeVisible();
			await expect(alicePage.locator('text=Destinations: 1/3')).toBeVisible();

			await expect(bobPage.locator('text=ESP Teams: 1/5')).toBeVisible();
			await expect(bobPage.locator('text=Destinations: 1/3')).toBeVisible();

			await closePages(page, alicePage, bobPage);
		});

		test('should broadcast updates to multiple concurrent clients', async ({ page, context }) => {
			// Given: Multiple players in lobby
			const roomCode = await createTestSession(page);

			const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
			const bobPage = await addPlayer(context, roomCode, 'Bob', 'ESP', 'MailMonkey');
			await page.waitForTimeout(500);

			// When: Charlie joins
			const charliePage = await addPlayer(context, roomCode, 'Charlie', 'ESP', 'BluePost');
			await page.waitForTimeout(500);

			// Then: All existing clients see Charlie
			await expect(page.locator('[data-team="BluePost"]')).toHaveAttribute('data-occupied', 'true');
			await expect(alicePage.locator('[data-team="BluePost"]')).toHaveAttribute(
				'data-occupied',
				'true'
			);
			await expect(bobPage.locator('[data-team="BluePost"]')).toHaveAttribute(
				'data-occupied',
				'true'
			);

			// And: All see updated player count
			await expect(page.locator('text=ESP Teams: 3/5')).toBeVisible();
			await expect(alicePage.locator('text=ESP Teams: 3/5')).toBeVisible();
			await expect(bobPage.locator('text=ESP Teams: 3/5')).toBeVisible();
			await expect(charliePage.locator('text=ESP Teams: 3/5')).toBeVisible();

			await closePages(page, alicePage, bobPage, charliePage);
		});
	});

	// ============================================================================
	// CONNECTION HANDLING
	// ============================================================================

	test.describe('Connection: Stability and recovery', () => {
		test('should handle temporary disconnection gracefully', async ({ page, context }) => {
			// Given: Player in lobby
			const roomCode = await createTestSession(page);
			const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
			await page.waitForTimeout(500);

			// When: Network briefly disconnects and reconnects
			// (Simulated by page reload which re-establishes WebSocket)
			await alicePage.reload();
			await alicePage.waitForTimeout(1000);

			// Then: Player should see current lobby state
			await expect(alicePage.locator('[data-team="SendWave"]')).toHaveAttribute(
				'data-occupied',
				'true'
			);
			await expect(alicePage.locator('text=Alice')).toBeVisible();

			await closePages(page, alicePage);
		});

		test('should reconnect and receive pending updates', async ({ page, context }) => {
			// Given: Two players in lobby
			const roomCode = await createTestSession(page);
			const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
			await page.waitForTimeout(500);

			// When: Bob joins while Alice temporarily disconnected (simulated)
			const bobPage = await addPlayer(context, roomCode, 'Bob', 'ESP', 'MailMonkey');
			await page.waitForTimeout(500);

			// Then: When Alice reconnects (reload), she sees Bob
			await alicePage.reload();
			await alicePage.waitForTimeout(1000);

			await expect(alicePage.locator('[data-team="MailMonkey"]')).toHaveAttribute(
				'data-occupied',
				'true'
			);
			await expect(alicePage.locator('text=Bob')).toBeVisible();

			await closePages(page, alicePage, bobPage);
		});
	});

	// ============================================================================
	// MESSAGE ROUTING
	// ============================================================================

	test.describe('Message: Routing and filtering', () => {
		test('should route room-specific updates only to correct room', async ({ page, context }) => {
			// Given: Two separate game sessions
			const roomCode1 = await createTestSession(page);
			const alicePage = await addPlayer(context, roomCode1, 'Alice', 'ESP', 'SendWave');

			const facilitator2Page = await context.newPage();
			const roomCode2 = await createTestSession(facilitator2Page);
			const bobPage = await addPlayer(context, roomCode2, 'Bob', 'ESP', 'SendWave');

			await page.waitForTimeout(500);

			// When: Charlie joins room 1
			const charliePage = await addPlayer(context, roomCode1, 'Charlie', 'ESP', 'MailMonkey');
			await page.waitForTimeout(500);

			// Then: Room 1 clients see Charlie
			await expect(page.locator('text=Charlie')).toBeVisible();
			await expect(alicePage.locator('text=Charlie')).toBeVisible();

			// And: Room 2 clients do NOT see Charlie
			await expect(bobPage.locator('text=Charlie')).not.toBeVisible();

			await closePages(page, facilitator2Page, alicePage, bobPage, charliePage);
		});

		test('should handle rapid sequential updates without message loss', async ({
			page,
			context
		}) => {
			// Given: Facilitator in lobby
			const roomCode = await createTestSession(page);

			// When: Three players join in rapid succession
			const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
			const bobPage = await addPlayer(context, roomCode, 'Bob', 'ESP', 'MailMonkey');
			const charliePage = await addPlayer(context, roomCode, 'Charlie', 'ESP', 'BluePost');

			await page.waitForTimeout(1000); // Allow all updates to propagate

			// Then: Facilitator sees all three players
			await expect(page.locator('text=Alice')).toBeVisible();
			await expect(page.locator('text=Bob')).toBeVisible();
			await expect(page.locator('text=Charlie')).toBeVisible();

			// And: Final count is correct
			await expect(page.locator('text=ESP Teams: 3/5')).toBeVisible();

			await closePages(page, alicePage, bobPage, charliePage);
		});
	});

	// ============================================================================
	// PERFORMANCE & RELIABILITY
	// ============================================================================

	test.describe('Performance: Update latency and throughput', () => {
		test('should propagate updates within reasonable time (<2 seconds)', async ({
			page,
			context
		}) => {
			// Given: Facilitator and Alice in lobby
			const roomCode = await createTestSession(page);
			const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');

			// When: Bob joins
			const startTime = Date.now();
			const bobPage = await addPlayer(context, roomCode, 'Bob', 'ESP', 'MailMonkey');

			// Then: Alice sees Bob within 2 seconds
			await expect(alicePage.locator('text=Bob')).toBeVisible({ timeout: 2000 });
			const endTime = Date.now();
			const latency = endTime - startTime;

			// Verify reasonable latency (should be well under 2 seconds in practice)
			expect(latency).toBeLessThan(2000);

			await closePages(page, alicePage, bobPage);
		});

		test('should handle multiple simultaneous connections without issues', async ({
			page,
			context
		}) => {
			// Given: A game session
			const roomCode = await createTestSession(page);

			// When: Five players join (maximum ESP capacity)
			const players = await Promise.all([
				addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave'),
				addPlayer(context, roomCode, 'Bob', 'ESP', 'MailMonkey'),
				addPlayer(context, roomCode, 'Charlie', 'ESP', 'BluePost'),
				addPlayer(context, roomCode, 'David', 'ESP', 'SendBolt'),
				addPlayer(context, roomCode, 'Evan', 'ESP', 'RocketMail')
			]);

			await page.waitForTimeout(1000);

			// Then: Facilitator sees all five players
			await expect(page.locator('text=Alice')).toBeVisible();
			await expect(page.locator('text=Bob')).toBeVisible();
			await expect(page.locator('text=Charlie')).toBeVisible();
			await expect(page.locator('text=David')).toBeVisible();
			await expect(page.locator('text=Evan')).toBeVisible();

			// And: Count is correct
			await expect(page.locator('text=ESP Teams: 5/5')).toBeVisible();

			await closePages(page, ...players);
		});
	});
});
