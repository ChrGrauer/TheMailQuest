<script lang="ts">
	/**
	 * TechnicalInfrastructure Component (Destination version)
	 * US-2.5: Destination Kingdom Dashboard
	 * US-2.6.2: Updated to use new DESTINATION_TOOLS catalog
	 *
	 * Displays:
	 * - Owned destination tools with Active status
	 * - Missing tech shown as Inactive
	 * - Checkmark icons for owned tech, cross for missing
	 * - Based on DESTINATION_TOOLS config (US-2.6.2)
	 */

	import {
		DESTINATION_TOOLS,
		type DestinationTool
	} from '$lib/config/destination-technical-upgrades';

	interface Props {
		ownedTools: string[]; // Array of owned tool IDs (US-2.6.2)
		kingdom?: 'Gmail' | 'Outlook' | 'Yahoo'; // For kingdom-specific pricing
	}

	let { ownedTools, kingdom = 'Gmail' }: Props = $props();

	// Group tools by category
	const toolsByCategory = $derived.by(() => {
		const grouped = new Map<string, DestinationTool[]>();

		Object.values(DESTINATION_TOOLS).forEach((tool) => {
			const category = tool.category || 'other';
			if (!grouped.has(category)) {
				grouped.set(category, []);
			}
			grouped.get(category)!.push(tool);
		});

		return grouped;
	});

	function isToolOwned(toolId: string): boolean {
		return ownedTools.includes(toolId);
	}

	function getToolCost(tool: DestinationTool): number | null {
		return tool.pricing[kingdom];
	}
</script>

<div class="bg-white rounded-xl shadow-md p-6" data-testid="technical-infrastructure">
	<h2 class="text-lg font-bold text-gray-800 mb-4">🔧 Technical Infrastructure</h2>

	<div class="space-y-6">
		{#each [...toolsByCategory.entries()] as [category, tools]}
			<div>
				<!-- Category Header -->
				<h3 class="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-3">
					{category}
				</h3>

				<!-- Tool Items -->
				<div class="space-y-2">
					{#each tools as tool}
						{@const owned = isToolOwned(tool.id)}
						{@const cost = getToolCost(tool)}

						<div
							data-testid="tech-item-{tool.id}"
							class="flex items-center gap-3 p-3 rounded-lg transition-all duration-200 {owned
								? 'bg-green-50 border border-green-200'
								: 'bg-gray-50 border border-gray-200'}"
						>
							<!-- Icon -->
							<div
								data-testid="tech-icon-{tool.id}"
								class="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 {owned
									? 'bg-green-500 text-white'
									: 'bg-gray-300 text-gray-600'}"
							>
								{#if owned}
									<span class="font-bold">✓</span>
								{:else}
									<span class="font-bold">✕</span>
								{/if}
							</div>

							<!-- Info -->
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1">
									<span class="font-semibold text-gray-800 text-sm truncate">
										{tool.name}
									</span>
									<span
										data-testid="tech-status-{tool.id}"
										class="px-2 py-0.5 rounded text-xs font-semibold {owned
											? 'bg-green-200 text-green-800'
											: 'bg-gray-200 text-gray-600'}"
									>
										{owned ? 'Active' : 'Inactive'}
									</span>
								</div>
								<div class="text-xs text-gray-500">
									{tool.description}
								</div>
							</div>

							<!-- Cost (if not owned) -->
							{#if !owned && cost !== null}
								<div class="text-right flex-shrink-0">
									<div class="text-sm font-bold text-gray-700">
										{cost}
									</div>
									<div class="text-xs text-gray-500">credits</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	{#if ownedTools.length === 0}
		<div class="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
			<div class="flex items-start gap-3">
				<span class="text-2xl">⚠️</span>
				<div>
					<div class="font-semibold text-amber-800 mb-1">No Tools Installed</div>
					<div class="text-sm text-amber-700">
						Visit the Tech Shop to purchase authentication validators, content filters, and other
						anti-spam tools.
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
