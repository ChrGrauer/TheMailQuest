/**
 * WebSocket Store
 * US-1.2: Join Game Session - Real-time lobby updates
 * US-2.4: Client Basic Management - Client state updates
 * US-2.5: Destination Dashboard - Real-time destination updates
 *
 * Provides a reusable, reactive WebSocket connection with auto-reconnection
 */

import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { DestinationDashboardUpdate, ClientState } from '$lib/server/game/types';

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

export interface GameStateUpdate {
	phase: string;
	round: number;
	timer_duration?: number;
	timer_remaining?: number;
}

/**
 * US-2.1: ESP Dashboard Update
 * US-2.3: Technical Infrastructure Shop
 * US-2.4: Client Basic Management
 * Real-time updates for ESP team dashboard
 */
export interface ESPDashboardUpdate {
	teamName?: string; // Team name to filter updates (only apply if matches)
	credits?: number;
	reputation?: Record<string, number>;
	clients?: Array<{
		name: string;
		status: 'Active' | 'Paused';
		revenue?: number;
		volume?: string;
		risk?: 'Low' | 'Medium' | 'High';
	}>;
	owned_tech_upgrades?: string[]; // Owned technical upgrade IDs
	pending_costs?: number;
	// US-2.4: Client portfolio management
	client_states?: Record<string, ClientState>; // Per-client state (status, onboarding, first_active_round)
	budget_forecast?: number; // Budget after current round lock-in (including revenue and costs)
	available_clients_count?: number; // Count of clients available in marketplace
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
	let gameStateUpdateCallback: ((data: GameStateUpdate) => void) | null = null;
	let espDashboardUpdateCallback: ((data: ESPDashboardUpdate) => void) | null = null;
	let destinationDashboardUpdateCallback: ((data: DestinationDashboardUpdate) => void) | null = null;

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

		connect(
			roomCode: string,
			onLobbyUpdate: (data: LobbyUpdate) => void,
			onGameStateUpdate?: (data: GameStateUpdate) => void,
			onESPDashboardUpdate?: (data: ESPDashboardUpdate) => void,
			onDestinationDashboardUpdate?: (data: DestinationDashboardUpdate) => void
		): void {
			if (!browser) return;
			if (ws?.readyState === WebSocket.OPEN && currentRoomCode === roomCode) return;

			// Clean up existing connection
			cleanup();

			currentRoomCode = roomCode;
			lobbyUpdateCallback = onLobbyUpdate;
			gameStateUpdateCallback = onGameStateUpdate || null;
			espDashboardUpdateCallback = onESPDashboardUpdate || null;
			destinationDashboardUpdateCallback = onDestinationDashboardUpdate || null;

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

							case 'game_state_update':
								// US-1.4: Handle game phase transitions
								if (gameStateUpdateCallback) {
									gameStateUpdateCallback({
										phase: message.phase,
										round: message.round,
										timer_duration: message.timer_duration,
										timer_remaining: message.timer_remaining
									});
								}
								break;

							case 'resources_allocated':
								// US-1.4: Resources have been allocated
								// Could be used for additional UI feedback
								break;

							case 'esp_dashboard_update':
								// US-2.1: ESP Dashboard real-time updates
								if (espDashboardUpdateCallback) {
									espDashboardUpdateCallback(message.data);
								}
								break;

							case 'destination_dashboard_update':
								// US-2.5: Destination Dashboard real-time updates
								if (destinationDashboardUpdateCallback) {
									destinationDashboardUpdateCallback(message.data);
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
							this.connect(
								currentRoomCode!,
								lobbyUpdateCallback!,
								gameStateUpdateCallback || undefined,
								espDashboardUpdateCallback || undefined,
								destinationDashboardUpdateCallback || undefined
							);
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
			gameStateUpdateCallback = null;
			espDashboardUpdateCallback = null;
			destinationDashboardUpdateCallback = null;
			set({ connected: false, roomCode: null, error: null });
		}
	};
}

export const websocketStore = createWebSocketStore();
