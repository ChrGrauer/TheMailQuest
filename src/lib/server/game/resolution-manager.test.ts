/**
 * Resolution Manager Integration Tests
 * US 3.3: Resolution Phase Automation - Iteration 1
 * ATDD: Test-first approach for integration
 */

import { describe, test, expect } from 'vitest';
import { executeResolution } from './resolution-manager';
import { buildTestSession, buildTestTeam } from './test-helpers/game-session-builder';
import { buildTestClient } from './test-helpers/client-test-fixtures';

describe('Resolution Manager - Iteration 1: Basic Volume & Revenue', () => {
	test('complete resolution for single ESP with one client', async () => {
		// Given: ESP with single premium_brand client
		const client = buildTestClient('premium_brand', { id: 'client-1' });
		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
					clients: [client],
					clientStates: {
						'client-1': {
							status: 'Active',
							has_warmup: false,
							has_list_hygiene: false,
							first_active_round: null
						}
					}
				}
			]
		});

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: Volume and revenue calculated correctly
		expect(results.espResults.SendWave).toBeDefined();
		expect(results.espResults.SendWave.volume.totalVolume).toBe(30000);
		expect(results.espResults.SendWave.revenue.baseRevenue).toBe(350);
		expect(results.espResults.SendWave.revenue.actualRevenue).toBe(350);
	});

	test('complete resolution with multiple clients', async () => {
		// Given: ESP with multiple active clients
		const premium = buildTestClient('premium_brand', { id: 'client-1' });
		const startup = buildTestClient('growing_startup', { id: 'client-2' });

		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
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
					}
				}
			]
		});

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: Volume and revenue summed correctly
		expect(results.espResults.SendWave.volume.totalVolume).toBe(65000); // 30K + 35K
		expect(results.espResults.SendWave.revenue.baseRevenue).toBe(530); // 350 + 180
		expect(results.espResults.SendWave.revenue.actualRevenue).toBe(530);
	});

	test('excludes paused clients properly', async () => {
		// Given: ESP with mix of active and paused clients
		const premium = buildTestClient('premium_brand', { id: 'client-1' });
		const aggressive = buildTestClient('aggressive_marketer', { id: 'client-2' });
		const startup = buildTestClient('growing_startup', { id: 'client-3' });

		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
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
					}
				}
			]
		});

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: Paused client excluded from calculations
		expect(results.espResults.SendWave.volume.totalVolume).toBe(65000); // 30K + 35K (excludes 80K)
		expect(results.espResults.SendWave.revenue.baseRevenue).toBe(530); // 350 + 180 (excludes 350)
		expect(results.espResults.SendWave.volume.activeClients).toHaveLength(2);
	});

	test('handles multiple ESP teams independently', async () => {
		// Given: Two ESP teams with different clients
		const team1Client = buildTestClient('premium_brand', { id: 'sw-client-1' });
		const team2Client = buildTestClient('re_engagement', { id: 'mm-client-1' });

		const session = buildTestSession({
			currentRound: 1,
			teams: [
				{
					name: 'SendWave',
					clients: [team1Client],
					clientStates: {
						'sw-client-1': {
							status: 'Active',
							has_warmup: false,
							has_list_hygiene: false,
							first_active_round: null
						}
					}
				},
				{
					name: 'MailMonkey',
					clients: [team2Client],
					clientStates: {
						'mm-client-1': {
							status: 'Active',
							has_warmup: false,
							has_list_hygiene: false,
							first_active_round: null
						}
					}
				}
			]
		});

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: Both teams calculated independently
		expect(results.espResults.SendWave.volume.totalVolume).toBe(30000);
		expect(results.espResults.SendWave.revenue.baseRevenue).toBe(350);

		expect(results.espResults.MailMonkey.volume.totalVolume).toBe(50000);
		expect(results.espResults.MailMonkey.revenue.baseRevenue).toBe(150);
	});
});
