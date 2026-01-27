/**
 * US-2.6.2: Destination Tool Purchase Manager - Unit Tests (RED Phase)
 * These tests will FAIL until the GREEN phase implementation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { purchaseDestinationTool } from './destination-tool-purchase-manager';
import { getSession, createGameSession, deleteSession } from './session-manager';
import type { GameSession } from './types';

// Mock logger
vi.mock('../logger', () => ({
	gameLogger: {
		event: vi.fn()
	}
}));

describe('Destination Tool Purchase Manager', () => {
	let session: GameSession;
	let roomCode: string;

	beforeEach(() => {
		// Create test session
		session = createGameSession('facilitator1');
		roomCode = session.roomCode;
		session.destinations = [
			{
				name: 'zmail',
				kingdom: 'zmail',
				players: ['player1'],
				budget: 500,
				filtering_policies: {},
				esp_reputation: {},
				owned_tools: [],
				authentication_level: 0
			}
		];
		session.current_round = 1;
	});

	afterEach(() => {
		// Clean up
		deleteSession(roomCode);
	});

	describe('Basic Purchase Flow', () => {
		it('should successfully purchase a tool', () => {
			const result = purchaseDestinationTool(roomCode, 'zmail', 'content_analysis_filter');

			expect(result.success).toBe(true);
			expect(result.updatedDestination).toBeDefined();
			expect(result.updatedDestination?.budget).toBe(200); // 500 - 300
			expect(result.updatedDestination?.owned_tools).toContain('content_analysis_filter');
		});

		it('should return error when session not found', () => {
			const result = purchaseDestinationTool('INVALID', 'zmail', 'content_analysis_filter');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Session not found');
		});

		it('should return error when destination not found', () => {
			const result = purchaseDestinationTool(roomCode, 'InvalidDest', 'content_analysis_filter');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Destination not found');
		});

		it('should return error when tool not found', () => {
			const result = purchaseDestinationTool(roomCode, 'zmail', 'invalid_tool_id');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Tool not found');
		});
	});

	describe('Budget Deduction', () => {
		it('should deduct correct amount based on kingdom', () => {
			// zmail pays 300 for Content Analysis
			const result = purchaseDestinationTool(roomCode, 'zmail', 'content_analysis_filter');

			expect(result.success).toBe(true);
			expect(result.updatedDestination?.budget).toBe(200);
		});

		it('should fail when budget insufficient', () => {
			session.destinations[0].budget = 100;
			const result = purchaseDestinationTool(roomCode, 'zmail', 'content_analysis_filter');

			expect(result.success).toBe(false);
			expect(result.error).toContain('Insufficient budget');
		});
	});

	describe('Authentication Level Tracking', () => {
		it('should update authentication level when purchasing Auth Validator L1', () => {
			const result = purchaseDestinationTool(roomCode, 'zmail', 'auth_validator_l1');

			expect(result.success).toBe(true);
			expect(result.updatedDestination?.authentication_level).toBe(1);
		});

		it('should update authentication level from 1 to 2', () => {
			session.destinations[0].owned_tools = ['auth_validator_l1'];
			session.destinations[0].authentication_level = 1;

			const result = purchaseDestinationTool(roomCode, 'zmail', 'auth_validator_l2');

			expect(result.success).toBe(true);
			expect(result.updatedDestination?.authentication_level).toBe(2);
		});

		it('should update authentication level from 2 to 3', () => {
			session.destinations[0].owned_tools = ['auth_validator_l1', 'auth_validator_l2'];
			session.destinations[0].authentication_level = 2;

			const result = purchaseDestinationTool(roomCode, 'zmail', 'auth_validator_l3');

			expect(result.success).toBe(true);
			expect(result.updatedDestination?.authentication_level).toBe(3);
		});

		it('should not update level for non-auth tools', () => {
			const result = purchaseDestinationTool(roomCode, 'zmail', 'content_analysis_filter');

			expect(result.success).toBe(true);
			expect(result.updatedDestination?.authentication_level).toBe(0);
		});
	});

	describe('Spam Trap Network Special Handling', () => {
		it('should set spam_trap_active with announcement option', () => {
			const result = purchaseDestinationTool(roomCode, 'zmail', 'spam_trap_network', 'announce');

			expect(result.success).toBe(true);
			expect(result.updatedDestination?.spam_trap_active).toEqual({
				round: 1,
				announced: true
			});
		});

		it('should set spam_trap_active with secret option', () => {
			const result = purchaseDestinationTool(roomCode, 'zmail', 'spam_trap_network', 'secret');

			expect(result.success).toBe(true);
			expect(result.updatedDestination?.spam_trap_active).toEqual({
				round: 1,
				announced: false
			});
		});
	});

	describe('Validation Integration', () => {
		it('should reject purchase of already owned tool', () => {
			session.destinations[0].owned_tools = ['content_analysis_filter'];

			const result = purchaseDestinationTool(roomCode, 'zmail', 'content_analysis_filter');

			expect(result.success).toBe(false);
			expect(result.error).toContain('already own');
		});

		it('should reject ML System for yagle', () => {
			session.destinations[0].name = 'yagle';
			session.destinations[0].kingdom = 'yagle';

			const result = purchaseDestinationTool(roomCode, 'yagle', 'ml_system');

			expect(result.success).toBe(false);
			expect(result.error).toContain('not available');
		});

		it('should reject Auth L2 without L1', () => {
			const result = purchaseDestinationTool(roomCode, 'zmail', 'auth_validator_l2');

			expect(result.success).toBe(false);
			expect(result.error).toContain('Missing required tools');
		});
	});

	describe('Logging', () => {
		it('should log successful purchase', async () => {
			const { gameLogger } = await import('../logger');

			purchaseDestinationTool(roomCode, 'zmail', 'content_analysis_filter');

			expect(gameLogger.event).toHaveBeenCalledWith(
				'tool_purchased',
				expect.objectContaining({
					roomCode,
					destination: 'zmail',
					kingdom: 'zmail',
					tool_id: 'content_analysis_filter',
					acquisition_cost: 300
				})
			);
		});

		it('should log authentication level upgrade', async () => {
			const { gameLogger } = await import('../logger');

			purchaseDestinationTool(roomCode, 'zmail', 'auth_validator_l1');

			expect(gameLogger.event).toHaveBeenCalledWith(
				'auth_level_upgraded',
				expect.objectContaining({
					destination: 'zmail',
					from_level: 0,
					to_level: 1
				})
			);
		});

		it('should log spam trap deployment', async () => {
			const { gameLogger } = await import('../logger');

			purchaseDestinationTool(roomCode, 'zmail', 'spam_trap_network', 'secret');

			expect(gameLogger.event).toHaveBeenCalledWith(
				'spam_trap_deployed',
				expect.objectContaining({
					destination: 'zmail',
					announced: false,
					round: 1
				})
			);
		});

		it('should log failed purchase attempts', async () => {
			const { gameLogger } = await import('../logger');

			// Attempt purchase with insufficient budget
			session.destinations[0].budget = 100;
			purchaseDestinationTool(roomCode, 'zmail', 'content_analysis_filter');

			expect(gameLogger.event).toHaveBeenCalledWith(
				'destination_tool_purchase_failed',
				expect.objectContaining({
					roomCode,
					destName: 'zmail',
					toolId: 'content_analysis_filter',
					reason: expect.any(String)
				})
			);
		});
	});

	describe('Tool Ownership Persistence', () => {
		it('should add tool to owned_tools array', () => {
			const result = purchaseDestinationTool(roomCode, 'zmail', 'content_analysis_filter');

			expect(result.success).toBe(true);
			expect(result.updatedDestination?.owned_tools).toEqual(['content_analysis_filter']);
		});

		it('should maintain existing owned tools when purchasing new ones', () => {
			session.destinations[0].owned_tools = ['volume_throttling'];

			const result = purchaseDestinationTool(roomCode, 'zmail', 'content_analysis_filter');

			expect(result.success).toBe(true);
			expect(result.updatedDestination?.owned_tools).toEqual([
				'volume_throttling',
				'content_analysis_filter'
			]);
		});
	});
});
