<script lang="ts">
	import type { FilteringLevel, FilteringPolicy } from '$lib/server/game/types';
	import { calculateImpactValues } from '$lib/utils/filtering';

	interface Props {
		espName: string;
		volume: number; // Email volume last round
		reputation: number; // Reputation score (0-100)
		satisfaction: number; // User satisfaction percentage (0-100)
		spamRate: number; // Spam rate percentage (0-100)
		currentPolicy: FilteringPolicy;
		onFilterChange: (espName: string, level: FilteringLevel) => void;
	}

	let { espName, volume, reputation, satisfaction, spamRate, currentPolicy, onFilterChange }: Props =
		$props();

	// Map slider position (0-3) to filtering level
	const levelMap: FilteringLevel[] = ['permissive', 'moderate', 'strict', 'maximum'];

	// Get current slider position from level
	let sliderValue = $state(levelMap.indexOf(currentPolicy.level));

	// Calculate impact values for current level
	let impactValues = $derived(calculateImpactValues(levelMap[sliderValue] as FilteringLevel));

	// Get level display name (capitalize first letter)
	let levelDisplayName = $derived(
		levelMap[sliderValue].charAt(0).toUpperCase() + levelMap[sliderValue].slice(1)
	);

	// Get impact title based on level
	let impactTitle = $derived(sliderValue === 0 ? 'Current Impact' : 'Active Filtering Impact');

	// Get CSS classes for level coloring
	let levelClass = $derived(levelMap[sliderValue]);

	// Handle slider change
	function handleSliderChange(event: Event) {
		const target = event.target as HTMLInputElement;
		sliderValue = parseInt(target.value);
		const newLevel = levelMap[sliderValue] as FilteringLevel;
		onFilterChange(espName, newLevel);
	}

	// Format volume with K/M suffix
	function formatVolume(vol: number): string {
		if (vol >= 1000000) {
			return `${Math.round(vol / 1000000)}M`;
		} else if (vol >= 1000) {
			return `${Math.round(vol / 1000)}K`;
		}
		return vol.toString();
	}

	// Get ESP initials for icon
	let espInitials = $derived(
		espName
			.split(' ')
			.map((word) => word.charAt(0))
			.join('')
			.toUpperCase()
	);

	// Watch for external currentPolicy changes
	$effect(() => {
		sliderValue = levelMap.indexOf(currentPolicy.level);
	});

	// Get color name for data attribute (for E2E testing)
	function getLevelColor(level: string): string {
		const colorMap: Record<string, string> = {
			permissive: 'green',
			moderate: 'blue',
			strict: 'orange',
			maximum: 'red'
		};
		return colorMap[level] || 'gray';
	}
</script>

<div
	class="filter-esp-item"
	class:filtering-active={sliderValue > 0}
	data-testid="filtering-item-{espName.toLowerCase().replace(/\s+/g, '')}"
>
	<div class="filter-esp-header">
		<!-- ESP Icon -->
		<div class="filter-esp-icon" aria-hidden="true">
			{espInitials}
		</div>

		<!-- ESP Info -->
		<div class="filter-esp-info">
			<div class="filter-esp-name" data-testid="filtering-esp-name">
				{espName}
			</div>
			<div class="filter-esp-stats">
				<span data-testid="filtering-esp-volume">{formatVolume(volume)} emails/round</span>
				<span aria-hidden="true"> • </span>
				<span data-testid="filtering-esp-reputation">Reputation: {reputation}</span>
				<span aria-hidden="true"> • </span>
				<span data-testid="filtering-esp-satisfaction">Satisfaction: {satisfaction}%</span>
				<span aria-hidden="true"> • </span>
				<span data-testid="filtering-esp-spam-rate">Spam: {spamRate.toFixed(1)}%</span>
			</div>
		</div>

		<!-- Filter Toggle -->
		<div class="filter-toggle">
			<div class="filter-level-label">Filtering Level</div>
			<div class="filter-level-current {levelClass}" data-testid="filtering-current-level" data-level-color={getLevelColor(levelClass)}>
				{levelDisplayName}
			</div>
			<input
				type="range"
				min="0"
				max="3"
				value={sliderValue}
				class="filter-slider"
				data-testid="filtering-slider"
				onchange={handleSliderChange}
				oninput={handleSliderChange}
				aria-label="Filtering level for {espName}"
			/>
			<div class="filter-level-labels">
				<span>Permissive</span>
				<span>Moderate</span>
				<span>Strict</span>
				<span>Maximum</span>
			</div>
		</div>
	</div>

	<!-- Filter Impact -->
	<div class="filter-impact" class:no-filter={sliderValue === 0}>
		<div class="filter-impact-title" data-testid="filtering-impact-title">
			{impactTitle}
		</div>
		<div class="filter-impact-stats">
			<div class="impact-stat">
				<div class="impact-stat-label">Spam Reduction</div>
				<div class="impact-stat-value positive" data-testid="filtering-spam-reduction">
					-{impactValues.spamReduction}%
				</div>
			</div>
			<div class="impact-stat">
				<div class="impact-stat-label">Legitimate Emails Blocked</div>
				<div class="impact-stat-value negative" data-testid="filtering-false-positives">
					{impactValues.falsePositives}%
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.filter-esp-item {
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		transition: all 0.3s ease;
	}

	.filter-esp-item.filtering-active {
		border-color: #ef4444;
		background: linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%);
	}

	.filter-esp-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.filter-esp-icon {
		width: 48px;
		height: 48px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		font-weight: 700;
		color: white;
		background: linear-gradient(135deg, #0b5540 0%, #10b981 100%);
		flex-shrink: 0;
	}

	.filter-esp-info {
		flex: 1;
		min-width: 0;
	}

	.filter-esp-name {
		font-size: 1.125rem;
		font-weight: 700;
		color: #1a1a1a;
		margin-bottom: 0.25rem;
	}

	.filter-esp-stats {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.filter-toggle {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 200px;
	}

	.filter-level-label {
		font-size: 0.75rem;
		color: #6b7280;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.filter-level-current {
		font-size: 0.875rem;
		font-weight: 700;
		text-align: center;
		margin-bottom: 0.5rem;
	}

	.filter-level-current.permissive {
		color: #059669;
	}

	.filter-level-current.moderate {
		color: #2563eb;
	}

	.filter-level-current.strict {
		color: #d97706;
	}

	.filter-level-current.maximum {
		color: #dc2626;
	}

	.filter-slider {
		width: 100%;
		height: 8px;
		border-radius: 4px;
		background: linear-gradient(to right, #10b981 0%, #3b82f6 33%, #f59e0b 66%, #ef4444 100%);
		outline: none;
		-webkit-appearance: none;
		appearance: none;
		cursor: pointer;
	}

	.filter-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: white;
		border: 3px solid #1e40af;
		cursor: pointer;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.filter-slider::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: white;
		border: 3px solid #1e40af;
		cursor: pointer;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.filter-slider:focus {
		outline: 2px solid #10b981;
		outline-offset: 2px;
	}

	.filter-level-labels {
		display: flex;
		justify-content: space-between;
		margin-top: 0.25rem;
	}

	.filter-level-labels span {
		font-size: 0.625rem;
		color: #9ca3af;
		font-weight: 600;
	}

	.filter-impact {
		margin-top: 1rem;
		padding: 1rem;
		background: #f9fafb;
		border-radius: 8px;
		border-left: 4px solid #ef4444;
	}

	.filter-impact.no-filter {
		border-left-color: #10b981;
	}

	.filter-impact-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		margin-bottom: 0.5rem;
	}

	.filter-impact-stats {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	.impact-stat {
		display: flex;
		flex-direction: column;
	}

	.impact-stat-label {
		font-size: 0.75rem;
		color: #6b7280;
		margin-bottom: 0.25rem;
	}

	.impact-stat-value {
		font-size: 1.25rem;
		font-weight: 700;
	}

	.impact-stat-value.positive {
		color: #059669;
	}

	.impact-stat-value.negative {
		color: #dc2626;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.filter-esp-header {
			flex-wrap: wrap;
		}

		.filter-toggle {
			width: 100%;
			min-width: unset;
		}
	}
</style>
