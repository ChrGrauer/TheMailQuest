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

	// return res.json();
	// Return body merged with cookies
	const body = res.json();
	return {
		...body,
		cookies: res.cookies
	};
}

/**
 * Start a game session (requires facilitator cookies)
 * @param {string} roomCode - The room code
 * @param {string} facilitatorId - The facilitator ID
 * @returns {Object} { success, phase, round }
 */
export function startGame(roomCode, facilitatorId) {
	const res = http.post(`${BASE_URL}/api/sessions/${roomCode}/start`, null, {
		headers: {
			Cookie: `facilitatorId=${facilitatorId}`
		},
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
/**
 * Helper to format cookies for header
 */
function formatCookies(cookies) {
	if (!cookies) return '';
	return Object.entries(cookies)
		.map(([name, cookie]) => `${name}=${cookie[0].value}`)
		.join('; ');
}

export function lockInESP(roomCode, teamName, cookies) {
	const urlTeamName = teamName.toLowerCase();
	const params = {
		tags: { name: 'lock_in_esp' }
	};

	if (cookies) {
		params.headers = { Cookie: formatCookies(cookies) };
	}

	const res = http.post(
		`${BASE_URL}/api/sessions/${roomCode}/esp/${urlTeamName}/lock-in`,
		null,
		params
	);

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
 * @param {Object} cookies - Player cookies
 * @returns {Object} { success, all_locked, remaining_players }
 */
export function lockInDestination(roomCode, destName, cookies) {
	const urlDestName = destName.toLowerCase();
	const params = {
		tags: { name: 'lock_in_destination' }
	};

	if (cookies) {
		params.headers = { Cookie: formatCookies(cookies) };
	}

	const res = http.post(
		`${BASE_URL}/api/sessions/${roomCode}/destination/${urlDestName}/lock-in`,
		null,
		params
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
 * @param {string} facilitatorId - The facilitator ID
 * @returns {Object} { success, round, phase }
 */
export function nextRound(roomCode, facilitatorId) {
	const res = http.post(`${BASE_URL}/api/sessions/${roomCode}/next-round`, null, {
		headers: {
			Cookie: `facilitatorId=${facilitatorId}`
		},
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

/**
 * Get available clients for an ESP team
 * @param {string} roomCode - The room code
 * @param {string} teamName - The ESP team name
 * @param {Object} cookies - Player cookies
 * @returns {Object} { success, clients, currentRound, totalAvailable }
 */
export function getESPClients(roomCode, teamName, cookies) {
	const urlTeamName = teamName.toLowerCase();
	const params = {
		tags: { name: 'get_esp_clients' }
	};

	if (cookies) {
		params.headers = { Cookie: formatCookies(cookies) };
	}

	const res = http.get(`${BASE_URL}/api/sessions/${roomCode}/esp/${urlTeamName}/clients`, params);

	const success = check(res, {
		'get ESP clients status 200': (r) => r.status === 200,
		'get ESP clients success': (r) => {
			const body = r.json();
			return body && body.success;
		}
	});

	if (!success) {
		console.error(`Get ESP clients failed for ${teamName}: ${res.status} ${res.body}`);
		return null;
	}

	return res.json();
}

/**
 * Acquire a client for an ESP team
 * @param {string} roomCode - The room code
 * @param {string} teamName - The ESP team name
 * @param {string} clientId - The client ID to acquire
 * @param {Object} cookies - Player cookies
 * @returns {Object} { success, client, team }
 */
export function acquireClient(roomCode, teamName, clientId, cookies) {
	const urlTeamName = teamName.toLowerCase();
	const params = {
		headers: { 'Content-Type': 'application/json' },
		tags: { name: 'acquire_client' }
	};

	if (cookies) {
		params.headers.Cookie = formatCookies(cookies);
	}

	const payload = JSON.stringify({ clientId });
	const res = http.post(
		`${BASE_URL}/api/sessions/${roomCode}/esp/${urlTeamName}/clients/acquire`,
		payload,
		params
	);

	const success = check(res, {
		'acquire client status 200': (r) => r.status === 200,
		'acquire client success': (r) => {
			const body = r.json();
			return body && body.success;
		}
	});

	if (!success) {
		console.error(`Acquire client failed for ${teamName}/${clientId}: ${res.status} ${res.body}`);
		return null;
	}

	return res.json();
}

/**
 * Purchase a technical upgrade for an ESP team
 * @param {string} roomCode - The room code
 * @param {string} teamName - The ESP team name
 * @param {string} upgradeId - The upgrade ID to purchase
 * @param {Object} cookies - Player cookies
 * @returns {Object} { success, team }
 */
export function purchaseTechUpgrade(roomCode, teamName, upgradeId, cookies) {
	const urlTeamName = teamName.toLowerCase();
	const params = {
		headers: { 'Content-Type': 'application/json' },
		tags: { name: 'purchase_tech' }
	};

	if (cookies) {
		params.headers.Cookie = formatCookies(cookies);
	}

	const payload = JSON.stringify({ upgradeId });
	const res = http.post(
		`${BASE_URL}/api/sessions/${roomCode}/esp/${urlTeamName}/techUpgrades/purchase`,
		payload,
		params
	);

	const success = check(res, {
		'purchase tech status 200': (r) => r.status === 200,
		'purchase tech success': (r) => {
			const body = r.json();
			return body && body.success;
		}
	});

	if (!success) {
		console.error(`Purchase tech failed for ${teamName}/${upgradeId}: ${res.status} ${res.body}`);
		return null;
	}

	return res.json();
}

/**
 * Purchase a tool for a destination
 * @param {string} roomCode - The room code
 * @param {string} destName - The destination name
 * @param {string} toolId - The tool ID to purchase
 * @param {Object} cookies - Player cookies
 * @returns {Object} { success, budget, owned_tools }
 */
export function purchaseDestinationTool(roomCode, destName, toolId, cookies) {
	const urlDestName = destName.toLowerCase();
	const params = {
		headers: { 'Content-Type': 'application/json' },
		tags: { name: 'purchase_dest_tool' }
	};

	if (cookies) {
		params.headers.Cookie = formatCookies(cookies);
	}

	const payload = JSON.stringify({ toolId });
	const res = http.post(
		`${BASE_URL}/api/sessions/${roomCode}/destination/${urlDestName}/tools/purchase`,
		payload,
		params
	);

	const success = check(res, {
		'purchase dest tool status 200': (r) => r.status === 200,
		'purchase dest tool success': (r) => {
			const body = r.json();
			return body && body.success;
		}
	});

	if (!success) {
		console.error(`Purchase dest tool failed for ${destName}/${toolId}: ${res.status} ${res.body}`);
		return null;
	}

	return res.json();
}
