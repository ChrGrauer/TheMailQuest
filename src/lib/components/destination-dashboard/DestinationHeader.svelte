<script lang="ts">
	/**
	 * DestinationHeader Component
	 * US-2.5: Destination Kingdom Dashboard
	 *
	 * Displays:
	 * - Destination name with icon
	 * - Budget display
	 * - Round indicator (e.g., "Round 2 / 4")
	 * - Countdown timer with color changes
	 *
	 * Styled to match ESP GameStateHeader but with blue theme
	 */

	interface Props {
		destinationName: string;
		budget?: number;
		currentRound?: number;
		totalRounds?: number;
		timerSeconds?: number;
		onTimerUpdate?: (seconds: number) => void;
	}

	let {
		destinationName,
		budget = 500,
		currentRound = 1,
		totalRounds = 4,
		timerSeconds = 0,
		onTimerUpdate
	}: Props = $props();

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

	// Get destination initials (first 2 letters)
	let destinationInitials = $derived(destinationName.substring(0, 2).toUpperCase());
</script>

<header data-testid="game-header" class="bg-white px-6 py-4 shadow-sm sticky top-0 z-10">
	<div class="flex items-center justify-between">
		<!-- Destination Info -->
		<div class="flex items-center gap-3">
			<div
				data-testid="destination-icon"
				class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg shadow-md"
			>
				{destinationInitials}
			</div>
			<h1 data-testid="destination-name" class="text-2xl font-bold text-gray-800">
				{destinationName}
			</h1>
		</div>

		<!-- Budget Display -->
		<div class="flex items-center gap-6">
			<!-- Current Budget -->
			<div class="text-right">
				<div class="text-xs text-gray-500 uppercase tracking-wide">Budget</div>
				<div
					data-testid="budget-current"
					class="text-3xl font-bold text-blue-600 flex items-baseline gap-2"
				>
					{budget.toLocaleString()}
					<span class="text-base text-gray-500">credits</span>
				</div>
			</div>
		</div>

		<!-- Game State Info -->
		<div class="flex items-center gap-6">
			<!-- Round Indicator -->
			<div
				data-testid="round-indicator"
				class="flex items-center gap-2 text-gray-700"
			>
				<span class="text-sm font-medium">Round {currentRound} / {totalRounds}</span>
			</div>

			<!-- Timer -->
			<div
				data-testid="timer-display"
				class="flex items-center gap-2 {timerClass()}"
			>
				<svg
					class="w-5 h-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
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
