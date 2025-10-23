import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { gameLogger } from '../logger';

export interface GameClient {
	id: string;
	ws: WebSocket;
	playerId?: string;
	isAlive: boolean;
}

class GameWebSocketServer {
	private wss: WebSocketServer | null = null;
	private clients: Map<string, GameClient> = new Map();

	initialize(server: Server) {
		this.wss = new WebSocketServer({ server, path: '/ws' });

		this.wss.on('connection', (ws: WebSocket) => {
			const clientId = this.generateClientId();
			const client: GameClient = {
				id: clientId,
				ws,
				isAlive: true
			};

			this.clients.set(clientId, client);
			gameLogger.websocket('client_connected', { clientId, totalClients: this.clients.size });

			// Heartbeat mechanism
			ws.on('pong', () => {
				client.isAlive = true;
			});

			ws.on('message', (data: Buffer) => {
				this.handleMessage(clientId, data);
			});

			ws.on('close', () => {
				this.clients.delete(clientId);
				gameLogger.websocket('client_disconnected', {
					clientId,
					totalClients: this.clients.size
				});
			});

			ws.on('error', (error: Error) => {
				gameLogger.error(error, { clientId });
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

		gameLogger.websocket('server_initialized');
	}

	private handleMessage(clientId: string, data: Buffer) {
		try {
			const message = JSON.parse(data.toString());
			gameLogger.websocket('message_received', { clientId, type: message.type });

			// Forward client errors to server logs
			if (message.type === 'client_error') {
				gameLogger.error(new Error(message.error), {
					clientId,
					context: message.context
				});
			}

			// Handle other message types here
			// This will be expanded as game logic is implemented
		} catch (error) {
			gameLogger.error(error as Error, { clientId, context: 'message_parsing' });
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

		gameLogger.websocket('broadcast', {
			messageType: (message as any).type,
			clientCount: successCount
		});
	}

	sendToClient(clientId: string, message: object) {
		const client = this.clients.get(clientId);
		if (client && client.ws.readyState === WebSocket.OPEN) {
			client.ws.send(JSON.stringify(message));
			gameLogger.websocket('message_sent', { clientId, messageType: (message as any).type });
		}
	}

	getClientCount(): number {
		return this.clients.size;
	}

	private generateClientId(): string {
		return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}
}

export const gameWss = new GameWebSocketServer();
