<script lang="ts">
	/**
	 * Incident Trigger Button
	 * Phase 1: MVP Foundation
	 *
	 * Simple button for facilitators to open incident selection modal
	 * Always visible - facilitator decides when to trigger
	 */

	interface Props {
		disabled?: boolean;
		onClick: () => void;
	}

	let { disabled = false, onClick }: Props = $props();
</script>

<button
	data-testid="drama-trigger-incident-button"
	onclick={onClick}
	{disabled}
	class="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center gap-2"
	aria-label="Trigger incident card"
>
	<span class="text-lg" aria-hidden="true">🎭</span>
	<span>Trigger Incident</span>
</button>
