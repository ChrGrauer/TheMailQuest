<script lang="ts">
	/**
	 * LockInButton Component
	 * US-2.1: ESP Team Dashboard
	 *
	 * Displays the "Lock In Decisions" button
	 * - Visible and enabled during planning phase
	 * - Hidden or disabled during resolution phase
	 */

	interface Props {
		phase?: string;
		disabled?: boolean;
		pendingDecisions?: number;
		onLockIn?: () => void;
	}

	let { phase = 'planning', disabled = false, pendingDecisions = 0, onLockIn }: Props = $props();

	// Button should be visible in planning phase
	let isVisible = $derived(phase === 'planning');

	// Button is disabled if phase is not planning or explicitly disabled
	let isDisabled = $derived(!isVisible || disabled);
</script>

{#if isVisible}
	<div class="bg-white rounded-xl shadow-md p-6">
		<div class="text-center">
			<h2 class="text-lg font-bold text-gray-800 mb-2">Ready to Lock In?</h2>
			<p class="text-sm text-gray-600 mb-6">
				{#if pendingDecisions > 0}
					You have {pendingDecisions} pending {pendingDecisions === 1
						? 'decision'
						: 'decisions'}. Review carefully before locking in.
				{:else}
					Lock in your decisions when you're ready to proceed to the next phase.
				{/if}
			</p>

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
			>
				<svg
					class="w-6 h-6"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
					></path>
				</svg>
				<span>Lock In Decisions</span>
			</button>

			<p class="text-xs text-gray-500 mt-3">
				Once locked in, you cannot make changes until the next planning phase
			</p>
		</div>
	</div>
{/if}
