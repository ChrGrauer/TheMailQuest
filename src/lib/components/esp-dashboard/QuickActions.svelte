<script lang="ts">
	/**
	 * QuickActions Component
	 * US-2.1: ESP Team Dashboard
	 *
	 * Displays quick action buttons for:
	 * - Client Marketplace
	 * - Technical Shop
	 * - Client Management
	 */

	interface Props {
		activeClientsCount?: number;
		missingMandatoryTech?: boolean;
		availableClientsCount?: number;
		onMarketplaceClick?: () => void;
		onTechShopClick?: () => void;
		onClientManagementClick?: () => void;
	}

	let {
		activeClientsCount = 0,
		missingMandatoryTech = false,
		availableClientsCount = 0,
		onMarketplaceClick,
		onTechShopClick,
		onClientManagementClick
	}: Props = $props();
</script>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
	<!-- Client Marketplace -->
	<button
		data-testid="quick-action-client-marketplace"
		onclick={onMarketplaceClick}
		class="bg-white hover:bg-gray-50 border-2 border-emerald-200 rounded-xl p-6 transition-all hover:shadow-lg hover:-translate-y-1 text-left group focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
	>
		<div class="flex items-start justify-between mb-3">
			<div
				data-testid="button-icon"
				class="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"
			>
				🛒
			</div>
			{#if availableClientsCount > 0}
				<span class="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">
					{availableClientsCount} available
				</span>
			{/if}
		</div>
		<h3 class="font-bold text-gray-800 text-lg mb-1">Client Marketplace</h3>
		<p class="text-sm text-gray-600">Browse and acquire new email clients</p>
	</button>

	<!-- Technical Shop -->
	<button
		data-testid="quick-action-tech-shop"
		onclick={onTechShopClick}
		class="bg-white hover:bg-gray-50 border-2 border-blue-200 rounded-xl p-6 transition-all hover:shadow-lg hover:-translate-y-1 text-left group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
	>
		<div class="flex items-start justify-between mb-3">
			<div
				data-testid="button-icon"
				class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"
			>
				⚙️
			</div>
			{#if missingMandatoryTech}
				<span class="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
					DMARC needed!
				</span>
			{/if}
		</div>
		<h3 class="font-bold text-gray-800 text-lg mb-1">Technical Shop</h3>
		<p class="text-sm text-gray-600">Upgrade your email infrastructure</p>
	</button>

	<!-- Client Management -->
	<button
		data-testid="quick-action-client-mgmt"
		onclick={onClientManagementClick}
		class="bg-white hover:bg-gray-50 border-2 border-purple-200 rounded-xl p-6 transition-all hover:shadow-lg hover:-translate-y-1 text-left group focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
	>
		<div class="flex items-start justify-between mb-3">
			<div
				data-testid="button-icon"
				class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"
			>
				📋
			</div>
			{#if activeClientsCount > 0}
				<span class="bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">
					{activeClientsCount} active
				</span>
			{/if}
		</div>
		<h3 class="font-bold text-gray-800 text-lg mb-1">Client Management</h3>
		<p class="text-sm text-gray-600">Manage your active client relationships</p>
	</button>
</div>
