/**
 * Destination Dashboard Modal Manager Composable
 * Manages open/close state for all destination dashboard modals
 */

export interface DestinationModalManagerResult {
	/** Whether the tech shop modal is open */
	showTechShop: boolean;
	/** Whether the filtering controls modal is open */
	showFilteringControls: boolean;
	/** Open tech shop modal */
	openTechShop: () => void;
	/** Close tech shop modal */
	closeTechShop: () => void;
	/** Open filtering controls modal */
	openFilteringControls: () => void;
	/** Close filtering controls modal */
	closeFilteringControls: () => void;
	/** Close all modals */
	closeAll: () => void;
}

/**
 * Create a modal manager for destination dashboard
 *
 * @returns Modal manager with state and controls
 */
export function useDestinationModals(): DestinationModalManagerResult {
	let showTechShop = $state(false);
	let showFilteringControls = $state(false);

	return {
		get showTechShop() {
			return showTechShop;
		},
		set showTechShop(value: boolean) {
			showTechShop = value;
		},
		get showFilteringControls() {
			return showFilteringControls;
		},
		set showFilteringControls(value: boolean) {
			showFilteringControls = value;
		},
		openTechShop: () => (showTechShop = true),
		closeTechShop: () => (showTechShop = false),
		openFilteringControls: () => (showFilteringControls = true),
		closeFilteringControls: () => (showFilteringControls = false),
		closeAll: () => {
			showTechShop = false;
			showFilteringControls = false;
		}
	};
}
