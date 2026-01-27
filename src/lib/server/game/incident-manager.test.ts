/**
 * Incident Manager Unit Tests
 * Phase 1: MVP Foundation
 *
 * Tests for core incident management functions
 * These tests should FAIL initially (RED phase of ATDD)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { GameSession } from './types';
import {
	getAvailableIncidents,
	triggerIncident,
	canTriggerIncident,
	addToHistory
} from './incident-manager';

// Helper: Create minimal test session
function createTestSession(currentRound: number = 1): GameSession {
	return {
		roomCode: 'TEST123',
		facilitatorId: 'facilitator-1',
		current_round: currentRound,
		current_phase: 'planning',
		esp_teams: [
			{
				name: 'SendWave',
				players: ['player-1'],
				budget: 1000,
				clients: [],
				technical_stack: [],
				credits: 1000,
				reputation: { zmail: 70, intake: 70, yagle: 70 },
				active_clients: [],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: []
			}
		],
		destinations: [
			{
				name: 'zmail',
				kingdom: 'zmail',
				players: ['player-2'],
				budget: 500,
				filtering_policies: {},
				esp_reputation: { SendWave: 70 }
			}
		],
		createdAt: new Date(),
		lastActivity: new Date(),
		incident_history: []
	};
}

describe('Incident Manager - getAvailableIncidents', () => {
	it('should return only Round 1 incidents when current round is 1', () => {
		const incidents = getAvailableIncidents(1);

		expect(incidents.length).toBeGreaterThan(0);
		expect(incidents.every((inc) => inc.round.includes(1))).toBe(true);

		// INC-001 should be available in Round 1
		const inc001 = incidents.find((inc) => inc.id === 'INC-001');
		expect(inc001).toBeDefined();
		expect(inc001?.name).toBe('Regulation Announcement');
	});

	it('should return only Round 2 incidents when current round is 2', () => {
		const incidents = getAvailableIncidents(2);

		expect(incidents.length).toBeGreaterThan(0);
		expect(incidents.every((inc) => inc.round.includes(2))).toBe(true);

		// INC-006 should be available in Round 2
		const inc006 = incidents.find((inc) => inc.id === 'INC-006');
		expect(inc006).toBeDefined();
		expect(inc006?.name).toBe('Industry Scandal');
	});

	it('should return only Round 3 incidents when current round is 3', () => {
		const incidents = getAvailableIncidents(3);

		expect(incidents.length).toBeGreaterThan(0);
		expect(incidents.every((inc) => inc.round.includes(3))).toBe(true);

		// INC-010 should be available in Round 3
		const inc010 = incidents.find((inc) => inc.id === 'INC-010');
		expect(inc010).toBeDefined();
		expect(inc010?.name).toBe('DMARC Enforcement');
		expect(inc010?.automatic).toBe(true);
	});

	it('should return only Round 4 incidents when current round is 4', () => {
		const incidents = getAvailableIncidents(4);

		expect(incidents.length).toBeGreaterThan(0);
		expect(incidents.every((inc) => inc.round.includes(4))).toBe(true);

		// INC-015 and INC-018 should be available in Round 4
		const inc015 = incidents.find((inc) => inc.id === 'INC-015');
		const inc018 = incidents.find((inc) => inc.id === 'INC-018');
		expect(inc015).toBeDefined();
		expect(inc018).toBeDefined();
	});

	it('should return empty array for invalid round numbers', () => {
		expect(getAvailableIncidents(0)).toEqual([]);
		expect(getAvailableIncidents(5)).toEqual([]);
		expect(getAvailableIncidents(-1)).toEqual([]);
	});
});

describe('Incident Manager - canTriggerIncident', () => {
	let session: GameSession;

	beforeEach(() => {
		session = createTestSession(1);
	});

	it('should return true for valid incident ID that exists', () => {
		const result = canTriggerIncident(session, 'INC-001');
		expect(result).toBe(true);
	});

	it('should return false for invalid incident ID', () => {
		const result = canTriggerIncident(session, 'INC-999');
		expect(result).toBe(false);
	});

	it('should return false for incident from different round', () => {
		// INC-006 is Round 2, but session is Round 1
		const result = canTriggerIncident(session, 'INC-006');
		expect(result).toBe(false);
	});

	it('should return false for incident already in history', () => {
		// Add INC-001 to history
		session.incident_history = [
			{
				incidentId: 'INC-001',
				name: 'Regulation Announcement',
				category: 'Regulatory',
				roundTriggered: 1,
				timestamp: new Date()
			}
		];

		// Try to trigger again - should fail
		const result = canTriggerIncident(session, 'INC-001');
		expect(result).toBe(false);
	});

	it('should return true for Round 3 incidents when in Round 3', () => {
		session.current_round = 3;
		const result = canTriggerIncident(session, 'INC-010');
		expect(result).toBe(true);
	});
});

describe('Incident Manager - triggerIncident', () => {
	let session: GameSession;

	beforeEach(() => {
		session = createTestSession(1);
	});

	it('should successfully trigger valid incident', () => {
		const result = triggerIncident(session, 'INC-001');

		expect(result.success).toBe(true);
		expect(result.incidentId).toBe('INC-001');
		expect(result.error).toBeUndefined();
	});

	it('should add incident to history', () => {
		const initialHistoryLength = session.incident_history?.length || 0;

		triggerIncident(session, 'INC-001');

		expect(session.incident_history).toBeDefined();
		expect(session.incident_history?.length).toBe(initialHistoryLength + 1);

		const historyEntry = session.incident_history?.[0];
		expect(historyEntry?.incidentId).toBe('INC-001');
		expect(historyEntry?.name).toBe('Regulation Announcement');
		expect(historyEntry?.category).toBe('Regulatory');
		expect(historyEntry?.roundTriggered).toBe(1);
		expect(historyEntry?.timestamp).toBeInstanceOf(Date);
	});

	it('should fail for invalid incident ID', () => {
		const result = triggerIncident(session, 'INC-999');

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).toContain('not found');
	});

	it('should fail for incident from wrong round', () => {
		// INC-006 is Round 2, but session is Round 1
		const result = triggerIncident(session, 'INC-006');

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).toContain('not available for round');
	});

	it('should fail for duplicate incident in same round', () => {
		// First trigger should succeed
		const result1 = triggerIncident(session, 'INC-001');
		expect(result1.success).toBe(true);

		// Second trigger should fail
		const result2 = triggerIncident(session, 'INC-001');
		expect(result2.success).toBe(false);
		expect(result2.error).toBeDefined();
		expect(result2.error).toContain('already triggered');
	});

	it('should initialize incident_history if undefined', () => {
		session.incident_history = undefined;

		triggerIncident(session, 'INC-001');

		expect(session.incident_history).toBeDefined();
		expect(Array.isArray(session.incident_history)).toBe(true);
		expect(session.incident_history?.length).toBe(1);
	});
});

describe('Incident Manager - addToHistory', () => {
	let session: GameSession;

	beforeEach(() => {
		session = createTestSession(1);
	});

	it('should add incident to history array', () => {
		const incident = {
			id: 'INC-001',
			name: 'Regulation Announcement',
			round: [1],
			category: 'Regulatory' as const,
			rarity: 'Common' as const,
			description: 'Test description',
			educationalNote: 'Test note',
			duration: 'Permanent' as const,
			effects: []
		};

		addToHistory(session, incident);

		expect(session.incident_history).toBeDefined();
		expect(session.incident_history?.length).toBe(1);

		const entry = session.incident_history?.[0];
		expect(entry?.incidentId).toBe('INC-001');
		expect(entry?.name).toBe('Regulation Announcement');
		expect(entry?.category).toBe('Regulatory');
		expect(entry?.roundTriggered).toBe(1);
	});

	it('should initialize incident_history if undefined', () => {
		session.incident_history = undefined;
		const incident = {
			id: 'INC-001',
			name: 'Regulation Announcement',
			round: [1],
			category: 'Regulatory' as const,
			rarity: 'Common' as const,
			description: 'Test description',
			educationalNote: 'Test note',
			duration: 'Permanent' as const,
			effects: []
		};

		addToHistory(session, incident);

		expect(session.incident_history).toBeDefined();
		expect(session.incident_history?.length).toBe(1);
	});

	it('should preserve existing history when adding new entry', () => {
		// Add first incident
		const incident1 = {
			id: 'INC-001',
			name: 'Regulation Announcement',
			round: [1],
			category: 'Regulatory' as const,
			rarity: 'Common' as const,
			description: 'Test description',
			educationalNote: 'Test note',
			duration: 'Permanent' as const,
			effects: []
		};
		addToHistory(session, incident1);

		// Add second incident (Round 2)
		session.current_round = 2;
		const incident2 = {
			id: 'INC-006',
			name: 'Industry Scandal',
			round: [2],
			category: 'Industry' as const,
			rarity: 'Common' as const,
			description: 'Test description',
			educationalNote: 'Test note',
			duration: 'Immediate' as const,
			effects: []
		};
		addToHistory(session, incident2);

		expect(session.incident_history?.length).toBe(2);
		expect(session.incident_history?.[0]?.incidentId).toBe('INC-001');
		expect(session.incident_history?.[1]?.incidentId).toBe('INC-006');
	});
});
