/**
 * Incident Cards Configuration
 * Phase 1: MVP Foundation - 5 Essential Cards
 *
 * Based on docs/incident-cards-specification.md
 */

import type { IncidentCard } from '$lib/types/incident';

/**
 * All incident cards available in Phase 1 MVP
 */
export const INCIDENT_CARDS: IncidentCard[] = [
	// ============================================================================
	// ROUND 1: Learning Phase
	// ============================================================================

	{
		id: 'INC-001',
		name: 'Regulation Announcement',
		round: [1],
		category: 'Regulatory',
		rarity: 'Common',
		description:
			'The email industry association announces that DMARC authentication will become mandatory starting Round 3. Major destinations will require full authentication or face severe delivery penalties.',
		educationalNote: 'Teaches the importance of staying ahead of regulatory changes',
		duration: 'Permanent',
		effects: [
			{
				target: 'notification',
				type: 'notification',
				message: 'DMARC will be mandatory from Round 3. Plan your technical investments now!'
			}
		]
	},

	// ============================================================================
	// ROUND 2: Escalation
	// ============================================================================

	{
		id: 'INC-006',
		name: 'Industry Scandal',
		round: [2],
		category: 'Industry',
		rarity: 'Common',
		description:
			'Major ESP caught selling user data! Public trust in email providers plummets. All ESPs suffer reputation damage. Destinations receive emergency funding for enhanced protection.',
		educationalNote: 'Industry reputation affects everyone - one bad actor hurts all',
		duration: 'Immediate',
		effects: [
			{
				target: 'all_esps',
				type: 'reputation',
				value: -5 // All ESPs lose 5 reputation across all destinations
			},
			{
				target: 'all_destinations',
				type: 'budget',
				value: 100 // All destinations gain 100 budget
			}
		]
	},

	// ============================================================================
	// ROUND 3: High Stakes
	// ============================================================================

	{
		id: 'INC-010',
		name: 'DMARC Enforcement',
		round: [3],
		category: 'Regulatory',
		rarity: 'Common',
		description:
			'As announced, DMARC is now MANDATORY. All destinations will reject 80% of emails from non-DMARC senders. This is not a drill.',
		educationalNote: 'Regulatory compliance is non-negotiable in email delivery',
		duration: 'Permanent',
		automatic: true, // Automatically triggers at Round 3 start
		effects: [
			{
				target: 'notification',
				type: 'notification',
				message:
					'DMARC enforcement is now active. ESPs without DMARC will face 80% email rejection. (Note: Penalty is already implemented in delivery calculator and applies automatically)'
			}
		]
	},

	// ============================================================================
	// ROUND 4: Endgame
	// ============================================================================

	{
		id: 'INC-015',
		name: 'Black Friday Chaos',
		round: [4],
		category: 'Market',
		rarity: 'Common',
		description:
			'BLACK FRIDAY ARRIVES! All clients double their sending volume. Maximum revenue potential, but deliverability will be tested to the limit!',
		educationalNote: 'Peak seasons create extreme pressure on infrastructure',
		duration: 'This Round',
		effects: [
			{
				target: 'notification',
				type: 'notification',
				message:
					'Black Friday: All client volumes doubled! Revenue opportunities abound, but reputation is at risk. (Note: Volume multiplier not implemented in Phase 1 MVP - notification only)'
			}
		]
	},

	{
		id: 'INC-018',
		name: 'Zero-Day Crisis',
		round: [4],
		category: 'Technical',
		rarity: 'Common',
		description:
			'CRITICAL VULNERABILITY in email authentication discovered! All teams must address immediately or face severe reputation damage. Patch cost: 250 credits.',
		educationalNote: 'Security maintenance is an ongoing operational cost',
		duration: 'Immediate',
		effects: [
			{
				target: 'all_esps',
				type: 'reputation',
				value: -10 // All ESPs lose 10 reputation (simplified for Phase 1 - no choice mechanism)
			},
			{
				target: 'notification',
				type: 'notification',
				message:
					'Zero-Day vulnerability! All ESPs lose 10 reputation. (Note: Choice mechanism not implemented in Phase 1 MVP - automatic reputation penalty)'
			}
		]
	}
];

/**
 * Get incident card by ID
 * @param id - Incident card ID (e.g., "INC-001")
 * @returns Incident card or undefined if not found
 */
export function getIncidentById(id: string): IncidentCard | undefined {
	return INCIDENT_CARDS.find((card) => card.id === id);
}

/**
 * Get all incident cards available for a specific round
 * @param round - Round number (1-4)
 * @returns Array of incident cards that can be triggered in this round
 */
export function getIncidentsByRound(round: number): IncidentCard[] {
	return INCIDENT_CARDS.filter((card) => card.round.includes(round));
}

/**
 * Get all automatic incident cards for a specific round
 * (e.g., DMARC Enforcement at Round 3)
 * @param round - Round number (1-4)
 * @returns Array of automatic incident cards for this round
 */
export function getAutomaticIncidentsForRound(round: number): IncidentCard[] {
	return INCIDENT_CARDS.filter((card) => card.automatic && card.round.includes(round));
}
