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
		cost: overrides?.cost ?? profile.baseCost,
		volume: overrides?.volume ?? profile.baseVolume,
		revenue: overrides?.revenue ?? profile.baseRevenue,
		risk: overrides?.risk ?? profile.risk,
		spam_rate: overrides?.spam_rate ?? profile.baseSpamRate,
		available_from_round: overrides?.available_from_round ?? profile.availableFromRound,
		requirements: profile.requirements,
		destination_distribution:
			overrides?.destination_distribution ?? profile.destination_distribution,
		...overrides
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

/**
 * Default per-destination volume distribution (50/30/20)
 */
const DEFAULT_PER_DESTINATION = { zmail: 0, intake: 0, yagle: 0 };

/**
 * Build a test ClientVolumeData with defaults for optional fields
 * US 3.3: Iteration 6 - Per-destination volume tracking
 */
export function buildClientVolumeData(
	clientId: string,
	baseVolume: number,
	adjustedVolume?: number,
	adjustments?: Record<string, any>
): {
	clientId: string;
	baseVolume: number;
	adjustedVolume: number;
	adjustments: Record<string, any>;
	adjustedVolume: number;
	adjustments: Record<string, any>;
	perDestination: { zmail: number; intake: number; yagle: number };
} {
	const vol = adjustedVolume ?? baseVolume;
	return {
		clientId,
		baseVolume,
		adjustedVolume: vol,
		adjustments: adjustments ?? {},
		perDestination: {
			zmail: Math.round(vol * 0.5),
			intake: Math.round(vol * 0.3),
			yagle: Math.round(vol * 0.2)
		}
	};
}

/**
 * Build a test VolumeResult with defaults for optional fields
 * US 3.3: Iteration 6 - Per-destination volume tracking
 */
export function buildVolumeResult(
	activeClients: Client[],
	clientVolumes: Array<{
		clientId: string;
		baseVolume: number;
		adjustedVolume: number;
		adjustments: Record<string, any>;
		perDestination?: { zmail: number; intake: number; yagle: number };
	}>,
	totalVolume?: number
): {
	activeClients: Client[];
	clientVolumes: Array<{
		clientId: string;
		baseVolume: number;
		adjustedVolume: number;
		adjustments: Record<string, any>;
		perDestination: { zmail: number; intake: number; yagle: number };
	}>;
	totalVolume: number;
	perDestination: { zmail: number; intake: number; yagle: number };
} {
	// Add default perDestination to each client volume if missing
	const clientVolumesWithDest = clientVolumes.map((cv) => ({
		...cv,
		perDestination: cv.perDestination ?? {
			zmail: Math.round(cv.adjustedVolume * 0.5),
			intake: Math.round(cv.adjustedVolume * 0.3),
			yagle: Math.round(cv.adjustedVolume * 0.2)
		}
	}));

	// Calculate total volume if not provided
	const total =
		totalVolume ?? clientVolumesWithDest.reduce((sum, cv) => sum + cv.adjustedVolume, 0);

	// Aggregate per-destination volumes
	const perDestination = {
		zmail: clientVolumesWithDest.reduce((sum, cv) => sum + cv.perDestination.zmail, 0),
		intake: clientVolumesWithDest.reduce((sum, cv) => sum + cv.perDestination.intake, 0),
		yagle: clientVolumesWithDest.reduce((sum, cv) => sum + cv.perDestination.yagle, 0)
	};

	return {
		activeClients,
		clientVolumes: clientVolumesWithDest,
		totalVolume: total,
		perDestination
	};
}
