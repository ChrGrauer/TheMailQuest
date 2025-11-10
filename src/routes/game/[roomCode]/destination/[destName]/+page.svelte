<script lang="ts">
	/**
	 * Destination Kingdom Dashboard Page
	 * US-2.5: Destination Dashboard
	 * US-3.2: Decision Lock-In
	 *
	 * Main dashboard page for Destination players showing:
	 * - Destination-specific branding (blue theme)
	 * - ESP traffic statistics
	 * - Technical infrastructure status
	 * - Coordination status
	 * - Game state (round, phase, timer)
	 * - Real-time WebSocket updates
	 * - Lock-in functionality
	 */

	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { websocketStore } from '$lib/stores/websocket';
	import type { ESPDestinationStats, FilteringPolicy } from '$lib/server/game/types';

	// Components
	import DashboardHeader from '$lib/components/shared/DashboardHeader.svelte';
	import LockInButton from '$lib/components/esp-dashboard/LockInButton.svelte';
	import ESPStatisticsOverview from '$lib/components/destination-dashboard/ESPStatisticsOverview.svelte';
	import CoordinationStatus from '$lib/components/destination-dashboard/CoordinationStatus.svelte';
	import DestinationQuickActions from '$lib/components/destination-dashboard/DestinationQuickActions.svelte';
	import TechnicalInfrastructure from '$lib/components/destination-dashboard/TechnicalInfrastructure.svelte';
	import TechnicalShopModal from '$lib/components/destination-dashboard/TechnicalShopModal.svelte';
	import FilteringControlsModal from '$lib/components/destination-dashboard/FilteringControlsModal.svelte';
	import DestinationConsequences from '$lib/components/consequences/DestinationConsequences.svelte';

	// Get params
	const roomCode = $page.params.roomCode;
	const destName = $page.params.destName;

	// State variables
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Dashboard data
	let destinationName = $state('');
	let budget = $state(0);
	let currentRound = $state(1);
	let currentPhase = $state('planning');
	let timerDuration = $state(300);
	let timerRemaining = $state(300);
	let timerRunning = $state(false);
	let espStats = $state<ESPDestinationStats[]>([]);
	let collaborationsCount = $state(0);
	let ownedTech = $state<string[]>([]);
	let spamLevel = $state(0);

	// Tech Shop state (US-2.6.2)
	let showTechShop = $state(false);
	let kingdom = $state<'Gmail' | 'Outlook' | 'Yahoo'>('Gmail');
	let authenticationLevel = $state(0);
	let ownedTools = $state<string[]>([]);

	// Filtering Controls state (US-2.6.1)
	let showFilteringControls = $state(false);
	let filteringPolicies = $state<Record<string, FilteringPolicy>>({});

	// Lock-in state (US-3.2)
	let isLockedIn = $state(false);
	let lockedInAt = $state<Date | null>(null);
	let remainingPlayers = $state(0);
	let autoLockMessage = $state<string | null>(null);
	let phaseTransitionMessage = $state<string | null>(null);

	// Test state variables (for E2E testing) - null means use real value
	let testWsConnected = $state<boolean | null>(null);
	let testWsError = $state<string | null>(null);

	// Derived values
	let wsConnected = $derived(
		testWsConnected !== null ? testWsConnected : $websocketStore.connected
	);
	let wsError = $derived(testWsError !== null ? testWsError : $websocketStore.error);

	// Timer display
	let timerDisplay = $derived(
		`${Math.floor(timerRemaining / 60)}:${String(timerRemaining % 60).padStart(2, '0')}`
	);

	// ESP teams data for Filtering Controls modal (US-2.6.1)
	let espTeamsForFiltering = $derived(
		espStats.map((esp) => ({
			espName: esp.espName,
			volume: esp.volumeRaw,
			reputation: esp.reputation,
			satisfaction: esp.userSatisfaction,
			spamRate: esp.spamComplaintRate
		}))
	);

	// Fetch dashboard data from API
	async function fetchDashboardData() {
		try {
			loading = true;
			error = null;

			const response = await fetch(`/api/sessions/${roomCode}/destination/${destName}`);
			const data = await response.json();

			if (!data.success) {
				throw new Error(data.error || 'Failed to load dashboard');
			}

			// Update state from API response
			destinationName = data.destination.name;
			budget = data.destination.budget;
			ownedTech = data.destination.technical_stack || [];
			spamLevel = data.destination.spam_level || 0;

			// Tech Shop state (US-2.6.2)
			kingdom = data.destination.kingdom || 'Gmail';
			authenticationLevel = data.destination.authentication_level || 0;
			ownedTools = data.destination.owned_tools || [];

			// Filtering Controls state (US-2.6.1)
			filteringPolicies = data.destination.filtering_policies || {};

			// Lock-in state (US-3.2)
			isLockedIn = data.destination.locked_in || false;
			lockedInAt = data.destination.locked_in_at ? new Date(data.destination.locked_in_at) : null;

			currentRound = data.game.current_round;
			currentPhase = data.game.current_phase;
			remainingPlayers = data.game.remaining_players || 0; // US-3.2

			if (data.game.timer) {
				timerDuration = data.game.timer.duration;
				timerRemaining = data.game.timer.remaining;
				timerRunning = data.game.timer.isRunning;
			}

			espStats = data.espStats || [];
			collaborationsCount = data.collaborations_count || 0;

			loading = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load dashboard';
			loading = false;
		}
	}

	// Handle game state updates from WebSocket
	function handleGameStateUpdate(update: any) {
		if (update.current_round !== undefined) currentRound = update.current_round;
		if (update.current_phase !== undefined) currentPhase = update.current_phase;
		if (update.timer !== undefined) {
			timerDuration = update.timer.duration;
			timerRemaining = update.timer.remaining;
			timerRunning = update.timer.isRunning;
		}

		// US-3.2: Handle WebSocket lock-in events
		const messageType = update.type;

		if (messageType === 'lock_in_confirmed') {
			// Only process if this message is for THIS destination
			const isForThisDestination =
				update.data?.role === 'Destination' &&
				update.data?.destinationName?.toLowerCase() === destName.toLowerCase();

			if (isForThisDestination) {
				// This destination has successfully locked in
				if (update.data?.locked_in !== undefined) {
					isLockedIn = update.data.locked_in;
				}
				if (update.data?.locked_in_at) {
					lockedInAt = new Date(update.data.locked_in_at);
				}
			}
		}

		if (messageType === 'player_locked_in') {
			// Any player locked in - update remaining count
			if (update.data?.remaining_players !== undefined) {
				remainingPlayers = update.data.remaining_players;
			}
		}

		if (messageType === 'auto_lock_warning') {
			// 15-second warning before auto-lock
			if (update.data?.message) {
				autoLockMessage = update.data.message;
			}
		}

		if (messageType === 'auto_lock_complete') {
			// Auto-lock completed
			autoLockMessage = update.data?.message || "Time's up! Decisions locked automatically";
		}

		if (messageType === 'phase_transition') {
			// Phase transition (e.g., to resolution)
			if (update.data?.phase) {
				currentPhase = update.data.phase;
			}
			if (update.data?.round !== undefined) {
				currentRound = update.data.round;
			}
			// Show transition message
			if (update.data?.message) {
				phaseTransitionMessage = update.data.message;
				// Clear transition message after 5 seconds
				setTimeout(() => {
					phaseTransitionMessage = null;
				}, 5000);
			}
		}
	}

	// Handle destination dashboard updates from WebSocket
	function handleDestinationDashboardUpdate(update: any) {
		// Only apply updates for this destination (filter out updates for other destinations)
		// Use case-insensitive comparison since URL params are lowercase but API may use original case
		if (update.destinationName && update.destinationName.toLowerCase() !== destName.toLowerCase()) {
			return;
		}

		if (update.budget !== undefined) budget = update.budget;
		if (update.esp_stats !== undefined) espStats = update.esp_stats;
		if (update.spam_level !== undefined) spamLevel = update.spam_level;
		if (update.technical_stack !== undefined) ownedTech = update.technical_stack;
		if (update.collaborations_count !== undefined)
			collaborationsCount = update.collaborations_count;

		// Tech Shop updates (US-2.6.2)
		if (update.owned_tools !== undefined) ownedTools = update.owned_tools;
		if (update.authentication_level !== undefined)
			authenticationLevel = update.authentication_level;

		// Filtering Controls updates (US-2.6.1)
		if (update.filtering_policies !== undefined) filteringPolicies = update.filtering_policies;

		// Lock-in updates (US-3.2)
		if (update.locked_in !== undefined) isLockedIn = update.locked_in;
		if (update.locked_in_at) lockedInAt = new Date(update.locked_in_at);
	}

	// Timer countdown (client-side)
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	function startTimerCountdown() {
		if (timerInterval) clearInterval(timerInterval);

		timerInterval = setInterval(() => {
			if (timerRunning && timerRemaining > 0) {
				timerRemaining--;
			} else if (timerRemaining <= 0) {
				timerRunning = false;
				if (timerInterval) clearInterval(timerInterval);
			}
		}, 1000);
	}

	// Handle coordination panel click (placeholder for US-2.7)
	function handleCoordinationClick() {
		// TODO: Open coordination panel modal (US-2.7)
	}

	// Handle tech shop click (US-2.6.2)
	function handleTechShopClick() {
		showTechShop = true;
	}

	// Handle tool purchase (US-2.6.2)
	function handleToolPurchase(toolId: string, cost: number) {
		// All updates (budget, owned_tools, authentication_level) come via WebSocket
		// No optimistic updates needed - WebSocket broadcast is immediate after purchase
		// (Removed optimistic updates to fix double deduction bug)
	}

	// Handle filtering controls click (US-2.6.1)
	function handleFilteringControlsClick() {
		showFilteringControls = true;
	}

	// Handle retry after error (US-2.6.1)
	function handleRetry() {
		fetchDashboardData();
	}

	/**
	 * Handle lock-in click
	 * US-3.2: Lock in decisions for this destination
	 */
	async function handleLockIn() {
		try {
			const response = await fetch(`/api/sessions/${roomCode}/destination/${destName}/lock-in`, {
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
			error = err instanceof Error ? err.message : 'Failed to lock in decisions';
		}
	}

	// Mount lifecycle
	onMount(async () => {
		await fetchDashboardData();

		// Connect to WebSocket
		websocketStore.connect(
			roomCode,
			() => {}, // onLobbyUpdate (not needed on dashboard)
			handleGameStateUpdate,
			undefined, // onESPDashboardUpdate (not for destinations)
			handleDestinationDashboardUpdate // onDestinationDashboardUpdate
		);

		// Start timer countdown
		if (timerRunning) {
			startTimerCountdown();
		}

		// Expose test API for E2E tests
		if (typeof window !== 'undefined') {
			(window as any).__destinationDashboardTest = {
				get ready() {
					return !loading && !error;
				},
				setBudget: (value: number) => (budget = value),
				setCredits: (value: number) => (budget = value), // Alias for setBudget (US-3.2)
				setESPStats: (value: ESPDestinationStats[]) => (espStats = value),
				setCoordinationCount: (count: number) => (collaborationsCount = count),
				setOwnedTech: (value: string[]) => (ownedTech = value),
				setRound: (value: number) => (currentRound = value),
				setPhase: (value: string) => (currentPhase = value),
				setTimer: (value: number) => (timerRemaining = value),
				setWsStatus: (connected: boolean, errorMsg?: string) => {
					testWsConnected = connected;
					testWsError = connected ? null : errorMsg || 'Connection lost';
				},
				setError: (errorMsg: string | null) => (error = errorMsg),
				setLoading: (isLoading: boolean) => (loading = isLoading),

				// Tech Shop test API (US-2.6.2)
				openTechShop: () => (showTechShop = true),
				closeTechShop: () => (showTechShop = false),
				getTechShopOpen: () => showTechShop,
				getOwnedTools: () => ownedTools,
				setOwnedTools: (value: string[]) => (ownedTools = value),
				getAuthLevel: () => authenticationLevel,
				setAuthLevel: (value: number) => (authenticationLevel = value),
				getKingdom: () => kingdom,
				setKingdom: (value: 'Gmail' | 'Outlook' | 'Yahoo') => (kingdom = value),

				// Filtering Controls test API (US-2.6.1)
				openFilteringControls: () => (showFilteringControls = true),
				closeFilteringControls: () => (showFilteringControls = false),
				getFilteringControlsOpen: () => showFilteringControls,
				getFilteringPolicies: () => filteringPolicies,
				setFilteringPolicies: (value: Record<string, FilteringPolicy>) =>
					(filteringPolicies = value),

				// Lock-in test API (US-3.2)
				setLockedIn: (locked: boolean) => {
					isLockedIn = locked;
					lockedInAt = locked ? new Date() : null;
				},
				setRemainingPlayers: (count: number) => (remainingPlayers = count),
				setAutoLockMessage: (msg: string | null) => (autoLockMessage = msg),
				getCurrentPhase: () => currentPhase
			};
		}
	});

	// Destroy lifecycle
	onDestroy(() => {
		if (timerInterval) clearInterval(timerInterval);
		websocketStore.disconnect();

		// Clean up test API
		if (typeof window !== 'undefined') {
			delete (window as any).__destinationDashboardTest;
		}
	});
</script>

<!-- Error Banner (non-blocking) -->
{#if error && !loading}
	<div class="fixed top-0 left-0 right-0 z-50">
		<div
			data-testid="error-banner"
			class="bg-red-50 border-b-2 border-red-200 py-3 px-6 flex items-center justify-between"
		>
			<div class="flex items-center gap-3">
				<span class="text-red-600 font-bold text-xl">⚠️</span>
				<span class="text-red-800 font-semibold">{error}</span>
			</div>
			<button
				onclick={() => (error = null)}
				class="text-red-600 hover:text-red-800 font-bold text-xl focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-2"
			>
				×
			</button>
		</div>
	</div>
{/if}

<!-- WebSocket Status Indicator (only when disconnected) -->
{#if !wsConnected && wsError}
	<div class="fixed top-0 left-0 right-0 z-40 mt-12">
		<div
			data-testid="ws-status"
			class="bg-amber-50 border-b-2 border-amber-200 py-2 px-6 flex items-center justify-center gap-2 text-amber-800 text-sm"
		>
			<span class="animate-pulse">⚠️</span>
			<span>Connection lost: {wsError}. Attempting to reconnect...</span>
		</div>
	</div>
{/if}

<!-- Main Content -->
<div class="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50">
	{#if loading}
		<!-- Loading State -->
		<div class="flex items-center justify-center min-h-screen">
			<div class="text-center">
				<div
					class="inline-block w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"
				></div>
				<p class="mt-4 text-gray-600 font-semibold">Loading dashboard...</p>
			</div>
		</div>
	{:else if currentPhase === 'consequences'}
		<!-- US-3.5: Consequences Phase Display -->
		<DestinationConsequences {destinationName} {currentRound} {budget} />
	{:else if currentPhase === 'resolution'}
		<!-- US-3.5: Resolution Loading Screen -->
		<div class="flex items-center justify-center min-h-screen">
			<div
				data-testid="resolution-loading"
				class="bg-white rounded-xl shadow-md p-12 text-center max-w-md"
			>
				<div
					class="inline-block w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"
				></div>
				<h2 class="text-2xl font-bold text-gray-900 mb-2">Calculating Round Results...</h2>
				<p class="text-gray-600">Please wait while we process this round's data</p>

				<!-- Auto-lock Message (if present) - US-3.2 -->
				{#if autoLockMessage}
					<div
						data-testid="auto-lock-message"
						class="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-sm"
						role="alert"
					>
						{autoLockMessage}
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<!-- Header -->
		<DashboardHeader
			entityName={destinationName}
			currentBudget={budget}
			{currentRound}
			totalRounds={4}
			timerSeconds={timerRemaining}
			theme="blue"
			{isLockedIn}
		/>

		<!-- Dashboard Content (Planning Phase) -->
		<div class="container mx-auto px-4 py-6 max-w-7xl">
			<!-- Quick Actions -->
			<DestinationQuickActions
				{collaborationsCount}
				onCoordinationClick={handleCoordinationClick}
				onTechShopClick={handleTechShopClick}
				onFilteringClick={handleFilteringControlsClick}
			/>

			<!-- Dashboard Grid -->
			<div data-testid="dashboard-layout" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				<!-- ESP Statistics (full width) -->
				<div class="lg:col-span-2">
					<ESPStatisticsOverview {espStats} />
				</div>

				<!-- Technical Infrastructure -->
				<div>
					<TechnicalInfrastructure {ownedTools} {kingdom} />
				</div>

				<!-- Coordination Status -->
				<div>
					<CoordinationStatus {collaborationsCount} onCoordinationClick={handleCoordinationClick} />
				</div>
			</div>

			<!-- Lock In Button -->
			<LockInButton
				phase={currentPhase}
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
</div>

<!-- Tech Shop Modal (US-2.6.2) -->
<TechnicalShopModal
	bind:show={showTechShop}
	{isLockedIn}
	{roomCode}
	{destName}
	{kingdom}
	currentBudget={budget}
	authLevel={authenticationLevel}
	onToolPurchased={handleToolPurchase}
/>

<!-- Filtering Controls Modal (US-2.6.1) -->
<FilteringControlsModal
	bind:show={showFilteringControls}
	{isLockedIn}
	{roomCode}
	{destName}
	espTeams={espTeamsForFiltering}
	{filteringPolicies}
	dashboardError={error}
	onRetry={handleRetry}
/>
