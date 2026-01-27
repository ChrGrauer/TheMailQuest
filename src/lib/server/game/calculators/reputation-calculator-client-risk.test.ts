/**
 * Reputation Calculator Unit Tests
 * US 3.3: Resolution Phase Automation - Iteration 3, 4, 5
 * ATDD: Test-first approach
 */

import { describe, test, expect } from 'vitest';
import { calculateReputationChanges } from './reputation-calculator';
import { buildTestClient, buildVolumeResult } from '../test-helpers/client-test-fixtures';

// Helper for empty volume data (for Iteration 3 backward compatibility tests)
const emptyVolumeData = buildVolumeResult([], []);
describe('Reputation Calculator - Iteration 4: Client Risk Impact', () => {
	describe('Single client risk impact', () => {
		test('single Low risk client: +2 reputation', () => {
			const client = buildTestClient('premium_brand');
			const volumeData = buildVolumeResult(
				[client],
				[{ clientId: client.id, baseVolume: 30000, adjustedVolume: 30000, adjustments: {} }]
			);

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['zmail'],
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				volumeData,
				currentRound: 1
			});

			expect(result.volumeWeightedClientImpact).toBe(2);
			expect(result.perDestination['zmail'].clientImpact).toBe(2);
			expect(result.perDestination['zmail'].totalChange).toBe(2); // Tech (0) + Client (2)
		});

		test('single Medium risk client: -1 reputation', () => {
			const client = buildTestClient('growing_startup');
			const volumeData = buildVolumeResult(
				[client],
				[{ clientId: client.id, baseVolume: 35000, adjustedVolume: 35000, adjustments: {} }]
			);

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['zmail'],
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				volumeData,
				currentRound: 1
			});

			expect(result.volumeWeightedClientImpact).toBe(-1);
			expect(result.perDestination['zmail'].clientImpact).toBe(-1);
			expect(result.perDestination['zmail'].totalChange).toBe(-1);
		});

		test('single High risk client: -4 reputation', () => {
			const client = buildTestClient('aggressive_marketer');
			const volumeData = buildVolumeResult(
				[client],
				[{ clientId: client.id, baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }]
			);

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['zmail'],
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				volumeData,
				currentRound: 1
			});

			expect(result.volumeWeightedClientImpact).toBe(-4);
			expect(result.perDestination['zmail'].clientImpact).toBe(-4);
			expect(result.perDestination['zmail'].totalChange).toBe(-4);
		});
	});

	describe('Volume-weighted mixed risk portfolio', () => {
		test('premium_brand (30K Low) + aggressive_marketer (80K High) = -2.36', () => {
			const premium = buildTestClient('premium_brand', { id: 'client-1' });
			const aggressive = buildTestClient('aggressive_marketer', { id: 'client-2' });

			const volumeData = buildVolumeResult(
				[premium, aggressive],
				[
					{ clientId: 'client-1', baseVolume: 30000, adjustedVolume: 30000, adjustments: {} },
					{ clientId: 'client-2', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
				]
			);

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['zmail'],
				clients: [premium, aggressive],
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
				volumeData,
				currentRound: 1
			});

			// Calculation: (30K × +2 + 80K × -4) / 110K = (60000 - 320000) / 110000 = -2.36...
			expect(result.volumeWeightedClientImpact).toBeCloseTo(-2.36, 2);
			expect(result.perDestination['zmail'].clientImpact).toBeCloseTo(-2.36, 2);
		});

		test('premium_brand (30K) + re_engagement (50K High) = -1.75', () => {
			const premium = buildTestClient('premium_brand', { id: 'client-1' });
			const reengagement = buildTestClient('re_engagement', { id: 'client-2' });

			const volumeData = buildVolumeResult(
				[premium, reengagement],
				[
					{ clientId: 'client-1', baseVolume: 30000, adjustedVolume: 30000, adjustments: {} },
					{ clientId: 'client-2', baseVolume: 50000, adjustedVolume: 50000, adjustments: {} }
				]
			);

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['zmail'],
				clients: [premium, reengagement],
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
				volumeData,
				currentRound: 1
			});

			// Calculation: (30K × +2 + 50K × -4) / 80K = (60000 - 200000) / 80000 = -1.75
			expect(result.volumeWeightedClientImpact).toBe(-1.75);
			expect(result.perDestination['zmail'].clientImpact).toBe(-1.75);
		});

		test('three Medium risk clients: -1 reputation', () => {
			const client1 = buildTestClient('growing_startup', { id: 'client-1' });
			const client2 = buildTestClient('growing_startup', { id: 'client-2' });
			const client3 = buildTestClient('event_seasonal', { id: 'client-3' });

			const volumeData = buildVolumeResult(
				[client1, client2, client3],
				[
					{ clientId: 'client-1', baseVolume: 35000, adjustedVolume: 35000, adjustments: {} },
					{ clientId: 'client-2', baseVolume: 35000, adjustedVolume: 35000, adjustments: {} },
					{ clientId: 'client-3', baseVolume: 40000, adjustedVolume: 40000, adjustments: {} }
				]
			);

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['zmail'],
				clients: [client1, client2, client3],
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
					},
					'client-3': {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				volumeData,
				currentRound: 1
			});

			// All Medium risk: -1 impact regardless of volume
			expect(result.volumeWeightedClientImpact).toBe(-1);
		});
	});

	describe('Combined tech stack and client risk', () => {
		test('full auth stack (+10) + Low risk client (+2) = +12 total', () => {
			const client = buildTestClient('premium_brand');
			const volumeData = buildVolumeResult(
				[client],
				[{ clientId: client.id, baseVolume: 30000, adjustedVolume: 30000, adjustments: {} }]
			);

			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim', 'dmarc'],
				destinations: ['zmail'],
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				volumeData,
				currentRound: 1
			});

			expect(result.perDestination['zmail'].techBonus).toBe(10);
			expect(result.perDestination['zmail'].clientImpact).toBe(2);
			expect(result.perDestination['zmail'].totalChange).toBe(12);
		});

		test('SPF+DKIM (+5) + mixed portfolio (-2.36) = +2.64 total', () => {
			const premium = buildTestClient('premium_brand', { id: 'client-1' });
			const aggressive = buildTestClient('aggressive_marketer', { id: 'client-2' });

			const volumeData = buildVolumeResult(
				[premium, aggressive],
				[
					{ clientId: 'client-1', baseVolume: 30000, adjustedVolume: 30000, adjustments: {} },
					{ clientId: 'client-2', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
				]
			);

			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim'],
				destinations: ['zmail'],
				clients: [premium, aggressive],
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
				volumeData,
				currentRound: 1
			});

			expect(result.perDestination['zmail'].techBonus).toBe(5);
			expect(result.perDestination['zmail'].clientImpact).toBeCloseTo(-2.36, 2);
			expect(result.perDestination['zmail'].totalChange).toBeCloseTo(2.64, 2);
		});

		test('no auth + 3 High risk clients = -4 reputation disaster', () => {
			const client1 = buildTestClient('aggressive_marketer', { id: 'client-1' });
			const client2 = buildTestClient('aggressive_marketer', { id: 'client-2' });
			const client3 = buildTestClient('re_engagement', { id: 'client-3' });

			const volumeData = buildVolumeResult(
				[client1, client2, client3],
				[
					{ clientId: 'client-1', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} },
					{ clientId: 'client-2', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} },
					{ clientId: 'client-3', baseVolume: 50000, adjustedVolume: 50000, adjustments: {} }
				]
			);

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['zmail'],
				clients: [client1, client2, client3],
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
					},
					'client-3': {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				volumeData,
				currentRound: 1
			});

			// All High risk: -4 impact regardless of volume distribution
			expect(result.volumeWeightedClientImpact).toBe(-4);
			expect(result.perDestination['zmail'].totalChange).toBe(-4);
		});
	});

	describe('Multiple destinations', () => {
		test('client impact applies equally to all destinations', () => {
			const premium = buildTestClient('premium_brand', { id: 'client-1' });
			const aggressive = buildTestClient('aggressive_marketer', { id: 'client-2' });

			const volumeData = buildVolumeResult(
				[premium, aggressive],
				[
					{ clientId: 'client-1', baseVolume: 30000, adjustedVolume: 30000, adjustments: {} },
					{ clientId: 'client-2', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
				]
			);

			const result = calculateReputationChanges({
				techStack: ['spf'],
				destinations: ['zmail', 'intake', 'yagle'],
				clients: [premium, aggressive],
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
				volumeData,
				currentRound: 1
			});

			// All destinations get same client impact
			expect(result.perDestination['zmail'].clientImpact).toBeCloseTo(-2.36, 2);
			expect(result.perDestination['intake'].clientImpact).toBeCloseTo(-2.36, 2);
			expect(result.perDestination['yagle'].clientImpact).toBeCloseTo(-2.36, 2);

			// All destinations get same total (tech 2 + client -2.36)
			expect(result.perDestination['zmail'].totalChange).toBeCloseTo(-0.36, 2);
			expect(result.perDestination['intake'].totalChange).toBeCloseTo(-0.36, 2);
			expect(result.perDestination['yagle'].totalChange).toBeCloseTo(-0.36, 2);
		});
	});

	describe('Breakdown tracking', () => {
		test('breakdown includes both tech and client impact', () => {
			const client = buildTestClient('premium_brand');
			const volumeData = buildVolumeResult(
				[client],
				[{ clientId: client.id, baseVolume: 30000, adjustedVolume: 30000, adjustments: {} }]
			);

			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim'],
				destinations: ['zmail'],
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				volumeData,
				currentRound: 1
			});

			expect(result.perDestination['zmail'].breakdown).toEqual([
				{ source: 'Authentication Tech', value: 5 },
				{ source: 'Client Risk', value: 2 },
				{ source: 'Warmup Bonus', value: 0 }
			]);
		});

		test('breakdown shows negative client impact', () => {
			const client = buildTestClient('aggressive_marketer');
			const volumeData = buildVolumeResult(
				[client],
				[{ clientId: client.id, baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }]
			);

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['zmail'],
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				},
				volumeData,
				currentRound: 1
			});

			expect(result.perDestination['zmail'].breakdown).toEqual([
				{ source: 'Authentication Tech', value: 0 },
				{ source: 'Client Risk', value: -4 },
				{ source: 'Warmup Bonus', value: 0 }
			]);
		});
	});

	describe('Edge cases', () => {
		test('no active clients: 0 client impact', () => {
			const volumeData = buildVolumeResult([], []);

			const result = calculateReputationChanges({
				techStack: ['spf'],
				destinations: ['zmail'],
				clients: [],
				clientStates: {},
				volumeData,
				currentRound: 1
			});

			expect(result.volumeWeightedClientImpact).toBe(0);
			expect(result.perDestination['zmail'].clientImpact).toBe(0);
			expect(result.perDestination['zmail'].totalChange).toBe(2); // Only tech bonus
		});

		test('paused client excluded from calculation', () => {
			const activeClient = buildTestClient('premium_brand', { id: 'client-1' });
			const pausedClient = buildTestClient('aggressive_marketer', { id: 'client-2' });

			const volumeData = buildVolumeResult(
				[activeClient],
				[{ clientId: 'client-1', baseVolume: 30000, adjustedVolume: 30000, adjustments: {} }]
			);

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['zmail'],
				clients: [activeClient, pausedClient],
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
					}
				},
				volumeData,
				currentRound: 1
			});

			// Only active client counted (Low risk = +2)
			expect(result.volumeWeightedClientImpact).toBe(2);
		});

		test('adjusted volume (with warmup) used for weighting', () => {
			const client = buildTestClient('premium_brand', { id: 'client-1' });

			// Volume adjusted due to warmup (50% reduction)
			const volumeData = buildVolumeResult(
				[client],
				[
					{
						clientId: 'client-1',
						baseVolume: 30000,
						adjustedVolume: 15000, // 50% reduced by warmup
						adjustments: { warmup: 15000 }
					}
				]
			);

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['zmail'],
				clients: [client],
				clientStates: {
					'client-1': {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [
							{ id: 'warmup', source: 'warmup', multiplier: 0.5, applicableRounds: [1] }
						],
						spamTrapModifiers: []
					}
				},
				volumeData,
				currentRound: 1
			});

			// Impact calculated using adjusted volume (15K), not base volume
			expect(result.volumeWeightedClientImpact).toBe(2); // Still +2 for Low risk
			expect(result.perDestination['zmail'].clientImpact).toBe(2);
		});
	});
});
