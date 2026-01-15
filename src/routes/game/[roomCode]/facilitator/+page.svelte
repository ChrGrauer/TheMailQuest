<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import {
		websocketStore,
		type GameStateUpdate,
		type ESPDashboardUpdate,
		type LobbyUpdate
	} from '$lib/stores/websocket';
	import type { IncidentCard, IncidentHistoryEntry } from '$lib/types/incident';
	import type { Client, ClientState, DestinationDashboardUpdate } from '$lib/server/game/types';
	import IncidentTriggerButton from '$lib/components/incident/IncidentTriggerButton.svelte';
	import IncidentSelectionModal from '$lib/components/incident/IncidentSelectionModal.svelte';
	import IncidentCardDisplay from '$lib/components/incident/IncidentCardDisplay.svelte';
	import IncidentHistory from '$lib/components/incident/IncidentHistory.svelte';
	import { TECHNICAL_UPGRADES } from '$lib/config/technical-upgrades';
	import { DESTINATION_TOOLS } from '$lib/config/destination-technical-upgrades';

	// US-8.2-0.2: Types for metrics data
	interface ESPMetrics {
		name: string;
		budget: number;
		reputation: Record<string, number>;
		ownedTechUpgrades: string[];
		activeClients: string[];
		availableClients: Client[];
		clientStates: Record<string, ClientState>;
		lockedIn?: boolean;
	}

	interface DestinationMetrics {
		name: string;
		kingdom: string;
		budget: number;
		ownedTools: string[];
		espMetrics: Record<string, { user_satisfaction: number; spam_level: number }>;
	}

	// Props from server load
	let { data } = $props();

	const roomCode = $page.params.roomCode;

	// Initialize from server data
	let round = $state(data?.initialData?.currentRound ?? 1);
	let phase = $state(data?.initialData?.currentPhase ?? 'planning');
	let timerRemaining = $state(300);
	let isPaused = $state(false);

	// US-8.2-0.2: Metrics state
	let espTeams = $state<ESPMetrics[]>(data?.initialData?.espTeams ?? []);
	let destinations = $state<DestinationMetrics[]>(data?.initialData?.destinations ?? []);
	let resolutionHistory = $state<any[]>(data?.initialData?.resolutionHistory ?? []);

	// US-8.2: Real-time metadata and status
	let availableClientsDefinitions = $state<Client[]>([]);

	// Initialize available clients from all teams on load
	onMount(() => {
		const allClients: Client[] = [];
		espTeams.forEach((esp) => {
			esp.availableClients.forEach((client) => {
				if (!allClients.find((c) => c.id === client.id)) {
					allClients.push(client);
				}
			});
		});
		availableClientsDefinitions = allClients;
	});

	// Start Next Round button state
	let isStartingRound = $state(false);
	let error = $state<string | null>(null);

	// Calculate Final Scores button state
	let isCalculatingScores = $state(false);

	// US-8.2-0.1: Timer control button states
	let isPausingResuming = $state(false);
	let isExtending = $state(false);
	let isEndingPhase = $state(false);
	let isEndingGame = $state(false);

	// Confirmation dialog state
	let showConfirmDialog = $state(false);
	let confirmDialogAction = $state<'endPhase' | 'endGame' | null>(null);

	// Incident state
	let showIncidentSelectionModal = $state(false);
	let showIncidentCard = $state(false);
	let currentIncident = $state<IncidentCard | null>(null);
	let incidentHistory = $state<IncidentHistoryEntry[]>([]);

	// Format timer as M:SS
	let timerDisplay = $derived(
		`${Math.floor(timerRemaining / 60)}:${String(timerRemaining % 60).padStart(2, '0')}`
	);

	// Show "Start Next Round" button only during consequences phase of rounds 1-3
	let showStartButton = $derived(phase === 'consequences' && round >= 1 && round <= 3);

	// Show "Calculate Final Scores" button only during consequences phase of round 4
	let showFinalScoresButton = $derived(phase === 'consequences' && round === 4);

	// US-8.2-0.1: Button visibility conditions
	let showPauseResumeButton = $derived(phase === 'planning');
	let showExtendButton = $derived(phase === 'planning');
	let showEndPhaseButton = $derived(phase === 'planning');
	let showEndGameEarlyButton = $derived(phase === 'consequences' && round >= 1 && round <= 3);

	// Handle lobby updates from WebSocket
	function handleLobbyUpdate(data: LobbyUpdate | any) {
		console.debug('[Facilitator] Received LobbyUpdate:', data);
		const lobbyData = data.data || data;
		// Update espTeams if we don't have them all yet
		lobbyData.espTeams?.forEach((newTeam: any) => {
			if (!espTeams.find((t) => t.name.toLowerCase() === newTeam.name.toLowerCase())) {
				console.info(`[Facilitator] Adding new team from lobby: ${newTeam.name}`);
				espTeams = [
					...espTeams,
					{
						name: newTeam.name,
						budget: 1000,
						reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
						ownedTechUpgrades: [],
						activeClients: [],
						availableClients: [],
						clientStates: {},
						lockedIn: false
					}
				];
			}
		});
	}

	// Handle game state updates from WebSocket
	function handleGameStateUpdate(data: GameStateUpdate | any) {
		console.debug('[Facilitator] Received GameStateUpdate:', data.type, data);
		const stateData = data.data || data;

		// US-8.2-0.1: Handle timer_update messages
		if (data.type === 'timer_update' || (data.data && data.data.type === 'timer_update')) {
			const timerData = data.data || data;
			isPaused = timerData.isPaused;
			if (timerData.remainingTime !== undefined) {
				timerRemaining = timerData.remainingTime;
			}
			// Reset button states
			isPausingResuming = false;
			isExtending = false;
			return;
		}

		// Handle esp_dashboard_update messages
		if (data.type === 'esp_dashboard_update' || stateData.type === 'esp_dashboard_update') {
			handleESPDashboardUpdate(stateData);
			return;
		}

		// Handle player_locked_in messages
		if (data.type === 'player_locked_in' || stateData.type === 'player_locked_in') {
			const playerName = stateData.playerName || stateData.teamName;
			// US-3.2: Only update lock status if in planning phase
			if (playerName && phase === 'planning') {
				espTeams = espTeams.map((esp) =>
					esp.name.toLowerCase() === playerName.toLowerCase() ? { ...esp, lockedIn: true } : esp
				);
			}
			return;
		}

		// Handle phase_transition messages (nested structure)
		if (data.type === 'phase_transition' && data.data) {
			if (data.data.phase !== undefined) {
				phase = data.data.phase;
				// Reset loading states when phase changes
				isStartingRound = false;
				isEndingPhase = false;
				isEndingGame = false;
				isPaused = false;

				// Clear lock-in status when moving to planning or other interactive phases
				if (phase === 'planning' || phase === 'resolution') {
					console.debug(`[Facilitator] Resetting espTeams locks for phase: ${phase}`);
					espTeams = espTeams.map((esp) => ({ ...esp, lockedIn: false }));
				}
			}
			if (data.data.round !== undefined) {
				round = data.data.round;
			}
			if (data.data.timer_remaining !== undefined) {
				timerRemaining = data.data.timer_remaining;
			}
			// Update incident history if present
			if (data.data.incident_history !== undefined) {
				incidentHistory = data.data.incident_history;
			}
			// US-8.2-0.2: Update resolution history for satisfaction display
			if (data.data.resolution_history !== undefined) {
				resolutionHistory = data.data.resolution_history;
			}
			// Handle lock status passed in transition
			if (data.data.locked_in === false) {
				espTeams = espTeams.map((esp) => ({ ...esp, lockedIn: false }));
			}
			return;
		}

		// Handle regular game_state_update messages
		if (data.round !== undefined) {
			round = data.round;
		}
		if (data.phase !== undefined) {
			const oldPhase = phase;
			phase = data.phase;
			// Reset loading states when phase changes
			isStartingRound = false;
			isEndingPhase = false;
			isEndingGame = false;
			isPaused = false;

			// US-3.2: Reset locks if moving to planning from something else
			if (phase === 'planning' && oldPhase !== 'planning') {
				console.debug('[Facilitator] Resetting espTeams locks via game_state_update');
				espTeams = espTeams.map((esp) => ({ ...esp, lockedIn: false }));
			}
		}
		if (data.timer_remaining !== undefined) {
			timerRemaining = data.timer_remaining;
		}
		// Handle isPaused state from game_state_update
		if (data.isPaused !== undefined) {
			isPaused = data.isPaused;
		}
		// Update incident history if present
		if (data.incident_history !== undefined) {
			incidentHistory = data.incident_history;
		}
	}

	// Fetch incident history on mount
	async function fetchIncidentHistory() {
		try {
			const response = await fetch(`/api/sessions/${roomCode}`);
			if (response.ok) {
				const data = await response.json();
				if (data.success && data.session.incident_history) {
					incidentHistory = data.session.incident_history;
				}
			}
		} catch (err) {
			console.error('Error fetching incident history:', err);
		}
	}

	// Handle incident trigger button click
	function handleTriggerIncident() {
		showIncidentSelectionModal = true;
	}

	// Handle successful incident trigger
	function handleIncidentTriggered(incident: IncidentCard) {
		// Add to history
		incidentHistory = [
			...incidentHistory,
			{
				incidentId: incident.id,
				name: incident.name,
				category: incident.category,
				roundTriggered: round,
				timestamp: new Date()
			}
		];

		// Show card display
		currentIncident = incident;
		showIncidentCard = true;
	}

	// Handle incident card close
	function handleIncidentCardClose() {
		showIncidentCard = false;
		currentIncident = null;
	}

	// US-8.2-0.2: Handle ESP dashboard updates for real-time metrics
	function handleESPDashboardUpdate(data: ESPDashboardUpdate | any) {
		const update = data.data || data;
		console.debug('[Facilitator] Received ESPDashboardUpdate for:', update.teamName, update);
		const teamName = update.teamName;
		if (!teamName) return;

		// US-8.2: Sync available clients definitions if provided
		if (update.available_clients) {
			update.available_clients.forEach((client: any) => {
				if (!availableClientsDefinitions.find((c) => c.id === client.id)) {
					availableClientsDefinitions = [...availableClientsDefinitions, client];
				}
			});
		}

		espTeams = espTeams.map((esp) => {
			if (esp.name.toLowerCase() !== teamName.toLowerCase()) return esp;

			const updatedEsp = { ...esp };

			// Update metrics
			if (update.credits !== undefined) updatedEsp.budget = update.credits;
			if (update.reputation !== undefined) updatedEsp.reputation = update.reputation;
			if (update.owned_tech_upgrades !== undefined)
				updatedEsp.ownedTechUpgrades = update.owned_tech_upgrades;
			if (update.clients !== undefined) updatedEsp.activeClients = update.clients;
			if (update.client_states !== undefined) updatedEsp.clientStates = update.client_states;
			if (update.available_clients !== undefined)
				updatedEsp.availableClients = update.available_clients;

			// US-3.2: Sync lock status (only if in planning phase)
			if (update.locked_in !== undefined && phase === 'planning') {
				updatedEsp.lockedIn = update.locked_in;
			}

			return updatedEsp;
		});
	}

	// US-8.2-0.2: Handle destination dashboard updates for real-time metrics
	function handleDestinationDashboardUpdate(
		update: DestinationDashboardUpdate & { destinationName?: string }
	) {
		console.debug(
			'[Facilitator] Received DestinationDashboardUpdate for:',
			update.destinationName,
			update
		);
		if (!update.destinationName) return;

		destinations = destinations.map((dest) => {
			if (dest.name !== update.destinationName) return dest;

			return {
				...dest,
				budget: update.budget ?? dest.budget,
				ownedTools: update.owned_tools ?? dest.ownedTools,
				espMetrics: update.esp_metrics ?? dest.espMetrics
			};
		});
	}

	// US-8.2-0.2: Get spam rate for ESP from resolution history
	function getSpamRate(espName: string): string {
		// Prefer live metrics from destinations if available
		for (const dest of destinations) {
			const metrics = dest.espMetrics?.[espName];
			if (metrics?.spam_level !== undefined) {
				return `${metrics.spam_level.toFixed(1)}%`;
			}
		}

		if (resolutionHistory.length === 0) return 'N/A';

		const latestResolution = resolutionHistory[resolutionHistory.length - 1];
		const espResult = latestResolution?.results?.espResults?.[espName];

		if (!espResult?.complaints?.adjustedComplaintRate) return 'N/A';

		return `${espResult.complaints.adjustedComplaintRate.toFixed(1)}%`;
	}

	// US-8.2-0.2: Get clients breakdown by type
	function getClientsByType(
		activeIds: string[],
		availableDefs: Client[],
		states: Record<string, ClientState>
	): string {
		if (!activeIds || activeIds.length === 0) return 'None';

		const clientNames: string[] = [];
		const typeCounts: Record<string, number> = {};
		const typeLabels: Record<string, string> = {
			startup: 'Startup',
			premium_brand: 'Premium'
		};

		for (const id of activeIds) {
			// US-8.2: Use definitions if available, otherwise just use IDs
			const client =
				availableDefs.find((c) => c.id === id) ||
				availableClientsDefinitions.find((c) => c.id === id);

			if (client) {
				const label = typeLabels[client.type] || client.type;
				typeCounts[label] = (typeCounts[label] || 0) + 1;
				clientNames.push(client.name);
			} else {
				clientNames.push(id.split('-').pop() || id); // Fallback to partial ID if definition not found
			}
		}

		const summary = Object.entries(typeCounts)
			.map(([type, count]) => `${count} ${type}`)
			.join(', ');

		return summary ? `${summary} (${clientNames.join(', ')})` : clientNames.join(', ');
	}

	// US-8.2-0.2: Get destination user satisfaction
	function getDestinationSatisfaction(dest: DestinationMetrics): string {
		// Prefer live aggregated satisfaction if available in destination dashboard update
		// (Calculated on server during resolution and sent in updates)
		// Note: The DestinationMetrics interface might need checking for a direct satisfaction field
		// or we can look at esp_metrics average
		const espMetricsValues = Object.values(dest.espMetrics || {});
		if (espMetricsValues.length > 0) {
			const avgSatisfaction =
				espMetricsValues.reduce((sum, m) => sum + m.user_satisfaction, 0) / espMetricsValues.length;
			return `${Math.round(avgSatisfaction)}%`;
		}

		// Check resolution history for satisfaction data
		if (resolutionHistory.length === 0) return 'N/A';

		const latestResolution = resolutionHistory[resolutionHistory.length - 1];
		const destResult = latestResolution?.results?.destinationResults?.[dest.name];

		if (destResult?.aggregatedSatisfaction !== undefined) {
			return `${Math.round(destResult.aggregatedSatisfaction)}%`;
		}

		return 'N/A';
	}

	onMount(() => {
		// Connect to WebSocket for real-time game state updates
		websocketStore.connect(
			roomCode as string,
			handleLobbyUpdate, // Correctly handle new teams joining
			handleGameStateUpdate,
			handleESPDashboardUpdate, // US-8.2-0.2: Listen for ESP dashboard updates
			handleDestinationDashboardUpdate // US-8.2-0.2: Listen for destination dashboard updates
		);

		// Fetch incident history
		fetchIncidentHistory();
	});

	onDestroy(() => {
		websocketStore.disconnect();
	});

	/**
	 * Handle Start Next Round button click
	 * Calls API endpoint to increment round and transition to planning phase
	 */
	async function handleStartNextRound() {
		isStartingRound = true;
		error = null;

		try {
			const response = await fetch(`/api/sessions/${roomCode}/next-round`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!response.ok) {
				const data = await response.json();
				error = data.error || 'Failed to start next round';
				isStartingRound = false;
				return;
			}

			// Success - button will disappear when phase updates via WebSocket
			// isStartingRound will be reset when phase changes
		} catch (err) {
			error = 'Network error. Please try again.';
			isStartingRound = false;
		}
	}

	/**
	 * Handle Calculate Final Scores button click
	 * Calls API endpoint to calculate scores and transition to finished phase
	 * US-5.1: Final Score Calculation
	 */
	async function handleCalculateFinalScores() {
		isCalculatingScores = true;
		error = null;

		try {
			const response = await fetch(`/api/sessions/${roomCode}/calculate-final-scores`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!response.ok) {
				const data = await response.json();
				error = data.error || 'Failed to calculate final scores';
				isCalculatingScores = false;
				return;
			}

			// Success - phase will update to 'finished' via WebSocket
			// isCalculatingScores will be reset when phase changes
		} catch (err) {
			error = 'Network error. Please try again.';
			isCalculatingScores = false;
		}
	}

	/**
	 * US-8.2-0.1: Handle Pause/Resume button click
	 */
	async function handlePauseResume() {
		isPausingResuming = true;
		error = null;

		try {
			const action = isPaused ? 'resume' : 'pause';
			const response = await fetch(`/api/sessions/${roomCode}/timer`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action })
			});

			if (!response.ok) {
				const data = await response.json();
				error = data.error || `Failed to ${action} game`;
				isPausingResuming = false;
				return;
			}

			// Success - state will update via WebSocket
		} catch (err) {
			error = 'Network error. Please try again.';
			isPausingResuming = false;
		}
	}

	/**
	 * US-8.2-0.1: Handle Extend Timer button click
	 */
	async function handleExtendTimer() {
		isExtending = true;
		error = null;

		try {
			const response = await fetch(`/api/sessions/${roomCode}/timer`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'extend', seconds: 60 })
			});

			if (!response.ok) {
				const data = await response.json();
				error = data.error || 'Failed to extend timer';
				isExtending = false;
				return;
			}

			// Success - state will update via WebSocket
		} catch (err) {
			error = 'Network error. Please try again.';
			isExtending = false;
		}
	}

	/**
	 * US-8.2-0.1: Open confirmation dialog for End Phase
	 */
	function handleEndPhaseClick() {
		confirmDialogAction = 'endPhase';
		showConfirmDialog = true;
	}

	/**
	 * US-8.2-0.1: Open confirmation dialog for End Game Early
	 */
	function handleEndGameEarlyClick() {
		confirmDialogAction = 'endGame';
		showConfirmDialog = true;
	}

	/**
	 * US-8.2-0.1: Handle confirmation dialog cancel
	 */
	function handleConfirmCancel() {
		showConfirmDialog = false;
		confirmDialogAction = null;
	}

	/**
	 * US-8.2-0.1: Handle confirmation dialog confirm
	 */
	async function handleConfirmAction() {
		if (confirmDialogAction === 'endPhase') {
			await executeEndPhase();
		} else if (confirmDialogAction === 'endGame') {
			await executeEndGame();
		}
		showConfirmDialog = false;
		confirmDialogAction = null;
	}

	/**
	 * US-8.2-0.1: Execute End Phase action
	 * Triggers auto-lock and phase transition
	 */
	async function executeEndPhase() {
		isEndingPhase = true;
		error = null;

		try {
			// First auto-lock all players
			const autoLockResponse = await fetch(`/api/sessions/${roomCode}/auto-lock`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!autoLockResponse.ok) {
				const data = await autoLockResponse.json();
				error = data.error || 'Failed to end phase';
				isEndingPhase = false;
				return;
			}

			// Phase transition will happen automatically after auto-lock
			// isEndingPhase will be reset when phase changes via WebSocket
		} catch (err) {
			error = 'Network error. Please try again.';
			isEndingPhase = false;
		}
	}

	/**
	 * US-8.2-0.1: Execute End Game Early action
	 * Calculates final scores and transitions to finished phase
	 */
	async function executeEndGame() {
		isEndingGame = true;
		error = null;

		try {
			const response = await fetch(`/api/sessions/${roomCode}/calculate-final-scores`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ forceEarly: true })
			});

			if (!response.ok) {
				const data = await response.json();
				error = data.error || 'Failed to end game';
				isEndingGame = false;
				return;
			}

			// Success - phase will update to 'finished' via WebSocket
		} catch (err) {
			error = 'Network error. Please try again.';
			isEndingGame = false;
		}
	}
</script>

<div class="container">
	<h1>Facilitator Dashboard</h1>
	<p>Room Code: {roomCode}</p>
	<p>Round {round} - <span data-testid="current-phase">{phase}</span> Phase</p>

	<div class="timer-container">
		<div data-testid="game-timer" class="timer">
			{timerDisplay}
		</div>
		{#if isPaused}
			<span data-testid="timer-paused-indicator" class="paused-indicator">PAUSED</span>
		{/if}
	</div>

	<!-- Facilitator Actions -->
	<div class="actions-panel">
		<!-- US-8.2-0.1: Timer Controls (planning phase only) -->
		{#if showPauseResumeButton}
			{#if isPaused}
				<button
					data-testid="resume-game-button"
					onclick={handlePauseResume}
					disabled={isPausingResuming}
					class="control-button resume-button"
					class:loading={isPausingResuming}
				>
					{isPausingResuming ? 'Resuming...' : 'Resume Game'}
				</button>
			{:else}
				<button
					data-testid="pause-game-button"
					onclick={handlePauseResume}
					disabled={isPausingResuming}
					class="control-button pause-button"
					class:loading={isPausingResuming}
				>
					{isPausingResuming ? 'Pausing...' : 'Pause Game'}
				</button>
			{/if}
		{/if}

		{#if showExtendButton}
			<button
				data-testid="extend-timer-button"
				onclick={handleExtendTimer}
				disabled={isExtending}
				class="control-button extend-button"
				class:loading={isExtending}
			>
				{isExtending ? 'Extending...' : 'Extend Timer (+60s)'}
			</button>
		{/if}

		{#if showEndPhaseButton}
			<button
				data-testid="end-phase-button"
				onclick={handleEndPhaseClick}
				disabled={isEndingPhase}
				class="control-button end-phase-button"
				class:loading={isEndingPhase}
			>
				{isEndingPhase ? 'Ending Phase...' : 'End Current Phase'}
			</button>
		{/if}

		{#if showEndGameEarlyButton}
			<button
				data-testid="end-game-early-button"
				onclick={handleEndGameEarlyClick}
				disabled={isEndingGame}
				class="control-button end-game-button"
				class:loading={isEndingGame}
			>
				{isEndingGame ? 'Ending Game...' : 'End Game Early'}
			</button>
		{/if}

		{#if showStartButton}
			<button
				data-testid="start-next-round-button"
				onclick={handleStartNextRound}
				disabled={isStartingRound}
				class="start-button"
				class:loading={isStartingRound}
			>
				{isStartingRound ? 'Starting...' : 'Start Next Round'}
			</button>
		{/if}

		{#if showFinalScoresButton}
			<button
				data-testid="calculate-final-scores-button"
				onclick={handleCalculateFinalScores}
				disabled={isCalculatingScores}
				class="final-scores-button"
				class:loading={isCalculatingScores}
			>
				{isCalculatingScores ? 'Calculating...' : 'Calculate Final Scores'}
			</button>
		{/if}

		<!-- Incident Trigger Button -->
		<IncidentTriggerButton disabled={false} onClick={handleTriggerIncident} />
	</div>

	{#if error}
		<div data-testid="error-message" class="error-banner" role="alert">
			{error}
		</div>
	{/if}

	<!-- Incident History -->
	{#if incidentHistory.length > 0}
		<div class="incident-history-section">
			<IncidentHistory history={incidentHistory} />
		</div>
	{/if}

	<!-- US-8.2-0.2: ESP Metrics Table -->
	<section class="metrics-section">
		<h2>ESP Teams</h2>
		<div class="table-container">
			<table data-testid="esp-metrics-table" class="metrics-table">
				<thead>
					<tr>
						<th>Team</th>
						<th>Status</th>
						<th>Budget</th>
						<th>Gmail Rep</th>
						<th>Outlook Rep</th>
						<th>Yahoo Rep</th>
						<th>Spam Rate</th>
						<th>Clients</th>
						<th>Tech Tools</th>
					</tr>
				</thead>
				<tbody>
					{#each espTeams as esp}
						<tr data-testid="esp-row-{esp.name}">
							<td class="team-name">{esp.name}</td>
							<td data-testid="esp-lock-status">
								{#if esp.lockedIn}
									<span class="text-emerald-500 font-semibold flex items-center gap-1">
										<span data-testid="lock-icon" class="text-lg">✓</span> Locked In
									</span>
								{:else if phase === 'planning'}
									<span class="text-amber-500 font-medium animate-pulse">Planning...</span>
								{:else}
									<span class="text-gray-400">Idle</span>
								{/if}
							</td>
							<td data-testid="esp-budget">{esp.budget}</td>
							<td data-testid="esp-rep-Gmail">{esp.reputation?.Gmail ?? 70}</td>
							<td data-testid="esp-rep-Outlook">{esp.reputation?.Outlook ?? 70}</td>
							<td data-testid="esp-rep-Yahoo">{esp.reputation?.Yahoo ?? 70}</td>
							<td data-testid="esp-spam-rate">{getSpamRate(esp.name)}</td>
							<td data-testid="esp-clients"
								>{getClientsByType(esp.activeClients, esp.availableClients, esp.clientStates)}</td
							>
							<td data-testid="esp-tech-tools" class="tech-tools-cell">
								{#each TECHNICAL_UPGRADES as tech}
									<span
										data-testid="tech-{tech.id}"
										data-owned={esp.ownedTechUpgrades.includes(tech.id) ? 'true' : 'false'}
										class="tech-badge"
										class:owned={esp.ownedTechUpgrades.includes(tech.id)}
									>
										{tech.id === 'content-filtering'
											? 'Content'
											: tech.id === 'advanced-monitoring'
												? 'Monitor'
												: tech.id.toUpperCase()}
										{esp.ownedTechUpgrades.includes(tech.id) ? '✓' : '✗'}
									</span>
								{/each}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<!-- US-8.2-0.2: Destination Metrics Table -->
	<section class="metrics-section">
		<h2>Destinations</h2>
		<div class="table-container">
			<table data-testid="destination-metrics-table" class="metrics-table">
				<thead>
					<tr>
						<th>Destination</th>
						<th>Budget</th>
						<th>User Satisfaction</th>
						<th>Tech Tools</th>
					</tr>
				</thead>
				<tbody>
					{#each destinations as dest}
						<tr data-testid="dest-row-{dest.name}">
							<td class="dest-name">{dest.name}</td>
							<td data-testid="dest-budget">{dest.budget}</td>
							<td data-testid="dest-satisfaction">{getDestinationSatisfaction(dest)}</td>
							<td data-testid="dest-tech-tools" class="tech-tools-cell">
								{#each Object.values(DESTINATION_TOOLS) as tool}
									<span
										data-testid="tool-{tool.id}"
										data-owned={dest.ownedTools.includes(tool.id) ? 'true' : 'false'}
										class="tech-badge"
										class:owned={dest.ownedTools.includes(tool.id)}
									>
										{tool.id === 'content_analysis_filter'
											? 'Content'
											: tool.id === 'auth_validator_l1'
												? 'Auth L1'
												: tool.id === 'auth_validator_l2'
													? 'Auth L2'
													: tool.id === 'auth_validator_l3'
														? 'Auth L3'
														: tool.id === 'ml_system'
															? 'ML'
															: tool.id === 'spam_trap_network'
																? 'Trap'
																: tool.id === 'volume_throttling'
																	? 'Throttle'
																	: tool.id}
										{dest.ownedTools.includes(tool.id) ? '✓' : '✗'}
									</span>
								{/each}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
</div>

<!-- Incident Selection Modal -->
<IncidentSelectionModal
	bind:show={showIncidentSelectionModal}
	roomCode={roomCode as string}
	currentRound={round}
	onClose={() => (showIncidentSelectionModal = false)}
	onTriggerSuccess={handleIncidentTriggered}
/>

<!-- Incident Card Display -->
<IncidentCardDisplay
	bind:show={showIncidentCard}
	incident={currentIncident}
	affectedTeam={currentIncident?.affectedTeam}
	onClose={handleIncidentCardClose}
/>

<!-- US-8.2-0.1: Confirmation Dialog -->
{#if showConfirmDialog}
	<div class="modal-backdrop" role="dialog" aria-modal="true" tabindex="-1">
		<div data-testid="confirmation-dialog" class="confirmation-dialog">
			<h3>
				{#if confirmDialogAction === 'endPhase'}
					End Planning Phase?
				{:else}
					End Game Early?
				{/if}
			</h3>
			<p>
				{#if confirmDialogAction === 'endPhase'}
					Are you sure you want to end the planning phase early? All players who haven't locked in
					will be auto-locked with their current decisions.
				{:else}
					Are you sure you want to end the game early? This will calculate final scores and end the
					game.
				{/if}
			</p>
			<div class="dialog-actions">
				<button data-testid="cancel-button" onclick={handleConfirmCancel} class="cancel-button">
					Cancel
				</button>
				<button data-testid="confirm-button" onclick={handleConfirmAction} class="confirm-button">
					Confirm
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.container {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.timer {
		font-size: 2rem;
		font-weight: bold;
		margin: 1rem 0;
	}

	.start-button {
		padding: 0.75rem 1.5rem;
		background-color: #10b981;
		color: white;
		font-weight: 600;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		font-size: 1rem;
		margin: 1rem 0;
		transition: all 0.2s;
	}

	.start-button:hover:not(:disabled) {
		background-color: #059669;
	}

	.start-button:focus {
		outline: none;
		box-shadow:
			0 0 0 2px white,
			0 0 0 4px #10b981;
	}

	.start-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.start-button.loading {
		opacity: 0.7;
	}

	.final-scores-button {
		padding: 0.75rem 1.5rem;
		background-color: #f59e0b;
		color: white;
		font-weight: 600;
		border: none;
		border-radius: 0.5rem;
		cursor: pointer;
		font-size: 1rem;
		margin: 1rem 0;
		transition: all 0.2s;
	}

	.final-scores-button:hover:not(:disabled) {
		background-color: #d97706;
	}

	.final-scores-button:focus {
		outline: none;
		box-shadow:
			0 0 0 2px white,
			0 0 0 4px #f59e0b;
	}

	.final-scores-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.final-scores-button.loading {
		opacity: 0.7;
	}

	.error-banner {
		margin-top: 1rem;
		padding: 1rem;
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 0.5rem;
		color: #991b1b;
	}

	.incident-history-section {
		margin: 1.5rem 0;
	}

	/* US-8.2-0.2: Metrics tables */
	.metrics-section {
		margin: 2rem 0;
	}

	.metrics-section h2 {
		font-size: 1.25rem;
		font-weight: 600;
		margin-bottom: 1rem;
		color: #1f2937;
	}

	.table-container {
		overflow-x: auto;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
	}

	.metrics-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.metrics-table th,
	.metrics-table td {
		padding: 0.75rem 1rem;
		text-align: left;
		border-bottom: 1px solid #e5e7eb;
	}

	.metrics-table th {
		background-color: #f9fafb;
		font-weight: 600;
		color: #374151;
		white-space: nowrap;
	}

	.metrics-table tbody tr:hover {
		background-color: #f9fafb;
	}

	.metrics-table tbody tr:last-child td {
		border-bottom: none;
	}

	.team-name,
	.dest-name {
		font-weight: 500;
	}

	.tech-tools-cell {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.tech-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.375rem;
		font-size: 0.75rem;
		border-radius: 0.25rem;
		background-color: #fee2e2;
		color: #991b1b;
	}

	.tech-badge.owned {
		background-color: #dcfce7;
		color: #166534;
	}

	/* Responsive: collapse to single column on mobile */
	@media (max-width: 768px) {
		.metrics-table {
			font-size: 0.75rem;
		}

		.metrics-table th,
		.metrics-table td {
			padding: 0.5rem;
		}

		.tech-badge {
			font-size: 0.625rem;
			padding: 0.0625rem 0.25rem;
		}
	}

	/* US-8.2-0.1: Timer container with paused indicator */
	.timer-container {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 1rem 0;
	}

	.paused-indicator {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		background-color: #fef3c7;
		color: #92400e;
		font-weight: 600;
		font-size: 0.875rem;
		border-radius: 0.25rem;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	/* US-8.2-0.1: Control buttons */
	.actions-panel {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 1rem 0;
	}

	.control-button {
		padding: 0.5rem 1rem;
		font-weight: 500;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.2s;
	}

	.control-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.control-button.loading {
		opacity: 0.7;
	}

	.pause-button {
		background-color: #fbbf24;
		color: #78350f;
	}

	.pause-button:hover:not(:disabled) {
		background-color: #f59e0b;
	}

	.resume-button {
		background-color: #34d399;
		color: #064e3b;
	}

	.resume-button:hover:not(:disabled) {
		background-color: #10b981;
	}

	.extend-button {
		background-color: #60a5fa;
		color: #1e3a5f;
	}

	.extend-button:hover:not(:disabled) {
		background-color: #3b82f6;
	}

	.end-phase-button {
		background-color: #f97316;
		color: white;
	}

	.end-phase-button:hover:not(:disabled) {
		background-color: #ea580c;
	}

	.end-game-button {
		background-color: #ef4444;
		color: white;
	}

	.end-game-button:hover:not(:disabled) {
		background-color: #dc2626;
	}

	/* US-8.2-0.1: Confirmation dialog */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
	}

	.confirmation-dialog {
		background-color: white;
		padding: 1.5rem;
		border-radius: 0.5rem;
		max-width: 400px;
		width: 90%;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
	}

	.confirmation-dialog h3 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.confirmation-dialog p {
		margin: 0 0 1.5rem 0;
		color: #4b5563;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	.cancel-button {
		padding: 0.5rem 1rem;
		background-color: #e5e7eb;
		color: #374151;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		font-weight: 500;
	}

	.cancel-button:hover {
		background-color: #d1d5db;
	}

	.confirm-button {
		padding: 0.5rem 1rem;
		background-color: #ef4444;
		color: white;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		font-weight: 500;
	}

	.confirm-button:hover {
		background-color: #dc2626;
	}
</style>
