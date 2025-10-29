/**
 * Technical Upgrades Configuration
 * US-2.1: ESP Team Dashboard
 *
 * Defines all available technical upgrades for ESP teams
 */

export interface TechnicalUpgrade {
	id: string;
	name: string;
	description: string;
	cost?: number;
	mandatory?: boolean;
	mandatoryFrom?: number; // Round number when it becomes mandatory
	category?: 'authentication' | 'security' | 'infrastructure' | 'monitoring';
}

/**
 * All available technical upgrades
 */
export const TECHNICAL_UPGRADES: TechnicalUpgrade[] = [
	// Authentication
	{
		id: 'spf',
		name: 'SPF Authentication',
		description: 'Sender Policy Framework - Validates sending IP addresses',
		cost: 100,
		category: 'authentication'
	},
	{
		id: 'dkim',
		name: 'DKIM Signature',
		description: 'DomainKeys Identified Mail - Cryptographic email authentication',
		cost: 150,
		category: 'authentication'
	},
	{
		id: 'dmarc',
		name: 'DMARC',
		description: 'Domain-based Message Authentication - Policy enforcement',
		cost: 200,
		mandatory: true,
		mandatoryFrom: 3,
		category: 'authentication'
	},

	// Security
	{
		id: 'tls-encryption',
		name: 'TLS Encryption',
		description: 'Transport Layer Security for email transmission',
		cost: 120,
		category: 'security'
	},
	{
		id: 'anti-spam-filter',
		name: 'Anti-Spam Filter',
		description: 'Advanced spam detection and filtering',
		cost: 180,
		category: 'security'
	},

	// Infrastructure
	{
		id: 'dedicated-ip',
		name: 'Dedicated IP',
		description: 'Exclusive IP address for sending',
		cost: 250,
		category: 'infrastructure'
	},
	{
		id: 'cdn',
		name: 'Content Delivery Network',
		description: 'Faster email asset delivery',
		cost: 150,
		category: 'infrastructure'
	},

	// Monitoring
	{
		id: 'analytics-dashboard',
		name: 'Analytics Dashboard',
		description: 'Real-time email performance metrics',
		cost: 100,
		category: 'monitoring'
	},
	{
		id: 'reputation-monitoring',
		name: 'Reputation Monitoring',
		description: 'Track sender reputation across destinations',
		cost: 130,
		category: 'monitoring'
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
	return !!(
		tech &&
		tech.mandatory &&
		tech.mandatoryFrom &&
		currentRound >= tech.mandatoryFrom
	);
}
