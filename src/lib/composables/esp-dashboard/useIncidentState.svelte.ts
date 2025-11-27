/**
 * ESP Dashboard Incident State Composable
 * Manages incident card display and choice modal state
 */

import type { IncidentCard, IncidentChoiceOption } from '$lib/types/incident';

export interface IncidentStateResult {
	/** Whether to show the incident card display */
	showIncidentCard: boolean;
	/** Current incident being displayed */
	currentIncident: IncidentCard | null;
	/** Whether to show the choice modal */
	showChoiceModal: boolean;
	/** Incident ID for the choice */
	choiceIncidentId: string;
	/** Incident name for the choice */
	choiceIncidentName: string;
	/** Choice description */
	choiceDescription: string;
	/** Educational note for the choice */
	choiceEducationalNote: string;
	/** Incident category */
	choiceCategory: string;
	/** Available choice options */
	choiceOptions: IncidentChoiceOption[];
	/** Whether choice has been confirmed */
	choiceConfirmed: boolean;
	/** Show an incident card */
	showIncident: (incident: IncidentCard) => void;
	/** Hide incident card */
	hideIncident: () => void;
	/** Show choice modal with options */
	showChoice: (data: IncidentChoiceData) => void;
	/** Hide choice modal */
	hideChoice: () => void;
	/** Mark choice as confirmed */
	confirmChoice: () => void;
	/** Reset all incident state */
	reset: () => void;
}

export interface IncidentChoiceData {
	incidentId: string;
	incidentName: string;
	description: string;
	educationalNote: string;
	category: string;
	options: IncidentChoiceOption[];
}

/**
 * Create incident state manager for ESP dashboard
 *
 * @returns Incident state manager
 */
export function useIncidentState(): IncidentStateResult {
	// Incident card display state
	let showIncidentCard = $state(false);
	let currentIncident = $state<IncidentCard | null>(null);

	// Choice modal state
	let showChoiceModal = $state(false);
	let choiceIncidentId = $state('');
	let choiceIncidentName = $state('');
	let choiceDescription = $state('');
	let choiceEducationalNote = $state('');
	let choiceCategory = $state('');
	let choiceOptions = $state<IncidentChoiceOption[]>([]);
	let choiceConfirmed = $state(false);

	function showIncident(incident: IncidentCard) {
		currentIncident = incident;
		showIncidentCard = true;
	}

	function hideIncident() {
		showIncidentCard = false;
		currentIncident = null;
	}

	function showChoice(data: IncidentChoiceData) {
		choiceIncidentId = data.incidentId;
		choiceIncidentName = data.incidentName;
		choiceDescription = data.description;
		choiceEducationalNote = data.educationalNote;
		choiceCategory = data.category;
		choiceOptions = data.options;
		choiceConfirmed = false;
		showChoiceModal = true;
	}

	function hideChoice() {
		showChoiceModal = false;
	}

	function confirmChoice() {
		choiceConfirmed = true;
	}

	function reset() {
		showIncidentCard = false;
		currentIncident = null;
		showChoiceModal = false;
		choiceIncidentId = '';
		choiceIncidentName = '';
		choiceDescription = '';
		choiceEducationalNote = '';
		choiceCategory = '';
		choiceOptions = [];
		choiceConfirmed = false;
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
		get showChoiceModal() {
			return showChoiceModal;
		},
		set showChoiceModal(value: boolean) {
			showChoiceModal = value;
		},
		get choiceIncidentId() {
			return choiceIncidentId;
		},
		get choiceIncidentName() {
			return choiceIncidentName;
		},
		get choiceDescription() {
			return choiceDescription;
		},
		get choiceEducationalNote() {
			return choiceEducationalNote;
		},
		get choiceCategory() {
			return choiceCategory;
		},
		get choiceOptions() {
			return choiceOptions;
		},
		get choiceConfirmed() {
			return choiceConfirmed;
		},
		set choiceConfirmed(value: boolean) {
			choiceConfirmed = value;
		},
		showIncident,
		hideIncident,
		showChoice,
		hideChoice,
		confirmChoice,
		reset
	};
}
