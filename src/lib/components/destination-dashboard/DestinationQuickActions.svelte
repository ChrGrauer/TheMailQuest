<script lang="ts">
	/**
	 * DestinationQuickActions Component
	 * US-2.5: Destination Kingdom Dashboard
	 * US-3.2: Decision Lock-In (read-only state)
	 *
	 * Displays:
	 * - Quick action buttons for destination-specific features
	 * - Coordination Panel (primary action)
	 * - Different from ESP quick actions (no client marketplace)
	 *
	 * Buttons remain enabled when locked in (to view decisions)
	 * Modals show in read-only mode
	 */

	interface Props {
		collaborationsCount?: number;
		onCoordinationClick?: () => void;
		onTechShopClick?: () => void; // US-2.6.2
		onFilteringClick?: () => void; // US-2.6.1
	}

	let { collaborationsCount = 0, onCoordinationClick, onTechShopClick, onFilteringClick }: Props = $props();
</script>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
	<!-- Coordination Panel Button -->
	<button
		onclick={onCoordinationClick}
		class="group flex items-center gap-4 p-4 bg-white border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
		data-testid="coordination-panel-button"
	>
		<!-- Icon -->
		<div
			class="w-14 h-14 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300 flex-shrink-0"
		>
			<span class="text-2xl">🤝</span>
		</div>

		<!-- Content -->
		<div class="flex-1 text-left">
			<div class="font-bold text-gray-800 text-base mb-1">Coordination Panel</div>
			<div class="text-xs text-gray-500">Inter-destination collaboration</div>
		</div>

		<!-- Badge -->
		{#if collaborationsCount > 0}
			<div class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
				{collaborationsCount} active
			</div>
		{:else}
			<div class="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
				No collaborations
			</div>
		{/if}
	</button>

	<!-- Tech Shop Button (US-2.6.2) -->
	<button
		onclick={onTechShopClick}
		class="group flex items-center gap-4 p-4 bg-white border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
		data-testid="tech-shop-button"
	>
		<!-- Icon -->
		<div
			class="w-14 h-14 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300 flex-shrink-0"
		>
			<span class="text-2xl">🛒</span>
		</div>

		<!-- Content -->
		<div class="flex-1 text-left">
			<div class="font-bold text-gray-800 text-base mb-1">Tech Shop</div>
			<div class="text-xs text-gray-500">Purchase anti-spam tools</div>
		</div>

		<!-- Arrow -->
		<div class="text-blue-600 text-xl group-hover:translate-x-1 transition-transform duration-300">
			→
		</div>
	</button>

	<!-- Filtering Controls Button (US-2.6.1) -->
	<button
		onclick={onFilteringClick}
		class="group flex items-center gap-4 p-4 bg-white border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
		data-testid="filtering-controls-button"
	>
		<!-- Icon -->
		<div
			class="w-14 h-14 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300 flex-shrink-0"
		>
			<span class="text-2xl">🛡️</span>
		</div>

		<!-- Content -->
		<div class="flex-1 text-left">
			<div class="font-bold text-gray-800 text-base mb-1">Filtering Controls</div>
			<div class="text-xs text-gray-500">Manage ESP filtering</div>
		</div>

		<!-- Arrow -->
		<div class="text-blue-600 text-xl group-hover:translate-x-1 transition-transform duration-300">
			→
		</div>
	</button>
</div>
