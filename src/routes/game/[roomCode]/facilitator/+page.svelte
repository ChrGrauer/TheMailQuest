<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	const roomCode = $page.params.roomCode;

	let round = 1;
	let phase = 'planning';
	let timerRemaining = 300;

	// Format timer as M:SS
	$: timerDisplay = `${Math.floor(timerRemaining / 60)}:${String(timerRemaining % 60).padStart(2, '0')}`;

	onMount(() => {
		// Placeholder: In real implementation, this would connect to WebSocket
		// and update based on game state
	});
</script>

<div class="container">
	<h1>Facilitator Dashboard</h1>
	<p>Room Code: {roomCode}</p>
	<p>Round {round} - {phase} Phase</p>

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
