<script lang="ts">
	import type { PageData } from './$types';
	import { fly, scale, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { onMount, onDestroy } from 'svelte';
	import { websocketStore, type LobbyUpdate } from '$lib/stores/websocket';

	export let data: PageData;

	const { session, isFacilitator } = data; // US-1.3: Get facilitator status
	let playerNames = data.playerNames || {}; // Initialize from server data

	let copySuccess = false;
	let mounted = false;

	// Role selection state
	let selectedTeam: string | null = null;
	let selectedRole: 'ESP' | 'Destination' | null = null;
	let displayName = '';
	let showRoleModal = false;
	let joinError = '';
	let isJoining = false;
	let hasJoined = false;
	let currentPlayerId: string | null = null;
	let displayNameInput: HTMLInputElement;

	// US-1.3: Game start state
	let isStartingGame = false;
	let startGameError = '';
	let gameStarted = false;

	// Slot state (will be updated via WebSocket)
	let espTeams = session.esp_teams;
	let destinations = session.destinations;
	let espTeamCount = 0;
	let destinationCount = 0;
	// playerNames initialized from server data above

	$: totalPlayers = espTeamCount + destinationCount;
	$: isSessionFull = totalPlayers >= 8; // 5 ESP + 3 Destinations = 8 total slots

	// US-1.3: Start game validation
	$: canStartGame = espTeamCount > 0 && destinationCount > 0;
	$: startGameTooltip = !canStartGame
		? espTeamCount === 0
			? 'At least 1 ESP team is required'
			: 'At least 1 Destination is required'
		: '';

	// Focus the display name input when modal opens
	$: if (showRoleModal && displayNameInput) {
		setTimeout(() => displayNameInput.focus(), 100);
	}

	onMount(() => {
		mounted = true;
		// Initialize slot counts
		updateSlotCounts();

		// Connect to WebSocket and subscribe to lobby updates
		websocketStore.connect(session.roomCode, handleLobbyUpdate);
	});

	onDestroy(() => {
		// Disconnect WebSocket when leaving the page
		websocketStore.disconnect();
	});

	function updateSlotCounts() {
		espTeamCount = espTeams.filter(t => t.players.length > 0).length;
		destinationCount = destinations.filter(d => d.players.length > 0).length;
	}

	function handleLobbyUpdate(data: LobbyUpdate) {
		// Update local state with server data
		espTeams = data.espTeams;
		destinations = data.destinations;

		// Store new player name if provided
		if (data.newPlayer) {
			playerNames[data.newPlayer.id] = data.newPlayer.displayName;
		}

		// Recalculate slot counts
		updateSlotCounts();
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
		const isOccupied = role === 'ESP'
			? (espTeams.find(t => t.name === teamName)?.players.length ?? 0) > 0
			: (destinations.find(d => d.name === teamName)?.players.length ?? 0) > 0;

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

			// Store player name
			playerNames[result.playerId] = result.player.displayName;

			// Update local state
			if (selectedRole === 'ESP') {
				const team = espTeams.find(t => t.name === selectedTeam);
				if (team) {
					team.players = [...team.players, result.playerId];
				}
			} else {
				const dest = destinations.find(d => d.name === selectedTeam);
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

	function isSlotOccupied(teamName: string, role: 'ESP' | 'Destination'): boolean {
		if (role === 'ESP') {
			return (espTeams.find(t => t.name === teamName)?.players.length ?? 0) > 0;
		} else {
			return (destinations.find(d => d.name === teamName)?.players.length ?? 0) > 0;
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
			// TODO: Redirect to appropriate page based on role or show game started message
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
						on:click={copyRoomCode}
						aria-label="Copy room code"
						class="rounded-md border border-white/30 bg-white/20 px-4 py-2 text-sm text-white transition-all hover:bg-white/30 active:scale-95"
					>
						{#if copySuccess}
							✓ Copied!
						{:else}
							📋 Copy
						{/if}
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
						<div class="text-sm text-amber-700">All 8 player slots have been filled. Please wait for the game to start or join another session.</div>
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

		<div class="grid gap-8 lg:grid-cols-2">
			<!-- ESP Teams Section -->
			<div class="rounded-xl bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
				{#if mounted}
					<div
						class="mb-6 flex items-center gap-4 border-b-2 border-[#E5E7EB] pb-4"
						in:fly={{ y: -20, duration: 500, easing: quintOut }}
					>
						<div
							class="flex h-12 w-12 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#D1FAE5] to-[#A7F3D0] text-2xl"
						>
							📧
						</div>
						<h2 class="text-2xl font-bold text-[#0B5540]">ESP Teams</h2>
						<span
							class="ml-auto rounded-full bg-[#F3F4F6] px-4 py-2 text-sm font-semibold text-[#6B7280]"
						>
							ESP Teams: {espTeamCount}/{espTeams.length}
						</span>
					</div>
				{/if}

				<div class="grid gap-4">
					{#each espTeams as team, index}
						{@const occupied = isSlotOccupied(team.name, 'ESP')}
						{#if mounted}
							<button
								data-testid="esp-team-slot"
								data-team={team.name}
								data-occupied={occupied}
								aria-label="{team.name} slot {occupied ? 'occupied' : 'available'}"
								aria-disabled={occupied}
								disabled={occupied}
								on:click={() => openRoleSelection(team.name, 'ESP')}
								class="flex items-center gap-4 rounded-lg border-2 p-5 text-left transition-all duration-300 {occupied
									? 'border-[#E5E7EB] bg-[#F9FAFB] cursor-not-allowed'
									: 'border-[#D1FAE5] bg-white hover:border-[#10B981] hover:shadow-lg cursor-pointer'}"
								in:fly={{ x: -50, duration: 500, delay: index * 50, easing: quintOut }}
							>
								<div
									class="flex h-12 w-12 items-center justify-center rounded-lg text-xl font-bold {occupied
										? 'bg-[#E5E7EB] text-[#9CA3AF]'
										: 'bg-[#D1FAE5] text-[#0B5540]'}"
								>
									{team.name.slice(0, 2).toUpperCase()}
								</div>
								<div class="flex-1">
									<div class="mb-1 font-semibold {occupied ? 'text-[#9CA3AF]' : 'text-[#0B5540]'}">
										{team.name}
									</div>
									<div class="text-sm text-[#6B7280]">
										{#if occupied && team.players.length > 0}
											{playerNames[team.players[0]] || 'Player joined'}
										{:else if occupied}
											Occupied
										{:else}
											Click to join
										{/if}
									</div>
								</div>
								<span
									class="rounded-md px-[0.875rem] py-[0.375rem] text-xs font-semibold {occupied
										? 'bg-[#F3F4F6] text-[#6B7280]'
										: 'bg-[#D1FAE5] text-[#0B5540]'}"
								>
									{occupied ? 'Occupied' : 'Available'}
								</span>
							</button>
						{/if}
					{/each}
				</div>
			</div>

			<!-- Destinations Section -->
			<div class="rounded-xl bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
				{#if mounted}
					<div
						class="mb-6 flex items-center gap-4 border-b-2 border-[#E5E7EB] pb-4"
						in:fly={{ y: -20, duration: 500, delay: 100, easing: quintOut }}
					>
						<div
							class="flex h-12 w-12 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#D1FAE5] to-[#A7F3D0] text-2xl"
						>
							📮
						</div>
						<h2 class="text-2xl font-bold text-[#0B5540]">Destinations</h2>
						<span
							class="ml-auto rounded-full bg-[#F3F4F6] px-4 py-2 text-sm font-semibold text-[#6B7280]"
						>
							Destinations: {destinationCount}/{destinations.length}
						</span>
					</div>
				{/if}

				<div class="grid gap-4">
					{#each destinations as destination, index}
						{@const occupied = isSlotOccupied(destination.name, 'Destination')}
						{#if mounted}
							<button
								data-testid="destination-slot"
								data-team={destination.name}
								data-occupied={occupied}
								aria-label="{destination.name} slot {occupied ? 'occupied' : 'available'}"
								aria-disabled={occupied}
								disabled={occupied}
								on:click={() => openRoleSelection(destination.name, 'Destination')}
								class="flex items-center gap-4 rounded-lg border-2 p-5 text-left transition-all duration-300 {occupied
									? 'border-[#E5E7EB] bg-[#F9FAFB] cursor-not-allowed'
									: 'border-[#D1FAE5] bg-white hover:border-[#10B981] hover:shadow-lg cursor-pointer'}"
								in:fly={{ x: 50, duration: 500, delay: 100 + index * 50, easing: quintOut }}
							>
								<div
									class="flex h-12 w-12 items-center justify-center rounded-lg text-2xl {occupied
										? 'bg-[#E5E7EB]'
										: 'bg-[#D1FAE5]'}"
								>
									📧
								</div>
								<div class="flex-1">
									<div class="mb-1 font-semibold {occupied ? 'text-[#9CA3AF]' : 'text-[#0B5540]'}">
										{destination.name}
									</div>
									<div class="text-sm text-[#6B7280]">
										{#if occupied && destination.players.length > 0}
											{playerNames[destination.players[0]] || 'Player joined'}
										{:else if occupied}
											Occupied
										{:else}
											Click to join
										{/if}
									</div>
								</div>
								<span
									class="rounded-md px-[0.875rem] py-[0.375rem] text-xs font-semibold {occupied
										? 'bg-[#F3F4F6] text-[#6B7280]'
										: 'bg-[#D1FAE5] text-[#0B5540]'}"
								>
									{occupied ? 'Occupied' : 'Available'}
								</span>
							</button>
						{/if}
					{/each}
				</div>
			</div>

			<!-- Game Status -->
			<div class="rounded-xl bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.06)] lg:col-span-2">
				{#if mounted}
					<div
						class="flex flex-wrap items-center justify-between gap-8"
						in:scale={{ duration: 500, delay: 300, easing: quintOut }}
					>
						<div class="flex-1">
							<div class="mb-2 text-xl text-[#4B5563]">Waiting for players to join...</div>
							<div class="flex items-center gap-2 text-[#6B7280]">
								<div class="h-2 w-2 animate-pulse rounded-full bg-[#10B981]"></div>
								<span>{totalPlayers} players ready</span>
							</div>
							{#if isFacilitator && !canStartGame}
								<div class="mt-2 text-sm text-amber-600">
									⚠️ {startGameTooltip}
								</div>
							{/if}
							{#if startGameError}
								<div class="mt-2 text-sm text-red-600">
									{startGameError}
								</div>
							{/if}
						</div>

						{#if isFacilitator && !gameStarted}
							<div class="flex gap-4">
								<button
									disabled
									class="cursor-not-allowed rounded-lg border-2 border-[#E5E7EB] bg-white px-8 py-4 font-semibold text-[#6B7280] opacity-50 transition-all hover:bg-[#F9FAFB] active:scale-95"
								>
									Settings
								</button>
								<button
									on:click={handleStartGame}
									disabled={!canStartGame || isStartingGame}
									class="rounded-lg bg-gradient-to-r from-[#0B5540] to-[#10B981] px-8 py-4 font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-95 {!canStartGame || isStartingGame
										? 'cursor-not-allowed opacity-50'
										: ''}"
									aria-label="Start game"
									title={startGameTooltip}
								>
									{#if isStartingGame}
										Starting...
									{:else}
										Start Game
									{/if}
								</button>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Instructions -->
			{#if mounted}
				<div
					class="rounded-xl border-2 border-[#FCD34D] bg-gradient-to-br from-[#FEF3C7] to-[#FEF9E7] p-6 lg:col-span-2"
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
{#if showRoleModal}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		on:click={closeRoleModal}
		on:keydown={(e) => e.key === 'Escape' && closeRoleModal()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		transition:fade={{ duration: 200 }}
	>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			class="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full"
			on:click|stopPropagation
			transition:scale={{ duration: 300, easing: quintOut }}
		>
			<h3 class="text-2xl font-bold text-[#0B5540] mb-2">
				Join as {selectedTeam}
			</h3>
			<p class="text-[#0B5540]/70 mb-6">
				Role: {selectedRole}
			</p>

			<form on:submit|preventDefault={handleJoinGame} novalidate>
				<div class="mb-6">
					<label for="displayName" class="block text-sm font-semibold text-[#0B5540] mb-2">
						Your Name
					</label>
					<input
						type="text"
						id="displayName"
						name="displayName"
						bind:this={displayNameInput}
						bind:value={displayName}
						placeholder="Enter your name"
						class="w-full px-4 py-3 rounded-xl border-2 border-[#D1FAE5] focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all"
						disabled={isJoining}
						required
					/>
				</div>

				{#if joinError}
					<div
						role="alert"
						class="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
					>
						{joinError}
					</div>
				{/if}

				<div class="flex gap-3">
					<button
						type="button"
						on:click={closeRoleModal}
						disabled={isJoining}
						class="flex-1 px-6 py-3 rounded-xl border-2 border-[#E5E7EB] text-[#0B5540] font-semibold hover:bg-[#F9FAFB] transition-all disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isJoining}
						class="flex-1 px-6 py-3 rounded-xl bg-[#10B981] hover:bg-[#0B5540] text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if isJoining}
							Joining...
						{:else}
							Join Game
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
