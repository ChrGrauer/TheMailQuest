/**
 * Unit Tests for Client Portfolio Manager
 * US-2.4: Client Basic Management
 *
 * Tests immutable state management for client portfolio operations:
 * - Toggle client status (Active/Paused/Suspended)
 * - Configure onboarding options (warm-up, list hygiene)
 * - Calculate revenue preview (active clients only)
 * - Calculate budget forecast (credits + revenue - costs)
 */

import { describe, it, expect } from 'vitest';
import {
	toggleClientStatus,
	configureOnboarding,
	getClientWithState,
	calculateRevenuePreview,
	calculateBudgetForecast
} from '$lib/server/game/client-portfolio-manager';
import { WARMUP_COST, LIST_HYGIENE_COST } from '$lib/config/client-onboarding';
import type { ESPTeam, Client, ClientState } from '$lib/server/game/types';

describe('Client Portfolio Manager', () => {
	// ============================================================================
	// TEST SUITE: toggleClientStatus()
	// ============================================================================

	describe('toggleClientStatus()', () => {
		it('should toggle client from Active to Paused', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 1000,
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: ['client-001'],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {
					'client-001': {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				}
			};

			const result = toggleClientStatus(team, 'client-001', 'Paused');

			expect(result.success).toBe(true);
			expect(result.team?.client_states?.['client-001'].status).toBe('Paused');
			// Verify immutability - original team unchanged
			expect(team.client_states?.['client-001'].status).toBe('Active');
		});

		it('should toggle client from Paused to Active', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 1000,
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: ['client-001'],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {
					'client-001': {
						status: 'Paused',
						first_active_round: 1,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				}
			};

			const result = toggleClientStatus(team, 'client-001', 'Active');

			expect(result.success).toBe(true);
			expect(result.team?.client_states?.['client-001'].status).toBe('Active');
		});

		it('should fail to toggle suspended client', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 1000,
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: ['client-001'],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {
					'client-001': {
						status: 'Suspended',
						first_active_round: 1,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				}
			};

			const result = toggleClientStatus(team, 'client-001', 'Active');

			expect(result.success).toBe(false);
			expect(result.error).toContain('suspended');
		});

		it('should fail for non-existent client', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 1000,
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: [],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {}
			};

			const result = toggleClientStatus(team, 'non-existent', 'Active');

			expect(result.success).toBe(false);
			expect(result.error).toContain('not found');
		});

		it('should return immutable updated team', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 1000,
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: ['client-001'],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {
					'client-001': {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				}
			};

			const result = toggleClientStatus(team, 'client-001', 'Paused');

			// Should return new team object
			expect(result.team).not.toBe(team);
			expect(result.team?.client_states).not.toBe(team.client_states);
			expect(result.team?.client_states?.['client-001']).not.toBe(
				team.client_states?.['client-001']
			);
		});
	});

	// ============================================================================
	// TEST SUITE: configureOnboarding()
	// ============================================================================

	describe('configureOnboarding()', () => {
		it('should configure warm-up for new client', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 1000,
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: ['client-001'],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {
					'client-001': {
						status: 'Active',
						first_active_round: null, // New client
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				}
			};

			const result = configureOnboarding(team, 'client-001', { warmup: true, listHygiene: false });

			expect(result.success).toBe(true);
			// Check warmup modifier was added
			expect(
				result.team?.client_states?.['client-001'].volumeModifiers.some(
					(m) => m.source === 'warmup'
				)
			).toBe(true);
			// Check list hygiene modifier was NOT added
			expect(
				result.team?.client_states?.['client-001'].volumeModifiers.some(
					(m) => m.source === 'list_hygiene'
				)
			).toBe(false);
			expect(result.team?.credits).toBe(1000 - WARMUP_COST);
			expect(result.cost).toBe(WARMUP_COST);
		});

		it('should configure list hygiene for new client', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 1000,
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: ['client-001'],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {
					'client-001': {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				}
			};

			const result = configureOnboarding(team, 'client-001', { warmup: false, listHygiene: true });

			expect(result.success).toBe(true);
			// Check list hygiene modifiers were added (volume + spam trap)
			expect(
				result.team?.client_states?.['client-001'].volumeModifiers.some(
					(m) => m.source === 'list_hygiene'
				)
			).toBe(true);
			expect(
				result.team?.client_states?.['client-001'].spamTrapModifiers.some(
					(m) => m.source === 'list_hygiene'
				)
			).toBe(true);
			expect(result.team?.credits).toBe(1000 - LIST_HYGIENE_COST);
			expect(result.cost).toBe(LIST_HYGIENE_COST);
		});

		it('should configure both options for new client', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 1000,
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: ['client-001'],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {
					'client-001': {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				}
			};

			const result = configureOnboarding(team, 'client-001', { warmup: true, listHygiene: true });

			expect(result.success).toBe(true);
			// Check warmup modifier was added
			expect(
				result.team?.client_states?.['client-001'].volumeModifiers.some(
					(m) => m.source === 'warmup'
				)
			).toBe(true);
			// Check list hygiene modifiers were added (volume + spam trap)
			expect(
				result.team?.client_states?.['client-001'].volumeModifiers.some(
					(m) => m.source === 'list_hygiene'
				)
			).toBe(true);
			expect(
				result.team?.client_states?.['client-001'].spamTrapModifiers.some(
					(m) => m.source === 'list_hygiene'
				)
			).toBe(true);
			expect(result.team?.credits).toBe(1000 - (WARMUP_COST + LIST_HYGIENE_COST));
			expect(result.cost).toBe(WARMUP_COST + LIST_HYGIENE_COST);
		});

		it('should deduct costs from credits', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 500,
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: ['client-001'],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {
					'client-001': {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				}
			};

			const result = configureOnboarding(team, 'client-001', { warmup: true, listHygiene: true });

			expect(result.success).toBe(true);
			const expectedCost = WARMUP_COST + LIST_HYGIENE_COST;
			expect(result.team?.credits).toBe(500 - expectedCost);
		});

		it('should fail for existing client (first_active_round set)', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 1000,
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: ['client-001'],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {
					'client-001': {
						status: 'Active',
						first_active_round: 1, // Existing client
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				}
			};

			const result = configureOnboarding(team, 'client-001', { warmup: true, listHygiene: false });

			expect(result.success).toBe(false);
			expect(result.error).toContain('already been activated');
		});

		it('should fail with insufficient budget', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 50, // Not enough for both (need 90)
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: ['client-001'],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {
					'client-001': {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				}
			};

			const result = configureOnboarding(team, 'client-001', { warmup: true, listHygiene: true });

			expect(result.success).toBe(false);
			expect(result.error).toContain('Insufficient credits');
		});

		it('should return immutable updated team', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 1000,
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: ['client-001'],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {
					'client-001': {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				}
			};

			const result = configureOnboarding(team, 'client-001', { warmup: true, listHygiene: false });

			// Should return new team object
			expect(result.team).not.toBe(team);
			expect(result.team?.client_states).not.toBe(team.client_states);
			// Original team unchanged
			expect(team.credits).toBe(1000);
			expect(
				team.client_states?.['client-001'].volumeModifiers.some((m) => m.source === 'warmup')
			).toBe(false);
		});
	});

	// ============================================================================
	// TEST SUITE: calculateRevenuePreview()
	// ============================================================================

	describe('calculateRevenuePreview()', () => {
		it('should calculate revenue from active clients only', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 1000,
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: ['client-001', 'client-002', 'client-003'],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {
					'client-001': {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [],
						spamTrapModifiers: []
					},
					'client-002': {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [],
						spamTrapModifiers: []
					},
					'client-003': {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				}
			};

			const clients: Client[] = [
				{
					id: 'client-001',
					name: 'Client 1',
					type: 'growing_startup',
					cost: 150,
					revenue: 200,
					volume: 50000,
					risk: 'Medium',
					spam_rate: 1.2,
					available_from_round: 1
				},
				{
					id: 'client-002',
					name: 'Client 2',
					type: 'growing_startup',
					cost: 150,
					revenue: 180,
					volume: 40000,
					risk: 'Medium',
					spam_rate: 1.2,
					available_from_round: 1
				},
				{
					id: 'client-003',
					name: 'Client 3',
					type: 'premium_brand',
					cost: 300,
					revenue: 150,
					volume: 30000,
					risk: 'Low',
					spam_rate: 0.5,
					available_from_round: 1
				}
			];

			const revenue = calculateRevenuePreview(team, clients, 1);

			expect(revenue).toBe(530); // 200 + 180 + 150
		});

		it('should exclude paused clients', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 1000,
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: ['client-001', 'client-002', 'client-003'],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {
					'client-001': {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [],
						spamTrapModifiers: []
					},
					'client-002': {
						status: 'Paused',
						first_active_round: 1,
						volumeModifiers: [],
						spamTrapModifiers: []
					},
					'client-003': {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				}
			};

			const clients: Client[] = [
				{
					id: 'client-001',
					name: 'Client 1',
					type: 'growing_startup',
					cost: 150,
					revenue: 200,
					volume: 50000,
					risk: 'Medium',
					spam_rate: 1.2,
					available_from_round: 1
				},
				{
					id: 'client-002',
					name: 'Client 2',
					type: 'growing_startup',
					cost: 150,
					revenue: 180,
					volume: 40000,
					risk: 'Medium',
					spam_rate: 1.2,
					available_from_round: 1
				},
				{
					id: 'client-003',
					name: 'Client 3',
					type: 'premium_brand',
					cost: 300,
					revenue: 150,
					volume: 30000,
					risk: 'Low',
					spam_rate: 0.5,
					available_from_round: 1
				}
			];

			const revenue = calculateRevenuePreview(team, clients, 1);

			expect(revenue).toBe(350); // 200 + 150 (excludes 180 from paused client)
		});

		it('should exclude suspended clients', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 1000,
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: ['client-001', 'client-002'],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {
					'client-001': {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [],
						spamTrapModifiers: []
					},
					'client-002': {
						status: 'Suspended',
						first_active_round: 1,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				}
			};

			const clients: Client[] = [
				{
					id: 'client-001',
					name: 'Client 1',
					type: 'growing_startup',
					cost: 150,
					revenue: 200,
					volume: 50000,
					risk: 'Medium',
					spam_rate: 1.2,
					available_from_round: 1
				},
				{
					id: 'client-002',
					name: 'Client 2',
					type: 'growing_startup',
					cost: 150,
					revenue: 180,
					volume: 40000,
					risk: 'Medium',
					spam_rate: 1.2,
					available_from_round: 1
				}
			];

			const revenue = calculateRevenuePreview(team, clients, 1);

			expect(revenue).toBe(200); // Only active client
		});

		it('should return 0 when no active clients', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 1000,
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: ['client-001'],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {
					'client-001': {
						status: 'Paused',
						first_active_round: 1,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				}
			};

			const clients: Client[] = [
				{
					id: 'client-001',
					name: 'Client 1',
					type: 'growing_startup',
					cost: 150,
					revenue: 200,
					volume: 50000,
					risk: 'Medium',
					spam_rate: 1.2,
					available_from_round: 1
				}
			];

			const revenue = calculateRevenuePreview(team, clients, 1);

			expect(revenue).toBe(0);
		});
	});

	// ============================================================================
	// TEST SUITE: calculateBudgetForecast()
	// ============================================================================

	describe('calculateBudgetForecast()', () => {
		it('should return current credits only (no revenue)', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 1000,
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: ['client-001'],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {
					'client-001': {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				}
			};

			const forecast = calculateBudgetForecast(team);

			// Should be: 1000 (current credits only, no revenue added)
			expect(forecast).toBe(1000);
		});

		it('should reflect credits after onboarding costs deducted', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 1000,
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: ['client-001'],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {
					'client-001': {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				}
			};

			// Configure onboarding first (deducts 230 credits)
			const configured = configureOnboarding(team, 'client-001', {
				warmup: true,
				listHygiene: true
			});

			// Calculate forecast
			const forecast = calculateBudgetForecast(configured.team!);

			const expectedCost = WARMUP_COST + LIST_HYGIENE_COST;
			// Should be: 1000 - onboarding costs
			expect(forecast).toBe(1000 - expectedCost);
		});

		it('should work with low remaining credits after onboarding', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 250, // Just enough for both options
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: ['client-001'],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {
					'client-001': {
						status: 'Active',
						first_active_round: null,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				}
			};

			// Configure expensive onboarding (230 cost)
			const configured = configureOnboarding(team, 'client-001', {
				warmup: true,
				listHygiene: true
			});

			expect(configured.success).toBe(true);
			const forecast = calculateBudgetForecast(configured.team!);

			const expectedCost = WARMUP_COST + LIST_HYGIENE_COST;
			// Should be: 250 - expectedCost
			expect(forecast).toBe(250 - expectedCost);
		});

		it('should return exact credits value (no calculations)', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 542, // Arbitrary value
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: ['client-001', 'client-002'],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {
					'client-001': {
						status: 'Active',
						first_active_round: 1,
						volumeModifiers: [],
						spamTrapModifiers: []
					},
					'client-002': {
						status: 'Paused',
						first_active_round: 1,
						volumeModifiers: [],
						spamTrapModifiers: []
					}
				}
			};

			const forecast = calculateBudgetForecast(team);

			// Should be: 542 (exactly team.credits, regardless of active/paused clients)
			expect(forecast).toBe(542);
		});
	});
});
