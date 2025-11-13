<script lang="ts">
	interface Props {
		riskFilter: 'All' | 'Low' | 'Medium' | 'High';
		minRevenue: number;
		onRiskChange: (risk: 'All' | 'Low' | 'Medium' | 'High') => void;
		onMinRevenueChange: (minRevenue: number) => void;
		clientCount: number;
	}

	let { riskFilter, minRevenue, onRiskChange, onMinRevenueChange, clientCount }: Props = $props();
</script>

<div class="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
	<h3 class="text-sm font-semibold text-gray-700 mb-3">FILTERS</h3>

	<!-- Risk Level Filter -->
	<div class="mb-4">
		<div class="text-xs font-semibold text-gray-600 mb-2 block">Risk Level</div>
		<div class="flex gap-2 flex-wrap">
			{#each ['All', 'Low', 'Medium', 'High'] as risk}
				<button
					onclick={() => onRiskChange(risk as any)}
					data-testid="filter-risk-{risk.toLowerCase()}"
					class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 {riskFilter ===
					risk
						? 'bg-emerald-600 text-white shadow-md'
						: 'bg-white text-gray-700 border border-gray-300 hover:border-emerald-500'}"
				>
					{risk}
				</button>
			{/each}
		</div>
	</div>

	<!-- Minimum Revenue Filter -->
	<div class="mb-4">
		<label class="text-xs font-semibold text-gray-600 mb-2 block" for="min-revenue">
			Minimum Revenue: {minRevenue}
		</label>
		<input
			id="min-revenue"
			type="range"
			min="0"
			max="400"
			step="50"
			value={minRevenue}
			oninput={(e) => onMinRevenueChange(parseInt((e.target as HTMLInputElement).value))}
			data-testid="filter-revenue"
			class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
		/>
		<div class="flex justify-between text-xs text-gray-500 mt-1">
			<span>0</span>
			<span>400</span>
		</div>
	</div>

	<!-- Client Count -->
	<div class="text-sm text-gray-600 pt-3 border-t border-gray-200">
		<span class="font-semibold" data-testid="client-count">{clientCount}</span>
		{clientCount === 1 ? 'client' : 'clients'} match your filters
	</div>
</div>
