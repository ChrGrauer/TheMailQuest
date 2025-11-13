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

describe('Delivery Calculator - Iteration 3: Authentication Impact', () => {
	describe('Authentication delivery bonuses', () => {
		test('SPF only: +5% delivery', () => {
			const result = calculateDeliverySuccess({
				reputation: 75, // Good zone = 85% base
				techStack: ['spf'],
				currentRound: 1
			});

			expect(result.baseRate).toBe(0.85);
			expect(result.authBonus).toBe(0.05);
			expect(result.finalRate).toBe(0.9); // 85% + 5%
		});

		test('SPF + DKIM: +13% delivery', () => {
			const result = calculateDeliverySuccess({
				reputation: 75,
				techStack: ['spf', 'dkim'],
				currentRound: 1
			});

			expect(result.authBonus).toBe(0.13); // 5% + 8%
			expect(result.finalRate).toBe(0.98); // 85% + 13%
		});

		test('Full stack (SPF + DKIM + DMARC): +25% delivery', () => {
			const result = calculateDeliverySuccess({
				reputation: 75,
				techStack: ['spf', 'dkim', 'dmarc'],
				currentRound: 1
			});

			expect(result.authBonus).toBe(0.25); // 5% + 8% + 12%
			expect(result.finalRate).toBe(1.0); // 85% + 25% = 110%, capped at 100%
		});

		test('No tech: 0% bonus', () => {
			const result = calculateDeliverySuccess({
				reputation: 75,
				techStack: [],
				currentRound: 1
			});

			expect(result.authBonus).toBe(0);
			expect(result.finalRate).toBe(0.85); // Base only
		});
	});

	describe('Delivery rate capping', () => {
		test('Excellent zone (95%) + full auth (25%) = capped at 100%', () => {
			const result = calculateDeliverySuccess({
				reputation: 95, // Excellent = 95%
				techStack: ['spf', 'dkim', 'dmarc'],
				currentRound: 1
			});

			expect(result.baseRate).toBe(0.95);
			expect(result.authBonus).toBe(0.25);
			expect(result.finalRate).toBe(1.0); // Capped
		});

		test('Good zone (85%) + SPF+DKIM (13%) = 98% (not capped)', () => {
			const result = calculateDeliverySuccess({
				reputation: 75,
				techStack: ['spf', 'dkim'],
				currentRound: 1
			});

			expect(result.finalRate).toBe(0.98);
		});
	});

	describe('DMARC enforcement (Round 3+)', () => {
		test('Round 3 without DMARC: 80% rejection penalty', () => {
			const result = calculateDeliverySuccess({
				reputation: 75, // Good zone = 85%
				techStack: ['spf', 'dkim'], // No DMARC
				currentRound: 3
			});

			expect(result.baseRate).toBe(0.85);
			expect(result.authBonus).toBe(0.13); // SPF + DKIM
			expect(result.dmarcPenalty).toBe(0.8); // 80% rejection
			// Calculation: (85% + 13%) × 20% = 98% × 0.2 = 19.6%
			expect(result.finalRate).toBeCloseTo(0.196, 2);
		});

		test('Round 3 with DMARC: no penalty', () => {
			const result = calculateDeliverySuccess({
				reputation: 75,
				techStack: ['spf', 'dkim', 'dmarc'],
				currentRound: 3
			});

			expect(result.dmarcPenalty).toBeUndefined();
			expect(result.finalRate).toBe(1.0); // 85% + 25% = capped
		});

		test('Round 2 without DMARC: no penalty yet', () => {
			const result = calculateDeliverySuccess({
				reputation: 75,
				techStack: ['spf'],
				currentRound: 2
			});

			expect(result.dmarcPenalty).toBeUndefined();
			expect(result.finalRate).toBe(0.9); // 85% + 5%
		});

		test('Round 4 without DMARC: penalty still applies', () => {
			const result = calculateDeliverySuccess({
				reputation: 75,
				techStack: [],
				currentRound: 4
			});

			expect(result.dmarcPenalty).toBe(0.8);
			// 85% × 20% = 17%
			expect(result.finalRate).toBeCloseTo(0.17, 2);
		});

		test('Round 3 with no auth tech: severe penalty', () => {
			const result = calculateDeliverySuccess({
				reputation: 55, // Warning zone = 70%
				techStack: [],
				currentRound: 3
			});

			expect(result.baseRate).toBe(0.7);
			expect(result.authBonus).toBe(0);
			expect(result.dmarcPenalty).toBe(0.8);
			// 70% × 20% = 14%
			expect(result.finalRate).toBeCloseTo(0.14, 2);
		});
	});

	describe('Breakdown tracking', () => {
		test('includes all factors in breakdown', () => {
			const result = calculateDeliverySuccess({
				reputation: 75,
				techStack: ['spf', 'dkim'],
				currentRound: 1
			});

			expect(result.breakdown).toEqual([
				{ factor: 'Base (good zone)', value: 0.85 },
				{ factor: 'Authentication Bonus', value: 0.13 },
				{ factor: 'Final Rate', value: 0.98 }
			]);
		});

		test('includes DMARC penalty in breakdown', () => {
			const result = calculateDeliverySuccess({
				reputation: 75,
				techStack: [],
				currentRound: 3
			});

			expect(result.breakdown).toContainEqual({
				factor: 'DMARC Missing Penalty',
				value: expect.any(Number)
			});
			// Check the penalty is negative
			const penaltyItem = result.breakdown.find((b) => b.factor === 'DMARC Missing Penalty');
			expect(penaltyItem!.value).toBeLessThan(0);
		});

		test('breakdown omits auth bonus when 0', () => {
			const result = calculateDeliverySuccess({
				reputation: 75,
				techStack: [],
				currentRound: 1
			});

			const authBonusItem = result.breakdown.find((b) => b.factor === 'Authentication Bonus');
			expect(authBonusItem).toBeUndefined();
		});
	});
});

describe('Delivery Calculator - Iteration 6: Filtering Penalties', () => {
	describe('Filtering levels', () => {
		test('permissive filtering: no penalty', () => {
			const result = calculateDeliverySuccess({
				reputation: 75, // Good zone
				techStack: [],
				currentRound: 1,
				filteringLevel: 'permissive'
			});

			expect(result.baseRate).toBe(0.85);
			expect(result.filteringPenalty).toBe(0);
			expect(result.finalRate).toBe(0.85);
		});

		test('moderate filtering: 3% penalty', () => {
			const result = calculateDeliverySuccess({
				reputation: 75,
				techStack: [],
				currentRound: 1,
				filteringLevel: 'moderate'
			});

			expect(result.baseRate).toBe(0.85);
			expect(result.filteringPenalty).toBe(0.03);
			expect(result.finalRate).toBe(0.82); // 0.85 - 0.03
		});

		test('strict filtering: 8% penalty', () => {
			const result = calculateDeliverySuccess({
				reputation: 55, // Warning zone: 70% base
				techStack: [],
				currentRound: 1,
				filteringLevel: 'strict'
			});

			expect(result.baseRate).toBe(0.7);
			expect(result.filteringPenalty).toBe(0.08);
			expect(result.finalRate).toBe(0.62); // 0.70 - 0.08
		});

		test('maximum filtering: 15% penalty', () => {
			const result = calculateDeliverySuccess({
				reputation: 85, // Good zone: 85% base
				techStack: [],
				currentRound: 1,
				filteringLevel: 'maximum'
			});

			expect(result.baseRate).toBe(0.85);
			expect(result.filteringPenalty).toBe(0.15);
			expect(result.finalRate).toBe(0.7); // 0.85 - 0.15
		});
	});

	describe('Filtering with authentication bonuses', () => {
		test('filtering penalty applied after auth bonus', () => {
			const result = calculateDeliverySuccess({
				reputation: 70, // Good zone: 85%
				techStack: ['spf', 'dkim'], // +13% bonus
				currentRound: 1,
				filteringLevel: 'strict' // -8%
			});

			expect(result.baseRate).toBe(0.85);
			expect(result.authBonus).toBe(0.13);
			expect(result.filteringPenalty).toBe(0.08);
			expect(result.finalRate).toBe(0.9); // 0.85 + 0.13 - 0.08
		});

		test('full auth stack with maximum filtering', () => {
			const result = calculateDeliverySuccess({
				reputation: 80,
				techStack: ['spf', 'dkim', 'dmarc'], // +25%
				currentRound: 3,
				filteringLevel: 'maximum' // -15%
			});

			expect(result.authBonus).toBe(0.25);
			expect(result.filteringPenalty).toBe(0.15);
			// 0.85 + 0.25 - 0.15 = 0.95
			expect(result.finalRate).toBeCloseTo(0.95, 2);
		});
	});

	describe('Filtering with DMARC penalty', () => {
		test('filtering + DMARC missing penalty (Round 3)', () => {
			const result = calculateDeliverySuccess({
				reputation: 75,
				techStack: ['spf'], // No DMARC
				currentRound: 3,
				filteringLevel: 'moderate'
			});

			// Base: 85%, SPF: +5%, Filtering: -3%, DMARC: ×0.2
			// (0.85 + 0.05 - 0.03) × 0.2 = 0.174
			expect(result.baseRate).toBe(0.85);
			expect(result.authBonus).toBe(0.05);
			expect(result.filteringPenalty).toBe(0.03);
			expect(result.dmarcPenalty).toBeDefined();
			expect(result.finalRate).toBeCloseTo(0.174, 2);
		});
	});

	describe('Breakdown tracking', () => {
		test('breakdown includes filtering penalty', () => {
			const result = calculateDeliverySuccess({
				reputation: 75,
				techStack: ['spf'],
				currentRound: 1,
				filteringLevel: 'strict'
			});

			expect(result.breakdown).toContainEqual({
				factor: 'Filtering Penalty',
				value: -8
			});
		});
	});

	describe('Test case from feature file', () => {
		test('Strict filtering on poor reputation ESP (line 342-349)', () => {
			// Given Gmail has "Strict" filtering on "BluePost"
			// And BluePost has reputation 55 at Gmail
			const result = calculateDeliverySuccess({
				reputation: 55, // Warning zone
				techStack: [],
				currentRound: 1,
				filteringLevel: 'strict'
			});

			// Then spam reduction should be 65% (not tested here - Iteration 7)
			// And legitimate email blocked should be 8%
			expect(result.filteringPenalty).toBe(0.08);

			// And effective delivery should be 62% (70% base - 8%)
			expect(result.baseRate).toBe(0.7);
			expect(result.finalRate).toBe(0.62);
		});
	});
});
