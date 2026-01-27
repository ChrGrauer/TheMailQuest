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

describe('Reputation Calculator - Iteration 3: Authentication Impact', () => {
	describe('Tech stack reputation bonuses', () => {
		test('no tech = 0 bonus', () => {
			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['zmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['zmail'].techBonus).toBe(0);
			expect(result.perDestination['zmail'].totalChange).toBe(0);
		});

		test('SPF only = +2 reputation', () => {
			const result = calculateReputationChanges({
				techStack: ['spf'],
				destinations: ['zmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['zmail'].techBonus).toBe(2);
			expect(result.perDestination['zmail'].totalChange).toBe(2);
		});

		test('SPF + DKIM = +5 reputation', () => {
			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim'],
				destinations: ['zmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['zmail'].techBonus).toBe(5);
			expect(result.perDestination['zmail'].totalChange).toBe(5);
		});

		test('full stack (SPF + DKIM + DMARC) = +10 reputation', () => {
			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim', 'dmarc'],
				destinations: ['zmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['zmail'].techBonus).toBe(10);
			expect(result.perDestination['zmail'].totalChange).toBe(10);
		});

		test('DKIM only (without SPF) = +3 reputation', () => {
			// No dependency checking in calculator - that's handled elsewhere
			const result = calculateReputationChanges({
				techStack: ['dkim'],
				destinations: ['zmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['zmail'].techBonus).toBe(3);
			expect(result.perDestination['zmail'].totalChange).toBe(3);
		});

		test('DMARC only (without dependencies) = +5 reputation', () => {
			// No dependency checking in calculator - that's handled elsewhere
			const result = calculateReputationChanges({
				techStack: ['dmarc'],
				destinations: ['zmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['zmail'].techBonus).toBe(5);
			expect(result.perDestination['zmail'].totalChange).toBe(5);
		});

		test('empty tech array = 0 bonus', () => {
			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['zmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['zmail'].techBonus).toBe(0);
		});
	});

	describe('Per-destination reputation changes', () => {
		test('tech bonus applies to all destinations equally', () => {
			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim', 'dmarc'],
				destinations: ['zmail', 'intake', 'yagle'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['zmail'].techBonus).toBe(10);
			expect(result.perDestination['intake'].techBonus).toBe(10);
			expect(result.perDestination['yagle'].techBonus).toBe(10);

			expect(result.perDestination['zmail'].totalChange).toBe(10);
			expect(result.perDestination['intake'].totalChange).toBe(10);
			expect(result.perDestination['yagle'].totalChange).toBe(10);
		});

		test('single destination receives bonus', () => {
			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim'],
				destinations: ['zmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['zmail']).toBeDefined();
			expect(result.perDestination['zmail'].techBonus).toBe(5);
		});

		test('three destinations all receive same bonus', () => {
			const result = calculateReputationChanges({
				techStack: ['spf'],
				destinations: ['zmail', 'intake', 'yagle'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(Object.keys(result.perDestination)).toHaveLength(3);
			expect(result.perDestination['zmail'].techBonus).toBe(2);
			expect(result.perDestination['intake'].techBonus).toBe(2);
			expect(result.perDestination['yagle'].techBonus).toBe(2);
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
				destinations: ['zmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['zmail'].breakdown).toContainEqual({
				source: 'Authentication Tech',
				value: 5
			});
		});

		test('breakdown shows 0 when no tech', () => {
			const result = calculateReputationChanges({
				techStack: [],
				destinations: ['zmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['zmail'].breakdown).toContainEqual({
				source: 'Authentication Tech',
				value: 0
			});
		});

		test('multiple destinations each have their own breakdown', () => {
			const result = calculateReputationChanges({
				techStack: ['spf', 'dkim', 'dmarc'],
				destinations: ['zmail', 'intake'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['zmail'].breakdown).toContainEqual({
				source: 'Authentication Tech',
				value: 10
			});
			expect(result.perDestination['intake'].breakdown).toContainEqual({
				source: 'Authentication Tech',
				value: 10
			});
		});
	});

	describe('Iteration 3: Placeholders for future iterations', () => {
		test('clientImpact is 0 (Iteration 4)', () => {
			const result = calculateReputationChanges({
				techStack: ['spf'],
				destinations: ['zmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['zmail'].clientImpact).toBe(0);
		});

		test('warmupBonus is 0 (Iteration 5)', () => {
			const result = calculateReputationChanges({
				techStack: ['spf'],
				destinations: ['zmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.perDestination['zmail'].warmupBonus).toBe(0);
		});

		test('volumeWeightedClientImpact is 0 (Iteration 4)', () => {
			const result = calculateReputationChanges({
				techStack: ['spf'],
				destinations: ['zmail'],
				clients: [],
				clientStates: {},
				volumeData: emptyVolumeData,
				currentRound: 1
			});

			expect(result.volumeWeightedClientImpact).toBe(0);
		});
	});
});
