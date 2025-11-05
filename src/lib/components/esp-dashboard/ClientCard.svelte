<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { Client } from '$lib/server/game/types';

	interface Props {
		client: Client;
		credits: number;
		ownedTech: string[];
		overallReputation: number;
		isLockedIn?: boolean;
		onAcquire: (clientId: string) => void;
		delay?: number;
	}

	let { client, credits, ownedTech, overallReputation, isLockedIn = false, onAcquire, delay = 0 }: Props = $props();

	// Check if can acquire
	let canAcquire = $derived.by(() => {
		// Check if locked in
		if (isLockedIn) return { can: false, reason: 'Decisions locked' };

		// Check credits
		if (credits < client.cost) return { can: false, reason: 'Insufficient credits' };

		// Check tech requirements (Premium clients)
		if (client.requirements?.tech) {
			const missingTech = client.requirements.tech.filter((tech) => !ownedTech.includes(tech));
			if (missingTech.length > 0) {
				const techName = missingTech[0].toUpperCase();
				return { can: false, reason: `Missing ${techName}` };
			}
		}

		// Check reputation requirements (Premium clients)
		if (client.requirements?.reputation) {
			if (overallReputation < client.requirements.reputation) {
				return {
					can: false,
					reason: `Reputation too low (${overallReputation}/${client.requirements.reputation})`
				};
			}
		}

		return { can: true, reason: '' };
	});

	// Format volume for display
	function formatVolume(volume: number): string {
		if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
		if (volume >= 1000) return `${Math.round(volume / 1000)}K`;
		return volume.toString();
	}

	// Risk color
	const riskColors = {
		Low: 'text-green-700 bg-green-100',
		Medium: 'text-orange-700 bg-orange-100',
		High: 'text-red-700 bg-red-100'
	};

	let isAcquiring = $state(false);

	async function handleAcquire() {
		if (!canAcquire.can || isAcquiring) return;
		isAcquiring = true;
		try {
			await onAcquire(client.id);
		} finally {
			isAcquiring = false;
		}
	}
</script>

<div
	class="border-2 rounded-xl p-6 transition-all hover:border-emerald-500 hover:shadow-lg bg-white"
	data-testid="client-card"
	transition:fly={{ y: 20, duration: 300, delay }}
>
	<!-- Header -->
	<div class="flex justify-between items-start mb-3">
		<div class="flex-1">
			<h3 class="text-xl font-bold text-emerald-900 mb-1" data-testid="client-name">
				{client.name}
			</h3>
			<div class="flex gap-2 items-center">
				<span
					class="px-2 py-1 text-xs font-semibold rounded {riskColors[client.risk]}"
					data-testid="client-risk"
				>
					{client.risk} Risk
				</span>
				{#if client.type === 'premium_brand'}
					<span class="px-2 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-700">
						Premium
					</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-2 gap-3 mb-4 text-sm">
		<div>
			<span class="text-gray-600">Revenue:</span>
			<span class="font-semibold text-gray-900 ml-1" data-testid="client-revenue"
				>{client.revenue}/round</span
			>
		</div>
		<div>
			<span class="text-gray-600">Volume:</span>
			<span class="font-semibold text-gray-900 ml-1" data-testid="client-volume"
				>{formatVolume(client.volume)} emails</span
			>
		</div>
		<div>
			<span class="text-gray-600">Spam Rate:</span>
			<span class="font-semibold text-gray-900 ml-1">{client.spam_rate.toFixed(1)}%</span>
		</div>
		<div>
			<span class="text-gray-600">Cost:</span>
			<span class="font-bold text-emerald-700 ml-1 text-lg" data-testid="client-cost"
				>{client.cost}</span
			>
		</div>
	</div>

	<!-- Requirements (Premium only) -->
	{#if client.requirements}
		<div class="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
			<div class="text-xs font-semibold text-gray-600 mb-2">REQUIREMENTS</div>

			<!-- Tech requirements -->
			{#if client.requirements.tech}
				<div class="flex gap-2 mb-2 flex-wrap">
					{#each client.requirements.tech as tech}
						{@const hasTech = ownedTech.includes(tech)}
						<span
							class="px-2 py-1 text-xs font-semibold rounded {hasTech
								? 'bg-green-100 text-green-700'
								: 'bg-red-100 text-red-700'}"
						>
							{hasTech ? '✓' : '✗'} {tech.toUpperCase()}
						</span>
					{/each}
				</div>
			{/if}

			<!-- Reputation requirement -->
			{#if client.requirements.reputation}
				{@const meetsReputation = overallReputation >= client.requirements.reputation}
				<div
					class="px-2 py-1 text-xs font-semibold rounded inline-block {meetsReputation
						? 'bg-green-100 text-green-700'
						: 'bg-red-100 text-red-700'}"
				>
					{meetsReputation ? '✓' : '✗'} Reputation {client.requirements.reputation}+ (You: {overallReputation})
				</div>
			{/if}
		</div>
	{/if}

	<!-- Acquire Button -->
	<button
		onclick={handleAcquire}
		disabled={!canAcquire.can || isAcquiring}
		data-testid="acquire-button"
		class="w-full py-3 px-4 rounded-lg font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 {canAcquire.can
			? 'bg-gradient-to-r from-emerald-700 to-emerald-500 text-white hover:shadow-lg hover:-translate-y-0.5'
			: 'bg-gray-300 text-gray-600 cursor-not-allowed'}"
		aria-label={canAcquire.can ? `Acquire ${client.name}` : canAcquire.reason}
	>
		{#if isAcquiring}
			Acquiring...
		{:else if canAcquire.can}
			Acquire Client
		{:else}
			{canAcquire.reason}
		{/if}
	</button>
</div>
