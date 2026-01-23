/**
 * Unit Tests for Client Portfolio Validator
 * US-2.4: Client Basic Management
 *
 * Tests validation logic for client portfolio operations:
 * - Status toggle validation (suspended clients cannot be toggled)
 * - Onboarding configuration validation (new clients only, budget checks)
 * - Lock-in validation (planning phase only, budget positive)
 */

import { describe, it, expect } from 'vitest';
import {
	validateStatusToggle,
	validateOnboardingConfig,
	validateLockIn
} from '$lib/server/game/validation/client-portfolio-validator';
import { WARMUP_COST, LIST_HYGIENE_COST } from '$lib/config/client-onboarding';
import type { ESPTeam } from '$lib/server/game/types';

describe('Client Portfolio Validator', () => {
	// ============================================================================
	// TEST SUITE: validateStatusToggle()
	// ============================================================================

	describe('validateStatusToggle()', () => {
		it('should allow toggle for Active client', () => {
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

			const result = validateStatusToggle(team, 'client-001', 'Paused');

			expect(result.canToggle).toBe(true);
			expect(result.reason).toBeUndefined();
		});

		it('should allow toggle for Paused client', () => {
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

			const result = validateStatusToggle(team, 'client-001', 'Active');

			expect(result.canToggle).toBe(true);
			expect(result.reason).toBeUndefined();
		});

		it('should prevent toggle for Suspended client', () => {
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

			const result = validateStatusToggle(team, 'client-001', 'Active');

			expect(result.canToggle).toBe(false);
			expect(result.reason).toBe('Suspended clients cannot be reactivated');
		});

		it('should prevent toggle to Suspended status', () => {
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

			const result = validateStatusToggle(team, 'client-001', 'Suspended');

			expect(result.canToggle).toBe(false);
			expect(result.reason).toContain('Suspended');
		});

		it('should prevent toggle for non-existent client', () => {
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

			const result = validateStatusToggle(team, 'non-existent', 'Active');

			expect(result.canToggle).toBe(false);
			expect(result.reason).toContain('not found');
		});

		it('should prevent toggle when client state is missing', () => {
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
				client_states: undefined // No client_states
			};

			const result = validateStatusToggle(team, 'client-001', 'Active');

			expect(result.canToggle).toBe(false);
			expect(result.reason).toBeDefined();
		});
	});

	// ============================================================================
	// TEST SUITE: validateOnboardingConfig()
	// ============================================================================

	describe('validateOnboardingConfig()', () => {
		it('should allow onboarding for new client (first_active_round = null)', () => {
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

			const result = validateOnboardingConfig(team, 'client-001', {
				warmup: true,
				listHygiene: false
			});

			expect(result.canConfigure).toBe(true);
			expect(result.reason).toBeUndefined();
		});

		it('should prevent onboarding for existing client', () => {
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

			const result = validateOnboardingConfig(team, 'client-001', {
				warmup: true,
				listHygiene: false
			});

			expect(result.canConfigure).toBe(false);
			expect(result.reason).toContain('already been activated');
		});

		it('should allow config with sufficient budget', () => {
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

			const result = validateOnboardingConfig(team, 'client-001', {
				warmup: true,
				listHygiene: true
			});

			expect(result.canConfigure).toBe(true);
		});

		it('should prevent config with insufficient budget', () => {
			const totalCost = WARMUP_COST + LIST_HYGIENE_COST;
			const availableCredits = totalCost - 10; // Insufficient

			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: availableCredits,
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

			const result = validateOnboardingConfig(team, 'client-001', {
				warmup: true,
				listHygiene: true
			});

			expect(result.canConfigure).toBe(false);
			expect(result.reason).toContain('Insufficient credits');
			expect(result.requiredCredits).toBe(totalCost);
			expect(result.availableCredits).toBe(availableCredits);
		});

		it('should validate warm-up option alone', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: WARMUP_COST, // Exactly enough for warm-up
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

			const result = validateOnboardingConfig(team, 'client-001', {
				warmup: true,
				listHygiene: false
			});

			expect(result.canConfigure).toBe(true);
		});

		it('should validate list hygiene option alone', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: LIST_HYGIENE_COST, // Exactly enough for list hygiene
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

			const result = validateOnboardingConfig(team, 'client-001', {
				warmup: false,
				listHygiene: true
			});

			expect(result.canConfigure).toBe(true);
		});

		it('should allow config with no options selected (0 cost)', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 0, // No credits
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

			const result = validateOnboardingConfig(team, 'client-001', {
				warmup: false,
				listHygiene: false
			});

			expect(result.canConfigure).toBe(true); // No cost, so allowed
		});

		it('should prevent config for non-existent client', () => {
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

			const result = validateOnboardingConfig(team, 'non-existent', {
				warmup: true,
				listHygiene: false
			});

			expect(result.canConfigure).toBe(false);
			expect(result.reason).toContain('not found');
		});
	});

	// ============================================================================
	// TEST SUITE: validateLockIn()
	// ============================================================================

	describe('validateLockIn()', () => {
		it('should allow lock-in during planning phase', () => {
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

			const result = validateLockIn(team, 'planning');

			expect(result.canLockIn).toBe(true);
			expect(result.reason).toBeUndefined();
		});

		it('should prevent lock-in during action phase', () => {
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

			const result = validateLockIn(team, 'action');

			expect(result.canLockIn).toBe(false);
			expect(result.reason).toContain('planning phase');
		});

		it('should prevent lock-in during resolution phase', () => {
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

			const result = validateLockIn(team, 'resolution');

			expect(result.canLockIn).toBe(false);
			expect(result.reason).toContain('planning phase');
		});

		it('should allow lock-in with positive budget', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 100,
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: [],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {}
			};

			const result = validateLockIn(team, 'planning');

			expect(result.canLockIn).toBe(true);
		});

		it('should prevent lock-in when budget negative', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: -100, // Negative
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: [],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {}
			};

			const result = validateLockIn(team, 'planning');

			expect(result.canLockIn).toBe(false);
			expect(result.reason).toContain('negative budget');
		});

		it('should allow lock-in with exactly 0 credits', () => {
			const team: ESPTeam = {
				name: 'SendWave',
				players: ['alice'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 0,
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
				active_clients: [],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {}
			};

			const result = validateLockIn(team, 'planning');

			expect(result.canLockIn).toBe(true); // 0 is not negative
		});

		it('should prevent lock-in in lobby phase', () => {
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

			const result = validateLockIn(team, 'lobby');

			expect(result.canLockIn).toBe(false);
			expect(result.reason).toContain('planning phase');
		});
	});
});
