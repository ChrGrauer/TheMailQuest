/**
 * Timer Update API Endpoint
 * US-3.2: Timer countdown with auto-lock support
 *
 * Called every second by server.js to update all active session timers
 * Handles: 15-second warnings, auto-lock at expiry, phase transitions
 *
 * Optimization: Timer sync broadcasts every 10s (clients have local countdown)
 * Critical events (warnings, auto-lock, pause/resume) still broadcast immediately
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllSessions } from '$lib/server/game/session-manager';
import { updateTimerRemaining } from '$lib/server/game/timer-manager';
import { gameWss } from '$lib/server/websocket';

// Sync interval for timer broadcasts (seconds)
const TIMER_SYNC_INTERVAL = 10;

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

				// Update timer and handle auto-lock/warnings (broadcasts critical events)
				updateTimerRemaining(session.roomCode, remaining, (roomCode, message) => {
					gameWss.broadcastToRoom(roomCode, message);
				});

				// Broadcast sync updates every TIMER_SYNC_INTERVAL seconds
				// Clients have local countdown, so frequent broadcasts aren't needed
				// Critical events (warnings, auto-lock) are handled separately above
				if (remaining % TIMER_SYNC_INTERVAL === 0) {
					gameWss.broadcastToRoom(session.roomCode, {
						type: 'game_state_update',
						timer_remaining: remaining
					});
				}
			}
		});

		return json({ success: true });
	} catch (error) {
		console.error('[Timer Update API] Error:', error);
		return json({ success: false, error: 'Failed to update timers' }, { status: 500 });
	}
};
