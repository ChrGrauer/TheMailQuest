/**
 * Game State Composable
 * Shared state management for game round, phase, and timer
 */

export type GamePhase = 'planning' | 'resolution' | 'consequences' | 'finished';

export interface GameStateResult {
	/** Current round number (1-indexed) */
	currentRound: number;
	/** Total number of rounds in the game */
	totalRounds: number;
	/** Current game phase */
	currentPhase: GamePhase | string;
	/** Remaining seconds on the timer */
	timerSeconds: number;
	/** Whether the timer is paused (US-8.2-0.1) */
	isPaused: boolean;
	/** Whether we're in planning phase */
	isPlanning: boolean;
	/** Whether we're in resolution phase */
	isResolution: boolean;
	/** Whether we're in consequences phase */
	isConsequences: boolean;
	/** Whether the game is finished */
	isFinished: boolean;
	/** Update round number */
	setRound: (round: number) => void;
	/** Update phase */
	setPhase: (phase: GamePhase | string) => void;
	/** Update timer */
	setTimer: (seconds: number) => void;
	/** Decrement timer by 1 second */
	tick: () => void;
}

export interface GameStateConfig {
	/** Initial round (default: 1) */
	initialRound?: number;
	/** Total rounds (default: 4) */
	totalRounds?: number;
	/** Initial phase (default: 'planning') */
	initialPhase?: GamePhase | string;
	/** Initial timer seconds (default: 300) */
	initialTimer?: number;
}

/**
 * Create game state manager
 *
 * @param config Initial configuration
 * @returns Game state manager
 */
export function useGameState(config: GameStateConfig = {}): GameStateResult {
	const {
		initialRound = 1,
		totalRounds: configTotalRounds = 4,
		initialPhase = 'planning',
		initialTimer = 300
	} = config;

	let currentRound = $state(initialRound);
	let totalRounds = $state(configTotalRounds);
	let currentPhase = $state<GamePhase | string>(initialPhase);
	let timerSeconds = $state(initialTimer);
	let isPaused = $state(false);

	const isPlanning = $derived(currentPhase === 'planning');
	const isResolution = $derived(currentPhase === 'resolution');
	const isConsequences = $derived(currentPhase === 'consequences');
	const isFinished = $derived(currentPhase === 'finished');

	function setRound(round: number) {
		currentRound = round;
	}

	function setPhase(phase: GamePhase | string) {
		currentPhase = phase;
	}

	function setTimer(seconds: number) {
		timerSeconds = seconds;
	}

	function tick() {
		if (timerSeconds > 0) {
			timerSeconds -= 1;
		}
	}

	return {
		get currentRound() {
			return currentRound;
		},
		set currentRound(value: number) {
			currentRound = value;
		},
		get totalRounds() {
			return totalRounds;
		},
		set totalRounds(value: number) {
			totalRounds = value;
		},
		get currentPhase() {
			return currentPhase;
		},
		set currentPhase(value: GamePhase | string) {
			currentPhase = value;
		},
		get timerSeconds() {
			return timerSeconds;
		},
		set timerSeconds(value: number) {
			timerSeconds = value;
		},
		get isPaused() {
			return isPaused;
		},
		set isPaused(value: boolean) {
			isPaused = value;
		},
		get isPlanning() {
			return isPlanning;
		},
		get isResolution() {
			return isResolution;
		},
		get isConsequences() {
			return isConsequences;
		},
		get isFinished() {
			return isFinished;
		},
		setRound,
		setPhase,
		setTimer,
		tick
	};
}
