/**
 * Shared Composables
 *
 * Re-exports all shared composables and utilities.
 */

export {
	calculateOverallReputation,
	type Destination
} from './useReputationCalculator';

export {
	useGameState,
	type GamePhase,
	type GameStateResult,
	type GameStateConfig
} from './useGameState.svelte';

export {
	useWebSocketStatus,
	type WebSocketStatusResult,
	type WebSocketStatusInput
} from './useWebSocketStatus.svelte';

export {
	formatTimerDisplay,
	getTimerUrgency,
	getTimerColorClass
} from './useTimerDisplay';

export {
	useLockInState,
	type LockInStateResult
} from './useLockInState.svelte';
