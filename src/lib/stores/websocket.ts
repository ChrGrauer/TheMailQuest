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
import type { ServerMessage } from '$lib/types/websocket';

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
	clients?: string[]; // IDs of active clients
	owned_tech_upgrades?: string[]; // Owned technical upgrade IDs
	pending_costs?: number;
	// US-2.4: Client portfolio management
	client_states?: Record<string, ClientState>; // Per-client state (status, onboarding, first_active_round)
	budget_forecast?: number; // Budget after current round lock-in (including revenue and costs)
	available_clients_count?: number; // Count of clients available in marketplace
	available_clients?: import('$lib/server/game/types').Client[]; // US-8.2: Full definitions for facilitator sync
	locked_in?: boolean; // US-3.2: Lock-in status
	locked_in_at?: string | Date;
	pending_onboarding_decisions?: Record<string, { warmup: boolean; listHygiene: boolean }>;
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
	let destinationDashboardUpdateCallback: ((data: DestinationDashboardUpdate) => void) | null =
		null;

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
						const message = JSON.parse(event.data) as ServerMessage;
						console.debug('[WS Store] Received raw message:', message.type, message);

						switch (message.type) {
							case 'room_joined':
								// Room subscription confirmed
								break;

							case 'lobby_update':
								if (lobbyUpdateCallback) {
									lobbyUpdateCallback(message as any);
								}
								break;

							case 'game_state_update':
								// US-1.4: Handle game phase transitions
								if (gameStateUpdateCallback) {
									const payload = (message as any).data || message;
									const update: any = {};

									if (payload.phase || (payload as any).current_phase) {
										update.phase = payload.phase || (payload as any).current_phase;
									}

									if (payload.round !== undefined || (payload as any).current_round !== undefined) {
										update.round =
											payload.round !== undefined ? payload.round : (payload as any).current_round;
									}

									if (payload.timer_duration !== undefined)
										update.timer_duration = payload.timer_duration;
									if (payload.timer_remaining !== undefined)
										update.timer_remaining = payload.timer_remaining;

									// US-8.2: Ensure type is included for component branching logic
									const messageType = (message as any).type || payload.type;
									if (messageType) update.type = messageType;

									// Include any other fields (incident_history, results, etc)
									Object.keys(payload).forEach((key) => {
										if (
											![
												'type',
												'phase',
												'current_phase',
												'round',
												'current_round',
												'timer_duration',
												'timer_remaining'
											].includes(key)
										) {
											update[key] = payload[key];
										}
									});

									console.debug('[WS Store] game_state_update:', update);
									gameStateUpdateCallback(update);
								}
								break;

							case 'resources_allocated':
								// US-1.4: Resources have been allocated
								// Could be used for additional UI feedback
								break;

							case 'esp_dashboard_update':
								// US-2.1: ESP Dashboard real-time updates
								if (espDashboardUpdateCallback) {
									const payload = (message as any).data || message;
									espDashboardUpdateCallback(payload as unknown as ESPDashboardUpdate);
								}
								break;

							case 'destination_dashboard_update':
								// US-2.5: Destination Dashboard real-time updates
								if (destinationDashboardUpdateCallback) {
									const payload = (message as any).data || message;
									destinationDashboardUpdateCallback(
										payload as unknown as DestinationDashboardUpdate
									);
								}
								break;

							case 'lock_in_confirmed':
							case 'player_locked_in':
							case 'auto_lock_warning':
							case 'auto_lock_corrections':
							case 'auto_lock_complete':
							case 'phase_transition':
							case 'incident_triggered':
							case 'incident_choice_required':
							case 'incident_choice_confirmed':
							case 'investigation_update':
							case 'final_scores_calculated':
							case 'timer_update':
								// Standardize message delivery to gameStateUpdateCallback
								if (gameStateUpdateCallback) {
									const payload = (message as any).data || message;
									const update = { ...payload };
									// Ensure type is preserved from the original message if not in payload
									if (!update.type) update.type = message.type;
									gameStateUpdateCallback(update as any);
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
