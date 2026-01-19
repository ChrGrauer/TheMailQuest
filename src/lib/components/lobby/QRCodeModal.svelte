<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';

	interface Props {
		show?: boolean;
		roomCode: string;
		onClose?: () => void;
	}

	let { show = false, roomCode, onClose }: Props = $props();

	let qrCodeDataUrl = $state<string>('');
	let modalElement: HTMLDivElement | null = $state(null);
	let closeButtonElement: HTMLButtonElement | null = $state(null);

	// Generate the lobby URL dynamically
	const lobbyUrl = $derived(browser ? `${window.location.origin}/lobby/${roomCode}` : '');

	// Generate QR code when modal is shown or lobby URL changes
	$effect(() => {
		if (show && lobbyUrl) {
			generateQRCode();
		}
	});

	async function generateQRCode() {
		try {
			// Generate QR code as data URL
			qrCodeDataUrl = await QRCode.toDataURL(lobbyUrl, {
				width: 300,
				margin: 2,
				color: {
					dark: '#0B5540',
					light: '#FFFFFF'
				}
			});

			// Expose encoded URL for E2E testing
			if (browser && typeof window !== 'undefined') {
				(window as any).__qrCodeTest = {
					encodedUrl: lobbyUrl
				};
			}
		} catch (error) {
			console.error('Failed to generate QR code:', error);
		}
	}

	// Focus management
	$effect(() => {
		if (show && closeButtonElement) {
			closeButtonElement.focus();
		}
	});

	function handleClose() {
		onClose?.();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleClose();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		// Close only if clicking the backdrop, not the modal content
		if (event.target === modalElement) {
			handleClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show}
	<!-- Modal Backdrop -->
	<div
		bind:this={modalElement}
		onclick={handleBackdropClick}
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		tabindex="-1"
	>
		<!-- Modal Content -->
		<div
			data-testid="qr-code-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="qr-modal-title"
			class="relative max-w-md w-full bg-white rounded-2xl shadow-2xl p-8"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Close Button -->
			<button
				bind:this={closeButtonElement}
				data-testid="close-qr-modal"
				onclick={handleClose}
				aria-label="Close QR code modal"
				class="absolute top-4 right-4 text-[#0B5540]/60 hover:text-[#0B5540] transition-colors focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:ring-offset-2 rounded-lg p-2"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					></path>
				</svg>
			</button>

			<!-- Modal Header -->
			<div class="text-center mb-6">
				<div class="text-4xl mb-3">📱</div>
				<h2 id="qr-modal-title" class="text-2xl font-bold text-[#0B5540] mb-2">Scan to Join</h2>
				<p class="text-[#0B5540]/70 text-sm">
					Mobile users can scan this QR code to join the lobby
				</p>
			</div>

			<!-- QR Code Display -->
			<div class="bg-gradient-to-br from-[#f8faf9] to-[#e8f5f0] rounded-xl p-6 mb-4">
				{#if qrCodeDataUrl}
					<div class="flex justify-center">
						<img
							data-testid="qr-code-image"
							src={qrCodeDataUrl}
							alt="QR code to join lobby {roomCode}"
							class="rounded-lg shadow-md"
						/>
					</div>
				{:else}
					<div class="flex justify-center items-center h-[300px]">
						<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10B981]"></div>
					</div>
				{/if}
			</div>

			<!-- Room Code Reference -->
			<div class="text-center mb-4">
				<p class="text-sm text-[#0B5540]/60 mb-1">Room Code:</p>
				<p class="text-2xl font-bold font-mono tracking-wider text-[#10B981]">{roomCode}</p>
			</div>

			<!-- Instructions -->
			<div class="bg-[#D1FAE5]/30 border border-[#D1FAE5] rounded-lg p-4 text-sm text-[#0B5540]">
				<p class="font-medium mb-2">📸 How to use:</p>
				<ol class="list-decimal list-inside space-y-1 text-[#0B5540]/80">
					<li>Open your mobile camera app</li>
					<li>Point it at the QR code</li>
					<li>Tap the notification to join</li>
				</ol>
			</div>
		</div>
	</div>
{/if}
