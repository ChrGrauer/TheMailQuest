/**
 * Destination Revenue Calculator Unit Tests
 * US 3.3: Resolution Phase Automation - Iteration 6.1
 * ATDD: Test-first approach
 */

import { describe, test, expect } from 'vitest';
import { calculateDestinationRevenue } from './destination-revenue-calculator';

describe('Destination Revenue Calculator - Iteration 6.1', () => {
	describe('Base revenue by kingdom', () => {
		test('zmail base revenue is 300', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'zmail',
				totalVolume: 0,
				userSatisfaction: 76 // Good tier: 1.1 multiplier
			});

			expect(result.baseRevenue).toBe(300);
		});

		test('intake base revenue is 200', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'intake',
				totalVolume: 0,
				userSatisfaction: 76
			});

			expect(result.baseRevenue).toBe(200);
		});

		test('yagle base revenue is 150', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'yagle',
				totalVolume: 0,
				userSatisfaction: 76
			});

			expect(result.baseRevenue).toBe(150);
		});
	});

	describe('Volume bonus calculation', () => {
		test('100K volume = 20 credits bonus', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'zmail',
				totalVolume: 100000,
				userSatisfaction: 76
			});

			expect(result.volumeBonus).toBe(20);
		});

		test('500K volume = 100 credits bonus', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'zmail',
				totalVolume: 500000,
				userSatisfaction: 76
			});

			expect(result.volumeBonus).toBe(100);
		});

		test('800K volume = 160 credits bonus', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'zmail',
				totalVolume: 800000,
				userSatisfaction: 76
			});

			expect(result.volumeBonus).toBe(160);
		});

		test('50K volume (half unit) = 10 credits bonus', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'zmail',
				totalVolume: 50000,
				userSatisfaction: 76
			});

			expect(result.volumeBonus).toBe(10);
		});
	});

	describe('Satisfaction multiplier tiers', () => {
		test('Excellent tier (90-100): 1.5× multiplier', () => {
			const result95 = calculateDestinationRevenue({
				kingdom: 'zmail',
				totalVolume: 0,
				userSatisfaction: 95
			});

			const result90 = calculateDestinationRevenue({
				kingdom: 'zmail',
				totalVolume: 0,
				userSatisfaction: 90
			});

			expect(result95.satisfactionMultiplier).toBe(1.5);
			expect(result95.satisfactionTier).toBe('Excellent');
			expect(result90.satisfactionMultiplier).toBe(1.5);
		});

		test('Very Good tier (80-89): 1.3× multiplier', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'zmail',
				totalVolume: 0,
				userSatisfaction: 85
			});

			expect(result.satisfactionMultiplier).toBe(1.3);
			expect(result.satisfactionTier).toBe('Very Good');
		});

		test('Good tier (75-79): 1.1× multiplier', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'zmail',
				totalVolume: 0,
				userSatisfaction: 76
			});

			expect(result.satisfactionMultiplier).toBe(1.1);
			expect(result.satisfactionTier).toBe('Good');
		});

		test('Acceptable tier (70-74): 0.95× multiplier', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'zmail',
				totalVolume: 0,
				userSatisfaction: 72
			});

			expect(result.satisfactionMultiplier).toBe(0.95);
			expect(result.satisfactionTier).toBe('Acceptable');
		});

		test('Warning tier (60-69): 0.8× multiplier', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'zmail',
				totalVolume: 0,
				userSatisfaction: 65
			});

			expect(result.satisfactionMultiplier).toBe(0.8);
			expect(result.satisfactionTier).toBe('Warning');
		});

		test('Poor tier (50-59): 0.6× multiplier', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'zmail',
				totalVolume: 0,
				userSatisfaction: 55
			});

			expect(result.satisfactionMultiplier).toBe(0.6);
			expect(result.satisfactionTier).toBe('Poor');
		});

		test('Crisis tier (0-49): 0.3× multiplier', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'zmail',
				totalVolume: 0,
				userSatisfaction: 40
			});

			expect(result.satisfactionMultiplier).toBe(0.3);
			expect(result.satisfactionTier).toBe('Crisis');
		});
	});

	describe('Revenue formula: (base + volume_bonus) × satisfaction_multiplier', () => {
		test('zmail baseline performance: 76% satisfaction, 500K volume = 440 credits', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'zmail',
				totalVolume: 500000,
				userSatisfaction: 76
			});

			// base_revenue = 300
			// volume_bonus = 100 (500K / 100K * 20)
			// satisfaction_multiplier = 1.1 (Good)
			// total_revenue = (300 + 100) * 1.1 = 440
			expect(result.baseRevenue).toBe(300);
			expect(result.volumeBonus).toBe(100);
			expect(result.satisfactionMultiplier).toBe(1.1);
			expect(result.totalRevenue).toBe(440);
		});

		test('yagle excellent filtering, low volume: 92% satisfaction, 150K volume = 270 credits', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'yagle',
				totalVolume: 150000,
				userSatisfaction: 92
			});

			// base_revenue = 150
			// volume_bonus = 30 (150K / 100K * 20)
			// satisfaction_multiplier = 1.5 (Excellent)
			// total_revenue = (150 + 30) * 1.5 = 270
			expect(result.baseRevenue).toBe(150);
			expect(result.volumeBonus).toBe(30);
			expect(result.satisfactionMultiplier).toBe(1.5);
			expect(result.totalRevenue).toBe(270);
		});

		test('intake high volume but poor satisfaction: 55% satisfaction, 700K volume = 204 credits', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'intake',
				totalVolume: 700000,
				userSatisfaction: 55
			});

			// base_revenue = 200
			// volume_bonus = 140 (700K / 100K * 20)
			// satisfaction_multiplier = 0.6 (Poor)
			// total_revenue = (200 + 140) * 0.6 = 204
			expect(result.baseRevenue).toBe(200);
			expect(result.volumeBonus).toBe(140);
			expect(result.satisfactionMultiplier).toBe(0.6);
			expect(result.totalRevenue).toBe(204);
		});

		test('zmail maximum performance: 95% satisfaction, 800K volume = 690 credits', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'zmail',
				totalVolume: 800000,
				userSatisfaction: 95
			});

			// base_revenue = 300
			// volume_bonus = 160 (800K / 100K * 20)
			// satisfaction_multiplier = 1.5 (Excellent)
			// total_revenue = (300 + 160) * 1.5 = 690
			expect(result.baseRevenue).toBe(300);
			expect(result.volumeBonus).toBe(160);
			expect(result.satisfactionMultiplier).toBe(1.5);
			expect(result.totalRevenue).toBe(690);
		});

		test('yagle crisis mode: 40% satisfaction, 300K volume = 63 credits', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'yagle',
				totalVolume: 300000,
				userSatisfaction: 40
			});

			// base_revenue = 150
			// volume_bonus = 60 (300K / 100K * 20)
			// satisfaction_multiplier = 0.3 (Crisis)
			// total_revenue = (150 + 60) * 0.3 = 63
			expect(result.baseRevenue).toBe(150);
			expect(result.volumeBonus).toBe(60);
			expect(result.satisfactionMultiplier).toBe(0.3);
			expect(result.totalRevenue).toBe(63);
		});

		test('intake balanced scenario: 78% satisfaction, 400K volume = 308 credits', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'intake',
				totalVolume: 400000,
				userSatisfaction: 78
			});

			// base_revenue = 200
			// volume_bonus = 80 (400K / 100K * 20)
			// satisfaction_multiplier = 1.1 (Good)
			// total_revenue = (200 + 80) * 1.1 = 308
			expect(result.baseRevenue).toBe(200);
			expect(result.volumeBonus).toBe(80);
			expect(result.satisfactionMultiplier).toBe(1.1);
			expect(result.totalRevenue).toBe(308);
		});

		test('zmail low volume but good satisfaction: 85% satisfaction, 200K volume = 442 credits', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'zmail',
				totalVolume: 200000,
				userSatisfaction: 85
			});

			// base_revenue = 300
			// volume_bonus = 40 (200K / 100K * 20)
			// satisfaction_multiplier = 1.3 (Very Good)
			// total_revenue = (300 + 40) * 1.3 = 442
			expect(result.baseRevenue).toBe(300);
			expect(result.volumeBonus).toBe(40);
			expect(result.satisfactionMultiplier).toBe(1.3);
			expect(result.totalRevenue).toBe(442);
		});
	});

	describe('Edge cases', () => {
		test('Zero volume = zero bonus', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'zmail',
				totalVolume: 0,
				userSatisfaction: 95
			});

			expect(result.volumeBonus).toBe(0);
			expect(result.totalRevenue).toBe(300 * 1.5); // Only base × multiplier
		});

		test('Very low satisfaction still generates some revenue', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'yagle',
				totalVolume: 200000,
				userSatisfaction: 10
			});

			// Even in crisis, base + bonus still matter
			// (150 + 40) * 0.3 = 57
			expect(result.totalRevenue).toBeGreaterThan(0);
			expect(result.totalRevenue).toBe(57);
		});

		test('Satisfaction at exactly 100 = excellent tier', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'zmail',
				totalVolume: 100000,
				userSatisfaction: 100
			});

			expect(result.satisfactionTier).toBe('Excellent');
			expect(result.satisfactionMultiplier).toBe(1.5);
		});

		test('Satisfaction at exactly 0 = crisis tier', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'zmail',
				totalVolume: 100000,
				userSatisfaction: 0
			});

			expect(result.satisfactionTier).toBe('Crisis');
			expect(result.satisfactionMultiplier).toBe(0.3);
		});
	});

	describe('Volume bonus calculation precision', () => {
		test('Handles non-round volumes correctly', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'zmail',
				totalVolume: 123456,
				userSatisfaction: 80
			});

			// 123456 / 100000 * 20 = 24.6912 ~ 25 (rounded)
			expect(result.volumeBonus).toBeCloseTo(25, 0);
		});

		test('Revenue is rounded to whole numbers', () => {
			const result = calculateDestinationRevenue({
				kingdom: 'intake',
				totalVolume: 333333,
				userSatisfaction: 77
			});

			// base = 200, volume_bonus = ~67, multiplier = 1.1
			// (200 + 67) * 1.1 = 293.7 ~ 294
			expect(Number.isInteger(result.totalRevenue)).toBe(true);
		});
	});
});
