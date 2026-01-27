/**
 * Resolution Manager Integration Tests
 * US 3.3: Resolution Phase Automation - Iterations 1-2
 * ATDD: Test-first approach for integration
 */

import { describe, test, expect } from 'vitest';
import { executeResolution } from './resolution-manager';
import { buildTestSession, buildTestTeam } from './test-helpers/game-session-builder';
import { buildTestClient } from './test-helpers/client-test-fixtures';

describe('Resolution Manager - Iteration 6: Per-Destination Filtering', () => {
	test('per-destination delivery calculated independently with same filtering', async () => {
		// Given: ESP with different reputation per destination, moderate filtering everywhere
		const client = buildTestClient('premium_brand', { id: 'client-1' });
		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
					reputation: { zmail: 85, intake: 70, yagle: 60 }, // Good/Good/Warning zones
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

		// Then: zmail delivery = 85% base - 3% filtering = 82%
		expect(results.espResults.SendWave.delivery.zmail.zone).toBe('good');
		expect(results.espResults.SendWave.delivery.zmail.finalRate).toBe(0.82); // 0.85 - 0.03
		expect(results.espResults.SendWave.delivery.zmail.filteringPenalty).toBe(0.03);

		// Then: intake delivery = 85% base - 3% filtering = 82%
		expect(results.espResults.SendWave.delivery.intake.zone).toBe('good');
		expect(results.espResults.SendWave.delivery.intake.finalRate).toBe(0.82);
		expect(results.espResults.SendWave.delivery.intake.filteringPenalty).toBe(0.03);

		// Then: yagle delivery = 70% base - 3% filtering = 67%
		expect(results.espResults.SendWave.delivery.yagle.zone).toBe('warning');
		expect(results.espResults.SendWave.delivery.yagle.finalRate).toBeCloseTo(0.67, 2);
		expect(results.espResults.SendWave.delivery.yagle.filteringPenalty).toBe(0.03);

		// Then: Aggregate delivery rate is volume-weighted
		// zmail: 15000 * 0.82 = 12300, intake: 9000 * 0.82 = 7380, yagle: 6000 * 0.67 = 4020
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
					reputation: { zmail: 80, intake: 80, yagle: 80 }, // Good zone everywhere
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

		// Set different filtering levels per destination
		session.destinations[0].filtering_policies['SendWave'] = {
			espName: 'SendWave',
			level: 'permissive',
			spamReduction: 0,
			falsePositives: 0
		}; // zmail: 0%
		session.destinations[1].filtering_policies['SendWave'] = {
			espName: 'SendWave',
			level: 'strict',
			spamReduction: 65,
			falsePositives: 8
		}; // intake: 8%
		session.destinations[2].filtering_policies['SendWave'] = {
			espName: 'SendWave',
			level: 'maximum',
			spamReduction: 85,
			falsePositives: 15
		}; // yagle: 15%

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: zmail no filtering penalty (permissive)
		expect(results.espResults.SendWave.delivery.zmail.finalRate).toBe(0.85); // 0.85 - 0.0
		expect(results.espResults.SendWave.delivery.zmail.filteringPenalty).toBeUndefined();

		// Then: intake strict filtering (8% penalty)
		expect(results.espResults.SendWave.delivery.intake.finalRate).toBeCloseTo(0.77, 2); // 0.85 - 0.08
		expect(results.espResults.SendWave.delivery.intake.filteringPenalty).toBe(0.08);

		// Then: yagle maximum filtering (15% penalty)
		expect(results.espResults.SendWave.delivery.yagle.finalRate).toBe(0.7); // 0.85 - 0.15
		expect(results.espResults.SendWave.delivery.yagle.filteringPenalty).toBe(0.15);

		// Then: Aggregate delivery rate reflects different filtering
		// zmail: 15000 * 0.85 = 12750, intake: 9000 * 0.77 = 6930, yagle: 6000 * 0.7 = 4200
		// Total: (12750 + 6930 + 4200) / 30000 = 23880 / 30000 = 0.796
		expect(results.espResults.SendWave.aggregateDeliveryRate).toBeCloseTo(0.796, 2);
	});

	test('filtering with multiple clients (volume distribution matters)', async () => {
		// Given: Two clients with different destination distributions
		const premium = buildTestClient('premium_brand', {
			id: 'client-1',
			destination_distribution: { zmail: 60, intake: 30, yagle: 10 } // Heavy zmail
		});
		const startup = buildTestClient('growing_startup', {
			id: 'client-2',
			destination_distribution: { zmail: 30, intake: 40, yagle: 30 } // Balanced
		});

		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
					reputation: { zmail: 80, intake: 80, yagle: 80 },
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
		expect(results.espResults.SendWave.delivery.zmail.finalRate).toBe(0.82); // 0.85 - 0.03
		expect(results.espResults.SendWave.delivery.intake.finalRate).toBe(0.82);
		expect(results.espResults.SendWave.delivery.yagle.finalRate).toBe(0.82);

		// Then: Volume correctly distributed per destination
		// Premium: 30000 total, 60% zmail = 18000, 30% intake = 9000, 10% yagle = 3000
		// Startup: 35000 total, 30% zmail = 10500, 40% intake = 14000, 30% yagle = 10500
		// Totals: zmail = 28500, intake = 23000, yagle = 13500
		expect(results.espResults.SendWave.volume.perDestination.zmail).toBe(28500);
		expect(results.espResults.SendWave.volume.perDestination.intake).toBe(23000);
		expect(results.espResults.SendWave.volume.perDestination.yagle).toBe(13500);

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
					reputation: { zmail: 80, intake: 80, yagle: 80 },
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
					reputation: { zmail: 80, intake: 80, yagle: 80 },
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

		// Only SendWave has filtering at zmail
		session.destinations[0].filtering_policies['SendWave'] = {
			espName: 'SendWave',
			level: 'strict',
			spamReduction: 65,
			falsePositives: 8
		}; // zmail: 8%

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: SendWave has filtering penalty at zmail only
		expect(results.espResults.SendWave.delivery.zmail.finalRate).toBeCloseTo(0.77, 2); // 0.85 - 0.08
		expect(results.espResults.SendWave.delivery.intake.finalRate).toBe(0.85); // No filtering
		expect(results.espResults.SendWave.delivery.yagle.finalRate).toBe(0.85); // No filtering

		// Then: MailMonkey has no filtering anywhere (permissive by default)
		expect(results.espResults.MailMonkey.delivery.zmail.finalRate).toBe(0.85);
		expect(results.espResults.MailMonkey.delivery.intake.finalRate).toBe(0.85);
		expect(results.espResults.MailMonkey.delivery.yagle.finalRate).toBe(0.85);
		expect(results.espResults.MailMonkey.aggregateDeliveryRate).toBe(0.85);
	});
});
