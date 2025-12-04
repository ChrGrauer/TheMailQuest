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
					first_active_round: null,
					volumeModifiers: [],
					spamTrapModifiers: []
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
					first_active_round: null,
					volumeModifiers: [],
					spamTrapModifiers: []
				},
				'client-2': {
					status: 'Active',
					first_active_round: null,
					volumeModifiers: [],
					spamTrapModifiers: []
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
					first_active_round: null,
					volumeModifiers: [],
					spamTrapModifiers: []
				},
				'client-2': {
					status: 'Paused',
					first_active_round: null,
					volumeModifiers: [],
					spamTrapModifiers: []
				},
				'client-3': {
					status: 'Active',
					first_active_round: null,
					volumeModifiers: [],
					spamTrapModifiers: []
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
					first_active_round: null,
					volumeModifiers: [],
					spamTrapModifiers: []
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
					first_active_round: null,
					volumeModifiers: [],
					spamTrapModifiers: []
				},
				'client-2': {
					status: 'Paused',
					first_active_round: null,
					volumeModifiers: [],
					spamTrapModifiers: []
				}
			},
			deliveryRate: 1.0
		});

		expect(result.baseRevenue).toBe(0);
		expect(result.actualRevenue).toBe(0);
		expect(result.perClient).toHaveLength(0);
	});
});

describe('Revenue Calculator - Volume Multipliers', () => {
	test('warmup reduces revenue by 50% in first active round', () => {
		const premium = buildTestClient('premium_brand', { id: 'client-1', revenue: 350 });

		// Scenario: Client with warmup in round 1 (first active round)
		// Expected: Volume reduced by 50%, revenue should also be reduced by 50%
		const result = calculateRevenue({
			clients: [premium],
			clientStates: {
				'client-1': {
					status: 'Active',
					first_active_round: 1,
					volumeModifiers: [
						{ id: 'warmup', source: 'warmup', multiplier: 0.5, applicableRounds: [1] }
					],
					spamTrapModifiers: []
				}
			},
			deliveryRate: 1.0,
			currentRound: 1,
			// Cumulative volume multiplier is 0.5 (from warmup)
			perClientVolumeMultipliers: {
				'client-1': 0.5
			}
		});

		expect(result.baseRevenue).toBe(350);
		// Actual revenue should be 50% of base due to warmup
		expect(result.actualRevenue).toBe(175); // 350 * 0.5
		expect(result.perClient[0].actualRevenue).toBe(175);
	});

	test('no warmup reduction after first round', () => {
		const premium = buildTestClient('premium_brand', { id: 'client-1', revenue: 350 });

		// Scenario: Client in round 2 (warmup no longer applies)
		// Expected: Full revenue (warmup only applies to first round)
		const result = calculateRevenue({
			clients: [premium],
			clientStates: {
				'client-1': {
					status: 'Active',
					first_active_round: 1,
					volumeModifiers: [
						{ id: 'warmup', source: 'warmup', multiplier: 0.5, applicableRounds: [1] }
					],
					spamTrapModifiers: []
				}
			},
			deliveryRate: 1.0,
			currentRound: 2,
			perClientVolumeMultipliers: {
				'client-1': 1.0 // No reduction in round 2
			}
		});

		expect(result.baseRevenue).toBe(350);
		expect(result.actualRevenue).toBe(350);
	});

	test('volume multiplier combines with delivery rate', () => {
		const premium = buildTestClient('premium_brand', { id: 'client-1', revenue: 350 });

		// Scenario: Warmup (50%) + 80% delivery rate
		// Expected: Revenue reduced by both factors: 350 * 0.5 * 0.8 = 140
		const result = calculateRevenue({
			clients: [premium],
			clientStates: {
				'client-1': {
					status: 'Active',
					first_active_round: 1,
					volumeModifiers: [
						{ id: 'warmup', source: 'warmup', multiplier: 0.5, applicableRounds: [1] }
					],
					spamTrapModifiers: []
				}
			},
			deliveryRate: 0.8,
			currentRound: 1,
			perClientVolumeMultipliers: {
				'client-1': 0.5
			}
		});

		expect(result.baseRevenue).toBe(350);
		expect(result.actualRevenue).toBe(140); // 350 * 0.5 * 0.8
	});

	test('multiple clients with mixed volume multipliers', () => {
		const premium = buildTestClient('premium_brand', { id: 'client-1', revenue: 350 });
		const startup = buildTestClient('growing_startup', { id: 'client-2', revenue: 180 });
		const aggressive = buildTestClient('aggressive_marketer', { id: 'client-3', revenue: 350 });

		// Client 1: Warmup active (50% revenue)
		// Client 2: No modifiers (100% revenue)
		// Client 3: Warmup active (50% revenue)
		const result = calculateRevenue({
			clients: [premium, startup, aggressive],
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
				},
				'client-3': {
					status: 'Active',
					first_active_round: 1,
					volumeModifiers: [
						{ id: 'warmup', source: 'warmup', multiplier: 0.5, applicableRounds: [1] }
					],
					spamTrapModifiers: []
				}
			},
			deliveryRate: 1.0,
			currentRound: 1,
			perClientVolumeMultipliers: {
				'client-1': 0.5, // Warmup active
				'client-2': 1.0, // No modifiers
				'client-3': 0.5 // Warmup active
			}
		});

		expect(result.baseRevenue).toBe(880); // 350 + 180 + 350
		// Client 1: 350 * 0.5 = 175
		// Client 2: 180 * 1.0 = 180
		// Client 3: 350 * 0.5 = 175
		expect(result.actualRevenue).toBe(530); // 175 + 180 + 175

		expect(result.perClient[0].actualRevenue).toBe(175); // client-1
		expect(result.perClient[1].actualRevenue).toBe(180); // client-2
		expect(result.perClient[2].actualRevenue).toBe(175); // client-3
	});

	test('INC-011 viral campaign 10x volume multiplier increases revenue', () => {
		const reengagement = buildTestClient('re_engagement', { id: 'client-1', revenue: 150 });

		// Scenario: Client goes viral (INC-011), 10x volume = 10x revenue
		const result = calculateRevenue({
			clients: [reengagement],
			clientStates: {
				'client-1': {
					status: 'Active',
					first_active_round: 1,
					volumeModifiers: [
						{ id: 'INC-011-client-1-r3', source: 'INC-011', multiplier: 10, applicableRounds: [3] }
					],
					spamTrapModifiers: []
				}
			},
			deliveryRate: 1.0,
			currentRound: 3,
			perClientVolumeMultipliers: {
				'client-1': 10.0 // Viral 10x multiplier
			}
		});

		expect(result.baseRevenue).toBe(150);
		expect(result.actualRevenue).toBe(1500); // 150 * 10 = 1500cr
		expect(result.perClient[0].actualRevenue).toBe(1500);
	});

	test('INC-015 Black Friday 2x volume multiplier doubles revenue', () => {
		const premium = buildTestClient('premium_brand', { id: 'client-1', revenue: 350 });

		// Scenario: Black Friday (INC-015), 2x volume = 2x revenue
		const result = calculateRevenue({
			clients: [premium],
			clientStates: {
				'client-1': {
					status: 'Active',
					first_active_round: 1,
					volumeModifiers: [
						{ id: 'INC-015-client-1-r4', source: 'INC-015', multiplier: 2, applicableRounds: [4] }
					],
					spamTrapModifiers: []
				}
			},
			deliveryRate: 1.0,
			currentRound: 4,
			perClientVolumeMultipliers: {
				'client-1': 2.0 // Black Friday 2x multiplier
			}
		});

		expect(result.baseRevenue).toBe(350);
		expect(result.actualRevenue).toBe(700); // 350 * 2 = 700cr
		expect(result.perClient[0].actualRevenue).toBe(700);
	});

	test('cumulative multipliers: warmup + viral = 0.5 * 10 = 5x', () => {
		const reengagement = buildTestClient('re_engagement', { id: 'client-1', revenue: 150 });

		// Scenario: Client goes viral in first round (warmup 0.5 + viral 10x = 5x)
		const result = calculateRevenue({
			clients: [reengagement],
			clientStates: {
				'client-1': {
					status: 'Active',
					first_active_round: 1,
					volumeModifiers: [
						{ id: 'warmup', source: 'warmup', multiplier: 0.5, applicableRounds: [1] },
						{ id: 'INC-011-client-1-r1', source: 'INC-011', multiplier: 10, applicableRounds: [1] }
					],
					spamTrapModifiers: []
				}
			},
			deliveryRate: 1.0,
			currentRound: 1,
			perClientVolumeMultipliers: {
				'client-1': 5.0 // 0.5 * 10 = 5x
			}
		});

		expect(result.baseRevenue).toBe(150);
		expect(result.actualRevenue).toBe(750); // 150 * 5 = 750cr
		expect(result.perClient[0].actualRevenue).toBe(750);
	});

	test('defaults to 1.0 multiplier if not provided', () => {
		const premium = buildTestClient('premium_brand', { id: 'client-1', revenue: 350 });

		const result = calculateRevenue({
			clients: [premium],
			clientStates: {
				'client-1': {
					status: 'Active',
					first_active_round: 1,
					volumeModifiers: [],
					spamTrapModifiers: []
				}
			},
			deliveryRate: 1.0,
			currentRound: 1
			// No perClientVolumeMultipliers provided
		});

		expect(result.baseRevenue).toBe(350);
		expect(result.actualRevenue).toBe(350); // Default 1.0 multiplier
	});
});
