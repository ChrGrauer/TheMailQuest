/**
 * Volume Calculator Unit Tests
 * US 3.3: Resolution Phase Automation - Iteration 1
 * ATDD: Test-first approach
 */

import { describe, test, expect } from 'vitest';
import { calculateVolume } from './volume-calculator';
import { buildTestClient } from '../test-helpers/client-test-fixtures';

describe('Volume Calculator - Iteration 1: Basic Volume', () => {
	test('single active client', () => {
		const client = buildTestClient('premium_brand', { id: 'client-1' });

		const result = calculateVolume({
			clients: [client],
			clientStates: {
				'client-1': {
					status: 'Active',
					has_warmup: false,
					has_list_hygiene: false,
					first_active_round: null
				}
			},
			currentRound: 1
		});

		expect(result.totalVolume).toBe(30000);
		expect(result.activeClients).toHaveLength(1);
		expect(result.clientVolumes).toHaveLength(1);
		expect(result.clientVolumes[0].clientId).toBe('client-1');
		expect(result.clientVolumes[0].baseVolume).toBe(30000);
		expect(result.clientVolumes[0].adjustedVolume).toBe(30000);
		expect(result.clientVolumes[0].adjustments).toEqual({});
	});

	test('multiple active clients', () => {
		const premium = buildTestClient('premium_brand', { id: 'client-1' });
		const startup = buildTestClient('growing_startup', { id: 'client-2' });

		const result = calculateVolume({
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
			currentRound: 1
		});

		expect(result.totalVolume).toBe(65000); // 30K + 35K
		expect(result.activeClients).toHaveLength(2);
		expect(result.clientVolumes).toHaveLength(2);
	});

	test('mix of active and paused clients', () => {
		const premium = buildTestClient('premium_brand', { id: 'client-1' });
		const aggressive = buildTestClient('aggressive_marketer', { id: 'client-2' });
		const startup = buildTestClient('growing_startup', { id: 'client-3' });

		const result = calculateVolume({
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
			currentRound: 1
		});

		expect(result.totalVolume).toBe(65000); // 30K + 35K (excludes paused 80K)
		expect(result.activeClients).toHaveLength(2);
		expect(result.clientVolumes).toHaveLength(2);
		expect(result.clientVolumes.find((cv) => cv.clientId === 'client-2')).toBeUndefined();
	});

	test('re-engagement client', () => {
		const reengagement = buildTestClient('re_engagement', { id: 'client-1' });

		const result = calculateVolume({
			clients: [reengagement],
			clientStates: {
				'client-1': {
					status: 'Active',
					has_warmup: false,
					has_list_hygiene: false,
					first_active_round: null
				}
			},
			currentRound: 1
		});

		expect(result.totalVolume).toBe(50000);
		expect(result.activeClients).toHaveLength(1);
		expect(result.clientVolumes[0].baseVolume).toBe(50000);
		expect(result.clientVolumes[0].adjustedVolume).toBe(50000);
	});

	test('no active clients', () => {
		const result = calculateVolume({
			clients: [],
			clientStates: {},
			currentRound: 1
		});

		expect(result.totalVolume).toBe(0);
		expect(result.activeClients).toHaveLength(0);
		expect(result.clientVolumes).toHaveLength(0);
	});

	test('all clients paused', () => {
		const premium = buildTestClient('premium_brand', { id: 'client-1' });
		const startup = buildTestClient('growing_startup', { id: 'client-2' });

		const result = calculateVolume({
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
			currentRound: 1
		});

		expect(result.totalVolume).toBe(0);
		expect(result.activeClients).toHaveLength(0);
		expect(result.clientVolumes).toHaveLength(0);
	});
});
