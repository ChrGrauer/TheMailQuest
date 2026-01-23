<script lang="ts">
	/**
	 * Client Management Modal
	 * US-2.4: Client Basic Management
	 * US-3.2: Decision Lock-In (view-only mode)
	 *
	 * Modal for managing ESP client portfolio:
	 * - View all acquired clients with their states
	 * - Toggle client status (Active/Paused)
	 * - Configure onboarding options for new clients
	 * - Preview budget and revenue impacts
	 *
	 * Onboarding selections are saved immediately as pending decisions.
	 * Lock-in happens via main dashboard button only.
	 *
	 * When isLockedIn is true, all actions are disabled (view-only mode)
	 */

	import { fly, scale } from 'svelte/transition';
	import PortfolioClientCard from './PortfolioClientCard.svelte';
	import type { Client, ClientState } from '$lib/server/game/types';
	import { calculateOnboardingCost } from '$lib/config/client-onboarding';

	interface Props {
		show: boolean;
		isLockedIn?: boolean;
		onClose: () => void;
		roomCode: string;
		teamName: string;
		currentCredits: number;
		currentRound: number;
	}

	let {
		show = $bindable(),
		isLockedIn = false,
		onClose,
		roomCode,
		teamName,
		currentCredits,
		currentRound
	}: Props = $props();

	// State
	let clients: Array<Client & ClientState> = $state([]);
	let revenuePreview: number = $state(0);
	let budgetForecast: number = $state(currentCredits);
	let loading: boolean = $state(false);
	let error: string | null = $state(null);

	// Track onboarding selections (clientId -> options)
	let onboardingSelections = $state<Record<string, { warmup: boolean; listHygiene: boolean }>>({});

	// Calculate total onboarding costs
	let totalOnboardingCost = $derived(
		Object.values(onboardingSelections).reduce((sum, options) => {
			return sum + calculateOnboardingCost(options.warmup, options.listHygiene);
		}, 0)
	);

	// Calculate budget after onboarding costs
	let budgetAfterCosts = $derived(currentCredits - totalOnboardingCost);

	// Fetch portfolio data
	async function fetchPortfolio() {
		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/sessions/${roomCode}/esp/${teamName}/portfolio`);

			if (!response.ok) {
				throw new Error(`Failed to fetch portfolio: ${response.statusText}`);
			}

			const data = await response.json();
			clients = data.clients || [];
			revenuePreview = data.revenue_preview || 0;
			budgetForecast = data.budget_forecast || currentCredits;

			// Initialize onboarding selections from pending decisions (server state)
			// First, remove selections for clients that have been activated (first_active_round !== null)
			// This handles the case where the modal persists across rounds and old selections remain
			const pendingDecisions = data.pending_onboarding_decisions || {};
			const newClientIds = new Set(
				clients.filter((c) => c.first_active_round === null).map((c) => c.id)
			);
			for (const clientId of Object.keys(onboardingSelections)) {
				if (!newClientIds.has(clientId)) {
					delete onboardingSelections[clientId];
				}
			}

			// Then populate selections for new clients
			clients.forEach((client) => {
				if (client.first_active_round === null) {
					// Load from pending decisions if exists, otherwise default to false
					// Do NOT use client.volumeModifiers/spamTrapModifiers as those may be from
					// previous rounds where costs were already paid
					if (pendingDecisions[client.id]) {
						onboardingSelections[client.id] = {
							warmup: pendingDecisions[client.id].warmup || (client as any).has_warmup || false,
							listHygiene:
								pendingDecisions[client.id].listHygiene || (client as any).has_list_hygiene || false
						};
					} else {
						onboardingSelections[client.id] = {
							warmup: (client as any).has_warmup || false,
							listHygiene: (client as any).has_list_hygiene || false
						};
					}
				}
			});
		} catch (err) {
			error = (err as Error).message;
		} finally {
			loading = false;
		}
	}

	// Handle status toggle
	async function handleStatusToggle(clientId: string, newStatus: 'Active' | 'Paused') {
		try {
			const response = await fetch(
				`/api/sessions/${roomCode}/esp/${teamName}/clients/${clientId}/status`,
				{
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ status: newStatus })
				}
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to toggle client status');
			}

			// Update local state
			const clientIndex = clients.findIndex((c) => c.id === clientId);
			if (clientIndex !== -1) {
				clients[clientIndex] = { ...clients[clientIndex], status: newStatus };
			}

			// Refresh to get updated revenue preview
			await fetchPortfolio();
		} catch (err) {
			error = (err as Error).message;
		}
	}

	// Handle onboarding change - save immediately to pending decisions
	async function handleOnboardingChange(clientId: string, warmup: boolean, listHygiene: boolean) {
		// Update local state
		onboardingSelections[clientId] = { warmup, listHygiene };

		// Save to server immediately (pending, not committed)
		try {
			const response = await fetch(`/api/sessions/${roomCode}/esp/${teamName}/pending-onboarding`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ clientId, warmup, list_hygiene: listHygiene })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to save onboarding selection');
			}

			// Clear any previous errors
			error = null;
		} catch (err) {
			error = (err as Error).message;
		}
	}

	// Focus management for accessibility
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let modalContent: HTMLDivElement | undefined = $state();
	let previouslyFocusedElement: HTMLElement | null = null;

	// Fetch data when modal opens
	$effect(() => {
		if (show) {
			fetchPortfolio();
			// Store previously focused element
			previouslyFocusedElement = document.activeElement as HTMLElement;
			// Focus modal content after a brief delay to allow render
			setTimeout(() => {
				modalContent?.focus();
			}, 100);
		} else if (previouslyFocusedElement) {
			// Restore focus when modal closes
			previouslyFocusedElement.focus();
			previouslyFocusedElement = null;
		}
	});
</script>

{#if show}
	<!-- Modal Overlay -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
		data-testid="modal-overlay"
		transition:fly={{ y: 50, duration: 200 }}
		onclick={(e) => {
			if (e.target === e.currentTarget) onClose();
		}}
		role="button"
		tabindex="0"
		onkeydown={(e) => {
			if (e.key === 'Escape') onClose();
		}}
	>
		<!-- Modal Content -->
		<div
			bind:this={modalContent}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			aria-describedby="modal-description"
			tabindex="-1"
			class="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col focus:outline-none"
			data-testid="client-management-modal"
			transition:scale={{ duration: 200 }}
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-white"
			>
				<h2 id="modal-title" class="text-2xl font-bold text-emerald-900 flex items-center gap-3">
					<span class="text-3xl" aria-hidden="true">📋</span>
					<span>Client Portfolio Management</span>
				</h2>
				<button
					data-testid="modal-close-btn"
					onclick={onClose}
					aria-label="Close client portfolio management modal"
					class="p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
				>
					<span class="text-2xl text-gray-500" aria-hidden="true">×</span>
				</button>
			</div>

			<!-- Screen reader description -->
			<div id="modal-description" class="sr-only">
				Manage your client portfolio: toggle client status between Active and Paused, configure
				onboarding options for new clients, and preview budget impacts. Lock in your decisions using
				the main dashboard button.
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
							Your decisions are locked. Changes cannot be made until the next round.
						</p>
					</div>
				</div>
			{/if}

			<!-- Budget Banner -->
			<div
				data-testid="budget-banner"
				role="region"
				aria-label="Budget and revenue forecast"
				aria-live="polite"
				class="px-6 py-4 bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-gray-200"
			>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-6">
						<div>
							<div class="text-xs text-gray-600 font-semibold mb-1">Current Budget</div>
							<div data-testid="budget-preview" class="text-2xl font-bold text-emerald-700">
								{currentCredits.toLocaleString()}
								<span class="text-sm font-normal text-gray-500">credits</span>
							</div>
						</div>

						{#if totalOnboardingCost > 0}
							<div class="text-2xl text-gray-400">→</div>
							<div>
								<div class="text-xs text-gray-600 font-semibold mb-1">Pending Costs</div>
								<div data-testid="onboarding-costs" class="text-xl font-bold text-orange-600">
									-{totalOnboardingCost.toLocaleString()}
									<span class="text-sm font-normal text-gray-500">credits</span>
								</div>
							</div>
							<div class="text-2xl text-gray-400">=</div>
							<div>
								<div class="text-xs text-gray-600 font-semibold mb-1">Available</div>
								<div data-testid="budget-forecast" class="text-2xl font-bold text-blue-700">
									{budgetAfterCosts.toLocaleString()}
									<span class="text-sm font-normal text-gray-500">credits</span>
								</div>
							</div>
						{/if}
					</div>

					<div class="text-right">
						<div class="text-xs text-gray-600 font-semibold mb-1">Max Potential Revenue</div>
						<div data-testid="revenue-preview" class="text-xl font-bold text-green-600">
							+{revenuePreview.toLocaleString()}
							<span class="text-sm font-normal text-gray-500">credits/round</span>
						</div>
						<div class="text-xs text-gray-500 mt-1">(if 100% delivery)</div>
					</div>
				</div>
			</div>

			<!-- Error Banner -->
			{#if error && !loading}
				<div class="px-6 py-3 bg-red-50 border-b border-red-200" role="alert" aria-live="assertive">
					<div data-testid="error-banner" class="text-sm text-red-700">
						<strong>Error:</strong>
						{error}
						<button
							onclick={() => (error = null)}
							aria-label="Dismiss error message"
							class="ml-2 text-red-900 underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
						>
							Dismiss
						</button>
					</div>
				</div>
			{/if}

			<!-- Loading State -->
			{#if loading && clients.length === 0}
				<div class="flex-1 flex items-center justify-center p-12">
					<div class="text-center">
						<div class="text-4xl mb-4">⏳</div>
						<div class="text-gray-600">Loading client portfolio...</div>
					</div>
				</div>
			{:else if clients.length === 0 && !loading}
				<!-- Empty State -->
				<div class="flex-1 flex items-center justify-center p-12">
					<div class="text-center">
						<div class="text-6xl mb-4">📭</div>
						<div class="text-xl font-semibold text-gray-700 mb-2">No clients yet</div>
						<div class="text-gray-600">
							Visit the Client Marketplace to acquire your first client.
						</div>
					</div>
				</div>
			{:else}
				<!-- Client List -->
				<div class="flex-1 overflow-y-auto p-6" role="region" aria-label="Client portfolio list">
					<div class="space-y-4" role="list">
						{#each clients as client, index (client.id)}
							<div role="listitem">
								<PortfolioClientCard
									{client}
									{currentRound}
									{index}
									{isLockedIn}
									initialWarmupSelected={onboardingSelections[client.id]?.warmup}
									initialListHygieneSelected={onboardingSelections[client.id]?.listHygiene}
									onStatusToggle={handleStatusToggle}
									onOnboardingChange={handleOnboardingChange}
								/>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
