<script lang="ts">
	/**
	 * DashboardHeader Component (Shared)
	 * Used by both ESP and Destination dashboards
	 *
	 * Displays:
	 * - Entity name (team or destination) with avatar
	 * - Budget (current + optional forecast)
	 * - Round indicator (e.g., "Round 2 / 4")
	 * - Countdown timer with color changes
	 */

	interface Props {
		/** Display name (team or destination) */
		entityName: string;
		/** Current budget/credits */
		currentBudget?: number;
		/** Pending costs (for forecast display) */
		pendingCosts?: number;
		/** Current round number */
		currentRound?: number;
		/** Total rounds in game */
		totalRounds?: number;
		/** Timer in seconds */
		timerSeconds?: number;
		/** Callback when timer updates */
		onTimerUpdate?: (seconds: number) => void;
		/** Theme color: 'emerald' for ESP, 'blue' for Destination */
		theme?: 'emerald' | 'blue';
	}

	let {
		entityName,
		currentBudget = 1000,
		pendingCosts = 0,
		currentRound = 1,
		totalRounds = 4,
		timerSeconds = 0,
		onTimerUpdate,
		theme = 'emerald'
	}: Props = $props();

	// Calculate forecast budget after lock-in
	let forecastBudget = $derived(currentBudget - pendingCosts);

	// Show forecast only if there are pending costs
	let showForecast = $derived(pendingCosts > 0);

	// Format timer as MM:SS
	let formattedTimer = $derived(() => {
		const minutes = Math.floor(timerSeconds / 60);
		const seconds = timerSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	});

	// Timer color class based on remaining time
	let timerClass = $derived(() => {
		if (timerSeconds <= 30) {
			return 'text-red-600 font-bold animate-pulse'; // Urgent: red + pulse
		} else if (timerSeconds <= 60) {
			return 'text-orange-500 font-semibold'; // Warning: orange
		}
		return 'text-gray-700'; // Normal
	});

	// Client-side countdown (if timer is running)
	let countdownInterval: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		if (timerSeconds > 0) {
			countdownInterval = setInterval(() => {
				if (timerSeconds > 0) {
					timerSeconds--;
					onTimerUpdate?.(timerSeconds);
				} else if (countdownInterval) {
					clearInterval(countdownInterval);
				}
			}, 1000);
		}

		return () => {
			if (countdownInterval) {
				clearInterval(countdownInterval);
			}
		};
	});

	// Get entity initials (first 2 letters)
	let entityInitials = $derived(entityName.substring(0, 2).toUpperCase());

	// Theme-specific colors
	let avatarGradient = $derived(
		theme === 'emerald'
			? 'from-emerald-400 to-emerald-600'
			: 'from-blue-500 to-blue-700'
	);
	let budgetColor = $derived(theme === 'emerald' ? 'text-emerald-600' : 'text-blue-600');
</script>

<header
	data-testid="game-header"
	class="bg-white px-6 py-4 shadow-sm sticky top-0 z-10"
>
	<div class="flex items-center justify-between">
		<!-- Entity Info -->
		<div class="flex items-center gap-3">
			<div
				data-testid={theme === 'blue' ? 'destination-icon' : 'team-icon'}
				class="w-12 h-12 rounded-full bg-gradient-to-br {avatarGradient} flex items-center justify-center text-white font-bold text-lg shadow-md"
			>
				{entityInitials}
			</div>
			<h1
				data-testid={theme === 'blue' ? 'destination-name' : 'team-name'}
				class="text-2xl font-bold text-gray-800"
			>
				{entityName}
			</h1>
		</div>

		<!-- Budget Display -->
		<div class="flex items-center gap-6">
			<!-- Current Budget -->
			<div class="text-right">
				<div class="text-xs text-gray-500 uppercase tracking-wide">Budget</div>
				<div
					data-testid="budget-current"
					class="text-3xl font-bold {budgetColor} flex items-baseline gap-2"
				>
					{currentBudget.toLocaleString()}
					<span class="text-base text-gray-500">credits</span>
				</div>
			</div>

			<!-- Forecast Budget (After Lock-in) - ESP only -->
			{#if showForecast}
				<div class="text-right border-l border-gray-300 pl-6">
					<div class="text-xs text-gray-500 uppercase tracking-wide">After Lock-in</div>
					<div
						data-testid="budget-forecast"
						class="text-2xl font-semibold text-gray-500 opacity-75 flex items-baseline gap-2"
					>
						{forecastBudget.toLocaleString()}
						<span class="text-sm text-gray-400">credits</span>
					</div>
					<div class="text-xs text-orange-600 mt-0.5">
						-{pendingCosts.toLocaleString()} pending
					</div>
				</div>
			{/if}
		</div>

		<!-- Game State Info -->
		<div class="flex items-center gap-6">
			<!-- Round Indicator -->
			<div data-testid="round-indicator" class="flex items-center gap-2 text-gray-700">
				<span class="text-sm font-medium">Round {currentRound} / {totalRounds}</span>
			</div>

			<!-- Timer -->
			<div
				data-testid={theme === 'blue' ? 'timer-display' : 'game-timer'}
				class="flex items-center gap-2 {timerClass()}"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
					></path>
				</svg>
				<span class="text-xl font-mono tabular-nums">
					{formattedTimer()}
				</span>
			</div>
		</div>
	</div>
</header>
