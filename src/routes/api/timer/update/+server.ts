/**
 * Timer Update API Endpoint
 * US-3.2: Timer countdown with auto-lock support
 *
 * Called every second by server.js to update all active session timers
 * Handles: 15-second warnings, auto-lock at expiry, phase transitions
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllSessions } from '$lib/server/game/session-manager';
import { updateTimerRemaining } from '$lib/server/game/timer-manager';
import { gameWss } from '$lib/server/websocket';

export const POST: RequestHandler = async () => {
	try {
		const sessions = getAllSessions();

		sessions.forEach((session) => {
			// Only update timers that are running
			if (session.timer && session.timer.isRunning && session.timer.remaining > 0) {
				const now = new Date();
				const elapsed = Math.floor(
					(now.getTime() - new Date(session.timer.startedAt).getTime()) / 1000
				);
				const remaining = Math.max(0, session.timer.duration - elapsed);

				// Update timer and handle auto-lock/warnings
				// Pass the WebSocket broadcast function
				updateTimerRemaining(session.roomCode, remaining, (roomCode, message) => {
					gameWss.broadcastToRoom(roomCode, message);
				});

				// Broadcast regular timer updates to keep clients synchronized
				// This ensures server authority - clients can't drift without correction
				gameWss.broadcastToRoom(session.roomCode, {
					type: 'game_state_update',
					timer_remaining: remaining
				});
			}
		});

		return json({ success: true });
	} catch (error) {
		console.error('[Timer Update API] Error:', error);
		return json({ success: false, error: 'Failed to update timers' }, { status: 500 });
	}
};
