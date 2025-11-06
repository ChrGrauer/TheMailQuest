<script lang="ts">
	/**
	 * BudgetDisplay Component
	 * US-2.1: ESP Team Dashboard
	 *
	 * Displays:
	 * - Current budget prominently
	 * - Forecast budget after lock-in (when there are pending costs)
	 */

	interface Props {
		currentBudget: number;
		pendingCosts?: number;
	}

	let { currentBudget, pendingCosts = 0 }: Props = $props();

	// Calculate forecast budget after lock-in
	let forecastBudget = $derived(currentBudget - pendingCosts);

	// Show forecast only if there are pending costs
	let showForecast = $derived(pendingCosts > 0);
</script>

<div class="bg-white rounded-xl shadow-md p-6">
	<h2 class="text-lg font-bold text-gray-800 mb-4">Budget</h2>

	<div class="space-y-4">
		<!-- Current Budget -->
		<div>
			<div class="text-sm text-gray-600 mb-1">Current</div>
			<div data-testid="budget-current" class="text-4xl font-bold text-emerald-600">
				{currentBudget.toLocaleString()}
				<span class="text-lg text-gray-500 ml-2">credits</span>
			</div>
		</div>

		<!-- Forecast Budget (After Lock-in) -->
		{#if showForecast}
			<div class="border-t border-gray-200 pt-4">
				<div class="text-sm text-gray-600 mb-1">After Lock-in</div>
				<div data-testid="budget-forecast" class="text-2xl font-semibold text-gray-500 opacity-75">
					{forecastBudget.toLocaleString()}
					<span class="text-base text-gray-400 ml-2">credits</span>
				</div>
				<div class="text-xs text-orange-600 mt-1">
					-{pendingCosts.toLocaleString()} credits pending
				</div>
			</div>
		{/if}
	</div>
</div>
