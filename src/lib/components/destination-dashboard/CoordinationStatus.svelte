<script lang="ts">
	/**
	 * CoordinationStatus Component
	 * US-2.5: Destination Kingdom Dashboard
	 * US-2.7: Coordination Panel (Investigation voting)
	 *
	 * Displays:
	 * - Joint investigation status summary
	 * - Current vote status (if any)
	 * - Button to open Coordination Panel modal
	 */

	interface Props {
		onCoordinationClick?: () => void;
		myVote?: string | null;
		currentVotes?: Record<string, string[]>;
	}

	let { onCoordinationClick, myVote = null, currentVotes = {} }: Props = $props();

	// Get the highest vote count for any ESP
	let highestVoteCount = $derived(
		Math.max(0, ...Object.values(currentVotes).map((voters) => voters.length))
	);

	// Get ESP name with highest votes (for display)
	let leadingEsp = $derived.by(() => {
		if (highestVoteCount === 0) return null;
		for (const [espName, voters] of Object.entries(currentVotes)) {
			if (voters.length === highestVoteCount) return espName;
		}
		return null;
	});
</script>

<div class="bg-white rounded-xl shadow-md p-6" data-testid="coordination-status">
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-lg font-bold text-gray-800">🔍 Joint Investigation</h2>
		{#if onCoordinationClick}
			<button
				onclick={onCoordinationClick}
				class="px-4 py-2 text-sm font-semibold text-blue-600 border-2 border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
			>
				Open Panel →
			</button>
		{/if}
	</div>

	<!-- Current Vote Status -->
	{#if myVote}
		<div class="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
			<p class="text-sm font-semibold text-blue-900">Your Vote: {myVote}</p>
			<p class="text-xs text-blue-700 mt-1">50 credits reserved for investigation</p>
		</div>
	{/if}

	<!-- Voting Summary -->
	{#if highestVoteCount > 0}
		<div class="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
			<p class="text-sm text-gray-700">
				<span class="font-semibold">{leadingEsp}</span> has {highestVoteCount}/3 votes
				{#if highestVoteCount >= 2}
					<span class="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
						Investigation will trigger!
					</span>
				{/if}
			</p>
		</div>
	{/if}

	<div class="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-l-4 border-blue-500">
		<p class="text-sm text-blue-800">
			Coordinate with other destinations to investigate ESPs with suspicious practices.
		</p>
		<p class="text-xs text-blue-600 mt-2">
			Requires 2/3 votes to launch investigation • Cost: 50 credits per voter
		</p>
	</div>
</div>
