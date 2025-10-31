<script lang="ts">
	/**
	 * Portfolio Client Card Component
	 * US-2.4: Client Basic Management
	 *
	 * Displays a single client in the portfolio with:
	 * - Client details (name, type, revenue, volume, risk)
	 * - Status badges and toggle buttons
	 * - Onboarding options for new clients (first_active_round = null)
	 * - Permanent attributes for existing clients
	 * - Locked state for suspended clients
	 */

	import type { Client, ClientState } from '$lib/server/game/types';
	import { WARMUP_COST, LIST_HYGIENE_COST } from '$lib/config/client-onboarding';
	import StatusBadge from '$lib/components/shared/StatusBadge.svelte';

	interface Props {
		client: Client & ClientState;
		currentRound: number;
		index: number;
		onStatusToggle: (clientId: string, newStatus: 'Active' | 'Paused') => Promise<void>;
		onOnboardingChange?: (clientId: string, warmup: boolean, listHygiene: boolean) => void;
	}

	let {
		client,
		currentRound,
		index,
		onStatusToggle,
		onOnboardingChange
	}: Props = $props();

	// Local state for onboarding checkboxes
	let warmupSelected = $state(client.has_warmup);
	let listHygieneSelected = $state(client.has_list_hygiene);

	// Determine if client is "new" (not yet activated)
	let isNewClient = $derived(client.first_active_round === null);

	// Is client suspended?
	let isSuspended = $derived(client.status === 'Suspended');

	// Get risk color
	function getRiskColor(risk: string): string {
		switch (risk) {
			case 'Low':
				return 'text-green-600 bg-green-50';
			case 'Medium':
				return 'text-yellow-600 bg-yellow-50';
			case 'High':
				return 'text-red-600 bg-red-50';
			default:
				return 'text-gray-600 bg-gray-50';
		}
	}

	// Get card border and background styles based on status
	function getCardStyles(status: string): string {
		switch (status) {
			case 'Active':
				return 'border-l-emerald-500 bg-gradient-to-r from-emerald-50/30 to-white';
			case 'Paused':
				return 'border-l-orange-500 bg-gray-50/50 opacity-80';
			case 'Suspended':
				return 'border-l-gray-400 bg-gray-100/50 opacity-70';
			default:
				return 'border-l-gray-300';
		}
	}

	// Handle status toggle
	async function handleToggle(newStatus: 'Active' | 'Paused') {
		if (isSuspended) return;
		await onStatusToggle(client.id, newStatus);
	}

	// Handle onboarding checkbox change
	function handleOnboardingChange() {
		if (onOnboardingChange) {
			onOnboardingChange(client.id, warmupSelected, listHygieneSelected);
		}
	}

	// Show warning for high-risk client without protections
	let showRiskWarning = $derived(
		isNewClient && client.risk === 'High' && !warmupSelected && !listHygieneSelected
	);
</script>

<div
	data-testid="client-card-{index}"
	data-status={client.status.toLowerCase()}
	class="border-l-4 rounded-lg p-4 transition-all {getCardStyles(client.status)}"
>
	<!-- Header: Name, Status, Toggle Buttons -->
	<div class="flex items-start justify-between mb-3">
		<div class="flex-1">
			<div class="flex items-center gap-3 mb-2">
				<h3 class="font-semibold text-gray-800">{client.name}</h3>
				<StatusBadge status={client.status} testId="client-status-badge-{index}" />
			</div>

			<!-- Client Details -->
			<div class="flex items-center gap-4 text-sm text-gray-600">
				<div class="flex items-center gap-1">
					<span class="font-medium">Type:</span>
					<span>{client.type.replace(/_/g, ' ')}</span>
				</div>
				<div class="flex items-center gap-1">
					<span class="font-medium">Revenue:</span>
					<span>{client.revenue} credits/round</span>
				</div>
				<div class="flex items-center gap-1">
					<span class="font-medium">Volume:</span>
					<span>{client.volume.toLocaleString()} emails/round</span>
				</div>
				<div class="flex items-center gap-1">
					<span class="font-medium">Risk:</span>
					<span class="px-2 py-0.5 rounded text-xs {getRiskColor(client.risk)}">
						{client.risk}
					</span>
				</div>
			</div>
		</div>

		<!-- Toggle Buttons (or Locked Indicator) -->
		<div class="flex gap-2 ml-4">
			{#if isSuspended}
				<div
					data-testid="locked-indicator"
					class="flex items-center gap-2 text-gray-500 text-sm"
				>
					<span class="text-lg">🔒</span>
					<span>Locked</span>
				</div>
			{:else}
				<button
					data-testid="toggle-active-btn"
					onclick={() => handleToggle('Active')}
					disabled={client.status === 'Active'}
					class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
						{client.status === 'Active'
							? 'bg-emerald-500 text-white'
							: 'bg-white text-gray-600 border-2 border-gray-300 hover:border-emerald-500'}"
				>
					✓ Active
				</button>
				<button
					data-testid="toggle-paused-btn"
					onclick={() => handleToggle('Paused')}
					disabled={client.status === 'Paused'}
					class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
						{client.status === 'Paused'
							? 'bg-orange-500 text-white'
							: 'bg-white text-gray-600 border-2 border-gray-300 hover:border-orange-500'}"
				>
					⏸ Pause
				</button>
			{/if}
		</div>
	</div>

	<!-- Suspended Message -->
	{#if isSuspended}
		<div
			data-testid="suspension-message"
			class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
		>
			<strong>Client suspended due to severe reputation damage.</strong> This client cannot be activated until reputation is restored.
		</div>
	{/if}

	<!-- Onboarding Section (New Clients Only) -->
	{#if isNewClient && !isSuspended}
		<div data-testid="onboarding-section" class="mt-4 pt-4 border-t border-gray-200">
			<div class="text-sm font-semibold text-gray-700 mb-3">First-Round Options (one-time)</div>

			<div class="grid grid-cols-2 gap-3">
				<!-- Warm-up Option -->
				<label
					class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
				>
					<input
						data-testid="onboarding-warmup-checkbox"
						type="checkbox"
						bind:checked={warmupSelected}
						onchange={handleOnboardingChange}
						class="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
					/>
					<span class="flex-1 text-sm text-gray-700">Activate Warm-up</span>
					<span class="text-xs font-bold text-emerald-700">{WARMUP_COST} cr</span>
				</label>

				<!-- List Hygiene Option -->
				<label
					class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
				>
					<input
						data-testid="onboarding-list-hygiene-checkbox"
						type="checkbox"
						bind:checked={listHygieneSelected}
						onchange={handleOnboardingChange}
						class="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
					/>
					<span class="flex-1 text-sm text-gray-700">Activate List Hygiene</span>
					<span class="text-xs font-bold text-emerald-700">{LIST_HYGIENE_COST} cr</span>
				</label>
			</div>

			<!-- Risk Warning -->
			{#if showRiskWarning}
				<div
					data-testid="risk-warning"
					class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800"
				>
					⚠️ <strong>High-risk client without protections.</strong> Consider activating warm-up or list hygiene to reduce reputation risk.
				</div>
			{/if}
		</div>
	{/if}

	<!-- Permanent Attributes (Existing Clients) -->
	{#if !isNewClient && !isSuspended}
		<div data-testid="permanent-attributes" class="mt-4 pt-4 border-t border-gray-200">
			<div class="text-sm font-semibold text-gray-700 mb-2">Onboarding History</div>
			<div class="flex gap-6 text-sm">
				<div class="flex items-center gap-2">
					<span class="text-gray-600">Has Warm-up History:</span>
					<span class="font-semibold {client.has_warmup ? 'text-green-600' : 'text-gray-500'}">
						{client.has_warmup ? 'Yes' : 'No'}
					</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-gray-600">Has List Hygiene:</span>
					<span class="font-semibold {client.has_list_hygiene ? 'text-green-600' : 'text-gray-500'}">
						{client.has_list_hygiene ? 'Yes' : 'No'}
					</span>
				</div>
			</div>
		</div>
	{/if}
</div>
