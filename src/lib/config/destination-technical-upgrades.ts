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
		Gmail: number | null;
		Outlook: number | null;
		Yahoo: number | null;
	};
	availability: {
		Gmail: boolean;
		Outlook: boolean;
		Yahoo: boolean;
	};
	unavailable_reason?: {
		Gmail?: string;
		Outlook?: string;
		Yahoo?: string;
	};
}

/**
 * All available destination tools
 * Placeholder - will be populated in GREEN phase
 */
export const DESTINATION_TOOLS: Record<string, DestinationTool> = {};

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
