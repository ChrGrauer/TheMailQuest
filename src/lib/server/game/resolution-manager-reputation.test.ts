/**
 * Resolution Manager Integration Tests
 * US 3.3: Resolution Phase Automation - Iterations 1-2
 * ATDD: Test-first approach for integration
 */

import { describe, test, expect } from 'vitest';
import { executeResolution } from './resolution-manager';
import { buildTestSession, buildTestTeam } from './test-helpers/game-session-builder';
import { buildTestClient } from './test-helpers/client-test-fixtures';

describe('Resolution Manager - Iteration 2: Reputation-Based Delivery', () => {
	test('good reputation (75) → 85% delivery → revenue adjustment', async () => {
		// Given: ESP with reputation 75 (Good zone)
		const client = buildTestClient('premium_brand', { id: 'client-1' });
		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
					reputation: { zmail: 75, intake: 75, yagle: 75 },
					clients: [client],
					clientStates: {
						'client-1': {
							status: 'Active',
							first_active_round: null,
							volumeModifiers: [],
							spamTrapModifiers: []
						}
					}
				}
			]
		});

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: Delivery success should be 85% for all destinations
		expect(results.espResults.SendWave.delivery.zmail.zone).toBe('good');
		expect(results.espResults.SendWave.delivery.zmail.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.delivery.intake.zone).toBe('good');
		expect(results.espResults.SendWave.delivery.intake.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.delivery.yagle.zone).toBe('good');
		expect(results.espResults.SendWave.delivery.yagle.finalRate).toBe(0.85);

		// Then: Aggregate delivery rate and revenue
		expect(results.espResults.SendWave.aggregateDeliveryRate).toBe(0.85);
		expect(results.espResults.SendWave.revenue.baseRevenue).toBe(350);
		expect(results.espResults.SendWave.revenue.actualRevenue).toBe(298); // Math.round(350 × 0.85)
	});

	test('poor reputation (40) → 50% delivery → revenue adjustment', async () => {
		// Given: ESP with reputation 40 (Poor zone)
		const premium = buildTestClient('premium_brand', { id: 'client-1' });
		const startup = buildTestClient('growing_startup', { id: 'client-2' });
		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
					reputation: { zmail: 40, intake: 40, yagle: 40 },
					clients: [premium, startup],
					clientStates: {
						'client-1': {
							status: 'Active',
							first_active_round: null,
							volumeModifiers: [],
							spamTrapModifiers: []
						},
						'client-2': {
							status: 'Active',
							first_active_round: null,
							volumeModifiers: [],
							spamTrapModifiers: []
						}
					}
				}
			]
		});

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: Delivery success should be 50% for all destinations
		expect(results.espResults.SendWave.delivery.zmail.zone).toBe('poor');
		expect(results.espResults.SendWave.delivery.zmail.finalRate).toBe(0.5);
		expect(results.espResults.SendWave.delivery.intake.zone).toBe('poor');
		expect(results.espResults.SendWave.delivery.intake.finalRate).toBe(0.5);
		expect(results.espResults.SendWave.delivery.yagle.zone).toBe('poor');
		expect(results.espResults.SendWave.delivery.yagle.finalRate).toBe(0.5);

		// Then: Aggregate delivery rate and revenue
		expect(results.espResults.SendWave.aggregateDeliveryRate).toBe(0.5);
		expect(results.espResults.SendWave.revenue.baseRevenue).toBe(530); // 350 + 180
		expect(results.espResults.SendWave.revenue.actualRevenue).toBe(265); // 530 × 0.50
	});

	test('per-destination reputation (80/70/60) → different delivery rates', async () => {
		// Given: ESP with different reputations across destinations
		const client = buildTestClient('premium_brand', { id: 'client-1' });
		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
					reputation: { zmail: 80, intake: 70, yagle: 60 },
					clients: [client],
					clientStates: {
						'client-1': {
							status: 'Active',
							first_active_round: null,
							volumeModifiers: [],
							spamTrapModifiers: []
						}
					}
				}
			]
		});

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: Each destination has its own delivery rate (Iteration 6)
		expect(results.espResults.SendWave.delivery.zmail.zone).toBe('good'); // 80 rep
		expect(results.espResults.SendWave.delivery.zmail.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.delivery.intake.zone).toBe('good'); // 70 rep
		expect(results.espResults.SendWave.delivery.intake.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.delivery.yagle.zone).toBe('warning'); // 60 rep
		expect(results.espResults.SendWave.delivery.yagle.finalRate).toBe(0.7);

		// Then: Aggregate delivery rate is volume-weighted
		// zmail: 15000 * 0.85 = 12750, intake: 9000 * 0.85 = 7650, yagle: 6000 * 0.7 = 4200
		// Total: (12750 + 7650 + 4200) / 30000 = 24600 / 30000 = 0.82
		expect(results.espResults.SendWave.aggregateDeliveryRate).toBe(0.82);
	});

	test('multiple teams with different reputations', async () => {
		// Given: Two ESP teams with different reputations
		const team1Client = buildTestClient('premium_brand', { id: 'sw-client-1' });
		const team2Client = buildTestClient('re_engagement', { id: 'mm-client-1' });

		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
					reputation: { zmail: 85, intake: 85, yagle: 85 }, // Good zone
					clients: [team1Client],
					clientStates: {
						'sw-client-1': {
							status: 'Active',
							first_active_round: null,
							volumeModifiers: [],
							spamTrapModifiers: []
						}
					}
				},
				{
					name: 'MailMonkey',
					reputation: { zmail: 45, intake: 45, yagle: 45 }, // Poor zone
					clients: [team2Client],
					clientStates: {
						'mm-client-1': {
							status: 'Active',
							first_active_round: null,
							volumeModifiers: [],
							spamTrapModifiers: []
						}
					}
				}
			]
		});

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: SendWave has 85% delivery (Good zone) for all destinations
		expect(results.espResults.SendWave.delivery.zmail.zone).toBe('good');
		expect(results.espResults.SendWave.delivery.zmail.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.delivery.intake.zone).toBe('good');
		expect(results.espResults.SendWave.delivery.intake.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.delivery.yagle.zone).toBe('good');
		expect(results.espResults.SendWave.delivery.yagle.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.aggregateDeliveryRate).toBe(0.85);
		expect(results.espResults.SendWave.revenue.actualRevenue).toBe(298); // Math.round(350 * 0.85)

		// Then: MailMonkey has 50% delivery (Poor zone) for all destinations
		expect(results.espResults.MailMonkey.delivery.zmail.zone).toBe('poor');
		expect(results.espResults.MailMonkey.delivery.zmail.finalRate).toBe(0.5);
		expect(results.espResults.MailMonkey.delivery.intake.zone).toBe('poor');
		expect(results.espResults.MailMonkey.delivery.intake.finalRate).toBe(0.5);
		expect(results.espResults.MailMonkey.delivery.yagle.zone).toBe('poor');
		expect(results.espResults.MailMonkey.delivery.yagle.finalRate).toBe(0.5);
		expect(results.espResults.MailMonkey.aggregateDeliveryRate).toBe(0.5);
		expect(results.espResults.MailMonkey.revenue.actualRevenue).toBe(75); // 150 * 0.50
	});
});
