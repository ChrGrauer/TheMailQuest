/**
 * Debug Metrics Endpoint for Load Testing
 *
 * Returns server metrics for performance monitoring:
 * - Session count and details
 * - WebSocket connection counts
 * - Memory usage
 *
 * Only available in development/test environments
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { getAllSessions } from '$lib/server/game/session-manager';
import { dev } from '$app/environment';

// Type for global WebSocket metrics function exposed by server.js
declare global {
	// eslint-disable-next-line no-var
	var wsGetMetrics:
		| (() => {
				totalConnections: number;
				activeRooms: number;
				connectionsPerRoom: Record<string, number>;
		  })
		| undefined;
}

export const GET: RequestHandler = async () => {
	// Only allow in development/test environments
	if (!dev && process.env.NODE_ENV !== 'test') {
		return json(
			{ error: 'This endpoint is only available in development/test environments' },
			{ status: 403 }
		);
	}

	try {
		// Get session metrics
		const sessions = getAllSessions();
		const sessionMetrics = {
			count: sessions.length,
			byPhase: sessions.reduce(
				(acc, s) => {
					acc[s.current_phase] = (acc[s.current_phase] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>
			),
			rooms: sessions.map((s) => ({
				roomCode: s.roomCode,
				phase: s.current_phase,
				round: s.current_round,
				espTeams: s.esp_teams.filter((t) => t.players.length > 0).length,
				destinations: s.destinations.filter((d) => d.players.length > 0).length,
				totalPlayers:
					s.esp_teams.reduce((sum, t) => sum + t.players.length, 0) +
					s.destinations.reduce((sum, d) => sum + d.players.length, 0)
			}))
		};

		// Get WebSocket metrics (only available in production with server.js)
		const wsMetrics = global.wsGetMetrics?.() || {
			totalConnections: 0,
			activeRooms: 0,
			connectionsPerRoom: {},
			note: 'WebSocket metrics only available when running with server.js'
		};

		// Get memory usage
		const memoryUsage = process.memoryUsage();
		const memoryMetrics = {
			heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
			heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
			external: Math.round(memoryUsage.external / 1024 / 1024), // MB
			rss: Math.round(memoryUsage.rss / 1024 / 1024) // MB (resident set size)
		};

		return json({
			timestamp: new Date().toISOString(),
			sessions: sessionMetrics,
			websocket: wsMetrics,
			memory: memoryMetrics
		});
	} catch (error) {
		console.error('[Debug Metrics] Error:', error);
		return json({ error: 'Failed to collect metrics' }, { status: 500 });
	}
};
