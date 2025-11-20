<script lang="ts">
	/**
	 * Incident Selection Modal
	 * Phase 1: MVP Foundation
	 *
	 * Modal for facilitators to select and trigger incident cards
	 * - Fetches available incidents for current round
	 * - Displays incident list with preview
	 * - Handles triggering via API call
	 */

	import { fade, scale } from 'svelte/transition';
	import type { IncidentCard } from '$lib/types/incident';

	interface Props {
		show: boolean;
		roomCode: string;
		currentRound: number;
		onClose: () => void;
		onTriggerSuccess: (incident: IncidentCard) => void;
	}

	let { show = $bindable(), roomCode, currentRound, onClose, onTriggerSuccess }: Props = $props();

	// State
	let incidents = $state<IncidentCard[]>([]);
	let selectedIncident = $state<IncidentCard | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let triggering = $state(false);

	// Fetch available incidents when modal opens
	$effect(() => {
		if (show) {
			// Reset state
			error = null;
			selectedIncident = null;
			fetchAvailableIncidents();
		}
	});

	async function fetchAvailableIncidents() {
		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/sessions/${roomCode}/incident/available`);
			const data = await response.json();

			if (data.success) {
				incidents = data.incidents;
			} else {
				error = data.error || 'Failed to load incidents';
			}
		} catch (err) {
			error = 'Network error: Could not load incidents';
			console.error('Error fetching incidents:', err);
		} finally {
			loading = false;
		}
	}

	async function triggerIncident() {
		if (!selectedIncident) return;

		triggering = true;
		error = null;

		try {
			const response = await fetch(`/api/sessions/${roomCode}/incident/trigger`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					incidentId: selectedIncident.id
				})
			});

			const data = await response.json();

			if (data.success) {
				// Notify parent of success
				onTriggerSuccess(selectedIncident);
				onClose();
			} else {
				error = data.error || 'Failed to trigger incident';
			}
		} catch (err) {
			error = 'Network error: Could not trigger incident';
			console.error('Error triggering incident:', err);
		} finally {
			triggering = false;
		}
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

	// Handle Escape key
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !triggering) {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/50 z-50"
		transition:fade={{ duration: 200 }}
		onclick={onClose}
		tabindex="-1"
		role="button"
		aria-label="Close modal"
	>
		<!-- Modal Content -->
		<div class="fixed inset-0 overflow-y-auto">
			<div class="flex min-h-full items-center justify-center p-4">
				<div
					class="bg-white rounded-xl shadow-xl max-w-4xl w-full"
					transition:scale={{ duration: 200 }}
					onclick={(e) => e.stopPropagation()}
					role="dialog"
					aria-modal="true"
					aria-labelledby="modal-title"
					data-testid="drama-selection-modal"
				>
					<!-- Header -->
					<div class="px-6 py-4 border-b border-gray-200">
						<h2 id="modal-title" class="text-2xl font-bold text-gray-900">
							Trigger Incident - Round {currentRound}
						</h2>
						<p class="text-sm text-gray-600 mt-1">Select an incident card to trigger</p>
					</div>

					<!-- Body -->
					<div class="p-6">
						{#if loading}
							<div class="text-center py-8">
								<div
									class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"
								></div>
								<p class="text-gray-600 mt-2">Loading incidents...</p>
							</div>
						{:else if error}
							<div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
								<p class="text-red-800 font-semibold">Error</p>
								<p class="text-red-600 text-sm mt-1">{error}</p>
								<button
									onclick={fetchAvailableIncidents}
									class="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
								>
									Retry
								</button>
							</div>
						{:else if incidents.length === 0}
							<div class="text-center py-8 text-gray-600">
								<p class="font-semibold">No incidents available</p>
								<p class="text-sm mt-1">No incident cards are available for Round {currentRound}</p>
							</div>
						{:else}
							<!-- Incident List -->
							<div class="grid grid-cols-1 gap-4 mb-4">
								{#each incidents as incident}
									<button
										data-testid="drama-incident-{incident.id}"
										onclick={() => (selectedIncident = incident)}
										class="text-left p-4 rounded-lg border-2 transition-all {selectedIncident?.id ===
										incident.id
											? 'border-emerald-500 bg-emerald-50'
											: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}"
									>
										<div class="flex items-start justify-between">
											<div class="flex-1">
												<div class="flex items-center gap-2 mb-2">
													<span
														class="px-2 py-1 rounded text-xs font-semibold {getCategoryBadgeColor(
															incident.category
														)}"
													>
														{incident.category}
													</span>
													<span class="text-xs text-gray-500 font-medium">{incident.rarity}</span>
												</div>
												<h3 class="font-bold text-gray-900">{incident.name}</h3>
												<p class="text-sm text-gray-600 mt-1 line-clamp-2">
													{incident.description}
												</p>
											</div>
											{#if selectedIncident?.id === incident.id}
												<svg
													class="w-6 h-6 text-emerald-600 flex-shrink-0 ml-2"
													fill="currentColor"
													viewBox="0 0 20 20"
												>
													<path
														fill-rule="evenodd"
														d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
														clip-rule="evenodd"
													/>
												</svg>
											{/if}
										</div>
									</button>
								{/each}
							</div>

							<!-- Preview Area -->
							{#if selectedIncident}
								<div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
									<p class="text-sm font-semibold text-gray-700 mb-2">Preview:</p>
									<p class="text-sm text-gray-600" data-testid="drama-preview-description">
										{selectedIncident.description}
									</p>
									<div class="mt-2 pt-2 border-t border-gray-200">
										<p class="text-xs text-gray-500">
											<span class="font-semibold">Educational Note:</span>
											{selectedIncident.educationalNote}
										</p>
									</div>
								</div>
							{/if}
						{/if}
					</div>

					<!-- Footer -->
					<div
						class="px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-200 flex justify-end gap-3"
					>
						<button
							onclick={onClose}
							disabled={triggering}
							class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Cancel
						</button>
						<button
							data-testid="drama-trigger-button"
							onclick={triggerIncident}
							disabled={!selectedIncident || triggering}
							class="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
						>
							{#if triggering}
								<span class="flex items-center gap-2">
									<div
										class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"
									></div>
									Triggering...
								</span>
							{:else}
								Trigger Incident
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
