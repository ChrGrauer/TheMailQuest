<script lang="ts">
	/**
	 * TechnicalInfrastructure Component
	 * US-2.1: ESP Team Dashboard
	 *
	 * Displays:
	 * - Owned technical upgrades (active status, checkmarks)
	 * - Missing technical upgrades (not installed, cross icons)
	 * - Mandatory tech warnings (e.g., DMARC from Round 3)
	 */

	import { TECHNICAL_UPGRADES, type TechnicalUpgrade } from '$lib/config/technical-upgrades';

	interface TechStatus extends TechnicalUpgrade {
		status: 'Active' | 'Missing';
	}

	interface Props {
		ownedTech?: string[];
		currentRound?: number;
		onTechShopClick?: () => void;
	}

	let { ownedTech = [], currentRound = 1, onTechShopClick }: Props = $props();

	// Determine tech status based on owned tech
	let techStatus = $derived<TechStatus[]>(
		TECHNICAL_UPGRADES.map((tech) => ({
			...tech,
			status:
				ownedTech.includes(tech.name) || ownedTech.includes(tech.id)
					? ('Active' as const)
					: ('Missing' as const)
		}))
	);

	// Check if there are missing upgrades
	let hasMissingTech = $derived(techStatus.some((tech) => tech.status === 'Missing'));
</script>

<div data-testid="technical-infrastructure" class="bg-white rounded-xl shadow-md p-6">
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-lg font-bold text-gray-800">Technical Infrastructure</h2>
		<!-- Tech Shop Button (merged with status tag) -->
		<button
			data-testid="tech-infrastructure-action"
			onclick={onTechShopClick}
			class="px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 {hasMissingTech
				? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
				: 'bg-gray-100 text-gray-500 hover:bg-gray-200'}"
		>
			<span>{hasMissingTech ? 'Upgrades Available' : 'No Upgrades Available'}</span>
			<span>{hasMissingTech ? '→' : '⚙️'}</span>
		</button>
	</div>

	<div class="space-y-3">
		{#each techStatus as tech}
			{@const isMandatorySoon =
				tech.mandatory && tech.mandatoryFrom && currentRound >= tech.mandatoryFrom - 1}

			<div
				data-testid="tech-item-{tech.id}"
				data-status={tech.status.toLowerCase()}
				class="flex items-center justify-between p-3 rounded-lg border {tech.status === 'Active'
					? 'border-green-200 bg-green-50'
					: 'border-gray-200 bg-gray-50'}"
			>
				<!-- Tech Name -->
				<div class="flex items-center gap-3 flex-1">
					{#if tech.status === 'Active'}
						<!-- Checkmark Icon -->
						<div
							data-testid="tech-icon-checkmark"
							class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
						>
							✓
						</div>
					{:else}
						<!-- Cross Icon -->
						<div
							data-testid="tech-icon-cross"
							class="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
						>
							✕
						</div>
					{/if}
					<div class="flex-1">
						<span
							class="font-medium {tech.status === 'Active' ? 'text-gray-800' : 'text-gray-500'}"
						>
							{tech.name}
						</span>
						{#if tech.category}
							<span class="ml-2 text-xs text-gray-400 uppercase">
								{tech.category}
							</span>
						{/if}
					</div>
				</div>

				<!-- Status -->
				<div class="flex items-center gap-2">
					{#if tech.status === 'Active'}
						<span class="text-sm text-green-700 font-semibold">Active</span>
					{:else}
						<span class="text-sm text-gray-500">Not Installed</span>
					{/if}
				</div>
			</div>

			<!-- Mandatory Warning -->
			{#if tech.status === 'Missing' && tech.mandatory && isMandatorySoon}
				<div
					data-testid="tech-mandatory-warning"
					class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 ml-9"
				>
					<span class="font-bold">⚠ MANDATORY from Round {tech.mandatoryFrom}</span>
					- Install before Round {tech.mandatoryFrom} to avoid penalties!
				</div>
			{/if}
		{/each}
	</div>
</div>
