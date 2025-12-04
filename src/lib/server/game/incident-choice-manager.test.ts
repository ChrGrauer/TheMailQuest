/**
 * Incident Choice Manager Unit Tests
 * Phase 5: Player Choices
 *
 * Tests for incident choice management functions
 * These tests should FAIL initially (RED phase of ATDD)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { GameSession } from './types';
import type { IncidentCard, IncidentChoiceConfig } from '$lib/types/incident';
import {
	resolveTargetTeams,
	initiatePendingChoices,
	setPendingChoice,
	applyPendingChoiceEffects,
	calculateAverageReputation
} from './incident-choice-manager';

// Helper: Create minimal test session with multiple ESP teams
function createTestSession(): GameSession {
	return {
		roomCode: 'TEST123',
		facilitatorId: 'facilitator-1',
		current_round: 4,
		current_phase: 'planning',
		esp_teams: [
			{
				name: 'SendWave',
				players: ['player-1'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 1000,
				reputation: { Gmail: 80, Outlook: 75, Yahoo: 85 }, // avg = 80
				active_clients: [],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: []
			},
			{
				name: 'MailMonkey',
				players: ['player-2'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 800,
				reputation: { Gmail: 50, Outlook: 55, Yahoo: 45 }, // avg = 50
				active_clients: [],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: []
			},
			{
				name: 'QuickMail',
				players: ['player-3'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 600,
				reputation: { Gmail: 65, Outlook: 70, Yahoo: 60 }, // avg = 65
				active_clients: [],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: []
			}
		],
		destinations: [
			{
				name: 'Gmail',
				kingdom: 'Gmail',
				players: ['player-4'],
				budget: 500,
				filtering_policies: {},
				esp_reputation: { SendWave: 80, MailMonkey: 50, QuickMail: 65 }
			},
			{
				name: 'Outlook',
				kingdom: 'Outlook',
				players: ['player-5'],
				budget: 350,
				filtering_policies: {},
				esp_reputation: { SendWave: 75, MailMonkey: 55, QuickMail: 70 }
			},
			{
				name: 'Yahoo',
				kingdom: 'Yahoo',
				players: ['player-6'],
				budget: 200,
				filtering_policies: {},
				esp_reputation: { SendWave: 85, MailMonkey: 45, QuickMail: 60 }
			}
		],
		createdAt: new Date(),
		lastActivity: new Date(),
		incident_history: []
	};
}

// Helper: Create a choice incident for testing
function createChoiceIncident(
	id: string,
	targetSelection: 'highest_reputation' | 'lowest_reputation' | 'all_esps'
): IncidentCard {
	return {
		id,
		name: 'Test Choice Incident',
		round: [4],
		category: 'Market',
		rarity: 'Rare',
		description: 'Test incident requiring choice',
		educationalNote: 'Test educational note',
		duration: 'Immediate',
		effects: [],
		choiceConfig: {
			targetSelection,
			options: [
				{
					id: 'option_a',
					label: 'Option A',
					description: 'First option',
					effects: [{ target: 'self', type: 'credits', value: 100 }],
					isDefault: true
				},
				{
					id: 'option_b',
					label: 'Option B',
					description: 'Second option',
					effects: [{ target: 'self', type: 'reputation', value: 5 }]
				}
			]
		}
	};
}

describe('Incident Choice Manager - calculateAverageReputation', () => {
	let session: GameSession;

	beforeEach(() => {
		session = createTestSession();
	});

	it('should calculate average reputation across all destinations', () => {
		const sendWave = session.esp_teams.find((t) => t.name === 'SendWave')!;
		const avg = calculateAverageReputation(sendWave);

		// SendWave: (80 + 75 + 85) / 3 = 80
		expect(avg).toBe(80);
	});

	it('should return correct average for low reputation team', () => {
		const mailMonkey = session.esp_teams.find((t) => t.name === 'MailMonkey')!;
		const avg = calculateAverageReputation(mailMonkey);

		// MailMonkey: (50 + 55 + 45) / 3 = 50
		expect(avg).toBe(50);
	});

	it('should handle team with empty reputation object', () => {
		const emptyTeam = {
			...session.esp_teams[0],
			reputation: {}
		};
		const avg = calculateAverageReputation(emptyTeam);

		expect(avg).toBe(0);
	});
});

describe('Incident Choice Manager - resolveTargetTeams', () => {
	let session: GameSession;

	beforeEach(() => {
		session = createTestSession();
	});

	it('should return highest reputation team for highest_reputation criteria', () => {
		const targets = resolveTargetTeams(session, 'highest_reputation');

		expect(targets).toHaveLength(1);
		expect(targets[0]).toBe('SendWave'); // avg 80 is highest
	});

	it('should return lowest reputation team for lowest_reputation criteria', () => {
		const targets = resolveTargetTeams(session, 'lowest_reputation');

		expect(targets).toHaveLength(1);
		expect(targets[0]).toBe('MailMonkey'); // avg 50 is lowest
	});

	it('should return all ESP team names for all_esps criteria', () => {
		const targets = resolveTargetTeams(session, 'all_esps');

		expect(targets).toHaveLength(3);
		expect(targets).toContain('SendWave');
		expect(targets).toContain('MailMonkey');
		expect(targets).toContain('QuickMail');
	});

	it('should handle tie-breaker for highest reputation (first team wins)', () => {
		// Make QuickMail have same avg as SendWave
		session.esp_teams[2].reputation = { Gmail: 80, Outlook: 75, Yahoo: 85 };

		const targets = resolveTargetTeams(session, 'highest_reputation');

		expect(targets).toHaveLength(1);
		// First team with highest rep should win
		expect(targets[0]).toBe('SendWave');
	});

	it('should return empty array for session with no ESP teams', () => {
		session.esp_teams = [];

		const targets = resolveTargetTeams(session, 'all_esps');
		expect(targets).toEqual([]);

		const highest = resolveTargetTeams(session, 'highest_reputation');
		expect(highest).toEqual([]);
	});
});

describe('Incident Choice Manager - initiatePendingChoices', () => {
	let session: GameSession;

	beforeEach(() => {
		session = createTestSession();
	});

	it('should set default choice for single target team (highest_reputation)', () => {
		const incident = createChoiceIncident('INC-017', 'highest_reputation');

		const result = initiatePendingChoices(session, incident);

		expect(result.success).toBe(true);
		expect(result.targetTeams).toHaveLength(1);
		expect(result.targetTeams).toContain('SendWave');

		// SendWave should have pending choice with default option
		const sendWave = session.esp_teams.find((t) => t.name === 'SendWave')!;
		expect(sendWave.pending_incident_choices).toBeDefined();
		expect(sendWave.pending_incident_choices).toHaveLength(1);
		expect(sendWave.pending_incident_choices?.[0].incidentId).toBe('INC-017');
		expect(sendWave.pending_incident_choices?.[0].choiceId).toBe('option_a'); // default
		expect(sendWave.pending_incident_choices?.[0].confirmed).toBe(false);
	});

	it('should set default choice for all ESP teams (all_esps)', () => {
		const incident = createChoiceIncident('INC-018', 'all_esps');

		const result = initiatePendingChoices(session, incident);

		expect(result.success).toBe(true);
		expect(result.targetTeams).toHaveLength(3);

		// All teams should have pending choice
		for (const team of session.esp_teams) {
			expect(team.pending_incident_choices).toBeDefined();
			expect(team.pending_incident_choices).toHaveLength(1);
			expect(team.pending_incident_choices?.[0].incidentId).toBe('INC-018');
			expect(team.pending_incident_choices?.[0].choiceId).toBe('option_a');
			expect(team.pending_incident_choices?.[0].confirmed).toBe(false);
		}
	});

	it('should fail for incident without choiceConfig', () => {
		const incident: IncidentCard = {
			id: 'INC-001',
			name: 'No Choice Incident',
			round: [1],
			category: 'Regulatory',
			rarity: 'Common',
			description: 'Test',
			educationalNote: 'Test',
			duration: 'Immediate',
			effects: []
			// No choiceConfig
		};

		const result = initiatePendingChoices(session, incident);

		expect(result.success).toBe(false);
		expect(result.error).toContain('not a choice incident');
	});

	it('should use first option as default if no isDefault specified', () => {
		const incident = createChoiceIncident('INC-TEST', 'highest_reputation');
		// Remove isDefault from all options
		incident.choiceConfig!.options.forEach((opt) => delete opt.isDefault);

		const result = initiatePendingChoices(session, incident);

		expect(result.success).toBe(true);
		const sendWave = session.esp_teams.find((t) => t.name === 'SendWave')!;
		expect(sendWave.pending_incident_choices).toHaveLength(1);
		expect(sendWave.pending_incident_choices?.[0].choiceId).toBe('option_a'); // first option
	});
});

describe('Incident Choice Manager - setPendingChoice', () => {
	let session: GameSession;

	beforeEach(() => {
		session = createTestSession();
		// Initialize pending choices array for SendWave with options
		session.esp_teams[0].pending_incident_choices = [
			{
				incidentId: 'INC-017',
				choiceId: 'option_a',
				confirmed: false,
				options: [
					{ id: 'option_a', effects: [{ target: 'self', type: 'credits', value: 100 }] },
					{ id: 'option_b', effects: [{ target: 'self', type: 'reputation', value: 5 }] }
				]
			}
		];
	});

	it('should update choice and mark as confirmed', () => {
		const result = setPendingChoice(session, 'SendWave', 'INC-017', 'option_b');

		expect(result.success).toBe(true);

		const sendWave = session.esp_teams.find((t) => t.name === 'SendWave')!;
		const choice = sendWave.pending_incident_choices?.find((c) => c.incidentId === 'INC-017');
		expect(choice?.choiceId).toBe('option_b');
		expect(choice?.confirmed).toBe(true);
	});

	it('should fail for non-existent team', () => {
		const result = setPendingChoice(session, 'NonExistentTeam', 'INC-017', 'option_b');

		expect(result.success).toBe(false);
		expect(result.error).toContain('not found');
	});

	it('should fail for team without pending choice', () => {
		// MailMonkey has no pending choice
		const result = setPendingChoice(session, 'MailMonkey', 'INC-017', 'option_b');

		expect(result.success).toBe(false);
		expect(result.error).toContain('no pending choice');
	});

	it('should fail for wrong incident ID', () => {
		const result = setPendingChoice(session, 'SendWave', 'INC-999', 'option_b');

		expect(result.success).toBe(false);
		expect(result.error).toContain('No pending choice for incident');
	});

	it('should fail for invalid choice option', () => {
		const result = setPendingChoice(session, 'SendWave', 'INC-017', 'invalid_option');

		expect(result.success).toBe(false);
		expect(result.error).toContain('Invalid choice');
	});

	it('should allow re-confirming with same choice', () => {
		// First confirm
		setPendingChoice(session, 'SendWave', 'INC-017', 'option_b');

		// Re-confirm with different choice
		const result = setPendingChoice(session, 'SendWave', 'INC-017', 'option_a');

		expect(result.success).toBe(true);
		const sendWave = session.esp_teams.find((t) => t.name === 'SendWave')!;
		const choice = sendWave.pending_incident_choices?.find((c) => c.incidentId === 'INC-017');
		expect(choice?.choiceId).toBe('option_a');
	});
});

describe('Incident Choice Manager - applyPendingChoiceEffects', () => {
	let session: GameSession;

	beforeEach(() => {
		session = createTestSession();
	});

	it('should apply credit effect from chosen option (immediately at confirmation)', () => {
		// Setup: SendWave has pending choice with credits effect
		const incident = createChoiceIncident('INC-017', 'highest_reputation');
		initiatePendingChoices(session, incident);

		const sendWave = session.esp_teams.find((t) => t.name === 'SendWave')!;
		const initialCredits = sendWave.credits;

		// Effects are now applied immediately when setPendingChoice is called
		setPendingChoice(session, 'SendWave', 'INC-017', 'option_a'); // +100 credits

		// Verify effects applied immediately
		expect(sendWave.credits).toBe(initialCredits + 100);
		const choice = sendWave.pending_incident_choices?.find((c) => c.incidentId === 'INC-017');
		expect(choice?.effectsApplied).toBe(true);

		// applyPendingChoiceEffects should succeed but not re-apply effects
		const result = applyPendingChoiceEffects(session, sendWave);
		expect(result.success).toBe(true);
		expect(result.applied).toBe(false); // Already applied at confirmation
		expect(sendWave.credits).toBe(initialCredits + 100); // Still same value
	});

	it('should apply reputation effect from chosen option (immediately at confirmation)', () => {
		const incident = createChoiceIncident('INC-017', 'highest_reputation');
		initiatePendingChoices(session, incident);

		const sendWave = session.esp_teams.find((t) => t.name === 'SendWave')!;
		const initialRep = { ...sendWave.reputation };

		// Effects are now applied immediately when setPendingChoice is called
		setPendingChoice(session, 'SendWave', 'INC-017', 'option_b'); // +5 reputation

		// Verify effects applied immediately
		expect(sendWave.reputation.Gmail).toBe(initialRep.Gmail + 5);
		expect(sendWave.reputation.Outlook).toBe(initialRep.Outlook + 5);
		expect(sendWave.reputation.Yahoo).toBe(initialRep.Yahoo + 5);
		const choice = sendWave.pending_incident_choices?.find((c) => c.incidentId === 'INC-017');
		expect(choice?.effectsApplied).toBe(true);

		// applyPendingChoiceEffects should succeed but not re-apply effects
		const result = applyPendingChoiceEffects(session, sendWave);
		expect(result.success).toBe(true);
		expect(result.applied).toBe(false); // Already applied at confirmation
	});

	it('should not apply effects if choice not confirmed', () => {
		const incident = createChoiceIncident('INC-017', 'highest_reputation');
		initiatePendingChoices(session, incident);
		// NOT calling setPendingChoice - choice remains unconfirmed

		const sendWave = session.esp_teams.find((t) => t.name === 'SendWave')!;
		const initialCredits = sendWave.credits;

		const result = applyPendingChoiceEffects(session, sendWave);

		expect(result.success).toBe(false);
		expect(result.error).toContain('not confirmed');
		expect(sendWave.credits).toBe(initialCredits);
	});

	it('should clear pending choice after applying effects', () => {
		const incident = createChoiceIncident('INC-017', 'highest_reputation');
		initiatePendingChoices(session, incident);
		setPendingChoice(session, 'SendWave', 'INC-017', 'option_a');

		const sendWave = session.esp_teams.find((t) => t.name === 'SendWave')!;
		applyPendingChoiceEffects(session, sendWave);

		// Array should be empty or undefined after processing
		expect(sendWave.pending_incident_choices?.length ?? 0).toBe(0);
	});

	it('should handle team without pending choice gracefully', () => {
		const mailMonkey = session.esp_teams.find((t) => t.name === 'MailMonkey')!;

		const result = applyPendingChoiceEffects(session, mailMonkey);

		expect(result.success).toBe(false);
		expect(result.error).toContain('no pending choice');
	});

	it('should apply negative credit effects correctly (immediately at confirmation)', () => {
		// Create incident with negative credits (like INC-018 patch cost)
		const incident: IncidentCard = {
			id: 'INC-018',
			name: 'Zero-Day Crisis',
			round: [4],
			category: 'Technical',
			rarity: 'Common',
			description: 'Test',
			educationalNote: 'Test',
			duration: 'Immediate',
			effects: [],
			choiceConfig: {
				targetSelection: 'all_esps',
				options: [
					{
						id: 'patch',
						label: 'Apply Patch',
						effects: [{ target: 'self', type: 'credits', value: -150 }],
						isDefault: true
					},
					{
						id: 'ignore',
						label: 'Ignore',
						effects: [{ target: 'self', type: 'reputation', value: -15 }]
					}
				]
			}
		};

		initiatePendingChoices(session, incident);

		const sendWave = session.esp_teams.find((t) => t.name === 'SendWave')!;
		const initialCredits = sendWave.credits;

		// Effects applied immediately at confirmation
		setPendingChoice(session, 'SendWave', 'INC-018', 'patch');

		expect(sendWave.credits).toBe(initialCredits - 150);
		const choice = sendWave.pending_incident_choices?.find((c) => c.incidentId === 'INC-018');
		expect(choice?.effectsApplied).toBe(true);

		// Cleanup at lock-in
		applyPendingChoiceEffects(session, sendWave);
		// Array should be empty after processing
		expect(sendWave.pending_incident_choices?.length ?? 0).toBe(0);
	});

	it('should clamp reputation to valid range (0-100)', () => {
		// Set reputation near max
		session.esp_teams[0].reputation = { Gmail: 98, Outlook: 99, Yahoo: 97 };

		const incident = createChoiceIncident('INC-017', 'highest_reputation');
		initiatePendingChoices(session, incident);

		const sendWave = session.esp_teams.find((t) => t.name === 'SendWave')!;

		// Effects applied immediately at confirmation
		setPendingChoice(session, 'SendWave', 'INC-017', 'option_b'); // +5 reputation

		// Should be clamped to 100
		expect(sendWave.reputation.Gmail).toBe(100);
		expect(sendWave.reputation.Outlook).toBe(100);
		expect(sendWave.reputation.Yahoo).toBe(100);

		// Cleanup at lock-in
		applyPendingChoiceEffects(session, sendWave);
		// Array should be empty after processing
		expect(sendWave.pending_incident_choices?.length ?? 0).toBe(0);
	});

	it('should not allow credits to go negative', () => {
		// Set credits lower than cost
		session.esp_teams[0].credits = 100;

		const incident: IncidentCard = {
			id: 'INC-018',
			name: 'Zero-Day Crisis',
			round: [4],
			category: 'Technical',
			rarity: 'Common',
			description: 'Test',
			educationalNote: 'Test',
			duration: 'Immediate',
			effects: [],
			choiceConfig: {
				targetSelection: 'highest_reputation',
				options: [
					{
						id: 'patch',
						label: 'Apply Patch',
						effects: [{ target: 'self', type: 'credits', value: -150 }],
						isDefault: true
					}
				]
			}
		};

		initiatePendingChoices(session, incident);

		const sendWave = session.esp_teams.find((t) => t.name === 'SendWave')!;

		// Effects applied immediately at confirmation
		setPendingChoice(session, 'SendWave', 'INC-018', 'patch');

		// Should be clamped to 0
		expect(sendWave.credits).toBe(0);

		// Cleanup at lock-in
		applyPendingChoiceEffects(session, sendWave);
		// Array should be empty after processing
		expect(sendWave.pending_incident_choices?.length ?? 0).toBe(0);
	});
});
