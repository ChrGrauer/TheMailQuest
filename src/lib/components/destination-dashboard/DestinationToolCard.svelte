<script lang="ts">
	/**
	 * DestinationToolCard Component
	 * US-2.6.2: Destination Tech Shop
	 *
	 * Displays a single destination tool with:
	 * - Name, description, cost, category
	 * - Status (Available, Locked, Owned, Unavailable)
	 * - Effects (spam detection, false positives)
	 * - Scope (applies to ALL ESPs)
	 * - Dependencies display
	 * - Purchase button with validation
	 */

	import { fly } from 'svelte/transition';
	import StatusBadge from '../shared/StatusBadge.svelte';

	interface Tool {
		id: string;
		name: string;
		description: string;
		category: string;
		scope: string;
		permanent: boolean;
		authentication_level?: number;
		requires?: string | string[];
		effects: {
			spam_detection_boost?: number;
			false_positive_impact?: number;
			trap_multiplier?: number;
		};
		cost: number | null;
		status: 'Owned' | 'Available' | 'Locked' | 'Unavailable';
		unavailable_reason?: string;
	}

	interface Props {
		tool: Tool;
		currentBudget: number;
		isLockedIn?: boolean;
		onPurchase: (toolId: string) => void;
		delay?: number;
	}

	let { tool, currentBudget, isLockedIn = false, onPurchase, delay = 0 }: Props = $props();

	// Determine if tool is affordable
	let canAfford = $derived(tool.cost !== null && currentBudget >= tool.cost);

	// Determine if purchase button should be disabled
	let isPurchaseDisabled = $derived(
		isLockedIn ||
			tool.status === 'Locked' ||
			tool.status === 'Owned' ||
			tool.status === 'Unavailable' ||
			!canAfford
	);

	// Get category color
	function getCategoryColor(category: string): string {
		switch (category) {
			case 'Authentication':
				return 'bg-blue-100 text-blue-700';
			case 'Content Analysis':
				return 'bg-purple-100 text-purple-700';
			case 'Intelligence':
				return 'bg-indigo-100 text-indigo-700';
			case 'Tactical':
				return 'bg-orange-100 text-orange-700';
			case 'Volume Control':
				return 'bg-green-100 text-green-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	// Get status for StatusBadge component (map to Active/Paused/Suspended)
	function getStatusBadgeStatus(status: string): 'Active' | 'Paused' | 'Suspended' {
		if (status === 'Owned') return 'Active';
		if (status === 'Unavailable') return 'Suspended';
		return 'Paused'; // For Available and Locked
	}

	// Get requirements display text
	function getRequirementsText(): string {
		if (!tool.requires) return '';

		const requirements = Array.isArray(tool.requires) ? tool.requires : [tool.requires];
		return requirements
			.map((reqId) => {
				if (reqId === 'auth_validator_l1') return 'SPF (Level 1)';
				if (reqId === 'auth_validator_l2') return 'DKIM (Level 2)';
				if (reqId === 'auth_validator_l3') return 'DMARC (Level 3)';
				return reqId;
			})
			.join(' and ');
	}

	// Format effects for display
	function getEffectsText(): string {
		const effects = [];
		if (tool.effects.spam_detection_boost) {
			effects.push(`+${tool.effects.spam_detection_boost}% spam detection`);
		}
		if (tool.effects.false_positive_impact) {
			effects.push(`${tool.effects.false_positive_impact}% false positives`);
		}
		if (tool.effects.trap_multiplier) {
			effects.push(`${tool.effects.trap_multiplier}x trap hit probability`);
		}
		return effects.join(', ');
	}
</script>

<div
	data-tool-id={tool.id}
	transition:fly={{ y: 20, duration: 300, delay }}
	class="bg-white rounded-xl border-2 {tool.status === 'Owned'
		? 'border-green-200 bg-green-50'
		: tool.status === 'Unavailable'
			? 'border-red-200 bg-red-50'
			: tool.status === 'Locked'
				? 'border-gray-200'
				: 'border-blue-200'} p-5 hover:shadow-lg transition-all"
>
	<!-- Header -->
	<div class="flex items-start justify-between mb-3">
		<div class="flex-1">
			<h3 data-testid="tool-name" class="font-bold text-gray-800 text-lg mb-1">
				{tool.name}
			</h3>
			<div class="flex flex-wrap gap-2">
				<span
					data-testid="tool-category"
					class="text-xs px-2 py-1 rounded {getCategoryColor(
						tool.category
					)} font-medium uppercase tracking-wide"
				>
					{tool.category}
				</span>
				<span
					data-testid="tool-scope"
					class="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 font-medium"
				>
					{tool.scope}
				</span>
			</div>
		</div>

		<!-- Status Badge -->
		<div data-testid="tool-status">
			<StatusBadge status={getStatusBadgeStatus(tool.status)} showIcon={true} />
		</div>
	</div>

	<!-- Unavailable Reason -->
	{#if tool.status === 'Unavailable' && tool.unavailable_reason}
		<div
			data-testid="unavailable-reason"
			class="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
		>
			<span class="font-bold">⚠</span>
			{tool.unavailable_reason}
		</div>
	{/if}

	<!-- Description -->
	<p data-testid="tool-description" class="text-sm text-gray-600 mb-3">
		{tool.description}
	</p>

	<!-- Effects -->
	{#if getEffectsText()}
		<div class="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm" data-testid="tool-effect">
			<span class="font-semibold text-blue-900">Effect:</span>
			<span class="text-blue-800">{getEffectsText()}</span>
		</div>
	{/if}

	<!-- Dependencies -->
	{#if tool.status === 'Locked' && tool.requires}
		<div class="mb-3 p-2 bg-gray-50 border border-gray-200 rounded text-sm" data-testid="requirement-message">
			<span class="text-gray-700">
				<span class="font-semibold">Requires:</span>
				{getRequirementsText()}
			</span>
		</div>
	{/if}

	<!-- Footer: Cost & Purchase Button -->
	<div class="flex items-center justify-between pt-3 border-t border-gray-200">
		<!-- Cost -->
		<div>
			{#if tool.status === 'Owned'}
				<span class="text-sm text-green-700 font-semibold">Owned</span>
			{:else if tool.status === 'Unavailable'}
				<span class="text-sm text-red-700 font-semibold">Unavailable</span>
			{:else if tool.cost !== null}
				<div data-testid="tool-cost" class="text-lg font-bold text-gray-800">
					{tool.cost}
					<span class="text-sm text-gray-500 font-normal">credits</span>
				</div>
			{/if}
		</div>

		<!-- Purchase Button -->
		{#if tool.status !== 'Owned' && tool.status !== 'Unavailable'}
			<button
				data-testid="purchase-button"
				onclick={() => onPurchase(tool.id)}
				disabled={isPurchaseDisabled}
				class="px-4 py-2 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 {isPurchaseDisabled
					? 'bg-gray-300 text-gray-500 cursor-not-allowed'
					: 'bg-blue-600 text-white hover:bg-blue-700'}"
				aria-label={tool.status === 'Locked'
					? `Locked: Requires ${getRequirementsText()}`
					: !canAfford
						? 'Insufficient budget'
						: `Purchase ${tool.name}`}
			>
				{#if tool.status === 'Locked'}
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
