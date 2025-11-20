<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { websocketStore, type GameStateUpdate } from '$lib/stores/websocket';
	import type { IncidentCard, IncidentHistoryEntry } from '$lib/types/incident';
	import IncidentTriggerButton from '$lib/components/incident/IncidentTriggerButton.svelte';
	import IncidentSelectionModal from '$lib/components/incident/IncidentSelectionModal.svelte';
	import IncidentCardDisplay from '$lib/components/incident/IncidentCardDisplay.svelte';
	import IncidentHistory from '$lib/components/incident/IncidentHistory.svelte';

	const roomCode = $page.params.roomCode;

	let round = $state(1);
	let phase = $state('planning');
	let timerRemaining = $state(300);

	// Start Next Round button state
	let isStartingRound = $state(false);
	let error = $state<string | null>(null);

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

	// Handle game state updates from WebSocket
	function handleGameStateUpdate(data: GameStateUpdate | any) {
		// Handle incident_triggered messages
		if (data.type === 'incident_triggered' && data.incident) {
			currentIncident = data.incident;
			showIncidentCard = true;
			return;
		}

		// Handle phase_transition messages (nested structure)
		if (data.type === 'phase_transition' && data.data) {
			if (data.data.phase !== undefined) {
				phase = data.data.phase;
				// Reset loading state when phase changes
				isStartingRound = false;
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
			return;
		}

		// Handle regular game_state_update messages
		if (data.round !== undefined) {
			round = data.round;
		}
		if (data.phase !== undefined) {
			phase = data.phase;
			// Reset loading state when phase changes
			isStartingRound = false;
		}
		if (data.timer_remaining !== undefined) {
			timerRemaining = data.timer_remaining;
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

	onMount(() => {
		// Connect to WebSocket for real-time game state updates
		websocketStore.connect(
			roomCode,
			() => {}, // Lobby updates not needed for facilitator
			handleGameStateUpdate
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
</script>

<div class="container">
	<h1>Facilitator Dashboard</h1>
	<p>Room Code: {roomCode}</p>
	<p>Round {round} - <span data-testid="current-phase">{phase}</span> Phase</p>

	<div data-testid="game-timer" class="timer">
		{timerDisplay}
	</div>

	<!-- Facilitator Actions -->
	<div class="actions-panel">
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

	<p class="placeholder-notice">
		This is a placeholder dashboard. Full implementation coming in future user stories.
	</p>
</div>

<!-- Incident Selection Modal -->
<IncidentSelectionModal
	bind:show={showIncidentSelectionModal}
	{roomCode}
	currentRound={round}
	onClose={() => (showIncidentSelectionModal = false)}
	onTriggerSuccess={handleIncidentTriggered}
/>

<!-- Incident Card Display -->
<IncidentCardDisplay
	bind:show={showIncidentCard}
	incident={currentIncident}
	onClose={handleIncidentCardClose}
/>

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

	.error-banner {
		margin-top: 1rem;
		padding: 1rem;
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 0.5rem;
		color: #991b1b;
	}

	.placeholder-notice {
		margin-top: 2rem;
		padding: 1rem;
		background-color: #f3f4f6;
		border-radius: 0.5rem;
		color: #6b7280;
	}

	.incident-history-section {
		margin: 1.5rem 0;
	}
</style>
