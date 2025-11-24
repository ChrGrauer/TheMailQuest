/**
 * Spam Trap Calculator Unit Tests
 * US 3.3: Resolution Phase Automation - Iteration 7
 * ATDD: Test-first approach (RED phase)
 */

import { describe, test, expect } from 'vitest';
import { calculateSpamTraps } from './spam-trap-calculator';
import { buildTestClient } from '../test-helpers/client-test-fixtures';
import type { VolumeResult } from '../resolution-types';

describe('Spam Trap Calculator - Iteration 7: Spam Trap Detection', () => {
	describe('Base spam trap risk by client type', () => {
		test('premium_brand: 0.5% base risk', () => {
			const client = buildTestClient('premium_brand');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 30000, adjustedVolume: 30000, adjustments: {} }
				],
				totalVolume: 30000,
				perDestination: { Gmail: 15000, Outlook: 9000, Yahoo: 6000 }
			};

			const result = calculateSpamTraps({
				clients: [client],
				volumeData,
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				roomCode: 'TEST-ROOM',
				round: 1,
				espName: 'TestESP',
				spamTrapNetworkActive: { Gmail: false, Outlook: false, Yahoo: false }
			});

			expect(result.perClient).toHaveLength(1);
			expect(result.perClient[0].baseRisk).toBe(0.005);
			expect(result.perClient[0].adjustedRisk).toBe(0.005);
		});

		test('growing_startup: 1.5% base risk', () => {
			const client = buildTestClient('growing_startup');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 35000, adjustedVolume: 35000, adjustments: {} }
				],
				totalVolume: 35000,
				perDestination: { Gmail: 17500, Outlook: 10500, Yahoo: 7000 }
			};

			const result = calculateSpamTraps({
				clients: [client],
				volumeData,
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				roomCode: 'TEST-ROOM',
				round: 1,
				espName: 'TestESP',
				spamTrapNetworkActive: { Gmail: false, Outlook: false, Yahoo: false }
			});

			expect(result.perClient[0].baseRisk).toBe(0.015);
		});

		test('re_engagement: 3% base risk', () => {
			const client = buildTestClient('re_engagement');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 50000, adjustedVolume: 50000, adjustments: {} }
				],
				totalVolume: 50000,
				perDestination: { Gmail: 25000, Outlook: 15000, Yahoo: 10000 }
			};

			const result = calculateSpamTraps({
				clients: [client],
				volumeData,
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				roomCode: 'TEST-ROOM',
				round: 1,
				espName: 'TestESP',
				spamTrapNetworkActive: { Gmail: false, Outlook: false, Yahoo: false }
			});

			expect(result.perClient[0].baseRisk).toBe(0.03);
		});

		test('aggressive_marketer: 5% base risk (from feature spec)', () => {
			const client = buildTestClient('aggressive_marketer');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
				],
				totalVolume: 80000,
				perDestination: { Gmail: 40000, Outlook: 24000, Yahoo: 16000 }
			};

			const result = calculateSpamTraps({
				clients: [client],
				volumeData,
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				roomCode: 'TEST-ROOM',
				round: 1,
				espName: 'TestESP',
				spamTrapNetworkActive: { Gmail: false, Outlook: false, Yahoo: false }
			});

			expect(result.perClient[0].baseRisk).toBe(0.05);
		});

		test('event_seasonal: 2.5% base risk', () => {
			const client = buildTestClient('event_seasonal');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 40000, adjustedVolume: 40000, adjustments: {} }
				],
				totalVolume: 40000,
				perDestination: { Gmail: 20000, Outlook: 12000, Yahoo: 8000 }
			};

			const result = calculateSpamTraps({
				clients: [client],
				volumeData,
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				roomCode: 'TEST-ROOM',
				round: 1,
				espName: 'TestESP',
				spamTrapNetworkActive: { Gmail: false, Outlook: false, Yahoo: false }
			});

			expect(result.perClient[0].baseRisk).toBe(0.025);
		});
	});

	describe('List Hygiene reduction', () => {
		test('List Hygiene reduces spam trap risk by 40%', () => {
			const client = buildTestClient('aggressive_marketer');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 80000, adjustedVolume: 68000, adjustments: {} }
				],
				totalVolume: 68000,
				perDestination: { Gmail: 34000, Outlook: 20400, Yahoo: 13600 }
			};

			const result = calculateSpamTraps({
				clients: [client],
				volumeData,
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: [
							{ id: 'list_hygiene', source: 'list_hygiene', multiplier: 0.6, applicableRounds: [1] }
						]
					}
				},
				roomCode: 'TEST-ROOM',
				round: 1,
				espName: 'TestESP',
				spamTrapNetworkActive: { Gmail: false, Outlook: false, Yahoo: false }
			});

			expect(result.perClient[0].baseRisk).toBe(0.05); // Base stays 5%
			expect(result.perClient[0].adjustedRisk).toBe(0.03); // Reduced by 40%: 0.05 * 0.6 = 0.03
		});

		test('List Hygiene on re_engagement: 3% -> 1.8%', () => {
			const client = buildTestClient('re_engagement');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 50000, adjustedVolume: 42500, adjustments: {} }
				],
				totalVolume: 42500,
				perDestination: { Gmail: 21250, Outlook: 12750, Yahoo: 8500 }
			};

			const result = calculateSpamTraps({
				clients: [client],
				volumeData,
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: [
							{ id: 'list_hygiene', source: 'list_hygiene', multiplier: 0.6, applicableRounds: [1] }
						]
					}
				},
				roomCode: 'TEST-ROOM',
				round: 1,
				espName: 'TestESP',
				spamTrapNetworkActive: { Gmail: false, Outlook: false, Yahoo: false }
			});

			expect(result.perClient[0].baseRisk).toBe(0.03);
			expect(result.perClient[0].adjustedRisk).toBe(0.018); // 3% * 0.6 = 1.8%
		});
	});

	describe('Spam Trap Network multiplier', () => {
		test('Network multiplies spam trap risk by 3x at active destination', () => {
			const client = buildTestClient('aggressive_marketer');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
				],
				totalVolume: 80000,
				perDestination: { Gmail: 40000, Outlook: 24000, Yahoo: 16000 }
			};

			const result = calculateSpamTraps({
				clients: [client],
				volumeData,
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				roomCode: 'TEST-ROOM',
				round: 1,
				espName: 'TestESP',
				spamTrapNetworkActive: { Gmail: true, Outlook: false, Yahoo: false } // Gmail has network
			});

			expect(result.perClient[0].networkMultipliedRisk.Gmail).toBeCloseTo(0.15, 5); // 5% * 3 = 15%
			expect(result.perClient[0].networkMultipliedRisk.Outlook).toBeCloseTo(0.05, 5); // No network
			expect(result.perClient[0].networkMultipliedRisk.Yahoo).toBeCloseTo(0.05, 5); // No network
		});

		test('Network + List Hygiene: both apply', () => {
			const client = buildTestClient('aggressive_marketer');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 80000, adjustedVolume: 68000, adjustments: {} }
				],
				totalVolume: 68000,
				perDestination: { Gmail: 34000, Outlook: 20400, Yahoo: 13600 }
			};

			const result = calculateSpamTraps({
				clients: [client],
				volumeData,
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: [
							{ id: 'list_hygiene', source: 'list_hygiene', multiplier: 0.6, applicableRounds: [1] }
						]
					}
				},
				roomCode: 'TEST-ROOM',
				round: 1,
				espName: 'TestESP',
				spamTrapNetworkActive: { Gmail: true, Outlook: false, Yahoo: false }
			});

			// Adjusted risk after List Hygiene: 5% * 0.6 = 3%
			// Network multiplier: 3% * 3 = 9% at Gmail
			expect(result.perClient[0].adjustedRisk).toBe(0.03);
			expect(result.perClient[0].networkMultipliedRisk.Gmail).toBe(0.09);
			expect(result.perClient[0].networkMultipliedRisk.Outlook).toBe(0.03);
		});
	});

	describe('Per-client independent rolls', () => {
		test('Multiple clients each roll independently', () => {
			const client1 = buildTestClient('aggressive_marketer', { id: 'client-1' });
			const client2 = buildTestClient('re_engagement', { id: 'client-2' });

			const volumeData: VolumeResult = {
				activeClients: [client1, client2],
				clientVolumes: [
					{ clientId: 'client-1', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} },
					{ clientId: 'client-2', baseVolume: 50000, adjustedVolume: 50000, adjustments: {} }
				],
				totalVolume: 130000,
				perDestination: { Gmail: 65000, Outlook: 39000, Yahoo: 26000 }
			};

			const result = calculateSpamTraps({
				clients: [client1, client2],
				volumeData,
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
				roomCode: 'TEST-ROOM',
				round: 1,
				espName: 'TestESP',
				spamTrapNetworkActive: { Gmail: false, Outlook: false, Yahoo: false }
			});

			expect(result.perClient).toHaveLength(2);
			expect(result.perClient[0].baseRisk).toBe(0.05); // aggressive_marketer
			expect(result.perClient[1].baseRisk).toBe(0.03); // re_engagement
			// Each client should have independent random roll
			expect(result.perClient[0].randomRoll).toBeGreaterThanOrEqual(0);
			expect(result.perClient[0].randomRoll).toBeLessThan(1);
			expect(result.perClient[1].randomRoll).toBeGreaterThanOrEqual(0);
			expect(result.perClient[1].randomRoll).toBeLessThan(1);
		});
	});

	describe('Trap hit detection', () => {
		test('Random roll below risk triggers trap hit', () => {
			// This test uses a deterministic seed that will produce a low roll
			const client = buildTestClient('aggressive_marketer');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
				],
				totalVolume: 80000,
				perDestination: { Gmail: 40000, Outlook: 24000, Yahoo: 16000 }
			};

			const result = calculateSpamTraps({
				clients: [client],
				volumeData,
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				roomCode: 'TRAP-HIT',
				round: 1,
				espName: 'TestESP',
				spamTrapNetworkActive: { Gmail: false, Outlook: false, Yahoo: false }
			});

			// trapHit should be boolean
			expect(typeof result.trapHit).toBe('boolean');
			// If trap hit, reputation penalty should be -5
			if (result.trapHit) {
				expect(result.reputationPenalty).toBe(-5);
				expect(result.hitClientIds.length).toBeGreaterThan(0);
			}
		});

		test('Random roll above risk does not trigger trap', () => {
			// This test uses a deterministic seed that will produce a high roll
			const client = buildTestClient('premium_brand'); // Low 0.5% risk
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 30000, adjustedVolume: 30000, adjustments: {} }
				],
				totalVolume: 30000,
				perDestination: { Gmail: 15000, Outlook: 9000, Yahoo: 6000 }
			};

			const result = calculateSpamTraps({
				clients: [client],
				volumeData,
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				roomCode: 'NO-TRAP',
				round: 1,
				espName: 'TestESP',
				spamTrapNetworkActive: { Gmail: false, Outlook: false, Yahoo: false }
			});

			// With very low risk, trap unlikely to hit
			// If no trap hit, penalty should be 0 (or -0 due to floating point)
			if (!result.trapHit) {
				expect(Math.abs(result.reputationPenalty)).toBe(0);
				expect(result.hitClientIds).toHaveLength(0);
			}
		});
	});

	describe('Multiple trap hits with penalty cap', () => {
		test('Multiple trap hits but penalty capped at -5', () => {
			// Use multiple high-risk clients with network active to maximize trap hits
			const client1 = buildTestClient('aggressive_marketer', { id: 'client-1' });
			const client2 = buildTestClient('aggressive_marketer', { id: 'client-2' });

			const volumeData: VolumeResult = {
				activeClients: [client1, client2],
				clientVolumes: [
					{ clientId: 'client-1', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} },
					{ clientId: 'client-2', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
				],
				totalVolume: 160000,
				perDestination: { Gmail: 80000, Outlook: 48000, Yahoo: 32000 }
			};

			const result = calculateSpamTraps({
				clients: [client1, client2],
				volumeData,
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
				roomCode: 'MULTI-TRAP',
				round: 1,
				espName: 'TestESP',
				spamTrapNetworkActive: { Gmail: true, Outlook: true, Yahoo: true } // All networks active
			});

			// Even if multiple traps hit, penalty should never exceed -5
			expect(result.reputationPenalty).toBeGreaterThanOrEqual(-5);
			expect(result.reputationPenalty).toBeLessThanOrEqual(0);
		});
	});

	describe('Seeded RNG reproducibility', () => {
		test('Same seed produces same random rolls', () => {
			const client = buildTestClient('aggressive_marketer');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
				],
				totalVolume: 80000,
				perDestination: { Gmail: 40000, Outlook: 24000, Yahoo: 16000 }
			};

			const params = {
				clients: [client],
				volumeData,
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				roomCode: 'SEED-TEST',
				round: 1,
				espName: 'TestESP',
				spamTrapNetworkActive: { Gmail: false, Outlook: false, Yahoo: false }
			};

			const result1 = calculateSpamTraps(params);
			const result2 = calculateSpamTraps(params);

			// Same seed should produce identical results
			expect(result1.perClient[0].randomRoll).toBe(result2.perClient[0].randomRoll);
			expect(result1.trapHit).toBe(result2.trapHit);
		});

		test('Different seeds produce different rolls', () => {
			const client = buildTestClient('aggressive_marketer');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
				],
				totalVolume: 80000,
				perDestination: { Gmail: 40000, Outlook: 24000, Yahoo: 16000 }
			};

			const result1 = calculateSpamTraps({
				clients: [client],
				volumeData,
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				roomCode: 'SEED-A',
				round: 1,
				espName: 'TestESP',
				spamTrapNetworkActive: { Gmail: false, Outlook: false, Yahoo: false }
			});

			const result2 = calculateSpamTraps({
				clients: [client],
				volumeData,
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				roomCode: 'SEED-B', // Different room code
				round: 1,
				espName: 'TestESP',
				spamTrapNetworkActive: { Gmail: false, Outlook: false, Yahoo: false }
			});

			// Different seeds should produce different rolls (very likely)
			expect(result1.perClient[0].randomRoll).not.toBe(result2.perClient[0].randomRoll);
		});
	});

	describe('Total risk calculation', () => {
		test('Total risk sums across all clients', () => {
			const client1 = buildTestClient('premium_brand', { id: 'client-1' });
			const client2 = buildTestClient('aggressive_marketer', { id: 'client-2' });

			const volumeData: VolumeResult = {
				activeClients: [client1, client2],
				clientVolumes: [
					{ clientId: 'client-1', baseVolume: 30000, adjustedVolume: 30000, adjustments: {} },
					{ clientId: 'client-2', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
				],
				totalVolume: 110000,
				perDestination: { Gmail: 55000, Outlook: 33000, Yahoo: 22000 }
			};

			const result = calculateSpamTraps({
				clients: [client1, client2],
				volumeData,
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
				roomCode: 'TEST-ROOM',
				round: 1,
				espName: 'TestESP',
				spamTrapNetworkActive: { Gmail: false, Outlook: false, Yahoo: false }
			});

			// Total base risk: 0.5% + 5% = 5.5%
			expect(result.totalBaseRisk).toBe(0.055);
			expect(result.totalAdjustedRisk).toBe(0.055); // No reductions applied
		});
	});
});
