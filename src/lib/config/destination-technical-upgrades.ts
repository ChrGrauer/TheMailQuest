/**
 * Destination Technical Upgrades Configuration
 * US-2.6.2: Destination Tech Shop
 *
 * Defines all available tools for Destination players
 * with kingdom-specific pricing and availability
 */

export interface DestinationTool {
	id: string;
	name: string;
	category: string;
	description: string;
	scope: 'ALL_ESPS';
	permanent: boolean;
	authentication_level?: number; // 1, 2, or 3 for Auth Validators
	requires?: string | string[]; // Prerequisite tool IDs
	effects: {
		spam_detection_boost?: number; // percentage
		false_positive_impact?: number; // percentage (negative = reduction)
		trap_multiplier?: number; // For Spam Trap Network
	};
	pricing: {
		zmail: number | null;
		intake: number | null;
		yagle: number | null;
	};
	availability: {
		zmail: boolean;
		intake: boolean;
		yagle: boolean;
	};
	unavailable_reason?: {
		zmail?: string;
		intake?: string;
		yagle?: string;
	};
}

/**
 * All available destination tools
 */
export const DESTINATION_TOOLS: Record<string, DestinationTool> = {
	content_analysis_filter: {
		id: 'content_analysis_filter',
		name: 'Content Analysis Filter',
		category: 'Content Analysis',
		description:
			'Analyzes message content for promotional language, urgency tactics, and spam triggers',
		scope: 'ALL_ESPS',
		permanent: true,
		effects: {
			spam_detection_boost: 15,
			false_positive_impact: -2
		},
		pricing: {
			zmail: 300,
			intake: 240,
			yagle: 160
		},
		availability: {
			zmail: true,
			intake: true,
			yagle: true
		}
	},

	auth_validator_l1: {
		id: 'auth_validator_l1',
		name: 'Authentication Validator - Level 1 (SPF)',
		category: 'Authentication',
		description: 'Validates SPF authentication records, requires ESPs to implement SPF',
		scope: 'ALL_ESPS',
		permanent: true,
		authentication_level: 1,
		effects: {
			spam_detection_boost: 5,
			false_positive_impact: 0
		},
		pricing: {
			zmail: 50,
			intake: 50,
			yagle: 50
		},
		availability: {
			zmail: true,
			intake: true,
			yagle: true
		}
	},

	auth_validator_l2: {
		id: 'auth_validator_l2',
		name: 'Authentication Validator - Level 2 (DKIM)',
		category: 'Authentication',
		description: 'Validates DKIM signatures, requires ESPs to implement DKIM',
		scope: 'ALL_ESPS',
		permanent: true,
		authentication_level: 2,
		requires: 'auth_validator_l1',
		effects: {
			spam_detection_boost: 8,
			false_positive_impact: 0
		},
		pricing: {
			zmail: 50,
			intake: 50,
			yagle: 50
		},
		availability: {
			zmail: true,
			intake: true,
			yagle: true
		}
	},

	auth_validator_l3: {
		id: 'auth_validator_l3',
		name: 'Authentication Validator - Level 3 (DMARC)',
		category: 'Authentication',
		description: 'Validates DMARC policy, requires ESPs to implement full authentication stack',
		scope: 'ALL_ESPS',
		permanent: true,
		authentication_level: 3,
		requires: ['auth_validator_l1', 'auth_validator_l2'],
		effects: {
			spam_detection_boost: 12,
			false_positive_impact: 0
		},
		pricing: {
			zmail: 50,
			intake: 50,
			yagle: 50
		},
		availability: {
			zmail: true,
			intake: true,
			yagle: true
		}
	},

	ml_system: {
		id: 'ml_system',
		name: 'Machine Learning System',
		category: 'Intelligence',
		description:
			'Advanced AI-powered detection with contextual understanding. Learns from user feedback throughout game, improves over rounds.',
		scope: 'ALL_ESPS',
		permanent: true,
		effects: {
			spam_detection_boost: 25,
			false_positive_impact: -3
		},
		pricing: {
			zmail: 500,
			intake: 400,
			yagle: null
		},
		availability: {
			zmail: true,
			intake: true,
			yagle: false
		},
		unavailable_reason: {
			yagle: 'Insufficient computational resources'
		}
	},

	spam_trap_network: {
		id: 'spam_trap_network',
		name: 'Spam Trap Network',
		category: 'Tactical',
		description:
			'Deploy network of spam traps for single round. Triples spam trap hit probability. Can announce deployment as deterrent or keep secret for surprise.',
		scope: 'ALL_ESPS',
		permanent: false, // Must repurchase each round
		// TODO (Round Transition): When transitioning to next round, remove 'spam_trap_network' from destination.owned_tools
		// and reset destination.spam_trap_active to undefined. This ensures players must repurchase each round.
		effects: {
			trap_multiplier: 3
		},
		pricing: {
			zmail: 250,
			intake: 200,
			yagle: 150
		},
		availability: {
			zmail: true,
			intake: true,
			yagle: true
		}
	},

	volume_throttling: {
		id: 'volume_throttling',
		name: 'Volume Throttling System',
		category: 'Volume Control',
		description:
			'Automatically delays suspicious volume spikes, forcing gradual sending when sudden increase detected. Protection against spam campaigns and botnet attacks.',
		scope: 'ALL_ESPS',
		permanent: true,
		effects: {
			spam_detection_boost: 5,
			false_positive_impact: -1
		},
		pricing: {
			zmail: 200,
			intake: 150,
			yagle: 100
		},
		availability: {
			zmail: true,
			intake: true,
			yagle: true
		}
	}
};

/**
 * Get destination tool by ID
 */
export function getDestinationTool(id: string): DestinationTool | undefined {
	return DESTINATION_TOOLS[id];
}

/**
 * Get tool price for specific kingdom
 */
export function getToolPrice(toolId: string, kingdom: string): number | null {
	const tool = DESTINATION_TOOLS[toolId];
	if (!tool) return null;

	const kingdomKey = kingdom as keyof typeof tool.pricing;
	return tool.pricing[kingdomKey] || null;
}

/**
 * Check tool availability for kingdom
 */
export function isToolAvailable(toolId: string, kingdom: string): boolean {
	const tool = DESTINATION_TOOLS[toolId];
	if (!tool) return false;

	const kingdomKey = kingdom as keyof typeof tool.availability;
	return tool.availability[kingdomKey] === true;
}

/**
 * Get unavailability reason for kingdom
 */
export function getUnavailableReason(toolId: string, kingdom: string): string | null {
	const tool = DESTINATION_TOOLS[toolId];
	if (!tool || !tool.unavailable_reason) return null;

	const kingdomKey = kingdom as keyof typeof tool.unavailable_reason;
	return tool.unavailable_reason[kingdomKey] || null;
}
