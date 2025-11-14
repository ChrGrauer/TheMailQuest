#!/usr/bin/env node
/**
 * E2E Test Coverage Analyzer
 *
 * Analyzes test files to identify:
 * 1. Actions that are tested explicitly vs implicitly (happy path duplication)
 * 2. Common setup patterns that verify the same things
 * 3. Redundant coverage across test files
 */

import fs from 'fs';
import path from 'path';

const testDir = './tests';
const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.spec.ts') && !f.includes('node_modules'));

// Patterns to track
const patterns = {
	sessionCreation: {
		explicit: /test.*create.*session|Scenario.*[Ff]acilitator creates/i,
		implicit: /createTestSession|createGameInPlanningPhase|createGameWith/i,
		description: 'Session creation flow'
	},
	playerJoin: {
		explicit: /test.*[Jj]oin|Scenario.*[Pp]layer.*join/i,
		implicit: /addPlayer\(/i,
		description: 'Player joining a game'
	},
	gameStart: {
		explicit: /test.*[Ss]tart.*[Gg]ame|Scenario.*[Ss]tart/i,
		implicit: /startGameButton|getByRole\(.*start game/i,
		description: 'Starting the game'
	},
	lobbyDisplay: {
		explicit: /test.*lobby.*display|Scenario.*lobby/i,
		implicit: /ESP Teams|Destinations.*\d\/\d|team-slot|destination-slot/i,
		description: 'Lobby page display elements'
	},
	roomCodeDisplay: {
		explicit: /test.*room code.*display/i,
		implicit: /data-testid="room-code"|getByTestId\('room-code'\)/i,
		description: 'Room code display and copy'
	},
	navigation: {
		explicit: /test.*navigation|Scenario.*navigate/i,
		implicit: /waitForURL|goto\(/i,
		description: 'Page navigation'
	},
	dashboardLoad: {
		explicit: /test.*dashboard.*load|Scenario.*dashboard.*display/i,
		implicit: /waitForSelector.*testid|__espDashboardTest.*ready|__destinationDashboardTest.*ready/i,
		description: 'Dashboard loading and initial state'
	},
	modalOpen: {
		explicit: /test.*modal.*open|Scenario.*modal/i,
		implicit: /click.*modal|getByTestId\('.*-modal'\)/i,
		description: 'Opening modals'
	},
	budgetDisplay: {
		explicit: /test.*budget.*display/i,
		implicit: /budget-current|budget-forecast/i,
		description: 'Budget/credits display'
	},
	websocketSync: {
		explicit: /test.*real-time|Scenario.*update.*real-time/i,
		implicit: /waitForTimeout\(500\)|WebSocket/i,
		description: 'Real-time WebSocket synchronization'
	}
};

// Analyze each test file
const analysis = {};

testFiles.forEach(file => {
	const filePath = path.join(testDir, file);
	const content = fs.readFileSync(filePath, 'utf-8');

	analysis[file] = {
		lines: content.split('\n').length,
		patterns: {}
	};

	// Check each pattern
	Object.entries(patterns).forEach(([patternName, pattern]) => {
		const explicitMatch = content.match(pattern.explicit);
		const implicitMatches = content.match(new RegExp(pattern.implicit, 'g'));

		analysis[file].patterns[patternName] = {
			explicit: explicitMatch ? 1 : 0,
			implicit: implicitMatches ? implicitMatches.length : 0
		};
	});
});

// Generate report
console.log('='.repeat(80));
console.log('E2E TEST COVERAGE ANALYSIS');
console.log('='.repeat(80));
console.log();

// Summary by pattern
console.log('PATTERN COVERAGE SUMMARY');
console.log('-'.repeat(80));
console.log('Pattern'.padEnd(35), 'Explicit', 'Implicit', 'Files');
console.log('-'.repeat(80));

Object.entries(patterns).forEach(([patternName, pattern]) => {
	let explicitCount = 0;
	let implicitCount = 0;
	let filesWithExplicit = [];
	let filesWithImplicit = [];

	Object.entries(analysis).forEach(([file, data]) => {
		if (data.patterns[patternName].explicit > 0) {
			explicitCount += data.patterns[patternName].explicit;
			filesWithExplicit.push(file);
		}
		if (data.patterns[patternName].implicit > 0) {
			implicitCount += data.patterns[patternName].implicit;
			filesWithImplicit.push(file);
		}
	});

	const totalFiles = new Set([...filesWithExplicit, ...filesWithImplicit]).size;
	console.log(
		pattern.description.padEnd(35),
		String(explicitCount).padStart(8),
		String(implicitCount).padStart(8),
		String(totalFiles).padStart(5)
	);
});

console.log();
console.log('DUPLICATION HOTSPOTS');
console.log('-'.repeat(80));

// Identify patterns tested explicitly but used implicitly everywhere
Object.entries(patterns).forEach(([patternName, pattern]) => {
	let filesWithExplicit = [];
	let filesWithImplicit = [];

	Object.entries(analysis).forEach(([file, data]) => {
		if (data.patterns[patternName].explicit > 0) {
			filesWithExplicit.push(file);
		}
		if (data.patterns[patternName].implicit > 0) {
			filesWithImplicit.push(file);
		}
	});

	// If tested explicitly in one file but used implicitly in many
	if (filesWithExplicit.length > 0 && filesWithImplicit.length >= 3) {
		console.log();
		console.log(`${pattern.description}:`);
		console.log(`  Explicitly tested in: ${filesWithExplicit.join(', ')}`);
		console.log(`  Implicitly verified in: ${filesWithImplicit.length} files`);

		const redundantFiles = filesWithImplicit.filter(f => !filesWithExplicit.includes(f));
		if (redundantFiles.length > 0) {
			console.log(`  → REDUNDANT in: ${redundantFiles.slice(0, 5).join(', ')}${redundantFiles.length > 5 ? '...' : ''}`);
		}
	}
});

console.log();
console.log('='.repeat(80));
console.log('FILE DETAILS');
console.log('='.repeat(80));

// Detailed file analysis
Object.entries(analysis)
	.sort((a, b) => b[1].lines - a[1].lines)
	.forEach(([file, data]) => {
		console.log();
		console.log(`${file} (${data.lines} lines)`);
		console.log('-'.repeat(80));

		const activePatterns = Object.entries(data.patterns)
			.filter(([_, counts]) => counts.explicit > 0 || counts.implicit > 0)
			.map(([name, counts]) => {
				const pattern = patterns[name];
				const status = counts.explicit > 0 ? 'TESTS' : 'uses';
				return `  ${status.padEnd(6)} ${pattern.description} (${counts.explicit} explicit, ${counts.implicit} implicit)`;
			});

		if (activePatterns.length > 0) {
			console.log(activePatterns.join('\n'));
		}
	});

console.log();
console.log('='.repeat(80));
console.log('RECOMMENDATIONS');
console.log('='.repeat(80));
console.log();
console.log('1. REMOVE DEDICATED TESTS FOR HAPPY PATH:');
console.log('   - Session creation (tested in every test setup)');
console.log('   - Player joining (tested in every multi-player test)');
console.log('   - Game start button (tested when starting games)');
console.log();
console.log('2. KEEP ONLY ERROR/EDGE CASE TESTS:');
console.log('   - Invalid room codes');
console.log('   - Empty display names');
console.log('   - Full sessions');
console.log('   - Permission errors');
console.log();
console.log('3. CONSOLIDATE DUPLICATE SCENARIOS:');
console.log('   - Lobby display (tested in 3+ files)');
console.log('   - Room code display (tested in 2+ files)');
console.log('   - Real-time updates (tested in multiple contexts)');
console.log();
console.log('Total test lines: ' + Object.values(analysis).reduce((sum, d) => sum + d.lines, 0));
console.log('='.repeat(80));
