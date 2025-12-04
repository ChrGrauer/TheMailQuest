/**
 * ESP Dashboard Incident State Composable
 * Manages incident card display and choice modal state
 *
 * Phase 5 Update: Supports multiple concurrent choices (queued display)
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
	/** Number of pending choices in queue */
	pendingChoiceCount: number;
	/** Show an incident card */
	showIncident: (incident: IncidentCard) => void;
	/** Hide incident card */
	hideIncident: () => void;
	/** Show choice modal with options (queues if modal already showing) */
	showChoice: (data: IncidentChoiceData) => void;
	/** Hide choice modal */
	hideChoice: () => void;
	/** Mark choice as confirmed and show next queued choice if any */
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

	// Queue for multiple concurrent choices
	let pendingChoices = $state<IncidentChoiceData[]>([]);

	function showIncident(incident: IncidentCard) {
		currentIncident = incident;
		showIncidentCard = true;
	}

	function hideIncident() {
		showIncidentCard = false;
		currentIncident = null;
	}

	function displayChoice(data: IncidentChoiceData) {
		choiceIncidentId = data.incidentId;
		choiceIncidentName = data.incidentName;
		choiceDescription = data.description;
		choiceEducationalNote = data.educationalNote;
		choiceCategory = data.category;
		choiceOptions = data.options;
		choiceConfirmed = false;
		showChoiceModal = true;
	}

	function showChoice(data: IncidentChoiceData) {
		// Check if this incident is already in queue or currently displayed
		const alreadyQueued = pendingChoices.some((c) => c.incidentId === data.incidentId);
		const currentlyDisplayed = showChoiceModal && choiceIncidentId === data.incidentId;

		if (alreadyQueued || currentlyDisplayed) {
			return; // Don't add duplicates
		}

		if (showChoiceModal) {
			// Modal already showing, queue this choice
			pendingChoices = [...pendingChoices, data];
		} else {
			// No modal showing, display immediately
			displayChoice(data);
		}
	}

	function hideChoice() {
		showChoiceModal = false;
	}

	function confirmChoice() {
		choiceConfirmed = true;

		// After a brief delay (for UI feedback), check for next queued choice
		setTimeout(() => {
			showChoiceModal = false;

			// If there are more choices in queue, show the next one
			if (pendingChoices.length > 0) {
				const nextChoice = pendingChoices[0];
				pendingChoices = pendingChoices.slice(1);
				displayChoice(nextChoice);
			}
		}, 500);
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
		pendingChoices = [];
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
		get pendingChoiceCount() {
			return pendingChoices.length;
		},
		showIncident,
		hideIncident,
		showChoice,
		hideChoice,
		confirmChoice,
		reset
	};
}
