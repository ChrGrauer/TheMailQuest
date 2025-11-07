/**
 * Delivery Calculator Unit Tests
 * US 3.3: Resolution Phase Automation - Iteration 2
 * ATDD: Test-first approach
 */

import { describe, test, expect } from 'vitest';
import { calculateDeliverySuccess } from './delivery-calculator';

describe('Delivery Calculator - Iteration 2: Reputation-Based Delivery', () => {
	describe('Reputation zones', () => {
		test('excellent zone (90-100) → 95% delivery', () => {
			const result = calculateDeliverySuccess({
				reputation: 95,
				techStack: [],
				currentRound: 1
			});

			expect(result.baseRate).toBe(0.95);
			expect(result.finalRate).toBe(0.95);
			expect(result.zone).toBe('excellent');
		});

		test('good zone (70-89) → 85% delivery', () => {
			const result = calculateDeliverySuccess({
				reputation: 75,
				techStack: [],
				currentRound: 1
			});

			expect(result.baseRate).toBe(0.85);
			expect(result.finalRate).toBe(0.85);
			expect(result.zone).toBe('good');
		});

		test('warning zone (50-69) → 70% delivery', () => {
			const result = calculateDeliverySuccess({
				reputation: 55,
				techStack: [],
				currentRound: 1
			});

			expect(result.baseRate).toBe(0.7);
			expect(result.finalRate).toBe(0.7);
			expect(result.zone).toBe('warning');
		});

		test('poor zone (30-49) → 50% delivery', () => {
			const result = calculateDeliverySuccess({
				reputation: 40,
				techStack: [],
				currentRound: 1
			});

			expect(result.baseRate).toBe(0.5);
			expect(result.finalRate).toBe(0.5);
			expect(result.zone).toBe('poor');
		});

		test('blacklist zone (0-29) → 5% delivery', () => {
			const result = calculateDeliverySuccess({
				reputation: 15,
				techStack: [],
				currentRound: 1
			});

			expect(result.baseRate).toBe(0.05);
			expect(result.finalRate).toBe(0.05);
			expect(result.zone).toBe('blacklist');
		});
	});

	describe('Zone boundaries', () => {
		test('reputation 90 is excellent zone', () => {
			const result = calculateDeliverySuccess({
				reputation: 90,
				techStack: [],
				currentRound: 1
			});

			expect(result.zone).toBe('excellent');
			expect(result.finalRate).toBe(0.95);
		});

		test('reputation 89 is good zone', () => {
			const result = calculateDeliverySuccess({
				reputation: 89,
				techStack: [],
				currentRound: 1
			});

			expect(result.zone).toBe('good');
			expect(result.finalRate).toBe(0.85);
		});

		test('reputation 70 is good zone', () => {
			const result = calculateDeliverySuccess({
				reputation: 70,
				techStack: [],
				currentRound: 1
			});

			expect(result.zone).toBe('good');
			expect(result.finalRate).toBe(0.85);
		});

		test('reputation 69 is warning zone', () => {
			const result = calculateDeliverySuccess({
				reputation: 69,
				techStack: [],
				currentRound: 1
			});

			expect(result.zone).toBe('warning');
			expect(result.finalRate).toBe(0.7);
		});

		test('reputation 50 is warning zone', () => {
			const result = calculateDeliverySuccess({
				reputation: 50,
				techStack: [],
				currentRound: 1
			});

			expect(result.zone).toBe('warning');
			expect(result.finalRate).toBe(0.7);
		});

		test('reputation 49 is poor zone', () => {
			const result = calculateDeliverySuccess({
				reputation: 49,
				techStack: [],
				currentRound: 1
			});

			expect(result.zone).toBe('poor');
			expect(result.finalRate).toBe(0.5);
		});

		test('reputation 30 is poor zone', () => {
			const result = calculateDeliverySuccess({
				reputation: 30,
				techStack: [],
				currentRound: 1
			});

			expect(result.zone).toBe('poor');
			expect(result.finalRate).toBe(0.5);
		});

		test('reputation 29 is blacklist zone', () => {
			const result = calculateDeliverySuccess({
				reputation: 29,
				techStack: [],
				currentRound: 1
			});

			expect(result.zone).toBe('blacklist');
			expect(result.finalRate).toBe(0.05);
		});
	});

	describe('Edge cases', () => {
		test('reputation 0', () => {
			const result = calculateDeliverySuccess({
				reputation: 0,
				techStack: [],
				currentRound: 1
			});

			expect(result.zone).toBe('blacklist');
			expect(result.finalRate).toBe(0.05);
		});

		test('reputation 100', () => {
			const result = calculateDeliverySuccess({
				reputation: 100,
				techStack: [],
				currentRound: 1
			});

			expect(result.zone).toBe('excellent');
			expect(result.finalRate).toBe(0.95);
		});
	});
});
