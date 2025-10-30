import { json, type RequestHandler } from '@sveltejs/kit';
import { getSession, updateActivity } from '$lib/server/game/session-manager';
import { gameLogger } from '$lib/server/logger';
import { gameWss } from '$lib/server/websocket';
import { validateClientAcquisition } from '$lib/server/game/validation/client-validator';
import { acquireClient } from '$lib/server/game/client-acquisition-manager';
import type { Destination } from '$lib/server/game/types';

/**
 * POST /api/sessions/[roomCode]/esp/[teamName]/clients/acquire
 * Acquire a client for an ESP team
 * US-2.2: Client Marketplace
 *
 * Request body: { clientId: string }
 *
 * Process:
 * 1. Validate the acquisition (credits, tech, reputation requirements)
 * 2. Acquire the client (update team state)
 * 3. Broadcast update via WebSocket
 * 4. Log the acquisition
 */
export const POST: RequestHandler = async ({ params, request }) => {
	const roomCode = params.roomCode;
	const teamName = params.teamName;

	if (!roomCode || !teamName) {
		return json(
			{
				error: 'Invalid parameters',
				success: false
			},
			{ status: 400 }
		);
	}

	// Parse request body
	let clientId: string;
	try {
		const body = await request.json();
		clientId = body.clientId;

		if (!clientId) {
			return json(
				{
					error: 'Missing clientId in request body',
					success: false
				},
				{ status: 400 }
			);
		}
	} catch (error) {
		return json(
			{
				error: 'Invalid request body',
				success: false
			},
			{ status: 400 }
		);
	}

	gameLogger.event('client_acquisition_attempt', { roomCode, teamName, clientId });

	// Get the session
	const session = getSession(roomCode);

	if (!session) {
		gameLogger.event('client_acquisition_failed', {
			roomCode,
			teamName,
			clientId,
			reason: 'session_not_found'
		});
		return json(
			{
				error: 'Session not found',
				success: false
			},
			{ status: 404 }
		);
	}

	// Find the ESP team (case-insensitive)
	const team = session.esp_teams.find((t) => t.name.toLowerCase() === teamName?.toLowerCase());

	if (!team) {
		gameLogger.event('client_acquisition_failed', {
			roomCode,
			teamName,
			clientId,
			reason: 'team_not_found'
		});
		return json(
			{
				error: 'ESP team not found',
				success: false
			},
			{ status: 404 }
		);
	}

	// Find the client
	const client = team.available_clients.find((c) => c.id === clientId);

	if (!client) {
		gameLogger.event('client_acquisition_failed', {
			roomCode,
			teamName,
			clientId,
			reason: 'client_not_found'
		});
		return json(
			{
				error: 'Client not found in marketplace',
				success: false
			},
			{ status: 404 }
		);
	}

	// Get current round and destinations
	const currentRound = session.current_round || 1;
	const destinations: Destination[] = session.destinations;

	// Validate the acquisition
	const validation = validateClientAcquisition(team, client, currentRound, destinations);

	if (!validation.canAcquire) {
		// Log failure with specific reason
		gameLogger.event('client_acquisition_failed', {
			roomCode,
			teamName,
			clientId,
			clientName: client.name,
			reason: validation.reason,
			missingTech: validation.missingTech,
			requiredReputation: validation.requiredReputation,
			actualReputation: validation.actualReputation
		});

		// Return appropriate error message
		const errorMessages: Record<string, string> = {
			insufficient_credits: 'Insufficient credits to acquire this client',
			missing_tech: `Missing required technology: ${validation.missingTech?.join(', ')}`,
			insufficient_reputation: `Reputation too low (${validation.actualReputation}/${validation.requiredReputation})`,
			client_not_found: 'Client not found in marketplace',
			already_owned: 'Client already acquired'
		};

		return json(
			{
				error: errorMessages[validation.reason!] || 'Cannot acquire this client',
				success: false,
				reason: validation.reason,
				validation
			},
			{ status: 403 }
		);
	}

	// Acquire the client
	const acquisitionResult = acquireClient(team, clientId);

	if (!acquisitionResult.success) {
		gameLogger.event('client_acquisition_failed', {
			roomCode,
			teamName,
			clientId,
			reason: 'acquisition_error',
			error: acquisitionResult.error
		});

		return json(
			{
				error: acquisitionResult.error || 'Failed to acquire client',
				success: false
			},
			{ status: 500 }
		);
	}

	// Update team in session
	const teamIndex = session.esp_teams.findIndex((t) => t.name === team.name);
	session.esp_teams[teamIndex] = acquisitionResult.team!;

	// Update activity
	updateActivity(roomCode);

	// Log successful acquisition
	gameLogger.event('client_acquired', {
		roomCode,
		teamName,
		clientId: acquisitionResult.acquiredClient!.id,
		clientName: acquisitionResult.acquiredClient!.name,
		clientType: acquisitionResult.acquiredClient!.type,
		cost: acquisitionResult.acquiredClient!.cost,
		remaining_credits: acquisitionResult.team!.credits,
		round: currentRound
	});

	// Calculate available clients count (filtered by current round)
	const availableClientsCount = acquisitionResult.team!.available_clients.filter(
		(client) => client.available_from_round <= currentRound
	).length;

	// Broadcast WebSocket update
	gameWss.broadcastToRoom(roomCode, {
		type: 'esp_dashboard_update',
		data: {
			credits: acquisitionResult.team!.credits,
			clients: acquisitionResult.team!.active_clients,
			available_clients_count: availableClientsCount
		}
	});

	return json({
		success: true,
		client: acquisitionResult.acquiredClient,
		team: {
			credits: acquisitionResult.team!.credits,
			active_clients: acquisitionResult.team!.active_clients
		}
	});
};
