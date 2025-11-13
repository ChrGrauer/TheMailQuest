<script lang="ts">
	/**
	 * TechnicalShopModal Component (Destination)
	 * US-2.6.2: Destination Tech Shop
	 *
	 * Modal for browsing and purchasing destination tools
	 */

	import { fade, scale, fly } from 'svelte/transition';
	import DestinationToolCard from './DestinationToolCard.svelte';

	interface Tool {
		id: string;
		name: string;
		description: string;
		category: string;
		scope: string;
		permanent: boolean;
		authentication_level?: number;
		requires?: string | string[];
		effects: {
			spam_detection_boost?: number;
			false_positive_impact?: number;
			trap_multiplier?: number;
		};
		cost: number | null;
		status: 'Owned' | 'Available' | 'Locked' | 'Unavailable';
		unavailable_reason?: string;
	}

	interface Props {
		show: boolean;
		isLockedIn?: boolean;
		roomCode: string;
		destName: string;
		kingdom: string;
		currentBudget: number;
		authLevel: number;
		onToolPurchased: (toolId: string, cost: number) => void;
	}

	let {
		show = $bindable(),
		isLockedIn = false,
		roomCode,
		destName,
		kingdom,
		currentBudget,
		authLevel,
		onToolPurchased
	}: Props = $props();

	let tools: Tool[] = $state([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let successMessage = $state<string | null>(null);
	let showAnnouncementDialog = $state(false);
	let showConfirmDialog = $state(false);
	let pendingTool: Tool | null = $state(null);
	let selectedAnnouncement: 'announce' | 'secret' = $state('secret');

	// Fetch tools when modal opens
	$effect(() => {
		if (show) {
			// Reset state and fetch fresh data
			tools = [];
			successMessage = null;
			error = null;
			showAnnouncementDialog = false;
			showConfirmDialog = false;
			pendingTool = null;
			fetchTools();
		}
	});

	async function fetchTools() {
		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/sessions/${roomCode}/destination/${destName}/tools`);
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to fetch tools');
			}

			tools = data.tools || [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load tech shop';
		} finally {
			loading = false;
		}
	}

	function handlePurchaseClick(toolId: string) {
		const tool = tools.find((t) => t.id === toolId);
		if (!tool) return;

		pendingTool = tool;

		// Check if this is Spam Trap Network - show announcement dialog
		if (toolId === 'spam_trap_network') {
			showAnnouncementDialog = true;
			return;
		}

		// Check if tool costs entire budget - show confirmation
		if (tool.cost !== null && tool.cost >= currentBudget) {
			showConfirmDialog = true;
			return;
		}

		// Otherwise purchase directly
		executePurchase(toolId);
	}

	async function executePurchase(toolId: string, announcement?: 'announce' | 'secret') {
		const tool = tools.find((t) => t.id === toolId);
		if (!tool || loading) return;

		loading = true;
		error = null;
		successMessage = null;
		showAnnouncementDialog = false;
		showConfirmDialog = false;

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000);

			const response = await fetch(
				`/api/sessions/${roomCode}/destination/${destName}/tools/purchase`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ toolId, announcement }),
					signal: controller.signal
				}
			);

			clearTimeout(timeoutId);
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to purchase tool');
			}

			// Show success message
			successMessage = `Successfully purchased ${tool.name}!`;
			setTimeout(() => (successMessage = null), 3000);

			// Update tool status locally
			const toolIndex = tools.findIndex((t) => t.id === toolId);
			if (toolIndex !== -1) {
				tools[toolIndex].status = 'Owned';

				// Check if purchasing this tool unlocks others (Auth Validators)
				tools.forEach((t, idx) => {
					if (t.status === 'Locked' && t.requires) {
						const requirements = Array.isArray(t.requires) ? t.requires : [t.requires];
						const hasAll = requirements.every((reqId) =>
							tools.find((tool) => tool.id === reqId && tool.status === 'Owned')
						);
						if (hasAll) {
							tools[idx].status = 'Available';
						}
					}
				});
			}

			// Notify parent
			onToolPurchased(toolId, tool.cost || 0);
		} catch (err) {
			if (err instanceof Error) {
				if (err.name === 'AbortError') {
					error = 'Request timed out. Please try again.';
				} else {
					error = err.message;
				}
			} else {
				error = 'Failed to purchase tool';
			}
			setTimeout(() => (error = null), 5000);
		} finally {
			loading = false;
			pendingTool = null;
		}
	}

	function handleAnnouncementConfirm() {
		if (pendingTool) {
			executePurchase(pendingTool.id, selectedAnnouncement);
		}
	}

	function handleExpensiveConfirm() {
		if (pendingTool) {
			executePurchase(pendingTool.id);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (showAnnouncementDialog) {
				showAnnouncementDialog = false;
			} else if (showConfirmDialog) {
				showConfirmDialog = false;
			} else {
				show = false;
			}
		}
	}

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			show = false;
		}
	}

	// Group tools by category
	let toolsByCategory = $derived.by(() => {
		const categories: Record<string, Tool[]> = {};

		tools.forEach((tool) => {
			if (!categories[tool.category]) {
				categories[tool.category] = [];
			}
			categories[tool.category].push(tool);
		});

		return categories;
	});

	let categoryIcons: Record<string, string> = {
		'Content Analysis': '🔍',
		Authentication: '🔐',
		Intelligence: '🤖',
		Tactical: '🪤',
		'Volume Control': '⏱️'
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
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="bg-white rounded-xl max-w-7xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
			transition:scale={{ start: 0.95, duration: 200 }}
			onclick={(e) => e.stopPropagation()}
			role="document"
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between px-6 py-4 border-b-2 border-blue-200 bg-white sticky top-0 z-10"
			>
				<div class="flex-1">
					<h2 id="tech-shop-title" class="text-2xl font-bold text-blue-900 flex items-center gap-3">
						<span>🛒</span>
						<span>Tech Shop</span>
						<span class="text-sm font-normal text-gray-600">{kingdom}</span>
					</h2>
					<div class="text-sm text-gray-600 mt-1" data-testid="budget-display">
						Budget: {currentBudget} credits
					</div>
				</div>
				<button
					onclick={() => (show = false)}
					data-testid="close-tech-shop"
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
						<p class="text-sm text-orange-700">
							Your decisions are locked. You cannot purchase tools until the next round.
						</p>
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
					data-testid="error-message"
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
				{#if loading && tools.length === 0}
					<div data-testid="loading-spinner" class="flex items-center justify-center py-20">
						<div class="text-center">
							<div class="text-4xl mb-4">⏳</div>
							<div class="text-gray-600">Loading tools...</div>
						</div>
					</div>
				{:else if tools.length === 0}
					<div class="text-center py-20">
						<div class="text-6xl mb-4">🛒</div>
						<div class="text-xl font-bold text-gray-800 mb-2">No tools available</div>
					</div>
				{:else}
					<!-- Tools by Category -->
					{#each Object.entries(toolsByCategory) as [category, categoryTools]}
						{#if categoryTools.length > 0}
							<div class="mb-8">
								<h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
									<span class="text-2xl">{categoryIcons[category] || '📦'}</span>
									<span>{category}</span>
								</h3>
								<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
									{#each categoryTools as tool, i}
										<DestinationToolCard
											{tool}
											{currentBudget}
											{isLockedIn}
											onPurchase={handlePurchaseClick}
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

<!-- Spam Trap Announcement Dialog -->
{#if showAnnouncementDialog && pendingTool}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
		transition:fade={{ duration: 200 }}
		data-testid="announcement-dialog"
	>
		<div
			class="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl"
			transition:scale={{ start: 0.95, duration: 200 }}
		>
			<h3 class="text-xl font-bold text-gray-900 mb-4">Spam Trap Deployment</h3>
			<p class="text-gray-700 mb-4">Choose how to deploy your spam trap network:</p>

			<div class="space-y-3 mb-6">
				<label
					class="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer {selectedAnnouncement ===
					'announce'
						? 'border-blue-500 bg-blue-50'
						: 'border-gray-300 hover:border-gray-400'}"
					data-testid="option-announce"
				>
					<input
						type="radio"
						name="announcement"
						value="announce"
						bind:group={selectedAnnouncement}
						class="mt-1"
					/>
					<div>
						<div class="font-semibold text-gray-900">Announce Deployment</div>
						<div class="text-sm text-gray-600">Alert ESPs (deterrent effect)</div>
					</div>
				</label>

				<label
					class="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer {selectedAnnouncement ===
					'secret'
						? 'border-blue-500 bg-blue-50'
						: 'border-gray-300 hover:border-gray-400'}"
					data-testid="option-secret"
				>
					<input
						type="radio"
						name="announcement"
						value="secret"
						bind:group={selectedAnnouncement}
						class="mt-1"
					/>
					<div>
						<div class="font-semibold text-gray-900">Keep Secret</div>
						<div class="text-sm text-gray-600">Surprise deployment (maximum trap hits)</div>
					</div>
				</label>
			</div>

			<div class="flex gap-3">
				<button
					onclick={() => (showAnnouncementDialog = false)}
					class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={handleAnnouncementConfirm}
					data-testid="confirm-announcement-button"
					class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
				>
					Confirm Purchase
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Expensive Tool Confirmation Dialog -->
{#if showConfirmDialog && pendingTool}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
		transition:fade={{ duration: 200 }}
		data-testid="confirmation-dialog"
	>
		<div
			class="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl"
			transition:scale={{ start: 0.95, duration: 200 }}
		>
			<h3 class="text-xl font-bold text-gray-900 mb-4">Confirm Purchase</h3>
			<p class="text-gray-700 mb-6" data-testid="confirmation-message">
				This tool costs {pendingTool.cost} credits (your entire budget). Continue?
			</p>

			<div class="flex gap-3">
				<button
					onclick={() => (showConfirmDialog = false)}
					class="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={handleExpensiveConfirm}
					data-testid="confirm-purchase-button"
					class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
				>
					Confirm
				</button>
			</div>
		</div>
	</div>
{/if}
