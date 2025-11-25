/**
 * Volume Calculator Unit Tests
 * US 3.3: Resolution Phase Automation - Iteration 1, 5
 * ATDD: Test-first approach
 */

import { describe, test, expect } from 'vitest';
import { calculateVolume } from './volume-calculator';
import { buildTestClient } from '../test-helpers/client-test-fixtures';

describe('Volume Calculator - Iteration 1: Basic Volume', () => {
	test('single active client', () => {
		const client = buildTestClient('premium_brand', { id: 'client-1' });

		const result = calculateVolume({
			clients: [client],
			clientStates: {
				'client-1': {
					status: 'Active',
					first_active_round: null,
					volumeModifiers: [],
					spamTrapModifiers: []
				}
			},
			currentRound: 1
		});

		expect(result.totalVolume).toBe(30000);
		expect(result.activeClients).toHaveLength(1);
		expect(result.clientVolumes).toHaveLength(1);
		expect(result.clientVolumes[0].clientId).toBe('client-1');
		expect(result.clientVolumes[0].baseVolume).toBe(30000);
		expect(result.clientVolumes[0].adjustedVolume).toBe(30000);
		expect(result.clientVolumes[0].adjustments).toEqual({});
	});

	test('multiple active clients', () => {
		const premium = buildTestClient('premium_brand', { id: 'client-1' });
		const startup = buildTestClient('growing_startup', { id: 'client-2' });

		const result = calculateVolume({
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
			},
			currentRound: 1
		});

		expect(result.totalVolume).toBe(65000); // 30K + 35K
		expect(result.activeClients).toHaveLength(2);
		expect(result.clientVolumes).toHaveLength(2);
	});

	test('mix of active and paused clients', () => {
		const premium = buildTestClient('premium_brand', { id: 'client-1' });
		const aggressive = buildTestClient('aggressive_marketer', { id: 'client-2' });
		const startup = buildTestClient('growing_startup', { id: 'client-3' });

		const result = calculateVolume({
			clients: [premium, aggressive, startup],
			clientStates: {
				'client-1': {
					status: 'Active',
					first_active_round: null,
					volumeModifiers: [],
					spamTrapModifiers: []
				},
				'client-2': {
					status: 'Paused',
					first_active_round: null,
					volumeModifiers: [],
					spamTrapModifiers: []
				},
				'client-3': {
					status: 'Active',
					first_active_round: null,
					volumeModifiers: [],
					spamTrapModifiers: []
				}
			},
			currentRound: 1
		});

		expect(result.totalVolume).toBe(65000); // 30K + 35K (excludes paused 80K)
		expect(result.activeClients).toHaveLength(2);
		expect(result.clientVolumes).toHaveLength(2);
		expect(result.clientVolumes.find((cv) => cv.clientId === 'client-2')).toBeUndefined();
	});

	test('re-engagement client', () => {
		const reengagement = buildTestClient('re_engagement', { id: 'client-1' });

		const result = calculateVolume({
			clients: [reengagement],
			clientStates: {
				'client-1': {
					status: 'Active',
					first_active_round: null,
					volumeModifiers: [],
					spamTrapModifiers: []
				}
			},
			currentRound: 1
		});

		expect(result.totalVolume).toBe(50000);
		expect(result.activeClients).toHaveLength(1);
		expect(result.clientVolumes[0].baseVolume).toBe(50000);
		expect(result.clientVolumes[0].adjustedVolume).toBe(50000);
	});

	test('no active clients', () => {
		const result = calculateVolume({
			clients: [],
			clientStates: {},
			currentRound: 1
		});

		expect(result.totalVolume).toBe(0);
		expect(result.activeClients).toHaveLength(0);
		expect(result.clientVolumes).toHaveLength(0);
	});

	test('all clients paused', () => {
		const premium = buildTestClient('premium_brand', { id: 'client-1' });
		const startup = buildTestClient('growing_startup', { id: 'client-2' });

		const result = calculateVolume({
			clients: [premium, startup],
			clientStates: {
				'client-1': {
					status: 'Paused',
					first_active_round: null,
					volumeModifiers: [],
					spamTrapModifiers: []
				},
				'client-2': {
					status: 'Paused',
					first_active_round: null,
					volumeModifiers: [],
					spamTrapModifiers: []
				}
			},
			currentRound: 1
		});

		expect(result.totalVolume).toBe(0);
		expect(result.activeClients).toHaveLength(0);
		expect(result.clientVolumes).toHaveLength(0);
	});
});

describe('Volume Calculator - Iteration 5: Risk Mitigation Services', () => {
	describe('Warmup volume reduction', () => {
		test('50% volume reduction in first active round', () => {
			const client = buildTestClient('premium_brand');
			const result = calculateVolume({
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [
							{ id: 'warmup', source: 'warmup', multiplier: 0.5, applicableRounds: [1] }
						],
						spamTrapModifiers: []
					}
				},
				currentRound: 1
			});

			expect(result.totalVolume).toBe(15000); // 30K * 0.5
			expect(result.clientVolumes[0].baseVolume).toBe(30000);
			expect(result.clientVolumes[0].adjustedVolume).toBe(15000);
			expect(result.clientVolumes[0].adjustments.warmup.amount).toBe(15000);
		});

		test('no warmup reduction after first active round', () => {
			const client = buildTestClient('premium_brand');
			const result = calculateVolume({
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [
							{ id: 'warmup', source: 'warmup', multiplier: 0.5, applicableRounds: [1] }
						],
						spamTrapModifiers: []
					}
				},
				currentRound: 2
			});

			expect(result.totalVolume).toBe(30000); // Full volume
			expect(result.clientVolumes[0].adjustments.warmup).toBeUndefined();
		});

		test('warmup reduction on high-volume client', () => {
			const client = buildTestClient('aggressive_marketer'); // 80K base
			const result = calculateVolume({
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [
							{ id: 'warmup', source: 'warmup', multiplier: 0.5, applicableRounds: [1] }
						],
						spamTrapModifiers: []
					}
				},
				currentRound: 1
			});

			expect(result.totalVolume).toBe(40000); // 80K * 0.5
			expect(result.clientVolumes[0].adjustments.warmup.amount).toBe(40000);
		});
	});

	describe('List hygiene volume reduction', () => {
		test('Low risk client: 5% permanent reduction', () => {
			const client = buildTestClient('premium_brand'); // Low risk, 30K
			const result = calculateVolume({
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [
							{
								id: 'list_hygiene',
								source: 'list_hygiene',
								multiplier: 0.95,
								applicableRounds: [1]
							}
						],
						spamTrapModifiers: [
							{ id: 'list_hygiene', source: 'list_hygiene', multiplier: 0.6, applicableRounds: [1] }
						]
					}
				},
				currentRound: 1
			});

			expect(result.totalVolume).toBe(28500); // 30K * 0.95
			expect(result.clientVolumes[0].adjustments.list_hygiene.amount).toBeCloseTo(1500, 0);
		});

		test('Medium risk client: 10% permanent reduction', () => {
			const client = buildTestClient('growing_startup'); // Medium risk, 35K
			const result = calculateVolume({
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [
							{ id: 'list_hygiene', source: 'list_hygiene', multiplier: 0.9, applicableRounds: [1] }
						],
						spamTrapModifiers: [
							{ id: 'list_hygiene', source: 'list_hygiene', multiplier: 0.6, applicableRounds: [1] }
						]
					}
				},
				currentRound: 1
			});

			expect(result.totalVolume).toBe(31500); // 35K * 0.90
			expect(result.clientVolumes[0].adjustments.list_hygiene.amount).toBeCloseTo(3500, 0);
		});

		test('High risk client: 15% permanent reduction', () => {
			const client = buildTestClient('aggressive_marketer'); // High risk, 80K
			const result = calculateVolume({
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [
							{
								id: 'list_hygiene',
								source: 'list_hygiene',
								multiplier: 0.85,
								applicableRounds: [1]
							}
						],
						spamTrapModifiers: [
							{ id: 'list_hygiene', source: 'list_hygiene', multiplier: 0.6, applicableRounds: [1] }
						]
					}
				},
				currentRound: 1
			});

			expect(result.totalVolume).toBe(68000); // 80K * 0.85
			expect(result.clientVolumes[0].adjustments.list_hygiene.amount).toBeCloseTo(12000, 0);
		});

		test('list hygiene applies in all rounds (permanent)', () => {
			const client = buildTestClient('aggressive_marketer');

			// Round 1
			const result1 = calculateVolume({
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [
							{
								id: 'list_hygiene',
								source: 'list_hygiene',
								multiplier: 0.85,
								applicableRounds: [1, 2]
							}
						],
						spamTrapModifiers: [
							{
								id: 'list_hygiene',
								source: 'list_hygiene',
								multiplier: 0.6,
								applicableRounds: [1, 2]
							}
						]
					}
				},
				currentRound: 1
			});
			expect(result1.totalVolume).toBe(68000);

			// Round 2 - still applies
			const result2 = calculateVolume({
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [
							{
								id: 'list_hygiene',
								source: 'list_hygiene',
								multiplier: 0.85,
								applicableRounds: [1, 2]
							}
						],
						spamTrapModifiers: [
							{
								id: 'list_hygiene',
								source: 'list_hygiene',
								multiplier: 0.6,
								applicableRounds: [1, 2]
							}
						]
					}
				},
				currentRound: 2
			});
			expect(result2.totalVolume).toBe(68000);
		});
	});

	describe('Combined warmup + list hygiene', () => {
		test('both services apply: hygiene first, then warmup', () => {
			const client = buildTestClient('event_seasonal'); // Medium risk, 40K
			const result = calculateVolume({
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [
							{
								id: 'list_hygiene',
								source: 'list_hygiene',
								multiplier: 0.9,
								applicableRounds: [1]
							},
							{ id: 'warmup', source: 'warmup', multiplier: 0.5, applicableRounds: [1] }
						],
						spamTrapModifiers: [
							{ id: 'list_hygiene', source: 'list_hygiene', multiplier: 0.6, applicableRounds: [1] }
						]
					}
				},
				currentRound: 1
			});

			// Calculation: 40K × 0.90 (hygiene) × 0.50 (warmup) = 18K
			expect(result.totalVolume).toBe(18000);
			expect(result.clientVolumes[0].adjustments.list_hygiene.amount).toBeCloseTo(4000, 0);
			expect(result.clientVolumes[0].adjustments.warmup.amount).toBe(20000); // Note: adjustment tracks base volume reduction, not cumulative
		});

		test('re_engagement with both services (High risk, 50K)', () => {
			const client = buildTestClient('re_engagement'); // High risk, 50K
			const result = calculateVolume({
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [
							{
								id: 'list_hygiene',
								source: 'list_hygiene',
								multiplier: 0.85,
								applicableRounds: [1]
							},
							{ id: 'warmup', source: 'warmup', multiplier: 0.5, applicableRounds: [1] }
						],
						spamTrapModifiers: [
							{ id: 'list_hygiene', source: 'list_hygiene', multiplier: 0.6, applicableRounds: [1] }
						]
					}
				},
				currentRound: 1
			});

			// Calculation: 50K × 0.85 (hygiene) × 0.50 (warmup) = 21.25K
			expect(result.totalVolume).toBe(21250);
			expect(result.clientVolumes[0].adjustments.list_hygiene.amount).toBeCloseTo(7500, 0);
			expect(result.clientVolumes[0].adjustments.warmup.amount).toBe(25000); // Note: adjustment tracks base volume reduction, not cumulative
		});

		test('combined services in round 2: only hygiene applies', () => {
			const client = buildTestClient('event_seasonal');
			const result = calculateVolume({
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [
							{
								id: 'list_hygiene',
								source: 'list_hygiene',
								multiplier: 0.9,
								applicableRounds: [1, 2]
							},
							{ id: 'warmup', source: 'warmup', multiplier: 0.5, applicableRounds: [1] }
						],
						spamTrapModifiers: [
							{
								id: 'list_hygiene',
								source: 'list_hygiene',
								multiplier: 0.6,
								applicableRounds: [1, 2]
							}
						]
					}
				},
				currentRound: 2
			});

			// Only hygiene applies (warmup only first round)
			expect(result.totalVolume).toBe(36000); // 40K × 0.90
			expect(result.clientVolumes[0].adjustments.warmup).toBeUndefined();
		});
	});

	describe('Multiple clients with different services', () => {
		test('tracks per-client service usage', () => {
			const warmedClient = buildTestClient('premium_brand', { id: 'client-1' });
			const hygieneClient = buildTestClient('growing_startup', { id: 'client-2' });
			const bothClient = buildTestClient('event_seasonal', { id: 'client-3' });

			const result = calculateVolume({
				clients: [warmedClient, hygieneClient, bothClient],
				clientStates: {
					'client-1': {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [
							{ id: 'warmup', source: 'warmup', multiplier: 0.5, applicableRounds: [1] }
						],
						spamTrapModifiers: []
					},
					'client-2': {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [
							{ id: 'list_hygiene', source: 'list_hygiene', multiplier: 0.9, applicableRounds: [1] }
						],
						spamTrapModifiers: [
							{ id: 'list_hygiene', source: 'list_hygiene', multiplier: 0.6, applicableRounds: [1] }
						]
					},
					'client-3': {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [
							{
								id: 'list_hygiene',
								source: 'list_hygiene',
								multiplier: 0.9,
								applicableRounds: [1]
							},
							{ id: 'warmup', source: 'warmup', multiplier: 0.5, applicableRounds: [1] }
						],
						spamTrapModifiers: [
							{ id: 'list_hygiene', source: 'list_hygiene', multiplier: 0.6, applicableRounds: [1] }
						]
					}
				},
				currentRound: 1
			});

			// Client 1: 30K × 0.50 (warmup) = 15K
			expect(result.clientVolumes[0].adjustedVolume).toBe(15000);

			// Client 2: 35K × 0.90 (hygiene) = 31.5K
			expect(result.clientVolumes[1].adjustedVolume).toBe(31500);

			// Client 3: 40K × 0.90 (hygiene) × 0.50 (warmup) = 18K
			expect(result.clientVolumes[2].adjustedVolume).toBe(18000);

			// Total: 15K + 31.5K + 18K = 64.5K
			expect(result.totalVolume).toBe(64500);
		});
	});
});

describe('Volume Calculator - Iteration 6: Per-Destination Volumes', () => {
	describe('Single client distribution', () => {
		test('premium_brand default distribution (50/30/20)', () => {
			const client = buildTestClient('premium_brand'); // 30K volume
			const result = calculateVolume({
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				currentRound: 1
			});

			expect(result.totalVolume).toBe(30000);
			expect(result.perDestination.Gmail).toBe(15000); // 50%
			expect(result.perDestination.Outlook).toBe(9000); // 30%
			expect(result.perDestination.Yahoo).toBe(6000); // 20%

			expect(result.clientVolumes[0].perDestination.Gmail).toBe(15000);
			expect(result.clientVolumes[0].perDestination.Outlook).toBe(9000);
			expect(result.clientVolumes[0].perDestination.Yahoo).toBe(6000);
		});

		test('distribution applies after volume adjustments', () => {
			const client = buildTestClient('aggressive_marketer'); // 80K, High risk
			const result = calculateVolume({
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [
							{
								id: 'list_hygiene',
								source: 'list_hygiene',
								multiplier: 0.85,
								applicableRounds: [1]
							},
							{ id: 'warmup', source: 'warmup', multiplier: 0.5, applicableRounds: [1] }
						],
						spamTrapModifiers: [
							{ id: 'list_hygiene', source: 'list_hygiene', multiplier: 0.6, applicableRounds: [1] }
						]
					}
				},
				currentRound: 1
			});

			// 80K × 0.85 (hygiene) × 0.50 (warmup) = 34,000
			expect(result.totalVolume).toBe(34000);

			// Distribution applied to adjusted volume
			expect(result.perDestination.Gmail).toBe(17000); // 50%
			expect(result.perDestination.Outlook).toBe(10200); // 30%
			expect(result.perDestination.Yahoo).toBe(6800); // 20%
		});
	});

	describe('Multiple clients with same distribution', () => {
		test('sum volumes per destination', () => {
			const client1 = buildTestClient('premium_brand', { id: 'c1' }); // 30K
			const client2 = buildTestClient('premium_brand', { id: 'c2' }); // 30K

			const result = calculateVolume({
				clients: [client1, client2],
				clientStates: {
					c1: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					},
					c2: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				currentRound: 1
			});

			expect(result.totalVolume).toBe(60000);
			expect(result.perDestination.Gmail).toBe(30000); // 50% of 60K
			expect(result.perDestination.Outlook).toBe(18000); // 30% of 60K
			expect(result.perDestination.Yahoo).toBe(12000); // 20% of 60K
		});
	});

	describe('Edge cases', () => {
		test('no active clients: zero per destination', () => {
			const result = calculateVolume({
				clients: [],
				clientStates: {},
				currentRound: 1
			});

			expect(result.totalVolume).toBe(0);
			expect(result.perDestination.Gmail).toBe(0);
			expect(result.perDestination.Outlook).toBe(0);
			expect(result.perDestination.Yahoo).toBe(0);
		});
	});
});
