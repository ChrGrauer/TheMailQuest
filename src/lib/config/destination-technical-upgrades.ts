/**
 * Destination Technical Upgrades Configuration
 * US-2.5: Destination Kingdom Dashboard
 *
 * Defines all available technical upgrades for Destination players
 */

export interface DestinationTechnicalUpgrade {
	id: string;
	name: string;
	description: string;
	cost?: number;
	category?: 'authentication' | 'filtering' | 'security' | 'monitoring';
}

/**
 * All available destination technical upgrades
 */
export const DESTINATION_TECHNICAL_UPGRADES: DestinationTechnicalUpgrade[] = [
	// Authentication Checks
	{
		id: 'spf-check',
		name: 'SPF Authentication Check',
		description: 'Verify sender SPF records for incoming emails',
		cost: 100,
		category: 'authentication'
	},
	{
		id: 'dkim-check',
		name: 'DKIM Signature Check',
		description: 'Validate DKIM signatures on incoming emails',
		cost: 150,
		category: 'authentication'
	},
	{
		id: 'dmarc-check',
		name: 'DMARC Check',
		description: 'Enforce DMARC policies for email authentication',
		cost: 200,
		category: 'authentication'
	},

	// Filtering
	{
		id: 'advanced-spam-filter',
		name: 'Advanced Spam Filter',
		description: 'Machine learning-based spam detection and filtering',
		cost: 250,
		category: 'filtering'
	},
	{
		id: 'content-analysis',
		name: 'Content Analysis Engine',
		description: 'Deep content inspection for malicious patterns',
		cost: 200,
		category: 'filtering'
	},
	{
		id: 'attachment-scanner',
		name: 'Attachment Scanner',
		description: 'Scan attachments for malware and threats',
		cost: 180,
		category: 'filtering'
	},

	// Security
	{
		id: 'email-encryption-check',
		name: 'Email Encryption Check',
		description: 'Verify TLS encryption for incoming connections',
		cost: 120,
		category: 'security'
	},
	{
		id: 'threat-intelligence',
		name: 'Threat Intelligence Feed',
		description: 'Real-time threat intelligence for known bad actors',
		cost: 220,
		category: 'security'
	},

	// Monitoring
	{
		id: 'reputation-monitoring',
		name: 'Reputation Monitoring',
		description: 'Track sender reputation across all ESPs',
		cost: 130,
		category: 'monitoring'
	},
	{
		id: 'analytics-dashboard',
		name: 'Analytics Dashboard',
		description: 'Detailed email traffic and filtering analytics',
		cost: 100,
		category: 'monitoring'
	},
	{
		id: 'user-feedback-system',
		name: 'User Feedback System',
		description: 'Collect user feedback on spam and legitimate emails',
		cost: 150,
		category: 'monitoring'
	}
];

/**
 * Get destination technical upgrade by ID
 */
export function getDestinationTechnicalUpgrade(
	id: string
): DestinationTechnicalUpgrade | undefined {
	return DESTINATION_TECHNICAL_UPGRADES.find((tech) => tech.id === id);
}

/**
 * Get destination technical upgrade by name
 */
export function getDestinationTechnicalUpgradeByName(
	name: string
): DestinationTechnicalUpgrade | undefined {
	return DESTINATION_TECHNICAL_UPGRADES.find((tech) => tech.name === name);
}

/**
 * Get destination technical upgrades by category
 */
export function getDestinationTechByCategory(
	category: 'authentication' | 'filtering' | 'security' | 'monitoring'
): DestinationTechnicalUpgrade[] {
	return DESTINATION_TECHNICAL_UPGRADES.filter((tech) => tech.category === category);
}
