/**
 * Custom production server with WebSocket support
 * Wraps SvelteKit's adapter-node build with WebSocket server
 * US-3.2: Timer countdown with auto-lock support
 */

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { handler } from './build/handler.js';

const PORT = process.env.PORT || 4173;

// Create HTTP server with SvelteKit handler
const server = createServer(handler);

// Initialize WebSocket server on /ws path with room subscription support
const wss = new WebSocketServer({ server, path: '/ws' });

// Track clients and room subscriptions
const clients = new Map(); // clientId -> { ws, roomCode }
const rooms = new Map(); // roomCode -> Set of clientIds

function generateClientId() {
	return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function subscribeToRoom(clientId, roomCode) {
	const client = clients.get(clientId);
	if (!client) return;

	// Unsubscribe from previous room if any
	if (client.roomCode) {
		const oldRoom = rooms.get(client.roomCode);
		if (oldRoom) {
			oldRoom.delete(clientId);
			if (oldRoom.size === 0) {
				rooms.delete(client.roomCode);
			}
		}
	}

	// Subscribe to new room
	client.roomCode = roomCode;
	if (!rooms.has(roomCode)) {
		rooms.set(roomCode, new Set());
	}
	rooms.get(roomCode).add(clientId);
	console.log(`[WebSocket] Client ${clientId} subscribed to room ${roomCode}`);
}

function unsubscribeFromRoom(clientId) {
	const client = clients.get(clientId);
	if (!client || !client.roomCode) return;

	const room = rooms.get(client.roomCode);
	if (room) {
		room.delete(clientId);
		if (room.size === 0) {
			rooms.delete(client.roomCode);
		}
	}
	console.log(`[WebSocket] Client ${clientId} unsubscribed from room ${client.roomCode}`);
	client.roomCode = null;
}

function broadcastToRoom(roomCode, message) {
	const room = rooms.get(roomCode);
	if (!room) {
		console.log(`[WebSocket] No clients in room ${roomCode}`);
		return;
	}

	const data = JSON.stringify(message);
	let successCount = 0;

	room.forEach((clientId) => {
		const client = clients.get(clientId);
		if (client && client.ws.readyState === 1) {
			// WebSocket.OPEN = 1
			client.ws.send(data);
			successCount++;
		}
	});

	console.log(
		`[WebSocket] Broadcasted ${message.type || 'unknown'} to ${successCount} clients in room ${roomCode}`
	);
}

// Make broadcastToRoom globally accessible for SvelteKit routes
// Store it in a way that can be accessed by the build
global.wsBroadcastToRoom = broadcastToRoom;

// Expose WebSocket metrics for load testing
global.wsGetMetrics = function () {
	return {
		totalConnections: clients.size,
		activeRooms: rooms.size,
		connectionsPerRoom: Object.fromEntries(
			[...rooms.entries()].map(([roomCode, clientSet]) => [roomCode, clientSet.size])
		)
	};
};

wss.on('connection', (ws) => {
	const clientId = generateClientId();
	clients.set(clientId, { ws, roomCode: null });
	console.log(`[WebSocket] Client connected: ${clientId}`);

	ws.on('message', (data) => {
		try {
			const message = JSON.parse(data.toString());

			switch (message.type) {
				case 'join_room':
					subscribeToRoom(clientId, message.roomCode);
					ws.send(JSON.stringify({ type: 'room_joined', roomCode: message.roomCode }));
					break;

				case 'leave_room':
					unsubscribeFromRoom(clientId);
					break;

				default:
					console.log(`[WebSocket] Unknown message type: ${message.type}`);
			}
		} catch (error) {
			console.error('[WebSocket] Message parsing error:', error);
		}
	});

	ws.on('close', () => {
		unsubscribeFromRoom(clientId);
		clients.delete(clientId);
		console.log(`[WebSocket] Client disconnected: ${clientId}`);
	});

	ws.on('error', (error) => {
		console.error(`[WebSocket] Error for client ${clientId}:`, error);
	});
});

server.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
	console.log('[WebSocket] Server initialized on /ws');
});

// ============================================================================
// TIMER COUNTDOWN MECHANISM (US-3.2)
// ============================================================================

/**
 * Timer countdown interval
 * Runs every second to trigger timer updates via API endpoint
 * The API endpoint handles:
 * - 15-second warning broadcast
 * - Auto-lock at timer expiry
 * - Phase transition to resolution
 */
setInterval(async () => {
	try {
		// Call the timer update API endpoint for each room
		// The endpoint will handle getting sessions, updating timers, and broadcasting
		// Note: This approach avoids import issues with build hashing
		const response = await fetch(`http://localhost:${PORT}/api/timer/update`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' }
		});

		if (!response.ok) {
			console.error('[Timer] Failed to update timers:', response.statusText);
		}
	} catch (error) {
		console.error('[Timer] Error updating timers:', error);
	}
}, 1000); // Run every second
