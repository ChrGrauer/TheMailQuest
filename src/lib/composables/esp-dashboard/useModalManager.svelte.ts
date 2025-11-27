/**
 * ESP Dashboard Modal Manager Composable
 * Manages open/close state for all ESP dashboard modals
 */

export interface ModalManagerState {
	/** Whether the client marketplace modal is open */
	showMarketplace: boolean;
	/** Whether the technical shop modal is open */
	showTechShop: boolean;
	/** Whether the client management modal is open */
	showClientManagement: boolean;
}

export interface ModalManagerResult {
	/** Current modal states */
	showMarketplace: boolean;
	showTechShop: boolean;
	showClientManagement: boolean;
	/** Open marketplace modal */
	openMarketplace: () => void;
	/** Close marketplace modal */
	closeMarketplace: () => void;
	/** Open tech shop modal */
	openTechShop: () => void;
	/** Close tech shop modal */
	closeTechShop: () => void;
	/** Open client management modal */
	openClientManagement: () => void;
	/** Close client management modal */
	closeClientManagement: () => void;
	/** Close all modals */
	closeAll: () => void;
}

/**
 * Create a modal manager for ESP dashboard
 *
 * @returns Modal manager with state and controls
 */
export function useModalManager(): ModalManagerResult {
	let showMarketplace = $state(false);
	let showTechShop = $state(false);
	let showClientManagement = $state(false);

	return {
		get showMarketplace() {
			return showMarketplace;
		},
		set showMarketplace(value: boolean) {
			showMarketplace = value;
		},
		get showTechShop() {
			return showTechShop;
		},
		set showTechShop(value: boolean) {
			showTechShop = value;
		},
		get showClientManagement() {
			return showClientManagement;
		},
		set showClientManagement(value: boolean) {
			showClientManagement = value;
		},
		openMarketplace: () => (showMarketplace = true),
		closeMarketplace: () => (showMarketplace = false),
		openTechShop: () => (showTechShop = true),
		closeTechShop: () => (showTechShop = false),
		openClientManagement: () => (showClientManagement = true),
		closeClientManagement: () => (showClientManagement = false),
		closeAll: () => {
			showMarketplace = false;
			showTechShop = false;
			showClientManagement = false;
		}
	};
}
