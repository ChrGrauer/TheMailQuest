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
	import type {
		DestinationResolutionResult,
		SatisfactionResult
	} from '$lib/server/game/resolution-types';

	// Components
	import DashboardHeader from '$lib/components/shared/DashboardHeader.svelte';
	import LockInButton from '$lib/components/esp-dashboard/LockInButton.svelte';
	import ESPStatisticsOverview from '$lib/components/destination-dashboard/ESPStatisticsOverview.svelte';
	import CoordinationStatus from '$lib/components/destination-dashboard/CoordinationStatus.svelte';
	import DestinationQuickActions from '$lib/components/destination-dashboard/DestinationQuickActions.svelte';
	import TechnicalInfrastructure from '$lib/components/destination-dashboard/TechnicalInfrastructure.svelte';
	import TechnicalShopModal from '$lib/components/destination-dashboard/TechnicalShopModal.svelte';
	import FilteringControlsModal from '$lib/components/destination-dashboard/FilteringControlsModal.svelte';
	import CoordinationPanelModal from '$lib/components/destination-dashboard/CoordinationPanelModal.svelte';
	import DestinationConsequences from '$lib/components/consequences/DestinationConsequences.svelte';
	import VictoryScreen from '$lib/components/victory/VictoryScreen.svelte';
	import type { IncidentCard } from '$lib/types/incident';
	import type { FinalScoreOutput } from '$lib/server/game/final-score-types';
	import type { InvestigationHistoryEntry, InvestigationResult } from '$lib/server/game/types';
	import IncidentCardDisplay from '$lib/components/incident/IncidentCardDisplay.svelte';
	// Composables
	import {
		useDestinationModals,
		useDestinationIncident
	} from '$lib/composables/destination-dashboard';
	import { useGameState, useWebSocketStatus, useLockInState } from '$lib/composables/shared';
	// Config
	import { INVESTIGATION_COST } from '$lib/config/investigation';

	// Get params
	const roomCode = $page.params.roomCode;
	const destName = $page.params.destName;

	// State variables
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Dashboard data
	let destinationName = $state('');
	let budget = $state(0);
	let espStats = $state<ESPDestinationStats[]>([]);
	let ownedTech = $state<string[]>([]);
	let spamLevel = $state(0);

	// Game state (via composable)
	const gameState = useGameState();

	// Tech Shop state (US-2.6.2)
	let kingdom = $state<'Gmail' | 'Outlook' | 'Yahoo'>('Gmail');
	let authenticationLevel = $state(0);
	let ownedTools = $state<string[]>([]);

	// Filtering Controls state (US-2.6.1)
	let filteringPolicies = $state<Record<string, FilteringPolicy>>({});

	// UI state (via composable)
	const modals = useDestinationModals();

	// Incident state (via composable)
	const incidentState = useDestinationIncident();

	// Lock-in state (US-3.2) (via composable)
	const lockInState = useLockInState();

	// Consequences state (US-3.5 Iteration 3)
	let currentResolution = $state<DestinationResolutionResult | null>(null);
	let espSatisfactionBreakdown = $state<Record<string, SatisfactionResult> | null>(null);

	// US-5.2: Final scores state
	let finalScores = $state<FinalScoreOutput | null>(null);

	// US-2.7: Investigation voting state
	let investigationVotes = $state<Record<string, string[]>>({}); // ESP name -> voter names
	let myInvestigationVote = $state<string | null>(null);
	let investigationHistory = $state<InvestigationHistoryEntry[]>([]);
	let showCoordinationPanel = $state(false);
	let autoCorrectionMessage = $state<string | null>(null); // For vote auto-removal notifications

	// WebSocket status (via composable with test override support)
	const wsStatus = useWebSocketStatus(() => ({
		connected: $websocketStore.connected,
		error: $websocketStore.error
	}));

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

	// ESP teams data for Coordination Panel modal (US-2.7)
	let espTeamsForCoordination = $derived(espStats.map((esp) => ({ name: esp.espName })));

	// Available budget accounting for pending investigation vote (US-2.7)
	let availableBudget = $derived(myInvestigationVote ? budget - INVESTIGATION_COST : budget);

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

			// Lock-in state (US-3.2) via composable
			lockInState.isLockedIn = data.destination.locked_in || false;
			lockInState.lockedInAt = data.destination.locked_in_at
				? new Date(data.destination.locked_in_at)
				: null;

			// Game state via composable
			gameState.currentRound = data.game.current_round;
			gameState.currentPhase = data.game.current_phase;
			lockInState.remainingPlayers = data.game.remaining_players || 0; // US-3.2

			if (data.game.timer) {
				gameState.timerSeconds = data.game.timer.remaining;
			}

			espStats = data.espStats || [];

			// US-3.5 Iteration 3: Store resolution data for consequences phase
			currentResolution = data.currentResolution || null;
			espSatisfactionBreakdown = data.espSatisfactionBreakdown || null;

			// US-2.7: Investigation state
			investigationVotes = data.investigationVotes || {};
			myInvestigationVote = data.destination.pending_investigation_vote?.espName || null;
			investigationHistory = data.investigationHistory || [];

			loading = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load dashboard';
			loading = false;
		}
	}

	// Handle game state updates from WebSocket
	function handleGameStateUpdate(data: any) {
		const updateData = data.data || data;
		const messageType = data.type || updateData.type;

		// US-8.2-0.1: Handle timer_update messages
		if (messageType === 'timer_update') {
			gameState.isPaused = updateData.isPaused;
			if (updateData.remainingTime !== undefined) {
				gameState.timerSeconds = updateData.remainingTime;
			}
			return;
		}

		// Handle incident_triggered messages (via incidentState composable)
		if (messageType === 'incident_triggered' && updateData.incident) {
			incidentState.showIncident(updateData.incident);
			return;
		}

		// US-5.2: Handle final scores calculated
		if (messageType === 'final_scores_calculated') {
			finalScores = {
				espResults: updateData.espResults,
				winner: updateData.winner,
				destinationResults: updateData.destinationResults,
				metadata: updateData.metadata
			};
			return;
		}

		// US-2.7: Handle investigation updates (vote and result events)
		if (messageType === 'investigation_update') {
			if (updateData.event === 'vote') {
				investigationVotes = updateData.votes || {};
				// Update myVote based on the votes
				const destNameCapitalized =
					destinationName ||
					(destName ? destName.charAt(0).toUpperCase() + destName.slice(1).toLowerCase() : '');
				for (const [espName, voters] of Object.entries(investigationVotes)) {
					if ((voters as string[]).includes(destNameCapitalized)) {
						myInvestigationVote = espName;
						return;
					}
				}
				myInvestigationVote = null;
			} else if (updateData.event === 'result' && destName) {
				// Result event: toast the result if we participated or if a violation was found
				const historyEntry: InvestigationHistoryEntry = {
					round: updateData.round,
					targetEsp: updateData.targetEsp,
					voters: updateData.voters,
					result: {
						violationFound: updateData.violationFound,
						message: updateData.message,
						suspendedClient: updateData.suspendedClient
							? {
									clientId: updateData.suspendedClient.id,
									clientName: updateData.suspendedClient.name,
									riskLevel: updateData.suspendedClient.riskLevel,
									missingProtection: updateData.suspendedClient.missingProtection,
									spamRate: updateData.suspendedClient.spamRate
								}
							: undefined
					},
					timestamp: new Date()
				};
				investigationHistory = [...investigationHistory, historyEntry];
			} else if (updateData.event === 'clear_votes') {
				// Reset local voting state
				investigationVotes = {};
				myInvestigationVote = null;
			}
			return;
		}

		// Update game state metrics
		if (updateData.timer_remaining !== undefined) {
			gameState.timerSeconds = updateData.timer_remaining;
		}

		// Handle phase and round transitions
		if (updateData.phase || updateData.round !== undefined) {
			const oldPhase = gameState.currentPhase;
			const oldRound = gameState.currentRound;

			if (updateData.phase) gameState.currentPhase = updateData.phase;
			if (updateData.round !== undefined) gameState.currentRound = updateData.round;

			// US-3.2: Reset lock-in state when entering a new planning phase or round
			if (
				(gameState.currentPhase === 'planning' && oldPhase !== 'planning') ||
				gameState.currentRound !== oldRound
			) {
				lockInState.resetLockIn();
			}
		}

		// US-3.2: Handle WebSocket lock-in events
		if (messageType === 'lock_in_confirmed') {
			// Only process if this message is for THIS destination
			const isForThisDestination =
				updateData.role === 'Destination' &&
				destName &&
				updateData.teamName?.toLowerCase() === destName.toLowerCase();

			if (isForThisDestination) {
				// This destination has successfully locked in
				if (updateData.locked_in !== undefined) {
					lockInState.isLockedIn = updateData.locked_in;
				}
				if (updateData.locked_in_at) {
					lockInState.lockedInAt = new Date(updateData.locked_in_at);
				}
			}
		}

		if (messageType === 'player_locked_in') {
			// Any player locked in - update remaining count
			if (updateData.remaining_players !== undefined) {
				lockInState.remainingPlayers = updateData.remaining_players;
			}
		}

		if (messageType === 'auto_lock_warning') {
			// 15-second warning before auto-lock
			if (updateData.message) {
				lockInState.autoLockMessage = updateData.message;
			}
		}

		if (messageType === 'auto_lock_complete') {
			// Auto-lock completed
			lockInState.autoLockMessage =
				updateData.message || "Time's up! Decisions locked automatically";
		}

		if (messageType === 'phase_transition') {
			// Phase transition (e.g., to resolution)
			const previousRound = gameState.currentRound;
			if (updateData.phase) {
				gameState.currentPhase = updateData.phase;
			}
			if (updateData.round !== undefined) {
				gameState.currentRound = updateData.round;
			}
			// Update lock-in state when transitioning phases
			if (updateData.locked_in !== undefined) {
				lockInState.isLockedIn = updateData.locked_in;
				if (!updateData.locked_in) {
					// Reset lock-in state when unlocking
					lockInState.resetLockIn();
				}
			}
			// US-3.5: Capture resolution results for consequences phase
			if (updateData.current_round_results) {
				const allResults = updateData.current_round_results;
				// Extract destination-specific results
				if (allResults.destinationResults && destName) {
					const destKey = Object.keys(allResults.destinationResults).find(
						(key) => key.toLowerCase() === destName.toLowerCase()
					);
					if (destKey) {
						currentResolution = allResults.destinationResults[destKey];
					} else {
						console.warn(`[Facilitator] No resolution results found for destination: ${destName}`);
						currentResolution = null;
					}
				}

				// Extract ESP satisfaction breakdown (used for behavior analysis section)
				if (allResults.espSatisfactionData) {
					espSatisfactionBreakdown = allResults.espSatisfactionData;
				}
			}
			// Also support older data structures for backward compatibility
			if (updateData.resolution_history && updateData.round !== undefined) {
				const currentRoundEntry = updateData.resolution_history.find(
					(entry: any) => entry.round === updateData.round
				);
				if (currentRoundEntry && currentRoundEntry.results) {
					const allResults = currentRoundEntry.results;
					if (allResults.destinationResults && destName) {
						const destKey = Object.keys(allResults.destinationResults).find(
							(key) => key.toLowerCase() === destName.toLowerCase()
						);
						if (destKey) {
							currentResolution = allResults.destinationResults[destKey];
						}
					}
					if (allResults.espSatisfactionData) {
						espSatisfactionBreakdown = allResults.espSatisfactionData;
					}
				}
			}
			if (updateData.final_scores) {
				finalScores = updateData.final_scores;
			}
			// US-2.7: Sync investigation history
			if (updateData.investigation_history) {
				investigationHistory = updateData.investigation_history;
			}
			// Show transition message via composable (auto-clears after timeout)
			if (updateData.message) {
				lockInState.showPhaseTransition(updateData.message);
			}
		}
	}

	// Handle destination dashboard updates from WebSocket
	function handleDestinationDashboardUpdate(update: any) {
		// Only apply updates for this destination (filter out updates for other destinations)
		// Use case-insensitive comparison since URL params are lowercase but API may use original case
		if (
			update.destinationName &&
			destName &&
			update.destinationName.toLowerCase() !== destName.toLowerCase()
		) {
			return;
		}

		if (update.budget !== undefined) budget = update.budget;
		if (update.esp_stats !== undefined) espStats = update.esp_stats;
		if (update.spam_level !== undefined) spamLevel = update.spam_level;
		if (update.technical_stack !== undefined) ownedTech = update.technical_stack;

		// Tech Shop updates (US-2.6.2)
		if (update.owned_tools !== undefined) ownedTools = update.owned_tools;
		if (update.authentication_level !== undefined)
			authenticationLevel = update.authentication_level;

		// Filtering Controls updates (US-2.6.1)
		if (update.filtering_policies !== undefined) filteringPolicies = update.filtering_policies;

		// Lock-in updates (US-3.2) via composable
		if (update.locked_in !== undefined) lockInState.isLockedIn = update.locked_in;
		if (update.locked_in_at) lockInState.lockedInAt = new Date(update.locked_in_at);

		// US-2.7: Investigation vote updates
		if (update.investigation_votes !== undefined) {
			investigationVotes = update.investigation_votes;
		}
		if (update.pending_investigation_vote !== undefined) {
			myInvestigationVote = update.pending_investigation_vote?.espName || null;
		}
	}

	// Timer: No client-side countdown needed - values come from WebSocket updates
	// This matches the ESP dashboard pattern for consistent timer behavior

	// Handle coordination panel click (US-2.7)
	function handleCoordinationClick() {
		showCoordinationPanel = true;
	}

	/**
	 * Handle investigation vote change (US-2.7)
	 * @param espName - ESP to vote for, or null to remove vote
	 */
	// US-2.7: Handle vote changes via API
	async function handleVoteChange(espName: string | null) {
		if (!destName) return;
		const endpoint = `/api/sessions/${roomCode}/destination/${destName}/investigation/vote`;

		try {
			if (espName) {
				// POST to cast vote
				const res = await fetch(endpoint, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ targetEsp: espName })
				});
				const data = await res.json();
				if (!data.success) {
					throw new Error(data.error || 'Failed to cast vote');
				}
				// Update local state (WebSocket will also send update)
				myInvestigationVote = espName;
				if (data.votes) {
					investigationVotes = data.votes;
				}
			} else {
				// DELETE to remove vote
				const res = await fetch(endpoint, { method: 'DELETE' });
				const data = await res.json();
				if (!data.success) {
					throw new Error(data.error || 'Failed to remove vote');
				}
				// Update local state
				myInvestigationVote = null;
				if (data.votes) {
					investigationVotes = data.votes;
				}
			}
		} catch (err) {
			throw err; // Let the modal handle the error display
		}
	}

	// Handle tech shop click (US-2.6.2) via composable
	function handleTechShopClick() {
		modals.openTechShop();
	}

	// Handle tool purchase (US-2.6.2)
	function handleToolPurchase(toolId: string, cost: number) {
		// All updates (budget, owned_tools, authentication_level) come via WebSocket
		// No optimistic updates needed - WebSocket broadcast is immediate after purchase
		// (Removed optimistic updates to fix double deduction bug)
	}

	// Handle filtering controls click (US-2.6.1) via composable
	function handleFilteringControlsClick() {
		modals.openFilteringControls();
	}

	// Handle retry after error (US-2.6.1)
	function handleRetry() {
		fetchDashboardData();
	}

	/**
	 * Handle lock-in click
	 * US-3.2: Lock in decisions for this destination
	 * US-2.7: Handle investigation vote auto-removal if budget insufficient
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

			// US-2.7: Handle vote auto-removal notification
			if (data.vote_auto_removed) {
				myInvestigationVote = null;
				autoCorrectionMessage = `Your investigation vote against ${data.removed_vote_target} was automatically removed due to insufficient budget.`;
			}

			// Update local state via composable (WebSocket will also send updates)
			lockInState.setLockedIn(true);
			lockInState.remainingPlayers = data.remaining_players || 0;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to lock in decisions';
		}
	}

	// Mount lifecycle
	onMount(async () => {
		await fetchDashboardData();

		// Connect to WebSocket
		websocketStore.connect(
			roomCode ?? '',
			() => {}, // onLobbyUpdate (not needed on dashboard)
			handleGameStateUpdate,
			undefined, // onESPDashboardUpdate (not for destinations)
			handleDestinationDashboardUpdate // onDestinationDashboardUpdate
		);

		// Timer values come from WebSocket updates - no need to start countdown

		// Expose test API for E2E tests
		if (typeof window !== 'undefined') {
			(window as any).__destinationDashboardTest = {
				get ready() {
					return !loading && !error;
				},
				setBudget: (value: number) => (budget = value),
				setCredits: (value: number) => (budget = value), // Alias for setBudget (US-3.2)
				setESPStats: (value: ESPDestinationStats[]) => {
					// Merge new stats with existing espStats instead of replacing
					const updated = [...espStats];
					for (const newStat of value) {
						const index = updated.findIndex((s) => s.espName === newStat.espName);
						if (index >= 0) {
							updated[index] = newStat; // Update existing ESP
						} else {
							updated.push(newStat); // Add new ESP
						}
					}
					espStats = updated;
				},
				setOwnedTech: (value: string[]) => (ownedTech = value),
				setRound: (value: number) => (gameState.currentRound = value),
				setPhase: (value: string) => (gameState.currentPhase = value),
				setTimer: (value: number) => (gameState.timerSeconds = value),
				setWsStatus: (connected: boolean, errorMsg?: string) => {
					// For testing WebSocket connection states - use composable
					wsStatus.setTestStatus(connected, errorMsg);
				},
				setError: (errorMsg: string | null) => (error = errorMsg),
				setLoading: (isLoading: boolean) => (loading = isLoading),

				// Tech Shop test API (US-2.6.2) via composable
				openTechShop: () => modals.openTechShop(),
				closeTechShop: () => modals.closeTechShop(),
				getTechShopOpen: () => modals.showTechShop,
				getOwnedTools: () => ownedTools,
				setOwnedTools: (value: string[]) => (ownedTools = value),
				getAuthLevel: () => authenticationLevel,
				setAuthLevel: (value: number) => (authenticationLevel = value),
				getKingdom: () => kingdom,
				setKingdom: (value: 'Gmail' | 'Outlook' | 'Yahoo') => (kingdom = value),

				// Filtering Controls test API (US-2.6.1) via composable
				openFilteringControls: () => modals.openFilteringControls(),
				closeFilteringControls: () => modals.closeFilteringControls(),
				getFilteringControlsOpen: () => modals.showFilteringControls,
				getFilteringPolicies: () => filteringPolicies,
				setFilteringPolicies: (value: Record<string, FilteringPolicy>) =>
					(filteringPolicies = value),

				// Lock-in test API (US-3.2) via composable
				setLockedIn: (locked: boolean) => {
					lockInState.setLockedIn(locked);
				},
				setRemainingPlayers: (count: number) => (lockInState.remainingPlayers = count),
				setAutoLockMessage: (msg: string | null) => (lockInState.autoLockMessage = msg),
				getCurrentPhase: () => gameState.currentPhase
			};
		}
	});

	// Destroy lifecycle
	onDestroy(() => {
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

<!-- WebSocket Status Indicator (only when disconnected) - via wsStatus composable -->
{#if !wsStatus.connected && wsStatus.error}
	<div class="fixed top-0 left-0 right-0 z-40 mt-12">
		<div
			data-testid="ws-status"
			class="bg-amber-50 border-b-2 border-amber-200 py-2 px-6 flex items-center justify-center gap-2 text-amber-800 text-sm"
		>
			<span class="animate-pulse">⚠️</span>
			<span>Connection lost: {wsStatus.error}. Attempting to reconnect...</span>
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
	{:else if gameState.currentPhase === 'consequences'}
		<!-- US-3.5: Consequences Phase Display -->
		<DestinationConsequences
			{destinationName}
			currentRound={gameState.currentRound}
			{budget}
			resolution={currentResolution ?? undefined}
			espSatisfactionBreakdown={espSatisfactionBreakdown ?? undefined}
			{investigationHistory}
		/>
	{:else if gameState.currentPhase === 'resolution'}
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

				<!-- Auto-lock Message (if present) - US-3.2 via lockInState composable -->
				{#if lockInState.autoLockMessage}
					<div
						data-testid="auto-lock-message"
						class="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-sm"
						role="alert"
					>
						{lockInState.autoLockMessage}
					</div>
				{/if}
			</div>
		</div>
	{:else if gameState.currentPhase === 'finished'}
		<!-- US-5.2: Victory Screen -->
		<VictoryScreen {finalScores} />
	{:else}
		<!-- Header -->
		<DashboardHeader
			entityName={destinationName}
			currentBudget={availableBudget}
			pendingCosts={myInvestigationVote ? INVESTIGATION_COST : 0}
			currentRound={gameState.currentRound}
			totalRounds={gameState.totalRounds}
			timerSeconds={gameState.timerSeconds}
			theme="blue"
			isLockedIn={lockInState.isLockedIn}
			isPaused={gameState.isPaused}
		/>

		<!-- US-8.2-0.1: Game Paused Banner -->
		{#if gameState.isPaused}
			<div
				data-testid="game-paused-banner"
				class="bg-amber-100 border-b border-amber-300 px-4 py-3 text-center"
				role="alert"
			>
				<span class="text-amber-800 font-semibold">⏸ Game Paused</span>
				<span class="text-amber-700 ml-2">The facilitator has paused the game</span>
			</div>
		{/if}

		<!-- US-2.7: Auto-correction message for vote removal -->
		{#if autoCorrectionMessage}
			<div
				data-testid="auto-correction-message"
				class="mx-4 mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-sm"
				role="alert"
			>
				⚠️ {autoCorrectionMessage}
			</div>
		{/if}

		<!-- Dashboard Content (Planning Phase) -->
		<div class="container mx-auto px-4 py-6 max-w-7xl">
			<!-- Quick Actions -->
			<DestinationQuickActions
				onCoordinationClick={handleCoordinationClick}
				onTechShopClick={handleTechShopClick}
				onFilteringClick={handleFilteringControlsClick}
			/>

			<!-- Dashboard Grid -->
			<div data-testid="dashboard-layout" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
				<!-- ESP Statistics (full width) -->
				<div class="lg:col-span-2">
					<ESPStatisticsOverview {espStats} currentRound={gameState.currentRound} />
				</div>

				<!-- Technical Infrastructure -->
				<div>
					<TechnicalInfrastructure {ownedTools} {kingdom} />
				</div>

				<!-- Coordination Status -->
				<div>
					<CoordinationStatus
						onCoordinationClick={handleCoordinationClick}
						myVote={myInvestigationVote}
						currentVotes={investigationVotes}
					/>
				</div>
			</div>

			<!-- Lock In Button -->
			<LockInButton
				phase={gameState.currentPhase}
				isLockedIn={lockInState.isLockedIn}
				remainingPlayers={lockInState.remainingPlayers}
				onLockIn={handleLockIn}
			/>

			<!-- Phase Transition Message (US-3.2) via lockInState composable -->
			{#if lockInState.phaseTransitionMessage}
				<div
					data-testid="phase-transition-message"
					role="alert"
					class="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 text-blue-800 text-sm font-semibold"
				>
					{lockInState.phaseTransitionMessage}
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Tech Shop Modal (US-2.6.2) via modals composable -->
<TechnicalShopModal
	bind:show={modals.showTechShop}
	isLockedIn={lockInState.isLockedIn}
	roomCode={roomCode ?? ''}
	destName={destName ?? ''}
	{kingdom}
	currentBudget={budget}
	authLevel={authenticationLevel}
	onToolPurchased={handleToolPurchase}
/>

<!-- Filtering Controls Modal (US-2.6.1) via modals composable -->
<FilteringControlsModal
	bind:show={modals.showFilteringControls}
	isLockedIn={lockInState.isLockedIn}
	roomCode={roomCode ?? ''}
	destName={destName ?? ''}
	espTeams={espTeamsForFiltering.map((esp) => ({
		...esp,
		satisfaction: esp.satisfaction ?? 0
	}))}
	{filteringPolicies}
	dashboardError={error}
	onRetry={handleRetry}
/>

<!-- Coordination Panel Modal (US-2.7) -->
<CoordinationPanelModal
	bind:show={showCoordinationPanel}
	isLockedIn={lockInState.isLockedIn}
	roomCode={roomCode ?? ''}
	destName={destName ?? ''}
	currentBudget={availableBudget}
	espTeams={espTeamsForCoordination}
	currentVotes={investigationVotes}
	myVote={myInvestigationVote}
	{investigationHistory}
	onVoteChange={handleVoteChange}
/>

<!-- Incident Card Display via incidentState composable -->
<IncidentCardDisplay
	bind:show={incidentState.showIncidentCard}
	incident={incidentState.currentIncident}
	affectedTeam={incidentState.currentIncident?.affectedTeam}
	onClose={() => incidentState.hideIncident()}
/>
