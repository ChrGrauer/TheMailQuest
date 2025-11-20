/**
 * Resolution Manager Integration Tests
 * US 3.3: Resolution Phase Automation - Iterations 1-2
 * ATDD: Test-first approach for integration
 */

import { describe, test, expect } from 'vitest';
import { executeResolution } from './resolution-manager';
import { buildTestSession, buildTestTeam } from './test-helpers/game-session-builder';
import { buildTestClient } from './test-helpers/client-test-fixtures';

describe('Resolution Manager - Iteration 1: Basic Volume & Revenue', () => {
	test('complete resolution for single ESP with one client', async () => {
		// Given: ESP with single premium_brand client
		const client = buildTestClient('premium_brand', { id: 'client-1' });
		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
					clients: [client],
					clientStates: {
						'client-1': {
							status: 'Active',
							has_warmup: false,
							has_list_hygiene: false,
							first_active_round: null
						}
					}
				}
			]
		});

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: Volume calculated correctly
		expect(results.espResults.SendWave).toBeDefined();
		expect(results.espResults.SendWave.volume.totalVolume).toBe(30000);

		// Then: Per-destination delivery calculated (Iteration 6)
		expect(results.espResults.SendWave.delivery).toBeDefined();
		expect(results.espResults.SendWave.delivery.Gmail.finalRate).toBe(0.85); // Good zone (reputation 70)
		expect(results.espResults.SendWave.delivery.Outlook.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.delivery.Yahoo.finalRate).toBe(0.85);

		// Then: Aggregate delivery rate and revenue calculated correctly
		expect(results.espResults.SendWave.aggregateDeliveryRate).toBe(0.85);
		expect(results.espResults.SendWave.revenue.baseRevenue).toBe(350);
		expect(results.espResults.SendWave.revenue.actualRevenue).toBe(298); // Math.round(350 * 0.85)
	});

	test('complete resolution with multiple clients', async () => {
		// Given: ESP with multiple active clients
		const premium = buildTestClient('premium_brand', { id: 'client-1' });
		const startup = buildTestClient('growing_startup', { id: 'client-2' });

		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
					clients: [premium, startup],
					clientStates: {
						'client-1': {
							status: 'Active',
							has_warmup: false,
							has_list_hygiene: false,
							first_active_round: null
						},
						'client-2': {
							status: 'Active',
							has_warmup: false,
							has_list_hygiene: false,
							first_active_round: null
						}
					}
				}
			]
		});

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: Volume summed correctly
		expect(results.espResults.SendWave.volume.totalVolume).toBe(65000); // 30K + 35K

		// Then: Per-destination delivery calculated (Iteration 6)
		expect(results.espResults.SendWave.delivery.Gmail.finalRate).toBe(0.85); // Good zone (reputation 70)
		expect(results.espResults.SendWave.delivery.Outlook.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.delivery.Yahoo.finalRate).toBe(0.85);

		// Then: Aggregate delivery rate and revenue calculated correctly
		expect(results.espResults.SendWave.aggregateDeliveryRate).toBe(0.85);
		expect(results.espResults.SendWave.revenue.baseRevenue).toBe(530); // 350 + 180
		expect(results.espResults.SendWave.revenue.actualRevenue).toBe(451); // Math.round(530 * 0.85)
	});

	test('excludes paused clients properly', async () => {
		// Given: ESP with mix of active and paused clients
		const premium = buildTestClient('premium_brand', { id: 'client-1' });
		const aggressive = buildTestClient('aggressive_marketer', { id: 'client-2' });
		const startup = buildTestClient('growing_startup', { id: 'client-3' });

		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
					clients: [premium, aggressive, startup],
					clientStates: {
						'client-1': {
							status: 'Active',
							has_warmup: false,
							has_list_hygiene: false,
							first_active_round: null
						},
						'client-2': {
							status: 'Paused',
							has_warmup: false,
							has_list_hygiene: false,
							first_active_round: null
						},
						'client-3': {
							status: 'Active',
							has_warmup: false,
							has_list_hygiene: false,
							first_active_round: null
						}
					}
				}
			]
		});

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: Paused client excluded from calculations
		expect(results.espResults.SendWave.volume.totalVolume).toBe(65000); // 30K + 35K (excludes 80K)
		expect(results.espResults.SendWave.volume.activeClients).toHaveLength(2);

		// Then: Per-destination delivery calculated (Iteration 6)
		expect(results.espResults.SendWave.delivery.Gmail.finalRate).toBe(0.85); // Good zone
		expect(results.espResults.SendWave.delivery.Outlook.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.delivery.Yahoo.finalRate).toBe(0.85);

		// Then: Revenue calculated correctly
		expect(results.espResults.SendWave.aggregateDeliveryRate).toBe(0.85);
		expect(results.espResults.SendWave.revenue.baseRevenue).toBe(530); // 350 + 180 (excludes 350)
		expect(results.espResults.SendWave.revenue.actualRevenue).toBe(451); // Math.round(530 * 0.85)
	});

	test('handles multiple ESP teams independently', async () => {
		// Given: Two ESP teams with different clients
		const team1Client = buildTestClient('premium_brand', { id: 'sw-client-1' });
		const team2Client = buildTestClient('re_engagement', { id: 'mm-client-1' });

		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
					clients: [team1Client],
					clientStates: {
						'sw-client-1': {
							status: 'Active',
							has_warmup: false,
							has_list_hygiene: false,
							first_active_round: null
						}
					}
				},
				{
					name: 'MailMonkey',
					clients: [team2Client],
					clientStates: {
						'mm-client-1': {
							status: 'Active',
							has_warmup: false,
							has_list_hygiene: false,
							first_active_round: null
						}
					}
				}
			]
		});

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: SendWave calculated correctly
		expect(results.espResults.SendWave.volume.totalVolume).toBe(30000);
		expect(results.espResults.SendWave.delivery.Gmail.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.delivery.Outlook.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.delivery.Yahoo.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.aggregateDeliveryRate).toBe(0.85);
		expect(results.espResults.SendWave.revenue.baseRevenue).toBe(350);
		expect(results.espResults.SendWave.revenue.actualRevenue).toBe(298); // Math.round(350 * 0.85)

		// Then: MailMonkey calculated independently
		expect(results.espResults.MailMonkey.volume.totalVolume).toBe(50000);
		expect(results.espResults.MailMonkey.delivery.Gmail.finalRate).toBe(0.85);
		expect(results.espResults.MailMonkey.delivery.Outlook.finalRate).toBe(0.85);
		expect(results.espResults.MailMonkey.delivery.Yahoo.finalRate).toBe(0.85);
		expect(results.espResults.MailMonkey.aggregateDeliveryRate).toBe(0.85);
		expect(results.espResults.MailMonkey.revenue.baseRevenue).toBe(150);
		expect(results.espResults.MailMonkey.revenue.actualRevenue).toBe(128); // Math.round(150 * 0.85)
	});
});
