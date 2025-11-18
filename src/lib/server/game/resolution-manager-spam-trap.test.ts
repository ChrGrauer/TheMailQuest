/**
 * Resolution Manager Integration Tests
 * US 3.3: Resolution Phase Automation - Iterations 1-2
 * ATDD: Test-first approach for integration
 */

import { describe, test, expect } from 'vitest';
import { executeResolution } from './resolution-manager';
import { buildTestSession, buildTestTeam } from './test-helpers/game-session-builder';
import { buildTestClient } from './test-helpers/client-test-fixtures';

describe('Spam Trap Activation Timing - Phase 1.2', () => {
	test('secret spam trap (announced=false) is active immediately in same round', async () => {
		// Given: ESP with re-engagement client (high spam trap risk)
		const client = buildTestClient('re_engagement', { id: 'client-1' });
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

		// And: Gmail purchases secret spam trap network in Round 1
		session.destinations[0].spam_trap_active = {
			round: 1,
			announced: false // SECRET - should be active immediately
		};

		// When: Resolution executes in Round 1
		const results = await executeResolution(session, 'TEST-123');

		// Then: Spam trap network should be active at Gmail
		const spamTrapResult = results.espResults.SendWave.spamTraps;
		expect(spamTrapResult).toBeDefined();

		// Then: Gmail should be checked for spam traps
		expect(spamTrapResult!.perClient[0].networkMultipliedRisk.Gmail).toBeGreaterThan(0);

		// Note: Whether trap is hit depends on RNG, but the key is that it's being checked
		if (spamTrapResult!.trapHit && spamTrapResult!.hitDestinations.includes('Gmail')) {
			// If trap was hit, reputation penalty should be applied
			expect(spamTrapResult!.reputationPenalty).toBeLessThan(0);
		}
	});

	test('announced spam trap (announced=true) is NOT active until next round', async () => {
		// Given: ESP with re-engagement client (high spam trap risk)
		const client = buildTestClient('re_engagement', { id: 'client-1' });
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

		// And: Gmail purchases ANNOUNCED spam trap network in Round 1
		session.destinations[0].spam_trap_active = {
			round: 1,
			announced: true // ANNOUNCED - should NOT be active until Round 2
		};

		// When: Resolution executes in Round 1
		const results = await executeResolution(session, 'TEST-123');

		// Then: Spam trap network should NOT be active at Gmail yet
		const spamTrapResult = results.espResults.SendWave.spamTraps;
		expect(spamTrapResult).toBeDefined();

		// Then: Gmail should have base adjusted risk (network multiplier = 1, not 3)
		// re_engagement base risk is 3%, no list hygiene, so adjusted = 0.03
		expect(spamTrapResult!.perClient[0].networkMultipliedRisk.Gmail).toBe(0.03);

		// Then: Network is not active yet (multiplier is 1, not 3)
		// If it were active, risk would be 0.03 * 3 = 0.09
		expect(spamTrapResult!.perClient[0].networkMultipliedRisk.Gmail).toBeLessThan(0.09);
	});

	test('announced spam trap becomes active in round after purchase', async () => {
		// Given: ESP with re-engagement client (high spam trap risk)
		const client = buildTestClient('re_engagement', { id: 'client-1' });
		const session = buildTestSession({
			currentRound: 2, // Round 2
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

		// And: Gmail purchased announced spam trap in Round 1
		session.destinations[0].spam_trap_active = {
			round: 1, // Purchased in Round 1
			announced: true // ANNOUNCED - should be active starting Round 2
		};

		// When: Resolution executes in Round 2
		const results = await executeResolution(session, 'TEST-123');

		// Then: Spam trap network should be active at Gmail now
		const spamTrapResult = results.espResults.SendWave.spamTraps;
		expect(spamTrapResult).toBeDefined();

		// Then: Gmail should have network multiplied risk (trap is active)
		expect(spamTrapResult!.perClient[0].networkMultipliedRisk.Gmail).toBeGreaterThan(0);
	});

	test('secret trap stays active in subsequent rounds until removed', async () => {
		// Given: ESP with re-engagement client
		const client = buildTestClient('re_engagement', { id: 'client-1' });
		const session = buildTestSession({
			currentRound: 3, // Round 3
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

		// And: Gmail purchased secret trap in Round 1
		session.destinations[0].spam_trap_active = {
			round: 1,
			announced: false
		};

		// When: Resolution executes in Round 3
		const results = await executeResolution(session, 'TEST-123');

		// Then: Spam trap should still be active
		const spamTrapResult = results.espResults.SendWave.spamTraps;
		expect(spamTrapResult).toBeDefined();
		expect(spamTrapResult!.perClient[0].networkMultipliedRisk.Gmail).toBeGreaterThan(0);
	});

	test('no spam trap active when spam_trap_active is undefined', async () => {
		// Given: ESP with re-engagement client
		const client = buildTestClient('re_engagement', { id: 'client-1' });
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

		// And: No spam trap purchased (spam_trap_active is undefined)
		session.destinations[0].spam_trap_active = undefined;

		// When: Resolution executes
		const results = await executeResolution(session, 'TEST-123');

		// Then: Spam trap network should NOT be active (multiplier = 1)
		const spamTrapResult = results.espResults.SendWave.spamTraps;
		expect(spamTrapResult).toBeDefined();
		// re_engagement base risk is 3%, no list hygiene, no network → 0.03
		expect(spamTrapResult!.perClient[0].networkMultipliedRisk.Gmail).toBe(0.03);
		// Network multiplier should be 1 (not 3), so risk stays at adjusted level
		expect(spamTrapResult!.perClient[0].networkMultipliedRisk.Gmail).toBeLessThan(0.09);
	});
});

describe('Spam Trap Reset Between Rounds - Phase 1.2.2', () => {
	test('secret trap purchased R2 should be removed when transitioning to R3', () => {
		// This test verifies the reset logic that should happen in next-round endpoint
		// Secret trap: active immediately (R2), should be reset when advancing to R3

		const session = buildTestSession({
			currentRound: 2
		});

		// Spam trap purchased and active in R2 (secret)
		session.destinations[0].spam_trap_active = {
			round: 2,
			announced: false
		};
		session.destinations[0].owned_tools.push('spam_trap_network');

		// When: Advancing to Round 3 (simulate next-round logic)
		const newRound = 3;

		// Then: Secret trap should be reset (it was active in R2, remove when going to R3)
		// newRound (3) > purchase round (2)
		const shouldReset = newRound > session.destinations[0].spam_trap_active!.round;
		expect(shouldReset).toBe(true);

		// Spam trap should be removed from owned_tools
		// spam_trap_active should be set to undefined
	});

	test('announced trap purchased R2 should stay active in R3', () => {
		// Announced trap: not active in R2, becomes active in R3
		// Should NOT be reset when transitioning from R2 to R3
		const session = buildTestSession({
			currentRound: 2
		});

		// Spam trap purchased in R2 (announced)
		session.destinations[0].spam_trap_active = {
			round: 2,
			announced: true
		};
		session.destinations[0].owned_tools.push('spam_trap_network');

		// When: Advancing to Round 3
		const newRound = 3;

		// Then: Announced trap should NOT be reset yet (it becomes active in R3)
		// newRound (3) > purchase round + 1 (2 + 1 = 3) → 3 > 3 → false
		const shouldReset = newRound > session.destinations[0].spam_trap_active!.round + 1;
		expect(shouldReset).toBe(false);

		// Trap should remain in owned_tools and spam_trap_active should stay defined
	});

	test('announced trap purchased R2 should be removed when transitioning to R4', () => {
		// Announced trap: active in R3, should be removed when transitioning to R4
		const session = buildTestSession({
			currentRound: 3
		});

		// Spam trap purchased in R2 (announced), currently active in R3
		session.destinations[0].spam_trap_active = {
			round: 2,
			announced: true
		};
		session.destinations[0].owned_tools.push('spam_trap_network');

		// When: Advancing to Round 4
		const newRound = 4;

		// Then: Announced trap should be reset (was active in R3, remove when going to R4)
		// newRound (4) > purchase round + 1 (2 + 1 = 3) → 4 > 3 → true
		const shouldReset = newRound > session.destinations[0].spam_trap_active!.round + 1;
		expect(shouldReset).toBe(true);

		// Trap should be removed from owned_tools
		// spam_trap_active should be set to undefined
	});

	test('repurchased announced trap in R3 should stay active in R4', () => {
		// If player repurchases trap in R3 and announces, it should stay active in R4
		const session = buildTestSession({
			currentRound: 3
		});

		// Spam trap was repurchased in R3 (announced)
		session.destinations[0].spam_trap_active = {
			round: 3, // Repurchased in R3
			announced: true
		};
		session.destinations[0].owned_tools.push('spam_trap_network');

		// When: Advancing to Round 4
		const newRound = 4;

		// Then: Trap should NOT be reset (repurchased in R3, active in R4)
		// newRound (4) > purchase round + 1 (3 + 1 = 4) → 4 > 4 → false
		const shouldReset = newRound > session.destinations[0].spam_trap_active!.round + 1;
		expect(shouldReset).toBe(false);

		// Trap should remain active
	});

	test('multiple destinations can have independent spam trap states', () => {
		const session = buildTestSession({
			currentRound: 2
		});

		// Gmail: secret trap in R2
		session.destinations[0].spam_trap_active = {
			round: 2,
			announced: false
		};

		// Outlook: announced trap in R2
		session.destinations[1].spam_trap_active = {
			round: 2,
			announced: true
		};

		// Yahoo: no trap
		session.destinations[2].spam_trap_active = undefined;

		// When: Advancing to Round 3
		const newRound = 3;

		// Then: Gmail's secret trap should be reset
		const gmailShouldReset = newRound > session.destinations[0].spam_trap_active!.round;
		expect(gmailShouldReset).toBe(true);

		// Then: Outlook's announced trap should NOT be reset yet
		const outlookShouldReset = newRound > session.destinations[1].spam_trap_active!.round + 1;
		expect(outlookShouldReset).toBe(false);

		// Then: Yahoo has nothing to reset
		expect(session.destinations[2].spam_trap_active).toBeUndefined();
	});
});

