/**
 * Resolution Application Manager Tests
 * Tests for applying resolution results to game state
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { applyResolutionToGameState } from './resolution-application-manager';
import type { GameSession } from './types';
import type { ResolutionResults } from './resolution-types';

describe('Resolution Application Manager', () => {
	let session: GameSession;

	beforeEach(() => {
		// Create a basic test session
		session = {
			roomCode: 'TEST-123',
			facilitatorId: 'facilitator-123',
			current_round: 1,
			current_phase: 'resolution',
			esp_teams: [
				{
					name: 'SendWave',
					players: ['player1'],
					budget: 0,
					clients: [],
					technical_stack: [],
					credits: 1000,
					reputation: {
						Gmail: 70,
						Outlook: 70,
						Yahoo: 70
					},
					active_clients: [],
					owned_tech_upgrades: [],
					round_history: [],
					available_clients: [],
					client_states: {}
				}
			],
			destinations: [
				{
					name: 'Gmail',
					players: ['dest-player1'],
					budget: 500,
					filtering_policies: {},
					esp_reputation: {}
				}
			],
			createdAt: new Date(),
			lastActivity: new Date()
		};
	});

	describe('Revenue Application', () => {
		it('should add positive revenue to team credits', () => {
			// Given
			const results: ResolutionResults = {
				espResults: {
					SendWave: {
						volume: {
							activeClients: [],
							clientVolumes: [],
							totalVolume: 30000
						},
						delivery: {
							baseRate: 0.85,
							authBonus: 0,
							finalRate: 0.85,
							zone: 'good',
							breakdown: []
						},
						revenue: {
							baseRevenue: 350,
							actualRevenue: 297.5,
							perClient: []
						},
						reputation: {
							perDestination: {
								Gmail: {
									techBonus: 0,
									clientImpact: 0,
									warmupBonus: 0,
									totalChange: 0,
									breakdown: []
								},
								Outlook: {
									techBonus: 0,
									clientImpact: 0,
									warmupBonus: 0,
									totalChange: 0,
									breakdown: []
								},
								Yahoo: {
									techBonus: 0,
									clientImpact: 0,
									warmupBonus: 0,
									totalChange: 0,
									breakdown: []
								}
							},
							volumeWeightedClientImpact: 0
						},
						complaints: {
							baseComplaintRate: 0.5,
							adjustedComplaintRate: 0.5,
							perClient: []
						}
					}
				}
			};

			const initialCredits = session.esp_teams[0].credits;

			// When
			const result = applyResolutionToGameState(session, results);

			// Then
			expect(result.success).toBe(true);
			expect(result.updatedTeams).toEqual(['SendWave']);
			expect(session.esp_teams[0].credits).toBe(initialCredits + 297.5);
		});

		it('should handle zero revenue', () => {
			// Given
			const results: ResolutionResults = {
				espResults: {
					SendWave: {
						volume: {
							activeClients: [],
							clientVolumes: [],
							totalVolume: 0
						},
						delivery: {
							baseRate: 0.85,
							authBonus: 0,
							finalRate: 0.85,
							zone: 'good',
							breakdown: []
						},
						revenue: {
							baseRevenue: 0,
							actualRevenue: 0,
							perClient: []
						},
						reputation: {
							perDestination: {
								Gmail: {
									techBonus: 0,
									clientImpact: 0,
									warmupBonus: 0,
									totalChange: 0,
									breakdown: []
								},
								Outlook: {
									techBonus: 0,
									clientImpact: 0,
									warmupBonus: 0,
									totalChange: 0,
									breakdown: []
								},
								Yahoo: {
									techBonus: 0,
									clientImpact: 0,
									warmupBonus: 0,
									totalChange: 0,
									breakdown: []
								}
							},
							volumeWeightedClientImpact: 0
						},
						complaints: {
							baseComplaintRate: 0,
							adjustedComplaintRate: 0,
							perClient: []
						}
					}
				}
			};

			const initialCredits = session.esp_teams[0].credits;

			// When
			const result = applyResolutionToGameState(session, results);

			// Then
			expect(result.success).toBe(true);
			expect(session.esp_teams[0].credits).toBe(initialCredits); // No change
		});
	});

	describe('Reputation Application', () => {
		it('should apply positive reputation changes', () => {
			// Given
			const results: ResolutionResults = {
				espResults: {
					SendWave: {
						volume: {
							activeClients: [],
							clientVolumes: [],
							totalVolume: 30000
						},
						delivery: {
							baseRate: 0.85,
							authBonus: 0,
							finalRate: 0.85,
							zone: 'good',
							breakdown: []
						},
						revenue: {
							baseRevenue: 350,
							actualRevenue: 297.5,
							perClient: []
						},
						reputation: {
							perDestination: {
								Gmail: {
									techBonus: 2,
									clientImpact: 3,
									warmupBonus: 0,
									totalChange: 5,
									breakdown: []
								},
								Outlook: {
									techBonus: 2,
									clientImpact: 1,
									warmupBonus: 0,
									totalChange: 3,
									breakdown: []
								},
								Yahoo: {
									techBonus: 2,
									clientImpact: -1,
									warmupBonus: 0,
									totalChange: 1,
									breakdown: []
								}
							},
							volumeWeightedClientImpact: 0
						},
						complaints: {
							baseComplaintRate: 0.5,
							adjustedComplaintRate: 0.5,
							perClient: []
						}
					}
				}
			};

			// When
			const result = applyResolutionToGameState(session, results);

			// Then
			expect(result.success).toBe(true);
			expect(session.esp_teams[0].reputation.Gmail).toBe(75); // 70 + 5
			expect(session.esp_teams[0].reputation.Outlook).toBe(73); // 70 + 3
			expect(session.esp_teams[0].reputation.Yahoo).toBe(71); // 70 + 1
		});

		it('should apply negative reputation changes', () => {
			// Given
			const results: ResolutionResults = {
				espResults: {
					SendWave: {
						volume: {
							activeClients: [],
							clientVolumes: [],
							totalVolume: 30000
						},
						delivery: {
							baseRate: 0.85,
							authBonus: 0,
							finalRate: 0.85,
							zone: 'good',
							breakdown: []
						},
						revenue: {
							baseRevenue: 350,
							actualRevenue: 297.5,
							perClient: []
						},
						reputation: {
							perDestination: {
								Gmail: {
									techBonus: 0,
									clientImpact: -10,
									warmupBonus: 0,
									totalChange: -10,
									breakdown: []
								},
								Outlook: {
									techBonus: 0,
									clientImpact: -5,
									warmupBonus: 0,
									totalChange: -5,
									breakdown: []
								},
								Yahoo: {
									techBonus: 0,
									clientImpact: -3,
									warmupBonus: 0,
									totalChange: -3,
									breakdown: []
								}
							},
							volumeWeightedClientImpact: 0
						},
						complaints: {
							baseComplaintRate: 0.5,
							adjustedComplaintRate: 0.5,
							perClient: []
						}
					}
				}
			};

			// When
			const result = applyResolutionToGameState(session, results);

			// Then
			expect(result.success).toBe(true);
			expect(session.esp_teams[0].reputation.Gmail).toBe(60); // 70 - 10
			expect(session.esp_teams[0].reputation.Outlook).toBe(65); // 70 - 5
			expect(session.esp_teams[0].reputation.Yahoo).toBe(67); // 70 - 3
		});

		it('should clamp reputation to maximum of 100', () => {
			// Given
			session.esp_teams[0].reputation.Gmail = 95;

			const results: ResolutionResults = {
				espResults: {
					SendWave: {
						volume: {
							activeClients: [],
							clientVolumes: [],
							totalVolume: 30000
						},
						delivery: {
							baseRate: 0.85,
							authBonus: 0,
							finalRate: 0.85,
							zone: 'good',
							breakdown: []
						},
						revenue: {
							baseRevenue: 350,
							actualRevenue: 297.5,
							perClient: []
						},
						reputation: {
							perDestination: {
								Gmail: {
									techBonus: 5,
									clientImpact: 5,
									warmupBonus: 0,
									totalChange: 10,
									breakdown: []
								},
								Outlook: {
									techBonus: 0,
									clientImpact: 0,
									warmupBonus: 0,
									totalChange: 0,
									breakdown: []
								},
								Yahoo: {
									techBonus: 0,
									clientImpact: 0,
									warmupBonus: 0,
									totalChange: 0,
									breakdown: []
								}
							},
							volumeWeightedClientImpact: 0
						},
						complaints: {
							baseComplaintRate: 0.5,
							adjustedComplaintRate: 0.5,
							perClient: []
						}
					}
				}
			};

			// When
			const result = applyResolutionToGameState(session, results);

			// Then
			expect(result.success).toBe(true);
			expect(session.esp_teams[0].reputation.Gmail).toBe(100); // Clamped to 100
		});

		it('should clamp reputation to minimum of 0', () => {
			// Given
			session.esp_teams[0].reputation.Gmail = 5;

			const results: ResolutionResults = {
				espResults: {
					SendWave: {
						volume: {
							activeClients: [],
							clientVolumes: [],
							totalVolume: 30000
						},
						delivery: {
							baseRate: 0.85,
							authBonus: 0,
							finalRate: 0.85,
							zone: 'good',
							breakdown: []
						},
						revenue: {
							baseRevenue: 350,
							actualRevenue: 297.5,
							perClient: []
						},
						reputation: {
							perDestination: {
								Gmail: {
									techBonus: 0,
									clientImpact: -10,
									warmupBonus: 0,
									totalChange: -10,
									breakdown: []
								},
								Outlook: {
									techBonus: 0,
									clientImpact: 0,
									warmupBonus: 0,
									totalChange: 0,
									breakdown: []
								},
								Yahoo: {
									techBonus: 0,
									clientImpact: 0,
									warmupBonus: 0,
									totalChange: 0,
									breakdown: []
								}
							},
							volumeWeightedClientImpact: 0
						},
						complaints: {
							baseComplaintRate: 0.5,
							adjustedComplaintRate: 0.5,
							perClient: []
						}
					}
				}
			};

			// When
			const result = applyResolutionToGameState(session, results);

			// Then
			expect(result.success).toBe(true);
			expect(session.esp_teams[0].reputation.Gmail).toBe(0); // Clamped to 0
		});

		it('should initialize missing reputation values to 70', () => {
			// Given
			delete session.esp_teams[0].reputation.Gmail;

			const results: ResolutionResults = {
				espResults: {
					SendWave: {
						volume: {
							activeClients: [],
							clientVolumes: [],
							totalVolume: 30000
						},
						delivery: {
							baseRate: 0.85,
							authBonus: 0,
							finalRate: 0.85,
							zone: 'good',
							breakdown: []
						},
						revenue: {
							baseRevenue: 350,
							actualRevenue: 297.5,
							perClient: []
						},
						reputation: {
							perDestination: {
								Gmail: {
									techBonus: 5,
									clientImpact: 0,
									warmupBonus: 0,
									totalChange: 5,
									breakdown: []
								},
								Outlook: {
									techBonus: 0,
									clientImpact: 0,
									warmupBonus: 0,
									totalChange: 0,
									breakdown: []
								},
								Yahoo: {
									techBonus: 0,
									clientImpact: 0,
									warmupBonus: 0,
									totalChange: 0,
									breakdown: []
								}
							},
							volumeWeightedClientImpact: 0
						},
						complaints: {
							baseComplaintRate: 0.5,
							adjustedComplaintRate: 0.5,
							perClient: []
						}
					}
				}
			};

			// When
			const result = applyResolutionToGameState(session, results);

			// Then
			expect(result.success).toBe(true);
			expect(session.esp_teams[0].reputation.Gmail).toBe(75); // 70 (default) + 5
		});
	});

	describe('Multiple Teams', () => {
		it('should apply results to all teams', () => {
			// Given
			session.esp_teams.push({
				name: 'MailMonkey',
				players: ['player2'],
				budget: 0,
				clients: [],
				technical_stack: [],
				credits: 800,
				reputation: {
					Gmail: 60,
					Outlook: 65,
					Yahoo: 55
				},
				active_clients: [],
				owned_tech_upgrades: [],
				round_history: [],
				available_clients: [],
				client_states: {}
			});

			const results: ResolutionResults = {
				espResults: {
					SendWave: {
						volume: {
							activeClients: [],
							clientVolumes: [],
							totalVolume: 30000
						},
						delivery: {
							baseRate: 0.85,
							authBonus: 0,
							finalRate: 0.85,
							zone: 'good',
							breakdown: []
						},
						revenue: {
							baseRevenue: 350,
							actualRevenue: 297.5,
							perClient: []
						},
						reputation: {
							perDestination: {
								Gmail: {
									techBonus: 0,
									clientImpact: 5,
									warmupBonus: 0,
									totalChange: 5,
									breakdown: []
								},
								Outlook: {
									techBonus: 0,
									clientImpact: 3,
									warmupBonus: 0,
									totalChange: 3,
									breakdown: []
								},
								Yahoo: {
									techBonus: 0,
									clientImpact: 2,
									warmupBonus: 0,
									totalChange: 2,
									breakdown: []
								}
							},
							volumeWeightedClientImpact: 0
						},
						complaints: {
							baseComplaintRate: 0.5,
							adjustedComplaintRate: 0.5,
							perClient: []
						}
					},
					MailMonkey: {
						volume: {
							activeClients: [],
							clientVolumes: [],
							totalVolume: 50000
						},
						delivery: {
							baseRate: 0.85,
							authBonus: 0,
							finalRate: 0.85,
							zone: 'good',
							breakdown: []
						},
						revenue: {
							baseRevenue: 150,
							actualRevenue: 127.5,
							perClient: []
						},
						reputation: {
							perDestination: {
								Gmail: {
									techBonus: 0,
									clientImpact: -5,
									warmupBonus: 0,
									totalChange: -5,
									breakdown: []
								},
								Outlook: {
									techBonus: 0,
									clientImpact: -3,
									warmupBonus: 0,
									totalChange: -3,
									breakdown: []
								},
								Yahoo: {
									techBonus: 0,
									clientImpact: -2,
									warmupBonus: 0,
									totalChange: -2,
									breakdown: []
								}
							},
							volumeWeightedClientImpact: 0
						},
						complaints: {
							baseComplaintRate: 2.5,
							adjustedComplaintRate: 2.5,
							perClient: []
						}
					}
				}
			};

			// When
			const result = applyResolutionToGameState(session, results);

			// Then
			expect(result.success).toBe(true);
			expect(result.updatedTeams).toEqual(['SendWave', 'MailMonkey']);

			// Check SendWave
			expect(session.esp_teams[0].credits).toBe(1297.5); // 1000 + 297.5
			expect(session.esp_teams[0].reputation.Gmail).toBe(75); // 70 + 5

			// Check MailMonkey
			expect(session.esp_teams[1].credits).toBe(927.5); // 800 + 127.5
			expect(session.esp_teams[1].reputation.Gmail).toBe(55); // 60 - 5
		});
	});

	describe('Edge Cases', () => {
		it('should handle missing team results gracefully', () => {
			// Given
			const results: ResolutionResults = {
				espResults: {}
			};

			const initialCredits = session.esp_teams[0].credits;

			// When
			const result = applyResolutionToGameState(session, results);

			// Then
			expect(result.success).toBe(true);
			expect(result.updatedTeams).toEqual([]);
			expect(session.esp_teams[0].credits).toBe(initialCredits); // No change
		});

		it('should round reputation values to nearest integer', () => {
			// Given
			const results: ResolutionResults = {
				espResults: {
					SendWave: {
						volume: {
							activeClients: [],
							clientVolumes: [],
							totalVolume: 30000
						},
						delivery: {
							baseRate: 0.85,
							authBonus: 0,
							finalRate: 0.85,
							zone: 'good',
							breakdown: []
						},
						revenue: {
							baseRevenue: 350,
							actualRevenue: 297.5,
							perClient: []
						},
						reputation: {
							perDestination: {
								Gmail: {
									techBonus: 2.7,
									clientImpact: 1.4,
									warmupBonus: 0,
									totalChange: 4.1,
									breakdown: []
								},
								Outlook: {
									techBonus: 0,
									clientImpact: 0,
									warmupBonus: 0,
									totalChange: 0,
									breakdown: []
								},
								Yahoo: {
									techBonus: 0,
									clientImpact: 0,
									warmupBonus: 0,
									totalChange: 0,
									breakdown: []
								}
							},
							volumeWeightedClientImpact: 0
						},
						complaints: {
							baseComplaintRate: 0.5,
							adjustedComplaintRate: 0.5,
							perClient: []
						}
					}
				}
			};

			// When
			const result = applyResolutionToGameState(session, results);

			// Then
			expect(result.success).toBe(true);
			expect(session.esp_teams[0].reputation.Gmail).toBe(74); // 70 + 4.1 rounded to 74
		});
	});
});
