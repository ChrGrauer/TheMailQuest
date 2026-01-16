/**
 * Phase Transition Helpers
 *
 * Helpers for managing game phase transitions in E2E tests.
 * Extracted from individual test files to eliminate duplication.
 */
import { expect, type Page, type BrowserContext } from '@playwright/test';
import { createGameInPlanningPhase } from './game-setup';
import { advanceToRound, lockInAllPlayers } from './e2e-actions';

/**
 * Transition a game from planning phase to consequences phase
 * by locking in all players and waiting for the phase change.
 *
 * @param facilitatorPage - The facilitator's page
 * @param playerPages - Array of player pages to lock in
 */
export async function transitionToConsequencesPhase(
	facilitatorPage: Page,
	playerPages: Page[]
): Promise<void> {
	// Lock in all players
	for (const playerPage of playerPages) {
		const lockInButton = playerPage.locator('[data-testid="lock-in-button"]');
		if (await lockInButton.isVisible()) {
			await lockInButton.click();
			await playerPage.waitForTimeout(300);
		}
	}

	// Wait for resolution and consequences phase
	await facilitatorPage.waitForTimeout(1500);

	// Verify we're in consequences phase
	await expect(facilitatorPage.locator('[data-testid="current-phase"]')).toContainText(
		'consequences',
		{ timeout: 5000 }
	);
}

/**
 * Create a game and advance to a specific round's consequences phase.
 * Sets up minimum required players and advances through previous rounds.
 *
 * @param facilitatorPage - The facilitator's page
 * @param context - Browser context for creating player pages
 * @param targetRound - The round to advance to (1-4)
 * @returns Object containing roomCode and player pages
 */
export async function createGameInRoundConsequences(
	facilitatorPage: Page,
	context: BrowserContext,
	targetRound: number
): Promise<{
	roomCode: string;
	alicePage: Page;
	bobPage: Page;
}> {
	const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(
		facilitatorPage,
		context
	);

	// Advance to target round if needed
	if (targetRound > 1) {
		await advanceToRound(facilitatorPage, [alicePage, bobPage], targetRound);
	}

	// Lock in players to reach consequences phase
	await lockInAllPlayers([alicePage, bobPage]);

	// Wait for consequences phase
	await expect(facilitatorPage.getByTestId('current-phase')).toContainText('Consequences Phase', {
		timeout: 10000
	});

	return { roomCode, alicePage, bobPage };
}

/**
 * Create a game in Round 4 consequences phase.
 * Convenience wrapper for createGameInRoundConsequences(page, context, 4).
 *
 * @param facilitatorPage - The facilitator's page
 * @param context - Browser context for creating player pages
 * @returns Object containing roomCode and player pages
 */
export async function createGameInRound4Consequences(
	facilitatorPage: Page,
	context: BrowserContext
): Promise<{
	roomCode: string;
	alicePage: Page;
	bobPage: Page;
}> {
	return createGameInRoundConsequences(facilitatorPage, context, 4);
}
