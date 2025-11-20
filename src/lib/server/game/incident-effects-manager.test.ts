/**
 * Incident Effects Manager Unit Tests
 * Phase 1: MVP Foundation
 *
 * Tests for incident effect application logic
 * These tests should FAIL initially (RED phase of ATDD)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { GameSession } from './types';
import type { IncidentCard } from '$lib/types/incident';
import { applyIncidentEffects } from './incident-effects-manager';

// Helper: Create test session with multiple ESPs and destinations
function createTestSession(): GameSession {
	return {
		roomCode: 'TEST123',
		facilitatorId: 'facilitator-1',
		current_round: 2,
		current_phase: 'planning',
		esp_teams: [
			{
				name: 'SendWave',
				players: ['player-1'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 1000,
				reputation: { Gmail: 75, Outlook: 70, Yahoo: 65 },
				active_clients: [],
				owned_tech_upgrades: ['spf', 'dkim'],
				round_history: [],
				available_clients: []
			},
			{
				name: 'MailMonkey',
				players: ['player-2'],
				budget: 800,
				clients: [],
				technical_stack: [],
				credits: 800,
				reputation: { Gmail: 80, Outlook: 75, Yahoo: 70 },
				active_clients: [],
				owned_tech_upgrades: ['spf'],
				round_history: [],
				available_clients: []
			}
		],
		destinations: [
			{
				name: 'Gmail',
				kingdom: 'Gmail',
				players: ['player-3'],
				budget: 500,
				filtering_policies: {},
				esp_reputation: { SendWave: 75, MailMonkey: 80 }
			},
			{
				name: 'Outlook',
				kingdom: 'Outlook',
				players: ['player-4'],
				budget: 400,
				filtering_policies: {},
				esp_reputation: { SendWave: 70, MailMonkey: 75 }
			},
			{
				name: 'Yahoo',
				kingdom: 'Yahoo',
				players: ['player-5'],
				budget: 300,
				filtering_policies: {},
				esp_reputation: { SendWave: 65, MailMonkey: 70 }
			}
		],
		createdAt: new Date(),
		lastActivity: new Date()
	};
}

describe('Incident Effects Manager - All ESPs Reputation Loss', () => {
	let session: GameSession;

	beforeEach(() => {
		session = createTestSession();
	});

	it('should apply reputation loss to all ESP teams across all destinations', () => {
		const incident: IncidentCard = {
			id: 'INC-006',
			name: 'Industry Scandal',
			round: [2],
			category: 'Industry',
			rarity: 'Common',
			description: 'Test',
			educationalNote: 'Test',
			duration: 'Immediate',
			effects: [
				{
					target: 'all_esps',
					type: 'reputation',
					value: -5
				}
			]
		};

		// Store initial reputation values
		const sendwaveInitialGmail = session.esp_teams[0].reputation.Gmail;
		const mailmonkeyInitialOutlook = session.esp_teams[1].reputation.Outlook;

		const result = applyIncidentEffects(session, incident);

		expect(result.success).toBe(true);

		// Verify SendWave reputation decreased by 5 for all destinations
		expect(session.esp_teams[0].reputation.Gmail).toBe(sendwaveInitialGmail - 5); // 75 -> 70
		expect(session.esp_teams[0].reputation.Outlook).toBe(65); // 70 -> 65
		expect(session.esp_teams[0].reputation.Yahoo).toBe(60); // 65 -> 60

		// Verify MailMonkey reputation decreased by 5 for all destinations
		expect(session.esp_teams[1].reputation.Gmail).toBe(75); // 80 -> 75
		expect(session.esp_teams[1].reputation.Outlook).toBe(mailmonkeyInitialOutlook - 5); // 75 -> 70
		expect(session.esp_teams[1].reputation.Yahoo).toBe(65); // 70 -> 65
	});

	it('should clamp reputation at 0 (cannot go negative)', () => {
		const incident: IncidentCard = {
			id: 'TEST',
			name: 'Test',
			round: [1],
			category: 'Security',
			rarity: 'Common',
			description: 'Test',
			educationalNote: 'Test',
			duration: 'Immediate',
			effects: [
				{
					target: 'all_esps',
					type: 'reputation',
					value: -100 // Large penalty
				}
			]
		};

		applyIncidentEffects(session, incident);

		// All reputation values should be clamped at 0
		expect(session.esp_teams[0].reputation.Gmail).toBe(0);
		expect(session.esp_teams[0].reputation.Outlook).toBe(0);
		expect(session.esp_teams[0].reputation.Yahoo).toBe(0);
	});

	it('should clamp reputation at 100 (cannot exceed maximum)', () => {
		const incident: IncidentCard = {
			id: 'TEST',
			name: 'Test',
			round: [1],
			category: 'Industry',
			rarity: 'Common',
			description: 'Test',
			educationalNote: 'Test',
			duration: 'Immediate',
			effects: [
				{
					target: 'all_esps',
					type: 'reputation',
					value: 50 // Large bonus
				}
			]
		};

		applyIncidentEffects(session, incident);

		// All reputation values should be clamped at 100
		expect(session.esp_teams[0].reputation.Gmail).toBeLessThanOrEqual(100);
		expect(session.esp_teams[1].reputation.Gmail).toBeLessThanOrEqual(100);
	});

	it('should return detailed changes for ESP reputation', () => {
		const incident: IncidentCard = {
			id: 'INC-006',
			name: 'Industry Scandal',
			round: [2],
			category: 'Industry',
			rarity: 'Common',
			description: 'Test',
			educationalNote: 'Test',
			duration: 'Immediate',
			effects: [
				{
					target: 'all_esps',
					type: 'reputation',
					value: -5
				}
			]
		};

		const result = applyIncidentEffects(session, incident);

		expect(result.success).toBe(true);
		expect(result.changes.espChanges).toBeDefined();

		// Check SendWave changes
		expect(result.changes.espChanges['SendWave']).toBeDefined();
		expect(result.changes.espChanges['SendWave'].reputation).toBeDefined();
		expect(result.changes.espChanges['SendWave'].reputation?.Gmail).toBe(-5);
		expect(result.changes.espChanges['SendWave'].reputation?.Outlook).toBe(-5);

		// Check MailMonkey changes
		expect(result.changes.espChanges['MailMonkey']).toBeDefined();
		expect(result.changes.espChanges['MailMonkey'].reputation).toBeDefined();
	});
});

describe('Incident Effects Manager - All Destinations Budget Gain', () => {
	let session: GameSession;

	beforeEach(() => {
		session = createTestSession();
	});

	it('should apply budget gain to all destinations', () => {
		const incident: IncidentCard = {
			id: 'INC-006',
			name: 'Industry Scandal',
			round: [2],
			category: 'Industry',
			rarity: 'Common',
			description: 'Test',
			educationalNote: 'Test',
			duration: 'Immediate',
			effects: [
				{
					target: 'all_destinations',
					type: 'budget',
					value: 100
				}
			]
		};

		const result = applyIncidentEffects(session, incident);

		expect(result.success).toBe(true);

		// All destinations should gain 100 budget
		expect(session.destinations[0].budget).toBe(600); // 500 + 100
		expect(session.destinations[1].budget).toBe(500); // 400 + 100
		expect(session.destinations[2].budget).toBe(400); // 300 + 100
	});

	it('should clamp budget at 0 (cannot go negative)', () => {
		const incident: IncidentCard = {
			id: 'TEST',
			name: 'Test',
			round: [1],
			category: 'Market',
			rarity: 'Common',
			description: 'Test',
			educationalNote: 'Test',
			duration: 'Immediate',
			effects: [
				{
					target: 'all_destinations',
					type: 'budget',
					value: -1000 // Large penalty
				}
			]
		};

		applyIncidentEffects(session, incident);

		// All budgets should be clamped at 0
		expect(session.destinations[0].budget).toBe(0);
		expect(session.destinations[1].budget).toBe(0);
		expect(session.destinations[2].budget).toBe(0);
	});

	it('should return detailed changes for destination budget', () => {
		const incident: IncidentCard = {
			id: 'INC-006',
			name: 'Industry Scandal',
			round: [2],
			category: 'Industry',
			rarity: 'Common',
			description: 'Test',
			educationalNote: 'Test',
			duration: 'Immediate',
			effects: [
				{
					target: 'all_destinations',
					type: 'budget',
					value: 100
				}
			]
		};

		const result = applyIncidentEffects(session, incident);

		expect(result.success).toBe(true);
		expect(result.changes.destinationChanges).toBeDefined();

		// Check all destination changes
		expect(result.changes.destinationChanges['Gmail']).toBeDefined();
		expect(result.changes.destinationChanges['Gmail'].budget).toBe(100);

		expect(result.changes.destinationChanges['Outlook']).toBeDefined();
		expect(result.changes.destinationChanges['Outlook'].budget).toBe(100);

		expect(result.changes.destinationChanges['Yahoo']).toBeDefined();
		expect(result.changes.destinationChanges['Yahoo'].budget).toBe(100);
	});
});

describe('Incident Effects Manager - ESP Credits', () => {
	let session: GameSession;

	beforeEach(() => {
		session = createTestSession();
	});

	it('should apply credit changes to all ESPs', () => {
		const incident: IncidentCard = {
			id: 'TEST',
			name: 'Test',
			round: [1],
			category: 'Market',
			rarity: 'Common',
			description: 'Test',
			educationalNote: 'Test',
			duration: 'Immediate',
			effects: [
				{
					target: 'all_esps',
					type: 'credits',
					value: -150
				}
			]
		};

		applyIncidentEffects(session, incident);

		// All ESPs should lose 150 credits
		expect(session.esp_teams[0].credits).toBe(850); // 1000 - 150
		expect(session.esp_teams[1].credits).toBe(650); // 800 - 150
	});

	it('should clamp credits at 0 (cannot go negative)', () => {
		const incident: IncidentCard = {
			id: 'TEST',
			name: 'Test',
			round: [1],
			category: 'Market',
			rarity: 'Common',
			description: 'Test',
			educationalNote: 'Test',
			duration: 'Immediate',
			effects: [
				{
					target: 'all_esps',
					type: 'credits',
					value: -2000 // Large penalty
				}
			]
		};

		applyIncidentEffects(session, incident);

		// All credits should be clamped at 0
		expect(session.esp_teams[0].credits).toBe(0);
		expect(session.esp_teams[1].credits).toBe(0);
	});
});

describe('Incident Effects Manager - Notifications', () => {
	let session: GameSession;

	beforeEach(() => {
		session = createTestSession();
	});

	it('should process notification-only effects without state changes', () => {
		const incident: IncidentCard = {
			id: 'INC-001',
			name: 'Regulation Announcement',
			round: [1],
			category: 'Regulatory',
			rarity: 'Common',
			description: 'Test',
			educationalNote: 'Test',
			duration: 'Permanent',
			effects: [
				{
					target: 'notification',
					type: 'notification',
					message: 'DMARC will be mandatory from Round 3'
				}
			]
		};

		// Store initial state
		const initialCredits = session.esp_teams[0].credits;
		const initialReputation = session.esp_teams[0].reputation.Gmail;
		const initialBudget = session.destinations[0].budget;

		const result = applyIncidentEffects(session, incident);

		expect(result.success).toBe(true);

		// Verify no state changes
		expect(session.esp_teams[0].credits).toBe(initialCredits);
		expect(session.esp_teams[0].reputation.Gmail).toBe(initialReputation);
		expect(session.destinations[0].budget).toBe(initialBudget);

		// Verify notification in result
		expect(result.changes.notifications).toBeDefined();
		expect(result.changes.notifications.length).toBeGreaterThan(0);
		expect(result.changes.notifications[0]).toContain('DMARC will be mandatory');
	});
});

describe('Incident Effects Manager - Combined Effects', () => {
	let session: GameSession;

	beforeEach(() => {
		session = createTestSession();
	});

	it('should apply multiple effects from same incident', () => {
		const incident: IncidentCard = {
			id: 'INC-006',
			name: 'Industry Scandal',
			round: [2],
			category: 'Industry',
			rarity: 'Common',
			description: 'Test',
			educationalNote: 'Test',
			duration: 'Immediate',
			effects: [
				{
					target: 'all_esps',
					type: 'reputation',
					value: -5
				},
				{
					target: 'all_destinations',
					type: 'budget',
					value: 100
				}
			]
		};

		const result = applyIncidentEffects(session, incident);

		expect(result.success).toBe(true);

		// Verify ESP reputation changes
		expect(session.esp_teams[0].reputation.Gmail).toBe(70); // 75 - 5
		expect(session.esp_teams[1].reputation.Gmail).toBe(75); // 80 - 5

		// Verify destination budget changes
		expect(session.destinations[0].budget).toBe(600); // 500 + 100
		expect(session.destinations[1].budget).toBe(500); // 400 + 100

		// Verify changes object contains both types
		expect(result.changes.espChanges).toBeDefined();
		expect(result.changes.destinationChanges).toBeDefined();
		expect(Object.keys(result.changes.espChanges).length).toBe(2);
		expect(Object.keys(result.changes.destinationChanges).length).toBe(3);
	});
});

describe('Incident Effects Manager - Error Handling', () => {
	let session: GameSession;

	beforeEach(() => {
		session = createTestSession();
	});

	it('should handle empty effects array gracefully', () => {
		const incident: IncidentCard = {
			id: 'TEST',
			name: 'Test',
			round: [1],
			category: 'Industry',
			rarity: 'Common',
			description: 'Test',
			educationalNote: 'Test',
			duration: 'Immediate',
			effects: []
		};

		const result = applyIncidentEffects(session, incident);

		expect(result.success).toBe(true);
		expect(result.changes.espChanges).toBeDefined();
		expect(result.changes.destinationChanges).toBeDefined();
		expect(result.changes.notifications).toBeDefined();
	});
});
