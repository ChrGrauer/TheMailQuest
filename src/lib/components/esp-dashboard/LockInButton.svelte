<script lang="ts">
	/**
	 * LockInButton Component
	 * US-2.1: ESP Team Dashboard
	 * US-3.2: Decision Lock-In
	 *
	 * Displays the "Lock In Decisions" button with:
	 * - Budget validation (disabled if pending costs exceed budget)
	 * - Locked-in confirmation state
	 * - Waiting for other players countdown
	 * - Auto-lock warning messages
	 */

	interface Props {
		phase?: string;
		disabled?: boolean;
		pendingDecisions?: number;
		budgetExceeded?: boolean;
		excessAmount?: number;
		isLockedIn?: boolean;
		remainingPlayers?: number;
		onLockIn?: () => void;
	}

	let {
		phase = 'planning',
		disabled = false,
		pendingDecisions = 0,
		budgetExceeded = false,
		excessAmount = 0,
		isLockedIn = false,
		remainingPlayers = 0,
		onLockIn
	}: Props = $props();

	// Button should be visible in planning phase
	let isVisible = $derived(phase === 'planning');

	$effect(() => {
		console.debug('[LockInButton] phase:', phase, 'isVisible:', isVisible);
	});

	// Button is disabled if:
	// - Not in planning phase
	// - Explicitly disabled
	// - Budget exceeded
	// - Already locked in
	let isDisabled = $derived(!isVisible || disabled || budgetExceeded || isLockedIn);
</script>

{#if isVisible}
	<div class="bg-white rounded-xl shadow-md p-6">
		<div class="text-center">
			{#if isLockedIn}
				<!-- Locked In State -->
				<div class="flex flex-col items-center gap-4">
					<!-- Locked In Confirmation -->
					<div data-testid="lock-in-confirmation" class="flex items-center gap-2 text-emerald-600">
						<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							></path>
						</svg>
						<span class="text-xl font-bold">Locked In ✓</span>
					</div>

					<!-- Waiting Message -->
					<div data-testid="waiting-message" class="text-gray-600">
						<p class="text-sm">Waiting for others to lock in...</p>
						{#if remainingPlayers > 0}
							<p data-testid="remaining-players-count" class="text-lg font-semibold mt-2">
								{remainingPlayers}
								{remainingPlayers === 1 ? 'player' : 'players'} remaining
							</p>
						{/if}
					</div>
				</div>
			{:else}
				<!-- Not Locked In Yet -->
				<h2 class="text-lg font-bold text-gray-800 mb-2">Ready to Lock In?</h2>

				<!-- Budget Warning (if exceeded) -->
				{#if budgetExceeded}
					<div
						data-testid="budget-warning"
						class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm"
						role="alert"
					>
						<strong>Budget exceeded by {excessAmount} credits</strong>
						<p class="mt-1">Remove some onboarding options to lock in</p>
					</div>
				{/if}

				<!-- Description -->
				<p class="text-sm text-gray-600 mb-6">
					{#if pendingDecisions > 0}
						You have {pendingDecisions} pending {pendingDecisions === 1 ? 'decision' : 'decisions'}.
						Review carefully before locking in.
					{:else}
						Lock in your decisions when you're ready to proceed to the next phase.
					{/if}
				</p>

				<!-- Lock In Button -->
				<button
					data-testid="lock-in-button"
					onclick={onLockIn}
					disabled={isDisabled}
					class="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700
               text-white font-bold text-lg px-8 py-4 rounded-xl transition-all
               hover:shadow-xl hover:-translate-y-1
               disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:transform-none
               flex items-center justify-center gap-3
               focus:outline-none focus:ring-4 focus:ring-emerald-300 focus:ring-offset-2"
					aria-label="Lock in your decisions"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
						></path>
					</svg>
					<span>Lock In Decisions</span>
				</button>

				<!-- Warning Text -->
				<p class="text-xs text-gray-500 mt-3">
					Once locked in, you cannot make changes until the next planning phase
				</p>
			{/if}
		</div>
	</div>
{/if}
