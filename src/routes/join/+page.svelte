<script lang="ts">
	import { fly } from 'svelte/transition';
	import { goto } from '$app/navigation';

	let roomCode = '';
	let error = '';
	let isLoading = false;

	async function handleSubmit(event: Event) {
		event.preventDefault();
		error = '';
		isLoading = true;

		try {
			// Validate room code format
			const trimmedCode = roomCode.trim().toUpperCase();

			if (trimmedCode.length !== 6) {
				error = 'Room code must be 6 characters';
				isLoading = false;
				return;
			}

			if (!/^[A-Z0-9]{6}$/.test(trimmedCode)) {
				error = 'Room code must be 6 characters';
				isLoading = false;
				return;
			}

			// Validate room exists
			const response = await fetch(`/api/sessions/${trimmedCode}`);

			if (!response.ok) {
				if (response.status === 404) {
					error = 'Room not found. Please check the code.';
				} else {
					error = 'An error occurred. Please try again.';
				}
				isLoading = false;
				return;
			}

			// Redirect to lobby
			goto(`/lobby/${trimmedCode}`);
		} catch (err) {
			error = 'An error occurred. Please try again.';
			isLoading = false;
		}
	}

	function formatRoomCode(value: string) {
		// Auto-uppercase, remove non-alphanumeric characters, and limit to 6 characters
		roomCode = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
	}
</script>

<svelte:head>
	<title>Join Game - The Mail Quest</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-[#f8faf9] to-[#e8f5f0] flex items-center justify-center p-4">
	<div class="max-w-md w-full">
		<!-- Back Button -->
		<div class="mb-6" in:fly={{ x: -20, duration: 400 }}>
			<a
				href="/"
				class="inline-flex items-center text-[#0B5540] hover:text-[#10B981] transition-colors"
			>
				<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
				</svg>
				<span class="font-medium">Back to home</span>
			</a>
		</div>

		<!-- Main Card -->
		<div
			class="bg-white rounded-2xl p-8 shadow-2xl border-2 border-[#D1FAE5]"
			in:fly={{ y: 20, duration: 600, delay: 100 }}
		>
			<!-- Header -->
			<div class="text-center mb-8">
				<div class="text-5xl mb-4">🚀</div>
				<h1 class="text-3xl font-bold text-[#0B5540] mb-2">
					Join a Game
				</h1>
				<p class="text-[#0B5540]/70">
					Enter the 6-character room code to join
				</p>
			</div>

			<!-- Form -->
			<form on:submit={handleSubmit}>
				<div class="mb-6">
					<label for="roomCode" class="block text-sm font-semibold text-[#0B5540] mb-2">
						Room Code
					</label>
					<input
						type="text"
						id="roomCode"
						name="roomCode"
						bind:value={roomCode}
						on:input={(e) => formatRoomCode(e.currentTarget.value)}
						placeholder="ABC123"
						class="w-full px-4 py-4 text-2xl font-mono text-center tracking-widest rounded-xl border-2 border-[#D1FAE5] focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 transition-all uppercase"
						disabled={isLoading}
						required
						maxlength="6"
						autocomplete="off"
						spellcheck="false"
					/>
					<p class="mt-2 text-xs text-[#0B5540]/60 text-center">
						Ask the facilitator for the room code
					</p>
				</div>

				<!-- Error Message -->
				{#if error}
					<div
						role="alert"
						class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
						in:fly={{ y: -10, duration: 300 }}
					>
						<div class="flex items-start">
							<svg class="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
							</svg>
							<span>{error}</span>
						</div>
					</div>
				{/if}

				<!-- Submit Button -->
				<button
					type="submit"
					disabled={isLoading}
					class="w-full bg-[#10B981] hover:bg-[#0B5540] text-white font-semibold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#10B981] shadow-lg hover:shadow-xl"
				>
					{#if isLoading}
						<span class="flex items-center justify-center">
							<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Joining...
						</span>
					{:else}
						Join Game
					{/if}
				</button>
			</form>

			<!-- Help Text -->
			<div class="mt-6 text-center text-sm text-[#0B5540]/60">
				<p>Don't have a room code?</p>
				<a href="/create" class="text-[#10B981] hover:text-[#0B5540] font-medium transition-colors">
					Create a new game as facilitator
				</a>
			</div>
		</div>
	</div>
</div>
