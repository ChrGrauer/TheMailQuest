/**
 * Reputation Calculator Unit Tests
 * US 3.3: Resolution Phase Automation - Iteration 3, 4, 5
 * ATDD: Test-first approach
 */

import { describe, test, expect } from 'vitest';
import { calculateReputationChanges } from './reputation-calculator';
import { buildTestClient } from '../test-helpers/client-test-fixtures';
import type { VolumeResult } from '../resolution-types';

// Helper for empty volume data (for Iteration 3 backward compatibility tests)
const emptyVolumeData: VolumeResult = {
	activeClients: [],
	clientVolumes: [],
	totalVolume: 0
};

describe('Reputation Calculator - Iteration 3: Authentication Impact', () => {
	describe('Tech stack reputation bonuses', () => {
		test('no tech = 0 bonus', () => {
			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['Gmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].techBonus).toBe(0);
			expect(result.perDestination['Gmail'].totalChange).toBe(0);
		});

		test('SPF only = +2 reputation', () => {
			const result = calculateReputationChanges({
				techStack: ['spf'],
				destinations: ['Gmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].techBonus).toBe(2);
			expect(result.perDestination['Gmail'].totalChange).toBe(2);
		});

		test('SPF + DKIM = +5 reputation', () => {
			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim'],
				destinations: ['Gmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].techBonus).toBe(5);
			expect(result.perDestination['Gmail'].totalChange).toBe(5);
		});

		test('full stack (SPF + DKIM + DMARC) = +10 reputation', () => {
			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim', 'dmarc'],
				destinations: ['Gmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].techBonus).toBe(10);
			expect(result.perDestination['Gmail'].totalChange).toBe(10);
		});

		test('DKIM only (without SPF) = +3 reputation', () => {
			// No dependency checking in calculator - that's handled elsewhere
			const result = calculateReputationChanges({
				techStack: ['dkim'],
				destinations: ['Gmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].techBonus).toBe(3);
			expect(result.perDestination['Gmail'].totalChange).toBe(3);
		});

		test('DMARC only (without dependencies) = +5 reputation', () => {
			// No dependency checking in calculator - that's handled elsewhere
			const result = calculateReputationChanges({
				techStack: ['dmarc'],
				destinations: ['Gmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].techBonus).toBe(5);
			expect(result.perDestination['Gmail'].totalChange).toBe(5);
		});

		test('empty tech array = 0 bonus', () => {
			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['Gmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].techBonus).toBe(0);
		});
	});

	describe('Per-destination reputation changes', () => {
		test('tech bonus applies to all destinations equally', () => {
			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim', 'dmarc'],
				destinations: ['Gmail', 'Outlook', 'Yahoo'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].techBonus).toBe(10);
			expect(result.perDestination['Outlook'].techBonus).toBe(10);
			expect(result.perDestination['Yahoo'].techBonus).toBe(10);

			expect(result.perDestination['Gmail'].totalChange).toBe(10);
			expect(result.perDestination['Outlook'].totalChange).toBe(10);
			expect(result.perDestination['Yahoo'].totalChange).toBe(10);
		});

		test('single destination receives bonus', () => {
			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim'],
				destinations: ['Gmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail']).toBeDefined();
			expect(result.perDestination['Gmail'].techBonus).toBe(5);
		});

		test('three destinations all receive same bonus', () => {
			const result = calculateReputationChanges({
				techStack: ['spf'],
				destinations: ['Gmail', 'Outlook', 'Yahoo'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(Object.keys(result.perDestination)).toHaveLength(3);
			expect(result.perDestination['Gmail'].techBonus).toBe(2);
			expect(result.perDestination['Outlook'].techBonus).toBe(2);
			expect(result.perDestination['Yahoo'].techBonus).toBe(2);
		});

		test('empty destinations array returns empty result', () => {
			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim'],
				destinations: [],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(Object.keys(result.perDestination)).toHaveLength(0);
		});
	});

	describe('Breakdown tracking', () => {
		test('breakdown includes tech bonus entry', () => {
			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim'],
				destinations: ['Gmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].breakdown).toContainEqual({
				source: 'Authentication Tech',
				value: 5
			});
		});

		test('breakdown shows 0 when no tech', () => {
			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['Gmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].breakdown).toContainEqual({
				source: 'Authentication Tech',
				value: 0
			});
		});

		test('multiple destinations each have their own breakdown', () => {
			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim', 'dmarc'],
				destinations: ['Gmail', 'Outlook'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].breakdown).toContainEqual({
				source: 'Authentication Tech',
				value: 10
			});
			expect(result.perDestination['Outlook'].breakdown).toContainEqual({
				source: 'Authentication Tech',
				value: 10
			});
		});
	});

	describe('Iteration 3: Placeholders for future iterations', () => {
		test('clientImpact is 0 (Iteration 4)', () => {
			const result = calculateReputationChanges({
				techStack: ['spf'],
				destinations: ['Gmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].clientImpact).toBe(0);
		});

		test('warmupBonus is 0 (Iteration 5)', () => {
			const result = calculateReputationChanges({
				techStack: ['spf'],
				destinations: ['Gmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].warmupBonus).toBe(0);
		});

		test('volumeWeightedClientImpact is 0 (Iteration 4)', () => {
			const result = calculateReputationChanges({
				techStack: ['spf'],
				destinations: ['Gmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.volumeWeightedClientImpact).toBe(0);
		});
	});
});

describe('Reputation Calculator - Iteration 4: Client Risk Impact', () => {
	describe('Single client risk impact', () => {
		test('single Low risk client: +2 reputation', () => {
			const client = buildTestClient('premium_brand');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 30000, adjustedVolume: 30000, adjustments: {} }
				],
				totalVolume: 30000
			};

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['Gmail'],
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
					}
				},
				volumeData,
				currentRound: 1
			});

			expect(result.volumeWeightedClientImpact).toBe(2);
			expect(result.perDestination['Gmail'].clientImpact).toBe(2);
			expect(result.perDestination['Gmail'].totalChange).toBe(2); // Tech (0) + Client (2)
		});

		test('single Medium risk client: -1 reputation', () => {
			const client = buildTestClient('growing_startup');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 35000, adjustedVolume: 35000, adjustments: {} }
				],
				totalVolume: 35000
			};

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['Gmail'],
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
					}
				},
				volumeData,
				currentRound: 1
			});

			expect(result.volumeWeightedClientImpact).toBe(-1);
			expect(result.perDestination['Gmail'].clientImpact).toBe(-1);
			expect(result.perDestination['Gmail'].totalChange).toBe(-1);
		});

		test('single High risk client: -4 reputation', () => {
			const client = buildTestClient('aggressive_marketer');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
				],
				totalVolume: 80000
			};

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['Gmail'],
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
					}
				},
				volumeData,
				currentRound: 1
			});

			expect(result.volumeWeightedClientImpact).toBe(-4);
			expect(result.perDestination['Gmail'].clientImpact).toBe(-4);
			expect(result.perDestination['Gmail'].totalChange).toBe(-4);
		});
	});

	describe('Volume-weighted mixed risk portfolio', () => {
		test('premium_brand (30K Low) + aggressive_marketer (80K High) = -2.36', () => {
			const premium = buildTestClient('premium_brand', { id: 'client-1' });
			const aggressive = buildTestClient('aggressive_marketer', { id: 'client-2' });

			const volumeData: VolumeResult = {
				activeClients: [premium, aggressive],
				clientVolumes: [
					{ clientId: 'client-1', baseVolume: 30000, adjustedVolume: 30000, adjustments: {} },
					{ clientId: 'client-2', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
				],
				totalVolume: 110000
			};

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['Gmail'],
				clients: [premium, aggressive],
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
				},
				volumeData,
				currentRound: 1
			});

			// Calculation: (30K × +2 + 80K × -4) / 110K = (60000 - 320000) / 110000 = -2.36...
			expect(result.volumeWeightedClientImpact).toBeCloseTo(-2.36, 2);
			expect(result.perDestination['Gmail'].clientImpact).toBeCloseTo(-2.36, 2);
		});

		test('premium_brand (30K) + re_engagement (50K High) = -1.75', () => {
			const premium = buildTestClient('premium_brand', { id: 'client-1' });
			const reengagement = buildTestClient('re_engagement', { id: 'client-2' });

			const volumeData: VolumeResult = {
				activeClients: [premium, reengagement],
				clientVolumes: [
					{ clientId: 'client-1', baseVolume: 30000, adjustedVolume: 30000, adjustments: {} },
					{ clientId: 'client-2', baseVolume: 50000, adjustedVolume: 50000, adjustments: {} }
				],
				totalVolume: 80000
			};

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['Gmail'],
				clients: [premium, reengagement],
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
				},
				volumeData,
				currentRound: 1
			});

			// Calculation: (30K × +2 + 50K × -4) / 80K = (60000 - 200000) / 80000 = -1.75
			expect(result.volumeWeightedClientImpact).toBe(-1.75);
			expect(result.perDestination['Gmail'].clientImpact).toBe(-1.75);
		});

		test('three Medium risk clients: -1 reputation', () => {
			const client1 = buildTestClient('growing_startup', { id: 'client-1' });
			const client2 = buildTestClient('growing_startup', { id: 'client-2' });
			const client3 = buildTestClient('event_seasonal', { id: 'client-3' });

			const volumeData: VolumeResult = {
				activeClients: [client1, client2, client3],
				clientVolumes: [
					{ clientId: 'client-1', baseVolume: 35000, adjustedVolume: 35000, adjustments: {} },
					{ clientId: 'client-2', baseVolume: 35000, adjustedVolume: 35000, adjustments: {} },
					{ clientId: 'client-3', baseVolume: 40000, adjustedVolume: 40000, adjustments: {} }
				],
				totalVolume: 110000
			};

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['Gmail'],
				clients: [client1, client2, client3],
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
					},
					'client-3': {
						status: 'Active',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
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
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 30000, adjustedVolume: 30000, adjustments: {} }
				],
				totalVolume: 30000
			};

			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim', 'dmarc'],
				destinations: ['Gmail'],
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
					}
				},
				volumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].techBonus).toBe(10);
			expect(result.perDestination['Gmail'].clientImpact).toBe(2);
			expect(result.perDestination['Gmail'].totalChange).toBe(12);
		});

		test('SPF+DKIM (+5) + mixed portfolio (-2.36) = +2.64 total', () => {
			const premium = buildTestClient('premium_brand', { id: 'client-1' });
			const aggressive = buildTestClient('aggressive_marketer', { id: 'client-2' });

			const volumeData: VolumeResult = {
				activeClients: [premium, aggressive],
				clientVolumes: [
					{ clientId: 'client-1', baseVolume: 30000, adjustedVolume: 30000, adjustments: {} },
					{ clientId: 'client-2', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
				],
				totalVolume: 110000
			};

			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim'],
				destinations: ['Gmail'],
				clients: [premium, aggressive],
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
				},
				volumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].techBonus).toBe(5);
			expect(result.perDestination['Gmail'].clientImpact).toBeCloseTo(-2.36, 2);
			expect(result.perDestination['Gmail'].totalChange).toBeCloseTo(2.64, 2);
		});

		test('no auth + 3 High risk clients = -4 reputation disaster', () => {
			const client1 = buildTestClient('aggressive_marketer', { id: 'client-1' });
			const client2 = buildTestClient('aggressive_marketer', { id: 'client-2' });
			const client3 = buildTestClient('re_engagement', { id: 'client-3' });

			const volumeData: VolumeResult = {
				activeClients: [client1, client2, client3],
				clientVolumes: [
					{ clientId: 'client-1', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} },
					{ clientId: 'client-2', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} },
					{ clientId: 'client-3', baseVolume: 50000, adjustedVolume: 50000, adjustments: {} }
				],
				totalVolume: 210000
			};

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['Gmail'],
				clients: [client1, client2, client3],
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
					},
					'client-3': {
						status: 'Active',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
					}
				},
				volumeData,
				currentRound: 1
			});

			// All High risk: -4 impact regardless of volume distribution
			expect(result.volumeWeightedClientImpact).toBe(-4);
			expect(result.perDestination['Gmail'].totalChange).toBe(-4);
		});
	});

	describe('Multiple destinations', () => {
		test('client impact applies equally to all destinations', () => {
			const premium = buildTestClient('premium_brand', { id: 'client-1' });
			const aggressive = buildTestClient('aggressive_marketer', { id: 'client-2' });

			const volumeData: VolumeResult = {
				activeClients: [premium, aggressive],
				clientVolumes: [
					{ clientId: 'client-1', baseVolume: 30000, adjustedVolume: 30000, adjustments: {} },
					{ clientId: 'client-2', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
				],
				totalVolume: 110000
			};

			const result = calculateReputationChanges({
				techStack: ['spf'],
				destinations: ['Gmail', 'Outlook', 'Yahoo'],
				clients: [premium, aggressive],
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
				},
				volumeData,
				currentRound: 1
			});

			// All destinations get same client impact
			expect(result.perDestination['Gmail'].clientImpact).toBeCloseTo(-2.36, 2);
			expect(result.perDestination['Outlook'].clientImpact).toBeCloseTo(-2.36, 2);
			expect(result.perDestination['Yahoo'].clientImpact).toBeCloseTo(-2.36, 2);

			// All destinations get same total (tech 2 + client -2.36)
			expect(result.perDestination['Gmail'].totalChange).toBeCloseTo(-0.36, 2);
			expect(result.perDestination['Outlook'].totalChange).toBeCloseTo(-0.36, 2);
			expect(result.perDestination['Yahoo'].totalChange).toBeCloseTo(-0.36, 2);
		});
	});

	describe('Breakdown tracking', () => {
		test('breakdown includes both tech and client impact', () => {
			const client = buildTestClient('premium_brand');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 30000, adjustedVolume: 30000, adjustments: {} }
				],
				totalVolume: 30000
			};

			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim'],
				destinations: ['Gmail'],
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
					}
				},
				volumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].breakdown).toEqual([
				{ source: 'Authentication Tech', value: 5 },
				{ source: 'Client Risk', value: 2 },
				{ source: 'Warmup Bonus', value: 0 }
			]);
		});

		test('breakdown shows negative client impact', () => {
			const client = buildTestClient('aggressive_marketer');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
				],
				totalVolume: 80000
			};

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['Gmail'],
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
					}
				},
				volumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].breakdown).toEqual([
				{ source: 'Authentication Tech', value: 0 },
				{ source: 'Client Risk', value: -4 },
				{ source: 'Warmup Bonus', value: 0 }
			]);
		});
	});

	describe('Edge cases', () => {
		test('no active clients: 0 client impact', () => {
			const volumeData: VolumeResult = {
				activeClients: [],
				clientVolumes: [],
				totalVolume: 0
			};

			const result = calculateReputationChanges({
				techStack: ['spf'],
				destinations: ['Gmail'],
				clients: [],
				clientStates: {},
				volumeData,
				currentRound: 1
			});

			expect(result.volumeWeightedClientImpact).toBe(0);
			expect(result.perDestination['Gmail'].clientImpact).toBe(0);
			expect(result.perDestination['Gmail'].totalChange).toBe(2); // Only tech bonus
		});

		test('paused client excluded from calculation', () => {
			const activeClient = buildTestClient('premium_brand', { id: 'client-1' });
			const pausedClient = buildTestClient('aggressive_marketer', { id: 'client-2' });

			const volumeData: VolumeResult = {
				activeClients: [activeClient],
				clientVolumes: [
					{ clientId: 'client-1', baseVolume: 30000, adjustedVolume: 30000, adjustments: {} }
				],
				totalVolume: 30000
			};

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['Gmail'],
				clients: [activeClient, pausedClient],
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
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{
						clientId: 'client-1',
						baseVolume: 30000,
						adjustedVolume: 15000, // 50% reduced by warmup
						adjustments: { warmup: 15000 }
					}
				],
				totalVolume: 15000
			};

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['Gmail'],
				clients: [client],
				clientStates: {
					'client-1': {
						status: 'Active',
						has_warmup: true,
						has_list_hygiene: false,
						first_active_round: 1
					}
				},
				volumeData,
				currentRound: 1
			});

			// Impact calculated using adjusted volume (15K), not base volume
			expect(result.volumeWeightedClientImpact).toBe(2); // Still +2 for Low risk
			expect(result.perDestination['Gmail'].clientImpact).toBe(2);
		});
	});
});

describe('Reputation Calculator - Iteration 5: Warmup Bonus', () => {
	describe('Single warmed client', () => {
		test('warmed Low risk client: tech bonus + client impact + warmup bonus', () => {
			const client = buildTestClient('premium_brand'); // Low risk = +2
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{
						clientId: client.id,
						baseVolume: 30000,
						adjustedVolume: 15000,
						adjustments: { warmup: 15000 }
					}
				],
				totalVolume: 15000
			};

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['Gmail'],
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						has_warmup: true,
						has_list_hygiene: false,
						first_active_round: 1
					}
				},
				volumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].techBonus).toBe(0);
			expect(result.perDestination['Gmail'].clientImpact).toBe(2); // Low risk
			expect(result.perDestination['Gmail'].warmupBonus).toBe(2); // +2 per warmed client
			expect(result.perDestination['Gmail'].totalChange).toBe(4); // 0 + 2 + 2
		});

		test('warmed High risk client: reputation impact mitigated', () => {
			const client = buildTestClient('aggressive_marketer'); // High risk = -4
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{
						clientId: client.id,
						baseVolume: 80000,
						adjustedVolume: 40000,
						adjustments: { warmup: 40000 }
					}
				],
				totalVolume: 40000
			};

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['Gmail'],
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						has_warmup: true,
						has_list_hygiene: false,
						first_active_round: 1
					}
				},
				volumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].clientImpact).toBe(-4);
			expect(result.perDestination['Gmail'].warmupBonus).toBe(2);
			expect(result.perDestination['Gmail'].totalChange).toBe(-2); // -4 + 2 = -2
		});

		test('warmed Medium risk client: net positive reputation', () => {
			const client = buildTestClient('event_seasonal'); // Medium risk = -1
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{
						clientId: client.id,
						baseVolume: 40000,
						adjustedVolume: 18000,
						adjustments: { warmup: 18000, listHygiene: 4000 }
					}
				],
				totalVolume: 18000
			};

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['Gmail'],
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						has_warmup: true,
						has_list_hygiene: true,
						first_active_round: 1
					}
				},
				volumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].clientImpact).toBe(-1);
			expect(result.perDestination['Gmail'].warmupBonus).toBe(2);
			expect(result.perDestination['Gmail'].totalChange).toBe(1); // -1 + 2 = +1
		});
	});

	describe('Multiple warmed clients', () => {
		test('two warmed clients: +4 warmup bonus (2 per client)', () => {
			const client1 = buildTestClient('premium_brand', { id: 'client-1' });
			const client2 = buildTestClient('growing_startup', { id: 'client-2' });

			const volumeData: VolumeResult = {
				activeClients: [client1, client2],
				clientVolumes: [
					{
						clientId: 'client-1',
						baseVolume: 30000,
						adjustedVolume: 15000,
						adjustments: { warmup: 15000 }
					},
					{
						clientId: 'client-2',
						baseVolume: 35000,
						adjustedVolume: 17500,
						adjustments: { warmup: 17500 }
					}
				],
				totalVolume: 32500
			};

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['Gmail'],
				clients: [client1, client2],
				clientStates: {
					'client-1': {
						status: 'Active',
						has_warmup: true,
						has_list_hygiene: false,
						first_active_round: 1
					},
					'client-2': {
						status: 'Active',
						has_warmup: true,
						has_list_hygiene: false,
						first_active_round: 1
					}
				},
				volumeData,
				currentRound: 1
			});

			// Client impact: (15K × +2 + 17.5K × -1) / 32.5K = (30 - 17.5) / 32.5 = +0.38
			expect(result.volumeWeightedClientImpact).toBeCloseTo(0.38, 2);
			expect(result.perDestination['Gmail'].warmupBonus).toBe(4); // 2 clients × +2
			expect(result.perDestination['Gmail'].totalChange).toBeCloseTo(4.38, 2);
		});

		test('mixed: one warmed, one not', () => {
			const warmed = buildTestClient('premium_brand', { id: 'client-1' });
			const notWarmed = buildTestClient('aggressive_marketer', { id: 'client-2' });

			const volumeData: VolumeResult = {
				activeClients: [warmed, notWarmed],
				clientVolumes: [
					{
						clientId: 'client-1',
						baseVolume: 30000,
						adjustedVolume: 15000,
						adjustments: { warmup: 15000 }
					},
					{ clientId: 'client-2', baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
				],
				totalVolume: 95000
			};

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['Gmail'],
				clients: [warmed, notWarmed],
				clientStates: {
					'client-1': {
						status: 'Active',
						has_warmup: true,
						has_list_hygiene: false,
						first_active_round: 1
					},
					'client-2': {
						status: 'Active',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
					}
				},
				volumeData,
				currentRound: 1
			});

			// Client impact: (15K × +2 + 80K × -4) / 95K = (30 - 320) / 95 = -3.05
			expect(result.volumeWeightedClientImpact).toBeCloseTo(-3.05, 2);
			expect(result.perDestination['Gmail'].warmupBonus).toBe(2); // Only 1 warmed client
			expect(result.perDestination['Gmail'].totalChange).toBeCloseTo(-1.05, 2); // -3.05 + 2
		});
	});

	describe('Combined tech stack + client risk + warmup', () => {
		test('full auth stack + warmed Low risk client = +14 reputation', () => {
			const client = buildTestClient('premium_brand');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{
						clientId: client.id,
						baseVolume: 30000,
						adjustedVolume: 15000,
						adjustments: { warmup: 15000 }
					}
				],
				totalVolume: 15000
			};

			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim', 'dmarc'],
				destinations: ['Gmail'],
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						has_warmup: true,
						has_list_hygiene: false,
						first_active_round: 1
					}
				},
				volumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].techBonus).toBe(10);
			expect(result.perDestination['Gmail'].clientImpact).toBe(2);
			expect(result.perDestination['Gmail'].warmupBonus).toBe(2);
			expect(result.perDestination['Gmail'].totalChange).toBe(14); // 10 + 2 + 2
		});

		test('re_engagement with warmup + list hygiene + tech', () => {
			const client = buildTestClient('re_engagement'); // High risk
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{
						clientId: client.id,
						baseVolume: 50000,
						adjustedVolume: 21250,
						adjustments: { listHygiene: 7500, warmup: 21250 }
					}
				],
				totalVolume: 21250
			};

			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim'],
				destinations: ['Gmail'],
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						has_warmup: true,
						has_list_hygiene: true,
						first_active_round: 1
					}
				},
				volumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].techBonus).toBe(5); // SPF + DKIM
			expect(result.perDestination['Gmail'].clientImpact).toBe(-4); // High risk
			expect(result.perDestination['Gmail'].warmupBonus).toBe(2);
			expect(result.perDestination['Gmail'].totalChange).toBe(3); // 5 - 4 + 2 = 3
		});
	});

	describe('Multiple destinations', () => {
		test('warmup bonus applies to all destinations equally', () => {
			const client = buildTestClient('premium_brand');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{
						clientId: client.id,
						baseVolume: 30000,
						adjustedVolume: 15000,
						adjustments: { warmup: 15000 }
					}
				],
				totalVolume: 15000
			};

			const result = calculateReputationChanges({
				techStack: ['spf'],
				destinations: ['Gmail', 'Outlook', 'Yahoo'],
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						has_warmup: true,
						has_list_hygiene: false,
						first_active_round: 1
					}
				},
				volumeData,
				currentRound: 1
			});

			// All destinations get same warmup bonus
			expect(result.perDestination['Gmail'].warmupBonus).toBe(2);
			expect(result.perDestination['Outlook'].warmupBonus).toBe(2);
			expect(result.perDestination['Yahoo'].warmupBonus).toBe(2);

			// Total: tech (2) + client (2) + warmup (2) = 6
			expect(result.perDestination['Gmail'].totalChange).toBe(6);
			expect(result.perDestination['Outlook'].totalChange).toBe(6);
			expect(result.perDestination['Yahoo'].totalChange).toBe(6);
		});
	});

	describe('Breakdown tracking', () => {
		test('breakdown includes all three components', () => {
			const client = buildTestClient('premium_brand');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{
						clientId: client.id,
						baseVolume: 30000,
						adjustedVolume: 15000,
						adjustments: { warmup: 15000 }
					}
				],
				totalVolume: 15000
			};

			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim'],
				destinations: ['Gmail'],
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						has_warmup: true,
						has_list_hygiene: false,
						first_active_round: 1
					}
				},
				volumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].breakdown).toEqual([
				{ source: 'Authentication Tech', value: 5 },
				{ source: 'Client Risk', value: 2 },
				{ source: 'Warmup Bonus', value: 2 }
			]);
		});
	});

	describe('Edge cases', () => {
		test('no warmed clients: warmup bonus is 0', () => {
			const client = buildTestClient('premium_brand');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 30000, adjustedVolume: 30000, adjustments: {} }
				],
				totalVolume: 30000
			};

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['Gmail'],
				clients: [client],
				clientStates: {
					[client.id]: {
						status: 'Active',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
					}
				},
				volumeData,
				currentRound: 1
			});

			expect(result.perDestination['Gmail'].warmupBonus).toBe(0);
			expect(result.perDestination['Gmail'].totalChange).toBe(2); // Only client impact
		});

		test('warmup client but paused: no warmup bonus', () => {
			const activeClient = buildTestClient('premium_brand', { id: 'client-1' });
			const pausedWarmupClient = buildTestClient('growing_startup', { id: 'client-2' });

			const volumeData: VolumeResult = {
				activeClients: [activeClient],
				clientVolumes: [
					{ clientId: 'client-1', baseVolume: 30000, adjustedVolume: 30000, adjustments: {} }
				],
				totalVolume: 30000
			};

			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['Gmail'],
				clients: [activeClient, pausedWarmupClient],
				clientStates: {
					'client-1': {
						status: 'Active',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
					},
					'client-2': {
						status: 'Paused',
						has_warmup: true,
						has_list_hygiene: false,
						first_active_round: 1
					}
				},
				volumeData,
				currentRound: 1
			});

			// Only count active warmed clients
			expect(result.perDestination['Gmail'].warmupBonus).toBe(0);
		});
	});
});
