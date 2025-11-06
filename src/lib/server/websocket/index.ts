import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { Server as HttpsServer } from 'https';

// Lazy import logger to avoid $app/environment dependency during Vite config loading
let gameLogger: any = null;
async function getLogger() {
	if (!gameLogger) {
		const module = await import('../logger');
		gameLogger = module.gameLogger;
	}
	return gameLogger;
}

export interface GameClient {
	id: string;
	ws: WebSocket;
	playerId?: string;
	roomCode?: string;
	isAlive: boolean;
}

class GameWebSocketServer {
	private wss: WebSocketServer | null = null;
	private clients: Map<string, GameClient> = new Map();
	private rooms: Map<string, Set<string>> = new Map(); // roomCode -> Set of clientIds

	initialize(server: Server | HttpsServer) {
		this.wss = new WebSocketServer({ server, path: '/ws' });

		this.wss.on('connection', (ws: WebSocket) => {
			const clientId = this.generateClientId();
			const client: GameClient = {
				id: clientId,
				ws,
				isAlive: true
			};

			this.clients.set(clientId, client);
			getLogger().then((logger) =>
				logger.websocket('client_connected', { clientId, totalClients: this.clients.size })
			);

			// Heartbeat mechanism
			ws.on('pong', () => {
				client.isAlive = true;
			});

			ws.on('message', (data: Buffer) => {
				this.handleMessage(clientId, data);
			});

			ws.on('close', () => {
				this.clients.delete(clientId);
				this.unsubscribeFromRoom(clientId);
				getLogger().then((logger) =>
					logger.websocket('client_disconnected', {
						clientId,
						totalClients: this.clients.size
					})
				);
			});

			ws.on('error', (error: Error) => {
				getLogger().then((logger) => logger.error(error, { clientId }));
			});
		});

		// Heartbeat interval
		const interval = setInterval(() => {
			this.clients.forEach((client, clientId) => {
				if (client.isAlive === false) {
					client.ws.terminate();
					this.clients.delete(clientId);
					return;
				}
				client.isAlive = false;
				client.ws.ping();
			});
		}, 30000);

		this.wss.on('close', () => {
			clearInterval(interval);
		});

		getLogger().then((logger) => logger.websocket('server_initialized'));
	}

	private async handleMessage(clientId: string, data: Buffer) {
		try {
			const message = JSON.parse(data.toString());
			const logger = await getLogger();
			logger.websocket('message_received', { clientId, type: message.type });

			switch (message.type) {
				case 'join_room':
					this.subscribeToRoom(clientId, message.roomCode);
					this.sendToClient(clientId, {
						type: 'room_joined',
						roomCode: message.roomCode
					});
					break;

				case 'leave_room':
					this.unsubscribeFromRoom(clientId);
					break;

				case 'client_error':
					logger.error(new Error(message.error), {
						clientId,
						context: message.context
					});
					break;

				default:
					logger.websocket('unknown_message_type', { clientId, type: message.type });
			}
		} catch (error) {
			const logger = await getLogger();
			logger.error(error as Error, { clientId, context: 'message_parsing' });
		}
	}

	broadcast(message: object) {
		const data = JSON.stringify(message);
		let successCount = 0;

		this.clients.forEach((client) => {
			if (client.ws.readyState === WebSocket.OPEN) {
				client.ws.send(data);
				successCount++;
			}
		});

		getLogger().then((logger) =>
			logger.websocket('broadcast', {
				messageType: (message as any).type,
				clientCount: successCount
			})
		);
	}

	sendToClient(clientId: string, message: object) {
		const client = this.clients.get(clientId);
		if (client && client.ws.readyState === WebSocket.OPEN) {
			client.ws.send(JSON.stringify(message));
			getLogger().then((logger) =>
				logger.websocket('message_sent', { clientId, messageType: (message as any).type })
			);
		}
	}

	getClientCount(): number {
		return this.clients.size;
	}

	private generateClientId(): string {
		return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	subscribeToRoom(clientId: string, roomCode: string): void {
		const client = this.clients.get(clientId);
		if (!client) return;

		// Unsubscribe from previous room if any
		if (client.roomCode) {
			this.unsubscribeFromRoom(clientId);
		}

		client.roomCode = roomCode;

		if (!this.rooms.has(roomCode)) {
			this.rooms.set(roomCode, new Set());
		}
		this.rooms.get(roomCode)!.add(clientId);

		getLogger().then((logger) => logger.websocket('room_subscription', { clientId, roomCode }));
	}

	unsubscribeFromRoom(clientId: string): void {
		const client = this.clients.get(clientId);
		if (!client || !client.roomCode) return;

		const room = this.rooms.get(client.roomCode);
		if (room) {
			room.delete(clientId);
			if (room.size === 0) {
				this.rooms.delete(client.roomCode);
			}
		}

		getLogger().then((logger) =>
			logger.websocket('room_unsubscription', { clientId, roomCode: client.roomCode })
		);
		client.roomCode = undefined;
	}

	broadcastToRoom(roomCode: string, message: object): void {
		// Use global WebSocket broadcaster if available (production mode with server.js)
		if (typeof global !== 'undefined' && (global as any).wsBroadcastToRoom) {
			(global as any).wsBroadcastToRoom(roomCode, message);
			return;
		}

		// Otherwise use internal implementation (dev/test mode)
		const room = this.rooms.get(roomCode);
		if (!room) {
			getLogger().then((logger) =>
				logger.websocket('broadcast_to_room_failed', { roomCode, reason: 'room_not_found' })
			);
			return;
		}

		const data = JSON.stringify(message);
		let successCount = 0;

		room.forEach((clientId) => {
			const client = this.clients.get(clientId);
			if (client && client.ws.readyState === WebSocket.OPEN) {
				client.ws.send(data);
				successCount++;
			}
		});

		getLogger().then((logger) =>
			logger.websocket('broadcast_to_room', {
				roomCode,
				messageType: (message as any).type,
				clientCount: successCount
			})
		);
	}
}

export const gameWss = new GameWebSocketServer();
