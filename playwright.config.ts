import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
	webServer: {
		command: 'npm run build && node server.js',
		port: 4173,
		reuseExistingServer: !process.env.CI,
		timeout: 120000 // 2 minutes for build + server startup
	},
	testDir: 'tests',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/,

	// Global timeout for entire test run (prevents infinite hanging)
	globalTimeout: 180000, // 3 minutes total

	// Timeout for each individual test
	timeout: 10000, // 10 seconds per test

	// Retry failed tests (useful for flaky tests in CI)
	retries: process.env.CI ? 2 : 0,

	// Parallel execution
	workers: process.env.CI ? 2 : 4,
	fullyParallel: true,

	// Reporter configuration
	reporter: [
		['list'], // Show results in terminal
		['html', { open: 'never' }] // Generate HTML report
	],

	use: {
		baseURL: 'http://localhost:4173',

		// Timeout for actions (click, fill, etc.)
		actionTimeout: 5000, // 5 seconds

		// Timeout for navigation (page.goto)
		navigationTimeout: 10000, // 10 seconds

		// Screenshot on failure
		screenshot: 'only-on-failure',

		// Video on first retry
		video: 'retain-on-failure',

		// Trace on first retry
		trace: 'on-first-retry'
	},

	// Expect assertion timeout
	expect: {
		timeout: 5000 // 5 seconds for expect assertions
	}
};

export default config;
