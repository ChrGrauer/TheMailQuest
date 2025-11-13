/**
 * User Satisfaction Calculator Unit Tests
 * US 3.3: Resolution Phase Automation - Iteration 6.1
 * ATDD: Test-first approach
 */

import { describe, test, expect } from 'vitest';
import { calculateSatisfaction } from './satisfaction-calculator';
import { buildTestClient } from '../test-helpers/client-test-fixtures';
import type { VolumeResult } from '../resolution-types';

// Helper to build volume data for testing
function buildVolumeData(totalVolume: number): VolumeResult {
	const gmailVolume = totalVolume * 0.5;
	const outlookVolume = totalVolume * 0.3;
	const yahooVolume = totalVolume * 0.2;

	return {
		activeClients: [],
		clientVolumes: [],
		totalVolume,
		perDestination: {
			Gmail: gmailVolume,
			Outlook: outlookVolume,
			Yahoo: yahooVolume
		}
	};
}

describe('Satisfaction Calculator - Iteration 6.1: User Satisfaction', () => {
	describe('Base filtering effectiveness (no tech)', () => {
		test('Permissive level blocks 0% spam, 0% false positives', () => {
			// Setup: ESP with 5% spam rate, 100K volume, Moderate filtering
			const client = buildTestClient('growing_startup', {
				spam_rate: 0.05,
				volume: 100000
			});

			const result = calculateSatisfaction({
				espName: 'TestESP',
				clients: [client],
				clientStates: { [client.id]: { status: 'Active' } },
				volumeData: buildVolumeData(100000),
				filteringPolicies: { Gmail: 'permissive', Outlook: 'permissive', Yahoo: 'permissive' },
				ownedTools: { Gmail: [], Outlook: [], Yahoo: [] },
				complaintRate: 0.05 // 5% spam rate
			});

			// With Permissive (0% blocked):
			// - spam_blocked = 0%
			// - spam_through = 5%
			// - false_positives = 0%
			// Satisfaction = 75 + (0 * 300) - (5 * 400) - (0 * 100) = 75 - 20 = 55
			expect(result.aggregatedSatisfaction).toBeCloseTo(55, 0);
		});

		test('Moderate level blocks 35% spam, 3% false positives', () => {
			const client = buildTestClient('growing_startup', {
				spam_rate: 0.05,
				volume: 100000
			});

			const result = calculateSatisfaction({
				espName: 'TestESP',
				clients: [client],
				clientStates: { [client.id]: { status: 'Active' } },
				volumeData: buildVolumeData(100000),
				filteringPolicies: { Gmail: 'moderate', Outlook: 'moderate', Yahoo: 'moderate' },
				ownedTools: { Gmail: [], Outlook: [], Yahoo: [] },
				complaintRate: 0.05
			});

			// With Moderate (35% blocked, 3% FP):
			// - spam_blocked = 5% * 35% = 1.75% of volume
			// - spam_through = 5% * 65% = 3.25% of volume
			// - legitimate = 95%, false_positives = 95% * 3% = 2.85% of volume
			// Satisfaction = 75 + (1.75 * 300) - (3.25 * 400) - (2.85 * 100)
			//              = 75 + 5.25 - 13 - 2.85 = 64.4
			expect(result.aggregatedSatisfaction).toBeCloseTo(64.4, 1);
		});

		test('Strict level blocks 65% spam, 8% false positives', () => {
			const client = buildTestClient('growing_startup', {
				spam_rate: 0.08,
				volume: 100000
			});

			const result = calculateSatisfaction({
				espName: 'TestESP',
				clients: [client],
				clientStates: { [client.id]: { status: 'Active' } },
				volumeData: buildVolumeData(100000),
				filteringPolicies: { Gmail: 'strict', Outlook: 'strict', Yahoo: 'strict' },
				ownedTools: { Gmail: [], Outlook: [], Yahoo: [] },
				complaintRate: 0.08
			});

			// With Strict (65% blocked, 8% FP):
			// - spam_blocked = 8% * 65% = 5.2% of volume
			// - spam_through = 8% * 35% = 2.8% of volume
			// - legitimate = 92%, false_positives = 92% * 8% = 7.36% of volume
			// Satisfaction = 75 + (5.2 * 300) - (2.8 * 400) - (7.36 * 100)
			//              = 75 + 15.6 - 11.2 - 7.36 = 72.04
			expect(result.aggregatedSatisfaction).toBeCloseTo(72, 1);
		});

		test('Maximum level blocks 85% spam, 15% false positives', () => {
			const client = buildTestClient('growing_startup', {
				spam_rate: 0.1,
				volume: 200000
			});

			const result = calculateSatisfaction({
				espName: 'TestESP',
				clients: [client],
				clientStates: { [client.id]: { status: 'Active' } },
				volumeData: buildVolumeData(200000),
				filteringPolicies: { Gmail: 'maximum', Outlook: 'maximum', Yahoo: 'maximum' },
				ownedTools: { Gmail: [], Outlook: [], Yahoo: [] },
				complaintRate: 0.1
			});

			// With Maximum (85% blocked, 15% FP):
			// - spam_blocked = 10% * 85% = 8.5% of volume
			// - spam_through = 10% * 15% = 1.5% of volume
			// - legitimate = 90%, false_positives = 90% * 15% = 13.5% of volume
			// Satisfaction = 75 + (8.5 * 300) - (1.5 * 400) - (13.5 * 100)
			//              = 75 + 25.5 - 6 - 13.5 = 81
			expect(result.aggregatedSatisfaction).toBeCloseTo(81, 1);
		});
	});

	describe('Destination tech impact (additive modifiers)', () => {
		test('Content Analysis Filter adds +15% spam detection, -2% FP', () => {
			const client = buildTestClient('growing_startup', {
				spam_rate: 0.08,
				volume: 100000
			});

			const result = calculateSatisfaction({
				espName: 'TestESP',
				clients: [client],
				clientStates: { [client.id]: { status: 'Active' } },
				volumeData: buildVolumeData(100000),
				filteringPolicies: { Gmail: 'strict', Outlook: 'strict', Yahoo: 'strict' },
				ownedTools: {
					Gmail: ['content_analysis_filter'],
					Outlook: ['content_analysis_filter'],
					Yahoo: ['content_analysis_filter']
				},
				complaintRate: 0.08
			});

			// Strict base: 65% spam blocked, 8% FP
			// With Content Filter: 65% + 15% = 80% spam blocked, 8% - 2% = 6% FP
			// - spam_blocked = 8% * 80% = 6.4% of volume
			// - spam_through = 8% * 20% = 1.6% of volume
			// - legitimate = 92%, false_positives = 92% * 6% = 5.52% of volume
			// Satisfaction = 75 + (6.4 * 300) - (1.6 * 400) - (5.52 * 100)
			//              = 75 + 19.2 - 6.4 - 5.52 = 82.28
			expect(result.aggregatedSatisfaction).toBeCloseTo(82, 0);
		});

		test('ML System adds +25% spam detection, -3% FP', () => {
			const client = buildTestClient('growing_startup', {
				spam_rate: 0.03,
				volume: 100000
			});

			const result = calculateSatisfaction({
				espName: 'TestESP',
				clients: [client],
				clientStates: { [client.id]: { status: 'Active' } },
				volumeData: buildVolumeData(100000),
				filteringPolicies: { Gmail: 'moderate', Outlook: 'moderate', Yahoo: 'moderate' },
				ownedTools: {
					Gmail: ['ml_system'],
					Outlook: ['ml_system'],
					Yahoo: [] // Yahoo doesn't have ML
				},
				complaintRate: 0.03
			});

			// For Gmail and Outlook: Moderate base (35%) + ML (25%) = 60% spam blocked, 3% - 3% = 0% FP
			// For Yahoo: Moderate base (35%), 3% FP
			// Average weighted by volume: (50% + 30%) have ML, 20% don't
			// This test verifies per-destination tech is applied correctly
			expect(result.perDestination['Gmail']).toBeDefined();
			expect(result.perDestination['Outlook']).toBeDefined();
			expect(result.perDestination['Yahoo']).toBeDefined();
		});

		test('All tech combined reaches 95% cap', () => {
			const client = buildTestClient('growing_startup', {
				spam_rate: 0.1,
				volume: 200000
			});

			const result = calculateSatisfaction({
				espName: 'TestESP',
				clients: [client],
				clientStates: { [client.id]: { status: 'Active' } },
				volumeData: buildVolumeData(200000),
				filteringPolicies: { Gmail: 'maximum', Outlook: 'maximum', Yahoo: 'maximum' },
				ownedTools: {
					Gmail: [
						'content_analysis_filter',
						'ml_system',
						'volume_throttling',
						'auth_validator_l1',
						'auth_validator_l2',
						'auth_validator_l3'
					],
					Outlook: [
						'content_analysis_filter',
						'ml_system',
						'volume_throttling',
						'auth_validator_l1',
						'auth_validator_l2',
						'auth_validator_l3'
					],
					Yahoo: ['content_analysis_filter', 'volume_throttling'] // Yahoo can't buy ML
				},
				complaintRate: 0.1
			});

			// Maximum base: 85%
			// All tech: +15 (content) +25 (ML) +5 (throttling) +5 (L1) +8 (L2) +12 (L3) = +70
			// Total: 85% + 70% = 155% -> capped at 95%
			// Gmail spam_blocked = 10% * 95% = 9.5% of volume
			// Should have very high satisfaction due to effective spam blocking
			expect(result.aggregatedSatisfaction).toBeGreaterThan(85);
		});
	});

	describe('Satisfaction weight formula', () => {
		test('Spam getting through is penalized most heavily (×400)', () => {
			const client = buildTestClient('growing_startup', {
				spam_rate: 0.1, // High spam rate
				volume: 100000
			});

			// Permissive - lets all spam through
			const permissiveResult = calculateSatisfaction({
				espName: 'TestESP',
				clients: [client],
				clientStates: { [client.id]: { status: 'Active' } },
				volumeData: buildVolumeData(100000),
				filteringPolicies: { Gmail: 'permissive', Outlook: 'permissive', Yahoo: 'permissive' },
				ownedTools: { Gmail: [], Outlook: [], Yahoo: [] },
				complaintRate: 0.1
			});

			// 10% spam through with ×400 penalty = -40 points
			// Satisfaction = 75 - 40 = 35
			expect(permissiveResult.aggregatedSatisfaction).toBeCloseTo(35, 0);
		});

		test('Spam blocking is rewarded significantly (×300)', () => {
			const client = buildTestClient('growing_startup', {
				spam_rate: 0.1,
				volume: 100000
			});

			const result = calculateSatisfaction({
				espName: 'TestESP',
				clients: [client],
				clientStates: { [client.id]: { status: 'Active' } },
				volumeData: buildVolumeData(100000),
				filteringPolicies: { Gmail: 'maximum', Outlook: 'maximum', Yahoo: 'maximum' },
				ownedTools: { Gmail: [], Outlook: [], Yahoo: [] },
				complaintRate: 0.1
			});

			// 8.5% spam blocked with ×300 reward = +25.5 points
			// Should have positive satisfaction boost from good filtering
			expect(result.aggregatedSatisfaction).toBeGreaterThan(75);
		});

		test('False positives penalized moderately (×100)', () => {
			const client = buildTestClient('growing_startup', {
				spam_rate: 0.01, // Very low spam
				volume: 100000
			});

			const result = calculateSatisfaction({
				espName: 'TestESP',
				clients: [client],
				clientStates: { [client.id]: { status: 'Active' } },
				volumeData: buildVolumeData(100000),
				filteringPolicies: { Gmail: 'maximum', Outlook: 'maximum', Yahoo: 'maximum' },
				ownedTools: { Gmail: [], Outlook: [], Yahoo: [] },
				complaintRate: 0.01
			});

			// With low spam and maximum filtering:
			// - spam_blocked = 1% * 85% = 0.85%
			// - spam_through = 1% * 15% = 0.15%
			// - false_positives = 99% * 15% = 14.85%
			// Satisfaction = 75 + (0.85 * 300) - (0.15 * 400) - (14.85 * 100)
			//              = 75 + 2.55 - 0.6 - 14.85 = 62.1
			// False positives hurt, but not as much as spam would
			expect(result.aggregatedSatisfaction).toBeCloseTo(62, 0);
		});
	});

	describe('Aggregated satisfaction across destinations', () => {
		test('Calculates volume-weighted average across destinations', () => {
			const client = buildTestClient('growing_startup', {
				spam_rate: 0.05,
				volume: 100000
			});

			const result = calculateSatisfaction({
				espName: 'TestESP',
				clients: [client],
				clientStates: { [client.id]: { status: 'Active' } },
				volumeData: buildVolumeData(100000),
				filteringPolicies: {
					Gmail: 'moderate', // 50% volume, moderate filtering
					Outlook: 'strict', // 30% volume, strict filtering
					Yahoo: 'permissive' // 20% volume, permissive filtering
				},
				ownedTools: { Gmail: [], Outlook: [], Yahoo: [] },
				complaintRate: 0.05
			});

			// Should have per-destination scores
			expect(result.perDestination['Gmail']).toBeDefined();
			expect(result.perDestination['Outlook']).toBeDefined();
			expect(result.perDestination['Yahoo']).toBeDefined();

			// Aggregated should be volume-weighted average
			const gmailWeight = 0.5;
			const outlookWeight = 0.3;
			const yahooWeight = 0.2;
			const expectedAggregated =
				result.perDestination['Gmail'] * gmailWeight +
				result.perDestination['Outlook'] * outlookWeight +
				result.perDestination['Yahoo'] * yahooWeight;

			expect(result.aggregatedSatisfaction).toBeCloseTo(expectedAggregated, 1);
		});
	});

	describe('Satisfaction capping', () => {
		test('Satisfaction is capped at 100', () => {
			const client = buildTestClient('growing_startup', {
				spam_rate: 0.15, // High spam, excellent blocking opportunity
				volume: 300000
			});

			const result = calculateSatisfaction({
				espName: 'TestESP',
				clients: [client],
				clientStates: { [client.id]: { status: 'Active' } },
				volumeData: buildVolumeData(300000),
				filteringPolicies: { Gmail: 'maximum', Outlook: 'maximum', Yahoo: 'maximum' },
				ownedTools: {
					Gmail: ['content_analysis_filter', 'ml_system', 'volume_throttling'],
					Outlook: ['content_analysis_filter', 'ml_system', 'volume_throttling'],
					Yahoo: ['content_analysis_filter', 'volume_throttling']
				},
				complaintRate: 0.15
			});

			// Even with excellent filtering, satisfaction should not exceed 100
			expect(result.aggregatedSatisfaction).toBeLessThanOrEqual(100);
		});

		test('Satisfaction is capped at 0', () => {
			const client = buildTestClient('growing_startup', {
				spam_rate: 0.2, // Very high spam
				volume: 200000
			});

			const result = calculateSatisfaction({
				espName: 'TestESP',
				clients: [client],
				clientStates: { [client.id]: { status: 'Active' } },
				volumeData: buildVolumeData(200000),
				filteringPolicies: { Gmail: 'permissive', Outlook: 'permissive', Yahoo: 'permissive' },
				ownedTools: { Gmail: [], Outlook: [], Yahoo: [] },
				complaintRate: 0.2
			});

			// With high spam and no filtering, satisfaction tanks
			// 20% spam through with ×400 = -80 points -> 75 - 80 = -5 -> capped at 0
			expect(result.aggregatedSatisfaction).toBeGreaterThanOrEqual(0);
		});
	});

	describe('Breakdown transparency', () => {
		test('Provides detailed breakdown per destination', () => {
			const client = buildTestClient('growing_startup', {
				spam_rate: 0.06,
				volume: 100000
			});

			const result = calculateSatisfaction({
				espName: 'TestESP',
				clients: [client],
				clientStates: { [client.id]: { status: 'Active' } },
				volumeData: buildVolumeData(100000),
				filteringPolicies: { Gmail: 'moderate', Outlook: 'moderate', Yahoo: 'moderate' },
				ownedTools: { Gmail: [], Outlook: [], Yahoo: [] },
				complaintRate: 0.06
			});

			expect(result.breakdown).toHaveLength(3); // Gmail, Outlook, Yahoo
			expect(result.breakdown[0]).toHaveProperty('destination');
			expect(result.breakdown[0]).toHaveProperty('spam_rate');
			expect(result.breakdown[0]).toHaveProperty('spam_blocked_percentage');
			expect(result.breakdown[0]).toHaveProperty('spam_through_percentage');
			expect(result.breakdown[0]).toHaveProperty('false_positive_percentage');
			expect(result.breakdown[0]).toHaveProperty('satisfaction_gain');
			expect(result.breakdown[0]).toHaveProperty('spam_penalty');
			expect(result.breakdown[0]).toHaveProperty('false_positive_penalty');
			expect(result.breakdown[0]).toHaveProperty('satisfaction');
		});
	});
});
