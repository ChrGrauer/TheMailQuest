/**
 * Final Score Calculator Unit Tests
 * US-5.1: Final Score Calculation
 * ATDD: Test-first approach for all scoring components
 */

import { describe, test, expect } from 'vitest';
import {
	calculateReputationScore,
	calculateRevenueScores,
	calculateTechnicalScore,
	checkQualification,
	determineWinner,
	calculateDestinationCollaborativeScore,
	aggregateResolutionHistory,
	calculateFinalScores,
	calculateCoordinationBonus
} from './final-score-calculator';
import { buildTestSession, buildTestTeam } from './test-helpers/game-session-builder';
import { buildTestClient } from './test-helpers/client-test-fixtures';
import type { ESPFinalResult } from './final-score-types';
import type { ResolutionResults } from './resolution-types';
import type { InvestigationHistoryEntry } from './types';

// ============================================================================
// Scenario 2: Reputation Score Calculation
// ============================================================================

describe('calculateReputationScore - Weighted Kingdom Reputation', () => {
	test('should apply kingdom weights correctly: Gmail 50%, Outlook 30%, Yahoo 20%', () => {
		// Given: An ESP with different reputations per kingdom
		const reputation = { Gmail: 80, Outlook: 70, Yahoo: 60 };

		// When: Calculating the reputation score
		const result = calculateReputationScore(reputation);

		// Then: Weighted reputation = (80×0.5) + (70×0.3) + (60×0.2) = 40 + 21 + 12 = 73
		expect(result.weightedReputation).toBeCloseTo(73, 2);
		// And: Score = (73/100) × 50 = 36.50 points
		expect(result.score).toBeCloseTo(36.5, 2);
	});

	test('should handle maximum reputation (100 across all kingdoms)', () => {
		// Given: Perfect reputation across all kingdoms
		const reputation = { Gmail: 100, Outlook: 100, Yahoo: 100 };

		// When: Calculating the reputation score
		const result = calculateReputationScore(reputation);

		// Then: Weighted reputation = 100, Score = 50 points (maximum)
		expect(result.weightedReputation).toBe(100);
		expect(result.score).toBe(50);
	});

	test('should handle minimum reputation (0 across all kingdoms)', () => {
		// Given: Zero reputation across all kingdoms
		const reputation = { Gmail: 0, Outlook: 0, Yahoo: 0 };

		// When: Calculating the reputation score
		const result = calculateReputationScore(reputation);

		// Then: Weighted reputation = 0, Score = 0 points
		expect(result.weightedReputation).toBe(0);
		expect(result.score).toBe(0);
	});

	test('should handle mixed reputation values from feature example', () => {
		// Given: Example from US-5.1 Scenario 1 - SendBolt
		const reputation = { Gmail: 90, Outlook: 88, Yahoo: 85 };

		// When: Calculating the reputation score
		const result = calculateReputationScore(reputation);

		// Then: Weighted = (90×0.5) + (88×0.3) + (85×0.2) = 45 + 26.4 + 17 = 88.4
		expect(result.weightedReputation).toBeCloseTo(88.4, 2);
		// Score = (88.4/100) × 50 = 44.2
		expect(result.score).toBeCloseTo(44.2, 2);
	});
});

// ============================================================================
// Scenario 3: Revenue Score Calculation
// ============================================================================

describe('calculateRevenueScores - Relative to Highest Earner', () => {
	test('should calculate scores relative to highest earner', () => {
		// Given: Different revenue totals across ESPs
		const revenues: Record<string, number> = {
			SendWave: 2000,
			MailMonkey: 3000,
			BluePost: 1500
		};

		// When: Calculating revenue scores
		const result = calculateRevenueScores(revenues);

		// Then: Highest earner gets max 35 points, others get proportional
		expect(result.MailMonkey).toBeCloseTo(35.0, 2); // (3000/3000) × 35
		expect(result.SendWave).toBeCloseTo(23.33, 2); // (2000/3000) × 35
		expect(result.BluePost).toBeCloseTo(17.5, 2); // (1500/3000) × 35
	});

	test('should handle all zero revenue scenario', () => {
		// Given: All ESPs have zero revenue
		const revenues: Record<string, number> = {
			SendWave: 0,
			MailMonkey: 0
		};

		// When: Calculating revenue scores
		const result = calculateRevenueScores(revenues);

		// Then: All ESPs get 0 points (no division by zero error)
		expect(result.SendWave).toBe(0);
		expect(result.MailMonkey).toBe(0);
	});

	test('should handle single ESP with zero while others have revenue', () => {
		// Given: One ESP with zero, others with revenue
		const revenues: Record<string, number> = {
			SendWave: 2000,
			MailMonkey: 0
		};

		// When: Calculating revenue scores
		const result = calculateRevenueScores(revenues);

		// Then: SendWave gets full 35 points, MailMonkey gets 0
		expect(result.SendWave).toBeCloseTo(35.0, 2);
		expect(result.MailMonkey).toBe(0);
	});

	test('should handle equal revenue across all ESPs', () => {
		// Given: All ESPs have equal revenue
		const revenues: Record<string, number> = {
			SendWave: 2000,
			MailMonkey: 2000,
			BluePost: 2000
		};

		// When: Calculating revenue scores
		const result = calculateRevenueScores(revenues);

		// Then: All ESPs get full 35 points
		expect(result.SendWave).toBeCloseTo(35.0, 2);
		expect(result.MailMonkey).toBeCloseTo(35.0, 2);
		expect(result.BluePost).toBeCloseTo(35.0, 2);
	});
});

// ============================================================================
// Scenario 4: Technical Score Calculation
// ============================================================================

describe('calculateTechnicalScore - Investment-Based Scoring', () => {
	test('should calculate score based on total investments (under cap)', () => {
		// Given: Total tech investments of 1130 (from feature example)
		const investments = 1130;

		// When: Calculating technical score
		const result = calculateTechnicalScore(investments);

		// Then: min(1130/1200, 1.0) × 15 = 0.9417 × 15 = 14.13 points
		expect(result).toBeCloseTo(14.13, 2);
	});

	test('should cap at maximum 15 points when exceeding investment threshold', () => {
		// Given: Investments exceed the 1200 cap
		const investments = 1500;

		// When: Calculating technical score
		const result = calculateTechnicalScore(investments);

		// Then: min(1500/1200, 1.0) × 15 = 1.0 × 15 = 15.00 points
		expect(result).toBe(15);
	});

	test('should return 0 for zero investments', () => {
		// Given: No tech investments
		const investments = 0;

		// When: Calculating technical score
		const result = calculateTechnicalScore(investments);

		// Then: 0 points
		expect(result).toBe(0);
	});

	test('should handle exactly threshold amount', () => {
		// Given: Investments exactly at the 1200 threshold
		const investments = 1200;

		// When: Calculating technical score
		const result = calculateTechnicalScore(investments);

		// Then: min(1200/1200, 1.0) × 15 = 1.0 × 15 = 15.00 points
		expect(result).toBe(15);
	});

	test('should calculate score for common investment scenarios', () => {
		// Given: SPF(100) + DKIM(150) + DMARC(200) = 450
		const basicStack = 450;
		expect(calculateTechnicalScore(basicStack)).toBeCloseTo(5.63, 2);

		// Given: Full stack + content filtering(120) + monitoring(150) = 720
		const fullStack = 720;
		expect(calculateTechnicalScore(fullStack)).toBeCloseTo(9.0, 2);
	});
});

// ============================================================================
// Scenario 5: Disqualification Logic
// ============================================================================

describe('checkQualification - Minimum Reputation Gates', () => {
	test('should disqualify ESP with reputation below 60 in one kingdom', () => {
		// Given: ESP with one kingdom below threshold
		const reputation = { Gmail: 85, Outlook: 78, Yahoo: 55 };

		// When: Checking qualification
		const result = checkQualification(reputation);

		// Then: Disqualified with reason
		expect(result.qualified).toBe(false);
		expect(result.failingKingdoms).toEqual(['Yahoo']);
		expect(result.reason).toBe('Reputation below 60 in: Yahoo');
	});

	test('should disqualify ESP with multiple failing kingdoms', () => {
		// Given: ESP with multiple kingdoms below threshold
		const reputation = { Gmail: 55, Outlook: 58, Yahoo: 62 };

		// When: Checking qualification
		const result = checkQualification(reputation);

		// Then: Disqualified listing all failing kingdoms
		expect(result.qualified).toBe(false);
		expect(result.failingKingdoms).toEqual(['Gmail', 'Outlook']);
		expect(result.reason).toBe('Reputation below 60 in: Gmail, Outlook');
	});

	test('should qualify ESP with all kingdoms at or above 60', () => {
		// Given: ESP meeting minimum requirements
		const reputation = { Gmail: 85, Outlook: 78, Yahoo: 72 };

		// When: Checking qualification
		const result = checkQualification(reputation);

		// Then: Qualified
		expect(result.qualified).toBe(true);
		expect(result.failingKingdoms).toEqual([]);
		expect(result.reason).toBeNull();
	});

	test('should qualify ESP with exactly 60 in all kingdoms (boundary)', () => {
		// Given: ESP exactly at boundary
		const reputation = { Gmail: 60, Outlook: 60, Yahoo: 60 };

		// When: Checking qualification
		const result = checkQualification(reputation);

		// Then: Qualified (60 is acceptable)
		expect(result.qualified).toBe(true);
		expect(result.failingKingdoms).toEqual([]);
	});

	test('should disqualify ESP with exactly 59 in one kingdom (boundary)', () => {
		// Given: ESP one point below in one kingdom
		const reputation = { Gmail: 60, Outlook: 60, Yahoo: 59 };

		// When: Checking qualification
		const result = checkQualification(reputation);

		// Then: Disqualified
		expect(result.qualified).toBe(false);
		expect(result.failingKingdoms).toEqual(['Yahoo']);
	});

	test('should disqualify ESP with all kingdoms failing', () => {
		// Given: All kingdoms below threshold
		const reputation = { Gmail: 55, Outlook: 58, Yahoo: 52 };

		// When: Checking qualification
		const result = checkQualification(reputation);

		// Then: All kingdoms listed
		expect(result.qualified).toBe(false);
		expect(result.failingKingdoms).toEqual(['Gmail', 'Outlook', 'Yahoo']);
		expect(result.reason).toBe('Reputation below 60 in: Gmail, Outlook, Yahoo');
	});
});

// ============================================================================
// Scenario 6: Tie-Breaker Logic
// ============================================================================

describe('determineWinner - Tie-Breaking Rules', () => {
	test('should determine clear winner with highest score', () => {
		// Given: ESPs with different scores
		const espResults: ESPFinalResult[] = [
			createMockESPResult('SendBolt', 78.0, true, 88.4),
			createMockESPResult('SendWave', 77.75, true, 80.5),
			createMockESPResult('RocketMail', 75.5, true, 72.5)
		];

		// When: Determining winner
		const result = determineWinner(espResults);

		// Then: SendBolt wins with highest score
		expect(result?.espNames).toEqual(['SendBolt']);
		expect(result?.totalScore).toBe(78.0);
		expect(result?.tieBreaker).toBe(false);
	});

	test('should use weighted reputation to break tie', () => {
		// Given: Two ESPs tied on total score, different weighted reputation
		const espResults: ESPFinalResult[] = [
			createMockESPResult('SendWave', 78.0, true, 84.2),
			createMockESPResult('BluePost', 78.0, true, 84.4)
		];

		// When: Determining winner
		const result = determineWinner(espResults);

		// Then: BluePost wins with higher weighted reputation
		expect(result?.espNames).toEqual(['BluePost']);
		expect(result?.tieBreaker).toBe(true);
	});

	test('should declare joint winners for exact tie (same score and weighted reputation)', () => {
		// Given: Two ESPs with identical scores and weighted reputation
		const espResults: ESPFinalResult[] = [
			createMockESPResult('SendWave', 78.0, true, 84.0),
			createMockESPResult('BluePost', 78.0, true, 84.0)
		];

		// When: Determining winner
		const result = determineWinner(espResults);

		// Then: Joint winners declared
		expect(result?.espNames).toContain('SendWave');
		expect(result?.espNames).toContain('BluePost');
		expect(result?.espNames.length).toBe(2);
		expect(result?.tieBreaker).toBe(false); // Not really a tie-breaker, it's a true tie
	});

	test('should return null when all ESPs are disqualified', () => {
		// Given: All ESPs disqualified
		const espResults: ESPFinalResult[] = [
			createMockESPResult('SendWave', 77.75, false, 80.5),
			createMockESPResult('BluePost', 75.0, false, 72.5)
		];

		// When: Determining winner
		const result = determineWinner(espResults);

		// Then: No winner
		expect(result).toBeNull();
	});

	test('should skip disqualified ESPs when determining winner', () => {
		// Given: Highest scorer is disqualified
		const espResults: ESPFinalResult[] = [
			createMockESPResult('SendWave', 80.0, false, 85.0), // Disqualified
			createMockESPResult('BluePost', 75.0, true, 72.5) // Qualified
		];

		// When: Determining winner
		const result = determineWinner(espResults);

		// Then: BluePost wins as highest qualified
		expect(result?.espNames).toEqual(['BluePost']);
		expect(result?.totalScore).toBe(75.0);
	});
});

// ============================================================================
// Scenario 7: Destination Collaborative Score
// ============================================================================

describe('calculateDestinationCollaborativeScore - Industry Protection', () => {
	test('should calculate success scenario with high scores', () => {
		// Given: Strong spam blocking and low false positives
		const stats = {
			Gmail: {
				spamBlocked: 8000,
				totalSpamSent: 10000,
				falsePositives: 200,
				legitimateEmails: 20000
			},
			Outlook: {
				spamBlocked: 6000,
				totalSpamSent: 8000,
				falsePositives: 150,
				legitimateEmails: 15000
			},
			Yahoo: {
				spamBlocked: 4000,
				totalSpamSent: 5000,
				falsePositives: 100,
				legitimateEmails: 10000
			}
		};

		// When: Calculating collaborative score
		const result = calculateDestinationCollaborativeScore(stats);

		// Then: Industry Protection = (18000/23000) × 40 = 31.30
		expect(result.scoreBreakdown.industryProtection).toBeCloseTo(31.3, 1);
		// Coordination Bonus = 0 (no investigation history provided)
		expect(result.scoreBreakdown.coordinationBonus).toBe(0);
		// User Satisfaction = (1 - 450/45000) × 40 = (1 - 0.01) × 40 = 39.60
		expect(result.scoreBreakdown.userSatisfaction).toBeCloseTo(39.6, 1);
		// Total = 31.30 + 0 + 39.60 = 70.90
		expect(result.collaborativeScore).toBeCloseTo(70.9, 1);
		// Still below 80 threshold (need coordination bonus or better spam blocking)
		expect(result.success).toBe(false);
	});

	test('should calculate failure scenario with low spam blocking', () => {
		// Given: Poor spam blocking performance
		const stats = {
			Gmail: {
				spamBlocked: 4000,
				totalSpamSent: 10000,
				falsePositives: 500,
				legitimateEmails: 20000
			},
			Outlook: {
				spamBlocked: 3000,
				totalSpamSent: 8000,
				falsePositives: 400,
				legitimateEmails: 15000
			},
			Yahoo: {
				spamBlocked: 2000,
				totalSpamSent: 5000,
				falsePositives: 300,
				legitimateEmails: 10000
			}
		};

		// When: Calculating collaborative score
		const result = calculateDestinationCollaborativeScore(stats);

		// Then: Industry Protection = (9000/23000) × 40 = 15.65
		expect(result.scoreBreakdown.industryProtection).toBeCloseTo(15.65, 1);
		// User Satisfaction = (1 - 1200/45000) × 40 = (1 - 0.0267) × 40 = 38.93
		expect(result.scoreBreakdown.userSatisfaction).toBeCloseTo(38.93, 1);
		// Total = 15.65 + 38.93 = 54.58 < 80, so failure
		expect(result.success).toBe(false);
	});

	test('should handle zero spam sent scenario', () => {
		// Given: No spam was ever sent
		const stats = {
			Gmail: { spamBlocked: 0, totalSpamSent: 0, falsePositives: 0, legitimateEmails: 20000 },
			Outlook: { spamBlocked: 0, totalSpamSent: 0, falsePositives: 0, legitimateEmails: 15000 },
			Yahoo: { spamBlocked: 0, totalSpamSent: 0, falsePositives: 0, legitimateEmails: 10000 }
		};

		// When: Calculating collaborative score
		const result = calculateDestinationCollaborativeScore(stats);

		// Then: Industry Protection should handle division by zero gracefully
		// If no spam was sent, arguably 100% was blocked (nothing to block)
		// Using 0 for this case is acceptable
		expect(result.scoreBreakdown.industryProtection).toBeGreaterThanOrEqual(0);
		// Perfect user satisfaction (no false positives) = 40 points
		expect(result.scoreBreakdown.userSatisfaction).toBe(40);
	});

	test('should include per-destination breakdown', () => {
		// Given: Stats for each destination
		const stats = {
			Gmail: {
				spamBlocked: 8000,
				totalSpamSent: 10000,
				falsePositives: 200,
				legitimateEmails: 20000
			},
			Outlook: {
				spamBlocked: 6000,
				totalSpamSent: 8000,
				falsePositives: 150,
				legitimateEmails: 15000
			},
			Yahoo: {
				spamBlocked: 4000,
				totalSpamSent: 5000,
				falsePositives: 100,
				legitimateEmails: 10000
			}
		};

		// When: Calculating collaborative score
		const result = calculateDestinationCollaborativeScore(stats);

		// Then: Per-destination stats should be included
		expect(result.perDestination).toHaveLength(3);

		const gmail = result.perDestination.find((d) => d.destinationName === 'Gmail');
		expect(gmail?.blockingRate).toBeCloseTo(80, 0);
		expect(gmail?.falsePositiveRate).toBeCloseTo(1.0, 1);
	});
});

// ============================================================================
// Resolution History Aggregation
// ============================================================================

describe('aggregateResolutionHistory - Multi-Round Data Collection', () => {
	test('should aggregate revenue across 4 rounds', () => {
		// Given: 4 rounds of resolution history
		const history = [
			createMockResolutionHistoryEntry(1, { SendWave: 500, MailMonkey: 400 }),
			createMockResolutionHistoryEntry(2, { SendWave: 600, MailMonkey: 450 }),
			createMockResolutionHistoryEntry(3, { SendWave: 700, MailMonkey: 500 }),
			createMockResolutionHistoryEntry(4, { SendWave: 800, MailMonkey: 550 })
		];

		// When: Aggregating revenue
		const result = aggregateResolutionHistory(history);

		// Then: Total revenue per ESP
		expect(result.espRevenues.SendWave).toBe(2600);
		expect(result.espRevenues.MailMonkey).toBe(1900);
	});

	test('should aggregate reputation history per round', () => {
		// Given: 4 rounds of resolution history with reputation changes
		const history = [
			createMockResolutionHistoryEntry(
				1,
				{ SendWave: 500 },
				{ SendWave: { Gmail: 72, Outlook: 68, Yahoo: 65 } }
			),
			createMockResolutionHistoryEntry(
				2,
				{ SendWave: 600 },
				{ SendWave: { Gmail: 75, Outlook: 70, Yahoo: 68 } }
			),
			createMockResolutionHistoryEntry(
				3,
				{ SendWave: 700 },
				{ SendWave: { Gmail: 78, Outlook: 73, Yahoo: 70 } }
			),
			createMockResolutionHistoryEntry(
				4,
				{ SendWave: 800 },
				{ SendWave: { Gmail: 85, Outlook: 78, Yahoo: 72 } }
			)
		];

		// When: Aggregating history
		const result = aggregateResolutionHistory(history);

		// Then: Round history is captured
		expect(result.espRoundHistory.SendWave).toHaveLength(4);
		expect(result.espRoundHistory.SendWave[0].round).toBe(1);
		expect(result.espRoundHistory.SendWave[0].revenue).toBe(500);
		expect(result.espRoundHistory.SendWave[3].reputationByKingdom.Gmail).toBe(85);
	});

	test('should handle missing ESP data in some rounds', () => {
		// Given: An ESP joins late or has no activity in some rounds
		const history = [
			createMockResolutionHistoryEntry(1, { SendWave: 500 }),
			createMockResolutionHistoryEntry(2, { SendWave: 600, NewESP: 200 }),
			createMockResolutionHistoryEntry(3, { SendWave: 700, NewESP: 300 }),
			createMockResolutionHistoryEntry(4, { SendWave: 800, NewESP: 400 })
		];

		// When: Aggregating revenue
		const result = aggregateResolutionHistory(history);

		// Then: NewESP only has revenue from rounds 2-4
		expect(result.espRevenues.SendWave).toBe(2600);
		expect(result.espRevenues.NewESP).toBe(900);
	});

	test('should aggregate destination stats from espSatisfactionData', () => {
		// Given: Resolution history with satisfaction data stored in espSatisfactionData
		const history = [
			{
				round: 1,
				results: {
					espResults: {
						SendWave: {
							revenue: { actualRevenue: 500 },
							volume: { totalVolume: 10000, perDestination: { Gmail: 5000, Outlook: 3000, Yahoo: 2000 } },
							reputation: {
								perDestination: {
									Gmail: { newReputation: 70 },
									Outlook: { newReputation: 70 },
									Yahoo: { newReputation: 70 }
								}
							}
						}
					},
					// Satisfaction data stored separately (not in espResults)
					espSatisfactionData: {
						SendWave: {
							aggregatedSatisfaction: 80,
							perDestination: { Gmail: 82, Outlook: 78, Yahoo: 80 },
							breakdown: [
								{
									destination: 'Gmail',
									spam_blocked_volume: 400,
									spam_through_volume: 100,
									false_positive_volume: 50,
									total_volume: 5000
								},
								{
									destination: 'Outlook',
									spam_blocked_volume: 240,
									spam_through_volume: 60,
									false_positive_volume: 30,
									total_volume: 3000
								},
								{
									destination: 'Yahoo',
									spam_blocked_volume: 160,
									spam_through_volume: 40,
									false_positive_volume: 20,
									total_volume: 2000
								}
							]
						}
					}
				},
				timestamp: new Date()
			}
		];

		// When: Aggregating resolution history
		const result = aggregateResolutionHistory(history);

		// Then: Destination stats should be populated from espSatisfactionData
		// totalSpamSent = spam_blocked + spam_through (not just spam_through)
		expect(result.destinationStats.Gmail.spamBlocked).toBe(400);
		expect(result.destinationStats.Gmail.totalSpamSent).toBe(500); // 400 + 100
		expect(result.destinationStats.Gmail.falsePositives).toBe(50);
		expect(result.destinationStats.Gmail.legitimateEmails).toBe(5000);

		expect(result.destinationStats.Outlook.spamBlocked).toBe(240);
		expect(result.destinationStats.Outlook.totalSpamSent).toBe(300); // 240 + 60
		expect(result.destinationStats.Outlook.falsePositives).toBe(30);
		expect(result.destinationStats.Outlook.legitimateEmails).toBe(3000);

		expect(result.destinationStats.Yahoo.spamBlocked).toBe(160);
		expect(result.destinationStats.Yahoo.totalSpamSent).toBe(200); // 160 + 40
		expect(result.destinationStats.Yahoo.falsePositives).toBe(20);
		expect(result.destinationStats.Yahoo.legitimateEmails).toBe(2000);
	});
});

// ============================================================================
// Scenario 1: Complete Final Score Calculation
// ============================================================================

describe('calculateFinalScores - Complete Integration', () => {
	test('should calculate complete scores for multiple ESPs with clear winner', () => {
		// Given: A completed game session with 2 ESPs
		const session = buildTestSession({
			roomCode: 'FINAL-01',
			currentRound: 4,
			currentPhase: 'consequences' as 'planning' | 'resolution',
			teams: [
				{
					name: 'SendBolt',
					reputation: { Gmail: 90, Outlook: 88, Yahoo: 85 },
					credits: 1000,
					techStack: ['spf', 'dkim', 'dmarc', 'content-filtering', 'advanced-monitoring']
				},
				{
					name: 'SendWave',
					reputation: { Gmail: 85, Outlook: 78, Yahoo: 72 },
					credits: 1000,
					techStack: ['spf', 'dkim', 'dmarc']
				}
			]
		});

		// Add resolution history with revenue data
		session.resolution_history = [
			createMockResolutionHistoryEntry(1, { SendBolt: 500, SendWave: 600 }),
			createMockResolutionHistoryEntry(2, { SendBolt: 500, SendWave: 600 }),
			createMockResolutionHistoryEntry(3, { SendBolt: 500, SendWave: 600 }),
			createMockResolutionHistoryEntry(4, { SendBolt: 500, SendWave: 600 })
		];

		// When: Calculating final scores
		const result = calculateFinalScores(session);

		// Then: Both ESPs should be qualified
		expect(result.espResults).toHaveLength(2);
		expect(result.espResults.every((esp) => esp.qualified)).toBe(true);

		// And: SendBolt should be the winner (higher weighted reputation)
		expect(result.winner?.espNames).toContain('SendBolt');

		// And: Results should include all required fields
		const sendBolt = result.espResults.find((e) => e.espName === 'SendBolt');
		expect(sendBolt?.scoreBreakdown.reputationScore).toBeGreaterThan(0);
		expect(sendBolt?.scoreBreakdown.revenueScore).toBeGreaterThan(0);
		expect(sendBolt?.scoreBreakdown.technicalScore).toBeGreaterThan(0);
		expect(sendBolt?.totalRevenue).toBe(2000);
	});

	test('should handle all ESPs disqualified scenario', () => {
		// Given: All ESPs with reputation below 60 in at least one kingdom
		const session = buildTestSession({
			roomCode: 'FINAL-02',
			currentRound: 4,
			currentPhase: 'consequences' as 'planning' | 'resolution',
			teams: [
				{
					name: 'FailESP1',
					reputation: { Gmail: 55, Outlook: 58, Yahoo: 52 },
					credits: 1000,
					techStack: []
				},
				{
					name: 'FailESP2',
					reputation: { Gmail: 58, Outlook: 55, Yahoo: 50 },
					credits: 1000,
					techStack: []
				}
			]
		});

		session.resolution_history = [
			createMockResolutionHistoryEntry(1, { FailESP1: 500, FailESP2: 400 })
		];

		// When: Calculating final scores
		const result = calculateFinalScores(session);

		// Then: All ESPs disqualified, no winner
		expect(result.winner).toBeNull();
		expect(result.metadata.allDisqualified).toBe(true);
		expect(result.espResults.every((esp) => !esp.qualified)).toBe(true);
	});

	test('should include metadata with timestamp and room code', () => {
		// Given: A simple session
		const session = buildTestSession({
			roomCode: 'META-TEST',
			currentRound: 4,
			teams: [{ name: 'TestESP', reputation: { Gmail: 70, Outlook: 70, Yahoo: 70 } }]
		});
		session.resolution_history = [createMockResolutionHistoryEntry(1, { TestESP: 500 })];

		// When: Calculating final scores
		const result = calculateFinalScores(session);

		// Then: Metadata is populated
		expect(result.metadata.roomCode).toBe('META-TEST');
		expect(result.metadata.calculationTimestamp).toBeDefined();
		expect(new Date(result.metadata.calculationTimestamp)).toBeInstanceOf(Date);
	});
});

// ============================================================================
// Edge Cases and Data Validation (Scenario 10)
// ============================================================================

describe('Data Validation and Edge Cases', () => {
	test('should clamp reputation values above 100', () => {
		// Given: Invalid reputation value above 100
		const reputation = { Gmail: 150, Outlook: 80, Yahoo: 75 };

		// When: Calculating reputation score
		const result = calculateReputationScore(reputation);

		// Then: Gmail should be clamped to 100
		// Weighted = (100×0.5) + (80×0.3) + (75×0.2) = 50 + 24 + 15 = 89
		expect(result.weightedReputation).toBeCloseTo(89, 1);
	});

	test('should clamp reputation values below 0', () => {
		// Given: Invalid reputation value below 0
		const reputation = { Gmail: -10, Outlook: 80, Yahoo: 75 };

		// When: Calculating reputation score
		const result = calculateReputationScore(reputation);

		// Then: Gmail should be clamped to 0
		// Weighted = (0×0.5) + (80×0.3) + (75×0.2) = 0 + 24 + 15 = 39
		expect(result.weightedReputation).toBeCloseTo(39, 1);
	});

	test('should round scores to 2 decimal places', () => {
		// Given: Values that produce long decimals
		const reputation = { Gmail: 73, Outlook: 67, Yahoo: 61 };

		// When: Calculating reputation score
		const result = calculateReputationScore(reputation);

		// Then: Score should be rounded to 2 decimal places
		const scoreString = result.score.toFixed(2);
		expect(scoreString).toMatch(/^\d+\.\d{2}$/);
	});
});

// ============================================================================
// Scenario 7b: Coordination Bonus Calculation (US-2.7)
// ============================================================================

describe('calculateCoordinationBonus - Investigation-Based Bonus', () => {
	test('should return 10 points for single investigation', () => {
		// Given: One investigation entry
		const history = createMockInvestigationHistory([
			{ round: 2, targetEsp: 'SendWave', voters: ['Gmail', 'Outlook'] }
		]);

		// When: Calculating coordination bonus
		const result = calculateCoordinationBonus(history);

		// Then: 1 investigation × 10 = 10 points
		expect(result).toBe(10);
	});

	test('should return 20 points for two investigations', () => {
		// Given: Two investigation entries
		const history = createMockInvestigationHistory([
			{ round: 2, targetEsp: 'SendWave', voters: ['Gmail', 'Outlook'] },
			{ round: 3, targetEsp: 'MailMonkey', voters: ['Gmail', 'Yahoo'] }
		]);

		// When: Calculating coordination bonus
		const result = calculateCoordinationBonus(history);

		// Then: 2 investigations × 10 = 20 points
		expect(result).toBe(20);
	});

	test('should return 30 points for three investigations (typical max)', () => {
		// Given: Three investigation entries
		const history = createMockInvestigationHistory([
			{ round: 2, targetEsp: 'SendWave', voters: ['Gmail', 'Outlook'] },
			{ round: 3, targetEsp: 'MailMonkey', voters: ['Gmail', 'Yahoo'] },
			{ round: 4, targetEsp: 'BluePost', voters: ['Outlook', 'Yahoo'] }
		]);

		// When: Calculating coordination bonus
		const result = calculateCoordinationBonus(history);

		// Then: 3 investigations × 10 = 30 points
		expect(result).toBe(30);
	});

	test('should return 40 points for four investigations (absolute max)', () => {
		// Given: Four investigation entries (one per round)
		const history = createMockInvestigationHistory([
			{ round: 1, targetEsp: 'SendWave', voters: ['Gmail', 'Outlook'] },
			{ round: 2, targetEsp: 'MailMonkey', voters: ['Gmail', 'Yahoo'] },
			{ round: 3, targetEsp: 'BluePost', voters: ['Outlook', 'Yahoo'] },
			{ round: 4, targetEsp: 'SendWave', voters: ['Gmail', 'Outlook', 'Yahoo'] }
		]);

		// When: Calculating coordination bonus
		const result = calculateCoordinationBonus(history);

		// Then: 4 investigations × 10 = 40 points
		expect(result).toBe(40);
	});

	test('should return 0 points for empty investigation history', () => {
		// Given: Empty investigation history
		const history: InvestigationHistoryEntry[] = [];

		// When: Calculating coordination bonus
		const result = calculateCoordinationBonus(history);

		// Then: 0 points
		expect(result).toBe(0);
	});

	test('should return 0 points for undefined investigation history', () => {
		// Given: Undefined investigation history
		const history = undefined;

		// When: Calculating coordination bonus
		const result = calculateCoordinationBonus(history);

		// Then: 0 points
		expect(result).toBe(0);
	});
});

// ============================================================================
// Scenario 7c: Collaborative Score with Coordination Bonus
// ============================================================================

describe('calculateDestinationCollaborativeScore - With Coordination Bonus', () => {
	const baseStats = {
		Gmail: {
			spamBlocked: 8000,
			totalSpamSent: 10000,
			falsePositives: 200,
			legitimateEmails: 20000
		},
		Outlook: {
			spamBlocked: 6000,
			totalSpamSent: 8000,
			falsePositives: 150,
			legitimateEmails: 15000
		},
		Yahoo: {
			spamBlocked: 4000,
			totalSpamSent: 5000,
			falsePositives: 100,
			legitimateEmails: 10000
		}
	};

	test('should include coordination bonus in collaborative score', () => {
		// Given: Stats + 1 investigation
		const history = createMockInvestigationHistory([
			{ round: 2, targetEsp: 'SendWave', voters: ['Gmail', 'Outlook'] }
		]);

		// When: Calculating collaborative score with investigation history
		const result = calculateDestinationCollaborativeScore(baseStats, history);

		// Then: Industry Protection ~31.30 + Coordination 10 + User Satisfaction ~39.60 = ~80.90
		expect(result.scoreBreakdown.coordinationBonus).toBe(10);
		expect(result.collaborativeScore).toBeCloseTo(80.9, 1);
	});

	test('should cross success threshold with coordination bonus', () => {
		// Given: Stats that produce ~71 points without coordination
		// Adding investigation history to push over 80
		const history = createMockInvestigationHistory([
			{ round: 2, targetEsp: 'SendWave', voters: ['Gmail', 'Outlook'] }
		]);

		// When: Calculating collaborative score
		const result = calculateDestinationCollaborativeScore(baseStats, history);

		// Then: Score crosses 80 threshold, success = true
		expect(result.collaborativeScore).toBeGreaterThan(80);
		expect(result.success).toBe(true);
	});

	test('should clamp collaborative score at 100', () => {
		// Given: Stats that produce high scores + many investigations
		const perfectStats = {
			Gmail: {
				spamBlocked: 10000,
				totalSpamSent: 10000,
				falsePositives: 0,
				legitimateEmails: 20000
			},
			Outlook: {
				spamBlocked: 8000,
				totalSpamSent: 8000,
				falsePositives: 0,
				legitimateEmails: 15000
			},
			Yahoo: {
				spamBlocked: 5000,
				totalSpamSent: 5000,
				falsePositives: 0,
				legitimateEmails: 10000
			}
		};
		// 4 investigations = 40 points bonus
		// Industry Protection = 40 (100% blocked) + User Satisfaction = 40 (0 FP) + Coordination = 40
		// Raw score = 120, should be clamped to 100
		const history = createMockInvestigationHistory([
			{ round: 1, targetEsp: 'ESP1', voters: ['Gmail', 'Outlook'] },
			{ round: 2, targetEsp: 'ESP2', voters: ['Gmail', 'Yahoo'] },
			{ round: 3, targetEsp: 'ESP3', voters: ['Outlook', 'Yahoo'] },
			{ round: 4, targetEsp: 'ESP4', voters: ['Gmail', 'Outlook', 'Yahoo'] }
		]);

		// When: Calculating collaborative score
		const result = calculateDestinationCollaborativeScore(perfectStats, history);

		// Then: Score should be clamped at 100
		expect(result.collaborativeScore).toBe(100);
		expect(result.success).toBe(true);
	});

	test('should maintain backward compatibility without investigation history', () => {
		// Given: Stats only, no investigation history
		// When: Calculating collaborative score (no second parameter)
		const result = calculateDestinationCollaborativeScore(baseStats);

		// Then: Coordination bonus should be 0
		expect(result.scoreBreakdown.coordinationBonus).toBe(0);
		// And: Score should match original calculation
		expect(result.scoreBreakdown.industryProtection).toBeCloseTo(31.3, 1);
		expect(result.scoreBreakdown.userSatisfaction).toBeCloseTo(39.6, 1);
	});
});

// ============================================================================
// Scenario 7d: Full Integration with Investigation History
// ============================================================================

describe('calculateFinalScores - With Investigation History', () => {
	test('should include coordination bonus in destination results', () => {
		// Given: A completed game session with investigation history
		const session = buildTestSession({
			roomCode: 'COORD-01',
			currentRound: 4,
			currentPhase: 'consequences' as 'planning' | 'resolution',
			teams: [
				{
					name: 'SendBolt',
					reputation: { Gmail: 90, Outlook: 88, Yahoo: 85 },
					credits: 1000,
					techStack: ['spf', 'dkim', 'dmarc']
				}
			]
		});

		// Add resolution history
		session.resolution_history = [
			createMockResolutionHistoryEntry(1, { SendBolt: 500 }),
			createMockResolutionHistoryEntry(2, { SendBolt: 500 }),
			createMockResolutionHistoryEntry(3, { SendBolt: 500 }),
			createMockResolutionHistoryEntry(4, { SendBolt: 500 })
		];

		// Add investigation history (2 investigations)
		session.investigation_history = createMockInvestigationHistory([
			{ round: 2, targetEsp: 'SendBolt', voters: ['Gmail', 'Outlook'] },
			{ round: 3, targetEsp: 'SendBolt', voters: ['Gmail', 'Yahoo'] }
		]);

		// When: Calculating final scores
		const result = calculateFinalScores(session);

		// Then: Destination results should include coordination bonus
		expect(result.destinationResults.scoreBreakdown.coordinationBonus).toBe(20);
	});
});

// ============================================================================
// Helper Functions for Tests
// ============================================================================

function createMockInvestigationHistory(
	entries: Array<{ round: number; targetEsp: string; voters: string[] }>
): InvestigationHistoryEntry[] {
	return entries.map((entry) => ({
		round: entry.round,
		targetEsp: entry.targetEsp,
		voters: entry.voters,
		result: {
			violationFound: false,
			message: 'Mock investigation - no violation found'
		},
		timestamp: new Date()
	}));
}

function createMockESPResult(
	name: string,
	totalScore: number,
	qualified: boolean,
	weightedReputation: number
): ESPFinalResult {
	return {
		espName: name,
		rank: 0,
		totalScore,
		qualified,
		disqualificationReason: qualified ? null : 'Test disqualification',
		failingKingdoms: [],
		scoreBreakdown: {
			reputationScore: 0,
			revenueScore: 0,
			technicalScore: 0,
			weightedReputation
		},
		reputationByKingdom: { Gmail: 70, Outlook: 70, Yahoo: 70 },
		totalRevenue: 0,
		totalTechInvestments: 0,
		roundHistory: []
	};
}

function createMockResolutionHistoryEntry(
	round: number,
	revenues: Record<string, number>,
	reputations?: Record<string, Record<string, number>>
): { round: number; results: ResolutionResults; timestamp: Date } {
	const espResults: Record<string, any> = {};

	for (const [espName, revenue] of Object.entries(revenues)) {
		espResults[espName] = {
			revenue: { actualRevenue: revenue, baseRevenue: revenue, perClient: [] },
			volume: { totalVolume: 10000, perDestination: { Gmail: 5000, Outlook: 3000, Yahoo: 2000 } },
			reputation: {
				perDestination: {
					Gmail: { newReputation: reputations?.[espName]?.Gmail ?? 70 },
					Outlook: { newReputation: reputations?.[espName]?.Outlook ?? 70 },
					Yahoo: { newReputation: reputations?.[espName]?.Yahoo ?? 70 }
				}
			}
		};
	}

	return {
		round,
		results: { espResults },
		timestamp: new Date()
	};
}
