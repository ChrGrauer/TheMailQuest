/**
 * Lock-In State Composable
 * US-3.2: Decision Lock-In
 *
 * Manages lock-in state and related messaging for both ESP and Destination dashboards:
 * - Lock-in status and timestamp
 * - Remaining players count
 * - Auto-lock messages
 * - Phase transition messages
 */

export interface LockInStateResult {
	/** Whether this player has locked in */
	isLockedIn: boolean;
	/** Timestamp when locked in */
	lockedInAt: Date | null;
	/** Number of players yet to lock in */
	remainingPlayers: number;
	/** Auto-lock warning or correction message */
	autoLockMessage: string | null;
	/** Phase transition notification message */
	phaseTransitionMessage: string | null;
	/** Set lock-in status */
	setLockedIn: (locked: boolean, timestamp?: Date) => void;
	/** Update remaining players count */
	setRemainingPlayers: (count: number) => void;
	/** Set auto-lock message */
	setAutoLockMessage: (msg: string | null) => void;
	/** Show phase transition message (auto-clears after timeout) */
	showPhaseTransition: (msg: string, timeoutMs?: number) => void;
	/** Clear phase transition message */
	clearPhaseTransition: () => void;
	/** Reset lock-in state (for new round) */
	resetLockIn: () => void;
}

/**
 * Create lock-in state manager
 *
 * @returns Lock-in state manager
 */
export function useLockInState(): LockInStateResult {
	let isLockedIn = $state(false);
	let lockedInAt = $state<Date | null>(null);
	let remainingPlayers = $state(0);
	let autoLockMessage = $state<string | null>(null);
	let phaseTransitionMessage = $state<string | null>(null);

	let transitionTimeout: ReturnType<typeof setTimeout> | null = null;

	function setLockedIn(locked: boolean, timestamp?: Date) {
		isLockedIn = locked;
		lockedInAt = locked ? (timestamp || new Date()) : null;
	}

	function setRemainingPlayers(count: number) {
		remainingPlayers = count;
	}

	function setAutoLockMessage(msg: string | null) {
		autoLockMessage = msg;
	}

	function showPhaseTransition(msg: string, timeoutMs: number = 5000) {
		phaseTransitionMessage = msg;

		// Clear previous timeout if any
		if (transitionTimeout) {
			clearTimeout(transitionTimeout);
		}

		// Auto-clear after timeout
		transitionTimeout = setTimeout(() => {
			phaseTransitionMessage = null;
			transitionTimeout = null;
		}, timeoutMs);
	}

	function clearPhaseTransition() {
		if (transitionTimeout) {
			clearTimeout(transitionTimeout);
			transitionTimeout = null;
		}
		phaseTransitionMessage = null;
	}

	function resetLockIn() {
		isLockedIn = false;
		lockedInAt = null;
		remainingPlayers = 0;
		// Only clear autoLockMessage if it's not a correction/completion message
		if (
			autoLockMessage &&
			!autoLockMessage.includes('removed') &&
			!autoLockMessage.includes("Time's up")
		) {
			autoLockMessage = null;
		}
	}

	return {
		get isLockedIn() {
			return isLockedIn;
		},
		set isLockedIn(value: boolean) {
			isLockedIn = value;
		},
		get lockedInAt() {
			return lockedInAt;
		},
		set lockedInAt(value: Date | null) {
			lockedInAt = value;
		},
		get remainingPlayers() {
			return remainingPlayers;
		},
		set remainingPlayers(value: number) {
			remainingPlayers = value;
		},
		get autoLockMessage() {
			return autoLockMessage;
		},
		set autoLockMessage(value: string | null) {
			autoLockMessage = value;
		},
		get phaseTransitionMessage() {
			return phaseTransitionMessage;
		},
		setLockedIn,
		setRemainingPlayers,
		setAutoLockMessage,
		showPhaseTransition,
		clearPhaseTransition,
		resetLockIn
	};
}
