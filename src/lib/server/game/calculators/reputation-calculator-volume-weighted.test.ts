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
describe('Reputation Calculator - Phase 2.2.1: Volume-Weighted Warmup Bonus', () => {
	test('small warmed client + large unwarmed client: warmup bonus proportional to warmed volume', () => {
		const warmed = buildTestClient('premium_brand', { id: 'client-1' }); // Low risk +2
		const unwarmed = buildTestClient('premium_brand', { id: 'client-2' }); // Low risk +2

		const volumeData: VolumeResult = {
			activeClients: [warmed, unwarmed],
			clientVolumes: [
				{
					clientId: 'client-1',
					baseVolume: 30000,
					adjustedVolume: 15000, // Warmed: 50% reduction
					adjustments: { warmup: 15000 },
					perDestination: { zmail: 7500, intake: 4500, yagle: 3000 }
				},
				{
					clientId: 'client-2',
					baseVolume: 85000,
					adjustedVolume: 85000, // Not warmed
					adjustments: {},
					perDestination: { zmail: 42500, intake: 25500, yagle: 17000 }
				}
			],
			totalVolume: 100000, // 15k + 85k
			perDestination: { zmail: 50000, intake: 30000, yagle: 20000 }
		};

		const result = calculateReputationChanges({
			techStack: [],
			destinations: ['zmail'],
			clients: [warmed, unwarmed],
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
					volumeModifiers: [],
					spamTrapModifiers: []
				}
			},
			volumeData,
			currentRound: 1
		});

		// Client impact: (15k × +2 + 85k × +2) / 100k = 200k / 100k = +2
		expect(result.volumeWeightedClientImpact).toBe(2);

		// Warmup bonus: (15k × +2) / 100k = 30k / 100k = +0.3
		// Only the warmed client contributes to warmup bonus, proportional to its volume
		expect(result.perDestination['zmail'].warmupBonus).toBeCloseTo(0.3, 2);

		// Total: +2 (client impact) + 0.3 (warmup) = +2.3
		expect(result.perDestination['zmail'].totalChange).toBeCloseTo(2.3, 2);
	});

	test('large warmed client + small unwarmed client: warmup bonus weighted toward warmed volume', () => {
		const warmed = buildTestClient('premium_brand', { id: 'client-1' }); // Low risk +2
		const unwarmed = buildTestClient('aggressive_marketer', { id: 'client-2' }); // High risk -4

		const volumeData: VolumeResult = {
			activeClients: [warmed, unwarmed],
			clientVolumes: [
				{
					clientId: 'client-1',
					baseVolume: 100000,
					adjustedVolume: 50000, // Warmed: 50% reduction
					adjustments: { warmup: 50000 },
					perDestination: { zmail: 25000, intake: 15000, yagle: 10000 }
				},
				{
					clientId: 'client-2',
					baseVolume: 10000,
					adjustedVolume: 10000, // Not warmed
					adjustments: {},
					perDestination: { zmail: 5000, intake: 3000, yagle: 2000 }
				}
			],
			totalVolume: 60000, // 50k + 10k
			perDestination: { zmail: 30000, intake: 18000, yagle: 12000 }
		};

		const result = calculateReputationChanges({
			techStack: [],
			destinations: ['zmail'],
			clients: [warmed, unwarmed],
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
					volumeModifiers: [],
					spamTrapModifiers: []
				}
			},
			volumeData,
			currentRound: 1
		});

		// Client impact: (50k × +2 + 10k × -4) / 60k = (100k - 40k) / 60k = +1.0
		expect(result.volumeWeightedClientImpact).toBe(1);

		// Warmup bonus: (50k × +2) / 60k = 100k / 60k = +1.67
		// Warmed client is 83% of volume, so warmup bonus is proportionally larger
		expect(result.perDestination['zmail'].warmupBonus).toBeCloseTo(1.67, 2);

		// Total: +1.0 (client impact) + 1.67 (warmup) = +2.67
		expect(result.perDestination['zmail'].totalChange).toBeCloseTo(2.67, 2);
	});

	test('two warmed clients with different volumes: warmup bonus weighted by relative volumes', () => {
		const smallWarmed = buildTestClient('premium_brand', { id: 'client-1' }); // Low risk +2
		const largeWarmed = buildTestClient('premium_brand', { id: 'client-2' }); // Low risk +2

		const volumeData: VolumeResult = {
			activeClients: [smallWarmed, largeWarmed],
			clientVolumes: [
				{
					clientId: 'client-1',
					baseVolume: 20000,
					adjustedVolume: 10000, // Warmed: 50% reduction
					adjustments: { warmup: 10000 },
					perDestination: { zmail: 5000, intake: 3000, yagle: 2000 }
				},
				{
					clientId: 'client-2',
					baseVolume: 180000,
					adjustedVolume: 90000, // Warmed: 50% reduction
					adjustments: { warmup: 90000 },
					perDestination: { zmail: 45000, intake: 27000, yagle: 18000 }
				}
			],
			totalVolume: 100000, // 10k + 90k
			perDestination: { zmail: 50000, intake: 30000, yagle: 20000 }
		};

		const result = calculateReputationChanges({
			techStack: [],
			destinations: ['zmail'],
			clients: [smallWarmed, largeWarmed],
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
						{ id: 'warmup', source: 'warmup', multiplier: 0.5, applicableRounds: [1] }
					],
					spamTrapModifiers: []
				}
			},
			volumeData,
			currentRound: 1
		});

		// Client impact: (10k × +2 + 90k × +2) / 100k = 200k / 100k = +2
		expect(result.volumeWeightedClientImpact).toBe(2);

		// Warmup bonus: (10k × +2 + 90k × +2) / 100k = 200k / 100k = +2
		// Both clients warmed, so warmup bonus equals full +2 weighted average
		expect(result.perDestination['zmail'].warmupBonus).toBe(2);

		// Total: +2 (client impact) + 2 (warmup) = +4
		expect(result.perDestination['zmail'].totalChange).toBe(4);
	});

	test('no warmed clients: warmup bonus is zero', () => {
		const client1 = buildTestClient('premium_brand', { id: 'client-1' });
		const client2 = buildTestClient('growing_startup', { id: 'client-2' });

		const volumeData: VolumeResult = {
			activeClients: [client1, client2],
			clientVolumes: [
				{
					clientId: 'client-1',
					baseVolume: 30000,
					adjustedVolume: 30000,
					adjustments: {},
					perDestination: { zmail: 15000, intake: 9000, yagle: 6000 }
				},
				{
					clientId: 'client-2',
					baseVolume: 70000,
					adjustedVolume: 70000,
					adjustments: {},
					perDestination: { zmail: 35000, intake: 21000, yagle: 14000 }
				}
			],
			totalVolume: 100000,
			perDestination: { zmail: 50000, intake: 30000, yagle: 20000 }
		};

		const result = calculateReputationChanges({
			techStack: [],
			destinations: ['zmail'],
			clients: [client1, client2],
			clientStates: {
				'client-1': {
					status: 'Active',
					first_active_round: 1,
					volumeModifiers: [],
					spamTrapModifiers: []
				},
				'client-2': {
					status: 'Active',
					first_active_round: 1,
					volumeModifiers: [],
					spamTrapModifiers: []
				}
			},
			volumeData,
			currentRound: 1
		});

		// No warmed clients = no warmup bonus
		expect(result.perDestination['zmail'].warmupBonus).toBe(0);
	});
});
