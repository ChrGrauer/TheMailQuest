<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	const { session } = data;

	let copySuccess = false;

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
</script>

<svelte:head>
	<title>Lobby {session.roomCode} - Mail Quest</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-[#f8faf9] to-[#e8f5f0]">
	<!-- Header -->
	<header class="bg-white shadow-sm">
		<div class="mx-auto max-w-7xl px-8 py-6">
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
					class="flex items-center gap-4 rounded-lg bg-gradient-to-r from-[#0B5540] to-[#10B981] px-6 py-3"
				>
					<div>
						<div class="text-sm text-white/90">Room Code</div>
						<div
							data-testid="room-code"
							aria-label="Room code {session.roomCode}"
							class="font-bold tracking-wider text-white"
							style="font-size: 2rem;"
						>
							{session.roomCode}
						</div>
					</div>
					<button
						on:click={copyRoomCode}
						aria-label="Copy room code"
						class="rounded-md border border-white/30 bg-white/20 px-4 py-2 text-sm text-white transition-colors hover:bg-white/30"
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
	<main class="mx-auto max-w-7xl px-8 py-8">
		<div class="grid gap-8 lg:grid-cols-2">
			<!-- ESP Teams Section -->
			<div class="rounded-xl bg-white p-8 shadow-lg">
				<div class="mb-6 flex items-center gap-4 border-b-2 border-[#E5E7EB] pb-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#D1FAE5] to-[#A7F3D0] text-2xl"
					>
						📧
					</div>
					<h2 class="text-2xl font-bold text-[#0B5540]">ESP Teams</h2>
					<span class="ml-auto rounded-full bg-[#F3F4F6] px-4 py-2 text-sm font-semibold text-[#6B7280]">
						0 / 5
					</span>
				</div>

				<div class="space-y-4">
					{#each session.esp_teams as team}
						<div
							data-testid="esp-team-slot"
							class="flex items-center gap-4 rounded-lg border-2 border-[#E5E7EB] bg-[#F9FAFB] p-5"
						>
							<div
								class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E5E7EB] text-xl font-bold text-[#9CA3AF]"
							>
								{team.name.slice(0, 2).toUpperCase()}
							</div>
							<div class="flex-1">
								<div class="font-semibold text-[#9CA3AF]">{team.name}</div>
								<div class="text-sm text-[#6B7280]">Waiting for players...</div>
							</div>
							<span class="rounded-md bg-[#F3F4F6] px-3 py-1 text-xs font-semibold text-[#6B7280]">
								Empty
							</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Destinations Section -->
			<div class="rounded-xl bg-white p-8 shadow-lg">
				<div class="mb-6 flex items-center gap-4 border-b-2 border-[#E5E7EB] pb-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#D1FAE5] to-[#A7F3D0] text-2xl"
					>
						📮
					</div>
					<h2 class="text-2xl font-bold text-[#0B5540]">Destinations</h2>
					<span class="ml-auto rounded-full bg-[#F3F4F6] px-4 py-2 text-sm font-semibold text-[#6B7280]">
						0 / 3
					</span>
				</div>

				<div class="space-y-4">
					{#each session.destinations as destination}
						<div
							data-testid="destination-slot"
							class="flex items-center gap-4 rounded-lg border-2 border-[#E5E7EB] bg-[#F9FAFB] p-5"
						>
							<div
								class="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E5E7EB] text-2xl"
							>
								📧
							</div>
							<div class="flex-1">
								<div class="font-semibold text-[#9CA3AF]">{destination.name}</div>
								<div class="text-sm text-[#6B7280]">Waiting for players...</div>
							</div>
							<span class="rounded-md bg-[#F3F4F6] px-3 py-1 text-xs font-semibold text-[#6B7280]">
								Empty
							</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Game Status -->
			<div class="rounded-xl bg-white p-8 shadow-lg lg:col-span-2">
				<div class="flex flex-wrap items-center justify-between gap-8">
					<div class="flex-1">
						<div class="mb-2 text-xl text-[#4B5563]">Waiting for players to join...</div>
						<div class="flex items-center gap-2 text-[#6B7280]">
							<div class="h-2 w-2 animate-pulse rounded-full bg-[#10B981]"></div>
							<span>0 players ready</span>
						</div>
					</div>

					<div class="flex gap-4">
						<button
							disabled
							class="rounded-lg border-2 border-[#E5E7EB] bg-white px-8 py-4 font-semibold text-[#6B7280] transition-colors hover:bg-[#F9FAFB]"
						>
							Settings
						</button>
						<button
							disabled
							class="cursor-not-allowed rounded-lg bg-gradient-to-r from-[#0B5540] to-[#10B981] px-8 py-4 font-semibold text-white opacity-50 shadow-lg"
						>
							Start Game
						</button>
					</div>
				</div>
			</div>

			<!-- Instructions -->
			<div
				class="rounded-xl border-2 border-[#FCD34D] bg-gradient-to-br from-[#FEF3C7] to-[#FEF9E7] p-6 lg:col-span-2"
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
		</div>
	</main>
</div>
