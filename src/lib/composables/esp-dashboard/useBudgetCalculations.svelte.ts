/**
 * ESP Dashboard Budget Calculations Composable
 * US-3.2: Decision Lock-In - Budget tracking
 *
 * Manages budget-related derived state:
 * - Total pending onboarding costs
 * - Budget exceeded check
 * - Excess amount calculation
 */

import { calculateOnboardingCost } from '$lib/config/client-onboarding';
import type { OnboardingOptions } from '$lib/server/game/types';

export interface BudgetCalculationsInput {
	credits: number;
	pendingOnboardingDecisions: Record<string, OnboardingOptions>;
}

export interface BudgetCalculationsResult {
	/** Total cost of all pending onboarding options */
	totalPendingCosts: number;
	/** Whether budget is exceeded */
	budgetExceeded: boolean;
	/** Amount over budget (0 if under budget) */
	excessAmount: number;
	/** Number of pending onboarding decisions */
	pendingDecisionsCount: number;
}

/**
 * Calculate budget-related derived values
 *
 * @param input Budget calculation inputs (reactive)
 * @returns Derived budget values
 */
export function useBudgetCalculations(input: () => BudgetCalculationsInput): BudgetCalculationsResult {
	const { credits, pendingOnboardingDecisions } = $derived(input());

	const totalPendingCosts = $derived.by(() => {
		let total = 0;
		for (const clientId in pendingOnboardingDecisions) {
			const options = pendingOnboardingDecisions[clientId];
			total += calculateOnboardingCost(options.warmUp, options.listHygiene);
		}
		return total;
	});

	const pendingDecisionsCount = $derived(Object.keys(pendingOnboardingDecisions).length);
	const budgetExceeded = $derived(totalPendingCosts > credits);
	const excessAmount = $derived(Math.max(0, totalPendingCosts - credits));

	return {
		get totalPendingCosts() {
			return totalPendingCosts;
		},
		get budgetExceeded() {
			return budgetExceeded;
		},
		get excessAmount() {
			return excessAmount;
		},
		get pendingDecisionsCount() {
			return pendingDecisionsCount;
		}
	};
}
