<script lang="ts">
	/**
	 * Destination Consequences Display Component
	 * US-3.5: Iteration 1 & 3 - Consequences Phase Display
	 *
	 * Displays resolution results for Destination players:
	 * - Spam blocking (US-3.3 Iteration 6.1)
	 * - User satisfaction (US-3.3 Iteration 6.1)
	 * - Revenue summary with breakdown (US-3.3 Iteration 6.1)
	 * - Budget update
	 * - ESP behavior analysis (US-3.3 Iteration 6.1)
	 */

	import type {
		DestinationResolutionResult,
		SatisfactionResult
	} from '$lib/server/game/resolution-types';

	interface Props {
		destinationName: string;
		currentRound: number;
		budget: number;
		resolution?: DestinationResolutionResult; // US-3.3 Iteration 6.1 data
		espSatisfactionBreakdown?: Record<string, SatisfactionResult>; // Per-ESP satisfaction for behavior analysis
	}

	let { destinationName, currentRound, budget, resolution, espSatisfactionBreakdown }: Props =
		$props();
</script>

<div
	data-testid="destination-consequences"
	class="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 py-8"
>
	<div class="max-w-7xl mx-auto px-4">
		<!-- Header -->
		<div class="bg-white rounded-xl shadow-lg p-6 mb-6">
			<h1 data-testid="consequences-header" class="text-3xl font-bold text-gray-900 mb-2">
				Round {currentRound} Results
			</h1>
			<h2 data-testid="consequences-team-name" class="text-xl font-semibold text-blue-600">
				{destinationName}
			</h2>
		</div>

		<!-- Consequences Sections Grid -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Section 1: Spam Blocking -->
			<section data-testid="section-spam-blocking" class="bg-white rounded-xl shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-blue-500 pb-2">
					Spam Blocking Performance
				</h3>

				{#if resolution?.aggregatedSatisfaction !== undefined}
					<!-- Display actual spam blocking metrics -->
					<div class="space-y-4">
						<!-- Phase 4.2.1: Removed duplicate satisfaction display - kept only in User Satisfaction section -->

						<!-- Per-ESP Satisfaction Breakdown -->
						{#if espSatisfactionBreakdown}
							<div class="mt-4">
								<h4 class="text-sm font-semibold text-gray-700 mb-2">
									Filtering Effectiveness by ESP
								</h4>
								<div class="space-y-2">
									{#each Object.entries(espSatisfactionBreakdown) as [espName, satisfactionResult]}
										<div class="bg-gray-50 border border-gray-200 rounded p-3">
											<div class="flex justify-between items-center">
												<span class="font-medium text-gray-900">{espName}</span>
												<span
													class="text-sm font-semibold"
													class:text-green-600={satisfactionResult.perDestination[
														destinationName
													] >= 80}
													class:text-yellow-600={satisfactionResult.perDestination[
														destinationName
													] >= 60 && satisfactionResult.perDestination[destinationName] < 80}
													class:text-red-600={satisfactionResult.perDestination[destinationName] <
														60}
												>
													{Math.round(satisfactionResult.perDestination[destinationName])}%
													satisfaction
												</span>
											</div>
											<!-- Show breakdown if available -->
											{#if satisfactionResult.breakdown}
												{@const destBreakdown = satisfactionResult.breakdown.find(
													(b) => b.destination === destinationName
												)}
												{#if destBreakdown}
													<div class="mt-2 text-xs text-gray-600 space-y-1">
														<div class="flex justify-between">
															<span>Spam Blocked:</span>
															<span class="font-medium text-green-600">
																{Math.round(destBreakdown.spam_blocked_percentage)}%
															</span>
														</div>
														<div class="flex justify-between">
															<span>Spam Delivered:</span>
															<span class="font-medium text-red-600">
																{Math.round(destBreakdown.spam_through_percentage)}%
															</span>
														</div>
														<div class="flex justify-between">
															<span>False Positives (legitimate blocked):</span>
															<span class="font-medium text-orange-600">
																{Math.round(destBreakdown.false_positive_percentage)}%
															</span>
														</div>
													</div>
												{/if}
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<!-- No resolution data available -->
					<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
						<p class="text-gray-600 text-sm">No spam blocking data available for this round.</p>
					</div>
				{/if}
			</section>

			<!-- Section 2: User Satisfaction -->
			<section data-testid="section-user-satisfaction" class="bg-white rounded-xl shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-blue-500 pb-2">
					User Satisfaction
				</h3>

				{#if resolution?.aggregatedSatisfaction !== undefined}
					<!-- Display actual satisfaction -->
					<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
						<p class="text-sm text-gray-600 mb-2">Aggregated User Satisfaction</p>
						<div class="flex items-baseline gap-2">
							<p class="text-4xl font-bold text-blue-600">
								{Math.round(resolution.aggregatedSatisfaction)}
							</p>
							<p class="text-lg text-gray-500">/ 100</p>
						</div>

						<!-- Satisfaction description -->
						<p class="text-xs text-gray-500 mt-3">
							{#if resolution.aggregatedSatisfaction >= 90}
								Excellent! Your users are very happy with your spam filtering.
							{:else if resolution.aggregatedSatisfaction >= 80}
								Very Good! Users are satisfied with your filtering performance.
							{:else if resolution.aggregatedSatisfaction >= 75}
								Good performance. Continue maintaining this level.
							{:else if resolution.aggregatedSatisfaction >= 70}
								Acceptable, but there's room for improvement.
							{:else if resolution.aggregatedSatisfaction >= 60}
								Warning: User satisfaction is declining. Review your filtering strategy.
							{:else if resolution.aggregatedSatisfaction >= 50}
								Poor: Users are unhappy. Immediate action recommended.
							{:else}
								Crisis: Users are very unhappy. Urgent filtering adjustments needed.
							{/if}
						</p>
					</div>
					<!-- Phase 4.2.1: Add "why" explanation for satisfaction changes -->
					{@const aggregatedSpamPenalty = espSatisfactionBreakdown
						? Object.values(espSatisfactionBreakdown).reduce((total, espSat) => {
								const destBreakdown = espSat.breakdown?.find(
									(b) => b.destination === destinationName
								);
								return total + (destBreakdown?.spam_penalty || 0);
							}, 0)
						: 0}
					{@const aggregatedFPPenalty = espSatisfactionBreakdown
						? Object.values(espSatisfactionBreakdown).reduce((total, espSat) => {
								const destBreakdown = espSat.breakdown?.find(
									(b) => b.destination === destinationName
								);
								return total + (destBreakdown?.false_positive_penalty || 0);
							}, 0)
						: 0}

					{#if aggregatedSpamPenalty > 0 || aggregatedFPPenalty > 0}
						<div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
							<p class="text-sm font-semibold text-amber-900 mb-1">Why is satisfaction changing?</p>
							<p class="text-xs text-amber-800">
								{#if aggregatedSpamPenalty > aggregatedFPPenalty}
									Users are receiving too much spam. Consider increasing filtering levels to block
									more spam emails.
								{:else if aggregatedFPPenalty > aggregatedSpamPenalty}
									Too many legitimate emails are being blocked (false positives). Consider reducing
									filtering levels to allow more legitimate mail through.
								{:else}
									Both spam delivery and false positives are impacting user satisfaction. Balance
									your filtering strategy carefully.
								{/if}
							</p>
						</div>
					{/if}

					<!-- Volume Processed -->
					<div class="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
						<p class="text-sm text-gray-600">Total Emails Processed</p>
						<p class="text-2xl font-bold text-gray-900">
							{resolution.totalVolume.toLocaleString()}
						</p>
					</div>
				{:else}
					<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
						<p class="text-gray-600 text-sm">No satisfaction data available for this round.</p>
					</div>
				{/if}
			</section>

			<!-- Section 3: Revenue Summary -->
			<section data-testid="section-revenue-summary" class="bg-white rounded-xl shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-blue-500 pb-2">
					Revenue Summary
				</h3>

				{#if resolution?.revenue}
					<div class="space-y-3">
						<!-- Total Revenue (Highlighted) -->
						<div class="bg-blue-50 border-2 border-blue-400 rounded-lg p-4">
							<p class="text-sm text-gray-600 mb-1">Total Revenue Earned</p>
							<p class="font-bold text-blue-600 text-4xl">
								{resolution.revenue.totalRevenue} credits
							</p>
						</div>

						<!-- Revenue Breakdown -->
						<div class="space-y-2 text-sm">
							<div class="flex justify-between items-center py-2 border-b border-gray-200">
								<span class="text-gray-700">Base Revenue:</span>
								<span class="font-semibold text-gray-900">
									{resolution.revenue.baseRevenue} credits
								</span>
							</div>

							<div class="flex justify-between items-center py-2 border-b border-gray-200">
								<span class="text-gray-700">Volume Bonus:</span>
								<span class="font-semibold text-blue-600">
									+{resolution.revenue.volumeBonus} credits
								</span>
							</div>

							<div class="flex justify-between items-center py-2 border-b border-gray-200">
								<span class="text-gray-700">Satisfaction Multiplier:</span>
								<span
									class="font-semibold"
									class:text-green-600={resolution.revenue.satisfactionMultiplier >= 1.1}
									class:text-gray-600={resolution.revenue.satisfactionMultiplier >= 0.95 &&
										resolution.revenue.satisfactionMultiplier < 1.1}
									class:text-red-600={resolution.revenue.satisfactionMultiplier < 0.95}
								>
									×{resolution.revenue.satisfactionMultiplier}
									({resolution.revenue.satisfactionTier})
								</span>
							</div>
						</div>

						<!-- Formula Explanation -->
						<div class="mt-4 bg-gray-50 rounded p-3 text-xs text-gray-600">
							<p class="font-semibold mb-1">Revenue Calculation:</p>
							<p>
								({resolution.revenue.baseRevenue} base + {resolution.revenue.volumeBonus} volume bonus)
								× {resolution.revenue.satisfactionMultiplier} satisfaction =
								<span class="font-bold text-blue-600"
									>{resolution.revenue.totalRevenue} credits</span
								>
							</p>
						</div>
					</div>
				{:else}
					<div class="space-y-3">
						<div class="flex justify-between items-center">
							<span class="text-gray-700">Current Budget:</span>
							<span class="font-bold text-blue-600 text-2xl">{budget} credits</span>
						</div>

						<div class="mt-4 pt-4 border-t border-gray-200">
							<p class="text-sm text-gray-600">
								Your budget represents available funds for technical upgrades and operations.
							</p>
						</div>
					</div>
				{/if}
			</section>

			<!-- Section 4: Budget Update -->
			<section data-testid="section-budget-update" class="bg-white rounded-xl shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-blue-500 pb-2">
					Budget Update
				</h3>

				{#if resolution?.revenue}
					<div class="space-y-4">
						<!-- Budget Change Summary -->
						<div class="bg-green-50 border border-green-200 rounded-lg p-4">
							<p class="text-sm text-gray-600 mb-1">Revenue Earned This Round</p>
							<p class="text-3xl font-bold text-green-600">
								+{resolution.revenue.totalRevenue} credits
							</p>
						</div>

						<!-- Budget Calculation -->
						<div class="space-y-2 text-sm">
							<div class="flex justify-between items-center">
								<span class="text-gray-700">Previous Budget:</span>
								<span class="font-medium text-gray-900">{budget} credits</span>
							</div>
							<div class="flex justify-between items-center text-green-600">
								<span>+ Revenue Earned:</span>
								<span class="font-medium">+{resolution.revenue.totalRevenue} credits</span>
							</div>
							<div class="flex justify-between items-center pt-2 border-t-2 border-gray-300">
								<span class="font-semibold text-gray-900">New Budget:</span>
								<span class="font-bold text-blue-600 text-xl">
									{budget + resolution.revenue.totalRevenue} credits
								</span>
							</div>
						</div>
					</div>
				{:else}
					<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
						<p class="text-gray-600 text-sm">
							Budget impact will be calculated when revenue data is available.
						</p>
					</div>
				{/if}
			</section>

			<!-- Section 5: ESP Behavior Analysis -->
			<section
				data-testid="section-esp-behavior"
				class="bg-white rounded-xl shadow-md p-6 lg:col-span-2"
			>
				<h3 class="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-blue-500 pb-2">
					ESP Behavior Analysis
				</h3>

				{#if espSatisfactionBreakdown && Object.keys(espSatisfactionBreakdown).length > 0}
					<div class="space-y-3">
						{#each Object.entries(espSatisfactionBreakdown) as [espName, satisfactionResult]}
							{@const destSatisfaction = satisfactionResult.perDestination[destinationName]}
							<div
								class="border rounded-lg p-4"
								class:border-green-300={destSatisfaction >= 80}
								class:bg-green-50={destSatisfaction >= 80}
								class:border-yellow-300={destSatisfaction >= 60 && destSatisfaction < 80}
								class:bg-yellow-50={destSatisfaction >= 60 && destSatisfaction < 80}
								class:border-red-300={destSatisfaction < 60}
								class:bg-red-50={destSatisfaction < 60}
							>
								<div class="flex justify-between items-start">
									<div>
										<h4 class="font-semibold text-gray-900">{espName}</h4>
										<p class="text-sm text-gray-600">
											Satisfaction: {Math.round(destSatisfaction)}%
										</p>
									</div>

									<!-- Alert/Recognition Badge -->
									{#if destSatisfaction < 60}
										<span class="px-3 py-1 bg-red-200 text-red-800 text-xs font-semibold rounded">
											⚠️ High Spam Risk
										</span>
									{:else if destSatisfaction >= 90}
										<span
											class="px-3 py-1 bg-green-200 text-green-800 text-xs font-semibold rounded"
										>
											✅ Excellent Performance
										</span>
									{/if}
								</div>

								<!-- Alert Messages -->
								{#if destSatisfaction < 60}
									<p class="mt-2 text-sm text-red-700">
										This ESP is generating significant user complaints. Consider increasing
										filtering level to protect your users.
									</p>
								{:else if destSatisfaction >= 90}
									<p class="mt-2 text-sm text-green-700">
										This ESP maintains excellent email quality and user engagement. Great
										partnership!
									</p>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
						<p class="text-gray-600 text-sm">No ESP behavior data available for this round.</p>
					</div>
				{/if}
			</section>
		</div>
	</div>
</div>
