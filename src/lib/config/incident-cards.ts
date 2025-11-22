/**
 * Incident Cards Configuration
 * Phase 1: MVP Foundation - 5 Essential Cards
 * Phase 2: Advanced Mechanics - 5 Additional Cards
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

	{
		id: 'INC-003',
		name: 'Venture Capital Boost',
		round: [1],
		category: 'Market',
		rarity: 'Uncommon',
		description:
			'A venture capital firm is looking to invest in promising email service providers. Facilitator: Select one ESP team to receive funding.',
		educationalNote: 'Market opportunities can provide competitive advantages',
		duration: 'Immediate',
		effects: [
			{
				target: 'selected_esp',
				type: 'credits',
				value: 200,
				displayMessage: '200 credits from Venture Capital'
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
				value: -5, // All ESPs lose 5 reputation across all destinations
				displayMessage: 'Reputation penalty of -5 from Industry scandal'
			},
			{
				target: 'all_destinations',
				type: 'budget',
				value: 100, // All destinations gain 100 budget
				displayMessage: '100 credits following the Industry Scandal'
			}
		]
	},

	{
		id: 'INC-008',
		name: 'Authentication Emergency',
		round: [2],
		category: 'Security',
		rarity: 'Common',
		description:
			'Major phishing attack exploiting weak email authentication! Destinations crack down on ESPs without proper DKIM setup.',
		educationalNote: 'Authentication is critical for email security and trust',
		duration: 'Immediate',
		effects: [
			{
				target: 'conditional_esp',
				type: 'reputation',
				value: -10,
				condition: {
					type: 'lacks_tech',
					tech: 'dkim'
				},
				displayMessage:
					'Reputation penalty of -10 following a major phishing attack exploiting weak email authentication (no DKIM)'
			}
		]
	},

	{
		id: 'INC-009',
		name: 'Seasonal Traffic Surge',
		round: [2],
		category: 'Market',
		rarity: 'Uncommon',
		description:
			"Valentine's Day approaches! E-commerce, retail, and event clients increase volume by 50% this round. Revenue opportunities abound, but infrastructure will be tested.",
		educationalNote: 'Seasonal events create volume spikes that test infrastructure',
		duration: 'This Round',
		effects: [
			{
				target: 'all_esps',
				type: 'client_volume_multiplier',
				multiplier: 1.5,
				duration: 'this_round',
				clientTypes: ['re_engagement', 'aggressive_marketer', 'event_seasonal'],
				displayMessage: 'Volume increased by Seasonal Traffic Surge'
			},
			{
				target: 'all_esps',
				type: 'client_spam_trap_multiplier',
				multiplier: 1.2,
				duration: 'this_round',
				clientTypes: ['re_engagement', 'aggressive_marketer', 'event_seasonal'],
				displayMessage: 'Spamtrap increased by Seasonal Traffic Surge'
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

	{
		id: 'INC-011',
		name: 'Viral Campaign',
		round: [3],
		category: 'Market',
		rarity: 'Rare',
		description:
			'One of your clients content goes VIRAL! Facilitator: Select an ESP. System will randomly pick one of their active clients.',
		educationalNote:
			'Viral content creates massive volume spikes - proper infrastructure is critical',
		duration: 'This Round',
		effects: [
			{
				target: 'selected_client',
				type: 'client_volume_multiplier',
				multiplier: 10,
				duration: 'this_round',
				displayMessage: 'This client went VIRAL, volume multiplied by 10'
			},
			{
				target: 'selected_client',
				type: 'reputation',
				value: 10,
				condition: {
					type: 'has_tech',
					tech: 'list_hygiene'
				},
				displayMessage: 'Reputation bonus of +10 as viral cleint was managed smoothly'
			},
			{
				target: 'selected_client',
				type: 'credits',
				value: 500,
				condition: {
					type: 'has_tech',
					tech: 'list_hygiene'
				},
				displayMessage: 'Extra 500 credits following success of viral client'
			},
			{
				target: 'selected_client',
				type: 'reputation',
				value: -10,
				condition: {
					type: 'lacks_tech',
					tech: 'list_hygiene'
				},
				displayMessage:
					'Reputation damage of -10 following viral client as list hygien was not under control'
			},
			{
				target: 'selected_client',
				type: 'client_spam_trap_multiplier',
				multiplier: 3,
				duration: 'this_round',
				condition: {
					type: 'lacks_tech',
					tech: 'list_hygiene'
				},
				displayMessage: 'Spam Trap risk increased due to missing list hygien on viral client'
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
		id: 'INC-016',
		name: 'Legal Reckoning',
		round: [3, 4],
		category: 'Regulatory',
		rarity: 'Uncommon',
		description:
			'GDPR violation lawsuit targets one ESP! Massive fines and immediate operational restrictions. Facilitator: Select one ESP to face legal consequences.',
		educationalNote: 'Legal compliance failures have severe financial and operational consequences',
		duration: 'Immediate',
		effects: [
			{
				target: 'selected_esp',
				type: 'credits',
				value: -400
			},
			{
				target: 'selected_esp',
				type: 'auto_lock'
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
				value: -10, // All ESPs lose 10 reputation (simplified for Phase 1 - no choice mechanism)
				displayMessage: 'Reputation damage of -10 due to unpatched critical vulnerability'
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
