<script lang="ts">
	/**
	 * Incident Choice Modal
	 * Phase 5: Player-facing incident choices
	 *
	 * Modal for displaying incident choices to players
	 * - Cannot be dismissed without confirming a choice
	 * - Default option is pre-selected
	 * - Effects apply immediately at confirmation
	 */

	import { fade, fly } from 'svelte/transition';
	import type { IncidentChoiceOption } from '$lib/types/incident';

	interface Props {
		show: boolean;
		incidentId: string;
		incidentName: string;
		description: string;
		educationalNote: string;
		category: string;
		options: IncidentChoiceOption[];
		roomCode: string;
		teamName: string;
		onConfirmed?: (choiceId: string, appliedEffects: Array<{ type: string; value?: number }>) => void;
	}

	let {
		show = $bindable(),
		incidentId,
		incidentName,
		description,
		educationalNote,
		category,
		options,
		roomCode,
		teamName,
		onConfirmed
	}: Props = $props();

	// State
	let selectedChoiceId = $state<string>('');
	let isConfirming = $state(false);
	let confirmed = $state(false);
	let error = $state<string | null>(null);

	// Initialize default selection when options change
	$effect(() => {
		if (options && options.length > 0) {
			const defaultOption = options.find((o) => o.isDefault) || options[0];
			selectedChoiceId = defaultOption.id;
		}
	});

	// Get category color for styling
	function getCategoryColor(cat: string): string {
		switch (cat) {
			case 'Regulatory':
				return 'border-blue-500 bg-blue-50';
			case 'Security':
				return 'border-red-500 bg-red-50';
			case 'Market':
				return 'border-green-500 bg-green-50';
			case 'Industry':
				return 'border-purple-500 bg-purple-50';
			case 'Technical':
				return 'border-orange-500 bg-orange-50';
			default:
				return 'border-gray-500 bg-gray-50';
		}
	}

	function getCategoryBadgeColor(cat: string): string {
		switch (cat) {
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

	// Get effect preview text
	function getEffectPreview(effects: Array<{ target: string; type: string; value?: number }>): string[] {
		return effects.map((effect) => {
			const value = effect.value ?? 0;
			const sign = value >= 0 ? '+' : '';
			switch (effect.type) {
				case 'credits':
					return `${sign}${value} credits`;
				case 'reputation':
					return `${sign}${value} reputation (all destinations)`;
				case 'reputation_set':
					return `Reputation set to ${value}`;
				case 'auto_lock':
					return 'Planning phase locked';
				default:
					return effect.type;
			}
		});
	}

	// Confirm choice - calls API and applies effects immediately
	async function confirmChoice() {
		if (!selectedChoiceId || isConfirming || confirmed) return;

		isConfirming = true;
		error = null;

		try {
			const response = await fetch(`/api/sessions/${roomCode}/incident/choice`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ choiceId: selectedChoiceId, teamName })
			});

			const data = await response.json();

			if (!response.ok || !data.success) {
				throw new Error(data.error || 'Failed to confirm choice');
			}

			// Mark as confirmed and notify parent
			confirmed = true;
			if (onConfirmed) {
				onConfirmed(selectedChoiceId, data.appliedEffects || []);
			}

			// Close modal after brief delay to show confirmation
			setTimeout(() => {
				show = false;
			}, 500);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to confirm choice';
		} finally {
			isConfirming = false;
		}
	}
</script>

{#if show}
	<!-- Backdrop - cannot be clicked to close -->
	<div
		class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
		transition:fade={{ duration: 200 }}
		data-testid="incident-choice-modal"
		role="dialog"
		aria-modal="true"
		aria-labelledby="incident-choice-title"
	>
		<!-- Card Content -->
		<div
			class="bg-white rounded-xl shadow-2xl max-w-2xl w-full border-4 {getCategoryColor(category)}"
			transition:fly={{ y: -100, duration: 300 }}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			tabindex="-1"
		>
			<!-- Header -->
			<div class="p-6 border-b border-gray-200">
				<div class="flex items-center justify-between mb-2">
					<span
						class="px-3 py-1 rounded-full text-sm font-semibold {getCategoryBadgeColor(category)}"
					>
						{category}
					</span>
					<span class="text-sm text-amber-600 font-semibold">Choice Required</span>
				</div>

				<h2
					id="incident-choice-title"
					class="text-3xl font-bold text-gray-900 mt-2"
					data-testid="incident-choice-title"
				>
					{incidentName}
				</h2>
			</div>

			<!-- Body -->
			<div class="p-6 space-y-4">
				<!-- Description -->
				<p class="text-lg text-gray-800 leading-relaxed" data-testid="incident-choice-description">
					{description}
				</p>

				<!-- Educational Note -->
				<div class="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded">
					<p class="text-sm font-semibold text-emerald-900 mb-1">Learning Moment:</p>
					<p class="text-sm text-emerald-800" data-testid="incident-choice-educational">
						{educationalNote}
					</p>
				</div>

				<!-- Choice Options -->
				<div class="space-y-3 mt-6">
					<p class="font-semibold text-gray-700">Choose your response:</p>

					{#each options as option (option.id)}
						{@const isSelected = selectedChoiceId === option.id}
						{@const isDefault = option.isDefault}
						<button
							type="button"
							class="w-full p-4 rounded-lg border-2 text-left transition-all {isSelected
								? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500 ring-offset-1'
								: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}"
							onclick={() => (selectedChoiceId = option.id)}
							disabled={confirmed}
							data-testid="incident-choice-option-{option.id}"
							data-selected={isSelected}
						>
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<span class="font-semibold text-gray-900">{option.label}</span>
										{#if isDefault}
											<span
												class="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full font-medium"
												data-testid="incident-choice-option-default"
											>
												Default
											</span>
										{/if}
									</div>
									{#if option.description}
										<p class="text-sm text-gray-600 mt-1">{option.description}</p>
									{/if}
									<!-- Effect Preview -->
									{#if option.effects.length > 0}
										<div class="mt-2 flex flex-wrap gap-2" data-testid="incident-choice-effect-preview">
											{#each getEffectPreview(option.effects) as effect}
												<span
													class="text-xs px-2 py-1 rounded-full {effect.startsWith('+')
														? 'bg-green-100 text-green-800'
														: effect.startsWith('-')
															? 'bg-red-100 text-red-800'
															: 'bg-gray-100 text-gray-800'}"
												>
													{effect}
												</span>
											{/each}
										</div>
									{/if}
								</div>

								<!-- Selection indicator -->
								<div
									class="w-6 h-6 rounded-full border-2 flex items-center justify-center ml-4 {isSelected
										? 'border-emerald-500 bg-emerald-500'
										: 'border-gray-300'}"
									data-testid={isSelected ? 'incident-choice-option-selected' : undefined}
								>
									{#if isSelected}
										<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clip-rule="evenodd"
											/>
										</svg>
									{/if}
								</div>
							</div>
						</button>
					{/each}
				</div>

				<!-- Error Display -->
				{#if error}
					<div class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
						{error}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-200">
				<div class="flex items-center justify-between">
					{#if confirmed}
						<p class="text-sm text-emerald-600 font-semibold" data-testid="incident-choice-confirmed-badge">
							Choice confirmed! Effects applied.
						</p>
					{:else}
						<p class="text-sm text-amber-600">
							You must confirm a choice to continue.
						</p>
					{/if}

					<button
						type="button"
						onclick={confirmChoice}
						disabled={isConfirming || confirmed || !selectedChoiceId}
						class="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
						data-testid="incident-choice-confirm-button"
					>
						{#if isConfirming}
							Confirming...
						{:else if confirmed}
							Confirmed
						{:else}
							Confirm Choice
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
