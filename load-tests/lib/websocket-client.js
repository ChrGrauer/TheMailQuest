/**
 * WebSocket Client for The Mail Quest
 *
 * Provides WebSocket connection management with latency measurement
 */

import ws from 'k6/ws';
import { Trend, Counter } from 'k6/metrics';

// Custom metrics
export const wsLatency = new Trend('ws_message_latency', true);
export const wsErrors = new Counter('ws_connection_errors');

const WS_URL = __ENV.WS_URL || 'ws://localhost:4173/ws';

/**
 * Connect to WebSocket and join a room
 * @param {string} roomCode - The room code to join
 * @param {Function} onMessage - Callback for received messages
 * @param {number} timeout - Connection timeout in ms (default 30000)
 * @returns {Object} { socket, close }
 */
export function connectAndJoin(roomCode, onMessage, timeout = 30000) {
	let messageQueue = [];
	let socketRef = null;

	const result = ws.connect(WS_URL, { timeout }, function (socket) {
		socketRef = socket;

		socket.on('open', () => {
			// Join the room
			socket.send(JSON.stringify({ type: 'join_room', roomCode }));
		});

		socket.on('message', (data) => {
			const message = JSON.parse(data);
			messageQueue.push({
				message,
				receivedAt: Date.now()
			});

			if (onMessage) {
				onMessage(message);
			}
		});

		socket.on('error', (e) => {
			wsErrors.add(1);
			console.error(`WebSocket error: ${e}`);
		});

		socket.on('close', () => {
			// Connection closed
		});
	});

	return {
		getMessages: () => messageQueue,
		clearMessages: () => {
			messageQueue = [];
		},
		close: () => {
			if (socketRef) {
				socketRef.close();
			}
		}
	};
}

/**
 * Wait for a specific message type with timeout
 * @param {Array} messageQueue - Queue of received messages
 * @param {string} messageType - The message type to wait for
 * @param {number} timeout - Timeout in ms
 * @param {Function} predicate - Optional predicate to match message
 * @returns {Object|null} The matching message or null if timeout
 */
export function waitForMessage(messageQueue, messageType, timeout = 10000, predicate = null) {
	const startTime = Date.now();

	while (Date.now() - startTime < timeout) {
		for (let i = 0; i < messageQueue.length; i++) {
			const { message, receivedAt } = messageQueue[i];
			if (message.type === messageType) {
				if (!predicate || predicate(message)) {
					// Remove from queue
					messageQueue.splice(i, 1);
					return { message, receivedAt };
				}
			}
		}
		// Small sleep to avoid busy waiting
		// Note: In k6, we use sleep() but it's not ideal in WS callback
		// In practice, messages arrive via callback
	}

	return null;
}

/**
 * GameWebSocket class for managing a player's WebSocket connection
 */
export class GameWebSocket {
	constructor(roomCode) {
		this.roomCode = roomCode;
		this.messages = [];
		this.socket = null;
		this.connected = false;
		this.pendingWaits = [];
	}

	/**
	 * Connect and join the room
	 * @param {number} timeout - Connection timeout
	 */
	connect(timeout = 30000) {
		const self = this;

		return new Promise((resolve, reject) => {
			ws.connect(WS_URL, { timeout }, function (socket) {
				self.socket = socket;

				socket.on('open', () => {
					self.connected = true;
					socket.send(JSON.stringify({ type: 'join_room', roomCode: self.roomCode }));
				});

				socket.on('message', (data) => {
					const message = JSON.parse(data);
					const entry = {
						message,
						receivedAt: Date.now()
					};
					self.messages.push(entry);

					// Check pending waits
					self.pendingWaits = self.pendingWaits.filter((wait) => {
						if (message.type === wait.type) {
							if (!wait.predicate || wait.predicate(message)) {
								wait.resolve(entry);
								return false; // Remove from pending
							}
						}
						return true; // Keep in pending
					});

					// Handle room_joined confirmation
					if (message.type === 'room_joined') {
						resolve(self);
					}
				});

				socket.on('error', (e) => {
					wsErrors.add(1);
					reject(e);
				});

				socket.on('close', () => {
					self.connected = false;
				});

				// Set a timeout for initial connection
				socket.setTimeout(() => {
					if (!self.connected) {
						reject(new Error('WebSocket connection timeout'));
					}
				}, timeout);
			});
		});
	}

	/**
	 * Wait for a message of a specific type
	 * @param {string} type - Message type to wait for
	 * @param {number} timeout - Timeout in ms
	 * @param {Function} predicate - Optional predicate function
	 * @returns {Promise<Object>} The message entry
	 */
	waitFor(type, timeout = 30000, predicate = null) {
		// Check existing messages first
		for (let i = 0; i < this.messages.length; i++) {
			const entry = this.messages[i];
			if (entry.message.type === type) {
				if (!predicate || predicate(entry.message)) {
					this.messages.splice(i, 1);
					return Promise.resolve(entry);
				}
			}
		}

		// Wait for new message
		return new Promise((resolve, reject) => {
			const wait = { type, predicate, resolve };
			this.pendingWaits.push(wait);

			// Timeout
			setTimeout(() => {
				const idx = this.pendingWaits.indexOf(wait);
				if (idx !== -1) {
					this.pendingWaits.splice(idx, 1);
					reject(new Error(`Timeout waiting for message type: ${type}`));
				}
			}, timeout);
		});
	}

	/**
	 * Close the WebSocket connection
	 */
	close() {
		if (this.socket) {
			this.socket.close();
		}
	}
}
