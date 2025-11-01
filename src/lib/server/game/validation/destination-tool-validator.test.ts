/**
 * US-2.6.2: Destination Tool Validator - Unit Tests (RED Phase)
 * These tests will FAIL until the GREEN phase implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validateToolPurchase, getValidationErrorMessage } from './destination-tool-validator';
import type { Destination } from '../types';
import type { DestinationTool } from '$lib/config/destination-technical-upgrades';

describe('Destination Tool Validator', () => {
	let gmailDestination: Destination;
	let yahooDestination: Destination;
	let contentAnalysisTool: DestinationTool;
	let mlSystemTool: DestinationTool;
	let authL1Tool: DestinationTool;
	let authL2Tool: DestinationTool;
	let authL3Tool: DestinationTool;

	beforeEach(() => {
		gmailDestination = {
			name: 'Gmail',
			kingdom: 'Gmail',
			players: ['player1'],
			budget: 500,
			filtering_policies: {},
			esp_reputation: {},
			owned_tools: [],
			authentication_level: 0
		};

		yahooDestination = {
			name: 'Yahoo',
			kingdom: 'Yahoo',
			players: ['player2'],
			budget: 200,
			filtering_policies: {},
			esp_reputation: {},
			owned_tools: [],
			authentication_level: 0
		};

		contentAnalysisTool = {
			id: 'content_analysis_filter',
			name: 'Content Analysis Filter',
			category: 'Content Analysis',
			description: 'Analyzes message content',
			scope: 'ALL_ESPS',
			permanent: true,
			effects: {
				spam_detection_boost: 15,
				false_positive_impact: -2
			},
			pricing: { Gmail: 300, Outlook: 240, Yahoo: 160 },
			availability: { Gmail: true, Outlook: true, Yahoo: true }
		};

		mlSystemTool = {
			id: 'ml_system',
			name: 'Machine Learning System',
			category: 'Intelligence',
			description: 'Advanced AI detection',
			scope: 'ALL_ESPS',
			permanent: true,
			effects: {
				spam_detection_boost: 25,
				false_positive_impact: -3
			},
			pricing: { Gmail: 500, Outlook: 400, Yahoo: null },
			availability: { Gmail: true, Outlook: true, Yahoo: false },
			unavailable_reason: { Yahoo: 'Insufficient computational resources' }
		};

		authL1Tool = {
			id: 'auth_validator_l1',
			name: 'Authentication Validator - Level 1 (SPF)',
			category: 'Authentication',
			description: 'Validates SPF',
			scope: 'ALL_ESPS',
			permanent: true,
			authentication_level: 1,
			effects: {
				spam_detection_boost: 5,
				false_positive_impact: 0
			},
			pricing: { Gmail: 50, Outlook: 50, Yahoo: 50 },
			availability: { Gmail: true, Outlook: true, Yahoo: true }
		};

		authL2Tool = {
			id: 'auth_validator_l2',
			name: 'Authentication Validator - Level 2 (DKIM)',
			category: 'Authentication',
			description: 'Validates DKIM',
			scope: 'ALL_ESPS',
			permanent: true,
			authentication_level: 2,
			requires: 'auth_validator_l1',
			effects: {
				spam_detection_boost: 8,
				false_positive_impact: 0
			},
			pricing: { Gmail: 50, Outlook: 50, Yahoo: 50 },
			availability: { Gmail: true, Outlook: true, Yahoo: true }
		};

		authL3Tool = {
			id: 'auth_validator_l3',
			name: 'Authentication Validator - Level 3 (DMARC)',
			category: 'Authentication',
			description: 'Validates DMARC',
			scope: 'ALL_ESPS',
			permanent: true,
			authentication_level: 3,
			requires: ['auth_validator_l1', 'auth_validator_l2'],
			effects: {
				spam_detection_boost: 12,
				false_positive_impact: 0
			},
			pricing: { Gmail: 50, Outlook: 50, Yahoo: 50 },
			availability: { Gmail: true, Outlook: true, Yahoo: true }
		};
	});

	describe('Kingdom Availability', () => {
		it('should reject ML System purchase for Yahoo', () => {
			const result = validateToolPurchase(yahooDestination, mlSystemTool);
			expect(result.canPurchase).toBe(false);
			expect(result.reason).toBe('tool_unavailable_for_kingdom');
		});

		it('should allow ML System purchase for Gmail', () => {
			const result = validateToolPurchase(gmailDestination, mlSystemTool);
			expect(result.canPurchase).toBe(true);
		});
	});

	describe('Budget Validation', () => {
		it('should reject purchase when budget insufficient', () => {
			gmailDestination.budget = 299; // Content Analysis costs 300 for Gmail
			const result = validateToolPurchase(gmailDestination, contentAnalysisTool);
			expect(result.canPurchase).toBe(false);
			expect(result.reason).toBe('insufficient_budget');
			expect(result.requiredCredits).toBe(300);
			expect(result.availableCredits).toBe(299);
		});

		it('should allow purchase when budget exactly matches cost', () => {
			gmailDestination.budget = 300;
			const result = validateToolPurchase(gmailDestination, contentAnalysisTool);
			expect(result.canPurchase).toBe(true);
		});

		it('should allow purchase when budget exceeds cost', () => {
			gmailDestination.budget = 500;
			const result = validateToolPurchase(gmailDestination, contentAnalysisTool);
			expect(result.canPurchase).toBe(true);
		});
	});

	describe('Ownership Validation', () => {
		it('should reject purchase of already owned permanent tool', () => {
			gmailDestination.owned_tools = ['content_analysis_filter'];
			const result = validateToolPurchase(gmailDestination, contentAnalysisTool);
			expect(result.canPurchase).toBe(false);
			expect(result.reason).toBe('already_owned');
		});
	});

	describe('Authentication Validator Prerequisites', () => {
		it('should allow L1 purchase without prerequisites', () => {
			const result = validateToolPurchase(gmailDestination, authL1Tool);
			expect(result.canPurchase).toBe(true);
		});

		it('should reject L2 purchase without L1', () => {
			const result = validateToolPurchase(gmailDestination, authL2Tool);
			expect(result.canPurchase).toBe(false);
			expect(result.reason).toBe('missing_dependencies');
			expect(result.missingDependencies).toEqual(['auth_validator_l1']);
		});

		it('should allow L2 purchase with L1 owned', () => {
			gmailDestination.owned_tools = ['auth_validator_l1'];
			const result = validateToolPurchase(gmailDestination, authL2Tool);
			expect(result.canPurchase).toBe(true);
		});

		it('should reject L3 purchase without L1 and L2', () => {
			const result = validateToolPurchase(gmailDestination, authL3Tool);
			expect(result.canPurchase).toBe(false);
			expect(result.reason).toBe('missing_dependencies');
			expect(result.missingDependencies).toEqual(['auth_validator_l1', 'auth_validator_l2']);
		});

		it('should reject L3 purchase with only L1', () => {
			gmailDestination.owned_tools = ['auth_validator_l1'];
			const result = validateToolPurchase(gmailDestination, authL3Tool);
			expect(result.canPurchase).toBe(false);
			expect(result.missingDependencies).toEqual(['auth_validator_l2']);
		});

		it('should allow L3 purchase with both L1 and L2 owned', () => {
			gmailDestination.owned_tools = ['auth_validator_l1', 'auth_validator_l2'];
			const result = validateToolPurchase(gmailDestination, authL3Tool);
			expect(result.canPurchase).toBe(true);
		});
	});

	describe('Error Messages', () => {
		it('should return correct error message for unavailable tool', () => {
			const validation: DestinationToolValidation = {
				canPurchase: false,
				reason: 'tool_unavailable_for_kingdom'
			};
			const message = getValidationErrorMessage(validation);
			expect(message).toContain('not available');
		});

		it('should return correct error message for insufficient budget', () => {
			const validation: DestinationToolValidation = {
				canPurchase: false,
				reason: 'insufficient_budget',
				requiredCredits: 300,
				availableCredits: 200
			};
			const message = getValidationErrorMessage(validation);
			expect(message).toBe('Insufficient budget');
		});

		it('should return correct error message for missing dependencies', () => {
			const validation: DestinationToolValidation = {
				canPurchase: false,
				reason: 'missing_dependencies',
				missingDependencies: ['auth_validator_l1', 'auth_validator_l2']
			};
			const message = getValidationErrorMessage(validation);
			expect(message).toContain('Missing required tools');
		});

		it('should return correct error message for already owned', () => {
			const validation: DestinationToolValidation = {
				canPurchase: false,
				reason: 'already_owned'
			};
			const message = getValidationErrorMessage(validation);
			expect(message).toContain('already own');
		});
	});
});
