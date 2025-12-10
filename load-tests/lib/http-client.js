/**
 * HTTP Client for The Mail Quest API
 *
 * Provides wrappers for game API calls with proper cookie handling
 */

import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4173';

/**
 * Create a new game session
 * @returns {Object} { roomCode, facilitatorId, cookies }
 */
export function createSession() {
	const res = http.post(`${BASE_URL}/api/sessions`, null, {
		tags: { name: 'create_session' }
	});

	const success = check(res, {
		'create session status 200': (r) => r.status === 200,
		'create session has roomCode': (r) => {
			const body = r.json();
			return body && body.roomCode;
		}
	});

	if (!success) {
		console.error(`Create session failed: ${res.status} ${res.body}`);
		return null;
	}

	const body = res.json();
	const cookies = res.cookies;

	return {
		roomCode: body.roomCode,
		facilitatorId: body.facilitatorId,
		cookies: cookies
	};
}

/**
 * Join a game session as a player
 * @param {string} roomCode - The room code
 * @param {string} displayName - Player display name
 * @param {'ESP'|'Destination'} role - Player role
 * @param {string} teamName - Team or destination name
 * @returns {Object} { playerId, player }
 */
export function joinAsPlayer(roomCode, displayName, role, teamName) {
	const payload = JSON.stringify({
		displayName,
		role,
		teamName
	});

	const res = http.post(`${BASE_URL}/api/sessions/${roomCode}/join`, payload, {
		headers: { 'Content-Type': 'application/json' },
		tags: { name: 'join_game' }
	});

	const success = check(res, {
		'join game status 200': (r) => r.status === 200,
		'join game success': (r) => {
			const body = r.json();
			return body && body.success;
		}
	});

	if (!success) {
		console.error(`Join game failed for ${displayName}: ${res.status} ${res.body}`);
		return null;
	}

	return res.json();
}

/**
 * Start a game session (requires facilitator cookies)
 * @param {string} roomCode - The room code
 * @param {Object} jar - Cookie jar with facilitator cookies
 * @returns {Object} { success, phase, round }
 */
export function startGame(roomCode, jar) {
	const res = http.post(`${BASE_URL}/api/sessions/${roomCode}/start`, null, {
		jar: jar,
		tags: { name: 'start_game' }
	});

	const success = check(res, {
		'start game status 200': (r) => r.status === 200,
		'start game success': (r) => {
			const body = r.json();
			return body && body.success;
		}
	});

	if (!success) {
		console.error(`Start game failed: ${res.status} ${res.body}`);
		return null;
	}

	return res.json();
}

/**
 * Lock in an ESP team's decisions
 * @param {string} roomCode - The room code
 * @param {string} teamName - The ESP team name (lowercase in URL)
 * @returns {Object} { success, all_locked, remaining_players }
 */
export function lockInESP(roomCode, teamName) {
	const urlTeamName = teamName.toLowerCase();
	const res = http.post(`${BASE_URL}/api/sessions/${roomCode}/esp/${urlTeamName}/lock-in`, null, {
		tags: { name: 'lock_in_esp' }
	});

	const success = check(res, {
		'ESP lock-in status 200': (r) => r.status === 200,
		'ESP lock-in success': (r) => {
			const body = r.json();
			return body && body.success;
		}
	});

	if (!success) {
		console.error(`ESP lock-in failed for ${teamName}: ${res.status} ${res.body}`);
		return null;
	}

	return res.json();
}

/**
 * Lock in a destination's decisions
 * @param {string} roomCode - The room code
 * @param {string} destName - The destination name (lowercase in URL)
 * @returns {Object} { success, all_locked, remaining_players }
 */
export function lockInDestination(roomCode, destName) {
	const urlDestName = destName.toLowerCase();
	const res = http.post(
		`${BASE_URL}/api/sessions/${roomCode}/destination/${urlDestName}/lock-in`,
		null,
		{
			tags: { name: 'lock_in_destination' }
		}
	);

	const success = check(res, {
		'Destination lock-in status 200': (r) => r.status === 200,
		'Destination lock-in success': (r) => {
			const body = r.json();
			return body && body.success;
		}
	});

	if (!success) {
		console.error(`Destination lock-in failed for ${destName}: ${res.status} ${res.body}`);
		return null;
	}

	return res.json();
}

/**
 * Advance game to next round (only after consequences phase)
 * @param {string} roomCode - The room code
 * @param {Object} jar - Cookie jar with facilitator cookies
 * @returns {Object} { success, round, phase }
 */
export function nextRound(roomCode, jar) {
	const res = http.post(`${BASE_URL}/api/sessions/${roomCode}/next-round`, null, {
		jar: jar,
		tags: { name: 'next_round' }
	});

	const success = check(res, {
		'next round status 200': (r) => r.status === 200
	});

	if (!success) {
		console.error(`Next round failed: ${res.status} ${res.body}`);
		return null;
	}

	return res.json();
}

/**
 * Get server metrics
 * @returns {Object} { sessions, websocket, memory }
 */
export function getMetrics() {
	const res = http.get(`${BASE_URL}/api/debug/metrics`, {
		tags: { name: 'get_metrics' }
	});

	if (res.status !== 200) {
		console.error(`Get metrics failed: ${res.status}`);
		return null;
	}

	return res.json();
}

/**
 * Clear all sessions (for test cleanup)
 */
export function clearSessions() {
	const res = http.post(`${BASE_URL}/api/test/clear-sessions`, null, {
		tags: { name: 'clear_sessions' }
	});

	return res.status === 200;
}
