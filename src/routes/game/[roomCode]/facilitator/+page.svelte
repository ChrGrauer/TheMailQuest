<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { websocketStore, type GameStateUpdate } from '$lib/stores/websocket';

	const roomCode = $page.params.roomCode;

	let round = $state(1);
	let phase = $state('planning');
	let timerRemaining = $state(300);

	// Format timer as M:SS
	let timerDisplay = $derived(`${Math.floor(timerRemaining / 60)}:${String(timerRemaining % 60).padStart(2, '0')}`);

	// Handle game state updates from WebSocket
	function handleGameStateUpdate(data: GameStateUpdate | any) {
		// Handle phase_transition messages (nested structure)
		if (data.type === 'phase_transition' && data.data) {
			if (data.data.phase !== undefined) {
				phase = data.data.phase;
			}
			if (data.data.round !== undefined) {
				round = data.data.round;
			}
			return;
		}

		// Handle regular game_state_update messages
		if (data.round !== undefined) {
			round = data.round;
		}
		if (data.phase !== undefined) {
			phase = data.phase;
		}
		if (data.timer_remaining !== undefined) {
			timerRemaining = data.timer_remaining;
		}
	}

	onMount(() => {
		// Connect to WebSocket for real-time game state updates
		websocketStore.connect(
			roomCode,
			() => {}, // Lobby updates not needed for facilitator
			handleGameStateUpdate
		);
	});

	onDestroy(() => {
		websocketStore.disconnect();
	});
</script>

<div class="container">
	<h1>Facilitator Dashboard</h1>
	<p>Room Code: {roomCode}</p>
	<p>Round {round} - <span data-testid="current-phase">{phase}</span> Phase</p>

	<div data-testid="game-timer" class="timer">
		{timerDisplay}
	</div>

	<p class="placeholder-notice">
		This is a placeholder dashboard. Full implementation coming in future user stories.
	</p>
</div>

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

	.placeholder-notice {
		margin-top: 2rem;
		padding: 1rem;
		background-color: #f3f4f6;
		border-radius: 0.5rem;
		color: #6b7280;
	}
</style>
