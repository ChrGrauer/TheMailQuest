/**
 * ESP Dashboard Composables
 *
 * Re-exports all ESP dashboard composables for easy importing.
 */

export {
	useBudgetCalculations,
	type BudgetCalculationsInput,
	type BudgetCalculationsResult
} from './useBudgetCalculations.svelte';

export {
	useModalManager,
	type ModalManagerState,
	type ModalManagerResult
} from './useModalManager.svelte';

// Re-export from shared for backwards compatibility
export { useLockInState, type LockInStateResult } from '$lib/composables/shared';

export {
	useIncidentState,
	type IncidentStateResult,
	type IncidentChoiceData
} from './useIncidentState.svelte';
