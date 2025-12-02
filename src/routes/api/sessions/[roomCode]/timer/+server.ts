/**
 * Timer Control API
 * US-8.2-0.1: Facilitator Basic Controls
 *
 * POST: Control timer (pause, resume, extend)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { pauseTimer, resumeTimer, extendTimer } from '$lib/server/game/timer-manager';
import { getSession } from '$lib/server/game/session-manager';
import { gameLogger } from '$lib/server/logger';

// Lazy WebSocket import to avoid Vite config issues
let gameWss: any = null;
async function getWebSocket() {
	if (!gameWss) {
		const module = await import('$lib/server/websocket');
		gameWss = module.gameWss;
	}
	return gameWss;
}

export const POST: RequestHandler = async ({ params, request }) => {
	const { roomCode } = params;

	gameLogger.info('Timer control request received', { roomCode });

	try {
		const body = await request.json();
		const { action, seconds } = body as { action: string; seconds?: number };

		// Validate session exists
		const session = getSession(roomCode);
		if (!session) {
			return json({ success: false, error: 'Session not found' }, { status: 404 });
		}

		// Validate action
		if (!['pause', 'resume', 'extend'].includes(action)) {
			return json({ success: false, error: 'Invalid action' }, { status: 400 });
		}

		// Validate phase - timer controls only available during planning
		if (session.current_phase !== 'planning') {
			return json(
				{ success: false, error: 'Timer controls only available during planning phase' },
				{ status: 400 }
			);
		}

		let result;
		let broadcastData;

		switch (action) {
			case 'pause':
				result = pauseTimer(roomCode);
				if (result.success) {
					broadcastData = {
						type: 'timer_update',
						isPaused: true,
						remainingTime: result.remainingTime,
						action: 'pause'
					};
				}
				break;

			case 'resume':
				result = resumeTimer(roomCode);
				if (result.success) {
					broadcastData = {
						type: 'timer_update',
						isPaused: false,
						remainingTime: result.remainingTime,
						action: 'resume'
					};
				}
				break;

			case 'extend':
				const addSeconds = seconds || 60;
				result = extendTimer(roomCode, addSeconds);
				if (result.success) {
					broadcastData = {
						type: 'timer_update',
						isPaused: session.timer?.isPaused || false,
						remainingTime: result.remainingTime,
						action: 'extend',
						addedSeconds: result.addedSeconds
					};
				}
				break;

			default:
				return json({ success: false, error: 'Invalid action' }, { status: 400 });
		}

		if (!result.success) {
			return json({ success: false, error: result.error }, { status: 400 });
		}

		// Broadcast timer update to all players in the room
		if (broadcastData) {
			try {
				const wss = await getWebSocket();
				wss.broadcastToRoom(roomCode, broadcastData);
				gameLogger.info('Timer update broadcast', { roomCode, action, ...broadcastData });
			} catch (wsError) {
				gameLogger.warn('Failed to broadcast timer update', { roomCode, error: wsError });
				// Don't fail the request if broadcast fails
			}
		}

		return json({
			success: true,
			...result
		});
	} catch (error) {
		gameLogger.error(error as Error, { context: 'timer-control', roomCode });
		return json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
};
