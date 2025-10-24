<script lang="ts">
	import { goto } from '$app/navigation';

	let isCreating = false;
	let errorMessage = '';

	async function createSession() {
		isCreating = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/sessions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error('Failed to create session');
			}

			const data = await response.json();
			const roomCode = data.roomCode;

			// Navigate to the lobby page
			await goto(`/lobby/${roomCode}`);
		} catch (error) {
			errorMessage = 'Unable to create game session. Please try again.';
			isCreating = false;
		}
	}
</script>

<svelte:head>
	<title>Create Session - Mail Quest</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-[#f8faf9] to-[#e8f5f0]">
	<!-- Header -->
	<header class="bg-white shadow-sm">
		<div class="mx-auto max-w-7xl px-8 py-6">
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0B5540] to-[#10B981] text-xl font-bold text-white"
				>
					MQ
				</div>
				<span class="text-2xl font-bold text-[#0B5540]">Mail Quest</span>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto max-w-4xl px-8 py-16 text-center">
		<div class="mb-12">
			<h1 class="mb-6 text-5xl font-bold text-[#0B5540]">Create a Game Session</h1>
			<p class="text-xl text-[#4B5563]">
				Start a new Mail Quest game and invite players to join your session
			</p>
		</div>

		<div class="mb-8">
			{#if errorMessage}
				<div
					class="mx-auto mb-6 max-w-md rounded-lg border-2 border-red-300 bg-red-50 px-6 py-4 text-red-800"
				>
					{errorMessage}
				</div>
			{/if}

			<button
				on:click={createSession}
				disabled={isCreating}
				class="inline-flex items-center gap-3 rounded-lg bg-gradient-to-r from-[#0B5540] to-[#10B981] px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if isCreating}
					<div class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent">
					</div>
					Creating...
				{:else}
					<span class="text-2xl">🎮</span>
					Create a Session
				{/if}
			</button>
		</div>

		<!-- Instructions -->
		<div class="mx-auto mt-16 max-w-2xl rounded-xl border-2 border-[#FCD34D] bg-gradient-to-br from-[#FEF3C7] to-[#FEF9E7] p-8">
			<div class="mb-4 flex items-center gap-3 text-xl font-semibold text-[#92400E]">
				<span class="text-2xl">💡</span>
				How it works
			</div>
			<ul class="space-y-3 text-left text-[#78350F]">
				<li class="flex items-start gap-3">
					<span class="font-bold text-[#D97706]">→</span>
					<span>Click "Create a Session" to generate a unique room code</span>
				</li>
				<li class="flex items-start gap-3">
					<span class="font-bold text-[#D97706]">→</span>
					<span>Share the room code with players so they can join</span>
				</li>
				<li class="flex items-start gap-3">
					<span class="font-bold text-[#D97706]">→</span>
					<span>Wait in the lobby until all players are ready</span>
				</li>
				<li class="flex items-start gap-3">
					<span class="font-bold text-[#D97706]">→</span>
					<span>Start the game when everyone is in!</span>
				</li>
			</ul>
		</div>
	</main>
</div>
