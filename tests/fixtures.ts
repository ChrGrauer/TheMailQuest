/**
 * Playwright Fixtures for Common Game States
 *
 * Provides reusable test fixtures to reduce setup boilerplate.
 * Use these instead of calling helpers directly for cleaner tests.
 *
 * Usage:
 *   import { test, expect } from '../fixtures';
 *   test('my test', async ({ planningPhase }) => {
 *     const { alicePage, bobPage, roomCode, facilitatorPage } = planningPhase;
 *     // Test logic here - cleanup is automatic
 *   });
 */

import { test as base } from '@playwright/test';
import type { Page, BrowserContext } from '@playwright/test';
import {
	createTestSession,
	addPlayer,
	createSessionWithMinimumPlayers,
	createGameInPlanningPhase,
	createGameWithDestinationPlayer,
	closePages
} from './helpers/game-setup';
import { createGameInRound4Consequences } from './helpers/phase-transitions';

// ============================================================================
// Type Definitions
// ============================================================================

export interface GameSessionFixture {
	facilitatorPage: Page;
	roomCode: string;
}

export interface MinimumPlayersFixture extends GameSessionFixture {
	alicePage: Page;
	bobPage: Page;
}

export interface PlanningPhaseFixture {
	facilitatorPage: Page;
	alicePage: Page;
	bobPage: Page;
	roomCode: string;
}

export interface DestinationGameFixture {
	facilitatorPage: Page;
	gmailPage: Page;
	alicePage: Page;
	bobPage: Page;
	roomCode: string;
}

export interface Round4ConsequencesFixture {
	facilitatorPage: Page;
	alicePage: Page;
	bobPage: Page;
	roomCode: string;
}

export interface MultipleDestinationsFixture {
	facilitatorPage: Page;
	alicePage: Page;
	gmailPage: Page;
	yahooPage: Page;
	roomCode: string;
}

type GameFixtures = {
	gameSession: GameSessionFixture;
	minimumPlayers: MinimumPlayersFixture;
	planningPhase: PlanningPhaseFixture;
	destinationGame: DestinationGameFixture;
	round4Consequences: Round4ConsequencesFixture;
	multipleDestinations: MultipleDestinationsFixture;
};

// ============================================================================
// Fixtures
// ============================================================================

/**
 * Extended test with game state fixtures
 *
 * Each fixture:
 * - Sets up a specific game state
 * - Provides all relevant page handles
 * - Cleans up automatically after the test
 */
export const test = base.extend<GameFixtures>({
	/**
	 * Fixture: Basic game session with facilitator only
	 * Use for: Testing facilitator-only features, lobby behavior
	 */
	gameSession: async ({ page }, use) => {
		const roomCode = await createTestSession(page);
		await use({ facilitatorPage: page, roomCode });
		// No additional cleanup needed - page is managed by Playwright
	},

	/**
	 * Fixture: Session with minimum players (1 ESP + 1 Destination)
	 * Use for: Basic multiplayer setup before game start
	 */
	minimumPlayers: async ({ page, context }, use) => {
		const { roomCode, alicePage, bobPage } = await createSessionWithMinimumPlayers(page, context);

		await use({
			facilitatorPage: page,
			alicePage,
			bobPage,
			roomCode
		});

		// Cleanup
		await closePages(alicePage, bobPage);
	},

	/**
	 * Fixture: Game in planning phase with 2 players (1 ESP Alice, 1 Destination Bob)
	 * Use for: Most ESP dashboard tests, client acquisition, budget tests
	 */
	planningPhase: async ({ page, context }, use) => {
		const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);

		await use({
			facilitatorPage: page,
			alicePage,
			bobPage,
			roomCode
		});

		// Cleanup
		await closePages(alicePage, bobPage);
	},

	/**
	 * Fixture: Game with destination player (Gmail) and 2 ESP players
	 * Use for: Destination dashboard tests, filtering tests, resolution data tests
	 */
	destinationGame: async ({ page, context }, use) => {
		const { roomCode, gmailPage, alicePage, bobPage } = await createGameWithDestinationPlayer(
			page,
			context
		);

		await use({
			facilitatorPage: page,
			gmailPage,
			alicePage,
			bobPage,
			roomCode
		});

		// Cleanup
		await closePages(gmailPage, alicePage, bobPage);
	},

	/**
	 * Fixture: Game in Round 4 consequences phase
	 * Use for: Victory screen tests, final score calculation tests
	 * Note: This is an expensive fixture (~15s setup) - combine assertions when possible
	 */
	round4Consequences: async ({ page, context }, use) => {
		const { roomCode, alicePage, bobPage } = await createGameInRound4Consequences(page, context);

		await use({
			facilitatorPage: page,
			alicePage,
			bobPage,
			roomCode
		});

		// Cleanup
		await closePages(alicePage, bobPage);
	},

	/**
	 * Fixture: Game with multiple destination players (Gmail + Yahoo)
	 * Use for: Tests requiring multiple destinations to compare consequences
	 */
	multipleDestinations: async ({ page, context }, use) => {
		const roomCode = await createTestSession(page);
		const alicePage = await addPlayer(context, roomCode, 'Alice', 'ESP', 'SendWave');
		const gmailPage = await addPlayer(context, roomCode, 'Carol', 'Destination', 'Gmail');
		const yahooPage = await addPlayer(context, roomCode, 'Diana', 'Destination', 'Yahoo');
		await page.waitForTimeout(500);

		// Start game
		await page.getByRole('button', { name: /start game/i }).click();

		// Wait for destinations to load
		await gmailPage.waitForURL(`/game/${roomCode}/destination/gmail`, { timeout: 10000 });
		await yahooPage.waitForURL(`/game/${roomCode}/destination/yahoo`, { timeout: 10000 });

		await use({
			facilitatorPage: page,
			alicePage,
			gmailPage,
			yahooPage,
			roomCode
		});

		// Cleanup
		await closePages(alicePage, gmailPage, yahooPage);
	}
});

export { expect } from '@playwright/test';
export type { Page, BrowserContext } from '@playwright/test';
