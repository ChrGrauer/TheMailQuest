<script lang="ts">
	/**
	 * Incident History
	 * Phase 1: MVP Foundation
	 *
	 * Collapsible panel showing triggered incident history
	 * - Starts collapsed
	 * - Displays incident name, category, round, timestamp
	 * - Sorted by most recent first
	 */

	import { slide } from 'svelte/transition';
	import type { IncidentHistoryEntry } from '$lib/types/incident';

	interface Props {
		history: IncidentHistoryEntry[];
	}

	let { history }: Props = $props();

	// Collapsible state
	let isExpanded = $state(false);

	function toggleExpanded() {
		isExpanded = !isExpanded;
	}

	// Get category badge color
	function getCategoryBadgeColor(category: string): string {
		switch (category) {
			case 'Regulatory':
				return 'bg-blue-500 text-white';
			case 'Security':
				return 'bg-red-500 text-white';
			case 'Market':
				return 'bg-green-500 text-white';
			case 'Industry':
				return 'bg-purple-500 text-white';
			case 'Technical':
				return 'bg-orange-500 text-white';
			default:
				return 'bg-gray-500 text-white';
		}
	}

	// Format timestamp
	function formatTime(timestamp: Date): string {
		return new Date(timestamp).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	// Sort history by most recent first
	let sortedHistory = $derived([...history].reverse());
</script>

<div class="bg-white rounded-lg shadow border border-gray-200" data-testid="drama-incident-history">
	<!-- Header (always visible) -->
	<button
		data-testid="drama-history-toggle"
		onclick={toggleExpanded}
		class="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
		aria-expanded={isExpanded}
		aria-label="Toggle incident history"
	>
		<div class="flex items-center gap-2">
			<span class="text-lg font-bold text-gray-900">Incident History</span>
			<span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-semibold">
				{history.length}
			</span>
		</div>
		<svg
			class="w-5 h-5 text-gray-600 transition-transform {isExpanded ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	<!-- Content (collapsible) -->
	{#if isExpanded}
		<div transition:slide={{ duration: 200 }} class="border-t border-gray-200">
			{#if sortedHistory.length === 0}
				<div class="px-4 py-6 text-center text-gray-500">
					<p class="text-sm">No incidents triggered yet</p>
				</div>
			{:else}
				<div class="divide-y divide-gray-100">
					{#each sortedHistory as entry, index}
						<div
							data-testid="drama-history-item-{entry.roundTriggered}-{sortedHistory.length -
								1 -
								index}"
							class="px-4 py-3 hover:bg-gray-50 transition-colors"
						>
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<div class="flex items-center gap-2 mb-1">
										<span
											class="px-2 py-0.5 rounded text-xs font-semibold {getCategoryBadgeColor(
												entry.category
											)}"
										>
											{entry.category}
										</span>
										<span class="text-xs font-semibold text-gray-600"
											>Round {entry.roundTriggered}</span
										>
									</div>
									<p class="font-semibold text-gray-900 text-sm">{entry.name}</p>
									<p class="text-xs text-gray-500 mt-1">
										Triggered: {formatTime(entry.timestamp)}
									</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
