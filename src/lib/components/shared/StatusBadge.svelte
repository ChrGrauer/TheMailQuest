<script lang="ts">
	/**
	 * Shared Status Badge Component
	 *
	 * Displays status badges with consistent styling across the app.
	 * Used for client status (Active/Paused/Suspended), tech status, etc.
	 */

	interface Props {
		status: 'Active' | 'Paused' | 'Suspended';
		testId?: string;
		showIcon?: boolean;
	}

	let { status, testId, showIcon = true }: Props = $props();

	function getBadgeClass(status: string): string {
		switch (status) {
			case 'Active':
				return 'bg-green-100 text-green-700';
			case 'Paused':
				return 'bg-orange-100 text-orange-700';
			case 'Suspended':
				return 'bg-gray-100 text-gray-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	function getIcon(status: string): string {
		switch (status) {
			case 'Active':
				return '✓';
			case 'Paused':
				return '⏸';
			case 'Suspended':
				return '🔒';
			default:
				return '';
		}
	}

	function getAriaLabel(status: string): string {
		switch (status) {
			case 'Active':
				return 'Status: Active';
			case 'Paused':
				return 'Status: Paused';
			case 'Suspended':
				return 'Status: Suspended - Cannot be activated';
			default:
				return `Status: ${status}`;
		}
	}
</script>

<span
	data-testid={testId}
	class="px-2 py-1 rounded-full text-xs font-medium {getBadgeClass(status)}"
	role="status"
	aria-label={getAriaLabel(status)}
>
	{#if showIcon}
		{getIcon(status)}
	{/if}
	{status}
</span>
