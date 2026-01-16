import { test, expect } from './fixtures';
import { createGameInPlanningPhase, closePages } from './helpers/game-setup';

test.describe('US-8.2-0.4: Facilitator Logic Fixes', () => {
    test('Destination lock-in status resets when starting next round', async ({ page, context }) => {
        // Given: the game is in round 1 planning
        const { roomCode, alicePage, bobPage } = await createGameInPlanningPhase(page, context);
        await page.goto(`/game/${roomCode}/facilitator`);

        // Lock in all players to reach consequences
        // Alice locks in
        await alicePage.locator('[data-testid="lock-in-button"]').click();
        // Bob locks in
        await bobPage.locator('[data-testid="lock-in-button"]').click();

        // Wait for consequences phase
        await expect(page.locator('[data-testid="current-phase"]')).toContainText('Consequences Phase', {
            timeout: 5000
        });

        // Verify Destination is shown as "Locked In" in the facilitator dashboard
        const destRow = page.locator('[data-testid="dest-row-Gmail"]'); // Bob is usually Gmail
        await expect(destRow.locator('text=Locked In')).toBeVisible();

        // When: Facilitator starts next round
        await page.locator('[data-testid="start-next-round-button"]').click();

        // Wait for planning phase
        await expect(page.locator('[data-testid="current-phase"]')).toContainText('planning', {
            timeout: 5000
        });

        // Then: Destination should be "Planning..." (not Locked In)
        await expect(destRow.locator('text=Planning...')).toBeVisible();
        await expect(destRow.locator('text=Locked In')).not.toBeVisible();

        await closePages(page, alicePage, bobPage);
    });
});
