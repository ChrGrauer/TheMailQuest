/**
 * Destination Dashboard Incident State Composable
 * Manages incident card display for destination dashboard
 * (Simpler than ESP - destinations don't have choice modals)
 */

import type { IncidentCard } from '$lib/types/incident';

export interface DestinationIncidentResult {
	/** Whether to show the incident card display */
	showIncidentCard: boolean;
	/** Current incident being displayed */
	currentIncident: IncidentCard | null;
	/** Show an incident card */
	showIncident: (incident: IncidentCard) => void;
	/** Hide incident card */
	hideIncident: () => void;
	/** Reset incident state */
	reset: () => void;
}

/**
 * Create incident state manager for destination dashboard
 *
 * @returns Incident state manager
 */
export function useDestinationIncident(): DestinationIncidentResult {
	let showIncidentCard = $state(false);
	let currentIncident = $state<IncidentCard | null>(null);

	function showIncident(incident: IncidentCard) {
		currentIncident = incident;
		showIncidentCard = true;
	}

	function hideIncident() {
		showIncidentCard = false;
		currentIncident = null;
	}

	function reset() {
		showIncidentCard = false;
		currentIncident = null;
	}

	return {
		get showIncidentCard() {
			return showIncidentCard;
		},
		set showIncidentCard(value: boolean) {
			showIncidentCard = value;
		},
		get currentIncident() {
			return currentIncident;
		},
		set currentIncident(value: IncidentCard | null) {
			currentIncident = value;
		},
		showIncident,
		hideIncident,
		reset
	};
}
