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

describe('Resolution Manager - Iteration 2: Reputation-Based Delivery', () => {
	test('good reputation (75) → 85% delivery → revenue adjustment', async () => {
		// Given: ESP with reputation 75 (Good zone)
		const client = buildTestClient('premium_brand', { id: 'client-1' });
		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
					reputation: { Gmail: 75, Outlook: 75, Yahoo: 75 },
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

		// Then: Delivery success should be 85% for all destinations
		expect(results.espResults.SendWave.delivery.Gmail.zone).toBe('good');
		expect(results.espResults.SendWave.delivery.Gmail.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.delivery.Outlook.zone).toBe('good');
		expect(results.espResults.SendWave.delivery.Outlook.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.delivery.Yahoo.zone).toBe('good');
		expect(results.espResults.SendWave.delivery.Yahoo.finalRate).toBe(0.85);

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
					reputation: { Gmail: 40, Outlook: 40, Yahoo: 40 },
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

		// Then: Delivery success should be 50% for all destinations
		expect(results.espResults.SendWave.delivery.Gmail.zone).toBe('poor');
		expect(results.espResults.SendWave.delivery.Gmail.finalRate).toBe(0.5);
		expect(results.espResults.SendWave.delivery.Outlook.zone).toBe('poor');
		expect(results.espResults.SendWave.delivery.Outlook.finalRate).toBe(0.5);
		expect(results.espResults.SendWave.delivery.Yahoo.zone).toBe('poor');
		expect(results.espResults.SendWave.delivery.Yahoo.finalRate).toBe(0.5);

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
					reputation: { Gmail: 80, Outlook: 70, Yahoo: 60 },
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

		// Then: Each destination has its own delivery rate (Iteration 6)
		expect(results.espResults.SendWave.delivery.Gmail.zone).toBe('good'); // 80 rep
		expect(results.espResults.SendWave.delivery.Gmail.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.delivery.Outlook.zone).toBe('good'); // 70 rep
		expect(results.espResults.SendWave.delivery.Outlook.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.delivery.Yahoo.zone).toBe('warning'); // 60 rep
		expect(results.espResults.SendWave.delivery.Yahoo.finalRate).toBe(0.7);

		// Then: Aggregate delivery rate is volume-weighted
		// Gmail: 15000 * 0.85 = 12750, Outlook: 9000 * 0.85 = 7650, Yahoo: 6000 * 0.7 = 4200
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
					reputation: { Gmail: 85, Outlook: 85, Yahoo: 85 }, // Good zone
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
					reputation: { Gmail: 45, Outlook: 45, Yahoo: 45 }, // Poor zone
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

		// Then: SendWave has 85% delivery (Good zone) for all destinations
		expect(results.espResults.SendWave.delivery.Gmail.zone).toBe('good');
		expect(results.espResults.SendWave.delivery.Gmail.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.delivery.Outlook.zone).toBe('good');
		expect(results.espResults.SendWave.delivery.Outlook.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.delivery.Yahoo.zone).toBe('good');
		expect(results.espResults.SendWave.delivery.Yahoo.finalRate).toBe(0.85);
		expect(results.espResults.SendWave.aggregateDeliveryRate).toBe(0.85);
		expect(results.espResults.SendWave.revenue.actualRevenue).toBe(298); // Math.round(350 * 0.85)

		// Then: MailMonkey has 50% delivery (Poor zone) for all destinations
		expect(results.espResults.MailMonkey.delivery.Gmail.zone).toBe('poor');
		expect(results.espResults.MailMonkey.delivery.Gmail.finalRate).toBe(0.5);
		expect(results.espResults.MailMonkey.delivery.Outlook.zone).toBe('poor');
		expect(results.espResults.MailMonkey.delivery.Outlook.finalRate).toBe(0.5);
		expect(results.espResults.MailMonkey.delivery.Yahoo.zone).toBe('poor');
		expect(results.espResults.MailMonkey.delivery.Yahoo.finalRate).toBe(0.5);
		expect(results.espResults.MailMonkey.aggregateDeliveryRate).toBe(0.5);
		expect(results.espResults.MailMonkey.revenue.actualRevenue).toBe(75); // 150 * 0.50
	});
});

describe('Resolution Manager - Iteration 6: Per-Destination Filtering', () => {
	test('per-destination delivery calculated independently with same filtering', async () => {
		// Given: ESP with different reputation per destination, moderate filtering everywhere
		const client = buildTestClient('premium_brand', { id: 'client-1' });
		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
					reputation: { Gmail: 85, Outlook: 70, Yahoo: 60 }, // Good/Good/Warning zones
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

		// Set moderate filtering (3% false positives) for SendWave at all destinations
		session.destinations.forEach((dest) => {
			dest.filtering_policies['SendWave'] = {
				espName: 'SendWave',
				level: 'moderate',
				spamReduction: 35,
				falsePositives: 3
			};
		});

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: Gmail delivery = 85% base - 3% filtering = 82%
		expect(results.espResults.SendWave.delivery.Gmail.zone).toBe('good');
		expect(results.espResults.SendWave.delivery.Gmail.finalRate).toBe(0.82); // 0.85 - 0.03
		expect(results.espResults.SendWave.delivery.Gmail.filteringPenalty).toBe(0.03);

		// Then: Outlook delivery = 85% base - 3% filtering = 82%
		expect(results.espResults.SendWave.delivery.Outlook.zone).toBe('good');
		expect(results.espResults.SendWave.delivery.Outlook.finalRate).toBe(0.82);
		expect(results.espResults.SendWave.delivery.Outlook.filteringPenalty).toBe(0.03);

		// Then: Yahoo delivery = 70% base - 3% filtering = 67%
		expect(results.espResults.SendWave.delivery.Yahoo.zone).toBe('warning');
		expect(results.espResults.SendWave.delivery.Yahoo.finalRate).toBeCloseTo(0.67, 2);
		expect(results.espResults.SendWave.delivery.Yahoo.filteringPenalty).toBe(0.03);

		// Then: Aggregate delivery rate is volume-weighted
		// Gmail: 15000 * 0.82 = 12300, Outlook: 9000 * 0.82 = 7380, Yahoo: 6000 * 0.67 = 4020
		// Total: (12300 + 7380 + 4020) / 30000 = 23700 / 30000 = 0.79
		expect(results.espResults.SendWave.aggregateDeliveryRate).toBeCloseTo(0.79, 2);
	});

	test('different filtering levels per destination', async () => {
		// Given: ESP with same reputation everywhere, but different filtering per destination
		const client = buildTestClient('premium_brand', { id: 'client-1' });
		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
					reputation: { Gmail: 80, Outlook: 80, Yahoo: 80 }, // Good zone everywhere
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

		// Set different filtering levels per destination
		session.destinations[0].filtering_policies['SendWave'] = {
			espName: 'SendWave',
			level: 'permissive',
			spamReduction: 0,
			falsePositives: 0
		}; // Gmail: 0%
		session.destinations[1].filtering_policies['SendWave'] = {
			espName: 'SendWave',
			level: 'strict',
			spamReduction: 65,
			falsePositives: 8
		}; // Outlook: 8%
		session.destinations[2].filtering_policies['SendWave'] = {
			espName: 'SendWave',
			level: 'maximum',
			spamReduction: 85,
			falsePositives: 15
		}; // Yahoo: 15%

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: Gmail no filtering penalty (permissive)
		expect(results.espResults.SendWave.delivery.Gmail.finalRate).toBe(0.85); // 0.85 - 0.0
		expect(results.espResults.SendWave.delivery.Gmail.filteringPenalty).toBeUndefined();

		// Then: Outlook strict filtering (8% penalty)
		expect(results.espResults.SendWave.delivery.Outlook.finalRate).toBeCloseTo(0.77, 2); // 0.85 - 0.08
		expect(results.espResults.SendWave.delivery.Outlook.filteringPenalty).toBe(0.08);

		// Then: Yahoo maximum filtering (15% penalty)
		expect(results.espResults.SendWave.delivery.Yahoo.finalRate).toBe(0.7); // 0.85 - 0.15
		expect(results.espResults.SendWave.delivery.Yahoo.filteringPenalty).toBe(0.15);

		// Then: Aggregate delivery rate reflects different filtering
		// Gmail: 15000 * 0.85 = 12750, Outlook: 9000 * 0.77 = 6930, Yahoo: 6000 * 0.7 = 4200
		// Total: (12750 + 6930 + 4200) / 30000 = 23880 / 30000 = 0.796
		expect(results.espResults.SendWave.aggregateDeliveryRate).toBeCloseTo(0.796, 2);
	});

	test('filtering with multiple clients (volume distribution matters)', async () => {
		// Given: Two clients with different destination distributions
		const premium = buildTestClient('premium_brand', {
			id: 'client-1',
			destination_distribution: { Gmail: 60, Outlook: 30, Yahoo: 10 } // Heavy Gmail
		});
		const startup = buildTestClient('growing_startup', {
			id: 'client-2',
			destination_distribution: { Gmail: 30, Outlook: 40, Yahoo: 30 } // Balanced
		});

		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
					reputation: { Gmail: 80, Outlook: 80, Yahoo: 80 },
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

		// Moderate filtering everywhere
		session.destinations.forEach((dest) => {
			dest.filtering_policies['SendWave'] = {
				espName: 'SendWave',
				level: 'moderate',
				spamReduction: 35,
				falsePositives: 3
			};
		});

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: All destinations have same delivery rate (same rep + filtering)
		expect(results.espResults.SendWave.delivery.Gmail.finalRate).toBe(0.82); // 0.85 - 0.03
		expect(results.espResults.SendWave.delivery.Outlook.finalRate).toBe(0.82);
		expect(results.espResults.SendWave.delivery.Yahoo.finalRate).toBe(0.82);

		// Then: Volume correctly distributed per destination
		// Premium: 30000 total, 60% Gmail = 18000, 30% Outlook = 9000, 10% Yahoo = 3000
		// Startup: 35000 total, 30% Gmail = 10500, 40% Outlook = 14000, 30% Yahoo = 10500
		// Totals: Gmail = 28500, Outlook = 23000, Yahoo = 13500
		expect(results.espResults.SendWave.volume.perDestination.Gmail).toBe(28500);
		expect(results.espResults.SendWave.volume.perDestination.Outlook).toBe(23000);
		expect(results.espResults.SendWave.volume.perDestination.Yahoo).toBe(13500);

		// Then: Aggregate is 82% (all destinations same rate, so volume weights don't matter)
		expect(results.espResults.SendWave.aggregateDeliveryRate).toBe(0.82);
	});

	test('filtering only affects specific ESP (other ESPs unaffected)', async () => {
		// Given: Two ESP teams, only one has filtering applied
		const team1Client = buildTestClient('premium_brand', { id: 'sw-client-1' });
		const team2Client = buildTestClient('re_engagement', { id: 'mm-client-1' });

		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
					reputation: { Gmail: 80, Outlook: 80, Yahoo: 80 },
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
					reputation: { Gmail: 80, Outlook: 80, Yahoo: 80 },
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

		// Only SendWave has filtering at Gmail
		session.destinations[0].filtering_policies['SendWave'] = {
			espName: 'SendWave',
			level: 'strict',
			spamReduction: 65,
			falsePositives: 8
		}; // Gmail: 8%

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: SendWave has filtering penalty at Gmail only
		expect(results.espResults.SendWave.delivery.Gmail.finalRate).toBeCloseTo(0.77, 2); // 0.85 - 0.08
		expect(results.espResults.SendWave.delivery.Outlook.finalRate).toBe(0.85); // No filtering
		expect(results.espResults.SendWave.delivery.Yahoo.finalRate).toBe(0.85); // No filtering

		// Then: MailMonkey has no filtering anywhere (permissive by default)
		expect(results.espResults.MailMonkey.delivery.Gmail.finalRate).toBe(0.85);
		expect(results.espResults.MailMonkey.delivery.Outlook.finalRate).toBe(0.85);
		expect(results.espResults.MailMonkey.delivery.Yahoo.finalRate).toBe(0.85);
		expect(results.espResults.MailMonkey.aggregateDeliveryRate).toBe(0.85);
	});
});
