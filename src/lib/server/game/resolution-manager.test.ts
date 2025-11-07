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

		// Then: Volume, delivery, and revenue calculated correctly
		expect(results.espResults.SendWave).toBeDefined();
		expect(results.espResults.SendWave.volume.totalVolume).toBe(30000);
		expect(results.espResults.SendWave.delivery).toBeDefined();
		expect(results.espResults.SendWave.delivery.finalRate).toBe(0.85); // Good zone (reputation 70)
		expect(results.espResults.SendWave.revenue.baseRevenue).toBe(350);
		expect(results.espResults.SendWave.revenue.actualRevenue).toBe(297.5); // 350 * 0.85
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

		// Then: Volume, delivery, and revenue summed correctly
		expect(results.espResults.SendWave.volume.totalVolume).toBe(65000); // 30K + 35K
		expect(results.espResults.SendWave.delivery.finalRate).toBe(0.85); // Good zone (reputation 70)
		expect(results.espResults.SendWave.revenue.baseRevenue).toBe(530); // 350 + 180
		expect(results.espResults.SendWave.revenue.actualRevenue).toBe(450.5); // 530 * 0.85
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
		expect(results.espResults.SendWave.delivery.finalRate).toBe(0.85); // Good zone
		expect(results.espResults.SendWave.revenue.baseRevenue).toBe(530); // 350 + 180 (excludes 350)
		expect(results.espResults.SendWave.revenue.actualRevenue).toBe(450.5); // 530 * 0.85
		expect(results.espResults.SendWave.volume.activeClients).toHaveLength(2);
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

		// Then: Both teams calculated independently
		expect(results.espResults.SendWave.volume.totalVolume).toBe(30000);
		expect(results.espResults.SendWave.delivery.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.revenue.baseRevenue).toBe(350);
		expect(results.espResults.SendWave.revenue.actualRevenue).toBe(297.5); // 350 * 0.85

		expect(results.espResults.MailMonkey.volume.totalVolume).toBe(50000);
		expect(results.espResults.MailMonkey.delivery.finalRate).toBe(0.85);
		expect(results.espResults.MailMonkey.revenue.baseRevenue).toBe(150);
		expect(results.espResults.MailMonkey.revenue.actualRevenue).toBe(127.5); // 150 * 0.85
	});
});

describe('Resolution Manager - Iteration 2: Reputation-Based Delivery', () => {
	test('good reputation (75) → 85% delivery → revenue adjustment', async () => {
		// Given: ESP with reputation 75 (Good zone)
		const client = buildTestClient('premium_brand', { id: 'client-1' });
		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
					reputation: { gmail: 75, outlook: 75, yahoo: 75 },
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

		// Then: Delivery success should be 85%
		expect(results.espResults.SendWave.delivery.zone).toBe('good');
		expect(results.espResults.SendWave.delivery.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.revenue.baseRevenue).toBe(350);
		expect(results.espResults.SendWave.revenue.actualRevenue).toBe(297.5); // 350 × 0.85
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
					reputation: { gmail: 40, outlook: 40, yahoo: 40 },
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

		// Then: Delivery success should be 50%
		expect(results.espResults.SendWave.delivery.zone).toBe('poor');
		expect(results.espResults.SendWave.delivery.finalRate).toBe(0.5);
		expect(results.espResults.SendWave.revenue.baseRevenue).toBe(530); // 350 + 180
		expect(results.espResults.SendWave.revenue.actualRevenue).toBe(265); // 530 × 0.50
	});

	test('weighted reputation calculation (80/70/60) → 73 → good zone', async () => {
		// Given: ESP with different reputations across destinations
		const client = buildTestClient('premium_brand', { id: 'client-1' });
		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
					reputation: { gmail: 80, outlook: 70, yahoo: 60 },
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

		// Then: Weighted reputation should be 73 (Gmail 50%, Outlook 30%, Yahoo 20%)
		// 80*0.5 + 70*0.3 + 60*0.2 = 40 + 21 + 12 = 73
		expect(results.espResults.SendWave.delivery.zone).toBe('good');
		expect(results.espResults.SendWave.delivery.finalRate).toBe(0.85);
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
					reputation: { gmail: 85, outlook: 85, yahoo: 85 }, // Good zone
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
					reputation: { gmail: 45, outlook: 45, yahoo: 45 }, // Poor zone
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

		// Then: SendWave has 85% delivery (Good zone)
		expect(results.espResults.SendWave.delivery.zone).toBe('good');
		expect(results.espResults.SendWave.delivery.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.revenue.actualRevenue).toBe(297.5); // 350 * 0.85

		// Then: MailMonkey has 50% delivery (Poor zone)
		expect(results.espResults.MailMonkey.delivery.zone).toBe('poor');
		expect(results.espResults.MailMonkey.delivery.finalRate).toBe(0.5);
		expect(results.espResults.MailMonkey.revenue.actualRevenue).toBe(75); // 150 * 0.50
	});
});
