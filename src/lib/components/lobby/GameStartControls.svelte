<script lang="ts">
	import { scale } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	export let mounted: boolean;
	export let isFacilitator: boolean;
	export let totalPlayers: number;
	export let canStartGame: boolean;
	export let startGameTooltip: string;
	export let startGameError: string;
	export let gameStarted: boolean;
	export let isStartingGame: boolean;
	export let onStartGame: () => Promise<void>;
</script>

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
					<div class="mt-2 text-sm text-amber-600">⚠️ {startGameTooltip}</div>
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
						on:click={onStartGame}
						disabled={!canStartGame || isStartingGame}
						class="rounded-lg bg-gradient-to-r from-[#0B5540] to-[#10B981] px-8 py-4 font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-95 {!canStartGame ||
						isStartingGame
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
