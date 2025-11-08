/**
 * Complaint Calculator Unit Tests
 * US 3.3: Resolution Phase Automation - Iteration 4 (Basic)
 * ATDD: Test-first approach
 */

import { describe, test, expect } from 'vitest';
import { calculateComplaints } from './complaint-calculator';
import { buildTestClient } from '../test-helpers/client-test-fixtures';
import type { VolumeResult } from '../resolution-types';

describe('Complaint Calculator - Iteration 4: Basic Complaint Tracking', () => {
	describe('Single client complaint rates', () => {
		test('single premium_brand client: 0.5% base rate', () => {
			const client = buildTestClient('premium_brand');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 30000, adjustedVolume: 30000, adjustments: {} }
				],
				totalVolume: 30000
			};

			const result = calculateComplaints({
				clients: [client],
				volumeData,
				clientStates: {
					[client.id]: {
						status: 'Active',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
					}
				},
				techStack: []
			});

			expect(result.baseComplaintRate).toBe(0.5);
			expect(result.perClient).toHaveLength(1);
			expect(result.perClient[0].baseRate).toBe(0.5);
		});

		test('single aggressive_marketer client: 3% base rate', () => {
			const client = buildTestClient('aggressive_marketer');
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{ clientId: client.id, baseVolume: 80000, adjustedVolume: 80000, adjustments: {} }
				],
				totalVolume: 80000
			};

			const result = calculateComplaints({
				clients: [client],
				volumeData,
				clientStates: {
					[client.id]: {
						status: 'Active',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
					}
				},
				techStack: []
			});

			expect(result.baseComplaintRate).toBe(3.0);
		});
	});

	describe('Volume-weighted complaint rates', () => {
		test('premium_brand (30K, 0.5%) + aggressive_marketer (80K, 3%) = 2.32%', () => {
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

			const result = calculateComplaints({
				clients: [premium, aggressive],
				volumeData,
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
				techStack: []
			});

			// Calculation: (30K × 0.5% + 80K × 3%) / 110K = (150 + 2400) / 110000 = 2.318...
			expect(result.baseComplaintRate).toBeCloseTo(2.32, 2);
		});

		test('premium_brand (30K, 0.5%) + re_engagement (50K, 2.5%) = 1.75%', () => {
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

			const result = calculateComplaints({
				clients: [premium, reengagement],
				volumeData,
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
				techStack: []
			});

			// Calculation: (30K × 0.5 + 50K × 2.5) / 80K = (15000 + 125000) / 80000 = 1.75
			expect(result.baseComplaintRate).toBe(1.75);
		});
	});

	describe('Per-client tracking', () => {
		test('tracks individual client rates and volumes', () => {
			const client1 = buildTestClient('premium_brand', { id: 'client-1' });
			const client2 = buildTestClient('growing_startup', { id: 'client-2' });

			const volumeData: VolumeResult = {
				activeClients: [client1, client2],
				clientVolumes: [
					{ clientId: 'client-1', baseVolume: 30000, adjustedVolume: 30000, adjustments: {} },
					{ clientId: 'client-2', baseVolume: 35000, adjustedVolume: 35000, adjustments: {} }
				],
				totalVolume: 65000
			};

			const result = calculateComplaints({
				clients: [client1, client2],
				volumeData,
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
				techStack: []
			});

			expect(result.perClient).toHaveLength(2);
			expect(result.perClient[0]).toEqual({
				clientId: 'client-1',
				baseRate: 0.5,
				adjustedRate: 0.5,
				volume: 30000
			});
			expect(result.perClient[1]).toEqual({
				clientId: 'client-2',
				baseRate: 1.2,
				adjustedRate: 1.2,
				volume: 35000
			});
		});
	});

	describe('Edge cases', () => {
		test('no clients: 0% complaint rate', () => {
			const volumeData: VolumeResult = {
				activeClients: [],
				clientVolumes: [],
				totalVolume: 0
			};

			const result = calculateComplaints({
				clients: [],
				volumeData,
				clientStates: {},
				techStack: []
			});

			expect(result.baseComplaintRate).toBe(0);
			expect(result.perClient).toHaveLength(0);
		});

		test('uses adjusted volume for weighting', () => {
			const client = buildTestClient('premium_brand', { id: 'client-1' });

			// Volume adjusted due to warmup (50% reduction)
			const volumeData: VolumeResult = {
				activeClients: [client],
				clientVolumes: [
					{
						clientId: 'client-1',
						baseVolume: 30000,
						adjustedVolume: 15000, // 50% reduced
						adjustments: { warmup: 15000 }
					}
				],
				totalVolume: 15000
			};

			const result = calculateComplaints({
				clients: [client],
				volumeData,
				clientStates: {
					[client.id]: {
						status: 'Active',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
					}
				},
				techStack: []
			});

			// Still 0.5% base rate
			expect(result.baseComplaintRate).toBe(0.5);
			expect(result.perClient[0].volume).toBe(15000);
		});
	});
});
