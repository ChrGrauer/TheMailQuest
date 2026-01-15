/**
 * Technical Upgrades Configuration
 * US-2.1: ESP Team Dashboard
 * US-2.3: Technical Infrastructure Shop
 *
 * Defines all available technical upgrades for ESP teams
 */

export interface TechnicalUpgrade {
	id: string;
	name: string;
	description: string;
	cost: number;
	mandatory?: boolean;
	mandatoryFrom?: number; // Round number when it becomes mandatory
	category: 'authentication' | 'security' | 'infrastructure' | 'monitoring';
	dependencies?: string[]; // IDs of prerequisite techs that must be owned first
	benefits?: string[]; // List of benefits for display in shop
}

/**
 * All available technical upgrades
 * US-2.3: Core upgrades for the technical infrastructure shop
 */
export const TECHNICAL_UPGRADES: TechnicalUpgrade[] = [
	// Email Authentication Stack (dependency chain: SPF → DKIM → DMARC)
	{
		id: 'spf',
		name: 'SPF Authentication',
		description: 'Sender Policy Framework - Validates sending IP addresses',
		cost: 100,
		category: 'authentication',
		dependencies: [],
		benefits: [
			'+2 reputation per round',
			'Prevents email spoofing',
			'Foundation for advanced authentication',
			'Required for DKIM'
		]
	},
	{
		id: 'dkim',
		name: 'DKIM Signature',
		description: 'DomainKeys Identified Mail - Cryptographic email authentication',
		cost: 150,
		category: 'authentication',
		dependencies: ['spf'],
		benefits: [
			'+3 reputation per round',
			'Cryptographic verification',
			'Detects email tampering',
			'Required for DMARC'
		]
	},
	{
		id: 'dmarc',
		name: 'DMARC Policy',
		description: 'Domain-based Message Authentication, Reporting & Conformance',
		cost: 200,
		mandatory: true,
		mandatoryFrom: 3,
		category: 'authentication',
		dependencies: ['spf', 'dkim'],
		benefits: [
			'+5 reputation per round',
			'Complete authentication stack',
			'Avoid 80% rejection from Round 3',
			'Detailed reporting and visibility'
		]
	},

	// Quality Control
	{
		id: 'content-filtering',
		name: 'Content Filtering',
		description: 'Advanced content analysis and spam detection',
		cost: 120,
		category: 'security',
		dependencies: [],
		benefits: [
			'Reduces spam complaint rate by 30%',
			'Automatic content quality checks',
			'Protects sender reputation',
			'Does NOT affect spam trap risk (use List Hygiene for that)'
		]
	},

	// Intelligence & Monitoring
	{
		id: 'advanced-monitoring',
		name: 'Advanced Monitoring',
		description: 'Real-time analytics and reputation tracking across all destinations',
		cost: 150,
		category: 'monitoring',
		dependencies: [],
		benefits: [
			'Real-time performance metrics',
			'Reputation tracking per destination',
			'Predictive analytics',
			'Early warning system'
		]
	}
];

/**
 * Get technical upgrade by ID
 */
export function getTechnicalUpgrade(id: string): TechnicalUpgrade | undefined {
	return TECHNICAL_UPGRADES.find((tech) => tech.id === id);
}

/**
 * Get technical upgrade by name
 */
export function getTechnicalUpgradeByName(name: string): TechnicalUpgrade | undefined {
	return TECHNICAL_UPGRADES.find((tech) => tech.name === name);
}

/**
 * Get mandatory technical upgrades for a given round
 */
export function getMandatoryTechForRound(round: number): TechnicalUpgrade[] {
	return TECHNICAL_UPGRADES.filter(
		(tech) => tech.mandatory && tech.mandatoryFrom && round >= tech.mandatoryFrom
	);
}

/**
 * Check if tech is mandatory for current round
 */
export function isTechMandatory(techId: string, currentRound: number): boolean {
	const tech = getTechnicalUpgrade(techId);
	return !!(tech && tech.mandatory && tech.mandatoryFrom && currentRound >= tech.mandatoryFrom);
}

/**
 * Check if all dependencies for a tech are met
 * US-2.3: Technical Infrastructure Shop
 */
export function areDependenciesMet(
	techId: string,
	ownedTechIds: string[]
): { met: boolean; missing: string[] } {
	const tech = getTechnicalUpgrade(techId);
	if (!tech || !tech.dependencies || tech.dependencies.length === 0) {
		return { met: true, missing: [] };
	}

	const missing = tech.dependencies.filter((depId) => !ownedTechIds.includes(depId));
	return { met: missing.length === 0, missing };
}

/**
 * Get missing dependency names for display
 * US-2.3: Technical Infrastructure Shop
 */
export function getMissingDependencyNames(techId: string, ownedTechIds: string[]): string[] {
	const { missing } = areDependenciesMet(techId, ownedTechIds);
	return missing
		.map((depId) => getTechnicalUpgrade(depId))
		.filter((tech): tech is TechnicalUpgrade => tech !== undefined)
		.map((tech) => tech.name);
}

/**
 * Get upgrade status based on ownership and dependencies
 * US-2.3: Technical Infrastructure Shop
 */
export function getUpgradeStatus(
	techId: string,
	ownedTechIds: string[]
): 'Owned' | 'Available' | 'Locked' {
	if (ownedTechIds.includes(techId)) {
		return 'Owned';
	}

	const { met } = areDependenciesMet(techId, ownedTechIds);
	return met ? 'Available' : 'Locked';
}

/**
 * Authentication delivery success bonuses
 * US-3.3: Resolution Phase Automation - Iteration 3
 */
export const AUTHENTICATION_DELIVERY_BONUSES: Record<string, number> = {
	spf: 0.05, // +5% delivery success
	dkim: 0.08, // +8% delivery success
	dmarc: 0.12 // +12% delivery success
};

/**
 * Get cumulative authentication delivery bonus for owned tech stack
 */
export function getAuthenticationDeliveryBonus(ownedTechIds: string[]): number {
	let bonus = 0;
	if (ownedTechIds.includes('spf')) bonus += AUTHENTICATION_DELIVERY_BONUSES.spf;
	if (ownedTechIds.includes('dkim')) bonus += AUTHENTICATION_DELIVERY_BONUSES.dkim;
	if (ownedTechIds.includes('dmarc')) bonus += AUTHENTICATION_DELIVERY_BONUSES.dmarc;
	return bonus;
}

/**
 * Get cumulative authentication reputation bonus for owned tech stack
 */
export function getAuthenticationReputationBonus(ownedTechIds: string[]): number {
	let bonus = 0;
	if (ownedTechIds.includes('spf')) bonus += 2;
	if (ownedTechIds.includes('dkim')) bonus += 3;
	if (ownedTechIds.includes('dmarc')) bonus += 5;
	return bonus;
}

/**
 * DMARC enforcement penalty (Round 3+)
 * US-3.3: Resolution Phase Automation - Iteration 3
 */
export const DMARC_MISSING_PENALTY = 0.2; // 80% rejection = only 20% gets through

/**
 * Content Filtering complaint reduction
 * US-3.3: Resolution Phase Automation - Iteration 5
 */
export const CONTENT_FILTERING_COMPLAINT_REDUCTION = 0.3; // 30% reduction
