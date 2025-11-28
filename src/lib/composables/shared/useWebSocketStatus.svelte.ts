/**
 * WebSocket Status Composable
 * Manages WebSocket connection status with test override support
 */

export interface WebSocketStatusResult {
	/** Whether WebSocket is connected */
	connected: boolean;
	/** Error message if disconnected */
	error: string | null;
	/** Set test override values (for E2E testing) */
	setTestStatus: (connected: boolean, error?: string) => void;
	/** Clear test overrides and use real WebSocket status */
	clearTestStatus: () => void;
	/** Whether test mode is active */
	isTestMode: boolean;
}

export interface WebSocketStatusInput {
	/** Real connected status from WebSocket store */
	connected: boolean;
	/** Real error from WebSocket store */
	error: string | null;
}

/**
 * Create WebSocket status manager with test override support
 *
 * @param getStoreStatus Function that returns current WebSocket store status
 * @returns WebSocket status manager
 */
export function useWebSocketStatus(
	getStoreStatus: () => WebSocketStatusInput
): WebSocketStatusResult {
	// Test override state
	let testConnected = $state<boolean | null>(null);
	let testError = $state<string | null>(null);

	// Derive actual status (test values take precedence)
	const isTestMode = $derived(testConnected !== null);

	const connected = $derived.by(() => {
		if (testConnected !== null) {
			return testConnected;
		}
		return getStoreStatus().connected;
	});

	const error = $derived.by(() => {
		if (testError !== null) {
			return testError;
		}
		if (testConnected !== null && !testConnected) {
			return 'Connection lost';
		}
		return getStoreStatus().error;
	});

	function setTestStatus(connectedValue: boolean, errorMsg?: string) {
		testConnected = connectedValue;
		testError = connectedValue ? null : errorMsg || 'Connection lost';
	}

	function clearTestStatus() {
		testConnected = null;
		testError = null;
	}

	return {
		get connected() {
			return connected;
		},
		get error() {
			return error;
		},
		get isTestMode() {
			return isTestMode;
		},
		setTestStatus,
		clearTestStatus
	};
}
