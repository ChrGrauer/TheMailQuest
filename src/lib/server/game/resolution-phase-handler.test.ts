/**
 * Unit Tests for Resolution Phase Handler
 * US-3.5: Iteration 1 - Consequences Phase Display
 *
 * Tests the resolution phase execution and transition to consequences:
 * - Execute resolution calculation
 * - Store results in session history
 * - Apply results to game state
 * - Broadcast ESP dashboard updates
 * - Auto-transition to consequences phase
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleResolutionPhase, type BroadcastFunction } from './resolution-phase-handler';
import type { GameSession } from './types';
import type { ResolutionResults } from './resolution-types';

// Mock the dependencies
vi.mock('./resolution-manager', () => ({
	executeResolution: vi.fn()
}));

vi.mock('./resolution-application-manager', () => ({
	applyResolutionToGameState: vi.fn()
}));

vi.mock('./phase-manager', () => ({
	transitionPhase: vi.fn()
}));

vi.mock('../logger', () => ({
	gameLogger: {
		info: vi.fn(),
		error: vi.fn()
	}
}));

// Import mocked modules
import { executeResolution } from './resolution-manager';
import { applyResolutionToGameState } from './resolution-application-manager';
import { transitionPhase } from './phase-manager';
import { gameLogger } from '../logger';

describe('Resolution Phase Handler', () => {
	let mockSession: GameSession;
	let mockBroadcast: BroadcastFunction;
	let mockResolutionResults: ResolutionResults;

	beforeEach(() => {
		vi.useFakeTimers();

		// Reset all mocks
		vi.clearAllMocks();

		// Create mock session
		mockSession = {
			room_code: 'TEST01',
			current_round: 1,
			current_phase: 'resolution',
			total_rounds: 4,
			created_at: new Date(),
			last_activity: new Date(),
			esp_teams: [
				{
					name: 'SendWave',
					players: ['alice'],
					budget: 1000,
					clients: [],
					technical_stack: [],
					credits: 1000,
					reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 },
					active_clients: [],
					owned_tech_upgrades: [],
					round_history: [],
					available_clients: [],
					client_states: {}
				},
				{
					name: 'MailMonkey',
					players: ['bob'],
					budget: 1000,
					clients: [],
					technical_stack: [],
					credits: 1200,
					reputation: { Gmail: 75, Outlook: 72, Yahoo: 68 },
					active_clients: [],
					owned_tech_upgrades: [],
					round_history: [],
					available_clients: [],
					client_states: {}
				}
			],
			destinations: [
				{
					name: 'Gmail',
					kingdom: 'Inbox',
					players: [],
					budget: 500,
					owned_tools: ['content_analysis_filter'],
					esp_metrics: { SendWave: { user_satisfaction: 80, spam_level: 5 } }
				},
				{
					name: 'Outlook',
					kingdom: 'Inbox',
					players: [],
					budget: 500,
					owned_tools: [],
					esp_metrics: {}
				},
				{
					name: 'Yahoo',
					kingdom: 'Inbox',
					players: [],
					budget: 500,
					owned_tools: [],
					esp_metrics: {}
				}
			],
			lock_in_status: {},
			timer_settings: { planning_duration: 300, resolution_duration: 60, consequences_duration: 60 }
		} as unknown as GameSession;

		// Create mock broadcast function
		mockBroadcast = vi.fn();

		// Create mock resolution results
		mockResolutionResults = {
			espResults: {
				SendWave: {
					teamName: 'SendWave',
					totalRevenue: 500,
					totalVolume: 10000,
					reputationChanges: { Gmail: 2, Outlook: 1, Yahoo: 0 },
					clientResults: []
				},
				MailMonkey: {
					teamName: 'MailMonkey',
					totalRevenue: 600,
					totalVolume: 12000,
					reputationChanges: { Gmail: 1, Outlook: 2, Yahoo: 1 },
					clientResults: []
				}
			}
		} as unknown as ResolutionResults;

		// Set up default mock implementations
		vi.mocked(executeResolution).mockResolvedValue(mockResolutionResults);
		vi.mocked(applyResolutionToGameState).mockReturnValue({
			success: true,
			updatedTeams: ['SendWave', 'MailMonkey']
		});
		vi.mocked(transitionPhase).mockResolvedValue({ success: true });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// ============================================================================
	// TEST SUITE: Resolution Execution
	// ============================================================================

	describe('Resolution execution', () => {
		it('should execute resolution calculation for current round', async () => {
			handleResolutionPhase(mockSession, 'TEST01', mockBroadcast);

			// Allow async IIFE to execute
			await vi.runAllTimersAsync();

			expect(executeResolution).toHaveBeenCalledWith(mockSession, 'TEST01');
			expect(executeResolution).toHaveBeenCalledTimes(1);
		});

		it('should store results in session.resolution_history', async () => {
			handleResolutionPhase(mockSession, 'TEST01', mockBroadcast);

			await vi.runAllTimersAsync();

			expect(mockSession.resolution_history).toBeDefined();
			expect(mockSession.resolution_history).toHaveLength(1);
			expect(mockSession.resolution_history![0].round).toBe(1);
			expect(mockSession.resolution_history![0].results).toBe(mockResolutionResults);
			expect(mockSession.resolution_history![0].timestamp).toBeInstanceOf(Date);
		});

		it('should initialize resolution_history array if undefined', async () => {
			delete mockSession.resolution_history;

			handleResolutionPhase(mockSession, 'TEST01', mockBroadcast);

			await vi.runAllTimersAsync();

			expect(mockSession.resolution_history).toBeDefined();
			expect(Array.isArray(mockSession.resolution_history)).toBe(true);
		});

		it('should append to existing resolution_history', async () => {
			mockSession.resolution_history = [
				{ round: 0, results: {} as ResolutionResults, timestamp: new Date() }
			];

			handleResolutionPhase(mockSession, 'TEST01', mockBroadcast);

			await vi.runAllTimersAsync();

			expect(mockSession.resolution_history).toHaveLength(2);
		});

		it('should log resolution completion with team count', async () => {
			handleResolutionPhase(mockSession, 'TEST01', mockBroadcast);

			await vi.runAllTimersAsync();

			expect(gameLogger.info).toHaveBeenCalledWith(
				'Resolution calculation completed and stored in history',
				expect.objectContaining({
					roomCode: 'TEST01',
					round: 1,
					espTeamsProcessed: 2
				})
			);
		});
	});

	// ============================================================================
	// TEST SUITE: State Application
	// ============================================================================

	describe('State application', () => {
		it('should apply resolution results to game state', async () => {
			handleResolutionPhase(mockSession, 'TEST01', mockBroadcast);

			await vi.runAllTimersAsync();

			expect(applyResolutionToGameState).toHaveBeenCalledWith(mockSession, mockResolutionResults);
		});

		it('should log successful application with updated teams', async () => {
			handleResolutionPhase(mockSession, 'TEST01', mockBroadcast);

			await vi.runAllTimersAsync();

			expect(gameLogger.info).toHaveBeenCalledWith(
				'Resolution results applied to game state',
				expect.objectContaining({
					roomCode: 'TEST01',
					teamsUpdated: 2,
					teams: ['SendWave', 'MailMonkey']
				})
			);
		});

		it('should continue to consequences even if application fails', async () => {
			vi.mocked(applyResolutionToGameState).mockReturnValue({
				success: false,
				error: 'Application failed'
			});

			handleResolutionPhase(mockSession, 'TEST01', mockBroadcast);

			await vi.runAllTimersAsync();

			// Should still transition to consequences
			expect(transitionPhase).toHaveBeenCalledWith({
				roomCode: 'TEST01',
				toPhase: 'consequences'
			});
		});

		it('should log application failure but not throw', async () => {
			vi.mocked(applyResolutionToGameState).mockReturnValue({
				success: false,
				error: 'Application failed'
			});

			handleResolutionPhase(mockSession, 'TEST01', mockBroadcast);

			await vi.runAllTimersAsync();

			expect(gameLogger.error).toHaveBeenCalledWith(
				expect.any(Error),
				expect.objectContaining({
					context: 'handleResolutionPhase',
					roomCode: 'TEST01',
					error: 'Application failed'
				})
			);
		});
	});

	// ============================================================================
	// TEST SUITE: Broadcasting
	// ============================================================================

	describe('Broadcasting', () => {
		it('should broadcast esp_dashboard_update for each ESP team', async () => {
			handleResolutionPhase(mockSession, 'TEST01', mockBroadcast);

			await vi.runAllTimersAsync();

			// Should broadcast for SendWave
			expect(mockBroadcast).toHaveBeenCalledWith('TEST01', {
				type: 'esp_dashboard_update',
				teamName: 'SendWave',
				credits: 1000,
				reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 }
			});

			// Should broadcast for MailMonkey
			expect(mockBroadcast).toHaveBeenCalledWith('TEST01', {
				type: 'esp_dashboard_update',
				teamName: 'MailMonkey',
				credits: 1200,
				reputation: { Gmail: 75, Outlook: 72, Yahoo: 68 }
			});
		});

		// US-8.2-0.2: Test destination dashboard broadcasts for facilitator
		it('should broadcast destination_dashboard_update for each destination', async () => {
			handleResolutionPhase(mockSession, 'TEST01', mockBroadcast);

			await vi.runAllTimersAsync();

			// Should broadcast for Gmail with proper data
			expect(mockBroadcast).toHaveBeenCalledWith('TEST01', {
				type: 'destination_dashboard_update',
				destinationName: 'Gmail',
				budget: 500,
				owned_tools: ['content_analysis_filter'],
				esp_metrics: { SendWave: { user_satisfaction: 80, spam_level: 5 } }
			});

			// Should broadcast for Outlook
			expect(mockBroadcast).toHaveBeenCalledWith('TEST01', {
				type: 'destination_dashboard_update',
				destinationName: 'Outlook',
				budget: 500,
				owned_tools: [],
				esp_metrics: {}
			});

			// Should broadcast for Yahoo
			expect(mockBroadcast).toHaveBeenCalledWith('TEST01', {
				type: 'destination_dashboard_update',
				destinationName: 'Yahoo',
				budget: 500,
				owned_tools: [],
				esp_metrics: {}
			});
		});

		it('should not broadcast dashboard updates if application fails', async () => {
			vi.mocked(applyResolutionToGameState).mockReturnValue({
				success: false,
				error: 'Application failed'
			});

			handleResolutionPhase(mockSession, 'TEST01', mockBroadcast);

			await vi.runAllTimersAsync();

			// Should not have esp_dashboard_update broadcasts (only phase_transition)
			const espDashboardCalls = vi
				.mocked(mockBroadcast)
				.mock.calls.filter((call) => call[1].type === 'esp_dashboard_update');
			expect(espDashboardCalls).toHaveLength(0);

			// US-8.2-0.2: Should also not have destination_dashboard_update broadcasts
			const destDashboardCalls = vi
				.mocked(mockBroadcast)
				.mock.calls.filter((call) => call[1].type === 'destination_dashboard_update');
			expect(destDashboardCalls).toHaveLength(0);
		});

		it('should broadcast phase_transition with resolution history', async () => {
			handleResolutionPhase(mockSession, 'TEST01', mockBroadcast);

			await vi.runAllTimersAsync();

			expect(mockBroadcast).toHaveBeenCalledWith('TEST01', {
				type: 'phase_transition',
				data: expect.objectContaining({
					phase: 'consequences',
					round: 1,
					message: 'Resolution complete - reviewing results',
					resolution_history: expect.any(Array),
					current_round_results: mockResolutionResults
				})
			});
		});
	});

	// ============================================================================
	// TEST SUITE: Phase Transition
	// ============================================================================

	describe('Phase transition', () => {
		it('should transition to consequences phase after 500ms delay', async () => {
			handleResolutionPhase(mockSession, 'TEST01', mockBroadcast);

			// Before delay - transition should not have been called
			await vi.advanceTimersByTimeAsync(400);
			expect(transitionPhase).not.toHaveBeenCalled();

			// After delay - transition should be called
			await vi.advanceTimersByTimeAsync(200);
			expect(transitionPhase).toHaveBeenCalledWith({
				roomCode: 'TEST01',
				toPhase: 'consequences'
			});
		});

		it('should log successful phase transition', async () => {
			handleResolutionPhase(mockSession, 'TEST01', mockBroadcast);

			await vi.runAllTimersAsync();

			expect(gameLogger.info).toHaveBeenCalledWith('Phase transitioned to consequences', {
				roomCode: 'TEST01',
				round: 1
			});
		});

		it('should log error when phase transition fails', async () => {
			vi.mocked(transitionPhase).mockResolvedValue({
				success: false,
				error: 'Transition failed'
			});

			handleResolutionPhase(mockSession, 'TEST01', mockBroadcast);

			await vi.runAllTimersAsync();

			expect(gameLogger.error).toHaveBeenCalledWith(
				expect.any(Error),
				expect.objectContaining({
					context: 'handleResolutionPhase',
					roomCode: 'TEST01',
					error: 'Transition failed'
				})
			);
		});

		it('should not broadcast phase_transition if transition fails', async () => {
			vi.mocked(transitionPhase).mockResolvedValue({
				success: false,
				error: 'Transition failed'
			});

			handleResolutionPhase(mockSession, 'TEST01', mockBroadcast);

			await vi.runAllTimersAsync();

			const phaseTransitionCalls = vi
				.mocked(mockBroadcast)
				.mock.calls.filter((call) => call[1].type === 'phase_transition');
			expect(phaseTransitionCalls).toHaveLength(0);
		});
	});

	// ============================================================================
	// TEST SUITE: Error Handling
	// ============================================================================

	describe('Error handling', () => {
		it('should log error when resolution calculation fails', async () => {
			vi.mocked(executeResolution).mockRejectedValue(new Error('Calculation failed'));

			handleResolutionPhase(mockSession, 'TEST01', mockBroadcast);

			await vi.runAllTimersAsync();

			expect(gameLogger.error).toHaveBeenCalledWith(
				expect.any(Error),
				expect.objectContaining({
					context: 'handleResolutionPhase',
					roomCode: 'TEST01',
					round: 1,
					message: 'Resolution calculation failed'
				})
			);
		});

		it('should not transition to consequences when calculation fails', async () => {
			vi.mocked(executeResolution).mockRejectedValue(new Error('Calculation failed'));

			handleResolutionPhase(mockSession, 'TEST01', mockBroadcast);

			await vi.runAllTimersAsync();

			expect(transitionPhase).not.toHaveBeenCalled();
		});

		it('should not store results when calculation fails', async () => {
			vi.mocked(executeResolution).mockRejectedValue(new Error('Calculation failed'));

			handleResolutionPhase(mockSession, 'TEST01', mockBroadcast);

			await vi.runAllTimersAsync();

			expect(mockSession.resolution_history).toBeUndefined();
		});
	});
});
