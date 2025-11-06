<script lang="ts">
	import { fade, scale, fly } from 'svelte/transition';
	import type { Client } from '$lib/server/game/types';
	import ClientCard from './ClientCard.svelte';
	import ClientFilters from './ClientFilters.svelte';

	interface Props {
		show: boolean;
		isLockedIn?: boolean;
		onClose: () => void;
		roomCode: string;
		teamName: string;
		currentCredits: number;
		currentRound: number;
		ownedTech: string[];
		overallReputation: number;
		onClientAcquired: (clientId: string, cost: number) => void;
	}

	let {
		show,
		isLockedIn = false,
		onClose,
		roomCode,
		teamName,
		currentCredits,
		currentRound,
		ownedTech,
		overallReputation,
		onClientAcquired
	}: Props = $props();

	let clients: Client[] = $state([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	// Filters
	let riskFilter = $state<'All' | 'Low' | 'Medium' | 'High'>('All');
	let minRevenue = $state(0);

	// Filtered clients
	let filteredClients = $derived.by(() => {
		return clients.filter((client) => {
			// Risk filter
			if (riskFilter !== 'All' && client.risk !== riskFilter) return false;

			// Revenue filter
			if (client.revenue < minRevenue) return false;

			return true;
		});
	});

	// Fetch clients when modal opens
	$effect(() => {
		if (show) {
			// Reset state and fetch fresh data each time modal opens
			clients = [];
			riskFilter = 'All';
			minRevenue = 0;
			successMessage = null;
			error = null;
			fetchClients();
		}
	});

	async function fetchClients() {
		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/sessions/${roomCode}/esp/${teamName}/clients`);
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to fetch clients');
			}

			clients = data.clients || [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load marketplace';
		} finally {
			loading = false;
		}
	}

	async function handleAcquire(clientId: string) {
		const client = clients.find((c) => c.id === clientId);
		if (!client) return;

		// Prevent multiple acquisitions
		if (loading) return;

		loading = true;
		error = null;
		successMessage = null;

		try {
			// Add timeout to prevent indefinite hanging
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

			const response = await fetch(`/api/sessions/${roomCode}/esp/${teamName}/clients/acquire`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ clientId }),
				signal: controller.signal
			});

			clearTimeout(timeoutId);
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to acquire client');
			}

			// Show success message
			successMessage = `Successfully acquired ${client.name}!`;
			setTimeout(() => (successMessage = null), 3000);

			// Remove client from available list
			clients = clients.filter((c) => c.id !== clientId);

			// Notify parent
			onClientAcquired(clientId, client.cost);
		} catch (err) {
			if (err instanceof Error) {
				if (err.name === 'AbortError') {
					error = 'Request timed out. Please try again.';
				} else {
					error = err.message;
				}
			} else {
				error = 'Failed to acquire client';
			}
			setTimeout(() => (error = null), 5000);
		} finally {
			loading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

{#if show}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
		transition:fade={{ duration: 200 }}
		onclick={handleOverlayClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="marketplace-title"
		data-testid="marketplace-modal"
		tabindex="-1"
	>
		<div
			class="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
			transition:scale={{ start: 0.95, duration: 200 }}
			onclick={(e) => e.stopPropagation()}
			role="document"
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between px-6 py-4 border-b-2 border-gray-200 bg-white sticky top-0 z-10"
			>
				<h2
					id="marketplace-title"
					class="text-2xl font-bold text-emerald-900 flex items-center gap-3"
				>
					<span>🛒</span>
					<span>Client Marketplace</span>
					<span class="text-sm font-normal text-gray-600">Round {currentRound}</span>
				</h2>
				<button
					onclick={onClose}
					data-testid="close-modal"
					class="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
					aria-label="Close marketplace"
				>
					<span class="text-xl text-gray-600">✕</span>
				</button>
			</div>

			<!-- View Only Banner (US-3.2) -->
			{#if isLockedIn}
				<div
					data-testid="view-only-banner"
					class="px-6 py-3 bg-orange-50 border-b border-orange-200 flex items-center gap-3"
					role="alert"
				>
					<span class="text-2xl" aria-hidden="true">🔒</span>
					<div class="flex-1">
						<p class="font-bold text-orange-900">Locked In - View Only</p>
						<p class="text-sm text-orange-700">
							Your decisions are locked. You cannot acquire new clients until the next round.
						</p>
					</div>
				</div>
			{/if}

			<!-- Success Message -->
			{#if successMessage}
				<div
					data-testid="success-message"
					class="mx-6 mt-4 p-4 bg-green-100 border border-green-300 text-green-800 rounded-lg flex items-center gap-2"
					transition:fly={{ y: -10, duration: 200 }}
					role="alert"
				>
					<span class="text-xl">✓</span>
					<span class="font-semibold">{successMessage}</span>
				</div>
			{/if}

			<!-- Error Message -->
			{#if error && !loading}
				<div
					data-testid="error-banner"
					class="mx-6 mt-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-center justify-between"
					transition:fly={{ y: -10, duration: 200 }}
					role="alert"
				>
					<div class="flex items-center gap-2">
						<span class="text-xl">⚠</span>
						<span class="font-semibold">{error}</span>
					</div>
					<button
						onclick={() => (error = null)}
						class="text-red-600 hover:text-red-800 font-bold"
						aria-label="Dismiss error"
					>
						✕
					</button>
				</div>
			{/if}

			<!-- Body -->
			<div class="flex-1 overflow-y-auto p-6">
				{#if loading}
					<div data-testid="loading-spinner" class="flex items-center justify-center py-20">
						<div class="text-center">
							<div class="text-4xl mb-4">⏳</div>
							<div class="text-gray-600">Loading marketplace...</div>
						</div>
					</div>
				{:else if clients.length === 0}
					<div class="text-center py-20">
						<div class="text-6xl mb-4">🎉</div>
						<div class="text-xl font-bold text-gray-800 mb-2">All clients acquired!</div>
						<div class="text-gray-600">You now have the maximum portfolio size.</div>
						<button
							onclick={onClose}
							class="mt-6 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
						>
							Close
						</button>
					</div>
				{:else}
					<!-- Filters -->
					<ClientFilters
						{riskFilter}
						{minRevenue}
						onRiskChange={(risk) => (riskFilter = risk)}
						onMinRevenueChange={(rev) => (minRevenue = rev)}
						clientCount={filteredClients.length}
					/>

					<!-- Client Grid -->
					{#if filteredClients.length > 0}
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{#each filteredClients as client, i}
								<ClientCard
									{client}
									credits={currentCredits}
									{ownedTech}
									{overallReputation}
									{isLockedIn}
									onAcquire={handleAcquire}
									delay={i * 50}
								/>
							{/each}
						</div>
					{:else}
						<div class="text-center py-10">
							<div class="text-4xl mb-2">🔍</div>
							<div class="text-gray-600">No clients match your filters</div>
							<button
								onclick={() => {
									riskFilter = 'All';
									minRevenue = 0;
								}}
								class="mt-4 px-4 py-2 text-emerald-600 hover:text-emerald-700 font-semibold"
							>
								Reset filters
							</button>
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>
{/if}
