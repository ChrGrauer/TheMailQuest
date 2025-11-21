/**
 * Resolution Manager Integration Tests
 * US 3.3: Resolution Phase Automation - Iterations 1-2
 * ATDD: Test-first approach for integration
 */

import { describe, test, expect } from 'vitest';
import { executeResolution } from './resolution-manager';
import { buildTestSession, buildTestTeam } from './test-helpers/game-session-builder';
import { buildTestClient } from './test-helpers/client-test-fixtures';

describe('Resolution Manager - Phase 3.3.1: Data Privacy - Satisfaction Not Visible to ESP', () => {
	test('ESP resolution results should NOT include satisfaction data', async () => {
		// Given: ESP with active clients
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
							first_active_round: null,
							volumeModifiers: [],
							spamTrapModifiers: []
						}
					}
				}
			]
		});

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: ESP results should exist
		expect(results.espResults.SendWave).toBeDefined();

		// Then: ESP results should NOT include satisfaction data
		// Satisfaction should only be visible to destination players
		expect(results.espResults.SendWave.satisfaction).toBeUndefined();

		// And: ESP results should include all other expected data
		expect(results.espResults.SendWave.volume).toBeDefined();
		expect(results.espResults.SendWave.delivery).toBeDefined();
		expect(results.espResults.SendWave.revenue).toBeDefined();
		expect(results.espResults.SendWave.reputation).toBeDefined();
		expect(results.espResults.SendWave.complaints).toBeDefined();
	});

	test('Destination results should still include satisfaction data', async () => {
		// Given: Game session with ESP and destinations
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
							first_active_round: null,
							volumeModifiers: [],
							spamTrapModifiers: []
						}
					}
				}
			]
		});

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: Destination results should include aggregated satisfaction
		expect(results.destinationResults.Gmail).toBeDefined();
		expect(results.destinationResults.Gmail.aggregatedSatisfaction).toBeDefined();
		expect(typeof results.destinationResults.Gmail.aggregatedSatisfaction).toBe('number');
	});
});
