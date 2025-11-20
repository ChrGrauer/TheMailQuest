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
			// Warmup bonus (volume-weighted): (15k × +2 + 17.5k × +2) / 32.5k = 65k / 32.5k = +2.0
			expect(result.perDestination['Gmail'].warmupBonus).toBe(2);
			expect(result.perDestination['Gmail'].totalChange).toBeCloseTo(2.38, 2);
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
			// Warmup bonus (volume-weighted): (15k × +2) / 95k = 30k / 95k = +0.316
			expect(result.perDestination['Gmail'].warmupBonus).toBeCloseTo(0.32, 2);
			expect(result.perDestination['Gmail'].totalChange).toBeCloseTo(-2.74, 1); // -3.05 + 0.32 ≈ -2.74
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
