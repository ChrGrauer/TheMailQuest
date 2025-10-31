<script lang="ts">
	/**
	 * ESP Team Dashboard Page
	 * US-2.1: ESP Team Dashboard
	 *
	 * Main dashboard for ESP teams showing:
	 * - Budget (current + forecast)
	 * - Reputation gauges per destination
	 * - Active client portfolio
	 * - Technical infrastructure status
	 * - Game state (round, timer)
	 * - Quick actions (marketplace, tech shop, client management)
	 * - Lock-in button
	 */

	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { websocketStore, type ESPDashboardUpdate } from '$lib/stores/websocket';
	import DashboardHeader from '$lib/components/shared/DashboardHeader.svelte';
	import ReputationGauges from '$lib/components/esp-dashboard/ReputationGauges.svelte';
	import ClientPortfolio from '$lib/components/esp-dashboard/ClientPortfolio.svelte';
	import TechnicalInfrastructure from '$lib/components/esp-dashboard/TechnicalInfrastructure.svelte';
	import QuickActions from '$lib/components/esp-dashboard/QuickActions.svelte';
	import LockInButton from '$lib/components/esp-dashboard/LockInButton.svelte';
	import ClientMarketplaceModal from '$lib/components/esp-dashboard/ClientMarketplaceModal.svelte';
	import TechnicalShopModal from '$lib/components/esp-dashboard/TechnicalShopModal.svelte';

	// Get params from page store
	let roomCode = $derived($page.params.roomCode || '');
	let teamName = $derived($page.params.teamName || '');

	// Dashboard state
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Team data
	let credits = $state(1000);
	let pendingCosts = $state(0);
	let reputation = $state<Record<string, number>>({ Gmail: 70, Outlook: 70, Yahoo: 70 });
	let clients = $state<
		Array<{
			name: string;
			status: 'Active' | 'Paused';
			revenue?: number;
			volume?: string;
			risk?: 'Low' | 'Medium' | 'High';
		}>
	>([]);
	let availableClientsCount = $state(0);
	let ownedTech = $state<string[]>([]);

	// Game state
	let currentRound = $state(1);
	let totalRounds = $state(4);
	let currentPhase = $state('planning');
	let timerSeconds = $state(300);

	// Destinations with weights
	let destinations = $state([
		{ name: 'Gmail', weight: 50 },
		{ name: 'Outlook', weight: 30 },
		{ name: 'Yahoo', weight: 20 }
	]);

	// UI state
	let showMarketplace = $state(false);
	let showTechShop = $state(false);

	// Test state for WebSocket status (used by E2E tests)
	let testWsConnected = $state<boolean | null>(null);
	let testWsError = $state<string | null>(null);

	// WebSocket connection status (use test values if set)
	let wsConnected = $derived(testWsConnected !== null ? testWsConnected : $websocketStore.connected);
	let wsError = $derived(testWsError !== null ? testWsError : $websocketStore.error);

	/**
	 * Fetch initial dashboard data from API
	 */
	async function fetchDashboardData() {
		try {
			loading = true;
			error = null;

			const response = await fetch(`/api/sessions/${roomCode}/esp/${teamName}`);
			const data = await response.json();

			if (!data.success) {
				throw new Error(data.error || 'Failed to load dashboard data');
			}

			// Update team data
			credits = data.team.credits || 1000;
			reputation = data.team.reputation || { Gmail: 70, Outlook: 70, Yahoo: 70 };
			clients = data.team.active_clients || [];
			availableClientsCount = data.team.available_clients_count || 0;
			ownedTech = data.team.owned_tech_upgrades || []; // US-2.3

			// Update game state
			currentRound = data.game.current_round || 1;
			currentPhase = data.game.current_phase || 'planning';

			// Update timer
			if (data.game.timer) {
				timerSeconds = data.game.timer.remaining || 300;
			}

			// Update destinations
			if (data.destinations) {
				destinations = data.destinations;
			}

			loading = false;
		} catch (err) {
			error = (err as Error).message;
			loading = false;
		}
	}

	/**
	 * Handle real-time dashboard updates from WebSocket
	 */
	function handleDashboardUpdate(update: ESPDashboardUpdate) {
		if (update.credits !== undefined) {
			credits = update.credits;
		}

		if (update.reputation) {
			reputation = { ...reputation, ...update.reputation };
		}

		if (update.clients) {
			clients = update.clients;
		}

		if (update.available_clients_count !== undefined) {
			availableClientsCount = update.available_clients_count;
		}

		if (update.owned_tech_upgrades) {
			ownedTech = update.owned_tech_upgrades; // US-2.3
		}

		if (update.pending_costs !== undefined) {
			pendingCosts = update.pending_costs;
		}
	}

	/**
	 * Handle game state updates (phase, round, timer)
	 */
	function handleGameStateUpdate(data: any) {
		if (data.phase) {
			currentPhase = data.phase;
		}

		if (data.round !== undefined) {
			currentRound = data.round;
		}

		if (data.timer_remaining !== undefined) {
			timerSeconds = data.timer_remaining;
		}
	}

	/**
	 * Calculate overall reputation as weighted average
	 * Gmail: 50%, Outlook: 30%, Yahoo: 20%
	 */
	function calculateOverallReputation(
		rep: Record<string, number>,
		dests: Array<{ name: string; weight: number }>
	): number {
		let weightedSum = 0;
		let totalWeight = 0;

		dests.forEach((dest) => {
			const repValue = rep[dest.name] || 0;
			weightedSum += repValue * dest.weight;
			totalWeight += dest.weight;
		});

		return Math.round(weightedSum / totalWeight);
	}

	/**
	 * Quick action handlers
	 */
	function handleMarketplaceClick() {
		showMarketplace = true;
	}

	function handleTechShopClick() {
		showTechShop = true;
	}

	function handleClientManagementClick() {
		// TODO: Implement in US-2.4 - Navigate to Client Management
	}

	function handleLockIn() {
		// TODO: Implement in US-3.1 - Lock in decisions
	}

	/**
	 * Handle successful client acquisition
	 * Credits will update automatically via WebSocket
	 */
	function handleClientAcquired(clientId: string, cost: number) {
		// Credits will be updated by WebSocket esp_dashboard_update message
		// No action needed here - just for future extensibility
	}

	/**
	 * Handle successful tech upgrade purchase
	 * Credits and ownedTech will update automatically via WebSocket
	 */
	function handleUpgradePurchased(upgradeId: string, cost: number) {
		// Credits and ownedTech will be updated by WebSocket esp_dashboard_update message
		// No action needed here - just for future extensibility
	}

	/**
	 * Lifecycle: Mount
	 */
	onMount(async () => {
		// Fetch initial data
		await fetchDashboardData();

		// Connect to WebSocket for real-time updates
		websocketStore.connect(
			roomCode,
			() => {}, // Lobby updates not needed for ESP dashboard
			handleGameStateUpdate,
			handleDashboardUpdate
		);

		// Expose test API (only for E2E tests)
		// This allows tests to simulate real-time updates without WebSocket
		if (typeof window !== 'undefined') {
			(window as any).__espDashboardTest = {
				get ready() {
					return !loading && !error;
				}, // Signal that initial fetch is complete
				setCredits: (value: number) => (credits = value),
				setPendingCosts: (value: number) => (pendingCosts = value),
				setReputation: (value: Record<string, number>) => (reputation = { ...reputation, ...value }),
				setClients: (value: typeof clients) => (clients = value),
				setOwnedTech: (value: string[]) => (ownedTech = value),
				setRound: (value: number) => (currentRound = value),
				setPhase: (value: string) => (currentPhase = value),
				setTimer: (value: number) => (timerSeconds = value),
				setWsStatus: (connected: boolean, errorMsg?: string) => {
					// For testing WebSocket connection states - use local test variables
					testWsConnected = connected;
					testWsError = connected ? null : (errorMsg || 'Connection lost');
				},
				setError: (errorMsg: string | null) => (error = errorMsg),
				setLoading: (isLoading: boolean) => (loading = isLoading)
			};
		}
	});

	/**
	 * Lifecycle: Destroy
	 */
	onDestroy(() => {
		websocketStore.disconnect();
	});
</script>

<div data-testid="esp-dashboard" class="min-h-screen bg-gradient-to-b from-gray-50 to-emerald-50">
	<!-- Error Banner (shown at top when error occurs, without hiding dashboard) -->
	{#if error && !loading}
		<div class="bg-red-50 border-b-2 border-red-200 py-3">
			<div class="max-w-7xl mx-auto px-4">
				<div
					data-testid="error-banner"
					class="flex items-center justify-between bg-red-100 border border-red-300 rounded-lg px-4 py-2"
				>
					<div class="flex items-center gap-3">
						<span class="text-2xl">⚠️</span>
						<div>
							<p class="text-sm font-semibold text-red-800">Error</p>
							<p class="text-sm text-red-700">{error}</p>
						</div>
					</div>
					<button
						onclick={() => (error = null)}
						class="text-red-600 hover:text-red-800 font-bold text-lg"
						aria-label="Dismiss error"
					>
						×
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Game State Header -->
	<DashboardHeader
		entityName={teamName}
		currentBudget={credits}
		pendingCosts={pendingCosts}
		currentRound={currentRound}
		totalRounds={totalRounds}
		timerSeconds={timerSeconds}
		theme="emerald"
	/>

	<!-- Loading State -->
	{#if loading}
		<div class="max-w-7xl mx-auto px-4 py-8">
			<div
				data-testid="loading-reputation"
				class="bg-white rounded-xl shadow-md p-12 text-center"
			>
				<div
					class="animate-spin w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"
				></div>
				<p class="text-gray-600">Loading dashboard...</p>
				{#if error}
					<p data-testid="error-message" class="text-orange-600 mt-4">{error}</p>
				{/if}
			</div>
		</div>
	{:else}
		<!-- Main Dashboard Content -->
		<div class="max-w-7xl mx-auto px-4 py-8">
			<!-- WebSocket Connection Status -->
			<div data-testid="ws-status" class="mb-4 text-sm">
				{#if wsConnected}
					<span class="text-green-600 flex items-center gap-2">
						<span class="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
						Connected
					</span>
				{:else if wsError}
					<span class="text-red-600 flex items-center gap-2">
						<span class="w-2 h-2 bg-red-600 rounded-full"></span>
						Disconnected - {wsError}
					</span>
				{:else}
					<span class="text-gray-500 flex items-center gap-2">
						<span class="w-2 h-2 bg-gray-400 rounded-full"></span>
						Connecting...
					</span>
				{/if}
			</div>

			<!-- Quick Actions -->
			<div class="mb-8">
				<QuickActions
					activeClientsCount={clients.length}
					missingMandatoryTech={currentRound >= 2 && !ownedTech.includes('dmarc')}
					availableClientsCount={availableClientsCount}
					onMarketplaceClick={handleMarketplaceClick}
					onTechShopClick={handleTechShopClick}
					onClientManagementClick={handleClientManagementClick}
				/>
			</div>

			<!-- Reputation Gauges (Full Width) -->
			<div class="mb-6">
				<ReputationGauges reputation={reputation} destinations={destinations} />
			</div>

			<!-- Full-width Sections -->
			<div class="space-y-6 mb-6">
				<!-- Technical Infrastructure -->
				<TechnicalInfrastructure
					ownedTech={ownedTech}
					currentRound={currentRound}
					onTechShopClick={handleTechShopClick}
				/>

				<!-- Client Portfolio -->
				<ClientPortfolio clients={clients} onMarketplaceClick={handleMarketplaceClick} />
			</div>

			<!-- Lock In Button -->
			<LockInButton
				phase={currentPhase}
				pendingDecisions={pendingCosts > 0 ? 1 : 0}
				onLockIn={handleLockIn}
			/>
		</div>
	{/if}

	<!-- Client Marketplace Modal -->
	<ClientMarketplaceModal
		show={showMarketplace}
		onClose={() => (showMarketplace = false)}
		{roomCode}
		{teamName}
		currentCredits={credits}
		{currentRound}
		{ownedTech}
		overallReputation={calculateOverallReputation(reputation, destinations)}
		onClientAcquired={handleClientAcquired}
	/>

	<!-- Technical Shop Modal -->
	<TechnicalShopModal
		show={showTechShop}
		onClose={() => (showTechShop = false)}
		{roomCode}
		{teamName}
		currentCredits={credits}
		{currentRound}
		onUpgradePurchased={handleUpgradePurchased}
	/>
</div>
