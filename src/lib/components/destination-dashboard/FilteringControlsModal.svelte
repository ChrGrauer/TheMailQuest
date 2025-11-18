<script lang="ts">
	/**
	 * FilteringControlsModal Component
	 * US-2.6.1: Destination Filtering Controls
	 *
	 * Modal for managing ESP filtering policies at a destination
	 */

	import { fade, scale } from 'svelte/transition';
	import FilteringSliderItem from '$lib/components/shared/FilteringSliderItem.svelte';
	import type { FilteringLevel, FilteringPolicy } from '$lib/server/game/types';

	interface ESPData {
		espName: string;
		volume: number;
		reputation: number;
		satisfaction: number;
		spamRate: number;
	}

	interface Props {
		show: boolean;
		isLockedIn?: boolean;
		roomCode: string;
		destName: string;
		espTeams: ESPData[];
		filteringPolicies: Record<string, FilteringPolicy>;
		dashboardError?: string | null;
		onRetry?: () => void;
	}

	let {
		show = $bindable(),
		isLockedIn = false,
		roomCode,
		destName,
		espTeams,
		filteringPolicies,
		dashboardError,
		onRetry
	}: Props = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let localPolicies = $state<Record<string, FilteringPolicy>>({});

	// Local copy of dashboardError for reactivity (Svelte 5 fix)
	let localDashboardError = $state<string | null | undefined>(dashboardError);

	// Watch for dashboardError prop changes
	$effect(() => {
		localDashboardError = dashboardError;
	});

	// Initialize local policies from props
	$effect(() => {
		if (show) {
			localPolicies = { ...filteringPolicies };
			error = null;
		}
	});

	// Expose test API for E2E testing
	if (typeof window !== 'undefined') {
		(window as any).__filteringControlsModalTest = {
			setDashboardError: (errorMsg: string | null) => {
				localDashboardError = errorMsg;
			},
			getDashboardError: () => localDashboardError
		};
	}

	async function handleFilterChange(espName: string, level: FilteringLevel) {
		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/sessions/${roomCode}/destination/${destName}/filtering`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ espName, level })
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to update filtering policy');
			}

			// Update local policies with response
			if (data.filtering_policies) {
				localPolicies = { ...data.filtering_policies };
			}
		} catch (err) {
			if (err instanceof Error) {
				error = err.message;
			} else {
				error = 'Failed to update filtering policy';
			}
			setTimeout(() => (error = null), 5000);
		} finally {
			loading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			show = false;
		}
	}

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			show = false;
		}
	}

	function handleClose() {
		show = false;
	}
</script>

{#if show}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
		transition:fade={{ duration: 200 }}
		onclick={handleOverlayClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="filtering-controls-title"
		data-testid="modal-backdrop"
		tabindex="-1"
	>
		<div
			class="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col"
			transition:scale={{ duration: 200, start: 0.95 }}
			data-testid="filtering-controls-modal"
		>
			<!-- Modal Header -->
			<div class="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
				<div class="flex items-center justify-between">
					<h2
						id="filtering-controls-title"
						class="text-2xl font-bold text-gray-900 flex items-center gap-2"
						data-testid="filtering-modal-title"
					>
						<span aria-hidden="true">🛡️</span>
						<span>Filtering Controls</span>
					</h2>
					<button
						type="button"
						class="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-lg p-2"
						onclick={handleClose}
						aria-label="Close filtering controls"
						data-testid="filtering-modal-close"
					>
						<span class="text-2xl" aria-hidden="true">✕</span>
					</button>
				</div>
			</div>

			<!-- View Only Banner (US-3.2) -->
			{#if isLockedIn}
				<div
					data-testid="view-only-banner"
					class="px-6 py-3 bg-orange-50 border-b border-orange-200 flex items-center gap-3"
					role="alert"
				>
					<span class="text-2xl" aria-hidden="true">🔒</span>
					<div class="flex-1">
						<p class="font-bold text-orange-900">Locked In - View Only</p>
						<p class="text-sm text-orange-700">
							Your decisions are locked. You cannot modify filtering policies until the next round.
						</p>
					</div>
				</div>
			{/if}

			<!-- Error Banner -->
			{#if error}
				<div
					class="mx-6 mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg"
					role="alert"
					aria-live="assertive"
					transition:scale={{ duration: 200 }}
				>
					<div class="flex items-center gap-2">
						<span class="text-red-600 font-semibold" aria-hidden="true">⚠️</span>
						<span class="text-red-800 font-semibold">Error</span>
					</div>
					<p class="text-red-700 mt-1">{error}</p>
				</div>
			{/if}

			<!-- Dashboard Error Banner (error loading ESP data) -->
			{#if localDashboardError}
				<div
					class="mx-6 mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg"
					role="alert"
					aria-live="assertive"
					data-testid="filtering-error-banner"
				>
					<div class="flex items-center justify-between">
						<div>
							<div class="flex items-center gap-2">
								<span class="text-red-600 font-semibold" aria-hidden="true">⚠️</span>
								<span class="text-red-800 font-semibold">Error Loading ESP Data</span>
							</div>
							<p class="text-red-700 mt-1">{localDashboardError}</p>
						</div>
						{#if onRetry}
							<button
								type="button"
								class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
								onclick={onRetry}
								data-testid="filtering-error-retry"
							>
								Retry
							</button>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Modal Body -->
			<div class="flex-1 overflow-y-auto px-6 py-6">
				{#if loading && Object.keys(localPolicies).length === 0}
					<div class="flex items-center justify-center py-12">
						<div class="text-center">
							<div
								class="inline-block w-12 h-12 border-4 border-gray-300 border-t-emerald-600 rounded-full animate-spin mb-4"
								aria-hidden="true"
							></div>
							<p class="text-gray-600">Loading filtering controls...</p>
						</div>
					</div>
				{:else if espTeams.length === 0}
					<div class="text-center py-12">
						<span class="text-6xl mb-4 block" aria-hidden="true">📭</span>
						<p class="text-gray-600 text-lg">No ESP teams found in this game</p>
					</div>
				{:else}
					<div class="filtering-grid space-y-6">
						{#each espTeams as esp (esp.espName)}
							{@const policy = localPolicies[esp.espName]}
							{#if policy}
								<FilteringSliderItem
									espName={esp.espName}
									volume={esp.volume}
									reputation={esp.reputation}
									satisfaction={esp.satisfaction}
									spamRate={esp.spamRate}
									currentPolicy={policy}
									{isLockedIn}
									onFilterChange={handleFilterChange}
								/>
							{/if}
						{/each}
					</div>
				{/if}
			</div>

			<!-- Loading Overlay -->
			{#if loading}
				<div
					class="absolute inset-0 bg-white/50 flex items-center justify-center"
					transition:fade={{ duration: 150 }}
				>
					<div class="bg-white rounded-lg shadow-lg p-6 flex items-center gap-4">
						<div
							class="w-8 h-8 border-4 border-gray-300 border-t-emerald-600 rounded-full animate-spin"
							aria-hidden="true"
						></div>
						<span class="text-gray-700 font-medium">Updating filtering policy...</span>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.filtering-grid {
		display: grid;
		gap: 1.5rem;
	}
</style>
