<script lang="ts">
	/**
	 * ClientPortfolio Component
	 * US-2.1: ESP Team Dashboard
	 *
	 * Displays:
	 * - List of active clients with details
	 * - Client status badges (Active/Paused)
	 * - Empty state with CTA to marketplace
	 * - Client count in header
	 */

	interface Client {
		name: string;
		status: 'Active' | 'Paused';
		revenue?: number;
		volume?: string;
		risk?: 'Low' | 'Medium' | 'High';
	}

	interface Props {
		clients?: Client[];
		onMarketplaceClick?: () => void;
	}

	let { clients = [], onMarketplaceClick }: Props = $props();

	// Count active clients
	let activeClientCount = $derived(clients.filter((c) => c.status === 'Active').length);

	// Risk color mapping
	function getRiskColor(risk?: string): string {
		switch (risk) {
			case 'Low':
				return 'text-green-600 bg-green-50';
			case 'Medium':
				return 'text-yellow-600 bg-yellow-50';
			case 'High':
				return 'text-red-600 bg-red-50';
			default:
				return 'text-gray-600 bg-gray-50';
		}
	}
</script>

<div class="bg-white rounded-xl shadow-md p-6">
	<!-- Header with Client Count -->
	<div
		data-testid="portfolio-header"
		class="flex items-center justify-between mb-4"
	>
		<h2 class="text-lg font-bold text-gray-800">Active Portfolio</h2>
		<span class="text-sm text-gray-600">
			{activeClientCount} active {activeClientCount === 1 ? 'client' : 'clients'}
		</span>
	</div>

	<div data-testid="client-portfolio">
		{#if clients.length === 0}
			<!-- Empty State -->
			<div
				data-testid="portfolio-empty-state"
				class="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
			>
				<div class="text-4xl mb-4">📭</div>
				<p class="text-gray-700 mb-4">
					No clients yet. Visit the Client Marketplace to acquire your first client.
				</p>
				<button
					data-testid="cta-marketplace"
					onclick={onMarketplaceClick}
					class="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
				>
					Go to Client Marketplace
				</button>
			</div>
		{:else}
			<!-- Client List -->
			<div class="space-y-3">
				{#each clients as client, index}
					<div
						data-testid="client-card-{index}"
						data-status={client.status.toLowerCase()}
						class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
					>
						<div class="flex items-start justify-between">
							<!-- Client Info -->
							<div class="flex-1">
								<div class="flex items-center gap-3 mb-2">
									<h3 class="font-semibold text-gray-800">{client.name}</h3>
									<span
										data-testid="client-status-badge-{index}"
										class="px-2 py-1 rounded-full text-xs font-medium {client.status ===
										'Active'
											? 'bg-green-100 text-green-700'
											: 'bg-orange-100 text-orange-700'}"
									>
										{client.status}
									</span>
								</div>

								<!-- Client Details -->
								<div class="flex items-center gap-4 text-sm text-gray-600">
									{#if client.revenue !== undefined}
										<div class="flex items-center gap-1">
											<span class="font-medium">Revenue:</span>
											<span>{client.revenue} credits/round</span>
										</div>
									{/if}

									{#if client.volume}
										<div class="flex items-center gap-1">
											<span class="font-medium">Volume:</span>
											<span>{client.volume} emails/round</span>
										</div>
									{/if}

									{#if client.risk}
										<div class="flex items-center gap-1">
											<span class="font-medium">Risk:</span>
											<span class="px-2 py-0.5 rounded text-xs {getRiskColor(client.risk)}">
												{client.risk}
											</span>
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
