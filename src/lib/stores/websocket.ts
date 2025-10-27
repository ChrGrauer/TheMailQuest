/**
 * WebSocket Store
 * US-1.2: Join Game Session - Real-time lobby updates
 *
 * Provides a reusable, reactive WebSocket connection with auto-reconnection
 */

import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface LobbyUpdate {
	espTeams: Array<{ name: string; players: string[] }>;
	destinations: Array<{ name: string; players: string[] }>;
	newPlayer?: {
		id: string;
		displayName: string;
		role: string;
		teamName: string;
	};
}

export interface WebSocketStore {
	connected: boolean;
	roomCode: string | null;
	error: string | null;
}

function createWebSocketStore() {
	const { subscribe, set, update }: Writable<WebSocketStore> = writable({
		connected: false,
		roomCode: null,
		error: null
	});

	let ws: WebSocket | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let currentRoomCode: string | null = null;
	let lobbyUpdateCallback: ((data: LobbyUpdate) => void) | null = null;

	function cleanup() {
		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
		if (ws) {
			ws.close();
			ws = null;
		}
	}

	return {
		subscribe,

		connect(roomCode: string, onLobbyUpdate: (data: LobbyUpdate) => void): void {
			if (!browser) return;
			if (ws?.readyState === WebSocket.OPEN && currentRoomCode === roomCode) return;

			// Clean up existing connection
			cleanup();

			currentRoomCode = roomCode;
			lobbyUpdateCallback = onLobbyUpdate;

			const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
			const wsUrl = `${protocol}//${window.location.host}/ws`;

			try {
				ws = new WebSocket(wsUrl);

				ws.onopen = () => {
					update((state) => ({ ...state, connected: true, roomCode, error: null }));

					// Subscribe to room
					ws?.send(
						JSON.stringify({
							type: 'join_room',
							roomCode
						})
					);
				};

				ws.onmessage = (event) => {
					try {
						const message = JSON.parse(event.data);

						switch (message.type) {
							case 'room_joined':
								// Room subscription confirmed
								break;

							case 'lobby_update':
								if (lobbyUpdateCallback) {
									lobbyUpdateCallback(message.data);
								}
								break;

							default:
								// Handle other message types
								break;
						}
					} catch (error) {
						// Send client error to server
						ws?.send(
							JSON.stringify({
								type: 'client_error',
								error: (error as Error).message,
								context: 'message_parsing'
							})
						);
					}
				};

				ws.onerror = () => {
					update((state) => ({ ...state, error: 'WebSocket connection error' }));
				};

				ws.onclose = () => {
					update((state) => ({ ...state, connected: false }));

					// Auto-reconnect after 3 seconds if we still have a room code
					if (currentRoomCode && lobbyUpdateCallback) {
						reconnectTimer = setTimeout(() => {
							this.connect(currentRoomCode!, lobbyUpdateCallback!);
						}, 3000);
					}
				};
			} catch (error) {
				update((state) => ({
					...state,
					error: `Failed to connect: ${(error as Error).message}`
				}));
			}
		},

		disconnect(): void {
			cleanup();
			currentRoomCode = null;
			lobbyUpdateCallback = null;
			set({ connected: false, roomCode: null, error: null });
		}
	};
}

export const websocketStore = createWebSocketStore();
