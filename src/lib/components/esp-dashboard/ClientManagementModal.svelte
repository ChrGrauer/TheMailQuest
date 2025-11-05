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
	 * - Lock in decisions
	 *
	 * When isLockedIn is true, all actions are disabled (view-only mode)
	 */

	import { onMount } from 'svelte';
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

	// Check if over budget
	let isOverBudget = $derived(budgetAfterCosts < 0);

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

			// Initialize onboarding selections for new clients
			clients.forEach((client) => {
				if (client.first_active_round === null) {
					onboardingSelections[client.id] = {
						warmup: client.has_warmup,
						listHygiene: client.has_list_hygiene
					};
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

	// Handle onboarding change
	function handleOnboardingChange(clientId: string, warmup: boolean, listHygiene: boolean) {
		onboardingSelections[clientId] = { warmup, listHygiene };
	}

	// Lock in decisions
	async function handleLockIn() {
		if (isOverBudget) return;

		loading = true;
		error = null;

		try {
			// Submit all onboarding configurations
			for (const [clientId, options] of Object.entries(onboardingSelections)) {
				const response = await fetch(
					`/api/sessions/${roomCode}/esp/${teamName}/clients/${clientId}/onboarding`,
					{
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ warmup: options.warmup, list_hygiene: options.listHygiene })
					}
				);

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || 'Failed to configure onboarding');
				}
			}

			// Success - refresh and close
			await fetchPortfolio();
			onClose();
		} catch (err) {
			error = (err as Error).message;
		} finally {
			loading = false;
		}
	}

	// Focus management for accessibility
	let modalContent: HTMLDivElement;
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
				Manage your client portfolio: toggle client status between Active and Paused, configure onboarding options for new clients, and preview budget impacts.
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
						<p class="text-sm text-orange-700">Your decisions are locked. Changes cannot be made until the next round.</p>
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
								<div class="text-xs text-gray-600 font-semibold mb-1">Onboarding Costs</div>
								<div data-testid="onboarding-costs" class="text-xl font-bold text-orange-600">
									-{totalOnboardingCost.toLocaleString()}
									<span class="text-sm font-normal text-gray-500">credits</span>
								</div>
							</div>
							<div class="text-2xl text-gray-400">=</div>
							<div>
								<div class="text-xs text-gray-600 font-semibold mb-1">After Lock-in</div>
								<div
									data-testid="budget-forecast"
									class="text-2xl font-bold {isOverBudget ? 'text-red-600' : 'text-blue-700'}"
								>
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

				<!-- Over Budget Warning -->
				{#if isOverBudget}
					<div
						data-testid="over-budget-message"
						role="alert"
						aria-live="assertive"
						class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
					>
						<strong>Cannot lock in: over budget by {Math.abs(budgetAfterCosts).toLocaleString()} credits</strong>
					</div>
				{/if}
			</div>

			<!-- Error Banner -->
			{#if error && !loading}
				<div class="px-6 py-3 bg-red-50 border-b border-red-200" role="alert" aria-live="assertive">
					<div data-testid="error-banner" class="text-sm text-red-700">
						<strong>Error:</strong> {error}
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
						<div class="text-gray-600">Visit the Client Marketplace to acquire your first client.</div>
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
									onStatusToggle={handleStatusToggle}
									onOnboardingChange={handleOnboardingChange}
								/>
							</div>
						{/each}
					</div>
				</div>

				<!-- Footer: Lock-in Button -->
				<div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
					<button
						data-testid="lock-in-btn"
						onclick={handleLockIn}
						disabled={isOverBudget || loading}
						aria-label={isOverBudget ? 'Cannot lock in decisions: over budget' : loading ? 'Saving client configurations' : 'Lock in client management decisions'}
						class="w-full py-3 rounded-lg font-bold text-lg transition-all focus:outline-none focus:ring-4 focus:ring-emerald-300
							{isOverBudget || loading
								? 'bg-gray-300 text-gray-500 cursor-not-allowed'
								: 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-700 hover:to-emerald-600 shadow-lg hover:shadow-xl'}"
					>
						{#if loading}
							<span aria-hidden="true">🔄</span> Saving...
						{:else if isOverBudget}
							<span aria-hidden="true">🔒</span> Cannot Lock In (Over Budget)
						{:else}
							<span aria-hidden="true">🔒</span> Lock In Decisions
						{/if}
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
