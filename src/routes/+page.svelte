<script lang="ts">
	import { fly, scale } from 'svelte/transition';
</script>

<svelte:head>
	<title>The Mail Quest - Deliver Emails, Win the Game</title>
</svelte:head>

<div
	class="min-h-screen bg-gradient-to-br from-[#f8faf9] to-[#e8f5f0] flex items-center justify-center p-4"
>
	<div class="max-w-4xl w-full">
		<!-- Hero Section -->
		<div class="text-center mb-12" in:fly={{ y: -30, duration: 600 }}>
			<h1 class="text-5xl md:text-6xl font-bold text-[#0B5540] mb-4">The Mail Quest</h1>
			<p class="text-xl md:text-2xl text-[#0B5540]/80 mb-2">
				Compete as ESP teams to deliver emails to destinations
			</p>
			<p class="text-base md:text-lg text-[#0B5540]/60">Strategy. Speed. Success.</p>
		</div>

		<!-- Main Call to Action -->
		<div class="mb-6" in:fly={{ y: 20, duration: 600, delay: 100 }}>
			<a
				href="/join"
				class="group relative bg-[#10B981] hover:bg-[#0B5540] rounded-2xl p-10 shadow-2xl hover:shadow-3xl transition-all duration-300 border-2 border-[#10B981] hover:border-[#0B5540] block text-center"
			>
				<div class="text-5xl mb-4 group-hover:scale-110 transition-transform">🚀</div>
				<h2 class="text-3xl font-bold text-white mb-3">Join a game</h2>
				<p class="text-white/90 text-lg mb-4">
					Enter a room code to join an existing game and select your role
				</p>
				<div
					class="flex items-center justify-center text-white font-semibold text-lg group-hover:translate-x-2 transition-transform"
				>
					<span>Start playing now</span>
					<svg class="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"
						></path>
					</svg>
				</div>
			</a>
		</div>

		<!-- Secondary Action -->
		<div class="mb-8" in:fly={{ y: 20, duration: 600, delay: 150 }}>
			<a
				href="/create"
				class="group relative bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border border-[#D1FAE5] hover:border-[#10B981] block text-center"
			>
				<div class="flex items-center justify-center gap-3">
					<span class="text-2xl">🎮</span>
					<div class="text-left">
						<h3 class="text-lg font-semibold text-[#0B5540]">I'm a facilitator</h3>
						<p class="text-sm text-[#0B5540]/70">Create a new game session</p>
					</div>
					<svg
						class="w-5 h-5 ml-auto text-[#10B981] group-hover:translate-x-2 transition-transform"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"
						></path>
					</svg>
				</div>
			</a>
		</div>

		<!-- How to Play Section -->
		<div
			class="bg-white/60 backdrop-blur rounded-2xl p-6 border border-[#D1FAE5]"
			in:scale={{ duration: 600, delay: 200 }}
		>
			<h3 class="text-lg font-semibold text-[#0B5540] mb-3 text-center">How to Play</h3>
			<div class="grid md:grid-cols-3 gap-4 text-sm text-[#0B5540]/70">
				<div class="text-center">
					<div class="text-2xl mb-2">📧</div>
					<p>
						<strong>ESP Teams:</strong> Five email service providers compete to deliver emails efficiently
					</p>
				</div>
				<div class="text-center">
					<div class="text-2xl mb-2">📮</div>
					<p>
						<strong>Destinations:</strong> Three email destinations (Gmail, Outlook, Yahoo) receive emails
					</p>
				</div>
				<div class="text-center">
					<div class="text-2xl mb-2">🏆</div>
					<p>
						<strong>Win:</strong> Manage resources, build your stack, and deliver emails to win the game
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
