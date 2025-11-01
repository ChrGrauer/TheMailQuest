/**
 * US-2.6.2: Destination Tool Purchase Manager
 *
 * Handles tool purchases for destination players including:
 * - Budget deduction
 * - Tool ownership tracking
 * - Authentication level progression
 * - Spam Trap Network special handling
 * - Comprehensive logging
 */

import { getSession, updateActivity } from './session-manager';
import { validateToolPurchase, getValidationErrorMessage } from './validation/destination-tool-validator';
import { getDestinationTool } from '$lib/config/destination-technical-upgrades';
import type { DestinationToolPurchaseResult } from './types';
import { gameLogger } from '../logger';

/**
 * Purchase a tool for a destination
 *
 * Process:
 * 1. Validate session and destination exist
 * 2. Validate tool exists
 * 3. Validate purchase (availability, budget, dependencies)
 * 4. Deduct budget
 * 5. Add to owned_tools
 * 6. Update authentication_level if Auth Validator
 * 7. Handle Spam Trap special case (set spam_trap_active)
 * 8. Log purchase
 * 9. Return updated destination
 *
 * @param roomCode - Game session room code
 * @param destName - Destination name
 * @param toolId - Tool ID to purchase
 * @param announcement - Optional announcement choice for Spam Trap ('announce' | 'secret')
 * @returns Purchase result with success flag and updated destination or error
 */
export function purchaseDestinationTool(
	roomCode: string,
	destName: string,
	toolId: string,
	announcement?: 'announce' | 'secret'
): DestinationToolPurchaseResult {
	// Validate session exists
	const session = getSession(roomCode);
	if (!session) {
		gameLogger.event('destination_tool_purchase_failed', {
			roomCode,
			destName,
			toolId,
			reason: 'session_not_found'
		});
		return {
			success: false,
			error: 'Session not found'
		};
	}

	// Find destination (case-insensitive)
	const destIndex = session.destinations.findIndex(
		(d) => d.name.toLowerCase() === destName.toLowerCase()
	);

	if (destIndex === -1) {
		gameLogger.event('destination_tool_purchase_failed', {
			roomCode,
			destName,
			toolId,
			reason: 'destination_not_found'
		});
		return {
			success: false,
			error: 'Destination not found'
		};
	}

	const destination = session.destinations[destIndex];

	// Validate tool exists
	const tool = getDestinationTool(toolId);
	if (!tool) {
		gameLogger.event('destination_tool_purchase_failed', {
			roomCode,
			destName,
			toolId,
			reason: 'tool_not_found'
		});
		return {
			success: false,
			error: 'Tool not found'
		};
	}

	// Validate purchase
	const validation = validateToolPurchase(destination, tool);
	if (!validation.canPurchase) {
		const errorMessage = getValidationErrorMessage(validation);

		gameLogger.event('destination_tool_purchase_failed', {
			roomCode,
			destName,
			toolId,
			toolName: tool.name,
			reason: validation.reason,
			missingDependencies: validation.missingDependencies,
			requiredCredits: validation.requiredCredits,
			availableCredits: validation.availableCredits
		});

		return {
			success: false,
			error: errorMessage
		};
	}

	// Capture state before purchase for logging
	const budgetBefore = destination.budget;
	const kingdom = destination.kingdom || 'Gmail';
	const cost = tool.pricing[kingdom] || 0;

	// Perform purchase - deduct budget
	destination.budget -= cost;

	// Initialize owned_tools if needed
	if (!destination.owned_tools) {
		destination.owned_tools = [];
	}

	// Add to owned tools
	destination.owned_tools.push(toolId);

	// Update authentication level if Auth Validator
	if (tool.authentication_level) {
		const prevLevel = destination.authentication_level || 0;
		destination.authentication_level = tool.authentication_level;

		gameLogger.event('auth_level_upgraded', {
			roomCode,
			destination: destName,
			from_level: prevLevel,
			to_level: tool.authentication_level,
			round: session.current_round
		});
	}

	// Handle Spam Trap Network special case
	if (toolId === 'spam_trap_network' && announcement) {
		destination.spam_trap_active = {
			round: session.current_round,
			announced: announcement === 'announce'
		};

		gameLogger.event('spam_trap_deployed', {
			roomCode,
			destination: destName,
			announced: announcement === 'announce',
			round: session.current_round,
			cost
		});
	}

	// Update activity timestamp
	updateActivity(roomCode);

	// Log successful purchase
	gameLogger.event('tool_purchased', {
		roomCode,
		destination: destName,
		kingdom,
		tool_id: toolId,
		tool_name: tool.name,
		acquisition_cost: cost,
		budget_before: budgetBefore,
		budget_after: destination.budget,
		round: session.current_round,
		timestamp: new Date().toISOString()
	});

	return {
		success: true,
		updatedDestination: destination
	};
}
