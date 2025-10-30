/**
 * Playwright Fixtures for Common Game States
 *
 * Provides reusable test fixtures to reduce setup boilerplate
 */

import { test as base, Page, BrowserContext } from '@playwright/test';
import {
	createTestSession,
	addPlayer,
	createSessionWithMinimumPlayers,
	createGameInPlanningPhase,
	createGameWithDestinationPlayer
} from './helpers/game-setup';

export interface GameSessionFixture {
	facilitatorPage: Page;
	roomCode: string;
}

export interface MinimumPlayersFixture extends GameSessionFixture {
	alicePage: Page;
	bobPage: Page;
	charliePage: Page;
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

type GameFixtures = {
	gameSession: GameSessionFixture;
	minimumPlayers: MinimumPlayersFixture;
	planningPhase: PlanningPhaseFixture;
	destinationGame: DestinationGameFixture;
};

/**
 * Extended test with game state fixtures
 *
 * Usage:
 * test('my test', async ({ planningPhase }) => {
 *   const { alicePage, bobPage, roomCode } = planningPhase;
 *   // Test logic here
 * });
 */
export const test = base.extend<GameFixtures>({
	/**
	 * Fixture: Basic game session with facilitator
	 */
	gameSession: async ({ page, context }, use) => {
		const roomCode = await createTestSession(page);
		await use({ facilitatorPage: page, roomCode });
		// Cleanup happens automatically when pages close
	},

	/**
	 * Fixture: Session with minimum players (3 ESP players)
	 */
	minimumPlayers: async ({ page, context }, use) => {
		const { facilitatorPage, alicePage, bobPage, charliePage, roomCode } =
			await createSessionWithMinimumPlayers(page, context);

		await use({
			facilitatorPage,
			alicePage,
			bobPage,
			charliePage,
			roomCode
		});

		// Cleanup
		await alicePage.close();
		await bobPage.close();
		await charliePage.close();
	},

	/**
	 * Fixture: Game in planning phase with 2 ESP players
	 */
	planningPhase: async ({ page, context }, use) => {
		const { facilitatorPage, alicePage, bobPage, roomCode } = await createGameInPlanningPhase(
			page,
			context
		);

		await use({
			facilitatorPage,
			alicePage,
			bobPage,
			roomCode
		});

		// Cleanup
		await alicePage.close();
		await bobPage.close();
	},

	/**
	 * Fixture: Game with destination player (Gmail) and ESP players
	 */
	destinationGame: async ({ page, context }, use) => {
		const { facilitatorPage, gmailPage, alicePage, bobPage, roomCode } =
			await createGameWithDestinationPlayer(page, context);

		await use({
			facilitatorPage,
			gmailPage,
			alicePage,
			bobPage,
			roomCode
		});

		// Cleanup
		await gmailPage.close();
		await alicePage.close();
		await bobPage.close();
	}
});

export { expect } from '@playwright/test';
