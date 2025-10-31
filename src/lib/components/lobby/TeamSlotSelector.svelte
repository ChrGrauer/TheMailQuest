<script lang="ts">
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	export let espTeams: Array<{ name: string; players: string[] }>;
	export let destinations: Array<{ name: string; players: string[] }>;
	export let playerNames: Record<string, string>;
	export let mounted: boolean;
	export let onSlotClick: (teamName: string, role: 'ESP' | 'Destination') => void;

	$: espTeamCount = espTeams.filter((t) => t.players.length > 0).length;
	$: destinationCount = destinations.filter((d) => d.players.length > 0).length;

	function isSlotOccupied(teamName: string, role: 'ESP' | 'Destination'): boolean {
		if (role === 'ESP') {
			return (espTeams.find((t) => t.name === teamName)?.players.length ?? 0) > 0;
		} else {
			return (destinations.find((d) => d.name === teamName)?.players.length ?? 0) > 0;
		}
	}
</script>

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
						on:click={() => onSlotClick(team.name, 'ESP')}
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
						on:click={() => onSlotClick(destination.name, 'Destination')}
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
</div>
