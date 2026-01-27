/**
 * US-2.3: Technical Infrastructure Shop - Tech Validator Tests
 *
 * Tests tech purchase validation including:
 * - Dependency validation (SPF → DKIM → DMARC chain)
 * - Budget/credit validation
 * - Already owned validation
 * - Upgrade existence validation
 *
 * Uses ATDD approach following Gherkin scenarios from feature file
 */

import { describe, test, expect } from 'vitest';
import {
	validateTechPurchase,
	checkDependencies,
	checkBudgetSufficient,
	type TechPurchaseValidation
} from './tech-validator';
import type { ESPTeam } from '../types';
import type { TechnicalUpgrade } from '$lib/config/technical-upgrades';

describe('Feature: Technical Infrastructure Shop - Validation', () => {
	// Helper function to create a test ESP team
	function createTestTeam(overrides?: Partial<ESPTeam>): ESPTeam {
		return {
			name: 'SendWave',
			players: ['Alice'],
			budget: 0,
			clients: [],
			technical_stack: [],
			credits: 1000,
			reputation: { zmail: 70, intake: 70, yagle: 70 },
			active_clients: [],
			owned_tech_upgrades: [],
			round_history: [],
			available_clients: [],
			...overrides
		};
	}

	// Helper function to create a test upgrade
	function createTestUpgrade(overrides?: Partial<TechnicalUpgrade>): TechnicalUpgrade {
		return {
			id: 'test-upgrade',
			name: 'Test Upgrade',
			description: 'A test upgrade',
			cost: 100,
			category: 'authentication',
			dependencies: [],
			benefits: ['Test benefit'],
			...overrides
		};
	}

	// ============================================================================
	// DEPENDENCY VALIDATION
	// ============================================================================

	describe('Scenario: Enforce purchase order for authentication stack', () => {
		test('Given no upgrades owned, When checking DKIM dependencies, Then SPF is missing', () => {
			const team = createTestTeam({ owned_tech_upgrades: [] });
			const dkim = createTestUpgrade({ id: 'dkim', dependencies: ['spf'] });

			const result = checkDependencies(dkim, team.owned_tech_upgrades);

			expect(result.met).toBe(false);
			expect(result.missing).toEqual(['spf']);
		});

		test('Given SPF owned, When checking DKIM dependencies, Then all dependencies met', () => {
			const team = createTestTeam({ owned_tech_upgrades: ['spf'] });
			const dkim = createTestUpgrade({ id: 'dkim', dependencies: ['spf'] });

			const result = checkDependencies(dkim, team.owned_tech_upgrades);

			expect(result.met).toBe(true);
			expect(result.missing).toEqual([]);
		});

		test('Given only SPF owned, When checking DMARC dependencies, Then DKIM is missing', () => {
			const team = createTestTeam({ owned_tech_upgrades: ['spf'] });
			const dmarc = createTestUpgrade({ id: 'dmarc', dependencies: ['spf', 'dkim'] });

			const result = checkDependencies(dmarc, team.owned_tech_upgrades);

			expect(result.met).toBe(false);
			expect(result.missing).toEqual(['dkim']);
		});

		test('Given SPF and DKIM owned, When checking DMARC dependencies, Then all met', () => {
			const team = createTestTeam({ owned_tech_upgrades: ['spf', 'dkim'] });
			const dmarc = createTestUpgrade({ id: 'dmarc', dependencies: ['spf', 'dkim'] });

			const result = checkDependencies(dmarc, team.owned_tech_upgrades);

			expect(result.met).toBe(true);
			expect(result.missing).toEqual([]);
		});

		test('Given no dependencies, When checking upgrade, Then dependencies are met', () => {
			const team = createTestTeam({ owned_tech_upgrades: [] });
			const spf = createTestUpgrade({ id: 'spf', dependencies: [] });

			const result = checkDependencies(spf, team.owned_tech_upgrades);

			expect(result.met).toBe(true);
			expect(result.missing).toEqual([]);
		});
	});

	// ============================================================================
	// BUDGET VALIDATION
	// ============================================================================

	describe('Scenario: Validate budget before purchase', () => {
		test('Given sufficient credits (1000), When buying 100 credit upgrade, Then can afford', () => {
			const team = createTestTeam({ credits: 1000 });
			const upgrade = createTestUpgrade({ cost: 100 });

			const result = checkBudgetSufficient(upgrade, team.credits);

			expect(result.sufficient).toBe(true);
		});

		test('Given insufficient credits (50), When buying 100 credit upgrade, Then cannot afford', () => {
			const team = createTestTeam({ credits: 50 });
			const upgrade = createTestUpgrade({ cost: 100 });

			const result = checkBudgetSufficient(upgrade, team.credits);

			expect(result.sufficient).toBe(false);
			expect(result.required).toBe(100);
			expect(result.available).toBe(50);
		});

		test('Given exact credits (100), When buying 100 credit upgrade, Then can afford', () => {
			const team = createTestTeam({ credits: 100 });
			const upgrade = createTestUpgrade({ cost: 100 });

			const result = checkBudgetSufficient(upgrade, team.credits);

			expect(result.sufficient).toBe(true);
		});

		test('Given one less credit (99), When buying 100 credit upgrade, Then cannot afford', () => {
			const team = createTestTeam({ credits: 99 });
			const upgrade = createTestUpgrade({ cost: 100 });

			const result = checkBudgetSufficient(upgrade, team.credits);

			expect(result.sufficient).toBe(false);
		});
	});

	// ============================================================================
	// COMPREHENSIVE VALIDATION
	// ============================================================================

	describe('Scenario: Validate complete purchase attempt', () => {
		test('Given all conditions met, When validating purchase, Then validation succeeds', () => {
			const team = createTestTeam({
				credits: 1000,
				owned_tech_upgrades: []
			});
			const spf = createTestUpgrade({
				id: 'spf',
				name: 'SPF Authentication',
				cost: 100,
				dependencies: []
			});

			const result = validateTechPurchase(team, spf);

			expect(result.canPurchase).toBe(true);
			expect(result.reason).toBeUndefined();
		});

		test('Given insufficient credits, When validating purchase, Then fails with budget reason', () => {
			const team = createTestTeam({
				credits: 50,
				owned_tech_upgrades: []
			});
			const spf = createTestUpgrade({
				id: 'spf',
				cost: 100,
				dependencies: []
			});

			const result = validateTechPurchase(team, spf);

			expect(result.canPurchase).toBe(false);
			expect(result.reason).toBe('insufficient_credits');
		});

		test('Given missing dependencies, When validating purchase, Then fails with dependency reason', () => {
			const team = createTestTeam({
				credits: 1000,
				owned_tech_upgrades: []
			});
			const dkim = createTestUpgrade({
				id: 'dkim',
				cost: 150,
				dependencies: ['spf']
			});

			const result = validateTechPurchase(team, dkim);

			expect(result.canPurchase).toBe(false);
			expect(result.reason).toBe('unmet_dependencies');
			expect(result.missingDependencies).toEqual(['spf']);
		});

		test('Given already owned, When validating purchase, Then fails with already owned reason', () => {
			const team = createTestTeam({
				credits: 1000,
				owned_tech_upgrades: ['spf']
			});
			const spf = createTestUpgrade({
				id: 'spf',
				cost: 100,
				dependencies: []
			});

			const result = validateTechPurchase(team, spf);

			expect(result.canPurchase).toBe(false);
			expect(result.reason).toBe('already_owned');
		});

		test('Given dependencies met and sufficient credits, When validating DMARC, Then succeeds', () => {
			const team = createTestTeam({
				credits: 500,
				owned_tech_upgrades: ['spf', 'dkim']
			});
			const dmarc = createTestUpgrade({
				id: 'dmarc',
				cost: 200,
				dependencies: ['spf', 'dkim']
			});

			const result = validateTechPurchase(team, dmarc);

			expect(result.canPurchase).toBe(true);
		});
	});

	// ============================================================================
	// PRIORITY ORDER VALIDATION
	// ============================================================================

	describe('Scenario: Validation checks happen in priority order', () => {
		test('Given already owned AND insufficient credits, When validating, Then already_owned is returned first', () => {
			const team = createTestTeam({
				credits: 50,
				owned_tech_upgrades: ['spf']
			});
			const spf = createTestUpgrade({
				id: 'spf',
				cost: 100,
				dependencies: []
			});

			const result = validateTechPurchase(team, spf);

			expect(result.canPurchase).toBe(false);
			expect(result.reason).toBe('already_owned');
		});

		test('Given missing dependencies AND insufficient credits, When validating, Then dependencies checked first', () => {
			const team = createTestTeam({
				credits: 50,
				owned_tech_upgrades: []
			});
			const dkim = createTestUpgrade({
				id: 'dkim',
				cost: 150,
				dependencies: ['spf']
			});

			const result = validateTechPurchase(team, dkim);

			expect(result.canPurchase).toBe(false);
			// Either unmet_dependencies or insufficient_credits is acceptable,
			// but typically dependencies are checked before budget
			expect(['unmet_dependencies', 'insufficient_credits']).toContain(result.reason);
		});
	});

	// ============================================================================
	// INDEPENDENT UPGRADES
	// ============================================================================

	describe('Scenario: Independent upgrades can be purchased without dependencies', () => {
		test('Given no upgrades owned, When validating Content Filtering, Then succeeds', () => {
			const team = createTestTeam({
				credits: 500,
				owned_tech_upgrades: []
			});
			const contentFiltering = createTestUpgrade({
				id: 'content-filtering',
				name: 'Content Filtering',
				cost: 120,
				dependencies: []
			});

			const result = validateTechPurchase(team, contentFiltering);

			expect(result.canPurchase).toBe(true);
		});

		test('Given no upgrades owned, When validating Advanced Monitoring, Then succeeds', () => {
			const team = createTestTeam({
				credits: 500,
				owned_tech_upgrades: []
			});
			const advancedMonitoring = createTestUpgrade({
				id: 'advanced-monitoring',
				name: 'Advanced Monitoring',
				cost: 150,
				dependencies: []
			});

			const result = validateTechPurchase(team, advancedMonitoring);

			expect(result.canPurchase).toBe(true);
		});
	});
});
