<script lang="ts">
	/**
	 * Victory Screen Component
	 * US-5.2: Victory Screen
	 *
	 * Displays final game results including:
	 * - Winner announcement
	 * - ESP leaderboard with rankings and score breakdowns
	 * - Destination collaborative results
	 */

	import type { FinalScoreOutput } from '$lib/server/game/final-score-types';

	interface Props {
		finalScores: FinalScoreOutput | null;
	}

	let { finalScores }: Props = $props();

	// Get winner display info
	let hasWinner = $derived(finalScores?.winner !== null);
	let isJointWin = $derived((finalScores?.winner?.espNames?.length || 0) > 1);
	let winnerNames = $derived(finalScores?.winner?.espNames?.join(' & ') || 'No Qualified Winner');

	// Destination results
	let destinationSuccess = $derived(finalScores?.destinationResults?.success || false);
	let collaborativeScore = $derived(
		finalScores?.destinationResults?.collaborativeScore?.toFixed(2) || '0.00'
	);

	/**
	 * Format score to 2 decimal places
	 */
	function formatScore(score: number): string {
		return score.toFixed(2);
	}

	/**
	 * Get reputation level label
	 */
	function getReputationLabel(value: number): string {
		if (value >= 90) return 'Excellent';
		if (value >= 70) return 'Good';
		if (value >= 50) return 'Warning';
		if (value >= 30) return 'Poor';
		return 'Blacklisted';
	}

	/**
	 * Get reputation color class
	 */
	function getReputationColor(value: number): string {
		if (value >= 90) return 'text-green-600 bg-green-100';
		if (value >= 70) return 'text-blue-600 bg-blue-100';
		if (value >= 50) return 'text-yellow-600 bg-yellow-100';
		if (value >= 30) return 'text-orange-600 bg-orange-100';
		return 'text-red-600 bg-red-100';
	}

	/**
	 * Get rank medal emoji
	 */
	function getRankMedal(rank: number): string {
		if (rank === 1) return '🥇';
		if (rank === 2) return '🥈';
		if (rank === 3) return '🥉';
		return '';
	}

	/**
	 * Get rank background class
	 */
	function getRankBackground(rank: number, qualified: boolean): string {
		if (!qualified) return 'bg-gray-100 opacity-60';
		if (rank === 1) return 'bg-yellow-50 border-yellow-300';
		if (rank === 2) return 'bg-gray-50 border-gray-300';
		if (rank === 3) return 'bg-orange-50 border-orange-200';
		return 'bg-white border-gray-200';
	}
</script>

<div data-testid="victory-screen" class="min-h-screen bg-gradient-to-b from-gray-50 to-emerald-50">
	{#if !finalScores || !finalScores.espResults}
		<!-- Loading state while waiting for final scores -->
		<div class="max-w-5xl mx-auto px-4 py-8 text-center">
			<div
				class="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"
			></div>
			<h2 class="text-xl font-semibold text-gray-700">Loading final results...</h2>
		</div>
	{:else}
		<div class="max-w-5xl mx-auto px-4 py-8">
			<!-- Winner Announcement -->
			<div data-testid="winner-announcement" class="text-center mb-8">
				{#if hasWinner}
					<div class="text-6xl mb-4">{isJointWin ? '🏆🏆' : '🏆'}</div>
					<h1 class="text-3xl font-bold text-gray-900 mb-2">
						{isJointWin ? 'Joint Winners!' : 'Congratulations!'}
					</h1>
					<p class="text-2xl font-semibold text-emerald-600">{winnerNames}</p>
					<p class="text-gray-600 mt-2">
						{isJointWin
							? 'You are the Email Deliverability Champions!'
							: 'You are the Email Deliverability Champion!'}
					</p>
				{:else}
					<div class="text-6xl mb-4">⚠️</div>
					<h1 class="text-3xl font-bold text-gray-900 mb-2">No Qualified Winner</h1>
					<p class="text-gray-600">All teams failed to meet the minimum reputation requirements.</p>
					<p class="text-sm text-gray-500 mt-2">
						Maintain a reputation of at least 60 in all kingdoms to qualify.
					</p>
				{/if}
			</div>

			<!-- ESP Leaderboard -->
			<div data-testid="esp-leaderboard" class="bg-white rounded-xl shadow-md p-6 mb-6">
				<h2 class="text-xl font-bold text-gray-900 mb-4">ESP Rankings</h2>

				<div class="space-y-4">
					{#if finalScores?.espResults}
						{#each finalScores.espResults as esp}
							<div
								data-testid="esp-entry-{esp.espName.toLowerCase()}"
								class="border rounded-lg p-4 {getRankBackground(esp.rank, esp.qualified)}"
							>
								<div class="flex items-center justify-between mb-3">
									<div class="flex items-center gap-3">
										<span class="text-2xl font-bold text-gray-500">#{esp.rank}</span>
										<span class="text-xl">{getRankMedal(esp.rank)}</span>
										<span class="text-lg font-semibold text-gray-900">{esp.espName}</span>
										{#if !esp.qualified}
											<span
												data-testid="qualification-status"
												class="px-2 py-0.5 text-xs font-bold text-red-700 bg-red-100 rounded"
											>
												DISQUALIFIED
											</span>
										{:else}
											<span
												data-testid="qualification-status"
												class="px-2 py-0.5 text-xs font-bold text-green-700 bg-green-100 rounded"
											>
												QUALIFIED
											</span>
										{/if}
									</div>
									<div data-testid="total-score" class="text-2xl font-bold text-gray-900">
										{formatScore(esp.totalScore)} pts
									</div>
								</div>

								{#if !esp.qualified && esp.disqualificationReason}
									<div
										class="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700"
									>
										⚠️ {esp.disqualificationReason}
									</div>
								{/if}

								<!-- Score Breakdown -->
								<div class="grid grid-cols-3 gap-4 text-sm">
									<div class="text-center p-2 bg-gray-50 rounded">
										<div class="text-gray-500">Reputation (50%)</div>
										<div data-testid="reputation-score" class="font-bold text-gray-900">
											{formatScore(esp.scoreBreakdown.reputationScore)} / 50
										</div>
										<div class="text-xs text-gray-500">
											Weighted: {formatScore(esp.scoreBreakdown.weightedReputation)}
										</div>
									</div>
									<div class="text-center p-2 bg-gray-50 rounded">
										<div class="text-gray-500">Revenue (35%)</div>
										<div data-testid="revenue-score" class="font-bold text-gray-900">
											{formatScore(esp.scoreBreakdown.revenueScore)} / 35
										</div>
										<div class="text-xs text-gray-500">
											Total: {esp.totalRevenue.toLocaleString()} cr
										</div>
									</div>
									<div class="text-center p-2 bg-gray-50 rounded">
										<div class="text-gray-500">Technical (15%)</div>
										<div data-testid="technical-score" class="font-bold text-gray-900">
											{formatScore(esp.scoreBreakdown.technicalScore)} / 15
										</div>
										<div class="text-xs text-gray-500">
											Invested: {esp.totalTechInvestments.toLocaleString()} cr
										</div>
									</div>
								</div>

								<!-- Kingdom Reputations -->
								<div class="mt-3 flex gap-2 justify-center">
									{#each Object.entries(esp.reputationByKingdom) as [kingdom, value]}
										<div
											class="px-3 py-1 rounded-full text-sm font-medium {getReputationColor(value)}"
										>
											{kingdom}: {value}
										</div>
									{/each}
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</div>

			<!-- Destination Results -->
			<div data-testid="destination-results" class="bg-white rounded-xl shadow-md p-6">
				<h2 class="text-xl font-bold text-gray-900 mb-4">Destination Results</h2>

				<!-- Success/Failure Banner -->
				{#if destinationSuccess}
					<div
						data-testid="destination-success"
						class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center"
					>
						<div class="text-4xl mb-2">✅</div>
						<h3 class="text-lg font-bold text-green-800">Destinations Succeeded!</h3>
						<p class="text-green-700">Email industry remains trusted by users.</p>
					</div>
				{:else}
					<div
						data-testid="destination-failure"
						class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-center"
					>
						<div class="text-4xl mb-2">❌</div>
						<h3 class="text-lg font-bold text-red-800">Destinations Failed</h3>
						<p class="text-red-700">Users lost trust in email communications.</p>
					</div>
				{/if}

				<!-- Collaborative Score -->
				<div data-testid="collaborative-score" class="text-center mb-4">
					<div class="text-3xl font-bold text-gray-900">{collaborativeScore}</div>
					<div class="text-gray-500">Collaborative Score (80 required)</div>
				</div>

				<!-- Score Breakdown -->
				{#if finalScores?.destinationResults?.scoreBreakdown}
					<div class="grid grid-cols-3 gap-4 text-sm">
						<div class="text-center p-3 bg-gray-50 rounded">
							<div class="text-gray-500">Industry Protection</div>
							<div class="font-bold text-gray-900">
								{formatScore(finalScores.destinationResults.scoreBreakdown.industryProtection)} / 40
							</div>
						</div>
						<div class="text-center p-3 bg-gray-50 rounded">
							<div class="text-gray-500">Coordination Bonus</div>
							<div class="font-bold text-gray-900">
								{formatScore(finalScores.destinationResults.scoreBreakdown.coordinationBonus)}
							</div>
							<div class="text-xs text-gray-400">(Feature coming soon)</div>
						</div>
						<div class="text-center p-3 bg-gray-50 rounded">
							<div class="text-gray-500">User Satisfaction</div>
							<div class="font-bold text-gray-900">
								{formatScore(finalScores.destinationResults.scoreBreakdown.userSatisfaction)} / 40
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Calculation Timestamp -->
			{#if finalScores?.metadata?.calculationTimestamp}
				<div class="text-center mt-4 text-sm text-gray-400">
					Calculated at: {new Date(finalScores.metadata.calculationTimestamp).toLocaleString()}
				</div>
			{/if}
		</div>
	{/if}
</div>
