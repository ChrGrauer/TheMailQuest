<script lang="ts">
	/**
	 * CoordinationPanelModal Component
	 * US-2.7: Coordination Panel - Investigation Voting
	 *
	 * Modal for coordinating joint investigations against ESPs.
	 * Destinations vote on which ESP to investigate.
	 * 2/3 votes (2 out of 3 destinations) triggers investigation.
	 * Cost: 50 credits per voting destination (charged at resolution).
	 */

	import { fade, scale } from 'svelte/transition';
	import type { InvestigationHistoryEntry } from '$lib/server/game/types';

	interface Props {
		show: boolean;
		isLockedIn?: boolean;
		roomCode: string;
		destName: string;
		currentBudget: number;
		espTeams: { name: string }[];
		currentVotes: Record<string, string[]>; // ESP name -> voter names
		myVote?: string | null;
		investigationHistory?: InvestigationHistoryEntry[];
		onVoteChange?: (espName: string | null) => Promise<void>;
	}

	let {
		show = $bindable(),
		isLockedIn = false,
		roomCode,
		destName,
		currentBudget,
		espTeams,
		currentVotes,
		myVote = null,
		investigationHistory = [],
		onVoteChange
	}: Props = $props();

	const INVESTIGATION_COST = 50;
	const TOTAL_DESTINATIONS = 3; // zmail, intake, yagle

	let loading = $state(false);
	let error = $state<string | null>(null);

	// Check if budget is sufficient
	let hasSufficientBudget = $derived(currentBudget >= INVESTIGATION_COST);

	// Check if voting is disabled
	let votingDisabled = $derived(isLockedIn || !hasSufficientBudget);

	// Get vote count for an ESP
	function getVoteCount(espName: string): number {
		return currentVotes[espName]?.length || 0;
	}

	// Get voters list for an ESP
	function getVoters(espName: string): string[] {
		return currentVotes[espName] || [];
	}

	// Check if this destination voted for an ESP
	function hasMyVote(espName: string): boolean {
		return myVote === espName;
	}

	// Handle vote button click
	async function handleVoteClick(espName: string) {
		if (votingDisabled || loading) return;

		loading = true;
		error = null;

		try {
			if (hasMyVote(espName)) {
				// Clicking on already selected = remove vote
				await onVoteChange?.(null);
			} else {
				// Vote for this ESP
				await onVoteChange?.(espName);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update vote';
			setTimeout(() => (error = null), 5000);
		} finally {
			loading = false;
		}
	}

	// Handle keyboard events
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			show = false;
		}
	}

	// Handle backdrop click
	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			show = false;
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
		aria-labelledby="coordination-panel-title"
		data-testid="coordination-panel-modal"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
			transition:scale={{ start: 0.95, duration: 200 }}
			onclick={(e) => e.stopPropagation()}
			role="document"
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between px-6 py-4 border-b-2 border-blue-200 bg-white sticky top-0 z-10"
			>
				<div class="flex-1">
					<h2
						id="coordination-panel-title"
						class="text-2xl font-bold text-blue-900 flex items-center gap-3"
					>
						<span>🔍</span>
						<span>Joint Investigation</span>
					</h2>
					<div class="text-sm text-gray-600 mt-1">
						<span data-testid="budget-current">{currentBudget}</span> credits available
						{#if myVote}
							<span data-testid="pending-costs" class="ml-2 text-orange-600 font-medium">
								(50 reserved)
							</span>
						{/if}
					</div>
				</div>
				<button
					onclick={() => (show = false)}
					data-testid="close-coordination-panel"
					class="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
					aria-label="Close coordination panel"
				>
					<span class="text-xl text-gray-600">✕</span>
				</button>
			</div>

			<!-- View Only Banner -->
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
							Your decisions are locked. You cannot change your vote until the next round.
						</p>
					</div>
				</div>
			{/if}

			<!-- Insufficient Budget Warning -->
			{#if !hasSufficientBudget && !isLockedIn}
				<div
					data-testid="budget-insufficient-message"
					class="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3"
					role="alert"
				>
					<span class="text-xl">⚠️</span>
					<div>
						<p class="font-semibold text-red-800">Insufficient Budget</p>
						<p class="text-sm text-red-700">
							You need at least {INVESTIGATION_COST} credits to vote for an investigation.
						</p>
					</div>
				</div>
			{/if}

			<!-- Error Message -->
			{#if error}
				<div
					data-testid="error-message"
					class="mx-6 mt-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-center justify-between"
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
				<!-- Joint Investigation Section -->
				<section data-testid="joint-investigation-section" class="mb-6">
					<h3 class="text-lg font-semibold text-gray-800 mb-2">Joint Investigation</h3>
					<p data-testid="investigation-cost-info" class="text-sm text-gray-600 mb-4">
						Vote to investigate an ESP's practices. Requires 2/3 votes to trigger.
						<span class="font-medium text-blue-700">Cost: {INVESTIGATION_COST} credits</span>
						per voting destination (charged if investigation triggers).
					</p>

					<!-- ESP Vote Targets -->
					<div class="grid grid-cols-1 gap-4">
						{#each espTeams as esp}
							{@const voteCount = getVoteCount(esp.name)}
							{@const voters = getVoters(esp.name)}
							{@const isSelected = hasMyVote(esp.name)}
							<div
								data-testid="esp-target-{esp.name.toLowerCase()}"
								data-selected={isSelected ? 'true' : 'false'}
								class="border-2 rounded-lg p-4 transition-all duration-200 {isSelected
									? 'border-blue-500 bg-blue-50'
									: 'border-gray-200 hover:border-gray-300'}"
							>
								<div class="flex items-center justify-between">
									<div class="flex-1">
										<h4 class="font-semibold text-gray-900">{esp.name}</h4>
										<div class="flex items-center gap-2 mt-1">
											<span
												data-testid="vote-count-{esp.name.toLowerCase()}"
												class="text-sm font-medium {voteCount >= 2
													? 'text-green-600'
													: 'text-gray-600'}"
											>
												{voteCount}/{TOTAL_DESTINATIONS} votes
											</span>
											{#if voters.length > 0}
												<span
													data-testid="voters-{esp.name.toLowerCase()}"
													class="text-sm text-gray-500"
												>
													({voters.join(', ')})
												</span>
											{/if}
										</div>
									</div>
									<button
										data-testid="vote-button-{esp.name.toLowerCase()}"
										onclick={() => handleVoteClick(esp.name)}
										disabled={votingDisabled || loading}
										class="px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200
											{isSelected
											? 'bg-blue-600 text-white hover:bg-blue-700'
											: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
											disabled:opacity-50 disabled:cursor-not-allowed
											focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
									>
										{#if loading}
											<span class="animate-pulse">...</span>
										{:else if isSelected}
											Remove Vote
										{:else}
											Vote
										{/if}
									</button>
								</div>
							</div>
						{/each}
					</div>
				</section>

				<!-- Investigation History Section (if any) -->
				{#if investigationHistory.length > 0}
					<section class="border-t border-gray-200 pt-6">
						<h3 class="text-lg font-semibold text-gray-800 mb-4">Investigation History</h3>
						<div class="space-y-3">
							{#each [...investigationHistory].reverse() as investigation}
								<div
									class="border rounded-lg p-4 {investigation.result.violationFound
										? 'border-red-200 bg-red-50'
										: 'border-green-200 bg-green-50'}"
								>
									<div class="flex items-start justify-between">
										<div>
											<p class="font-semibold text-gray-900">
												Round {investigation.round}: {investigation.targetEsp}
											</p>
											<p class="text-sm text-gray-600 mt-1">
												Voters: {investigation.voters.join(', ')}
											</p>
										</div>
										<span
											class="px-2 py-1 rounded text-xs font-semibold {investigation.result
												.violationFound
												? 'bg-red-200 text-red-800'
												: 'bg-green-200 text-green-800'}"
										>
											{investigation.result.violationFound ? 'Violation Found' : 'No Violations'}
										</span>
									</div>
									{#if investigation.result.suspendedClient}
										<p class="text-sm text-red-700 mt-2">
											Client suspended: {investigation.result.suspendedClient.clientName}
											(missing {investigation.result.suspendedClient.missingProtection})
										</p>
									{/if}
								</div>
							{/each}
						</div>
					</section>
				{/if}
			</div>
		</div>
	</div>
{/if}
