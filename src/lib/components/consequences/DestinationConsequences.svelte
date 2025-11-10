<script lang="ts">
	/**
	 * Destination Consequences Display Component
	 * US-3.5: Iteration 1 - Basic Consequences Phase Display
	 *
	 * Displays resolution results for Destination players:
	 * - Spam blocking (placeholder - requires US-3.3 Iteration 6)
	 * - User satisfaction (placeholder - requires US-3.3 Iteration 6)
	 * - Revenue summary (current budget)
	 * - Budget update (placeholder)
	 * - ESP behavior analysis (placeholder - requires US-3.3 Iteration 6)
	 */

	interface Props {
		destinationName: string;
		currentRound: number;
		budget: number;
	}

	let { destinationName, currentRound, budget }: Props = $props();
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

				<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<p class="text-blue-800 font-semibold mb-2">Coming Soon</p>
					<p class="text-sm text-blue-700">
						Spam blocking metrics require implementation of US-3.3 Iteration 6.
					</p>
					<div class="mt-3 text-xs text-blue-600">
						<p>Future metrics will include:</p>
						<ul class="list-disc list-inside ml-4 mt-1 space-y-1">
							<li>Spam emails blocked successfully</li>
							<li>False positive rate</li>
							<li>Filtering effectiveness by ESP</li>
						</ul>
					</div>
				</div>
			</section>

			<!-- Section 2: User Satisfaction -->
			<section data-testid="section-user-satisfaction" class="bg-white rounded-xl shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-blue-500 pb-2">
					User Satisfaction
				</h3>

				<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<p class="text-blue-800 font-semibold mb-2">Coming Soon</p>
					<p class="text-sm text-blue-700">
						User satisfaction metrics require implementation of US-3.3 Iteration 6.
					</p>
					<div class="mt-3 text-xs text-blue-600">
						<p>Future metrics will include:</p>
						<ul class="list-disc list-inside ml-4 mt-1 space-y-1">
							<li>Overall user satisfaction score</li>
							<li>Complaints from legitimate senders</li>
							<li>Impact of false positives on users</li>
						</ul>
					</div>
				</div>
			</section>

			<!-- Section 3: Revenue Summary -->
			<section data-testid="section-revenue-summary" class="bg-white rounded-xl shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-blue-500 pb-2">
					Revenue Summary
				</h3>

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
			</section>

			<!-- Section 4: Budget Update -->
			<section data-testid="section-budget-update" class="bg-white rounded-xl shadow-md p-6">
				<h3 class="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-blue-500 pb-2">
					Budget Update
				</h3>

				<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<p class="text-blue-800 font-semibold mb-2">Coming Soon</p>
					<p class="text-sm text-blue-700">
						Budget impact calculations will be available in future iterations.
					</p>
					<div class="mt-3 text-xs text-blue-600">
						<p>Future budget factors will include:</p>
						<ul class="list-disc list-inside ml-4 mt-1 space-y-1">
							<li>Costs of filtering operations</li>
							<li>Revenue from legitimate traffic</li>
							<li>Penalties for false positives</li>
							<li>Bonuses for effective spam blocking</li>
						</ul>
					</div>
				</div>
			</section>

			<!-- Section 5: ESP Behavior Analysis -->
			<section
				data-testid="section-esp-behavior"
				class="bg-white rounded-xl shadow-md p-6 lg:col-span-2"
			>
				<h3 class="text-lg font-semibold text-gray-900 mb-4 border-b-2 border-blue-500 pb-2">
					ESP Behavior Analysis
				</h3>

				<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<p class="text-blue-800 font-semibold mb-2">Coming Soon</p>
					<p class="text-sm text-blue-700">
						ESP behavior tracking requires implementation of US-3.3 Iteration 6.
					</p>
					<div class="mt-3 text-xs text-blue-600">
						<p>Future analytics will include:</p>
						<ul class="list-disc list-inside ml-4 mt-1 space-y-1">
							<li>ESP traffic volume and patterns</li>
							<li>Spam rates by ESP</li>
							<li>Authentication compliance</li>
							<li>Historical behavior trends</li>
						</ul>
					</div>
				</div>
			</section>
		</div>
	</div>
</div>
