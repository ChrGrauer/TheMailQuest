<script lang="ts">
	/**
	 * Incident Card Display
	 * Phase 1: MVP Foundation
	 * Phase 2: Fly animation and affected team display
	 *
	 * Full-screen modal that displays incident cards to all players
	 * - Auto-dismisses after 10 seconds
	 * - Phase 2: Fly-in animation from top, shows affected team
	 * - Can be dismissed early with Escape key or backdrop click
	 */

	import { fade, fly } from 'svelte/transition';
	import type { IncidentCard } from '$lib/types/incident';

	interface Props {
		show: boolean;
		incident: IncidentCard | null;
		affectedTeam?: string | null; // Phase 2: Show which team is affected
		onClose: () => void;
	}

	let { show = $bindable(), incident, affectedTeam, onClose }: Props = $props();

	// Handle show/hide
	$effect(() => {
		if (show && incident) {
			// Handle Escape key
			const handleEscape = (e: KeyboardEvent) => {
				if (e.key === 'Escape') {
					onClose();
				}
			};
			window.addEventListener('keydown', handleEscape);

			return () => {
				window.removeEventListener('keydown', handleEscape);
			};
		}
	});

	// Get category color for border/badge
	function getCategoryColor(category: string): string {
		switch (category) {
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
</script>

{#if show && incident}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
		transition:fade={{ duration: 200 }}
		onclick={onClose}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		tabindex="-1"
		role="button"
		aria-label="Close incident card"
		data-testid="drama-card-display"
	>
		<!-- Card Content -->
		<div
			class="bg-white rounded-xl shadow-2xl max-w-2xl w-full border-4 {getCategoryColor(
				incident.category
			)}"
			transition:fly={{ y: -100, duration: 300 }}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			tabindex="-1"
			role="dialog"
			aria-modal="true"
			aria-labelledby="incident-title"
		>
			<!-- Header -->
			<div class="p-6 border-b border-gray-200">
				<div class="flex items-center justify-between mb-2">
					<!-- Category Badge -->
					<span
						class="px-3 py-1 rounded-full text-sm font-semibold {getCategoryBadgeColor(
							incident.category
						)}"
						data-testid="drama-card-category"
					>
						{incident.category}
					</span>

					<!-- Rarity Indicator -->
					<span class="text-sm text-gray-500 font-medium">
						{incident.rarity}
					</span>
				</div>

				<h2
					id="incident-title"
					class="text-3xl font-bold text-gray-900 mt-2"
					data-testid="drama-card-title"
				>
					{incident.name}
				</h2>
			</div>

			<!-- Phase 2: Affected Team Banner -->
			{#if affectedTeam}
				<div
					class="px-6 py-3 bg-yellow-50 border-b border-yellow-200"
					data-testid="drama-affected-team"
				>
					<p class="text-sm font-semibold text-yellow-900">
						Affects: <span class="text-yellow-700">{affectedTeam}</span>
					</p>
				</div>
			{/if}

			<!-- Body -->
			<div class="p-6 space-y-4">
				<!-- Description -->
				<div>
					<p class="text-lg text-gray-800 leading-relaxed" data-testid="drama-card-description">
						{incident.description}
					</p>
				</div>

				<!-- Educational Note -->
				<div class="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded">
					<p class="text-sm font-semibold text-emerald-900 mb-1">Learning Moment:</p>
					<p class="text-sm text-emerald-800" data-testid="drama-card-educational">
						{incident.educationalNote}
					</p>
				</div>

				<!-- Duration Info -->
				<div class="text-sm text-gray-600">
					<span class="font-semibold">Duration:</span>
					{incident.duration}
				</div>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 bg-gray-50 rounded-b-xl border-t border-gray-200">
				<div class="flex items-center justify-between">
					<p class="text-sm text-gray-500">Press Escape to close</p>
					<button
						onclick={onClose}
						class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
