<script lang="ts">
	/**
	 * CoordinationStatus Component
	 * US-2.5: Destination Kingdom Dashboard
	 *
	 * Displays:
	 * - Inter-destination coordination summary
	 * - Number of active collaborations
	 * - Button to manage coordination (links to US-2.7)
	 */

	interface Props {
		collaborationsCount: number;
		onCoordinationClick?: () => void;
	}

	let { collaborationsCount, onCoordinationClick }: Props = $props();
</script>

<div class="bg-white rounded-xl shadow-md p-6" data-testid="coordination-status">
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-lg font-bold text-gray-800">🤝 Inter-Destination Coordination</h2>
		{#if onCoordinationClick}
			<button
				onclick={onCoordinationClick}
				class="px-4 py-2 text-sm font-semibold text-blue-600 border-2 border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
			>
				Manage →
			</button>
		{/if}
	</div>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<!-- Active Collaborations -->
		<div class="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-l-4 border-blue-500">
			<div class="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
				Active Collaborations
			</div>
			<div
				data-testid="collaborations-count"
				class="text-3xl font-bold text-blue-800"
			>
				{collaborationsCount}
			</div>
			{#if collaborationsCount > 0}
				<div class="text-xs text-blue-600 mt-2">
					Inter-destination intelligence sharing
				</div>
			{:else}
				<div class="text-xs text-gray-500 mt-2">
					No active collaborations
				</div>
			{/if}
		</div>

		<!-- Shared Budget Pool (placeholder) -->
		<div class="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border-l-4 border-amber-500">
			<div class="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
				Shared Budget Pool
			</div>
			<div class="text-3xl font-bold text-amber-800">
				{collaborationsCount > 0 ? '450' : '0'}
			</div>
			<div class="text-xs text-amber-600 mt-2">
				Combined credits
			</div>
		</div>

		<!-- Intelligence Level (placeholder) -->
		<div class="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border-l-4 border-purple-500">
			<div class="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">
				Intelligence Level
			</div>
			<div class="text-xl font-bold text-purple-800">
				{collaborationsCount > 0 ? 'Medium' : 'None'}
			</div>
			<div class="text-xs text-purple-600 mt-2">
				ESP behavior insights
			</div>
		</div>
	</div>

	{#if collaborationsCount === 0}
		<div class="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
			<p class="text-sm text-gray-600 text-center">
				💡 <span class="font-semibold">Tip:</span> Collaborate with other destinations to share intelligence and resources.
			</p>
		</div>
	{/if}
</div>
