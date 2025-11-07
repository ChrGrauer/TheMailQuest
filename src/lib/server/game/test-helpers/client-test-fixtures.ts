/**
 * Client Test Fixtures
 * Helper functions to build test clients with base values (no variance)
 * US 3.3: Resolution Phase Automation
 */

import type { Client, ClientType } from '$lib/server/game/types';
import { getClientProfile } from '$lib/config/client-profiles';

/**
 * Build a test client with base values from config
 * No ±10% variance applied (predictable for tests)
 */
export function buildTestClient(type: ClientType, overrides?: Partial<Client>): Client {
	const profile = getClientProfile(type);
	if (!profile) {
		throw new Error(`Unknown client type: ${type}`);
	}

	return {
		id: overrides?.id || `test-${type}-${Date.now()}`,
		name: overrides?.name || `Test ${profile.type}`,
		type: profile.type,
		volume: overrides?.volume ?? profile.baseVolume,
		revenue: overrides?.revenue ?? profile.baseRevenue,
		risk: overrides?.risk ?? profile.risk,
		spam_rate: overrides?.spam_rate ?? profile.baseSpamRate,
		requirements: profile.requirements,
		description: profile.description
	};
}

/**
 * Build multiple test clients at once
 */
export function buildTestClients(
	configs: Array<{ type: ClientType; overrides?: Partial<Client> }>
): Client[] {
	return configs.map((config, index) =>
		buildTestClient(config.type, {
			id: `test-client-${index}`,
			...config.overrides
		})
	);
}
