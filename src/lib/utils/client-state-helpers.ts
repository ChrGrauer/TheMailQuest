/**
 * Client State Helper Utilities
 * Phase 2: Helpers for working with the new modifier system
 *
 * These utilities help UI components check for modifiers without
 * needing to know the internal structure of the modifier arrays.
 */

import type { ClientState, VolumeModifier, SpamTrapModifier } from '$lib/server/game/types';

/**
 * Check if a client has warmup active
 * Warmup is identified by source: 'warmup'
 */
export function hasWarmup(clientState: ClientState): boolean {
	return clientState.volumeModifiers.some((m) => m.source === 'warmup');
}

/**
 * Check if a client has list hygiene active
 * List hygiene creates both volume and spam trap modifiers with source: 'list_hygiene'
 */
export function hasListHygiene(clientState: ClientState): boolean {
	return clientState.volumeModifiers.some((m) => m.source === 'listHygiene');
}

/**
 * Get all active volume modifiers for display
 * Returns array of descriptions for UI display
 */
export function getActiveVolumeModifiers(clientState: ClientState): string[] {
	return clientState.volumeModifiers
		.filter((m) => m.description)
		.map((m) => m.description as string);
}

/**
 * Get all active spam trap modifiers for display
 * Returns array of descriptions for UI display
 */
export function getActiveSpamTrapModifiers(clientState: ClientState): string[] {
	return clientState.spamTrapModifiers
		.filter((m) => m.description)
		.map((m) => m.description as string);
}

/**
 * Check if a modifier source is active (warmup, listHygiene, incident cards)
 */
export function hasModifierSource(clientState: ClientState, source: string): boolean {
	return (
		clientState.volumeModifiers.some((m) => m.source === source) ||
		clientState.spamTrapModifiers.some((m) => m.source === source)
	);
}
