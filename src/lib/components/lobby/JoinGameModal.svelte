<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	export let show: boolean;
	export let selectedTeam: string | null;
	export let selectedRole: 'ESP' | 'Destination' | null;
	export let displayName: string;
	export let joinError: string;
	export let isJoining: boolean;
	export let onClose: () => void;
	export let onSubmit: () => Promise<void>;

	let displayNameInput: HTMLInputElement;

	// Focus the display name input when modal opens
	$: if (show && displayNameInput) {
		setTimeout(() => displayNameInput.focus(), 100);
	}
</script>

{#if show}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		on:click={onClose}
		on:keydown={(e) => e.key === 'Escape' && onClose()}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		transition:fade={{ duration: 200 }}
	>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			class="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full"
			on:click|stopPropagation
			transition:scale={{ duration: 300, easing: quintOut }}
		>
			<h3 class="text-2xl font-bold text-[#0B5540] mb-2">
				Join as {selectedTeam}
			</h3>
			<p class="text-[#0B5540]/70 mb-6">
				Role: {selectedRole}
			</p>

			<form on:submit|preventDefault={onSubmit} novalidate>
				<div class="mb-6">
					<label for="displayName" class="block text-sm font-semibold text-[#0B5540] mb-2">
						Your Name
					</label>
					<input
						type="text"
						id="displayName"
						name="displayName"
						bind:this={displayNameInput}
						bind:value={displayName}
						placeholder="Enter your name"
						class="w-full px-4 py-3 rounded-xl border-2 border-[#D1FAE5] focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all"
						disabled={isJoining}
						required
					/>
				</div>

				{#if joinError}
					<div
						role="alert"
						class="mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
					>
						{joinError}
					</div>
				{/if}

				<div class="flex gap-3">
					<button
						type="button"
						on:click={onClose}
						disabled={isJoining}
						class="flex-1 px-6 py-3 rounded-xl border-2 border-[#E5E7EB] text-[#0B5540] font-semibold hover:bg-[#F9FAFB] transition-all disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isJoining}
						class="flex-1 px-6 py-3 rounded-xl bg-[#10B981] hover:bg-[#0B5540] text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if isJoining}
							Joining...
						{:else}
							Join Game
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
