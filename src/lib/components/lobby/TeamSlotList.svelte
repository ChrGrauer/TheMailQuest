<script lang="ts">
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	interface TeamSlot {
		name: string;
		players: string[];
	}

	interface Props {
		title: string;
		icon: string;
		slots: TeamSlot[];
		playerNames: Record<string, string>;
		slotType: 'ESP' | 'Destination';
		occupiedCount: number;
		onSlotClick: (teamName: string, role: 'ESP' | 'Destination') => void;
		mounted: boolean;
		testId: string;
	}

	let {
		title,
		icon,
		slots,
		playerNames,
		slotType,
		occupiedCount,
		onSlotClick,
		mounted,
		testId
	}: Props = $props();

	function isSlotOccupied(teamName: string): boolean {
		const slot = slots.find((s) => s.name === teamName);
		return (slot?.players.length ?? 0) > 0;
	}
</script>

<div class="rounded-xl bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
	{#if mounted}
		<div
			class="mb-6 flex items-center gap-4 border-b-2 border-[#E5E7EB] pb-4"
			in:fly={{
				y: -20,
				duration: 500,
				delay: slotType === 'Destination' ? 100 : 0,
				easing: quintOut
			}}
		>
			<div
				class="flex h-12 w-12 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#D1FAE5] to-[#A7F3D0] text-2xl"
			>
				{icon}
			</div>
			<h2 class="text-2xl font-bold text-[#0B5540]">{title}</h2>
			<span
				class="ml-auto rounded-full bg-[#F3F4F6] px-4 py-2 text-sm font-semibold text-[#6B7280]"
			>
				{title}: {occupiedCount}/{slots.length}
			</span>
		</div>
	{/if}

	<div class="grid gap-4">
		{#each slots as slot, index}
			{@const occupied = isSlotOccupied(slot.name)}
			{#if mounted}
				<button
					data-testid={testId}
					data-team={slot.name}
					data-occupied={occupied}
					aria-label="{slot.name} slot {occupied ? 'occupied' : 'available'}"
					aria-disabled={occupied}
					disabled={occupied}
					on:click={() => onSlotClick(slot.name, slotType)}
					class="flex items-center gap-4 rounded-lg border-2 p-5 text-left transition-all duration-300 {occupied
						? 'border-[#E5E7EB] bg-[#F9FAFB] cursor-not-allowed'
						: 'border-[#D1FAE5] bg-white hover:border-[#10B981] hover:shadow-lg cursor-pointer'}"
					in:fly={{
						x: slotType === 'ESP' ? -50 : 50,
						duration: 500,
						delay: (slotType === 'Destination' ? 100 : 0) + index * 50,
						easing: quintOut
					}}
				>
					<div
						class="flex h-12 w-12 items-center justify-center rounded-lg text-xl font-bold {occupied
							? 'bg-[#E5E7EB] text-[#9CA3AF]'
							: 'bg-[#D1FAE5] text-[#0B5540]'}"
					>
						{#if slotType === 'ESP'}
							{slot.name.slice(0, 2).toUpperCase()}
						{:else}
							📧
						{/if}
					</div>
					<div class="flex-1">
						<div class="mb-1 font-semibold {occupied ? 'text-[#9CA3AF]' : 'text-[#0B5540]'}">
							{slot.name}
						</div>
						<div class="text-sm text-[#6B7280]">
							{#if occupied && slot.players.length > 0}
								{playerNames[slot.players[0]] || 'Player joined'}
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
