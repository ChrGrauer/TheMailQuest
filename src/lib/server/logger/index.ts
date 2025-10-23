import pino from 'pino';
import { createStream } from 'rotating-file-stream';
import { dev } from '$app/environment';

// Create rotating file stream for production logs
const logStream = createStream('app.log', {
	interval: '1d', // Rotate daily
	path: './logs',
	compress: 'gzip',
	maxFiles: 30 // Keep 30 days of logs
});

// Configure Pino logger
export const logger = pino(
	{
		level: dev ? 'debug' : 'info',
		formatters: {
			level: (label) => {
				return { level: label };
			}
		},
		timestamp: pino.stdTimeFunctions.isoTime
	},
	dev
		? // Pretty print in development
			pino.destination(1) // stdout
		: // JSON logs to file in production
			pino.multistream([
				{ stream: pino.destination(1) }, // stdout
				{ stream: logStream } // rotating file
			])
);

// Helper functions for common log patterns
export const gameLogger = {
	event: (event: string, data?: object) => {
		logger.info({ event, ...data }, `Game event: ${event}`);
	},

	playerAction: (playerId: string, action: string, data?: object) => {
		logger.info({ playerId, action, ...data }, `Player action: ${action}`);
	},

	reputationChange: (playerId: string, change: number, reason: string, newScore: number) => {
		logger.info(
			{ playerId, change, reason, newScore },
			`Reputation change: ${playerId} ${change > 0 ? '+' : ''}${change} (${reason})`
		);
	},

	websocket: (event: string, data?: object) => {
		logger.debug({ event, ...data }, `WebSocket: ${event}`);
	},

	error: (error: Error, context?: object) => {
		logger.error({ err: error, ...context }, error.message);
	}
};
