<script lang="ts">
	/**
	 * ESP Team Dashboard Page
	 * US-2.1: ESP Team Dashboard
	 * US-3.2: Decision Lock-In
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
	import ClientManagementModal from '$lib/components/esp-dashboard/ClientManagementModal.svelte';
	import { calculateOnboardingCost } from '$lib/config/client-onboarding';
	import type { OnboardingOptions } from '$lib/server/game/types';

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

	// Lock-in state (US-3.2)
	let isLockedIn = $state(false);
	let lockedInAt = $state<Date | null>(null);
	let remainingPlayers = $state(0);
	let autoLockMessage = $state<string | null>(null);
	let phaseTransitionMessage = $state<string | null>(null);
	let pendingOnboardingDecisions = $state<Record<string, OnboardingOptions>>({});

	// Destinations with weights
	let destinations = $state([
		{ name: 'Gmail', weight: 50 },
		{ name: 'Outlook', weight: 30 },
		{ name: 'Yahoo', weight: 20 }
	]);

	// UI state
	let showMarketplace = $state(false);
	let showTechShop = $state(false);
	let showClientManagement = $state(false);

	// Test state for WebSocket status (used by E2E tests)
	let testWsConnected = $state<boolean | null>(null);
	let testWsError = $state<string | null>(null);

	// WebSocket connection status (use test values if set)
	let wsConnected = $derived(
		testWsConnected !== null ? testWsConnected : $websocketStore.connected
	);
	let wsError = $derived(testWsError !== null ? testWsError : $websocketStore.error);

	/**
	 * Calculate total pending onboarding costs
	 * US-3.2: Sum up all pending onboarding options across clients
	 */
	function calculatePendingOnboardingCosts(): number {
		let total = 0;
		for (const clientId in pendingOnboardingDecisions) {
			const options = pendingOnboardingDecisions[clientId];
			total += calculateOnboardingCost(options.warmUp, options.listHygiene);
		}
		return total;
	}

	/**
	 * Calculate number of pending onboarding decisions
	 * US-3.2: Count clients with pending onboarding options
	 */
	let pendingDecisionsCount = $derived(Object.keys(pendingOnboardingDecisions).length);

	/**
	 * Calculate total pending costs (onboarding only - clients/tech committed immediately)
	 * US-3.2: Pending costs = pending onboarding options
	 */
	let totalPendingCosts = $derived(calculatePendingOnboardingCosts());

	/**
	 * Check if budget is exceeded
	 * US-3.2: Budget exceeded if total pending costs exceed remaining budget
	 */
	let budgetExceeded = $derived(totalPendingCosts > credits);

	/**
	 * Calculate excess amount
	 * US-3.2: How much over budget we are
	 */
	let excessAmount = $derived(Math.max(0, totalPendingCosts - credits));

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

			// Update lock-in state (US-3.2)
			isLockedIn = data.team.locked_in || false;
			lockedInAt = data.team.locked_in_at ? new Date(data.team.locked_in_at) : null;
			pendingOnboardingDecisions = data.team.pending_onboarding_decisions || {};

			// Update game state
			currentRound = data.game.current_round || 1;
			currentPhase = data.game.current_phase || 'planning';
			remainingPlayers = data.game.remaining_players || 0; // US-3.2

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
	 * Fetch portfolio data with full client objects
	 * US-2.4: Portfolio needs complete client info for display
	 */
	async function fetchPortfolio() {
		try {
			const response = await fetch(`/api/sessions/${roomCode}/esp/${teamName}/portfolio`);

			if (!response.ok) {
				// Portfolio might not exist yet if no clients acquired
				if (response.status === 404) {
					clients = [];
					return;
				}
				throw new Error('Failed to fetch portfolio');
			}

			const data = await response.json();

			if (data.success && data.clients) {
				// Replace string IDs with full client objects
				clients = data.clients;
			}
		} catch (err) {
			// Log error but don't block dashboard - portfolio might be empty
			console.error('Portfolio fetch error:', err);
		}
	}

	/**
	 * Handle real-time dashboard updates from WebSocket
	 */
	async function handleDashboardUpdate(update: ESPDashboardUpdate) {
		// Only apply updates for this ESP team (filter out updates for other teams)
		// Use case-insensitive comparison since URL params are lowercase but API may use original case
		if (update.teamName && update.teamName.toLowerCase() !== teamName.toLowerCase()) {
			return;
		}

		if (update.credits !== undefined) {
			credits = update.credits;
		}

		if (update.reputation) {
			reputation = { ...reputation, ...update.reputation };
		}

		if (update.clients) {
			// US-2.4: Fetch full client objects instead of just IDs
			await fetchPortfolio();
		}

		if (update.client_states) {
			// US-2.4: Refresh portfolio when client states change (status, onboarding)
			await fetchPortfolio();
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

		// US-3.2: Lock-in updates
		if (update.locked_in !== undefined) {
			isLockedIn = update.locked_in;
		}

		if (update.locked_in_at) {
			lockedInAt = new Date(update.locked_in_at);
		}

		if (update.pending_onboarding_decisions) {
			pendingOnboardingDecisions = update.pending_onboarding_decisions;
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

		// US-3.2: Handle WebSocket lock-in events
		const messageType = data.type;

		if (messageType === 'lock_in_confirmed') {
			// Only process if this message is for THIS ESP team
			const isForThisTeam =
				data.data?.role === 'ESP' && data.data?.teamName?.toLowerCase() === teamName.toLowerCase();

			if (isForThisTeam) {
				// This team has successfully locked in
				if (data.data?.locked_in !== undefined) {
					isLockedIn = data.data.locked_in;
				}
				if (data.data?.locked_in_at) {
					lockedInAt = new Date(data.data.locked_in_at);
				}
			}
		}

		if (messageType === 'player_locked_in') {
			// Any player locked in - update remaining count
			if (data.data?.remaining_players !== undefined) {
				remainingPlayers = data.data.remaining_players;
			}
		}

		if (messageType === 'auto_lock_warning') {
			// 15-second warning before auto-lock
			if (data.data?.message) {
				autoLockMessage = data.data.message;
			}
		}

		if (messageType === 'auto_lock_corrections') {
			// Auto-correction feedback when onboarding options removed
			// Only process if this message is for THIS ESP team
			const isForThisTeam = data.data?.teamName?.toLowerCase() === teamName.toLowerCase();

			if (isForThisTeam && data.data?.corrections) {
				// Format corrections into user-friendly message
				const corrections = data.data.corrections;
				const details = corrections
					.map((c: any) => {
						const optionName = c.optionType === 'warmUp' ? 'warm-up' : 'list hygiene';
						return `• Removed ${optionName} from ${c.clientName} (-${c.costSaved}cr)`;
					})
					.join('\n');

				autoLockMessage =
					"Time's up! Some onboarding options were removed to fit your budget:\n" + details;
			}
		}

		if (messageType === 'auto_lock_complete') {
			// Auto-lock completed (for players without corrections)
			// Only set message if we don't already have a correction message
			if (!autoLockMessage || !autoLockMessage.includes('removed')) {
				autoLockMessage = data.data?.message || "Time's up! Decisions locked automatically";
			}
		}

		if (messageType === 'phase_transition') {
			// Phase transition (e.g., to resolution)
			if (data.data?.phase) {
				currentPhase = data.data.phase;
			}
			if (data.data?.round !== undefined) {
				currentRound = data.data.round;
			}
			// Show transition message
			if (data.data?.message) {
				phaseTransitionMessage = data.data.message;
				// Clear transition message after 5 seconds
				setTimeout(() => {
					phaseTransitionMessage = null;
				}, 5000);
			}
			// Clear auto-lock warning message when phase changes (keep correction and completion messages)
			if (
				autoLockMessage &&
				!autoLockMessage.includes('removed') &&
				!autoLockMessage.includes("Time's up")
			) {
				autoLockMessage = null;
			}
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
		showClientManagement = true;
	}

	/**
	 * Handle lock-in button click
	 * US-3.2: Lock in decisions for this ESP team
	 */
	async function handleLockIn() {
		try {
			const response = await fetch(`/api/sessions/${roomCode}/esp/${teamName}/lock-in`, {
				method: 'POST'
			});

			const data = await response.json();

			if (!data.success) {
				// Show error if lock-in failed
				error = data.error || 'Failed to lock in decisions';
				return;
			}

			// Update local state (WebSocket will also send updates)
			isLockedIn = true;
			lockedInAt = new Date();
			remainingPlayers = data.remaining_players || 0;
		} catch (err) {
			error = (err as Error).message;
		}
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

		// Fetch portfolio with full client objects (US-2.4)
		await fetchPortfolio();

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
				setReputation: (value: Record<string, number>) =>
					(reputation = { ...reputation, ...value }),
				setClients: (value: typeof clients) => (clients = value),
				setOwnedTech: (value: string[]) => (ownedTech = value),
				setRound: (value: number) => (currentRound = value),
				setPhase: (value: string) => (currentPhase = value),
				setTimer: (value: number) => (timerSeconds = value),
				setTimerSeconds: (value: number) => (timerSeconds = value), // Alias for setTimer (US-3.2)
				triggerAutoLock: async () => {
					// US-3.2: Simulate auto-lock at timer expiry
					try {
						const response = await fetch(`/api/sessions/${roomCode}/auto-lock`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' }
						});
						if (response.ok) {
							const data = await response.json();
							isLockedIn = true;
							lockedInAt = new Date(data.locked_in_at);
							remainingPlayers = data.remaining_players || 0;
							// autoLockMessage will be set via WebSocket (auto_lock_corrections or auto_lock_complete)
						}
					} catch (err) {
						console.error('Auto-lock failed:', err);
					}
				},
				setWsStatus: (connected: boolean, errorMsg?: string) => {
					// For testing WebSocket connection states - use local test variables
					testWsConnected = connected;
					testWsError = connected ? null : errorMsg || 'Connection lost';
				},
				setError: (errorMsg: string | null) => (error = errorMsg),
				setLoading: (isLoading: boolean) => (loading = isLoading),
				// US-2.4: Client Management Modal
				openClientManagement: () => (showClientManagement = true),
				closeClientManagement: () => (showClientManagement = false),
				get isClientManagementOpen() {
					return showClientManagement;
				},
				// US-3.2: Lock-in test API
				setSpentCredits: (value: number) => {
					// For budget testing: spent credits are deducted from total
					credits = Math.max(0, credits - value);
				},
				setCommittedCosts: (value: number) => {
					// Alias for setSpentCredits - deduct committed costs from budget
					credits = Math.max(0, credits - value);
				},
				setPendingOnboarding: (value: Record<string, OnboardingOptions>) => {
					pendingOnboardingDecisions = value;
				},
				setPendingOnboardingCosts: (value: number) => {
					// Alias for setPendingCosts - sets pending onboarding costs
					pendingCosts = value;
				},
				setLockedIn: (locked: boolean) => {
					isLockedIn = locked;
					lockedInAt = locked ? new Date() : null;
				},
				setRemainingPlayers: (count: number) => (remainingPlayers = count),
				setAutoLockMessage: (msg: string | null) => (autoLockMessage = msg),
				getCurrentPhase: () => currentPhase,
				openPortfolioModal: () => (showClientManagement = true)
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
		pendingCosts={totalPendingCosts}
		{currentRound}
		{totalRounds}
		{timerSeconds}
		theme="emerald"
	/>

	<!-- Loading State -->
	{#if loading}
		<div class="max-w-7xl mx-auto px-4 py-8">
			<div data-testid="loading-reputation" class="bg-white rounded-xl shadow-md p-12 text-center">
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
					{availableClientsCount}
					onMarketplaceClick={handleMarketplaceClick}
					onTechShopClick={handleTechShopClick}
					onClientManagementClick={handleClientManagementClick}
				/>
			</div>

			<!-- Reputation Gauges (Full Width) -->
			<div class="mb-6">
				<ReputationGauges {reputation} {destinations} />
			</div>

			<!-- Full-width Sections -->
			<div class="space-y-6 mb-6">
				<!-- Technical Infrastructure -->
				<TechnicalInfrastructure {ownedTech} {currentRound} onTechShopClick={handleTechShopClick} />

				<!-- Client Portfolio -->
				<ClientPortfolio
					{clients}
					pendingDecisions={pendingDecisionsCount}
					onMarketplaceClick={handleMarketplaceClick}
				/>
			</div>

			<!-- Lock In Button -->
			<LockInButton
				phase={currentPhase}
				pendingDecisions={pendingDecisionsCount}
				{budgetExceeded}
				{excessAmount}
				{isLockedIn}
				{remainingPlayers}
				{autoLockMessage}
				onLockIn={handleLockIn}
			/>

			<!-- Phase Transition Message (US-3.2) -->
			{#if phaseTransitionMessage}
				<div
					data-testid="phase-transition-message"
					role="alert"
					class="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-800 text-sm font-semibold"
				>
					{phaseTransitionMessage}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Client Marketplace Modal -->
	<ClientMarketplaceModal
		show={showMarketplace}
		{isLockedIn}
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
		{isLockedIn}
		onClose={() => (showTechShop = false)}
		{roomCode}
		{teamName}
		currentCredits={credits}
		{currentRound}
		onUpgradePurchased={handleUpgradePurchased}
	/>

	<!-- Client Management Modal -->
	<ClientManagementModal
		bind:show={showClientManagement}
		{isLockedIn}
		onClose={() => (showClientManagement = false)}
		{roomCode}
		{teamName}
		currentCredits={credits}
		{currentRound}
	/>
</div>
