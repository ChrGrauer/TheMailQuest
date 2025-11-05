<script lang="ts">
	/**
	 * TechnicalShopModal Component
	 * US-2.3: Technical Infrastructure Shop
	 *
	 * Modal for browsing and purchasing technical upgrades
	 */

	import { fade, scale, fly } from 'svelte/transition';
	import UpgradeCard from './UpgradeCard.svelte';

	interface Upgrade {
		id: string;
		name: string;
		description: string;
		cost: number;
		category: string;
		dependencies: string[];
		benefits: string[];
		mandatory?: boolean;
		mandatoryFrom?: number;
		status: 'Available' | 'Locked' | 'Owned';
	}

	interface Props {
		show: boolean;
		isLockedIn?: boolean;
		onClose: () => void;
		roomCode: string;
		teamName: string;
		currentCredits: number;
		currentRound: number;
		onUpgradePurchased: (upgradeId: string, cost: number) => void;
	}

	let { show, isLockedIn = false, onClose, roomCode, teamName, currentCredits, currentRound, onUpgradePurchased }: Props =
		$props();

	let upgrades: Upgrade[] = $state([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	// Fetch upgrades when modal opens
	$effect(() => {
		if (show) {
			// Reset state and fetch fresh data each time modal opens
			upgrades = [];
			successMessage = null;
			error = null;
			fetchUpgrades();
		}
	});

	async function fetchUpgrades() {
		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/sessions/${roomCode}/esp/${teamName}/techUpgrades`);
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to fetch upgrades');
			}

			upgrades = data.upgrades || [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load tech shop';
		} finally {
			loading = false;
		}
	}

	async function handlePurchase(upgradeId: string) {
		const upgrade = upgrades.find((u) => u.id === upgradeId);
		if (!upgrade) return;

		// Prevent multiple purchases
		if (loading) return;

		loading = true;
		error = null;
		successMessage = null;

		try {
			// Add timeout to prevent indefinite hanging
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

			const response = await fetch(
				`/api/sessions/${roomCode}/esp/${teamName}/techUpgrades/purchase`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ upgradeId }),
					signal: controller.signal
				}
			);

			clearTimeout(timeoutId);
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to purchase upgrade');
			}

			// Show success message
			successMessage = `Successfully purchased ${upgrade.name}!`;
			setTimeout(() => (successMessage = null), 3000);

			// Update upgrade status locally
			const upgradeIndex = upgrades.findIndex((u) => u.id === upgradeId);
			if (upgradeIndex !== -1) {
				upgrades[upgradeIndex].status = 'Owned';

				// Check if purchasing this upgrade unlocks others
				upgrades.forEach((u, idx) => {
					if (u.status === 'Locked' && u.dependencies.every((dep) =>
						upgrades.find((up) => up.id === dep && up.status === 'Owned')
					)) {
						upgrades[idx].status = 'Available';
					}
				});
			}

			// Notify parent
			onUpgradePurchased(upgradeId, upgrade.cost);
		} catch (err) {
			if (err instanceof Error) {
				if (err.name === 'AbortError') {
					error = 'Request timed out. Please try again.';
				} else {
					error = err.message;
				}
			} else {
				error = 'Failed to purchase upgrade';
			}
			setTimeout(() => (error = null), 5000);
		} finally {
			loading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	// Group upgrades by category
	let upgradesByCategory = $derived.by(() => {
		const categories: Record<string, Upgrade[]> = {
			authentication: [],
			security: [],
			monitoring: [],
			infrastructure: []
		};

		upgrades.forEach((upgrade) => {
			if (categories[upgrade.category]) {
				categories[upgrade.category].push(upgrade);
			} else {
				categories[upgrade.category] = [upgrade];
			}
		});

		return categories;
	});

	let categoryDisplayNames: Record<string, string> = {
		authentication: 'Email Authentication',
		security: 'Quality Control',
		monitoring: 'Intelligence & Monitoring',
		infrastructure: 'Infrastructure'
	};
</script>

{#if show}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
		transition:fade={{ duration: 200 }}
		onclick={handleOverlayClick}
		onkeydown={handleKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="tech-shop-title"
		data-testid="tech-shop-modal"
		tabindex="-1"
	>
		<div
			class="bg-white rounded-xl max-w-7xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
			transition:scale={{ start: 0.95, duration: 200 }}
			onclick={(e) => e.stopPropagation()}
			role="document"
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between px-6 py-4 border-b-2 border-gray-200 bg-white sticky top-0 z-10"
			>
				<h2
					id="tech-shop-title"
					class="text-2xl font-bold text-blue-900 flex items-center gap-3"
				>
					<span>⚙️</span>
					<span>Technical Infrastructure Shop</span>
					<span class="text-sm font-normal text-gray-600">Round {currentRound}</span>
				</h2>
				<button
					onclick={onClose}
					data-testid="close-modal"
					class="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
					aria-label="Close tech shop"
				>
					<span class="text-xl text-gray-600">✕</span>
				</button>
			</div>

			<!-- View Only Banner (US-3.2) -->
			{#if isLockedIn}
				<div
					data-testid="view-only-banner"
					class="px-6 py-3 bg-orange-50 border-b border-orange-200 flex items-center gap-3"
					role="alert"
				>
					<span class="text-2xl" aria-hidden="true">🔒</span>
					<div class="flex-1">
						<p class="font-bold text-orange-900">Locked In - View Only</p>
						<p class="text-sm text-orange-700">Your decisions are locked. You cannot purchase upgrades until the next round.</p>
					</div>
				</div>
			{/if}

			<!-- Success Message -->
			{#if successMessage}
				<div
					data-testid="success-message"
					class="mx-6 mt-4 p-4 bg-green-100 border border-green-300 text-green-800 rounded-lg flex items-center gap-2"
					transition:fly={{ y: -10, duration: 200 }}
					role="alert"
				>
					<span class="text-xl">✓</span>
					<span class="font-semibold">{successMessage}</span>
				</div>
			{/if}

			<!-- Error Message -->
			{#if error && !loading}
				<div
					data-testid="error-banner"
					class="mx-6 mt-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-center justify-between"
					transition:fly={{ y: -10, duration: 200 }}
					role="alert"
				>
					<div class="flex items-center gap-2">
						<span class="text-xl">⚠</span>
						<span class="font-semibold">{error}</span>
					</div>
					<button
						onclick={() => (error = null)}
						class="text-red-600 hover:text-red-800 font-bold"
						aria-label="Dismiss error"
					>
						✕
					</button>
				</div>
			{/if}

			<!-- Body -->
			<div class="flex-1 overflow-y-auto p-6">
				{#if loading && upgrades.length === 0}
					<div data-testid="loading-spinner" class="flex items-center justify-center py-20">
						<div class="text-center">
							<div class="text-4xl mb-4">⏳</div>
							<div class="text-gray-600">Loading upgrades...</div>
						</div>
					</div>
				{:else if upgrades.length === 0}
					<div class="text-center py-20">
						<div class="text-6xl mb-4">⚙️</div>
						<div class="text-xl font-bold text-gray-800 mb-2">No upgrades available</div>
					</div>
				{:else}
					<!-- Upgrades by Category -->
					{#each Object.entries(upgradesByCategory) as [category, categoryUpgrades]}
						{#if categoryUpgrades.length > 0}
							<div class="mb-8">
								<h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
									<span class="text-2xl">
										{category === 'authentication'
											? '🔐'
											: category === 'security'
												? '🛡️'
												: category === 'monitoring'
													? '📊'
													: '🏗️'}
									</span>
									<span>{categoryDisplayNames[category] || category}</span>
								</h3>
								<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{#each categoryUpgrades as upgrade, i}
										<UpgradeCard
											{upgrade}
											credits={currentCredits}
											{currentRound}
											{isLockedIn}
											onPurchase={handlePurchase}
											delay={i * 50}
										/>
									{/each}
								</div>
							</div>
						{/if}
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}
