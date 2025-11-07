/**
 * Revenue Calculator Unit Tests
 * US 3.3: Resolution Phase Automation - Iteration 1
 * ATDD: Test-first approach
 */

import { describe, test, expect } from 'vitest';
import { calculateRevenue } from './revenue-calculator';
import { buildTestClient } from '../test-helpers/client-test-fixtures';

describe('Revenue Calculator - Iteration 1: Basic Revenue', () => {
	test('single active client', () => {
		const client = buildTestClient('premium_brand', { id: 'client-1' });

		const result = calculateRevenue({
			clients: [client],
			clientStates: {
				'client-1': {
					status: 'Active',
					has_warmup: false,
					has_list_hygiene: false,
					first_active_round: null
				}
			},
			deliveryRate: 1.0 // Iteration 1: no delivery modifier
		});

		expect(result.baseRevenue).toBe(350);
		expect(result.actualRevenue).toBe(350);
		expect(result.perClient).toHaveLength(1);
		expect(result.perClient[0].clientId).toBe('client-1');
		expect(result.perClient[0].baseRevenue).toBe(350);
		expect(result.perClient[0].actualRevenue).toBe(350);
	});

	test('multiple active clients', () => {
		const premium = buildTestClient('premium_brand', { id: 'client-1' });
		const startup = buildTestClient('growing_startup', { id: 'client-2' });

		const result = calculateRevenue({
			clients: [premium, startup],
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
			deliveryRate: 1.0
		});

		expect(result.baseRevenue).toBe(530); // 350 + 180
		expect(result.actualRevenue).toBe(530);
		expect(result.perClient).toHaveLength(2);
	});

	test('excludes paused clients', () => {
		const premium = buildTestClient('premium_brand', { id: 'client-1' });
		const aggressive = buildTestClient('aggressive_marketer', { id: 'client-2' });
		const startup = buildTestClient('growing_startup', { id: 'client-3' });

		const result = calculateRevenue({
			clients: [premium, aggressive, startup],
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
				},
				'client-3': {
					status: 'Active',
					has_warmup: false,
					has_list_hygiene: false,
					first_active_round: null
				}
			},
			deliveryRate: 1.0
		});

		expect(result.baseRevenue).toBe(530); // 350 + 180 (excludes paused 350)
		expect(result.actualRevenue).toBe(530);
		expect(result.perClient).toHaveLength(2);
		expect(result.perClient.find((pc) => pc.clientId === 'client-2')).toBeUndefined();
	});

	test('re-engagement client', () => {
		const reengagement = buildTestClient('re_engagement', { id: 'client-1' });

		const result = calculateRevenue({
			clients: [reengagement],
			clientStates: {
				'client-1': {
					status: 'Active',
					has_warmup: false,
					has_list_hygiene: false,
					first_active_round: null
				}
			},
			deliveryRate: 1.0
		});

		expect(result.baseRevenue).toBe(150);
		expect(result.actualRevenue).toBe(150);
		expect(result.perClient[0].baseRevenue).toBe(150);
		expect(result.perClient[0].actualRevenue).toBe(150);
	});

	test('no active clients', () => {
		const result = calculateRevenue({
			clients: [],
			clientStates: {},
			deliveryRate: 1.0
		});

		expect(result.baseRevenue).toBe(0);
		expect(result.actualRevenue).toBe(0);
		expect(result.perClient).toHaveLength(0);
	});

	test('all clients paused', () => {
		const premium = buildTestClient('premium_brand', { id: 'client-1' });
		const startup = buildTestClient('growing_startup', { id: 'client-2' });

		const result = calculateRevenue({
			clients: [premium, startup],
			clientStates: {
				'client-1': {
					status: 'Paused',
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
			deliveryRate: 1.0
		});

		expect(result.baseRevenue).toBe(0);
		expect(result.actualRevenue).toBe(0);
		expect(result.perClient).toHaveLength(0);
	});
});
