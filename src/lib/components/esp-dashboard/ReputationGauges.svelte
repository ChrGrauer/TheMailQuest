<script lang="ts">
	/**
	 * ReputationGauges Component
	 * US-2.1: ESP Team Dashboard
	 *
	 * Displays:
	 * - Reputation gauges for each destination
	 * - Color-coded by threshold (Excellent/Good/Warning/Poor/Blacklist)
	 * - Icons for accessibility (color-blind friendly)
	 * - Destination market weights
	 * - Warning/alert indicators
	 */

	interface ReputationData {
		[destination: string]: number;
	}

	interface DestinationWeight {
		name: string;
		weight: number;
	}

	interface Props {
		reputation: ReputationData;
		destinations?: DestinationWeight[];
	}

	let {
		reputation,
		destinations = [
			{ name: 'Gmail', weight: 50 },
			{ name: 'Outlook', weight: 30 },
			{ name: 'Yahoo', weight: 20 }
		]
	}: Props = $props();

	// Reputation status calculation
	function getReputationStatus(score: number): {
		status: 'excellent' | 'good' | 'warning' | 'poor' | 'blacklist';
		label: string;
		color: string;
		bgColor: string;
		icon: string;
	} {
		if (score >= 90) {
			return {
				status: 'excellent',
				label: 'Excellent',
				color: 'text-green-700',
				bgColor: 'bg-green-500',
				icon: '✓'
			};
		} else if (score >= 70) {
			return {
				status: 'good',
				label: 'Good',
				color: 'text-blue-700',
				bgColor: 'bg-blue-500',
				icon: '👍'
			};
		} else if (score >= 50) {
			return {
				status: 'warning',
				label: 'Warning',
				color: 'text-orange-700',
				bgColor: 'bg-orange-500',
				icon: '⚠'
			};
		} else if (score >= 30) {
			return {
				status: 'poor',
				label: 'Danger',
				color: 'text-red-700',
				bgColor: 'bg-red-500',
				icon: '!'
			};
		} else {
			return {
				status: 'blacklist',
				label: 'Blacklist',
				color: 'text-gray-900',
				bgColor: 'bg-gray-900',
				icon: '✕'
			};
		}
	}
</script>

<div class="bg-white rounded-xl shadow-md p-6">
	<h2 class="text-lg font-bold text-gray-800 mb-4">Reputation by Destination</h2>

	<div class="space-y-4">
		{#each destinations as dest}
			{@const score = reputation[dest.name] || 70}
			{@const status = getReputationStatus(score)}

			<div
				data-testid="reputation-{dest.name.toLowerCase()}"
				data-status={status.status}
				aria-label="{dest.name} reputation: {score} - {status.label}"
				class="space-y-2"
			>
				<!-- Destination Name + Weight -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="font-semibold text-gray-800">{dest.name}</span>
						<span
							data-testid="destination-weight-{dest.name.toLowerCase()}"
							class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded"
						>
							{dest.weight}%
						</span>
					</div>

					<!-- Score Display -->
					<div class="flex items-center gap-2">
						<span
							data-testid="status-icon-{status.status === 'excellent'
								? 'checkmark'
								: status.status === 'good'
									? 'thumbup'
									: status.status === 'warning'
										? 'warning'
										: status.status === 'poor'
											? 'exclamation'
											: 'prohibition'}"
							class="text-xl"
							aria-hidden="true"
						>
							{status.icon}
						</span>
						<span
							data-testid="reputation-{dest.name.toLowerCase()}-score"
							class="{status.color} font-bold text-lg">{score}</span
						>
					</div>
				</div>

				<!-- Progress Bar -->
				<div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
					<div
						class="{status.bgColor} h-full rounded-full transition-all duration-500"
						style="width: {score}%"
					></div>
				</div>

				<!-- Status Label -->
				<div class="flex items-center justify-between text-sm">
					<span class="{status.color} font-medium">{status.label}</span>
				</div>

				<!-- Warning Zone Indicator -->
				{#if score >= 50 && score < 70}
					<div
						data-testid="reputation-{dest.name.toLowerCase()}-warning"
						class="bg-orange-50 border border-orange-200 rounded-lg p-2 text-sm text-orange-700"
					>
						<span class="font-semibold">Warning Zone</span> - Reputation declining
					</div>
				{/if}

				<!-- Danger Zone Indicator -->
				{#if score >= 30 && score < 50}
					<div
						data-testid="reputation-{dest.name.toLowerCase()}-alert"
						class="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 font-bold"
					>
						<span>Danger Zone</span> - Take immediate action!
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
