<script lang="ts">
	/**
	 * ESPStatisticsOverview Component
	 * US-2.5: Destination Kingdom Dashboard
	 *
	 * Displays:
	 * - Grid of ESP team cards
	 * - Traffic statistics for each ESP (volume, reputation, satisfaction, spam rate)
	 * - Color-coded metrics using metrics-thresholds config
	 * - Icons for accessibility (color-blind friendly)
	 */

	import type { ESPDestinationStats } from '$lib/server/game/types';
	import {
		getReputationStatus,
		getSatisfactionStatus,
		getSpamRateStatus,
		formatSpamRate
	} from '$lib/config/metrics-thresholds';

	interface Props {
		espStats: ESPDestinationStats[];
		currentRound?: number; // Phase 4.1.1: Track round for spam complaints display
	}

	let { espStats, currentRound = 1 }: Props = $props();
</script>

<div class="bg-white rounded-xl shadow-md p-6" data-testid="esp-statistics-overview">
	<h2 class="text-lg font-bold text-gray-800 mb-4">📊 ESP Statistics Overview</h2>

	{#if espStats.length === 0}
		<div class="text-center py-8 text-gray-500">
			<p>No ESP teams active in the game yet.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
			{#each espStats as esp}
				{@const repStatus = getReputationStatus(esp.reputation)}
				{@const satStatus =
					esp.userSatisfaction !== null ? getSatisfactionStatus(esp.userSatisfaction) : null}
				{@const spamStatus = getSpamRateStatus(esp.spamComplaintRate)}

				<div
					data-testid="esp-card-{esp.espName.toLowerCase()}"
					class="border-2 border-gray-200 rounded-lg p-4 transition-all duration-300 hover:border-blue-300 hover:shadow-lg"
				>
					<!-- ESP Header -->
					<div class="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
						<!-- ESP Icon (keep green per clarification) -->
						<div
							class="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br from-emerald-700 to-emerald-500"
							data-testid="esp-icon"
						>
							<span data-testid="esp-team-code">{esp.teamCode}</span>
						</div>

						<div class="flex-1">
							<div data-testid="esp-team-name" class="font-bold text-gray-800 text-base">
								{esp.espName}
							</div>
							<div data-testid="esp-clients-count" class="text-xs text-gray-500">
								{esp.activeClientsCount} active client{esp.activeClientsCount === 1 ? '' : 's'}
							</div>
						</div>
					</div>

					<!-- Statistics Grid -->
					<div class="grid grid-cols-2 gap-3">
						<!-- Volume -->
						<div class="text-center p-2 bg-gray-50 rounded-lg">
							<div class="text-xs text-gray-500 font-semibold mb-1">Volume</div>
							<div data-testid="esp-volume" class="text-lg font-bold text-gray-800">
								{esp.volume}
							</div>
						</div>

						<!-- Reputation -->
						<div class="text-center p-2 bg-gray-50 rounded-lg">
							<div class="text-xs text-gray-500 font-semibold mb-1">Reputation</div>
							<div class="flex items-center justify-center gap-1">
								<span
									data-testid="status-icon-{repStatus.status}"
									class="text-sm"
									aria-hidden="true"
								>
									{repStatus.icon}
								</span>
								<span
									data-testid="esp-reputation"
									data-status={repStatus.status}
									class="{repStatus.color} text-lg font-bold"
								>
									{esp.reputation}
								</span>
							</div>
						</div>

						<!-- User Satisfaction -->
						<div class="text-center p-2 bg-gray-50 rounded-lg">
							<div class="text-xs text-gray-500 font-semibold mb-1">User Satisfaction</div>
							<div class="flex items-center justify-center gap-1">
								{#if esp.userSatisfaction === null}
									<!-- No satisfaction data available (no resolution history yet) -->
									<span data-testid="esp-satisfaction" class="text-lg font-bold text-gray-400">
										-
									</span>
								{:else}
									<!-- Show actual user satisfaction with color coding -->
									<span
										data-testid="status-icon-{satStatus.status}"
										class="text-sm"
										aria-hidden="true"
									>
										{satStatus.icon}
									</span>
									<span
										data-testid="esp-satisfaction"
										data-status={satStatus.status}
										class="{satStatus.color} text-lg font-bold"
									>
										{esp.userSatisfaction.toFixed(1)}%
									</span>
								{/if}
							</div>
						</div>

						<!-- Spam Complaints -->
						<!-- Phase 4.1.1+: Shows '-' when spam rate is 0 (no previous round data or no spam sent) -->
						<div class="text-center p-2 bg-gray-50 rounded-lg">
							<div class="text-xs text-gray-500 font-semibold mb-1">Spam Complaints</div>
							{#if esp.spamComplaintRate === 0}
								<!-- No spam data available (Round 1 or no spam sent) -->
								<span data-testid="esp-spam-rate" class="text-lg font-bold text-gray-400"> - </span>
							{:else}
								<!-- Show spam volume and rate -->
								<div class="flex flex-col items-center gap-1">
									<div class="flex items-center justify-center gap-1">
										<span
											data-testid="status-icon-{spamStatus.status}"
											class="text-sm"
											aria-hidden="true"
										>
											{spamStatus.icon}
										</span>
										<span data-testid="esp-spam-volume" class="text-sm font-semibold text-gray-700">
											{esp.spamComplaintVolume.toLocaleString()} emails
										</span>
									</div>
									<span
										data-testid="esp-spam-rate"
										data-status={spamStatus.status}
										class="{spamStatus.color} text-xs font-medium"
									>
										Rate: {formatSpamRate(esp.spamComplaintRate)}
									</span>
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
