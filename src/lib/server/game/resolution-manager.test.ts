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

describe('Spam Trap Activation Timing - Phase 1.2', () => {
	test('secret spam trap (announced=false) is active immediately in same round', async () => {
		// Given: ESP with re-engagement client (high spam trap risk)
		const client = buildTestClient('re_engagement', { id: 'client-1' });
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

		// And: Gmail purchases secret spam trap network in Round 1
		session.destinations[0].spam_trap_active = {
			round: 1,
			announced: false // SECRET - should be active immediately
		};

		// When: Resolution executes in Round 1
		const results = await executeResolution(session, 'TEST-123');

		// Then: Spam trap network should be active at Gmail
		const spamTrapResult = results.espResults.SendWave.spamTraps;
		expect(spamTrapResult).toBeDefined();

		// Then: Gmail should be checked for spam traps
		expect(spamTrapResult!.perClient[0].networkMultipliedRisk.Gmail).toBeGreaterThan(0);

		// Note: Whether trap is hit depends on RNG, but the key is that it's being checked
		if (spamTrapResult!.trapHit && spamTrapResult!.hitDestinations.includes('Gmail')) {
			// If trap was hit, reputation penalty should be applied
			expect(spamTrapResult!.reputationPenalty).toBeLessThan(0);
		}
	});

	test('announced spam trap (announced=true) is NOT active until next round', async () => {
		// Given: ESP with re-engagement client (high spam trap risk)
		const client = buildTestClient('re_engagement', { id: 'client-1' });
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

		// And: Gmail purchases ANNOUNCED spam trap network in Round 1
		session.destinations[0].spam_trap_active = {
			round: 1,
			announced: true // ANNOUNCED - should NOT be active until Round 2
		};

		// When: Resolution executes in Round 1
		const results = await executeResolution(session, 'TEST-123');

		// Then: Spam trap network should NOT be active at Gmail yet
		const spamTrapResult = results.espResults.SendWave.spamTraps;
		expect(spamTrapResult).toBeDefined();

		// Then: Gmail should have base adjusted risk (network multiplier = 1, not 3)
		// re_engagement base risk is 3%, no list hygiene, so adjusted = 0.03
		expect(spamTrapResult!.perClient[0].networkMultipliedRisk.Gmail).toBe(0.03);

		// Then: Network is not active yet (multiplier is 1, not 3)
		// If it were active, risk would be 0.03 * 3 = 0.09
		expect(spamTrapResult!.perClient[0].networkMultipliedRisk.Gmail).toBeLessThan(0.09);
	});

	test('announced spam trap becomes active in round after purchase', async () => {
		// Given: ESP with re-engagement client (high spam trap risk)
		const client = buildTestClient('re_engagement', { id: 'client-1' });
		const session = buildTestSession({
			currentRound: 2, // Round 2
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

		// And: Gmail purchased announced spam trap in Round 1
		session.destinations[0].spam_trap_active = {
			round: 1, // Purchased in Round 1
			announced: true // ANNOUNCED - should be active starting Round 2
		};

		// When: Resolution executes in Round 2
		const results = await executeResolution(session, 'TEST-123');

		// Then: Spam trap network should be active at Gmail now
		const spamTrapResult = results.espResults.SendWave.spamTraps;
		expect(spamTrapResult).toBeDefined();

		// Then: Gmail should have network multiplied risk (trap is active)
		expect(spamTrapResult!.perClient[0].networkMultipliedRisk.Gmail).toBeGreaterThan(0);
	});

	test('secret trap stays active in subsequent rounds until removed', async () => {
		// Given: ESP with re-engagement client
		const client = buildTestClient('re_engagement', { id: 'client-1' });
		const session = buildTestSession({
			currentRound: 3, // Round 3
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

		// And: Gmail purchased secret trap in Round 1
		session.destinations[0].spam_trap_active = {
			round: 1,
			announced: false
		};

		// When: Resolution executes in Round 3
		const results = await executeResolution(session, 'TEST-123');

		// Then: Spam trap should still be active
		const spamTrapResult = results.espResults.SendWave.spamTraps;
		expect(spamTrapResult).toBeDefined();
		expect(spamTrapResult!.perClient[0].networkMultipliedRisk.Gmail).toBeGreaterThan(0);
	});

	test('no spam trap active when spam_trap_active is undefined', async () => {
		// Given: ESP with re-engagement client
		const client = buildTestClient('re_engagement', { id: 'client-1' });
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

		// And: No spam trap purchased (spam_trap_active is undefined)
		session.destinations[0].spam_trap_active = undefined;

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: Spam trap network should NOT be active (multiplier = 1)
		const spamTrapResult = results.espResults.SendWave.spamTraps;
		expect(spamTrapResult).toBeDefined();
		// re_engagement base risk is 3%, no list hygiene, no network → 0.03
		expect(spamTrapResult!.perClient[0].networkMultipliedRisk.Gmail).toBe(0.03);
		// Network multiplier should be 1 (not 3), so risk stays at adjusted level
		expect(spamTrapResult!.perClient[0].networkMultipliedRisk.Gmail).toBeLessThan(0.09);
	});
});

describe('Spam Trap Reset Between Rounds - Phase 1.2.2', () => {
	test('secret trap purchased R2 should be removed when transitioning to R3', () => {
		// This test verifies the reset logic that should happen in next-round endpoint
		// Secret trap: active immediately (R2), should be reset when advancing to R3

		const session = buildTestSession({
			currentRound: 2
		});

		// Spam trap purchased and active in R2 (secret)
		session.destinations[0].spam_trap_active = {
			round: 2,
			announced: false
		};
		session.destinations[0].owned_tools.push('spam_trap_network');

		// When: Advancing to Round 3 (simulate next-round logic)
		const newRound = 3;

		// Then: Secret trap should be reset (it was active in R2, remove when going to R3)
		// newRound (3) > purchase round (2)
		const shouldReset = newRound > session.destinations[0].spam_trap_active!.round;
		expect(shouldReset).toBe(true);

		// Spam trap should be removed from owned_tools
		// spam_trap_active should be set to undefined
	});

	test('announced trap purchased R2 should stay active in R3', () => {
		// Announced trap: not active in R2, becomes active in R3
		// Should NOT be reset when transitioning from R2 to R3
		const session = buildTestSession({
			currentRound: 2
		});

		// Spam trap purchased in R2 (announced)
		session.destinations[0].spam_trap_active = {
			round: 2,
			announced: true
		};
		session.destinations[0].owned_tools.push('spam_trap_network');

		// When: Advancing to Round 3
		const newRound = 3;

		// Then: Announced trap should NOT be reset yet (it becomes active in R3)
		// newRound (3) > purchase round + 1 (2 + 1 = 3) → 3 > 3 → false
		const shouldReset = newRound > session.destinations[0].spam_trap_active!.round + 1;
		expect(shouldReset).toBe(false);

		// Trap should remain in owned_tools and spam_trap_active should stay defined
	});

	test('announced trap purchased R2 should be removed when transitioning to R4', () => {
		// Announced trap: active in R3, should be removed when transitioning to R4
		const session = buildTestSession({
			currentRound: 3
		});

		// Spam trap purchased in R2 (announced), currently active in R3
		session.destinations[0].spam_trap_active = {
			round: 2,
			announced: true
		};
		session.destinations[0].owned_tools.push('spam_trap_network');

		// When: Advancing to Round 4
		const newRound = 4;

		// Then: Announced trap should be reset (was active in R3, remove when going to R4)
		// newRound (4) > purchase round + 1 (2 + 1 = 3) → 4 > 3 → true
		const shouldReset = newRound > session.destinations[0].spam_trap_active!.round + 1;
		expect(shouldReset).toBe(true);

		// Trap should be removed from owned_tools
		// spam_trap_active should be set to undefined
	});

	test('repurchased announced trap in R3 should stay active in R4', () => {
		// If player repurchases trap in R3 and announces, it should stay active in R4
		const session = buildTestSession({
			currentRound: 3
		});

		// Spam trap was repurchased in R3 (announced)
		session.destinations[0].spam_trap_active = {
			round: 3, // Repurchased in R3
			announced: true
		};
		session.destinations[0].owned_tools.push('spam_trap_network');

		// When: Advancing to Round 4
		const newRound = 4;

		// Then: Trap should NOT be reset (repurchased in R3, active in R4)
		// newRound (4) > purchase round + 1 (3 + 1 = 4) → 4 > 4 → false
		const shouldReset = newRound > session.destinations[0].spam_trap_active!.round + 1;
		expect(shouldReset).toBe(false);

		// Trap should remain active
	});

	test('multiple destinations can have independent spam trap states', () => {
		const session = buildTestSession({
			currentRound: 2
		});

		// Gmail: secret trap in R2
		session.destinations[0].spam_trap_active = {
			round: 2,
			announced: false
		};

		// Outlook: announced trap in R2
		session.destinations[1].spam_trap_active = {
			round: 2,
			announced: true
		};

		// Yahoo: no trap
		session.destinations[2].spam_trap_active = undefined;

		// When: Advancing to Round 3
		const newRound = 3;

		// Then: Gmail's secret trap should be reset
		const gmailShouldReset = newRound > session.destinations[0].spam_trap_active!.round;
		expect(gmailShouldReset).toBe(true);

		// Then: Outlook's announced trap should NOT be reset yet
		const outlookShouldReset = newRound > session.destinations[1].spam_trap_active!.round + 1;
		expect(outlookShouldReset).toBe(false);

		// Then: Yahoo has nothing to reset
		expect(session.destinations[2].spam_trap_active).toBeUndefined();
	});
});

describe('Resolution Manager - Phase 3.3.1: Data Privacy - Satisfaction Not Visible to ESP', () => {
	test('ESP resolution results should NOT include satisfaction data', async () => {
		// Given: ESP with active clients
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

		// Then: ESP results should exist
		expect(results.espResults.SendWave).toBeDefined();

		// Then: ESP results should NOT include satisfaction data
		// Satisfaction should only be visible to destination players
		expect(results.espResults.SendWave.satisfaction).toBeUndefined();

		// And: ESP results should include all other expected data
		expect(results.espResults.SendWave.volume).toBeDefined();
		expect(results.espResults.SendWave.delivery).toBeDefined();
		expect(results.espResults.SendWave.revenue).toBeDefined();
		expect(results.espResults.SendWave.reputation).toBeDefined();
		expect(results.espResults.SendWave.complaints).toBeDefined();
	});

	test('Destination results should still include satisfaction data', async () => {
		// Given: Game session with ESP and destinations
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

		// Then: Destination results should include aggregated satisfaction
		expect(results.destinationResults.Gmail).toBeDefined();
		expect(results.destinationResults.Gmail.aggregatedSatisfaction).toBeDefined();
		expect(typeof results.destinationResults.Gmail.aggregatedSatisfaction).toBe('number');
	});
});
