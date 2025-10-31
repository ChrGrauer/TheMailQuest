<script lang="ts">
	/**
	 * UpgradeCard Component
	 * US-2.3: Technical Infrastructure Shop
	 *
	 * Displays a single technical upgrade with:
	 * - Name, description, cost, category
	 * - Status (Available, Locked, Owned)
	 * - Lock icon for locked upgrades
	 * - Checkmark for owned upgrades
	 * - Benefits list
	 * - Dependencies display
	 * - Purchase button with validation
	 */

	import { fly } from 'svelte/transition';

	interface Upgrade {
		id: string;
		name: string;
		description: string;
		cost: number;
		category: string;
		dependencies: string[];
		benefits: string[];
		mandatory?: boolean;
		mandatoryFrom?: number;
		status: 'Available' | 'Locked' | 'Owned';
	}

	interface Props {
		upgrade: Upgrade;
		credits: number;
		currentRound: number;
		onPurchase: (upgradeId: string) => void;
		delay?: number;
	}

	let { upgrade, credits, currentRound, onPurchase, delay = 0 }: Props = $props();

	// Determine if upgrade is affordable
	let canAfford = $derived(credits >= upgrade.cost);

	// Determine if purchase button should be disabled
	let isPurchaseDisabled = $derived(
		upgrade.status === 'Locked' || upgrade.status === 'Owned' || !canAfford
	);

	// Check if DMARC is mandatory soon (current round or next)
	let isMandatorySoon = $derived(
		upgrade.mandatory &&
			upgrade.mandatoryFrom &&
			currentRound >= upgrade.mandatoryFrom - 1 &&
			upgrade.status !== 'Owned'
	);

	// Get category color
	function getCategoryColor(category: string): string {
		switch (category) {
			case 'authentication':
				return 'bg-blue-100 text-blue-700';
			case 'security':
				return 'bg-purple-100 text-purple-700';
			case 'monitoring':
				return 'bg-green-100 text-green-700';
			case 'infrastructure':
				return 'bg-orange-100 text-orange-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	// Get status color
	function getStatusColor(status: string): string {
		switch (status) {
			case 'Owned':
				return 'text-green-700 font-semibold';
			case 'Available':
				return 'text-emerald-600 font-semibold';
			case 'Locked':
				return 'text-gray-500';
			default:
				return 'text-gray-600';
		}
	}
</script>

<div
	data-testid="upgrade-card-{upgrade.id}"
	transition:fly={{ y: 20, duration: 300, delay }}
	class="bg-white rounded-xl border-2 {upgrade.status === 'Owned'
		? 'border-green-200 bg-green-50'
		: upgrade.status === 'Locked'
			? 'border-gray-200'
			: 'border-emerald-200'} p-5 hover:shadow-lg transition-all"
>
	<!-- Header -->
	<div class="flex items-start justify-between mb-3">
		<div class="flex items-center gap-3 flex-1">
			<!-- Status Icon -->
			{#if upgrade.status === 'Owned'}
				<div
					data-testid="owned-checkmark"
					class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white flex-shrink-0"
				>
					✓
				</div>
			{:else if upgrade.status === 'Locked'}
				<div
					data-testid="lock-icon"
					class="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white flex-shrink-0"
				>
					🔒
				</div>
			{:else}
				<div
					class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0"
				>
					⚙️
				</div>
			{/if}

			<div class="flex-1">
				<h3 data-testid="upgrade-name" class="font-bold text-gray-800 text-lg">
					{upgrade.name}
				</h3>
				<span
					data-testid="upgrade-category"
					class="text-xs px-2 py-1 rounded {getCategoryColor(upgrade.category)} font-medium uppercase tracking-wide"
				>
					{upgrade.category}
				</span>
			</div>
		</div>

		<!-- Status Badge -->
		<div data-testid="upgrade-status" class="text-sm {getStatusColor(upgrade.status)}">
			{upgrade.status}
		</div>
	</div>

	<!-- Mandatory Warning -->
	{#if isMandatorySoon}
		<div
			data-testid="mandatory-warning"
			class="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
		>
			<span class="font-bold">⚠ MANDATORY from Round {upgrade.mandatoryFrom}!</span>
		</div>
	{/if}

	<!-- Description -->
	<p data-testid="upgrade-description" class="text-sm text-gray-600 mb-3">
		{upgrade.description}
	</p>

	<!-- Dependencies -->
	{#if upgrade.dependencies && upgrade.dependencies.length > 0}
		<div class="mb-3 text-sm">
			<span class="text-gray-500">Requires:</span>
			<span class="text-gray-700 font-medium">
				{#each upgrade.dependencies as dep, i}
					{#if i > 0}, {/if}
					{dep === 'spf'
						? 'SPF Authentication'
						: dep === 'dkim'
							? 'DKIM Signature'
							: dep === 'dmarc'
								? 'DMARC Policy'
								: dep}
				{/each}
			</span>
		</div>
	{:else}
		<div class="mb-3 text-sm text-gray-500">No requirements</div>
	{/if}

	<!-- Benefits -->
	{#if upgrade.benefits && upgrade.benefits.length > 0}
		<div class="mb-4">
			<div class="text-xs text-gray-500 uppercase font-semibold mb-2">Benefits:</div>
			<ul class="space-y-1">
				{#each upgrade.benefits as benefit}
					<li class="text-sm text-gray-700 flex items-start gap-2">
						<span class="text-emerald-600 flex-shrink-0">✓</span>
						<span>{benefit}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Footer: Cost & Purchase Button -->
	<div class="flex items-center justify-between pt-3 border-t border-gray-200">
		<!-- Cost -->
		<div>
			{#if upgrade.status === 'Owned'}
				<span class="text-sm text-green-700 font-semibold">Owned</span>
			{:else}
				<div data-testid="upgrade-cost" class="text-lg font-bold text-gray-800">
					{upgrade.cost}
					<span class="text-sm text-gray-500 font-normal">credits</span>
				</div>
			{/if}
		</div>

		<!-- Purchase Button -->
		{#if upgrade.status !== 'Owned'}
			<button
				data-testid="purchase-button"
				onclick={() => onPurchase(upgrade.id)}
				disabled={isPurchaseDisabled}
				class="px-4 py-2 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 {isPurchaseDisabled
					? 'bg-gray-300 text-gray-500 cursor-not-allowed'
					: 'bg-emerald-600 text-white hover:bg-emerald-700'}"
			>
				{#if upgrade.status === 'Locked'}
					Locked
				{:else if !canAfford}
					Insufficient Budget
				{:else}
					Purchase
				{/if}
			</button>
		{/if}
	</div>
</div>
