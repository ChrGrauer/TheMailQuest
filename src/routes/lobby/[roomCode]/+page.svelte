<script lang="ts">
	import type { PageData } from './$types';
	import { fly, fade } from 'svelte/transition';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { websocketStore, type LobbyUpdate, type GameStateUpdate } from '$lib/stores/websocket';
	import TeamSlotSelector from '$lib/components/lobby/TeamSlotSelector.svelte';
	import JoinGameModal from '$lib/components/lobby/JoinGameModal.svelte';
	import GameStartControls from '$lib/components/lobby/GameStartControls.svelte';
	import QRCodeModal from '$lib/components/lobby/QRCodeModal.svelte';

	let { data } = $props();

	const { session, isFacilitator } = data; // US-1.3: Get facilitator status
	// Slot state (will be updated via WebSocket)
	let espTeams = $state(session.esp_teams);
	let destinations = $state(session.destinations);
	let espTeamCount = $state(0);
	let destinationCount = $state(0);
	let playerNames = $state(data.playerNames || {});

	let totalPlayers = $derived(espTeamCount + destinationCount);
	let isSessionFull = $derived(totalPlayers >= 8); // 5 ESP + 3 Destinations = 8 total slots

	// US-1.3: Start game validation
	let canStartGame = $derived(espTeamCount > 0 && destinationCount > 0);
	let startGameTooltip = $derived(
		!canStartGame
			? espTeamCount === 0
				? 'At least 1 ESP team is required'
				: 'At least 1 Destination is required'
			: ''
	);

	let isStartingGame = $state(false);
	let startGameError = $state('');
	let gameStarted = $state(false);
	let mounted = $state(false);
	let copySuccess = $state(false);
	let showQRModal = $state(false);

	// Role selection state
	let selectedTeam = $state<string | null>(null);
	let selectedRole = $state<'ESP' | 'Destination' | null>(null);
	let displayName = $state('');
	let showRoleModal = $state(false);
	let joinError = $state('');
	let isJoining = $state(false);
	let hasJoined = $state(false);
	let currentPlayerId = $state<string | null>(null);

	// Log derived state changes
	$effect(() => {
		console.debug('[Lobby] Derived state check:', { totalPlayers, canStartGame, startGameTooltip });
	});

	// US-1.4: Store player's role and team for redirect
	let playerRole = $state<'ESP' | 'Destination' | 'Facilitator' | null>(
		isFacilitator ? 'Facilitator' : null
	);
	let playerTeamName = $state<string | null>(null);

	onMount(() => {
		mounted = true;
		// Initialize slot counts
		updateSlotCounts();

		// Connect to WebSocket and subscribe to lobby updates and game state changes
		websocketStore.connect(session.roomCode, handleLobbyUpdate, handleGameStateUpdate);
	});

	onDestroy(() => {
		// Disconnect WebSocket when leaving the page
		websocketStore.disconnect();
	});

	function updateSlotCounts() {
		espTeamCount = espTeams.filter((t) => (t.players?.length ?? 0) > 0).length;
		destinationCount = destinations.filter((d) => (d.players?.length ?? 0) > 0).length;
		console.debug('[Lobby] Updated slot counts:', { espTeamCount, destinationCount, canStartGame });
	}

	function handleLobbyUpdate(data: LobbyUpdate | any) {
		console.debug('[Lobby] Received handleLobbyUpdate:', data);
		// US-1.3: Support both flat and nested data structures from server
		const lobbyData = data.data || data;

		// Update local state with server data
		if (lobbyData.espTeams) espTeams = lobbyData.espTeams;
		if (lobbyData.destinations) destinations = lobbyData.destinations;

		// Store new player name if provided
		if (lobbyData.newPlayer) {
			playerNames[lobbyData.newPlayer.id] = lobbyData.newPlayer.displayName;
		}

		// Recalculate slot counts
		updateSlotCounts();
	}

	// US-1.4: Handle game state updates and redirect players
	function handleGameStateUpdate(data: GameStateUpdate | any) {
		// Support both flat and nested data structures
		const stateData = data.data || data;

		if (stateData.phase === 'planning' && stateData.round === 1) {
			// Game has started! Redirect based on player role
			if (playerRole === 'ESP' && playerTeamName) {
				// Redirect ESP players to their team dashboard
				const teamNameLower = playerTeamName.toLowerCase();
				goto(`/game/${session.roomCode}/esp/${teamNameLower}`);
			} else if (playerRole === 'Destination' && playerTeamName) {
				// Redirect Destination players to their dashboard
				const destNameLower = playerTeamName.toLowerCase();
				goto(`/game/${session.roomCode}/destination/${destNameLower}`);
			} else if (playerRole === 'Facilitator') {
				// Redirect facilitator to facilitator dashboard
				goto(`/game/${session.roomCode}/facilitator`);
			}
		}
	}

	async function copyRoomCode() {
		try {
			await navigator.clipboard.writeText(session.roomCode);
			copySuccess = true;
			setTimeout(() => {
				copySuccess = false;
			}, 2000);
		} catch (err) {
			// Failed to copy - silently fail for now
			// TODO: Implement proper client-side error handling/reporting
		}
	}

	function openRoleSelection(teamName: string, role: 'ESP' | 'Destination') {
		// Check if slot is occupied
		const isOccupied =
			role === 'ESP'
				? (espTeams.find((t) => t.name === teamName)?.players.length ?? 0) > 0
				: (destinations.find((d) => d.name === teamName)?.players.length ?? 0) > 0;

		if (isOccupied) {
			joinError = 'This role is already taken';
			setTimeout(() => {
				joinError = '';
			}, 3000);
			return;
		}

		if (hasJoined) {
			joinError = 'You have already joined this game';
			setTimeout(() => {
				joinError = '';
			}, 3000);
			return;
		}

		selectedTeam = teamName;
		selectedRole = role;
		showRoleModal = true;
		joinError = '';
	}

	function closeRoleModal() {
		showRoleModal = false;
		selectedTeam = null;
		selectedRole = null;
		displayName = '';
		joinError = '';
	}

	async function handleJoinGame() {
		if (!displayName.trim()) {
			joinError = 'Name is required';
			return;
		}

		if (!selectedTeam || !selectedRole) {
			joinError = 'Please select a role';
			return;
		}

		isJoining = true;
		joinError = '';

		try {
			const response = await fetch(`/api/sessions/${session.roomCode}/join`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					displayName: displayName.trim(),
					role: selectedRole,
					teamName: selectedTeam
				})
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				joinError = result.error || 'Failed to join game';
				isJoining = false;
				return;
			}

			// Success!
			currentPlayerId = result.playerId;
			hasJoined = true;

			// US-1.4: Store player role and team for redirect logic
			playerRole = selectedRole;
			playerTeamName = selectedTeam;

			// Store player name
			playerNames[result.playerId] = result.player.displayName;

			// Update local state
			if (selectedRole === 'ESP') {
				const team = espTeams.find((t) => t.name === selectedTeam);
				if (team) {
					team.players = [...team.players, result.playerId];
				}
			} else {
				const dest = destinations.find((d) => d.name === selectedTeam);
				if (dest) {
					dest.players = [...dest.players, result.playerId];
				}
			}

			updateSlotCounts();
			closeRoleModal();
		} catch (error) {
			joinError = 'An error occurred. Please try again.';
		} finally {
			isJoining = false;
		}
	}

	// US-1.3: Start game function
	async function handleStartGame() {
		if (!canStartGame || isStartingGame) {
			return;
		}

		isStartingGame = true;
		startGameError = '';

		try {
			const response = await fetch(`/api/sessions/${session.roomCode}/start`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				startGameError = result.error || 'Failed to start game';
				isStartingGame = false;
				return;
			}

			// Success! Game started
			gameStarted = true;
			// Redirect will happen automatically via WebSocket game_state_update message
		} catch (error) {
			startGameError = 'An error occurred. Please try again.';
			isStartingGame = false;
		}
	}
</script>

<svelte:head>
	<title>Lobby {session.roomCode} - Mail Quest</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-[#f8faf9] to-[#e8f5f0]">
	<!-- Header -->
	<header class="bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
		<div class="mx-auto max-w-[1400px] px-8 py-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0B5540] to-[#10B981] text-xl font-bold text-white"
					>
						MQ
					</div>
					<span class="text-2xl font-bold text-[#0B5540]">Mail Quest</span>
				</div>

				<div
					class="flex items-center gap-4 rounded-lg bg-gradient-to-r from-[#0B5540] to-[#10B981] px-8 py-3"
				>
					<div>
						<div class="text-sm text-white/90">Room Code</div>
						<div
							data-testid="room-code"
							aria-label="Room code {session.roomCode}"
							class="text-[2rem] font-bold tracking-[0.1em] text-white"
						>
							{session.roomCode}
						</div>
					</div>
					<button
						onclick={copyRoomCode}
						aria-label="Copy room code"
						class="rounded-md border border-white/30 bg-white/20 px-4 py-2 text-sm text-white transition-all hover:bg-white/30 active:scale-95"
					>
						{#if copySuccess}
							✓ Copied!
						{:else}
							📋 Copy
						{/if}
					</button>
					<button
						data-testid="show-qr-code-button"
						onclick={() => (showQRModal = true)}
						aria-label="Show QR code to join lobby"
						class="rounded-md border border-white/30 bg-white/20 px-4 py-2 text-sm text-white transition-all hover:bg-white/30 active:scale-95 flex items-center gap-2"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
							></path>
						</svg>
						QR Code
					</button>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto max-w-[1400px] px-8 py-8">
		<!-- Session Full Banner -->
		{#if isSessionFull && !hasJoined}
			<div
				role="alert"
				class="mb-6 p-6 bg-amber-50 border-2 border-amber-200 rounded-xl"
				in:fly={{ y: -10, duration: 300 }}
			>
				<div class="flex items-center gap-3 text-amber-900">
					<span class="text-2xl">⚠️</span>
					<div>
						<div class="font-bold text-lg">This session is full</div>
						<div class="text-sm text-amber-700">
							All 8 player slots have been filled. Please wait for the game to start or join another
							session.
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Global Error Message (only show when modal is closed) -->
		{#if joinError && !showRoleModal}
			<div
				role="alert"
				class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"
				in:fly={{ y: -10, duration: 300 }}
			>
				{joinError}
			</div>
		{/if}

		<!-- Role Selection Header -->
		{#if !hasJoined && !isSessionFull}
			<div class="mb-6 text-center">
				<h1 class="text-3xl font-bold text-[#0B5540] mb-2">Select Your Role</h1>
				<p class="text-[#0B5540]/70">Choose an ESP team or a destination to join the game</p>
			</div>
		{/if}

		<div class="space-y-8">
			<!-- Team Slot Selector -->
			<TeamSlotSelector
				{espTeams}
				{destinations}
				{playerNames}
				{mounted}
				onSlotClick={openRoleSelection}
			/>

			<!-- Game Status and Start Controls -->
			<GameStartControls
				{mounted}
				{isFacilitator}
				{totalPlayers}
				{canStartGame}
				{startGameTooltip}
				{startGameError}
				{gameStarted}
				{isStartingGame}
				onStartGame={handleStartGame}
			/>

			<!-- Instructions -->
			{#if mounted}
				<div
					class="rounded-xl border-2 border-[#FCD34D] bg-gradient-to-br from-[#FEF3C7] to-[#FEF9E7] p-6"
					in:fade={{ duration: 500, delay: 400 }}
				>
					<div class="mb-4 flex items-center gap-3 text-lg font-semibold text-[#92400E]">
						<span class="text-2xl">💡</span>
						Next Steps
					</div>
					<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						<li class="flex items-start gap-3 text-[#78350F]">
							<span class="font-bold text-[#D97706]">→</span>
							<span>Share the room code with players</span>
						</li>
						<li class="flex items-start gap-3 text-[#78350F]">
							<span class="font-bold text-[#D97706]">→</span>
							<span>Wait for players to choose their teams</span>
						</li>
						<li class="flex items-start gap-3 text-[#78350F]">
							<span class="font-bold text-[#D97706]">→</span>
							<span>Start the game when everyone is ready</span>
						</li>
					</ul>
				</div>
			{/if}
		</div>
	</main>
</div>

<!-- Role Selection Modal -->
<JoinGameModal
	show={showRoleModal}
	{selectedTeam}
	{selectedRole}
	bind:displayName
	{joinError}
	{isJoining}
	onClose={closeRoleModal}
	onSubmit={handleJoinGame}
/>

<!-- QR Code Modal -->
<QRCodeModal show={showQRModal} roomCode={session.roomCode} onClose={() => (showQRModal = false)} />
