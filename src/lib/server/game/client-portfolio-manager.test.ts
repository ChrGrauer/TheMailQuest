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
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: 1
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
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: 1
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
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: 1
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
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: 1
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
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null // New client
					}
				}
			};

			const result = configureOnboarding(team, 'client-001', { warmup: true, listHygiene: false });

			expect(result.success).toBe(true);
			expect(result.team?.client_states?.['client-001'].has_warmup).toBe(true);
			expect(result.team?.client_states?.['client-001'].has_list_hygiene).toBe(false);
			expect(result.team?.credits).toBe(850); // 1000 - 150
			expect(result.cost).toBe(150);
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
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
					}
				}
			};

			const result = configureOnboarding(team, 'client-001', { warmup: false, listHygiene: true });

			expect(result.success).toBe(true);
			expect(result.team?.client_states?.['client-001'].has_list_hygiene).toBe(true);
			expect(result.team?.credits).toBe(920); // 1000 - 80
			expect(result.cost).toBe(80);
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
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
					}
				}
			};

			const result = configureOnboarding(team, 'client-001', { warmup: true, listHygiene: true });

			expect(result.success).toBe(true);
			expect(result.team?.client_states?.['client-001'].has_warmup).toBe(true);
			expect(result.team?.client_states?.['client-001'].has_list_hygiene).toBe(true);
			expect(result.team?.credits).toBe(770); // 1000 - 150 - 80
			expect(result.cost).toBe(230);
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
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
					}
				}
			};

			const result = configureOnboarding(team, 'client-001', { warmup: true, listHygiene: true });

			expect(result.success).toBe(true);
			expect(result.team?.credits).toBe(270); // 500 - 230
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
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: 1 // Existing client
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
				credits: 100, // Not enough for both options
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: ['client-001'],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {
					'client-001': {
						status: 'Active',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
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
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
					}
				}
			};

			const result = configureOnboarding(team, 'client-001', { warmup: true, listHygiene: false });

			// Should return new team object
			expect(result.team).not.toBe(team);
			expect(result.team?.client_states).not.toBe(team.client_states);
			// Original team unchanged
			expect(team.credits).toBe(1000);
			expect(team.client_states?.['client-001'].has_warmup).toBe(false);
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
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: 1
					},
					'client-002': {
						status: 'Active',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: 1
					},
					'client-003': {
						status: 'Active',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: 1
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

			const revenue = calculateRevenuePreview(team, clients);

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
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: 1
					},
					'client-002': {
						status: 'Paused',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: 1
					},
					'client-003': {
						status: 'Active',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: 1
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

			const revenue = calculateRevenuePreview(team, clients);

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
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: 1
					},
					'client-002': {
						status: 'Suspended',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: 1
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

			const revenue = calculateRevenuePreview(team, clients);

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
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: 1
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

			const revenue = calculateRevenuePreview(team, clients);

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
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
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
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
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

			// Should be: 770 (1000 - 230 onboarding costs, no revenue)
			expect(forecast).toBe(770);
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
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: null
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

			// Should be: 20 (250 - 230)
			expect(forecast).toBe(20);
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
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: 1
					},
					'client-002': {
						status: 'Paused',
						has_warmup: false,
						has_list_hygiene: false,
						first_active_round: 1
					}
				}
			};

			const forecast = calculateBudgetForecast(team);

			// Should be: 542 (exactly team.credits, regardless of active/paused clients)
			expect(forecast).toBe(542);
		});
	});
});
