<script lang="ts">
	/**
	 * ESP Consequences Display Component
	 * US-3.5: Iteration 1 - Basic Consequences Phase Display
	 *
	 * Displays resolution results for ESP teams:
	 * - Client performance (volume, delivery)
	 * - Revenue summary
	 * - Reputation changes (placeholder)
	 * - Budget update
	 * - Alerts/notifications (placeholder)
	 */

	import type { ESPResolutionResult } from '$lib/server/game/resolution-types';

	interface Props {
		teamName: string;
		resolutionData?: ESPResolutionResult;
		currentRound: number;
		currentCredits: number;
		autoCorrectionMessage?: string | null;
	}

	let { teamName, resolutionData, currentRound, currentCredits, autoCorrectionMessage }: Props =
		$props();

	// Calculate starting budget (before revenue was added)
	// currentCredits already includes the revenue, so we subtract it to get the starting value
	let actualRevenue = $derived(resolutionData?.revenue?.actualRevenue || 0);
	let startingBudget = $derived(currentCredits - actualRevenue);

	/**
	 * Get CSS class for modifier message styling
	 * @param source - Modifier source
	 * @param adjustment - Adjustment value (positive = reduction, negative = increase)
	 */
	function getModifierClass(source: string, adjustment: number): string {
		const isIncrease = adjustment < 0;

		// Positive modifiers (list hygiene) get emerald color
		if (source === 'list_hygiene') return 'text-emerald-600';

		// Warmup is neutral (gray)
		if (source === 'warmup') return 'text-gray-500';

		// Incidents that increase volume get blue
		if (isIncrease) return 'text-blue-600';

		// Other reductions get gray
		return 'text-gray-600';
	}
</script>

<div
	data-testid="esp-consequences"
	class="min-h-screen bg-gradient-to-b from-gray-50 to-emerald-50 py-8"
>
	<div class="max-w-7xl mx-auto px-4">
		<!-- Header -->
		<div class="bg-white rounded-xl shadow-lg p-6 mb-6">
			<h1 data-testid="consequences-header" class="text-3xl font-bold text-gray-900 mb-2">
				Round {currentRound} Results
			</h1>
			<h2 data-testid="consequences-team-name" class="text-xl font-semibold text-emerald-600">
				{teamName}
			</h2>
		</div>

		<!-- Consequences Sections Grid -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Section 1: Client Performance -->
			<section data-testid="section-client-performance" class="bg-white rounded-xl shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-emerald-500 pb-2">
					Client Performance
				</h3>

				<!-- Auto-correction Message (US-3.2) -->
				{#if autoCorrectionMessage && autoCorrectionMessage.includes('removed')}
					<div
						data-testid="auto-correction-message"
						class="mb-4 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-lg text-orange-800 text-sm"
						role="alert"
					>
						<div class="font-semibold mb-1">Auto-Lock Adjustment</div>
						<div class="whitespace-pre-line">{autoCorrectionMessage}</div>
					</div>
				{/if}

				{#if resolutionData?.volume?.clientVolumes && resolutionData.volume.clientVolumes.length > 0}
					<div class="space-y-3">
						{#each resolutionData.volume.clientVolumes as clientVolume}
							{@const client = resolutionData.volume.activeClients.find(
								(c) => c.id === clientVolume.clientId
							)}
							<div class="border border-gray-200 rounded-lg p-4">
								<p class="font-semibold text-gray-800">{client?.name || clientVolume.clientId}</p>
								<div class="mt-2 space-y-1 text-sm text-gray-600">
									<p>
										Volume: <span class="font-medium text-gray-900"
											>{clientVolume.adjustedVolume.toLocaleString()} emails</span
										>
									</p>
									{#if clientVolume.adjustments && Object.keys(clientVolume.adjustments).length > 0}
										{#each Object.entries(clientVolume.adjustments) as [source, adjustment]}
											<p
												class="text-xs {getModifierClass(source, adjustment.amount)}"
												data-testid="{source.replace('_', '-')}-adjustment-message"
											>
												{adjustment.description}
											</p>
										{/each}
									{/if}
								</div>
							</div>
						{/each}

						<!-- Total Volume -->
						<div class="border-t-2 border-gray-300 pt-3 mt-4">
							<p class="text-gray-800 font-semibold">
								Total Volume: <span class="text-emerald-600"
									>{(resolutionData.volume.totalVolume || 0).toLocaleString()} emails</span
								>
							</p>
						</div>

						<!-- Delivery Rate - Per Destination (Iteration 6) -->
						{#if resolutionData.delivery}
							<div class="mt-3">
								<p class="text-gray-800 font-semibold mb-2">Delivery Success Rates:</p>
								<div class="space-y-2">
									{#each Object.entries(resolutionData.delivery) as [destName, destDelivery]}
										<div class="text-sm flex items-center justify-between">
											<div class="flex items-center gap-2">
												<span class="font-medium text-gray-700">{destName}:</span>
												<span class="font-semibold text-gray-900">
													{(destDelivery.finalRate * 100).toFixed(1)}%
												</span>
												<span class="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">
													{destDelivery.zone}
												</span>
											</div>
											{#if destDelivery.filteringPenalty}
												<span class="text-xs text-orange-600 font-medium">
													-{(destDelivery.filteringPenalty * 100).toFixed(0)}% filtering
												</span>
											{/if}
										</div>
									{/each}
								</div>
								<div class="mt-3 pt-2 border-t border-gray-200">
									<p class="text-sm flex justify-between">
										<span class="text-gray-700">Aggregate Rate (for revenue):</span>
										<span class="font-semibold text-emerald-600">
											{(resolutionData.aggregateDeliveryRate * 100).toFixed(1)}%
										</span>
									</p>
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<p class="text-gray-500 text-sm italic">No clients available for this round.</p>
				{/if}
			</section>

			<!-- Section 2: Revenue Summary -->
			<section data-testid="section-revenue-summary" class="bg-white rounded-xl shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-emerald-500 pb-2">
					Revenue Summary
				</h3>

				{#if resolutionData?.revenue}
					<div class="space-y-3">
						<div class="flex justify-between items-center">
							<span class="text-gray-700">Base Revenue:</span>
							<span class="font-semibold text-gray-900"
								>{resolutionData.revenue.baseRevenue} credits</span
							>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-gray-700">Actual Revenue (after delivery):</span>
							<span class="font-bold text-emerald-600 text-xl"
								>{resolutionData.revenue.actualRevenue} credits</span
							>
						</div>

						{#if resolutionData.revenue.perClient && resolutionData.revenue.perClient.length > 0}
							<div class="mt-4 pt-4 border-t border-gray-200">
								<p class="text-sm font-semibold text-gray-700 mb-2">Per Client Breakdown:</p>
								<div class="space-y-2">
									{#each resolutionData.revenue.perClient as clientRev}
										{@const client = resolutionData.volume?.activeClients.find(
											(c) => c.id === clientRev.clientId
										)}
										<div class="text-sm flex justify-between">
											<span class="text-gray-600">{client?.name || clientRev.clientId}:</span>
											<span class="font-medium text-gray-900"
												>{clientRev.actualRevenue} credits</span
											>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<p class="text-gray-500 text-sm italic">No revenue data available.</p>
				{/if}
			</section>

			<!-- Section 3: Spam Complaints -->
			<section data-testid="section-spam-complaints" class="bg-white rounded-xl shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-emerald-500 pb-2">
					Spam Complaints
				</h3>

				{#if resolutionData?.complaints?.perClient && resolutionData.complaints.perClient.length > 0}
					<div class="space-y-3">
						{#each resolutionData.complaints.perClient as clientComplaint}
							{@const client = resolutionData.volume?.activeClients.find(
								(c) => c.id === clientComplaint.clientId
							)}
							<div
								class="border border-gray-200 rounded-lg p-4"
								data-testid="client-complaint-card"
							>
								<p class="font-semibold text-gray-800">
									{client?.name || clientComplaint.clientId}
								</p>
								<div class="mt-2 space-y-1 text-sm text-gray-600">
									<p>
										Base Complaint Rate: <span class="font-medium text-gray-900"
											>{clientComplaint.baseRate.toFixed(2)}%</span
										>
									</p>
									{#if clientComplaint.adjustedRate !== clientComplaint.baseRate}
										<p class="text-emerald-600 text-xs">
											↓ Adjusted Rate (after reductions): {clientComplaint.adjustedRate.toFixed(2)}%
										</p>
									{/if}
									<p class="text-xs text-gray-500">
										Volume: {clientComplaint.volume.toLocaleString()} emails
									</p>
								</div>
							</div>
						{/each}

						<!-- Aggregate Complaint Rate -->
						<div class="border-t-2 border-gray-300 pt-3 mt-4">
							<div class="flex justify-between items-center">
								<span class="text-gray-700">Adjusted Complaint Rate (overall):</span>
								<span
									class="font-semibold text-lg"
									class:text-emerald-600={resolutionData.complaints.adjustedComplaintRate <= 0.1}
									class:text-yellow-600={resolutionData.complaints.adjustedComplaintRate > 0.1 &&
										resolutionData.complaints.adjustedComplaintRate <= 1.0}
									class:text-red-600={resolutionData.complaints.adjustedComplaintRate > 1.0}
								>
									{resolutionData.complaints.adjustedComplaintRate.toFixed(2)}%
								</span>
							</div>
						</div>
					</div>
				{:else}
					<p class="text-gray-500 text-sm italic">No spam complaint data available.</p>
				{/if}
			</section>

			<!-- Section 4: Reputation Changes -->
			<section data-testid="section-reputation-changes" class="bg-white rounded-xl shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-emerald-500 pb-2">
					Reputation Changes
				</h3>

				{#if resolutionData?.reputation?.perDestination}
					<div class="space-y-3">
						{#each Object.entries(resolutionData.reputation.perDestination) as [destName, repChange]}
							<div class="border border-gray-200 rounded-lg p-3">
								<p class="font-semibold text-gray-800">{destName}</p>

								{#if repChange.currentReputation !== undefined && repChange.newReputation !== undefined}
									<div class="text-sm text-gray-600 mt-2 space-y-1">
										<p>
											Previous: <span class="font-medium text-gray-900"
												>{repChange.currentReputation}</span
											>
										</p>
										<p>
											Change: <span
												class="font-medium"
												class:text-emerald-600={repChange.totalChange > 0}
												class:text-red-600={repChange.totalChange < 0}
												class:text-gray-500={repChange.totalChange === 0}
											>
												{repChange.totalChange > 0 ? '+' : ''}{repChange.totalChange}
											</span>
										</p>
										<p class="font-semibold">
											New: <span
												class="font-bold text-lg"
												class:text-emerald-600={repChange.newReputation >= 70}
												class:text-yellow-600={repChange.newReputation >= 40 &&
													repChange.newReputation < 70}
												class:text-red-600={repChange.newReputation < 40}
											>
												{repChange.newReputation}
											</span>
										</p>
									</div>
								{:else}
									<p class="text-sm text-gray-600 mt-1">
										Change: <span
											class="font-medium"
											class:text-emerald-600={repChange.totalChange > 0}
											class:text-red-600={repChange.totalChange < 0}
											class:text-gray-500={repChange.totalChange === 0}
										>
											{repChange.totalChange > 0 ? '+' : ''}{repChange.totalChange}
										</span>
									</p>
								{/if}

								{#if repChange.breakdown && repChange.breakdown.length > 0}
									<div class="mt-2 text-xs text-gray-500 space-y-1">
										{#each repChange.breakdown as item}
											<p>• {item.source}: {item.value > 0 ? '+' : ''}{item.value}</p>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-gray-500 text-sm italic">
						Reputation tracking coming soon in a future iteration.
					</p>
				{/if}
			</section>

			<!-- Section 5: Budget Update -->
			<section data-testid="section-budget-update" class="bg-white rounded-xl shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-emerald-500 pb-2">
					Budget Update
				</h3>

				<div class="space-y-3">
					<div class="flex justify-between items-center">
						<span class="text-gray-700">Starting Budget:</span>
						<span class="font-semibold text-gray-900">{startingBudget} credits</span>
					</div>
					<div class="flex justify-between items-center">
						<span class="text-gray-700">Revenue Earned:</span>
						<span class="font-semibold text-emerald-600">+{actualRevenue} credits</span>
					</div>
					<div class="flex justify-between items-center pt-3 border-t-2 border-emerald-500 mt-3">
						<span class="text-gray-900 font-bold text-lg">New Budget:</span>
						<span class="font-bold text-emerald-600 text-2xl">{currentCredits} credits</span>
					</div>
				</div>

				<p class="text-xs text-gray-500 mt-4 italic">Budget has been updated for the next round.</p>
			</section>

			<!-- Section 6: Alerts & Notifications -->
			<section
				data-testid="section-alerts-notifications"
				class="bg-white rounded-xl shadow-md p-6 lg:col-span-2"
			>
				<h3 class="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-emerald-500 pb-2">
					Alerts & Notifications
				</h3>

				<!-- Phase 2: Display Incident Effects -->
				{#if resolutionData?.reputation?.perDestination || resolutionData?.volume?.clientVolumes}
					{@const reputationIncidents = resolutionData?.reputation?.perDestination
						? Object.entries(resolutionData.reputation.perDestination).flatMap(
								([destName, repChange]) =>
									(repChange.breakdown || [])
										.filter((item) => item.source.startsWith('INC-'))
										.map((item) => ({
											incidentId: item.source,
											destination: destName,
											type: 'reputation' as const,
											value: item.value,
											description: `${item.value > 0 ? '+' : ''}${item.value} reputation`
										}))
							)
						: []}
					{@const volumeIncidents = resolutionData?.volume?.clientVolumes
						? resolutionData.volume.clientVolumes.flatMap((cv) =>
								Object.entries(cv.adjustments || {})
									.filter(([source]) => source.startsWith('INC-'))
									.map(([source, adjustment]) => ({
										incidentId: source,
										type: 'volume' as const,
										description: adjustment.description
									}))
							)
						: []}
					{@const allIncidents = [...reputationIncidents, ...volumeIncidents].filter(
						(effect, index, self) =>
							index === self.findIndex((e) => e.incidentId === effect.incidentId)
					)}

					{#if allIncidents.length > 0}
						<div
							data-testid="incident-effects-summary"
							class="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg"
						>
							<p class="font-semibold text-blue-900 mb-2">Incident Effects This Round</p>
							<div class="space-y-2 text-sm">
								{#each allIncidents as effect}
									<div class="flex items-center justify-between" data-testid="incident-effect-item">
										<span class="text-blue-800 font-medium">{effect.incidentId}</span>
										<span
											class="text-gray-700"
											class:text-emerald-600={effect.type === 'reputation' &&
												effect.value &&
												effect.value > 0}
											class:text-red-600={effect.type === 'reputation' &&
												effect.value &&
												effect.value < 0}
										>
											{effect.description}
										</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				{/if}

				<!-- Future alerts placeholder -->
				<div class="text-sm text-gray-400">
					<p>Future alert features will include:</p>
					<ul class="list-disc list-inside ml-4 mt-2 space-y-1">
						<li>Low reputation warnings</li>
						<li>High complaint rate alerts</li>
						<li>Mandatory technology reminders</li>
						<li>Budget deficit notifications</li>
					</ul>
				</div>
			</section>
		</div>
	</div>
</div>
